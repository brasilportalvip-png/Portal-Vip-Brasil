import crypto from 'crypto';
import { firestore, COLLECTIONS } from './store.js';
import { config } from '../config/index.js';
import { processPendingVideoJobs, VideoJobWorkerTelemetry } from './ai.js';

export interface VideoRetryExecutionRecord {
  lastExecutionAt: string;
  trigger: string;
  status: 'success' | 'error' | 'timeout' | 'skipped_concurrent';
  durationMs: number;
  telemetry: VideoJobWorkerTelemetry;
  fencingToken: number;
  workerId: string;
  errorMessage?: string;
  updatedAt: string;
}

export interface VideoRetryWorkerHealth {
  healthy: boolean;
  lastExecutionAt: string | null;
  trigger: string | null;
  status: string | null;
  durationMs: number | null;
  telemetry: VideoJobWorkerTelemetry;
  isCronSecretConfigured: boolean;
}

const DEFAULT_TELEMETRY: VideoJobWorkerTelemetry = {
  checked: 0,
  started: 0,
  retryScheduled: 0,
  completed: 0,
  published: 0,
  failed: 0
};

/**
 * Validação segura de autenticação de cron usando comparação em tempo constante
 * para prevenir ataques de temporização (timing attacks).
 */
export function verifyCronAuthorization(headerAuth: string | undefined): boolean {
  const expectedSecret = config.cronSecret;
  if (!expectedSecret || typeof expectedSecret !== 'string' || expectedSecret.trim() === '') {
    return false;
  }
  if (!headerAuth || typeof headerAuth !== 'string') {
    return false;
  }

  const expectedHeader = `Bearer ${expectedSecret.trim()}`;
  const actualHeader = headerAuth.trim();

  const expectedBuffer = Buffer.from(expectedHeader, 'utf8');
  const actualBuffer = Buffer.from(actualHeader, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Adquire a trava atômica distribuída de execução do cron no Firestore.
 * Impede chamadas concorrentes e ataques de replay simultâneo.
 */
export async function acquireVideoRetryCronLock(
  workerId: string,
  ttlMs = 90_000
): Promise<{ acquired: boolean; fencingToken: number; reason?: string }> {
  const db = firestore();
  const lockRef = db.collection(COLLECTIONS.schedulerLocks).doc('video_retries');
  const now = Date.now();

  return await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(lockRef);
    const data = snap.exists ? (snap.data() || {}) : {};

    const currentLockUntil = typeof data.lockedUntil === 'number' ? data.lockedUntil : 0;
    const isLocked = currentLockUntil > now;

    if (isLocked) {
      return {
        acquired: false,
        fencingToken: Number(data.fencingToken || 0),
        reason: 'concurrent_execution_active'
      };
    }

    const currentFence = Number(data.fencingToken || 0);
    const nextFence = Number.isSafeInteger(currentFence) && currentFence >= 0 ? currentFence + 1 : 1;

    const lockData = {
      id: 'video_retries',
      owner: workerId,
      fencingToken: nextFence,
      lockedUntil: now + ttlMs,
      acquiredAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    };

    tx.set(lockRef, lockData, { merge: true });
    return { acquired: true, fencingToken: nextFence };
  });
}

/**
 * Libera a trava atômica distribuída no Firestore.
 */
export async function releaseVideoRetryCronLock(
  workerId: string,
  fencingToken: number
): Promise<void> {
  const db = firestore();
  const lockRef = db.collection(COLLECTIONS.schedulerLocks).doc('video_retries');
  const now = Date.now();

  try {
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(lockRef);
      if (!snap.exists) return;
      const data = snap.data() || {};
      // Só libera se o proprietário e o fencing token ainda coincidirem
      if (data.owner === workerId && data.fencingToken === fencingToken) {
        tx.set(lockRef, {
          lockedUntil: 0,
          releasedAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString()
        }, { merge: true });
      }
    });
  } catch (err) {
    console.warn('[VideoRetryWorker] Falha ao liberar lock:', err);
  }
}

/**
 * Persiste o registro de telemetria no Firestore (documento permanente, não volátil).
 */
export async function saveVideoRetryTelemetry(record: VideoRetryExecutionRecord): Promise<void> {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.systemSettings).doc('video_retry_worker_telemetry');
  await docRef.set(record, { merge: true });
}

/**
 * Retorna o status de saúde administrativo do worker diretamente do Firestore,
 * sem jamais revelar o segredo CRON_SECRET ou dados sensíveis de jobs.
 */
