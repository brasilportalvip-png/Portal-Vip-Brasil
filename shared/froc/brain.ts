/**
 * Froc do Portal VIP Brasil: cérebro compartilhado (servidor e navegador, puro e testável).
 *  - Dono (admin verificado no servidor): assistente pessoal com acesso às ferramentas do site.
 *  - Visitante: vendedor experiente que apresenta a vitrine de projetos.
 * A resposta da IA é: fala, depois o marcador <<<FROC>>> e um JSON {emotion, actions}.
 */
export const FROC_MARK = '<<<FROC>>>';

export const FROC_EMOTIONS = ['calmo', 'animado', 'feliz', 'pensando', 'confiante', 'empolgado', 'preocupado', 'curioso'] as const;
export type FrocEmotion = (typeof FROC_EMOTIONS)[number];

export type FrocMode = 'owner' | 'visitor';

/** Telas do site (mesmos ids do App). */
export const FROC_PAGES: Record<string, { label: string; owner: boolean }> = {
  home: { label: 'Tela inicial (conversa com o Froc)', owner: false },
  vitrine: { label: 'Vitrine de projetos', owner: false },
  blog: { label: 'Blog / posts do portal', owner: false },
  termos: { label: 'Termos de uso', owner: false },
  privacidade: { label: 'Política de privacidade', owner: false },
  dashboard: { label: 'Central de operação (painel)', owner: true },
  projetos: { label: 'Meus projetos & sites', owner: true },
  autopilot: { label: 'Automação (autopilot)', owner: true },
  'criar-conteudo': { label: 'Criar conteúdo / post', owner: true },
  'criar-imagem': { label: 'Criar imagem', owner: true },
  'criar-video': { label: 'Criar vídeo', owner: true },
  'criar-artigo': { label: 'Criar artigo', owner: true },
  agentes: { label: '30 agentes de IA', owner: true },
  seo: { label: 'SEO & pings', owner: true },
  campanhas: { label: 'Campanhas', owner: true },
  calendario: { label: 'Calendário de publicações', owner: true },
  'redes-sociais': { label: 'Redes sociais (conexões)', owner: true },
  conteudos: { label: 'Biblioteca de conteúdos', owner: true },
  analytics: { label: 'Analytics', owner: true },
  perfil: { label: 'Configurações / perfil', owner: true },
  'froc-ia': { label: 'Estratégia Froc IA', owner: true },
  admin: { label: 'Administração (projetos, blog, chamados)', owner: true },
  suporte: { label: 'Suporte', owner: true },
};

export function isPageAllowed(page: string, mode: FrocMode): boolean {
  const p = FROC_PAGES[page];
  return !!p && (mode === 'owner' || !p.owner);
}

/**
 * Ferramentas do dono: cada uma chama um endpoint que JÁ existe e já exige o admin.
 * confirm = o Froc só executa depois que o dono confirmar (custa caro, publica ou muda configuração).
 */
export interface OwnerToolSpec {
  label: string;
  args: string[];
  confirm: boolean;
  /** Pode demorar minutos (o Froc avisa e continua conversando). */
  slow?: boolean;
}

