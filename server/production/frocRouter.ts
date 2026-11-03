import { Router, type Request, type Response } from 'express';
import { config } from '../config/index.js';
import { requireAdmin, type AuthenticatedRequest } from './auth.js';
import { textAiClient } from './ai.js';
import { listAllPortalProjectsFromDb, PORTAL_VIP_PROJECTS, type PortalProjectItem } from './almaPortfolio.js';
import { CANONICAL_BRAND_DOSSIERS } from './brandDossiers.js';
import { COLLECTIONS, consumeRateLimit, firestore, newId, nowIso } from './store.js';
import { checkVisitorBudget as checkBudget } from './frocGuard.js';
import { signSpeech, verifySpeech } from './frocSeal.js';
import { cleanSpeechText, createLiveTranscriptionToken, FROC_SPEECH_SAMPLE_RATE, synthesizeFrocSpeechStream } from './frocSpeech.js';
import {
  buildFrocSystemPrompt,
  cleanPersonName,
  describeState,
  ownerFirstName,
  readVisitorLimits,
  splitReply,
  streamSafePrefix,
  visitorLimitReply,
  type FrocClientState,
  type FrocMode,
  type FrocProjectKnowledge,
} from '../../shared/froc/brain.js';

/**
 * Froc do Portal VIP Brasil.
 *  POST /api/froc/chat              visitante (sem login): vendedor da vitrine, com limite de gasto
 *  POST /api/froc/owner/chat        dono (admin verificado): assistente com as ferramentas do site
 *  POST /api/froc/owner/speech      voz neural (só o dono)
 *  POST /api/froc/owner/live-token  escuta em tempo real (só o dono)
 *  POST /api/froc/owner/note        anota um pedido do dono
 */
const router = Router();

/** Erro inesperado nunca derruba o servidor nem vaza detalhes. */
const safe = (fn: (req: any, res: Response) => Promise<any>) => async (req: any, res: Response) => {
  try {
    await fn(req, res);
  } catch (err: any) {
    console.error('[Froc] rota', String(err?.message || err).slice(0, 200));
    if (!res.headersSent) res.status(500).json({ error: 'O Froc teve um problema agora. Tente de novo.' });
    else res.end();
  }
};

const VISITOR_ID_RE = /^v_[A-Za-z0-9_-]{8,64}$/;

function speechSecret(): string {
  return config.encryptionKey || config.cronSecret || '';
}
export const FROC_NOTES_COLLECTION = 'froc_owner_notes';

function requestIp(req: Request): string {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim().slice(0, 200) || 'unknown';
}

// ---------------- Conhecimento da vitrine (cache de 5 minutos) ----------------
let knowledgeCache: { at: number; projects: FrocProjectKnowledge[] } | null = null;

export function projectToKnowledge(p: PortalProjectItem): FrocProjectKnowledge {
  const d: any = (CANONICAL_BRAND_DOSSIERS as any)[p.id] || null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline,
    description: p.description,
    highlights: p.highlights,
    targetAudience: p.targetAudience,
    websiteUrl: p.websiteUrl,
    playStoreUrl: p.playStoreUrl,
    hasApp: p.hasApp,
    hooks: d?.conversionHooks,
    ctas: d?.callToActionCatalog,
    differentiators: d?.keyDifferentiators,
    forbidden: d?.editorialNegativeConstraints,
  };
}

export async function loadFrocKnowledge(nowMs = Date.now()): Promise<FrocProjectKnowledge[]> {
  if (knowledgeCache && nowMs - knowledgeCache.at < 5 * 60_000) return knowledgeCache.projects;
  let list: PortalProjectItem[];
  try {
    list = (await listAllPortalProjectsFromDb()).filter((p) => p.active !== false);
  } catch (err: any) {
    console.warn('[Froc] vitrine indisponível, usando projetos oficiais:', String(err?.message || err).slice(0, 160));
    list = PORTAL_VIP_PROJECTS;
  }
  const projects = list.map(projectToKnowledge);
  knowledgeCache = { at: nowMs, projects };
  return projects;
}

