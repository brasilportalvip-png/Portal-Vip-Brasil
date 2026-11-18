import { COLLECTIONS, firestore, nowIso } from './store.js';
import { isDue, processAutopilotMultimediaR8 } from './autopilotMultimediaR8.js';
import { isGlobalAutomationEnabled } from './automationGate.js';
import { sanitizeSecretText } from './aiErrorDiagnostic.js';

/**
 * Autopilot de hora em hora.
 * O cron da Vercel roda uma vez por dia (10h). Sem isto, horários como 13h, 15h e 19h
 * configurados no Autopilot NUNCA rodavam. O worker do GitHub Actions (a cada 5 min)
 * chama esta função; ela só trabalha quando algum projeto tem horário agora,
 * e cada horário roda uma única vez (lastRunSlot + reserva do job).
 */
export interface HourlyAutopilotResult {
  ran: boolean;
  reason?: string;
  dueProjects?: number;
  processed?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
}

type Deps = {
  process: typeof processAutopilotMultimediaR8;
  globalOn: () => Promise<boolean>;
  now: () => Date;
};

const LOCK_DOC = 'autopilot_hourly';
export const DAILY_TICK_HOUR = 10;

async function acquire(owner: string, ttlMs: number): Promise<boolean> {
  const ref = firestore().collection(COLLECTIONS.schedulerLocks).doc(LOCK_DOC);
  const now = Date.now();
  return firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    if (Number(data.lockedUntil || 0) > now) return false;
    tx.set(ref, { owner, lockedUntil: now + ttlMs, acquiredAt: nowIso(), updatedAt: nowIso() }, { merge: true });
    return true;
  });
}

async function release(owner: string) {
  const ref = firestore().collection(COLLECTIONS.schedulerLocks).doc(LOCK_DOC);
  await firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.owner === owner) tx.set(ref, { lockedUntil: 0, releasedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
  }).catch(() => undefined);
}

export async function runHourlyAutopilot(options: { budgetMs: number }, deps: Partial<Deps> = {}): Promise<HourlyAutopilotResult> {
  const d: Deps = { process: processAutopilotMultimediaR8, globalOn: isGlobalAutomationEnabled, now: () => new Date(), ...deps };
  if (options.budgetMs < 30_000) return { ran: false, reason: 'sem_tempo_neste_ciclo' };
  const now = d.now();
  const br = new Date(now.getTime() - 3 * 3600_000);
  const hour = br.getUTCHours();
  const minute = br.getUTCMinutes();
  // 10h é do ciclo diário da Vercel (que já roda o Autopilot): não disputamos com ele.
  if (hour === DAILY_TICK_HOUR) return { ran: false, reason: 'horario_do_ciclo_diario' };
  // Só nos primeiros 15 minutos da hora: no máximo ~3 tentativas por horário se a IA falhar.
  if (minute >= 15) return { ran: false, reason: 'fora_da_janela_da_hora' };
  if (!(await d.globalOn())) return { ran: false, reason: 'botao_mestre_desligado' };
  const tick = await firestore().collection(COLLECTIONS.schedulerLocks).doc('process').get().catch(() => null);
  if (tick && tick.exists && Number(tick.data()?.lockedUntil || 0) > Date.now()) return { ran: false, reason: 'ciclo_diario_rodando' };

  // Pré-checagem barata: só segue se algum projeto tem horário AGORA.
  const snap = await firestore().collection(COLLECTIONS.autopilotConfigs).where('enabled', '==', true).get();
  const due = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })).filter((ap: any) => {
    try { return isDue(ap, now); } catch { return false; }
  });
  if (!due.length) return { ran: false, reason: 'nenhum_projeto_neste_horario', dueProjects: 0 };

  const owner = `hourly_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (!(await acquire(owner, options.budgetMs + 15_000))) return { ran: false, reason: 'outro_ciclo_rodando', dueProjects: due.length };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.budgetMs);
  if (typeof (timer as any).unref === 'function') (timer as any).unref();
  try {
    const result = await d.process({ signal: controller.signal });
    return { ran: true, dueProjects: due.length, processed: result.processed, successCount: result.successCount, failedCount: result.failedCount };
  } catch (error) {
    return { ran: true, dueProjects: due.length, error: sanitizeSecretText(error).slice(0, 300) };
  } finally {
    clearTimeout(timer);
    await release(owner);
    await firestore().collection(COLLECTIONS.systemSettings).doc('autopilot_hourly_telemetry')
      .set({ lastCheckAt: nowIso(), dueProjects: due.length }, { merge: true }).catch(() => undefined);
  }
}