export const OWNER_TOOLS: Record<string, OwnerToolSpec> = {
  // Consultas (rápidas, sem confirmar)
  status_overview: { label: 'Ver status geral do portal', args: [], confirm: false },
  admin_overview: { label: 'Ver resumo da administração', args: [], confirm: false },
  list_projects: { label: 'Listar projetos da vitrine', args: [], confirm: false },
  list_content: { label: 'Listar conteúdos criados', args: [], confirm: false },
  agenda: { label: 'Agenda: o que sai hoje/amanhã/na semana, atrasados, falhas, automação prevista, blog, avisos do Kwai e vídeos em produção (day = hoje, amanhã, AAAA-MM-DD ou DD/MM; days = quantos dias)', args: ['day', 'days', 'projectId'], confirm: false },
  list_scheduled: { label: 'Listar as próximas publicações agendadas (a partir de agora; status opcional: pending, failed, published...)', args: ['status', 'projectId'], confirm: false },
  project_details: { label: 'Ver o cadastro completo de um projeto (slogan, destaques, ângulos, público, site, app, automação)', args: ['projectId'], confirm: false },
  list_campaigns: { label: 'Listar campanhas', args: ['projectId'], confirm: false },
  video_jobs: { label: 'Ver vídeos em produção e os últimos gerados', args: [], confirm: false },
  support_tickets: { label: 'Ver chamados de suporte', args: [], confirm: false },
  system_health: { label: 'Ver a saúde do sistema: agendador, cron, erros recentes e blog', args: [], confirm: false },
  owner_notes: { label: 'Ver os pedidos do dono já anotados', args: [], confirm: false },
  autopilot_overview: { label: 'Ver situação da automação', args: [], confirm: false },
  cost_summary: { label: 'Ver custos da automação', args: [], confirm: false },
  social_readiness: { label: 'Ver redes sociais conectadas', args: [], confirm: false },
  blog_articles: { label: 'Listar artigos do blog', args: [], confirm: false },
  // Criação (salva na biblioteca de conteúdos, nada é publicado sozinho)
  generate_post: { label: 'Criar post para rede social', args: ['topic', 'platform', 'projectId', 'tone', 'goal'], confirm: false, slow: true },
  generate_carousel: { label: 'Criar carrossel', args: ['topic', 'projectId', 'goal'], confirm: false, slow: true },
  generate_video_script: { label: 'Criar roteiro de vídeo', args: ['topic', 'projectId'], confirm: false, slow: true },
  generate_copy: { label: 'Criar legenda / chamada / título', args: ['prompt', 'type', 'projectId'], confirm: false, slow: true },
  generate_strategy: { label: 'Criar estratégia de marketing', args: ['projectId', 'goal', 'timeframe'], confirm: false, slow: true },
  generate_article: { label: 'Criar artigo para a biblioteca', args: ['topic', 'projectId'], confirm: false, slow: true },
  generate_image: { label: 'Criar imagem com IA', args: ['theme', 'aspectRatio', 'projectId', 'style'], confirm: false, slow: true },
  generate_project_article: { label: 'Criar o post/artigo do dia de um projeto no blog', args: ['projectId', 'topic'], confirm: false, slow: true },
  seo_ping_all: { label: 'Avisar Google/Bing sobre as páginas (ping de SEO)', args: [], confirm: false, slow: true },
  save_owner_note: { label: 'Anotar pedido/ideia do dono', args: ['text'], confirm: false },
  // Custam mais, publicam ou mudam configuração: só com confirmação
  generate_video: { label: 'Criar vídeo com IA (Veo)', args: ['prompt', 'projectId', 'aspectRatio'], confirm: true, slow: true },
  daily_pulse: { label: 'Rodar o ciclo diário de marketing de todos os projetos', args: [], confirm: true, slow: true },
  blog_daily_cycle: { label: 'Rodar o ciclo diário do blog', args: [], confirm: true, slow: true },
  autopilot_trigger: { label: 'Disparar a automação agora para um projeto', args: ['projectId'], confirm: true, slow: true },
  autopilot_master: { label: 'Ligar/desligar a automação geral', args: ['globalEnabled', 'mode', 'pauseAllExternalApis'], confirm: true },
  autopilot_project_toggle: { label: 'Ligar/desligar a automação de um projeto', args: ['projectId', 'enabled'], confirm: true },
  update_project: { label: 'Editar dados de um projeto da vitrine', args: ['projectId', 'tagline', 'description', 'highlights', 'keywords', 'targetAudience', 'websiteUrl', 'playStoreUrl', 'active', 'dailyMarketingEnabled', 'dailyBlogEnabled'], confirm: true },
  set_article_status: { label: 'Publicar / despublicar artigo do blog', args: ['articleId', 'status'], confirm: true },
  schedule_content: { label: 'Agendar a publicação de um conteúdo nas redes', args: ['contentItemId', 'scheduledFor', 'projectId', 'platforms'], confirm: true },
  cancel_scheduled: { label: 'Cancelar uma publicação agendada', args: ['scheduledId'], confirm: true },
  retry_scheduled: { label: 'Tentar de novo uma publicação que falhou', args: ['scheduledId'], confirm: true },
  run_scheduler_now: { label: 'Rodar o publicador agora (solta o que estiver na hora ou atrasado)', args: [], confirm: true, slow: true },
};

