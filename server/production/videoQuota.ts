import { COLLECTIONS, firestore, nowIso } from './store.js';
import { getMasterAutomationControl } from './automationGate.js';

/**
 * "Limite Máximo de Vídeos por dia" da tela de Automação.
 * Antes o valor era salvo mas NINGUÉM o respeitava: com 11 projetos ligados saíam 11 vídeos Veo por dia
 * (o mais caro do portal). Agora cada vídeo AUTOMÁTICO reserva uma vaga do dia (horário de Brasília);
 * acabou a cota, o Autopilot publica só imagem e texto. Vídeos que você cria na mão não entram na conta.
 */
export function brazilDay(nowMs = Date.now()): string {
  return new Date(nowMs - 3 * 3600_000).toISOString().slice(0, 10);
}

export async function reserveAutomatedVideoSlot(info: { projectId?: string; nowMs?: number } = {}): Promise<{ allowed: boolean; used: number; limit: number; day: string }> {
  const master = await getMasterAutomationControl();
  const limit = Math.max(0, Math.min(10, Math.round(Number(master.maxDailyVideos ?? 1))));
  const day = brazilDay(info.nowMs);
  const ref = firestore().collection(COLLECTIONS.systemSettings).doc(`automation_video_quota_${day}`);
  return firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const used = Number(snap.exists ? snap.data()?.used || 0 : 0);
    if (used >= limit) return { allowed: false, used, limit, day };
    const projects = snap.exists && Array.isArray(snap.data()?.projects) ? snap.data().projects : [];
    tx.set(ref, { day, used: used + 1, limit, projects: [...projects, info.projectId || ''].slice(-50), updatedAt: nowIso() }, { merge: true });
    return { allowed: true, used: used + 1, limit, day };
  });
}

export async function automatedVideosToday(nowMs = Date.now()): Promise<{ used: number; day: string }> {
  const day = brazilDay(nowMs);
  const snap = await firestore().collection(COLLECTIONS.systemSettings).doc(`automation_video_quota_${day}`).get().catch(() => null);
  return { used: Number(snap && snap.exists ? snap.data()?.used || 0 : 0), day };
}
