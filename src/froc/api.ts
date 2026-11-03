/**
 * Cliente da conversa com o Froc (SSE): a fala chega em pedaços; no fim vêm emoção e ações.
 * Dono (admin) usa /api/froc/owner/chat com o token; visitante usa /api/froc/chat sem login.
 */
import type { FrocAction, FrocClientState, FrocEmotion } from '../../shared/froc/brain';

export type TokenGetter = () => Promise<string | null>;

export class FrocApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export interface ChatHandlers {
  onDelta: (text: string) => void;
  onDone: (r: { text: string; emotion: FrocEmotion; actions: FrocAction[]; limited?: string; speech?: { exp: number; sig: string } | null }) => void;
}

const VISITOR_KEY = 'froc_visitor_id';

/** Identificador anônimo deste aparelho (para o limite de conversa do visitante). */
export function visitorId(): string {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved && /^v_[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
    const rnd = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const id = `v_${rnd.slice(0, 32)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `v_${Date.now().toString(36)}sessao`;
  }
}

/** Lê um fluxo SSE "event:/data:" (puro, testável). */
export function parseSseChunk(buffer: string): { events: { event: string; data: any }[]; rest: string } {
  const events: { event: string; data: any }[] = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (!data.length) continue;
    try { events.push({ event, data: JSON.parse(data.join('\n')) }); } catch { /* quadro inválido */ }
  }
  return { events, rest };
}

export async function frocChat(
  owner: { getToken: TokenGetter } | null,
  payload: { messages: ChatTurn[]; state: FrocClientState; image?: string },
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = '/api/froc/chat';
  if (owner) {
    const token = await owner.getToken();
    if (!token) throw new FrocApiError('Sua sessão de administrador expirou. Entre novamente.', 401);
    headers.Authorization = `Bearer ${token}`;
    url = '/api/froc/owner/chat';
  } else {
    headers['X-Froc-Visitor'] = visitorId();
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });
  if (!res.ok || !res.body) {
    const body: any = await res.json().catch(() => ({}));
    throw new FrocApiError(body?.error || 'O Froc não respondeu.', res.status, body?.code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    for (const ev of parsed.events) {
      if (ev.event === 'delta') handlers.onDelta(String(ev.data?.text || ''));
      else if (ev.event === 'done') { finished = true; handlers.onDone(ev.data); }
      else if (ev.event === 'error') throw new FrocApiError(ev.data?.error || 'Conexão perdida.', 502, 'STREAM_ERROR');
    }
  }
  if (!finished) throw new FrocApiError('A resposta do Froc foi interrompida.', 502, 'STREAM_CUT');
}