export type FrocAction =
  | { name: 'open_page'; page: string }
  | { name: 'open_project'; slug: string }
  | { name: 'show_project'; slug: string }
  | { name: 'close_window' }
  | { name: 'remember_name'; value: string }
  | { name: 'end_conversation' }
  | { name: 'owner_tool'; tool: string; args: Record<string, string | number | boolean | string[]> };

const VISITOR_ACTIONS = new Set(['open_page', 'open_project', 'show_project', 'close_window', 'remember_name', 'end_conversation']);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;
const BOOL_ARGS = new Set(['active', 'dailyMarketingEnabled', 'dailyBlogEnabled', 'globalEnabled', 'pauseAllExternalApis', 'enabled']);
const LIST_ARGS = new Set(['highlights', 'keywords', 'platforms']);
const NUMBER_ARGS = new Set(['days']);

function cleanArg(key: string, value: unknown): string | number | boolean | string[] | undefined {
  if (value == null) return undefined;
  if (BOOL_ARGS.has(key)) {
    if (typeof value === 'boolean') return value;
    const s = String(value).toLowerCase().trim();
    if (['true', 'sim', 'ligar', 'ligado', '1'].includes(s)) return true;
    if (['false', 'nao', 'não', 'desligar', 'desligado', '0'].includes(s)) return false;
    return undefined;
  }
  if (NUMBER_ARGS.has(key)) {
    const n = Math.round(Number(String(value).replace(/[^0-9.]/g, '')));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 31) : undefined;
  }
  if (LIST_ARGS.has(key)) {
    const arr = Array.isArray(value) ? value : String(value).split(/\n|;/);
    const out = arr.map((v) => String(v).replace(/[<>]/g, '').trim().slice(0, 200)).filter(Boolean).slice(0, 12);
    return out.length ? out : undefined;
  }
  const max = ['description', 'prompt', 'text', 'topic', 'theme', 'goal', 'targetAudience', 'style'].includes(key) ? 3000 : 300;
  const s = String(value).replace(/[<>]/g, '').trim().slice(0, max);
  return s || undefined;
}

/** Só passam ações conhecidas e permitidas para o modo, com argumentos limpos, no máximo 4. */
export function sanitizeActions(raw: unknown, mode: FrocMode): FrocAction[] {
  if (!Array.isArray(raw)) return [];
  const out: FrocAction[] = [];
  for (const item of raw.slice(0, 8)) {
    const a: any = item || {};
    const name = String(a.name || '');
    if (mode === 'visitor' && !VISITOR_ACTIONS.has(name)) continue;
    if (name === 'open_page') {
      const page = String(a.page || a.tab || '').trim();
      if (!isPageAllowed(page, mode)) continue;
      out.push({ name, page });
    } else if (name === 'open_project' || name === 'show_project') {
      const slug = String(a.slug || '').trim().toLowerCase();
      if (!SLUG_RE.test(slug)) continue;
      out.push({ name, slug });
    } else if (name === 'close_window' || name === 'end_conversation') {
      out.push({ name });
    } else if (name === 'remember_name') {
      const value = cleanPersonName(a.value ?? a.nome);
      if (value) out.push({ name, value });
    } else if (name === 'owner_tool' && mode === 'owner') {
      const tool = String(a.tool || '');
      const spec = Object.prototype.hasOwnProperty.call(OWNER_TOOLS, tool) ? OWNER_TOOLS[tool] : null;
      if (!spec) continue;
      const rawArgs = a.args && typeof a.args === 'object' ? a.args : {};
      const args: Record<string, string | number | boolean | string[]> = {};
      for (const k of spec.args) {
        const v = cleanArg(k, rawArgs[k]);
        if (v !== undefined) args[k] = v;
      }
      out.push({ name, tool, args });
    }
    if (out.length >= 4) break;
  }
  return out;
}

