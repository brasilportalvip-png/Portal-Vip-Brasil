/**
 * Daemon de retentativas em memória reservado estritamente para ambientes com processo Node.js
 * persistente (ex.: VPS, contêiner Cloud Run ou execução local).
 *
 * AVISO ARQUITETURAL SOBRE A VERCEL (SERVERLESS):
 * Em ambientes serverless como a Vercel, as instâncias são efêmeras e congeladas após o envio da
 * resposta HTTP. Portanto, timers em memória (setTimeout/setInterval/unref) NÃO garantem retentativas na Vercel.
 * Na produção Vercel, o executor de retentativas é o agendador externo (GitHub Actions a cada 5 minutos
 * chamando /api/cron/video-retries com CRON_SECRET).
 */

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
const OPPORTUNISTIC_THROTTLE_MS = 60_000; // 60 segundos entre checagens oportunistas

/**
 * Registra um timer em memória no processo Node.js persistente para acordar e processar o job.
 * Em ambientes serverless (Vercel), a chamada é ignorada de imediato.
 */
export function scheduleRetryWakeup(jobId: string, nextAttemptAt: string | Date | number): void {
  // Ignora completamente se estiver em ambiente serverless (Vercel)
  if (process.env.VERCEL === '1') {
    return;
  }

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
      await processPendingVideoJobs({ trigger: 'in_memory_timer' });
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
  return await processPendingVideoJobs({ trigger: 'daemon_sweep' });
}

/**
 * Checagem oportunista complementar:
 * ATENÇÃO: Serve apenas como auxílio pontual e NUNCA como executor garantido nem substituto
 * do agendador externo.
 * Não utiliza setImmediate solto e não é disparada por recursos estáticos ou rotas públicas.
 */
export function triggerOpportunisticRetryCheck(reqContext?: { path?: string; method?: string }): void {
  // Se houver contexto de rota, bloqueia requisições públicas, estáticas ou de leitura simples (GET)
  if (reqContext?.path) {
    const isPrivateApi = reqContext.path.startsWith('/api/') && !reqContext.path.startsWith('/api/cron/');
    const isMutation = reqContext.method === 'POST' || reqContext.method === 'PATCH' || reqContext.method === 'DELETE';
    if (!isPrivateApi || !isMutation) {
      return;
    }
  }

  const now = Date.now();
  if (now - lastOpportunisticCheck < OPPORTUNISTIC_THROTTLE_MS) {
    return;
  }
  lastOpportunisticCheck = now;

  // Auxílio controlado: sem setImmediate solto, tratando erros de forma segura
  void (async () => {
    try {
      const db = firestore();
      const snap = await db.collection(COLLECTIONS.mediaGenerationJobs)
        .where('status', '==', 'retry_scheduled')
        .limit(1)
        .get()
        .catch(() => null);

      if (snap && !snap.empty) {
        await processPendingVideoJobs({ trigger: 'opportunistic' });
      }
    } catch {
      // Falha silenciosa na checagem oportunista auxiliar
    }
  })();
}

/**
 * Inicia o daemon em segundo plano exclusivamente em processos Node.js persistentes (VPS / Cloud Run / local).
 * Em ambiente serverless da Vercel, o daemon NÃO é iniciado.
 */
export function startVideoRetryDaemon(): void {
  if (process.env.VERCEL === '1') {
    return;
  }
  if (isRunning) return;
  isRunning = true;

  // Sweep inicial com delay suave de 2s para o servidor terminar de subir
  setTimeout(async () => {
    if (!isRunning) return;
    try {
      await processPendingVideoJobs({ trigger: 'daemon_startup' });
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

