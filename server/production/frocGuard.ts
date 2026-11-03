import { readVisitorLimits } from '../../shared/froc/brain.js';

const DAY_MS = 86_400_000;
const BRT_OFFSET_MS = 3 * 3_600_000;

// ---------------- Proteção de gasto com visitantes ----------------
export type VisitorGate = { allowed: boolean; turnsLeft?: number; reason?: 'daily' | 'burst' | 'global' };

export type ConsumeFn = (d: { key: string; limit: number; windowMs: number; nowMs?: number }) => Promise<{ allowed: boolean; remaining: number }>;

export async function checkVisitorBudget(ip: string, visitorId: string, consumeRateLimit: ConsumeFn, env: Record<string, string | undefined> = process.env, nowMs = Date.now()): Promise<VisitorGate> {
  const L = readVisitorLimits(env);
  const brt = nowMs - BRT_OFFSET_MS; // o dia do limite vira à meia-noite de Brasília
  try {
    const burstVid = await consumeRateLimit({ key: `froc-v-burst:${visitorId}`, limit: L.perBurst, windowMs: 10 * 60_000, nowMs });
    const burstIp = await consumeRateLimit({ key: `froc-v-burst-ip:${ip}`, limit: L.perBurst * 3, windowMs: 10 * 60_000, nowMs });
    if (!burstVid.allowed || !burstIp.allowed) return { allowed: false, reason: 'burst' };
    const dayVid = await consumeRateLimit({ key: `froc-v-day:${visitorId}`, limit: L.perDay, windowMs: DAY_MS, nowMs: brt });
    // Várias pessoas podem dividir o mesmo IP (internet do celular): limite por IP é mais largo.
    const dayIp = await consumeRateLimit({ key: `froc-v-day-ip:${ip}`, limit: L.perDay * 4, windowMs: DAY_MS, nowMs: brt });
    if (!dayVid.allowed || !dayIp.allowed) return { allowed: false, reason: 'daily' };
    const global = await consumeRateLimit({ key: 'froc-v-global', limit: L.globalPerDay, windowMs: DAY_MS, nowMs: brt });
    if (!global.allowed) return { allowed: false, reason: 'global' };
    return { allowed: true, turnsLeft: Math.max(0, Math.min(dayVid.remaining, dayIp.remaining)) };
  } catch (err: any) {
    // Sem como contar, não arrisca gastar: responde pronto, sem IA.
    console.warn('[Froc] limite de visitante indisponível (fail-closed):', String(err?.message || err).slice(0, 160));
    return { allowed: false, reason: 'global' };
  }
}

