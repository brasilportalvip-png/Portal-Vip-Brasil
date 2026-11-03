import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, ArrowLeft, ExternalLink, Smartphone, Copy, Check, X, Loader2, Store } from 'lucide-react';
import { FrocAvatar, type FrocPhase } from './FrocAvatar';
import { FrocMenu } from './FrocMenu';
import { brazilNow, greetingFor, isPageAllowed, OWNER_TOOLS, type FrocAction, type FrocClientState, type FrocEmotion, type FrocMode } from '../../../shared/froc/brain';
import { detectIntent, heardStopOverSpeech, isLikelyEcho, normalizeUtterance, PAGE_LABEL, type FrocIntent } from '../../../shared/froc/intents';
import { frocChat, FrocApiError, type ChatTurn, type TokenGetter } from '../../froc/api';
import { startFrocListener, mergeFinal, type FrocListener } from '../../froc/listener';
import { speakFrocBrowser, speakFrocNeural, type SpeakHandle, type SpeechAuth } from '../../froc/speaker';
import { takeSentences } from '../../froc/text';
import { deleteChat, listChats, newChatId, saveChat, type SavedChat } from '../../froc/history';
import { describeOwnerAction, needsConfirmation, runOwnerTool, type FrocAttachment } from '../../froc/ownerTools';
import { USER_PORTFOLIO_PROJECTS } from '../../data/portalProjects';
import { apiRequest } from '../../lib/api';

export interface FrocProjectCard {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
  websiteUrl?: string;
  playStoreUrl?: string;
}

interface Props {
  isOwner: boolean;
  isLoggedIn: boolean;
  ownerName?: string | null;
  userId?: string | null;
  getToken: TokenGetter;
  page: string;
  selectedProjectId?: string | null;
  onNavigate: (tab: string) => void;
  onOpenProject: (slug: string) => void;
  onLogin: () => void;
  onLogout: () => void;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  hidden?: boolean;
  wire?: string;
  streaming?: boolean;
  attachments?: FrocAttachment[];
  project?: string;
}

type OwnerAction = Extract<FrocAction, { name: 'owner_tool' }>;

const SEND_DEBOUNCE_MS = 900;
let seq = 0;
const mid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const PHASE_LABEL: Record<FrocPhase, string> = {
  idle: 'à disposição', listening: 'ouvindo você', thinking: 'pensando…', speaking: 'falando', offline: 'desconectado',
};

const VISITOR_CHIPS = ['Quero conhecer a vitrine', 'O que é o Portal VIP Brasil?', 'Algo para espiritualidade', 'Ferramentas de marketing com IA'];
const OWNER_CHIPS = ['Como está o portal hoje?', 'Cria o post do dia', 'Cria uma imagem para divulgar', 'Como está a automação?'];

function projectList(): FrocProjectCard[] {
  return USER_PORTFOLIO_PROJECTS.map((p) => ({ id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, logoUrl: p.logoUrl, websiteUrl: p.websiteUrl, playStoreUrl: p.playStoreUrl }));
}

