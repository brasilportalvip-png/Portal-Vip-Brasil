/**
 * Notificações no celular (Web Push) sem pacote externo.
 *
 * - Chaves VAPID: lidas de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; se não existirem, o Portal gera
 *   um par uma única vez e guarda em systemSettings (ninguém precisa criar nada na Vercel).
 * - Conteúdo criptografado conforme RFC 8291 (aes128gcm) + RFC 8188, assinado com VAPID (RFC 8292).
 * - Assinaturas expiradas (404/410) são apagadas sozinhas.
 */
import crypto from 'node:crypto';
import { COLLECTIONS, firestore, nowIso, stableId } from './store.js';

export const PUSH_SUBSCRIPTIONS = 'pushSubscriptions';
const VAPID_DOC = 'web_push_vapid';
const VAPID_SUBJECT = 'mailto:contato@portalvipbrasil.com.br';

const b64u = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString('base64url');
const fromB64u = (value: string) => Buffer.from(String(value || ''), 'base64url');

export interface VapidKeys {
  publicKey: string; // ponto P-256 não comprimido (65 bytes), base64url
  privateKey: string; // escalar d (32 bytes), base64url
}

/** A chave privada P-256 precisa ter exatamente 32 bytes (o Node pode devolver menos se começar com zero). */
function pad32(buf: Buffer): Buffer {
  return buf.length >= 32 ? buf : Buffer.concat([Buffer.alloc(32 - buf.length), buf]);
}

export function generateVapidKeys(): VapidKeys {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(pad32(ecdh.getPrivateKey())) };
}

let cachedKeys: VapidKeys | null = null;

export async function getVapidKeys(): Promise<VapidKeys> {
  if (cachedKeys) return cachedKeys;
  const envPublic = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPrivate = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  if (envPublic && envPrivate) {
    cachedKeys = { publicKey: envPublic, privateKey: envPrivate };
    return cachedKeys;
  }
  const ref = firestore().collection(COLLECTIONS.systemSettings).doc(VAPID_DOC);
  const keys = await firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as any) : null;
    if (data?.publicKey && data?.privateKey) return { publicKey: String(data.publicKey), privateKey: String(data.privateKey) };
    const fresh = generateVapidKeys();
    tx.set(ref, { ...fresh, createdAt: nowIso() });
    return fresh;
  });
  cachedKeys = keys;
  return keys;
}

function privateKeyObject(keys: VapidKeys): crypto.KeyObject {
  const pub = fromB64u(keys.publicKey);
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: b64u(pad32(fromB64u(keys.privateKey))), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk',
  });
}

/** Cabeçalho Authorization VAPID (JWT ES256) para o servidor de push do navegador. */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, expiresInSeconds = 12 * 3600): string {
  const audience = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, sub: VAPID_SUBJECT })));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKeyObject(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${b64u(signature)}, k=${keys.publicKey}`;
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));
}

/** Criptografa o conteúdo para a assinatura do navegador (RFC 8291, aes128gcm). */
export function encryptPushPayload(
  subscription: { p256dh: string; auth: string },
  plaintext: Buffer,
  fixed?: { serverPrivateKey?: Buffer; salt?: Buffer }
): Buffer {
  const userPublic = fromB64u(subscription.p256dh);
  const authSecret = fromB64u(subscription.auth);
  const server = crypto.createECDH('prime256v1');
  if (fixed?.serverPrivateKey) server.setPrivateKey(fixed.serverPrivateKey);
  else server.generateKeys();
  const serverPublic = server.getPublicKey();
  const shared = server.computeSecret(userPublic);
  const salt = fixed?.salt || crypto.randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), userPublic, serverPublic]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([0x02])])), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096);
  return Buffer.concat([salt, recordSize, Buffer.from([serverPublic.length]), serverPublic, body]);
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function savePushSubscription(userId: string, raw: any): Promise<{ id: string }> {
  const endpoint = String(raw?.endpoint || '');
  const p256dh = String(raw?.keys?.p256dh || '');
  const auth = String(raw?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000) throw new Error('Assinatura de notificação inválida.');
  if (fromB64u(p256dh).length !== 65 || fromB64u(auth).length < 16) throw new Error('Chaves da assinatura de notificação inválidas.');
  const id = `push-${stableId(endpoint)}`;
  await firestore().collection(PUSH_SUBSCRIPTIONS).doc(id).set({ id, userId, endpoint, p256dh, auth, updatedAt: nowIso() }, { merge: true });
  return { id };
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const id = `push-${stableId(String(endpoint || ''))}`;
  const ref = firestore().collection(PUSH_SUBSCRIPTIONS).doc(id);
  const snap = await ref.get();
  if (snap.exists && (snap.data() as any)?.userId === userId) await ref.delete();
}

export async function countPushSubscriptions(userId: string): Promise<number> {
  const snap = await firestore().collection(PUSH_SUBSCRIPTIONS).where('userId', '==', userId).get();
  return snap.size;
}

type PushFetch = (url: string, init: { method: string; headers: Record<string, string>; body: Buffer; signal?: AbortSignal }) => Promise<{ status: number; text?: () => Promise<string> }>;

export interface PushDeliveryReport {
  devices: number;
  delivered: number;
  failures: Array<{ service: string; status: number | null; detail: string }>;
}

/** Envia para todos os aparelhos do usuário. Devolve quantos receberam. */
export async function sendPushToUser(userId: string, message: PushMessage, fetchImpl: PushFetch = fetch as unknown as PushFetch): Promise<number> {
  return (await sendPushToUserDetailed(userId, message, fetchImpl)).delivered;
}

/** Igual ao envio normal, mas conta o que o serviço de avisos respondeu (para o teste na tela). */
export async function sendPushToUserDetailed(userId: string, message: PushMessage, fetchImpl: PushFetch = fetch as unknown as PushFetch): Promise<PushDeliveryReport> {
  const report: PushDeliveryReport = { devices: 0, delivered: 0, failures: [] };
  const snap = await firestore().collection(PUSH_SUBSCRIPTIONS).where('userId', '==', userId).get();
  if (snap.empty) return report;
  report.devices = snap.size;
  const keys = await getVapidKeys();
  const payload = Buffer.from(JSON.stringify({ title: message.title.slice(0, 120), body: message.body.slice(0, 300), url: message.url, tag: message.tag || 'portal-vip' }));
  for (const doc of snap.docs) {
    const sub = doc.data() as any;
    const service = (() => { try { return new URL(sub.endpoint).host; } catch { return 'desconhecido'; } })();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetchImpl(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: vapidAuthorization(sub.endpoint, keys),
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: '86400',
          Urgency: 'high',
        },
        body: encryptPushPayload({ p256dh: sub.p256dh, auth: sub.auth }, payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (res.status >= 200 && res.status < 300) {
        report.delivered++;
        continue;
      }
      const detail = res.text ? String(await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200) : '';
      if (res.status === 404 || res.status === 410) await doc.ref.delete().catch(() => undefined);
      report.failures.push({ service, status: res.status, detail: res.status === 404 || res.status === 410 ? 'aparelho descadastrado (ative de novo)' : detail });
      console.warn(`[WebPush] ${service} respondeu HTTP ${res.status}: ${detail}`);
    } catch (error: any) {
      const detail = String(error?.message || error).slice(0, 200);
      report.failures.push({ service, status: null, detail });
      console.warn('[WebPush] Falha ao enviar notificação:', detail);
    }
  }
  return report;
}