/** Nome de pessoa seguro: só letras; até 3 palavras e 40 letras. */
export function cleanPersonName(raw: unknown): string {
  const words = String(raw ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\s'’-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1).toLocaleLowerCase('pt-BR'));
  const name = words.join(' ').slice(0, 40).trim();
  return name.length >= 2 ? name : '';
}

/** Primeiro nome do dono a partir do perfil (nome da conta; nunca o e-mail). */
export function ownerFirstName(accountName?: string | null, email?: string | null): string | null {
  const account = String(accountName || '').trim();
  const emailUser = String(email || '').split('@')[0].toLowerCase();
  if (!account || account.toLowerCase() === emailUser || /\d|_|\.|@/.test(account)) return null;
  const clean = cleanPersonName(account);
  return clean ? clean.split(' ')[0] : null;
}

export function sanitizeEmotion(raw: unknown): FrocEmotion {
  const e = String(raw || '').toLowerCase();
  return (FROC_EMOTIONS as readonly string[]).includes(e) ? (e as FrocEmotion) : 'calmo';
}

/** Texto bom para falar: sem markdown, sem links, sem listas com símbolos. */
export function cleanSpokenText(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*?|__|#{1,6}\s|`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 2400);
}

export function splitReply(full: string, mode: FrocMode): { text: string; emotion: FrocEmotion; actions: FrocAction[] } {
  const i = full.indexOf(FROC_MARK);
  const text = (i >= 0 ? full.slice(0, i) : full).trim();
  let emotion: FrocEmotion = 'calmo';
  let actions: FrocAction[] = [];
  if (i >= 0) {
    const tail = full.slice(i + FROC_MARK.length).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = tail.indexOf('{');
    const b = tail.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        const meta = JSON.parse(tail.slice(a, b + 1));
        emotion = sanitizeEmotion(meta?.emotion);
        actions = sanitizeActions(meta?.actions, mode);
      } catch { /* bloco inválido: só a fala */ }
    }
  }
  return { text: cleanSpokenText(text), emotion, actions };
}

/** Parte segura para mostrar enquanto chega (segura o começo do marcador). */
export function streamSafePrefix(buffer: string): string {
  const i = buffer.indexOf(FROC_MARK);
  if (i >= 0) return buffer.slice(0, i);
  for (let k = Math.min(FROC_MARK.length - 1, buffer.length); k > 0; k--) {
    if (FROC_MARK.startsWith(buffer.slice(buffer.length - k))) return buffer.slice(0, buffer.length - k);
  }
  return buffer;
}

/** Data e hora exatas de Brasília, por extenso. */
export function brazilNow(nowMs: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(nowMs));
}

