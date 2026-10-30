import { COLLECTIONS, firestore, nowIso } from './store.js';
import { recoverStalePublishingPostsR8, processScheduledPostsR8 } from './scheduledPublisherR8.js';
import { sanitizeSecretText } from './aiErrorDiagnostic.js';
import { isGlobalAutomationEnabled } from './automationGate.js';

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

export type SocialWorkerStatus = 'success' | 'error' | 'timeout' | 'skipped_concurrent' | 'blocked_master_off' | 'no_due_posts';
export type SocialExecutionMode = 'blocked_master_off' | 'idle_no_content' | 'published_success' | 'publication_failed';

export interface SocialPublicationWorkerResult {
  success: boolean;
  status: SocialWorkerStatus;
  executionMode?: SocialExecutionMode;
  attempted?: number;
  published?: number;
  failed?: number;
  durationMs: number;
  telemetry: SocialPublicationTelemetry;
  reason?: string;
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

  const isAutoEnabled = await isGlobalAutomationEnabled();
  if (!isAutoEnabled) {
    const record = {
      lastExecutionAt: new Date(startedAt).toISOString(),
      status: 'blocked_master_off' as const,
      executionMode: 'blocked_master_off' as const,
      reason: 'master_off',
      durationMs: Date.now() - startedAt,
      telemetry,
      errorMessage: 'Automação pausada no Botão Mestre (Zero Custos). Publicações automáticas suspensas.',
      updatedAt: nowIso()
    };
    await firestore().collection(COLLECTIONS.systemSettings).doc('social_publication_worker_telemetry').set(record, { merge: true });
    return {
      success: true,
      status: 'blocked_master_off',
      executionMode: 'blocked_master_off',
      attempted: 0,
      published: 0,
      failed: 0,
      durationMs: record.durationMs,
      telemetry,
      reason: 'master_off',
      error: record.errorMessage
    };
  }

  // A plataforma pode encerrar a função perto de 90s. Encerramos antes disso
  // para persistir o item atual e permitir continuação idempotente no ciclo seguinte.
  const timeoutMs = options.timeoutMs || 70_000;
  const workerId = options.workerId || `social_worker_${startedAt}_${Math.random().toString(36).slice(2, 8)}`;
  const lock = await acquireLock(workerId, timeoutMs + 15_000);
  if (!lock.acquired) return { success: false, status: 'skipped_concurrent', durationMs: Date.now() - startedAt, telemetry, reason: 'concurrent_lock_active' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();
  let status: SocialWorkerStatus = 'success';
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

  const executionMode: SocialExecutionMode = status === 'error' || status === 'timeout' || telemetry.failed > 0
    ? 'publication_failed'
    : telemetry.published > 0
      ? 'published_success'
      : 'idle_no_content';

  const reason = executionMode === 'idle_no_content'
    ? 'zero_content_scheduled'
    : executionMode === 'published_success'
      ? 'published_successfully'
      : (error || 'publication_errors');

  const record = {
    lastExecutionAt: new Date(startedAt).toISOString(),
    status,
    executionMode,
    reason,
    durationMs: Date.now() - startedAt,
    telemetry,
    errorMessage: error || null,
    updatedAt: nowIso()
  };
  await firestore().collection(COLLECTIONS.systemSettings).doc('social_publication_worker_telemetry').set(record, { merge: true });
  const finalWorkerStatus = (telemetry.attempted === 0 && telemetry.published === 0 && status === 'success') ? 'no_due_posts' : status;
  return {
    success: status === 'success',
    status: finalWorkerStatus,
    executionMode,
    reason,
    attempted: telemetry.attempted,
    published: telemetry.published,
    failed: telemetry.failed,
    durationMs: record.durationMs,
    telemetry,
    ...(error ? { error } : {})
  };
}
