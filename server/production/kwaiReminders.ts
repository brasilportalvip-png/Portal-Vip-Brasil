/**
 * Lembretes do Kwai: o Kwai não tem API de postagem, então na hora certa o Portal avisa no celular
 * ("seu vídeo está pronto") e um toque abre o vídeo no compartilhamento para o Kwai.
 *
 * Fila própria (kwaiReminders): cada documento é um aviso pendente; ao ser enviado ele é apagado.
 * A consulta usa só um campo (dueAt), então não exige índice composto no Firestore.
 */
import { COLLECTIONS, createNotification, firestore, nowIso, stableId } from './store.js';
import { sendPushToUser } from './webPush.js';

export const KWAI_REMINDERS = 'kwaiReminders';

export async function queueKwaiReminder(data: {
  key: string;
  userId: string;
  companyId: string;
  contentItemId: string;
  title: string;
  dueAt?: string;
}): Promise<string> {
  const id = `kwai-${stableId(`${data.userId}:${data.key}`)}`;
  await firestore().collection(KWAI_REMINDERS).doc(id).set({
    id,
    userId: data.userId,
    companyId: data.companyId,
    contentItemId: data.contentItemId,
    title: String(data.title || 'Vídeo do Portal').slice(0, 120),
    dueAt: data.dueAt || nowIso(),
    createdAt: nowIso(),
  });
  return id;
}

export function kwaiReminderUrl(contentItemId: string): string {
  return `/conteudos?kwai=${encodeURIComponent(contentItemId)}`;
}

/** Envia os lembretes vencidos (roda no ciclo de 5 minutos, mesmo com o Botão Mestre desligado: custo zero). */
export async function processDueKwaiReminders(options: { limit?: number; sendPush?: typeof sendPushToUser } = {}): Promise<{ sent: number; pushed: number }> {
  const db = firestore();
  const snap = await db.collection(KWAI_REMINDERS).where('dueAt', '<=', nowIso()).limit(options.limit ?? 30).get();
  const push = options.sendPush || sendPushToUser;
  let sent = 0;
  let pushed = 0;
  for (const doc of snap.docs || []) {
    // Reivindica o lembrete apagando-o numa transação: dois ciclos simultâneos nunca avisam em dobro.
    const reminder = await db.runTransaction(async (tx: any) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists) return null;
      tx.delete(doc.ref);
      return fresh.data() as any;
    });
    if (!reminder) continue;
    const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(String(reminder.contentItemId)).get();
    const content = contentSnap.exists ? (contentSnap.data() as any) : null;
    const hasVideo = Boolean(content?.videoUrl);
    const title = hasVideo ? 'Hora de postar no Kwai 🎬' : 'Lembrete do Kwai';
    const body = hasVideo
      ? `"${reminder.title}" está pronto. Toque para enviar o vídeo ao Kwai (a legenda já vai copiada).`
      : `"${reminder.title}" ainda não tem vídeo. Gere o vídeo para postar no Kwai.`;
    await createNotification({ userId: reminder.userId, title, message: body, type: 'kwai_reminder', idempotencyKey: `kwai:${doc.id}` }).catch(() => undefined);
    pushed += await push(reminder.userId, { title, body, url: kwaiReminderUrl(String(reminder.contentItemId)), tag: `kwai-${reminder.contentItemId}` }).catch(() => 0);
    sent++;
  }
  return { sent, pushed };
}