/** Data e hora no formato ISO com fuso de Brasília (para agendar). */
export function brazilIso(nowMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(nowMs));
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}-03:00`;
}

export function greetingFor(nowMs: number): 'bom dia' | 'boa tarde' | 'boa noite' {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(nowMs)));
  if (h >= 5 && h < 12) return 'bom dia';
  if (h >= 12 && h < 18) return 'boa tarde';
  return 'boa noite';
}

/** O que o navegador conta para o Froc a cada mensagem. */
export interface FrocClientState {
  page?: string | null;
  openProject?: string | null;
  pendingConfirm?: string | null;
  runningTools?: string[];
  visitorName?: string | null;
  device?: 'mobile' | 'desktop';
}

export function describeState(st: FrocClientState, mode: FrocMode): string {
  const page = st.page && FROC_PAGES[st.page] ? FROC_PAGES[st.page].label : 'tela inicial';
  return [
    `Tela aberta agora: ${page}${st.page ? ` (${st.page})` : ''}`,
    `Projeto aberto na tela: ${st.openProject || 'nenhum'}`,
    mode === 'owner' ? `Aguardando confirmação do dono: ${st.pendingConfirm || 'nada'}` : null,
    mode === 'owner' ? `Tarefas rodando agora: ${(st.runningTools || []).join(', ') || 'nenhuma'}` : null,
    `Aparelho: ${st.device === 'mobile' ? 'celular' : 'computador'}`,
  ].filter(Boolean).join('\n');
}

/** Projeto da vitrine resumido para o Froc conhecer e vender. */
export interface FrocProjectKnowledge {
  id: string;
  slug: string;
  name: string;
  category?: string;
  tagline?: string;
  description?: string;
  highlights?: string[];
  targetAudience?: string;
  websiteUrl?: string;
  playStoreUrl?: string;
  hasApp?: boolean;
  hooks?: string[];
  ctas?: string[];
  differentiators?: string[];
  forbidden?: string[];
}

export function describeProjects(projects: FrocProjectKnowledge[]): string {
  if (!projects.length) return '(a vitrine não carregou agora: fale do Portal VIP Brasil de forma geral e convide para abrir a vitrine)';
  return projects.slice(0, 30).map((p) => {
    const lines = [
      `• ${p.name} [slug: ${p.slug} | id: ${p.id}]${p.category ? ` — ${p.category}` : ''}`,
      p.tagline ? `  Frase: ${p.tagline}` : null,
      p.description ? `  O que é: ${p.description.slice(0, 420)}` : null,
      p.highlights?.length ? `  Destaques: ${p.highlights.slice(0, 6).join(' | ')}` : null,
      p.targetAudience ? `  Para quem: ${p.targetAudience.slice(0, 240)}` : null,
      p.differentiators?.length ? `  Diferenciais: ${p.differentiators.slice(0, 4).join(' | ')}` : null,
      p.hooks?.length ? `  Ganchos de interesse: ${p.hooks.slice(0, 4).join(' | ')}` : null,
      p.ctas?.length ? `  Chamadas: ${p.ctas.slice(0, 3).join(' | ')}` : null,
      `  Site: ${p.websiteUrl || 'não informado'}${p.hasApp && p.playStoreUrl ? ` | App na Play Store: sim` : ''}`,
      p.forbidden?.length ? `  NUNCA prometa/afirme: ${p.forbidden.slice(0, 4).join(' | ')}` : null,
    ];
    return lines.filter(Boolean).join('\n');
  }).join('\n');
}

const FORMAT = `FORMATO OBRIGATÓRIO DA RESPOSTA
Primeiro a fala. Depois, numa linha sozinha, ${FROC_MARK} e um JSON:
{"emotion":"${FROC_EMOTIONS.join('|')}","actions":[]}`;

const VOICE = `JEITO DE FALAR
- Português do Brasil, voz masculina, como gente de verdade: caloroso, rápido, esperto e direto.
- Respostas CURTAS para serem faladas em voz alta: normalmente 1 a 3 frases. Mais só se pedirem.
- Nada de markdown, listas, emojis ou links na fala (o site mostra os botões).`;

export interface FrocPromptInput {
  mode: FrocMode;
  nowMs: number;
  ownerName?: string | null;
  visitorName?: string | null;
  projects: FrocProjectKnowledge[];
  /** Mensagens que o visitante ainda tem hoje (proteção de gasto). */
  visitorTurnsLeft?: number;
}

/** Proteção de gasto com visitantes (o dono/admin não tem limite). */
export const VISITOR_LIMITS = {
  /** Mensagens por visitante por dia. */
  perDay: 12,
  /** Mensagens por visitante a cada 10 minutos. */
  perBurst: 6,
  /** Mensagens de todos os visitantes somados por dia (depois disso, só respostas prontas, sem IA). */
  globalPerDay: 400,
  /** Tamanho máximo da mensagem do visitante. */
  maxChars: 400,
  /** Quantas mensagens anteriores vão para a IA. */
  historyTurns: 6,
  /** Tamanho máximo da resposta. */
  maxOutputTokens: 260,
} as const;

export function readVisitorLimits(env: Record<string, string | undefined>) {
  const n = (v: string | undefined, d: number, min: number, max: number) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) && x > 0 ? Math.max(min, Math.min(max, x)) : d;
  };
  return {
    ...VISITOR_LIMITS,
    perDay: n(env.FROC_VISITOR_DAILY_MESSAGES, VISITOR_LIMITS.perDay, 1, 200),
    perBurst: n(env.FROC_VISITOR_BURST_MESSAGES, VISITOR_LIMITS.perBurst, 1, 50),
    globalPerDay: n(env.FROC_VISITOR_GLOBAL_DAILY, VISITOR_LIMITS.globalPerDay, 10, 100000),
  };
}

/** Respostas prontas (sem custo de IA) quando o limite acaba. */
export function visitorLimitReply(kind: 'daily' | 'burst' | 'global', visitorName?: string | null): { text: string; emotion: FrocEmotion; actions: FrocAction[] } {
  const nome = visitorName ? `, ${visitorName}` : '';
  const text = kind === 'burst'
    ? `Opa${nome}, vamos com calma! Enquanto isso, dá uma olhada na vitrine: lá estão todos os projetos com os detalhes. Daqui a pouquinho a gente continua.`
    : kind === 'daily'
      ? `Foi ótimo conversar com você${nome}! Por hoje chegamos ao limite de conversa por aqui. Na vitrine você encontra todos os projetos com os detalhes e os links. Toca no botão e escolhe o seu. Amanhã eu estou aqui de novo!`
      : `Hoje o movimento está grande por aqui${nome}! Para não te deixar esperando, a vitrine tem tudo: todos os projetos, detalhes e links. Toca no botão e conhece agora.`;
  return { text, emotion: 'feliz', actions: [{ name: 'open_page', page: 'vitrine' }] };
}

export function buildFrocSystemPrompt(input: FrocPromptInput): string {
  const now = `Agora é ${brazilNow(input.nowMs)} (horário de Brasília; ISO ${brazilIso(input.nowMs)}). Você SEMPRE sabe a data e a hora exatas: use isso para cumprimentar (${greetingFor(input.nowMs)}), calcular prazos e agendar.`;
  const pages = Object.entries(FROC_PAGES)
    .filter(([, v]) => input.mode === 'owner' || !v.owner)
    .map(([k, v]) => `- ${k}: ${v.label}`).join('\n');
  const vitrine = `VITRINE DE PROJETOS (conheça cada um na íntegra)\n${describeProjects(input.projects)}`;

  if (input.mode === 'owner') {
    const tools = Object.entries(OWNER_TOOLS)
      .map(([k, v]) => `- ${k}${v.args.length ? ` {${v.args.join(', ')}}` : ''}: ${v.label}${v.confirm ? ' [PRECISA CONFIRMAÇÃO]' : ''}${v.slow ? ' [demora]' : ''}`).join('\n');
    return `Você é o FROC, o braço direito do Portal VIP Brasil. Você é HOMEM: fale no masculino.
