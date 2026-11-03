/**
 * Comandos rápidos que o site executa NA HORA, sem esperar a IA (puro, testável):
 * parar, fechar a janela, abrir uma tela, nova/fechar/apagar conversa, confirmar/cancelar.
 */
import { FROC_PAGES, isPageAllowed, type FrocMode } from './brain';

export type FrocIntent =
  | { kind: 'stop' }
  | { kind: 'close' }
  | { kind: 'open'; page: string }
  | { kind: 'new_chat' }
  | { kind: 'end_chat' }
  | { kind: 'delete_chat' }
  | { kind: 'confirm' }
  | { kind: 'cancel' };

export function normalizeUtterance(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NEW_CHAT_RE = /\b(nova conversa|novo chat|conversa nova|outra conversa|comecar de novo|comeca de novo|recomecar|do zero)\b/;
const END_CHAT_RE = /\b(fecha|fechar|feche|encerra|encerrar|encerre|termina|terminar|finaliza|finalizar|desliga|desligar)( a| essa| esta| nossa| o| este| esse)? (conversa|chat|papo)\b/;
const DELETE_CHAT_RE = /\b(apaga|apagar|apague|exclui|excluir|exclua|deleta|deletar|limpa|limpar|limpe)\b.{0,14}\b(conversa|conversas|historico|mensagens|chat)\b/;
const STOP_RE = /^(froc |frog )?(para|pare|parar|chega|silencio|cala a boca|cala|quieto|stop|espera|pera|calma)( froc)?( por favor)?$/;
const CLOSE_RE = /^(froc )?(fecha|fechar|feche|sai|sair|saia|encerra|encerrar|encerre|volta|voltar|volte|fecha isso|fecha a janela|fecha a tela|fechar janela|fechar tela|volta pra conversa|volta para conversa|volta pro inicio|volta para o inicio|tela inicial|inicio)( isso| ai| tudo| a janela| a tela| essa tela| essa janela)?( por favor)?( froc)?$/;
const CONFIRM_RE = /^(sim|pode|pode sim|pode fazer|pode ir|manda|manda ver|confirma|confirmo|confirmado|isso|isso mesmo|faz|faca|vai|bora|ok|beleza|fechado|positivo|autorizo|pode confirmar)( sim)?( froc)?( por favor)?$/;
const CANCEL_RE = /^(nao|cancela|cancelar|cancele|deixa|deixa pra la|esquece|melhor nao|agora nao|nao precisa|negativo)( froc)?( por favor)?$/;
const OPEN_RE = /\b(abre|abra|abrir|abri|mostra|mostre|me mostra|vai pra|vai para|vamos pra|vamos para|quero ver|quero abrir|leva pra|leva para|ir pra|ir para|entra na|entra no|entrar na|entrar no)\b/;

const PAGE_WORDS: Array<[string, RegExp]> = [
  ['vitrine', /\b(vitrine|projetos da vitrine|catalogo)\b/],
  ['blog', /\b(blog|posts|artigos|noticias|magazine)\b/],
  ['termos', /\b(termos|termo de uso|termos de uso)\b/],
  ['privacidade', /\b(politica|privacidade|politica de privacidade)\b/],
  ['dashboard', /\b(painel|dashboard|central de operacao|central)\b/],
  ['projetos', /\b(meus projetos|projetos e sites|meus sites)\b/],
  ['autopilot', /\b(automacao|autopilot|piloto automatico)\b/],
  ['criar-imagem', /\b(criar imagem|criador de imagem|tela de imagem)\b/],
  ['criar-video', /\b(criar video|criador de video|tela de video)\b/],
  ['criar-artigo', /\b(criar artigo|tela de artigo)\b/],
  ['criar-conteudo', /\b(criar conteudo|criar post|criador de conteudo)\b/],
  ['agentes', /\b(agentes|30 agentes)\b/],
  ['seo', /\b(seo|pings?)\b/],
  ['campanhas', /\b(campanhas?)\b/],
  ['calendario', /\b(calendario|agenda de publicacoes|agendamentos)\b/],
  ['redes-sociais', /\b(redes sociais|conexoes das redes)\b/],
  ['conteudos', /\b(biblioteca|conteudos|meus conteudos)\b/],
  ['analytics', /\b(analytics|estatisticas|metricas)\b/],
  ['perfil', /\b(configuracoes|configuracao|ajustes|perfil)\b/],
  ['admin', /\b(admin|administracao)\b/],
  ['suporte', /\b(suporte|chamados)\b/],
];

export function pageFromText(n: string, mode: FrocMode): string | null {
  for (const [page, re] of PAGE_WORDS) {
    if (re.test(n) && isPageAllowed(page, mode)) return page;
  }
  return null;
}

/**
 * @param openPage tela aberta agora ('home' = conversa)
 * @param hasPending há uma ação esperando confirmação do dono
 */
export function detectIntent(text: string, ctx: { mode: FrocMode; openPage: string; hasWindow: boolean; hasPending: boolean }): FrocIntent | null {
  const n = normalizeUtterance(text);
  if (!n || n.split(' ').length > 12) return null;

  if (ctx.hasPending && CONFIRM_RE.test(n)) return { kind: 'confirm' };
  if (ctx.hasPending && CANCEL_RE.test(n)) return { kind: 'cancel' };
  if (STOP_RE.test(n)) return { kind: 'stop' };
  if (DELETE_CHAT_RE.test(n)) return { kind: 'delete_chat' };
  if (NEW_CHAT_RE.test(n)) return { kind: 'new_chat' };
  if (END_CHAT_RE.test(n)) return { kind: 'end_chat' };
  if (/\b(nao|nunca)\b/.test(n)) return null;
  if (CLOSE_RE.test(n) && (ctx.openPage !== 'home' || ctx.hasWindow)) return { kind: 'close' };

  const page = pageFromText(n, ctx.mode);
  if (page && page !== ctx.openPage && (OPEN_RE.test(n) || n.split(' ').length <= 3)) return { kind: 'open', page };
  return null;
}

/** A fala transcrita é eco do próprio Froc saindo do alto-falante? */
export function isLikelyEcho(transcript: string, recentFrocSpeech: string[]): boolean {
  const words = normalizeUtterance(transcript).split(' ').filter((w) => w.length > 2);
  if (words.length < 2) return false;
  const spoken = new Set(normalizeUtterance(recentFrocSpeech.join(' ')).split(' ').filter((w) => w.length > 2));
  if (!spoken.size) return false;
  const hits = words.filter((w) => spoken.has(w)).length;
  return hits / words.length >= 0.6;
}

const STOP_WORDS = ['para', 'pare', 'parar', 'chega', 'silencio', 'cala', 'stop', 'quieto'];

/** A pessoa mandou parar enquanto o Froc falava (palavra que o Froc não estava dizendo)? */
export function heardStopOverSpeech(transcript: string, frocSpeaking: string): boolean {
  const words = normalizeUtterance(transcript).split(' ');
  if (!words.length || words.length > 8) return false;
  const spoken = new Set(normalizeUtterance(frocSpeaking).split(' '));
  return words.some((w) => STOP_WORDS.includes(w) && !spoken.has(w));
}

export const PAGE_LABEL = (page: string) => FROC_PAGES[page]?.label || page;