export function resetFrocKnowledgeCache(): void { knowledgeCache = null; }

// ---------------- Mensagens ----------------
interface ChatTurn { role: 'user' | 'assistant'; content: string }

export function validateTurns(raw: unknown, mode: FrocMode): ChatTurn[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const L = readVisitorLimits(process.env);
  const recent = raw.slice(mode === 'owner' ? -16 : -L.historyTurns);
  const max = mode === 'owner' ? 6000 : 1200;
  const ok = recent.every((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string' && m.content.length <= max);
  const last: any = recent[recent.length - 1];
  if (!ok || last?.role !== 'user' || !String(last.content).trim()) return null;
  if (mode === 'visitor' && String(last.content).length > L.maxChars) return null;
  return recent.map((m: any) => ({ role: m.role, content: String(m.content) }));
}

function sseStart(res: Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as any).flushHeaders?.();
  return (event: string, data: any) => { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
}

function sendCanned(res: Response, reply: { text: string; emotion: string; actions: any[] }, extra: Record<string, any> = {}) {
  const send = sseStart(res);
  send('delta', { text: reply.text });
  send('done', { ...reply, model: 'canned', ...extra });
  res.end();
}

function modelsFor(mode: FrocMode): string[] {
  const m = config.geminiModels;
  const list = mode === 'owner' ? [m.text, m.fallback] : [m.fallback, m.text];
  return [...new Set(list.filter(Boolean))];
}

async function streamFroc(res: Response, mode: FrocMode, systemInstruction: string, state: FrocClientState, turns: ChatTurn[], image?: string, decorate?: (text: string) => Record<string, any>) {
  const contents: any[] = [
    { role: 'user', parts: [{ text: `[ESTADO DO SITE AGORA]\n${describeState(state, mode)}` }] },
    { role: 'model', parts: [{ text: 'Entendido.\n<<<FROC>>>\n{"emotion":"calmo","actions":[]}' }] },
    ...turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
  ];
  const img = mode === 'owner' && typeof image === 'string' && image.length <= 900_000
    ? image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
    : null;
  if (img) contents[contents.length - 1].parts.push({ inlineData: { mimeType: `image/${img[1]}`, data: img[2] } });

  const send = sseStart(res);
  let buffer = '';
  let sent = 0;
  let model = '';
  let client: any;
  try {
    client = textAiClient();
  } catch {
    send('error', { error: 'O Froc está sem conexão com a inteligência agora.' });
    res.end();
    return null;
  }
  const maxOutputTokens = mode === 'owner' ? 1400 : readVisitorLimits(process.env).maxOutputTokens;
  for (const candidate of modelsFor(mode)) {
    if (sent > 0) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const stream: any = await client.models.generateContentStream({
        model: candidate,
        contents,
        config: { systemInstruction, temperature: mode === 'owner' ? 0.7 : 0.85, maxOutputTokens, abortSignal: controller.signal },
      });
      for await (const chunk of stream) {
        const piece = typeof chunk?.text === 'string' ? chunk.text : '';
        if (!piece) continue;
        buffer += piece;
        const safe = streamSafePrefix(buffer);
        if (safe.length > sent) {
          send('delta', { text: safe.slice(sent) });
          sent = safe.length;
        }
      }
      model = candidate;
      clearTimeout(timer);
      break;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn('[Froc] modelo falhou', candidate, String(err?.message || err).slice(0, 160));
    }
  }
  if (!buffer.trim()) {
    send('error', { error: 'O Froc perdeu a conexão por um instante. Fala de novo?' });
    res.end();
    return null;
  }
  const parsed = splitReply(buffer, mode);
  send('done', { ...parsed, model, ...(decorate ? decorate(parsed.text) : {}) });
  res.end();
  return parsed;
}

function cleanState(raw: any): FrocClientState {
  const s = raw && typeof raw === 'object' ? raw : {};
  const str = (v: any, n = 80) => (typeof v === 'string' ? v.replace(/[<>\n\r]/g, ' ').trim().slice(0, n) : null);
  return {
    page: str(s.page, 40),
    openProject: str(s.openProject, 90),
    pendingConfirm: str(s.pendingConfirm, 160),
    runningTools: Array.isArray(s.runningTools) ? s.runningTools.slice(0, 6).map((t: any) => str(t, 40)).filter(Boolean) as string[] : [],
    visitorName: cleanPersonName(s.visitorName) || null,
    device: s.device === 'mobile' ? 'mobile' : 'desktop',
  };
}

// ---------------- Visitante ----------------
router.post('/froc/chat', safe(async (req: Request, res: Response) => {
  const visitorId = String(req.headers['x-froc-visitor'] || '');
  if (!VISITOR_ID_RE.test(visitorId)) return res.status(400).json({ error: 'Visitante inválido.' });
  const turns = validateTurns(req.body?.messages, 'visitor');
  if (!turns) return res.status(400).json({ error: `Mensagem inválida (máximo ${readVisitorLimits(process.env).maxChars} caracteres).` });
  const state = cleanState(req.body?.state);

  const gate = await checkBudget(requestIp(req), visitorId, consumeRateLimit);
  if (!gate.allowed) {
    const canned = visitorLimitReply(gate.reason || 'global', state.visitorName);
    return sendCanned(res, canned, { limited: gate.reason, speech: signSpeech(visitorId, canned.text, Date.now(), speechSecret()) });
  }

  const projects = await loadFrocKnowledge();
  const systemInstruction = buildFrocSystemPrompt({ mode: 'visitor', nowMs: Date.now(), visitorName: state.visitorName, projects, visitorTurnsLeft: gate.turnsLeft });
  await streamFroc(res, 'visitor', systemInstruction, state, turns, undefined, (text) => ({ speech: signSpeech(visitorId, text, Date.now(), speechSecret()) }));
}));

/** Voz neural para o visitante: só respostas seladas pelo servidor, com limite. */
router.post('/froc/speech', safe(async (req: Request, res: Response) => {
  const visitorId = String(req.headers['x-froc-visitor'] || '');
  if (!VISITOR_ID_RE.test(visitorId)) return res.status(400).json({ error: 'Visitante inválido.' });
  const text = cleanSpeechText(String(req.body?.text || ''));
  const reply = String(req.body?.reply || '').slice(0, 3000);
  if (!verifySpeech(visitorId, text, reply, Number(req.body?.exp), String(req.body?.sig || ''), Date.now(), speechSecret())) {
    return res.status(403).json({ error: 'Fala não autorizada.', code: 'speech_not_signed' });
  }
  try {
    const r = await consumeRateLimit({ key: `froc-v-speech:${visitorId}`, limit: 40, windowMs: 10 * 60_000 });
    const ip = await consumeRateLimit({ key: `froc-v-speech-ip:${requestIp(req)}`, limit: 120, windowMs: 10 * 60_000 });
    if (!r.allowed || !ip.allowed) return res.status(429).json({ error: 'Muitas falas em sequência.' });
  } catch {
    return res.status(503).json({ error: 'Voz indisponível agora.' });
  }
  await pipeSpeech(res, text);
}));

// ---------------- Dono (admin) ----------------
router.post('/froc/owner/chat', requireAdmin, safe(async (req: AuthenticatedRequest, res: Response) => {
  const turns = validateTurns(req.body?.messages, 'owner');
  if (!turns) return res.status(400).json({ error: 'Mensagem inválida.' });
  const uid = req.user!.id;
  try {
    const r = await consumeRateLimit({ key: `froc-owner:${uid}`, limit: 60, windowMs: 60_000 });
    if (!r.allowed) return res.status(429).json({ error: 'Muitas mensagens em sequência. Aguarde alguns segundos.' });
  } catch { /* o dono não é bloqueado se o contador falhar */ }

  let ownerName = ownerFirstName(req.user!.name, req.user!.email);
  try {
    const snap = await firestore().collection(COLLECTIONS.users).doc(uid).get();
    const saved = cleanPersonName(snap.exists ? (snap.data() as any)?.frocName : '');
    if (saved) ownerName = saved.split(' ')[0];
  } catch { /* usa o nome da conta */ }

  const projects = await loadFrocKnowledge();
  const systemInstruction = buildFrocSystemPrompt({ mode: 'owner', nowMs: Date.now(), ownerName, projects });
  const parsed = await streamFroc(res, 'owner', systemInstruction, cleanState(req.body?.state), turns, req.body?.image);
  const nameAction: any = parsed?.actions.find((a) => a.name === 'remember_name');
  if (nameAction?.value) {
    await firestore().collection(COLLECTIONS.users).doc(uid).set({ frocName: nameAction.value, updatedAt: nowIso() }, { merge: true })
      .catch((err: any) => console.warn('[Froc] não salvou o nome', err?.message));
  }
}));

router.post('/froc/owner/note', requireAdmin, safe(async (req: AuthenticatedRequest, res: Response) => {
  const text = String(req.body?.text || '').replace(/[<>]/g, '').trim().slice(0, 4000);
  if (!text) return res.status(400).json({ error: 'Pedido vazio.' });
  const id = newId('froc_note');
  await firestore().collection(FROC_NOTES_COLLECTION).doc(id).set({ id, text, ownerId: req.user!.id, status: 'aberto', createdAt: nowIso() });
  res.status(201).json({ success: true, id });
}));

router.get('/froc/owner/notes', requireAdmin, safe(async (_req: AuthenticatedRequest, res: Response) => {
  const snap = await firestore().collection(FROC_NOTES_COLLECTION).orderBy('createdAt', 'desc').limit(50).get();
  res.json({ notes: snap.docs.map((d: any) => d.data()) });
}));

router.post('/froc/owner/live-token', requireAdmin, safe(async (_req: AuthenticatedRequest, res: Response) => {
  if (!config.geminiApiKey) return res.status(503).json({ error: 'Escuta em tempo real indisponível.', code: 'live_voice_not_configured' });
  try {
    res.json(await createLiveTranscriptionToken(config.geminiApiKey));
  } catch (err: any) {
    console.error('[Froc] live-token', err?.message);
    res.status(503).json({ error: 'Não foi possível iniciar a escuta em tempo real.', code: 'live_voice_token_unavailable' });
  }
}));

router.post('/froc/owner/speech', requireAdmin, safe(async (req: AuthenticatedRequest, res: Response) => {
  const text = cleanSpeechText(String(req.body?.text || ''));
  if (!text) return res.status(400).json({ error: 'Texto vazio.' });
  await pipeSpeech(res, text);
}));

async function pipeSpeech(res: Response, text: string) {
  if (!text) return res.status(400).json({ error: 'Texto vazio.' });
  if (!config.geminiApiKey) return res.status(503).json({ error: 'Voz neural indisponível.', code: 'tts_not_configured' });
  let started = false;
  try {
    for await (const audio of synthesizeFrocSpeechStream(config.geminiApiKey, text)) {
      if (!started) {
        res.status(200);
        res.setHeader('Content-Type', 'audio/l16');
        res.setHeader('X-Froc-Audio-Sample-Rate', String(FROC_SPEECH_SAMPLE_RATE));
        res.setHeader('Cache-Control', 'no-store');
        (res as any).flushHeaders?.();
        started = true;
      }
      res.write(audio);
    }
    res.end();
  } catch (err: any) {
    console.error('[Froc] tts', err?.message);
    if (!started) return res.status(503).json({ error: 'Voz neural indisponível agora.', code: 'tts_unavailable' });
    res.end();
  }
}

export default router;