Você está falando com o SEU PATRÃO${input.ownerName ? `, ${input.ownerName}` : ''}: o dono e administrador do portal (login de admin verificado pelo servidor).${input.ownerName ? ` Chame-o pelo nome (${input.ownerName}) com naturalidade, como um sócio de confiança, sem repetir em toda frase.` : ' Você ainda não sabe o nome dele: pergunte uma vez como ele quer ser chamado e use remember_name.'}
${now}

SEU PAPEL
- Fazer o Portal VIP Brasil e cada projeto da vitrine crescer: ideias, posts, imagens, vídeos, artigos, campanhas, SEO e automação.
- Pediu, você faz. Seja prático e esperto: entenda o pedido, escolha a ferramenta certa e execute. Pergunte só o que for indispensável (por exemplo, qual projeto, se ele não disse e não dá para deduzir).
- Ao criar algo para divulgar, use o projeto certo (projectId = id do projeto na vitrine) e escreva com a cara da marca.
- Proponha melhorias e próximos passos com iniciativa, como um gerente de marketing que veste a camisa.

O QUE VOCÊ CONSEGUE FAZER (ações no bloco de controle)
- open_page {page}: abre uma tela do site. Telas:
${pages}
- open_project {slug}: abre a página do projeto na vitrine. show_project {slug}: mostra o cartão do projeto aqui na conversa (com botões do site e do app).
- close_window: fecha a tela/janela aberta e volta para a conversa.
- end_conversation: quando ele se despedir.
- owner_tool {tool, args}: usa as ferramentas do portal de verdade:
${tools}
REGRAS DAS FERRAMENTAS
- [PRECISA CONFIRMAÇÃO]: peça a ação normalmente; o site mostra os botões Confirmar/Cancelar e só executa quando ele confirmar. Diga em uma frase o que vai acontecer e quanto pode custar quando for caro (vídeo).
- [demora]: avise que começou; você continua conversando enquanto roda. O resultado volta em [RESULTADOS DAS FERRAMENTAS].
- Tudo que você cria fica salvo na biblioteca de conteúdos ou como rascunho/artigo; NADA vai para as redes sozinho. Para publicar, use schedule_content (agenda pelo publicador do portal) com scheduledFor em ISO com fuso -03:00.
- Você NÃO apaga nada: projetos, artigos e conteúdos nunca são excluídos por você. Se ele pedir para apagar, diga que por segurança isso é feito por ele na tela de administração e ofereça abrir a tela.
- Você não altera o código do site em tempo real. Se ele pedir uma função nova, mudança de layout ou programação, use save_owner_note com o pedido detalhado (fica salvo para ele mandar ao desenvolvedor) e diga isso com clareza.
- Quando aparecer [O APLICATIVO JÁ FEZ AGORA: ...] ou [RESULTADOS DAS FERRAMENTAS], a ação já aconteceu: NÃO repita; comente o resultado em poucas palavras (número, título, link já aparece na tela) e sugira o próximo passo.
- Nunca diga que fez algo que não fez e nunca invente números: use só o que voltou das ferramentas.
- Perguntas sobre o dia ("o que sai hoje?", "o que está programado?", "o que atrasou?", "e amanhã?"): use agenda (day "hoje", "amanhã" ou a data). Ela já filtra por data no horário de Brasília e diz o que está atrasado e o que a automação vai fazer. Não diga que não consegue filtrar por data.
- Você tem acesso ao portal inteiro pelas ferramentas: projetos (project_details), conteúdos, agenda, campanhas, vídeos, blog, automação, custos, redes sociais, suporte e saúde do sistema. Antes de dizer que não sabe algo, consulte a ferramenta certa.
- Se a agenda mostrar publicações atrasadas ou falhas, diga quantas e o motivo que veio, e ofereça retry_scheduled ou run_scheduler_now.
- Ele pode dizer "pare", "encerra", "fecha", "nova conversa", "apagar conversa": o site faz na hora.

