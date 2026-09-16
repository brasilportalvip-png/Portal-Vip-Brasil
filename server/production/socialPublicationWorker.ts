import { COLLECTIONS, firestore, nowIso } from './store.js';
import { recoverStalePublishingPostsR8, processScheduledPostsR8 } from './scheduledPublisherR8.js';
import { sanitizeSecretText } from './aiErrorDiagnostic.js';

export interface SocialPublicationTelemetry {
  recovered: number;
  attempted: number;
  processed: number;
  published: number;
  failed: number;
  requiresReview: number;
  deferred: number;
  remaining: number;
}

export interface SocialPublicationWorkerResult {
  success: boolean;
  status: 'success' | 'error' | 'timeout' | 'skipped_concurrent';
  durationMs: number;
  telemetry: SocialPublicationTelemetry;
  error?: string;
}

async function acquireLock(owner: string, ttlMs: number) {
  const ref = firestore().collection(COLLECTIONS.schedulerLocks).doc('social_publications');
  const now = Date.now();
  return firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    if (Number(data.lockedUntil || 0) > now) return { acquired: false, fencingToken: Number(data.fencingToken || 0) };
    const fencingToken = Math.max(0, Number(data.fencingToken || 0)) + 1;
    tx.set(ref, { owner, fencingToken, lockedUntil: now + ttlMs, acquiredAt: nowIso(), updatedAt: nowIso() }, { merge: true });
    return { acquired: true, fencingToken };
  });
}

async function releaseLock(owner: string, fencingToken: number) {
  const ref = firestore().collection(COLLECTIONS.schedulerLocks).doc('social_publications');
  try {
    await firestore().runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() || {} : {};
      if (data.owner === owner && Number(data.fencingToken) === fencingToken) {
        tx.set(ref, { lockedUntil: 0, releasedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
      }
    });
  } catch (error) {
    console.warn('[SocialPublicationWorker] Falha ao liberar lock:', sanitizeSecretText(error));
  }
}

export async function runSocialPublicationWorker(options: { timeoutMs?: number; workerId?: string } = {}): Promise<SocialPublicationWorkerResult> {
  const startedAt = Date.now();
  // A plataforma pode encerrar a função perto de 90s. Encerramos antes disso
  // para persistir o item atual e permitir continuação idempotente no ciclo seguinte.
  const timeoutMs = options.timeoutMs || 70_000;
  const workerId = options.workerId || `social_worker_${startedAt}_${Math.random().toString(36).slice(2, 8)}`;
  const lock = await acquireLock(workerId, timeoutMs + 15_000);
  const telemetry: SocialPublicationTelemetry = {
    recovered: 0,
    attempted: 0,
    processed: 0,
    published: 0,
    failed: 0,
    requiresReview: 0,
    deferred: 0,
    remaining: 0
  };
  if (!lock.acquired) return { success: false, status: 'skipped_concurrent', durationMs: Date.now() - startedAt, telemetry };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();
  let status: SocialPublicationWorkerResult['status'] = 'success';
  let error: string | undefined;
  try {
    telemetry.recovered = await recoverStalePublishingPostsR8(15, controller.signal);
    telemetry.processed = await processScheduledPostsR8({
      signal: controller.signal,
      deadlineAt: startedAt + timeoutMs - 5_000,
      onClaimed: () => { telemetry.attempted += 1; },
      onFinalized: (finalStatus) => {
        if (finalStatus === 'published') telemetry.published += 1;
        else if (finalStatus === 'failed') telemetry.failed += 1;
        else if (finalStatus === 'requires_review') telemetry.requiresReview += 1;
        else telemetry.deferred += 1;
      }
    });
    const remainingSnap = await firestore().collection(COLLECTIONS.scheduledPosts)
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', nowIso())
      .limit(100)
      .get();
    telemetry.remaining = remainingSnap.size;
    if (controller.signal.aborted) {
      status = 'timeout';
      error = 'Tempo limite controlado atingido; os itens restantes continuarão no próximo ciclo.';
    }
  } catch (cause: any) {
    status = controller.signal.aborted ? 'timeout' : 'error';
    error = sanitizeSecretText(cause?.message || 'Falha interna no executor de publicações.').slice(0, 500);
  } finally {
    clearTimeout(timer);
    await releaseLock(workerId, lock.fencingToken);
  }

  const record = { lastExecutionAt: new Date(startedAt).toISOString(), status, durationMs: Date.now() - startedAt, telemetry, errorMessage: error || null, updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.systemSettings).doc('social_publication_worker_telemetry').set(record, { merge: true });
  return { success: status === 'success', status, durationMs: record.durationMs, telemetry, ...(error ? { error } : {}) };
}