export function FrocHome(props: Props) {
  const { isOwner, page, getToken, onNavigate, onOpenProject } = props;
  const mode: FrocMode = isOwner ? 'owner' : 'visitor';
  const docked = page !== 'home';
  const historyKey = isOwner && props.userId ? props.userId : 'visitante';

  const [projects, setProjects] = useState<FrocProjectCard[]>(projectList);
  const [chatId, setChatId] = useState(() => newChatId());
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [askDeleteId, setAskDeleteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<FrocPhase>('idle');
  const [emotion, setEmotion] = useState<FrocEmotion>('calmo');
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [clock, setClock] = useState(() => brazilNow(Date.now()));
  const [pending, setPending] = useState<OwnerAction | null>(null);
  const [running, setRunning] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [limited, setLimited] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const messagesRef = useRef<Msg[]>([]);
  const busyRef = useRef(false);
  const listenerRef = useRef<FrocListener | null>(null);
  const wantListenRef = useRef(false);
  const speakQueueRef = useRef<Array<{ text: string; auth: SpeechAuth | null }>>([]);
  const speakingRef = useRef<SpeakHandle | null>(null);
  const speakLoopRef = useRef<Promise<void> | null>(null);
  const neuralFailsRef = useRef(0);
  const voiceOnRef = useRef(true);
  const pendingFinalRef = useRef('');
  const finalTimerRef = useRef<number | null>(null);
  const recentSpokenRef = useRef<{ text: string; at: number }[]>([]);
  const speakingTextRef = useRef('');
  const turnGenRef = useRef(0);
  const chatAbortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<OwnerAction | null>(null);
  const pageRef = useRef(page);
  const openProjectRef = useRef<string | null>(null);
  const visitorNameRef = useRef<string | null>(null);
  const sendRef = useRef<(text: string, o?: { hidden?: boolean; depth?: number; note?: string }) => Promise<void>>(async () => undefined);
  const handleInputRef = useRef<(text: string) => void>(() => undefined);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => { pageRef.current = page; if (page !== 'vitrine') openProjectRef.current = null; }, [page]);
  useEffect(() => { try { visitorNameRef.current = localStorage.getItem('froc_visitor_name'); } catch { /* sem armazenamento */ } }, []);
  useEffect(() => { const t = window.setInterval(() => setClock(brazilNow(Date.now())), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, partial, pending]);

  // Projetos atuais da vitrine (cadastro dinâmico); se falhar, usa os oficiais.
  useEffect(() => {
    let alive = true;
    fetch('/api/portal/projects').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!alive || !Array.isArray(d?.projects) || !d.projects.length) return;
      setProjects(d.projects.map((p: any) => ({ id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, logoUrl: p.logoUrl, websiteUrl: p.websiteUrl, playStoreUrl: p.playStoreUrl })));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  // Conversas salvas (separadas: dono x visitante deste aparelho)
  useEffect(() => { setChats(listChats(historyKey)); setChatId(newChatId()); setMessages([]); setStarted(false); }, [historyKey]);
  useEffect(() => {
    if (messages.some((m) => m.streaming)) return;
    const turns = messages.filter((m) => !m.hidden && m.text).map((m) => ({ role: m.role, text: m.text }));
    if (saveChat(historyKey, chatId, turns)) setChats(listChats(historyKey));
  }, [messages, chatId, historyKey]);

  const state = useCallback((): FrocClientState => ({
    page: pageRef.current,
    openProject: openProjectRef.current,
    pendingConfirm: pendingRef.current ? describeOwnerAction(pendingRef.current) : null,
    runningTools: running,
    visitorName: visitorNameRef.current,
    device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
  }), [running]);

  // ---------------- Voz ----------------
  const stopSpeaking = useCallback(() => {
    speakQueueRef.current = [];
    speakingRef.current?.stop();
    speakingRef.current = null;
    setLevel(0);
  }, []);

  const cancelReply = useCallback(() => {
    turnGenRef.current += 1;
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    stopSpeaking();
  }, [stopSpeaking]);

  const runSpeakLoop = useCallback(() => {
    if (speakLoopRef.current) return;
    speakLoopRef.current = (async () => {
      while (speakQueueRef.current.length) {
        const { text, auth } = speakQueueRef.current.shift()!;
        setPhase('speaking');
        let handle: SpeakHandle;
        if (auth && neuralFailsRef.current < 2) {
          handle = speakFrocNeural(auth, text, setLevel);
          speakingRef.current = handle;
          try { await handle.done; neuralFailsRef.current = 0; continue; } catch {
            if (speakingRef.current !== handle) break; // interrompido
            neuralFailsRef.current += 1;
          }
        }
        handle = speakFrocBrowser(text, setLevel);
        speakingRef.current = handle;
        await handle.done;
      }
      speakingRef.current = null;
      speakLoopRef.current = null;
      speakingTextRef.current = '';
      setPhase((p) => (p === 'speaking' ? (listenerRef.current ? 'listening' : 'idle') : p));
    })();
  }, []);

  const enqueueSpeech = useCallback((sentence: string, auth: SpeechAuth | null) => {
    if (!voiceOnRef.current || !sentence.trim()) return;
    recentSpokenRef.current = [...recentSpokenRef.current, { text: sentence, at: Date.now() }].slice(-10);
    speakingTextRef.current = `${speakingTextRef.current} ${sentence}`.slice(-600);
    speakQueueRef.current.push({ text: sentence, auth });
    runSpeakLoop();
  }, [runSpeakLoop]);

  const ownerAuth: SpeechAuth = useMemo(() => ({ getToken }), [getToken]);

  // ---------------- Ações ----------------
  const addFrocNote = (text: string, extra: Partial<Msg> = {}) => {
    setMessages((prev) => [...prev, { id: mid(), role: 'assistant', text, ...extra }]);
  };

  const executeOwner = useCallback(async (a: OwnerAction, depth: number) => {
    const label = OWNER_TOOLS[a.tool]?.label || a.tool;
    setRunning((r) => [...r, a.tool]);
    try {
      const r = await runOwnerTool(a, (endpoint, options) => apiRequest(endpoint, options as any), { selectedProjectId: props.selectedProjectId });
      if (r.attachments?.length) addFrocNote('', { attachments: r.attachments });
      if (depth < 3) void sendRef.current(`[RESULTADOS DAS FERRAMENTAS]\n${label}: ${r.ok ? 'OK' : 'NÃO FEITO'} — ${r.summary}`, { hidden: true, depth: depth + 1 });
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 240);
      if (depth < 3) void sendRef.current(`[RESULTADOS DAS FERRAMENTAS]\n${label}: FALHOU — ${msg}`, { hidden: true, depth: depth + 1 });
    } finally {
      setRunning((r) => { const i = r.indexOf(a.tool); return i >= 0 ? [...r.slice(0, i), ...r.slice(i + 1)] : r; });
    }
  }, [props.selectedProjectId]);

  const runActions = useCallback(async (actions: FrocAction[], depth: number) => {
    for (const a of actions) {
      switch (a.name) {
        case 'open_page':
          if (isPageAllowed(a.page, mode)) { setExpanded(false); onNavigate(a.page); }
          break;
        case 'open_project':
          openProjectRef.current = a.slug;
          setExpanded(false);
          onOpenProject(a.slug);
          break;
        case 'show_project':
          addFrocNote('', { project: a.slug });
          break;
        case 'close_window':
          if (pageRef.current !== 'home') onNavigate('home');
          break;
        case 'remember_name':
          visitorNameRef.current = a.value;
          try { localStorage.setItem('froc_visitor_name', a.value); } catch { /* ok */ }
          break;
        case 'end_conversation':
          window.setTimeout(() => endConversationRef.current(), 2500);
          break;
        case 'owner_tool':
          if (!isOwner) break;
          if (needsConfirmation(a)) { setPending(a); break; }
          void executeOwner(a, depth);
          break;
      }
    }
  }, [executeOwner, isOwner, mode, onNavigate, onOpenProject]);

  // ---------------- Conversa ----------------
  const send = useCallback(async (text: string, o: { hidden?: boolean; depth?: number; note?: string } = {}) => {
    const clean = text.trim();
    if (!clean) return;
    if (!isOwner && limited && !o.hidden) { onNavigate('vitrine'); return; }
    const gen = turnGenRef.current;
    while (busyRef.current) await new Promise((r) => setTimeout(r, 120));
    if (o.depth && gen !== turnGenRef.current) return;
    busyRef.current = true;
    const myGen = turnGenRef.current;
    const abort = new AbortController();
    chatAbortRef.current = abort;
    setError(null);
    setStarted(true);
    const max = isOwner ? 2600 : 400;
    const userMsg: Msg = { id: mid(), role: 'user', text: clean.slice(0, max), hidden: o.hidden, wire: o.note ? `${clean.slice(0, max)}\n[O APLICATIVO JÁ FEZ AGORA: ${o.note} Não repita; só confirme e guie.]` : undefined };
    const reply: Msg = { id: mid(), role: 'assistant', text: '', streaming: true };
    const history: ChatTurn[] = [...messagesRef.current, userMsg]
      .filter((m) => m.text && !m.streaming)
      .map((m) => ({ role: m.role, content: (m.wire || m.text).slice(0, isOwner ? 6000 : 1200) }))
      .slice(isOwner ? -16 : -6);
    // A conversa precisa começar com a pessoa (o servidor exige que a última seja dela).
    while (history.length && history[0].role !== 'user') history.shift();
    setMessages((prev) => [...prev, userMsg, reply]);
    setPhase('thinking');
    let speechBuf = '';
    try {
      await frocChat(isOwner ? { getToken } : null, { messages: history, state: state() }, {
        onDelta: (piece) => {
          if (myGen !== turnGenRef.current) return;
          setMessages((prev) => prev.map((m) => (m.id === reply.id ? { ...m, text: m.text + piece } : m)));
          if (!isOwner) return; // visitante: a voz espera o selo da resposta completa
          speechBuf += piece;
          const { ready, rest } = takeSentences(speechBuf);
          speechBuf = rest;
          ready.forEach((s) => enqueueSpeech(s, ownerAuth));
        },
        onDone: (r) => {
          if (myGen !== turnGenRef.current) return;
          setEmotion(r.emotion);
          setMessages((prev) => prev.map((m) => (m.id === reply.id ? { ...m, text: r.text, streaming: false } : m)));
          if (isOwner) {
            if (speechBuf.trim()) enqueueSpeech(speechBuf.trim(), ownerAuth);
          } else {
            const auth: SpeechAuth | null = r.speech ? { ticket: { reply: r.text, exp: r.speech.exp, sig: r.speech.sig } } : null;
            const { ready, rest } = takeSentences(`${r.text} `);
            [...ready, rest.trim()].filter(Boolean).forEach((s) => enqueueSpeech(s, auth));
            if (r.limited === 'daily' || r.limited === 'global') setLimited(true);
          }
          speechBuf = '';
          if (!speakLoopRef.current) setPhase(listenerRef.current ? 'listening' : 'idle');
          busyRef.current = false;
          if (r.actions?.length) void runActions(r.actions, o.depth || 0);
        },
      }, abort.signal);
    } catch (e: any) {
      setMessages((prev) => prev.map((m) => (m.id === reply.id ? { ...m, streaming: false } : m)).filter((m) => m.id !== reply.id || m.text));
      if (abort.signal.aborted || myGen !== turnGenRef.current) return;
      setPhase(listenerRef.current ? 'listening' : 'idle');
      if (e instanceof FrocApiError && e.status === 401) setError('Sua sessão expirou. Entre novamente pelo menu.');
      else if (e instanceof FrocApiError && e.status === 429) setError('Muitas mensagens em sequência. Aguarde alguns segundos.');
      else setError(e instanceof FrocApiError ? e.message : 'Sem conexão com o Froc agora. Verifique a internet.');
    } finally {
      busyRef.current = false;
      if (chatAbortRef.current === abort) chatAbortRef.current = null;
    }
  }, [enqueueSpeech, getToken, isOwner, limited, onNavigate, ownerAuth, runActions, state]);
  sendRef.current = send;

  // ---------------- Escuta ----------------
  const stopListening = useCallback(() => {
    wantListenRef.current = false;
    listenerRef.current?.stop();
    listenerRef.current = null;
    setListening(false);
    setPartial('');
    setPhase((p) => (p === 'listening' ? 'idle' : p));
  }, []);

  function isEcho(text: string): boolean {
    const n = normalizeUtterance(text);
    if (!n) return true;
    if (speakLoopRef.current && normalizeUtterance(speakingTextRef.current).includes(n)) return true;
    const recent = recentSpokenRef.current.filter((r) => Date.now() - r.at < 25_000).map((r) => r.text);
    return isLikelyEcho(text, recent);
  }

  const startListening = useCallback(async () => {
    wantListenRef.current = true;
    if (listenerRef.current) return;
    setError(null);
    try {
      listenerRef.current = await startFrocListener(isOwner ? getToken : null, {
        onPartial: (t) => { if (speakLoopRef.current && isEcho(t)) return; setPartial(t); },
        onFinal: (t) => {
          if (speakLoopRef.current && heardStopOverSpeech(t, speakingTextRef.current)) {
            pendingFinalRef.current = '';
            setPartial('');
            handleInputRef.current('pare');
            return;
          }
          if (speakLoopRef.current && isEcho(t)) return;
          pendingFinalRef.current = mergeFinal(pendingFinalRef.current, t);
          setPartial(pendingFinalRef.current);
          if (finalTimerRef.current) window.clearTimeout(finalTimerRef.current);
          finalTimerRef.current = window.setTimeout(() => {
            const said = pendingFinalRef.current;
            pendingFinalRef.current = '';
            setPartial('');
            if (!said || isEcho(said)) return;
            handleInputRef.current(said);
          }, SEND_DEBOUNCE_MS);
        },
        onError: (m) => { setError(m); stopListening(); },
        onInterrupted: () => {
          listenerRef.current?.stop();
          listenerRef.current = null;
          window.setTimeout(() => { if (wantListenRef.current) void startListeningRef.current(); }, 900);
        },
      });
      setListening(true);
      setPhase((p) => (p === 'idle' ? 'listening' : p));
    } catch (e: any) {
      setError(e?.message || 'Não foi possível abrir o microfone. Você pode digitar.');
      setListening(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, isOwner, stopListening]);
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  // ---------------- Comandos na hora ----------------
  const confirmPending = useCallback(() => {
    const a = pendingRef.current;
    if (!a) return;
    setPending(null);
    void executeOwner(a, 0);
    void sendRef.current('Confirmado, pode fazer.', { note: `o dono CONFIRMOU e a ferramenta "${OWNER_TOOLS[a.tool]?.label || a.tool}" já começou a rodar.` });
  }, [executeOwner]);

  const cancelPending = useCallback(() => {
    if (!pendingRef.current) return;
    setPending(null);
    void sendRef.current('Cancela, não precisa.', { note: 'o dono CANCELOU a ação; nada foi feito.' });
  }, []);

  const newChat = () => {
    cancelReply();
    setPending(null);
    setMessages([]);
    messagesRef.current = [];
    setChatId(newChatId());
    setPartial('');
    setStarted(false);
    if (docked) onNavigate('home');
  };

  const openChat = (c: SavedChat) => {
    cancelReply();
    const msgs: Msg[] = c.turns.map((t) => ({ id: mid(), role: t.role, text: t.text }));
    setMessages(msgs);
    messagesRef.current = msgs;
    setChatId(c.id);
    setStarted(true);
    if (docked) onNavigate('home');
  };

  const removeChat = (id: string) => {
    deleteChat(historyKey, id);
    if (id === chatId) { cancelReply(); setMessages([]); messagesRef.current = []; setChatId(newChatId()); setStarted(false); }
    setChats(listChats(historyKey));
  };

  const endConversation = useCallback(() => {
    cancelReply();
    stopListening();
    setPending(null);
    setPhase('idle');
    setMessages([]);
    messagesRef.current = [];
    setChatId(newChatId());
    setStarted(false);
  }, [cancelReply, stopListening]);
  const endConversationRef = useRef(endConversation);
  endConversationRef.current = endConversation;

  const runIntent = (intent: FrocIntent): string | null => {
    switch (intent.kind) {
      case 'stop': cancelReply(); return null;
      case 'confirm': cancelReply(); confirmPending(); return null;
      case 'cancel': cancelReply(); cancelPending(); return null;
      case 'new_chat': newChat(); return null;
      case 'end_chat': endConversation(); return null;
      case 'delete_chat': cancelReply(); setChats(listChats(historyKey)); setAskDeleteId(chatId); return null;
      case 'close': cancelReply(); onNavigate('home'); return 'fechei a tela e voltei para a conversa.';
      case 'open': cancelReply(); onNavigate(intent.page); return `abri a tela "${PAGE_LABEL(intent.page)}".`;
    }
  };

  handleInputRef.current = (text: string) => {
    const intent = detectIntent(text, { mode, openPage: pageRef.current, hasWindow: false, hasPending: !!pendingRef.current });
    if (!intent) { if (speakLoopRef.current || busyRef.current) cancelReply(); void sendRef.current(text); return; }
    const done = runIntent(intent);
    // Abrir/fechar: o Froc comenta curto (visitante não gasta: só o dono recebe comentário).
    if (done && isOwner) void sendRef.current(text, { note: done });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    handleInputRef.current(t);
  };

  const begin = useCallback(() => {
    setStarted(true);
    void startListening();
    if (isOwner && !messagesRef.current.some((m) => m.role === 'user')) {
      void sendRef.current('[INÍCIO DA CONVERSA] O dono abriu a conversa agora. Cumprimente pela hora e pelo nome em uma frase e pergunte o que vamos fazer hoje.', { hidden: true });
    }
  }, [isOwner, startListening]);

  const avatarClick = () => {
    if (speakLoopRef.current) { stopSpeaking(); return; }
    if (listening) stopListening(); else begin();
  };

  useEffect(() => () => { listenerRef.current?.stop(); speakingRef.current?.stop(); }, []);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(null), 1500); } catch { /* sem permissão */ }
  };

  const visible = messages.filter((m) => !m.hidden && (m.text || m.streaming || m.attachments?.length || m.project));
  const lastFroc = [...visible].reverse().find((m) => m.role === 'assistant' && m.text);
  const greeting = `${greetingFor(Date.now()).replace(/^./, (c) => c.toUpperCase())}${isOwner && props.ownerName ? `, ${props.ownerName}` : ''}!`;
  const chips = isOwner ? OWNER_CHIPS : VISITOR_CHIPS;

  const projectCard = (slug: string) => {
    const p = projects.find((x) => x.slug === slug || x.id === slug);
    if (!p) return null;
    return (
      <div className="rounded-2xl border border-[#d4a937]/40 bg-black/60 p-3 flex gap-3 items-start" data-testid="froc-project-card">
        {p.logoUrl ? <img src={p.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#f5d67a] text-sm">{p.name}</p>
          {p.tagline && <p className="text-xs text-slate-300 mt-0.5">{p.tagline}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <button type="button" onClick={() => { openProjectRef.current = p.slug; onOpenProject(p.slug); }} className="px-3 py-1.5 rounded-lg bg-[#d4a937] text-black text-xs font-bold cursor-pointer">Ver na vitrine</button>
            {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-emerald-500/60 text-emerald-300 text-xs font-bold inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Abrir site</a>}
            {p.playStoreUrl && <a href={p.playStoreUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-pink-500/60 text-pink-300 text-xs font-bold inline-flex items-center gap-1"><Smartphone className="w-3 h-3" /> App</a>}
          </div>
        </div>
      </div>
    );
  };

  const attachmentView = (a: FrocAttachment, key: string) => {
    if (a.kind === 'image' && a.url) return <a key={key} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.title || 'Imagem criada'} className="rounded-xl max-h-80 border border-[#d4a937]/30" /></a>;
    if (a.kind === 'link' && a.url) return <a key={key} href={a.url} className="text-emerald-300 underline text-sm">{a.title || a.url}</a>;
    if (a.kind === 'text') return (
      <div key={key} className="rounded-xl border border-[#d4a937]/30 bg-black/50 p-3 text-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-[#f5d67a] text-xs">{a.title || 'Texto'}</span>
          <button type="button" onClick={() => copy(a.body || '', key)} className="text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer">{copied === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} {copied === key ? 'Copiado' : 'Copiar'}</button>
        </div>
        <p className="whitespace-pre-wrap text-slate-200 text-[13px] max-h-72 overflow-y-auto pvf-scroll">{a.body}</p>
      </div>
    );
    return null;
  };

  const confirmCard = pending && (
    <div className="rounded-2xl border border-pink-500/60 bg-pink-500/10 p-3" data-testid="froc-confirm">
      <p className="text-xs text-pink-200 font-bold uppercase tracking-wider">Confirmar ação</p>
      <p className="text-sm text-white mt-1">{describeOwnerAction(pending)}</p>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={confirmPending} data-testid="froc-confirm-yes" className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-sm font-bold cursor-pointer">Confirmar</button>
        <button type="button" onClick={cancelPending} data-testid="froc-confirm-no" className="px-4 py-1.5 rounded-lg border border-slate-500 text-slate-200 text-sm cursor-pointer">Cancelar</button>
      </div>
    </div>
  );

  const composer = (
    <form onSubmit={submit} className="flex items-center gap-2" data-testid="froc-composer">
      <button
        type="button"
        onClick={() => (listening ? stopListening() : begin())}
        aria-label={listening ? 'Desligar microfone' : 'Falar com o Froc'}
        data-testid="froc-mic"
        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border ${listening ? 'bg-emerald-500 text-black border-emerald-400' : 'border-[#d4a937]/60 text-[#f5d67a]'}`}
      >
        {listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={isOwner ? 2600 : 400}
        placeholder={limited ? 'Conheça a vitrine para continuar' : isOwner ? 'Peça qualquer coisa, chefe…' : 'Pergunte ao Froc…'}
        aria-label="Mensagem para o Froc"
        data-testid="froc-input"
        className="flex-1 min-w-0 h-11 rounded-full bg-white/5 border border-white/15 focus:border-[#d4a937] px-4 text-sm text-white placeholder:text-slate-500 outline-none"
      />
      <button type="submit" aria-label="Enviar" data-testid="froc-send" className="shrink-0 w-11 h-11 rounded-full bg-[#d4a937] text-black flex items-center justify-center cursor-pointer disabled:opacity-40" disabled={!input.trim()}>
        <Send className="w-5 h-5" />
      </button>
    </form>
  );

  const menu = (
    <FrocMenu
      isOwner={isOwner}
      isLoggedIn={props.isLoggedIn}
      chats={chats}
      currentChatId={chatId}
      conversationOpen={started}
      onNewChat={newChat}
      onOpenChat={openChat}
      onDeleteChat={removeChat}
      onEndChat={endConversation}
      onNavigate={(t) => onNavigate(t)}
      onLogin={props.onLogin}
      onLogout={props.onLogout}
      askDeleteId={askDeleteId}
      onAskDeleteHandled={() => setAskDeleteId(null)}
    />
  );

  const messageList = (
    <div ref={listRef} className="flex-1 overflow-y-auto pvf-scroll px-3 sm:px-0 py-4 space-y-3" data-testid="froc-messages">
      {visible.map((m) => (
        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} pvf-rise`}>
          <div className={`max-w-[88%] sm:max-w-[78%] space-y-2 ${m.text ? `rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'pvf-bubble-user' : 'pvf-bubble-froc'}` : ''}`}>
            {m.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100" data-testid={m.role === 'assistant' ? 'froc-reply' : 'froc-user-msg'}>{m.text}{m.streaming && <span className="inline-block w-2 h-4 bg-[#d4a937] ml-1 animate-pulse align-middle" />}</p>}
            {!m.text && m.streaming && <Loader2 className="w-4 h-4 animate-spin text-[#d4a937]" />}
            {m.project && projectCard(m.project)}
            {m.attachments?.map((a, i) => attachmentView(a, `${m.id}_${i}`))}
          </div>
        </div>
      ))}
      {partial && <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl px-4 py-2 text-sm text-pink-200/80 italic border border-dashed border-pink-500/40">{partial}</p></div>}
      {confirmCard}
      {running.length > 0 && <p className="text-xs text-[#f5d67a] flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Trabalhando: {running.map((t) => OWNER_TOOLS[t]?.label || t).join(', ')}</p>}
      {limited && !isOwner && (
        <button type="button" onClick={() => onNavigate('vitrine')} data-testid="froc-limit-vitrine" className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d4a937] text-black font-bold text-sm cursor-pointer"><Store className="w-4 h-4" /> Conhecer a vitrine</button>
      )}
    </div>
  );

  // ---------------- Barra flutuante (outras telas) ----------------
  if (docked) {
    return (
      <div className="fixed z-[70] bottom-20 lg:bottom-5 right-3 left-3 sm:left-auto sm:w-[400px]" data-testid="froc-dock">
        {expanded ? (
          <div className="pvf-screen rounded-3xl border border-[#d4a937]/50 shadow-2xl flex flex-col h-[70vh] max-h-[560px] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#d4a937]/30">
              <FrocAvatar phase={phase} emotion={emotion} level={level} size={36} onClick={avatarClick} />
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[#f5d67a]">Froc</p><p className="text-[11px] text-slate-400">{PHASE_LABEL[phase]}</p></div>
              <button type="button" onClick={() => onNavigate('home')} className="text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer"><ArrowLeft className="w-3 h-3" /> Tela cheia</button>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Minimizar" className="w-8 h-8 flex items-center justify-center text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {messageList}
            {error && <p className="px-3 text-xs text-pink-300">{error}</p>}
            <div className="p-3 border-t border-white/10">{composer}</div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-full border border-[#d4a937]/60 bg-black/90 backdrop-blur pl-1.5 pr-3 py-1.5 shadow-2xl">
            <FrocAvatar phase={phase} emotion={emotion} level={level} size={44} onClick={avatarClick} />
            <button type="button" onClick={() => setExpanded(true)} className="flex-1 min-w-0 text-left cursor-pointer" data-testid="froc-dock-open">
              <p className="text-xs font-bold text-[#f5d67a]">Froc · {PHASE_LABEL[phase]}</p>
              <p className="text-xs text-slate-300 truncate">{partial || pending ? (partial || 'Aguardando sua confirmação') : lastFroc?.text || (isOwner ? 'Toque para falar comigo, chefe.' : 'Posso te ajudar a escolher um projeto?')}</p>
            </button>
            <button type="button" onClick={() => (listening ? stopListening() : begin())} aria-label="Microfone" className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${listening ? 'bg-emerald-500 text-black' : 'border border-[#d4a937]/60 text-[#f5d67a]'}`}>
              {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------------- Tela inicial (estilo ChatGPT) ----------------
  return (
    <div className="pvf-screen fixed inset-0 z-[60] flex flex-col text-white" data-testid="froc-home">
      <header className="flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-[#d4a937]/20">
        {menu}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <img src="/icons/logo.png" alt="" className="w-7 h-7 rounded-md" />
          <h1 className="pvf-gold-text font-black tracking-widest text-sm sm:text-base truncate">PORTAL VIP BRASIL</h1>
        </div>
        <span className="hidden sm:block text-[11px] text-slate-400 font-mono" data-testid="froc-clock">{clock}</span>
        <button type="button" onClick={() => { setVoiceOn((v) => !v); if (voiceOn) stopSpeaking(); }} aria-label={voiceOn ? 'Desligar voz' : 'Ligar voz'} className="w-10 h-10 rounded-xl border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer">
          {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-3xl mx-auto flex flex-col px-0 sm:px-4">
        {!visible.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
            <FrocAvatar phase={phase} emotion={emotion} level={level} size={150} onClick={avatarClick} label="Falar com o Froc" />
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">{greeting} <span className="pvf-gold-text">Eu sou o Froc.</span></p>
              <p className="text-sm text-slate-400 mt-2" data-testid="froc-subtitle">
                {isOwner ? 'Seu braço direito no Portal VIP Brasil. Fale ou escreva o que precisa: eu faço.' : 'O anfitrião do Portal VIP Brasil. Me conta o que você procura que eu te mostro o projeto certo.'}
              </p>
              <p className="sm:hidden text-[11px] text-slate-500 font-mono mt-2">{clock}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl" data-testid="froc-chips">
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => { setStarted(true); handleInputRef.current(c); }} className="px-3 py-2 rounded-full border border-[#d4a937]/40 text-[13px] text-slate-200 hover:bg-[#d4a937]/10 cursor-pointer">{c}</button>
              ))}
            </div>
            {!isOwner && (
              <button type="button" onClick={() => onNavigate('vitrine')} className="text-sm text-emerald-300 underline cursor-pointer" data-testid="froc-go-vitrine">Ver a vitrine de projetos</button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 sm:px-0 pt-3">
              <FrocAvatar phase={phase} emotion={emotion} level={level} size={44} onClick={avatarClick} />
              <p className="text-xs text-slate-400">Froc · {PHASE_LABEL[phase]}</p>
            </div>
            {messageList}
          </>
        )}
        {error && <p className="px-3 sm:px-0 pb-1 text-xs text-pink-300" role="alert">{error}</p>}
        <div className="px-3 sm:px-0 pb-2 pt-1">{composer}</div>
      </main>

      <footer className="pb-3 pt-1 flex items-center justify-center gap-4 text-[11px] text-slate-500" data-testid="froc-footer">
        <a href="/termos" onClick={(e) => { e.preventDefault(); onNavigate('termos'); }} className="hover:text-[#f5d67a]">Termos de uso</a>
        <span aria-hidden="true">·</span>
        <a href="/privacidade" onClick={(e) => { e.preventDefault(); onNavigate('privacidade'); }} className="hover:text-[#f5d67a]">Política de privacidade</a>
      </footer>
    </div>
  );
}