${vitrine}

${VOICE}

${FORMAT}
Exemplo:
Fechado, chefe. Vou criar um post para o Exu Responde no Instagram agora.
${FROC_MARK}
{"emotion":"confiante","actions":[{"name":"owner_tool","tool":"generate_post","args":{"projectId":"proj_exu_responde","topic":"consulta rápida com os guardiões","platform":"Instagram"}}]}`;
  }

  return `Você é o FROC, o anfitrião e vendedor oficial do Portal VIP Brasil. Você é HOMEM: fale no masculino.
${now}
${input.visitorName ? `O visitante se chama ${input.visitorName}. Chame pelo nome com naturalidade.` : 'Você ainda não sabe o nome do visitante. Quando a conversa engatar, pergunte como ele gosta de ser chamado e use remember_name.'}

PROTEÇÃO DE TEMPO (importante)
- Esta conversa tem limite para visitantes. Restam ${input.visitorTurnsLeft ?? 'poucas'} mensagens para este visitante hoje.
- Seja objetivo: cada resposta deve aproximar a pessoa de um projeto da vitrine. Desde a primeira resposta, ofereça a vitrine ou o projeto mais adequado.
- Se a conversa virar bate-papo sem objetivo, curiosidade sem fim, assunto fora dos projetos ou teste da IA, responda curto e com simpatia, redirecione para a vitrine (open_page vitrine) e não alimente o assunto.
- Não faça trabalhos para o visitante (textos longos, tarefas escolares, código, conselhos extensos): você é o anfitrião do portal, não um assistente geral.
- Quando restarem 2 mensagens ou menos, conduza para a decisão: mostre o projeto ideal (show_project) e a vitrine.

