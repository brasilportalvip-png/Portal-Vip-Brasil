import { firestore, COLLECTIONS } from './store.js';
import { processPendingVideoJobs, setOnRetryScheduledCallback, VideoJobWorkerTelemetry } from './ai.js';

interface RetryTimerEntry {
  jobId: string;
  dueAt: number;
  timer: NodeJS.Timeout;
}

const activeTimers = new Map<string, RetryTimerEntry>();
let sweepInterval: NodeJS.Timeout | null = null;
let lastOpportunisticCheck = 0;
let isRunning = false;

const SWEEP_INTERVAL_MS = 30_000; // 30 segundos
const OPPORTUNISTIC_THROTTLE_MS = 30_000; // 30 segundos entre checagens por requisição

/**
 * Registra um timer em memória no processo Node.js para acordar e processar o job
 * no momento exato de seu nextAttemptAt durante o mesmo dia.
 */
export function scheduleRetryWakeup(jobId: string, nextAttemptAt: string | Date | number): void {
  const targetTime = typeof nextAttemptAt === 'number'
    ? nextAttemptAt
    : new Date(nextAttemptAt).getTime();

  if (!Number.isFinite(targetTime)) return;

  const now = Date.now();
  const delayMs = Math.max(0, targetTime - now);

  // Se já existir um timer para o mesmo job, cancela antes de redefinir
  const existing = activeTimers.get(jobId);
  if (existing) {
    clearTimeout(existing.timer);
    activeTimers.delete(jobId);
  }

  // Se o delay for superior a 24 horas, não mantém timer excessivamente longo
  if (delayMs > 24 * 60 * 60 * 1000) return;

  const timer = setTimeout(async () => {
    activeTimers.delete(jobId);
    try {
      await processPendingVideoJobs();
    } catch (err) {
      console.warn(`[VideoRetryDaemon] Erro ao executar retry programado para ${jobId}:`, err);
    }
  }, delayMs);

  // Evita que o timer impeça encerramento do processo em testes ou scripts
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  activeTimers.set(jobId, { jobId, dueAt: targetTime, timer });
}

/**
 * Realiza uma varredura de jobs em retry_scheduled que já atingiram seu tempo de espera
 * e executa o processamento via processPendingVideoJobs.
 */
export async function sweepDueRetries(): Promise<VideoJobWorkerTelemetry> {
  return await processPendingVideoJobs();
}

/**
 * Gatilho oportunista não bloqueante para ambientes serverless ou servidores com tráfego.
 * É executado em requisições de API, throttled para no máximo uma verificação a cada 30s.
 */
export function triggerOpportunisticRetryCheck(): void {
  const now = Date.now();
  if (now - lastOpportunisticCheck < OPPORTUNISTIC_THROTTLE_MS) {
    return;
  }
  lastOpportunisticCheck = now;

  // Executa assincronamente em background sem bloquear a resposta HTTP
  setImmediate(async () => {
    try {
      // Verifica primeiro se há algum documento em retry_scheduled vencido
      const db = firestore();
      const snap = await db.collection(COLLECTIONS.mediaGenerationJobs)
        .where('status', '==', 'retry_scheduled')
        .limit(1)
        .get()
        .catch(() => null);

      if (snap && !snap.empty) {
        await processPendingVideoJobs();
      }
    } catch (err) {
      // Falha silenciosa em background
    }
  });
}

/**
 * Inicia o daemon em segundo plano no processo Node.js (Cloud Run / VPS / servidor local).
 */
export function startVideoRetryDaemon(): void {
  if (isRunning) return;
  isRunning = true;

  // Sweep inicial com delay suave de 2s para o servidor terminar de subir
  setTimeout(async () => {
    if (!isRunning) return;
    try {
      await processPendingVideoJobs();
    } catch {}
  }, 2000).unref?.();

  // Loop ativo a cada 30s
  sweepInterval = setInterval(async () => {
    if (!isRunning) return;
    try {
      await sweepDueRetries();
    } catch (err) {
      console.warn('[VideoRetryDaemon] Erro no sweep periódico:', err);
    }
  }, SWEEP_INTERVAL_MS);

  if (typeof sweepInterval.unref === 'function') {
    sweepInterval.unref();
  }
}

/**
 * Encerra o daemon e limpa todos os timers (útil para testes ou shutdown gracioso).
 */
export function stopVideoRetryDaemon(): void {
  isRunning = false;
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
  for (const [, entry] of activeTimers) {
    clearTimeout(entry.timer);
  }
  activeTimers.clear();
}

export function isDaemonRunning(): boolean {
  return isRunning;
}

export function getActiveTimerCount(): number {
  return activeTimers.size;
}

// Registra automaticamente o agendador de wakeups no módulo de IA
setOnRetryScheduledCallback(scheduleRetryWakeup);

