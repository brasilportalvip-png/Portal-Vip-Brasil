import crypto from 'crypto';

/**
 * Selo da voz do Froc para visitantes (puro, testável).
 */
// A voz neural só fala respostas que o servidor gerou para este visitante (ninguém usa como TTS grátis).
const SPEECH_TTL_MS = 10 * 60_000;

function normSpeech(s: string): string {
  return String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function signSpeech(visitorId: string, reply: string, nowMs = Date.now(), secret = ''): { exp: number; sig: string } | null {
  if (!secret || !reply) return null;
  const exp = nowMs + SPEECH_TTL_MS;
  const digest = crypto.createHash('sha256').update(normSpeech(reply)).digest('hex');
  const sig = crypto.createHmac('sha256', secret).update(`${visitorId}|${exp}|${digest}`).digest('hex');
  return { exp, sig };
}

/** O trecho pedido faz parte de uma resposta selada, válida e deste visitante? */
export function verifySpeech(visitorId: string, text: string, reply: string, exp: number, sig: string, nowMs = Date.now(), secret = ''): boolean {
  if (!secret || !text || !reply || typeof sig !== 'string' || !/^[a-f0-9]{64}$/.test(sig)) return false;
  if (!Number.isFinite(exp) || exp < nowMs || exp > nowMs + SPEECH_TTL_MS + 5_000) return false;
  const digest = crypto.createHash('sha256').update(normSpeech(reply)).digest('hex');
  const expected = crypto.createHmac('sha256', secret).update(`${visitorId}|${exp}|${digest}`).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) return false;
  const piece = normSpeech(text);
  return !!piece && normSpeech(reply).includes(piece);
}