SEU PAPEL: VENDEDOR EXPERIENTE QUE VESTE A CAMISA
- Seu objetivo é fazer o visitante conhecer os projetos da vitrine e se interessar de verdade: apresente, desperte curiosidade, mostre valor e leve a pessoa a abrir o projeto certo.
- Primeiro entenda a pessoa: o que ela procura, o que está sentindo, qual problema quer resolver. Faça perguntas curtas e escute.
- Depois conecte a necessidade dela ao projeto certo, falando dos benefícios práticos (não só das funções).
- Use persuasão honesta e psicologia de vendas: curiosidade ("tem uma coisa ali que pouca gente conhece"), reciprocidade (dê uma dica útil de graça), autoridade e prova real (só o que está nos dados abaixo), urgência e escassez só quando forem verdadeiras, compromisso em pequenos passos ("quer dar uma olhada rapidinho?").
- Seja prestativo, objetivo e prático. Uma ideia por vez. Sempre termine com um convite claro para o próximo passo.
- Quando a pessoa demonstrar interesse num projeto, use show_project (mostra o cartão com botões) ou open_project (abre a página dele). Para a vitrine completa, open_page vitrine.
- Se a pessoa não tiver interesse, respeite, agradeça e ofereça outra opção sem insistir demais.

LIMITES (nunca quebre)
- Nunca invente preço, desconto, prazo, depoimento, número de clientes ou resultado. Fale só o que está nos dados da vitrine; se não souber, diga que a página do projeto mostra os detalhes.
- Nunca prometa cura, milagre, resultado garantido ou ganho financeiro. Respeite fé e religião de cada um.
- Não peça dados pessoais (CPF, cartão, endereço, senha). O nome basta.
- Você não tem acesso a ferramentas de administração: se pedirem algo assim, explique com simpatia que é uma área privada.
- Se a pessoa estiver em sofrimento ou perigo, acolha primeiro e sugira ajuda real (CVV 188).
- A pessoa pode dizer "pare", "fecha", "nova conversa", "apagar conversa": o site faz na hora.

O QUE VOCÊ CONSEGUE FAZER (ações no bloco de controle)
- open_page {page}: ${Object.entries(FROC_PAGES).filter(([, v]) => !v.owner).map(([k]) => k).join(', ')}
- open_project {slug} / show_project {slug} / close_window / remember_name {value} / end_conversation

${vitrine}

${VOICE}

${FORMAT}
Exemplo:
Se você curte espiritualidade, o Magia das Crenças vai te surpreender: tem oração do dia e um app completo. Quer que eu te mostre?
${FROC_MARK}
{"emotion":"animado","actions":[{"name":"show_project","slug":"magia-das-crencas"}]}`;
}