export async function getVideoRetryWorkerHealth(): Promise<VideoRetryWorkerHealth> {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.systemSettings).doc('video_retry_worker_telemetry');
  const snap = await docRef.get().catch(() => null);

  const hasSecret = Boolean(config.cronSecret && config.cronSecret.trim().length > 0);

  if (!snap || !snap.exists) {
    return {
      healthy: true,
      lastExecutionAt: null,
      trigger: null,
      status: 'idle',
      durationMs: null,
      telemetry: { ...DEFAULT_TELEMETRY },
      isCronSecretConfigured: hasSecret
    };
  }

  const data = snap.data() || {};
  return {
    healthy: data.status === 'success' || data.status === 'skipped_concurrent',
    lastExecutionAt: typeof data.lastExecutionAt === 'string' ? data.lastExecutionAt : null,
    trigger: typeof data.trigger === 'string' ? data.trigger : null,
    status: typeof data.status === 'string' ? data.status : null,
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : null,
    telemetry: {
      checked: Number(data.telemetry?.checked || 0),
      started: Number(data.telemetry?.started || 0),
      retryScheduled: Number(data.telemetry?.retryScheduled || 0),
      completed: Number(data.telemetry?.completed || 0),
      published: Number(data.telemetry?.published || 0),
      failed: Number(data.telemetry?.failed || 0)
    },
    isCronSecretConfigured: hasSecret
  };
}

export interface RunWorkerResult {
  success: boolean;
  status: 'success' | 'error' | 'timeout' | 'skipped_concurrent';
  trigger: string;
  durationMs: number;
  telemetry: VideoJobWorkerTelemetry;
  error?: string;
}

/**
 * Executor do worker com proteção contra concorrência, timeout para serverless
 * e persistência auditável no Firestore.
 */
export async function runVideoRetryWorker(options: {
  trigger?: string;
  workerId?: string;
  timeoutMs?: number;
} = {}): Promise<RunWorkerResult> {
  const trigger = options.trigger || 'cron';
  const workerId = options.workerId || `worker_cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timeoutMs = options.timeoutMs || 22_000; // Limite seguro para execução serverless (Vercel)
  const startTime = Date.now();
  const startTimeIso = new Date(startTime).toISOString();

  // 1. Aquisição atômica da trava distribuída
  const lock = await acquireVideoRetryCronLock(workerId);
  if (!lock.acquired) {
    const elapsed = Date.now() - startTime;
    // Registra tentativa concorrente na telemetria sem sobrescrever contadores de jobs
    await saveVideoRetryTelemetry({
      lastExecutionAt: startTimeIso,
      trigger,
      status: 'skipped_concurrent',
      durationMs: elapsed,
      telemetry: { ...DEFAULT_TELEMETRY },
      fencingToken: lock.fencingToken,
      workerId,
      updatedAt: new Date().toISOString()
    });

    return {
      success: false,
      status: 'skipped_concurrent',
      trigger,
      durationMs: elapsed,
      telemetry: { ...DEFAULT_TELEMETRY },
      error: 'Execução de retentativas já em andamento sob trava ativa.'
    };
  }

  // 2. Cria AbortController para prevenir que ultrapasse o tempo limite de execução
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  let telemetry: VideoJobWorkerTelemetry = { ...DEFAULT_TELEMETRY };
  let executionStatus: 'success' | 'error' | 'timeout' = 'success';
  let executionError: string | undefined;

  try {
    // Processa os jobs elegíveis
    telemetry = await processPendingVideoJobs({ trigger });
    if (abortController.signal.aborted) {
      executionStatus = 'timeout';
    }
  } catch (err: any) {
    executionStatus = 'error';
    executionError = err?.message || 'Erro inesperado durante processPendingVideoJobs';
    console.error('[VideoRetryWorker] Falha ao processar jobs:', err);
  } finally {
    clearTimeout(timer);
    // Libera a trava atômica
    await releaseVideoRetryCronLock(workerId, lock.fencingToken);
  }

  const durationMs = Date.now() - startTime;

  // 3. Persiste a telemetria duravelmente no Firestore
  await saveVideoRetryTelemetry({
    lastExecutionAt: startTimeIso,
    trigger,
    status: executionStatus,
    durationMs,
    telemetry,
    fencingToken: lock.fencingToken,
    workerId,
    errorMessage: executionError,
    updatedAt: new Date().toISOString()
  });

  return {
    success: executionStatus === 'success',
    status: executionStatus,
    trigger,
    durationMs,
    telemetry,
    error: executionError
  };
}
