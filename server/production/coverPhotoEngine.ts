/**
 * Capas fotográficas ultrarrealistas para o Blog (geradas por IA com direção de fotógrafo).
 *
 * Problemas que este módulo resolve:
 * - O prompt antigo pedia "imagem publicitária premium": saía com cara de anúncio genérico.
 * - Artigos antigos usavam fotos aleatórias de catálogo, escolhidas por um detector com IDs errados.
 * - Imagens de IA eram gravadas em base64 DENTRO do artigo (até 1 MB cada), o que levou a listagem
 *   do blog a 13 MB e derrubou a página.
 *
 * Agora: cada artigo recebe uma fotografia realista do nicho certo, coerente com o tema do texto,
 * comprimida em WebP 1600x900 e guardada em uma coleção própria (`blogCovers`), servida pela rota
 * /api/portal/blog/articles/:slug/cover com cache longo. O documento do artigo guarda só a URL.
 */
import sharp from 'sharp';
import { config } from '../config/index.js';
import { firestore, COLLECTIONS, nowIso } from './store.js';
import { generateMarketingImage } from './ai.js';
import { isGlobalAutomationEnabled } from './automationGate.js';

export const BLOG_COVERS_COLLECTION = 'blogCovers';
export const COVER_PHOTO_VERSION = 2;
const MAX_ATTEMPTS = 3;

interface Scene { en: string; pt: string; lens: string }

const BASE_STYLE = [
  'Ultra-realistic professional editorial photograph, indistinguishable from a real photo taken by an award-winning photographer.',
  'Natural skin and material textures, true-to-life colors, cinematic lighting with real light sources, high dynamic range, crisp focus on the main subject, beautiful shallow depth of field and creamy bokeh.',
  'Wide 16:9 composition with a strong focal point and some clean negative space, magazine cover quality, emotionally captivating, makes the viewer stop scrolling.',
  'Absolutely NO text, letters, numbers, words, captions, logos, watermarks, signatures, frames, borders, collages, split screens, illustrations, cartoons, anime, 3D renders, CGI look, paintings or plastic AI look. No deformed hands or extra fingers. If people appear, show them naturally and respectfully, preferably partially (hands, silhouette) without identifiable celebrities.'
].join(' ');

const SCENES: Record<string, Scene[]> = {
  proj_maria_padilha: [
    { lens: '50mm f/1.4', en: 'Close-up of a lush bouquet of deep velvet red roses on a dark wooden altar, red taper candles burning, scattered rose petals and delicate gold jewelry, warm intimate candlelight, faint smoke curling in the air, night', pt: 'buquê de rosas vermelhas e velas acesas em altar escuro à luz de velas' },
    { lens: '85mm f/1.8', en: 'A single velvety red rose with tiny water droplets in sharp focus, glowing red candle flames melting into the background bokeh, moody crimson and gold tones', pt: 'rosa vermelha com gotas de orvalho diante de velas vermelhas acesas' },
    { lens: '85mm f/2', en: 'Elegant woman\'s hand with red nail polish gently holding a red rose beside a lit red candle, face not visible, sensual yet elegant warm low-key lighting', pt: 'mão feminina elegante segurando uma rosa vermelha ao lado de vela acesa' },
    { lens: '35mm f/1.8', en: 'Seven lit red candles arranged in a circle with red rose petals on an old cobblestone crossroads at night, warm street lamp glow and light mist', pt: 'sete velas vermelhas e pétalas de rosa em uma encruzilhada de pedra à noite' },
    { lens: '50mm f/1.8', en: 'Crystal champagne glass, red roses and a burning red candle on dark satin fabric, luxurious romantic atmosphere, golden highlights', pt: 'taça de champanhe, rosas vermelhas e vela acesa sobre cetim escuro' }
  ],
  proj_exu_responde: [
    { lens: '35mm f/2', en: 'Night crossroads on a quiet rural dirt road, a respectful offering of lit red and black candles at the center, warm firelight on the ground, mist and a starry sky', pt: 'encruzilhada de estrada de terra à noite com velas vermelhas e pretas acesas' },
    { lens: '50mm f/1.8', en: 'Crackling bonfire at night with sparks rising into the dark sky, silhouettes of trees, dramatic orange ember light and smoke', pt: 'fogueira à noite com faíscas subindo e luz alaranjada' },
    { lens: '85mm f/2', en: 'Antique iron key lying on a rustic dark wooden table next to burning red and black candles, wisps of smoke, dramatic chiaroscuro lighting', pt: 'chave antiga de ferro ao lado de velas vermelhas e pretas acesas' },
    { lens: '24mm f/2.8', en: 'A stone path splitting into two lit roads at dusk, old lanterns glowing along the way, sense of opening paths and new opportunities', pt: 'caminho de pedra se abrindo em duas estradas iluminadas ao entardecer' }
  ],
  proj_manual_catolico: [
    { lens: '24mm f/2.8', en: 'Interior of a historic baroque Catholic church in Brazil with a golden altar, warm sunlight beams streaming through stained glass windows, empty pews, peaceful sacred atmosphere', pt: 'interior de igreja barroca com altar dourado e raios de sol pelos vitrais' },
    { lens: '85mm f/1.8', en: 'Hands holding a wooden rosary in prayer over an open Bible, soft natural window light, shallow depth of field, serene devotion', pt: 'mãos em oração segurando um terço sobre a Bíblia aberta' },
    { lens: '50mm f/1.4', en: 'Rows of lit votive candles glowing inside a church, warm golden light, blurred altar and cross in the background', pt: 'velas votivas acesas dentro da igreja com altar ao fundo' },
    { lens: '35mm f/2', en: 'Small white chapel with a cross on a green hilltop at sunrise, golden sky, soft morning mist, hope and faith', pt: 'capela branca com cruz no alto de um morro ao nascer do sol' },
    { lens: '85mm f/2', en: 'Statue of the Virgin Mary in a church niche surrounded by fresh white flowers and candles, soft reverent light', pt: 'imagem de Nossa Senhora com flores brancas e velas acesas' }
  ],
  proj_magia_crencas: [
    { lens: '50mm f/1.8', en: 'Prosperity ritual on a rustic wooden table: a lit white candle, cinnamon sticks, bay leaves, golden coins and clear quartz crystals, warm morning sunlight', pt: 'velas, canela, louro, moedas e cristais sobre mesa rústica' },
    { lens: '35mm f/2', en: 'Huge full moon rising over a calm ocean at night, silhouette of a woman with open arms on the beach, silver moonlight reflection', pt: 'lua cheia sobre o mar com silhueta de mulher de braços abertos na praia' },
    { lens: '50mm f/1.8', en: 'An old open book of simpatias with dried flowers, amethyst and quartz crystals and soft candlelight, mystical cozy atmosphere', pt: 'livro antigo aberto com flores secas, cristais e luz de velas' },
    { lens: '85mm f/2', en: 'Hands cupping a glowing amethyst crystal, soft purple and golden light, dark background, sense of energy and intention', pt: 'mãos segurando um cristal de ametista iluminado' },
    { lens: '50mm f/2', en: 'Glass jar filled with rice, coins, cinnamon and bay leaves tied with a golden ribbon, warm golden hour light, abundance', pt: 'pote de vidro com arroz, moedas, canela e louro para prosperidade' }
  ],
  proj_oraculos_ts: [
    { lens: '50mm f/1.8', en: 'Tarot cards spread on a dark velvet table next to a crystal ball and burning candles, mystical warm light, close-up', pt: 'cartas de tarô sobre veludo escuro com bola de cristal e velas' },
    { lens: '85mm f/1.8', en: 'Hands of a fortune teller turning over a tarot card under warm candlelight, rings on fingers, shallow depth of field', pt: 'mãos de cartomante virando uma carta de tarô à luz de velas' },
    { lens: '50mm f/2', en: 'Gypsy fortune-telling playing cards, dried herbs and a burning candle on an old wooden table, intimate atmosphere', pt: 'cartas de baralho cigano, ervas secas e vela em mesa de madeira' },
    { lens: '85mm f/2.8', en: 'Carved Nordic rune stones spilling from a leather pouch onto green moss, misty forest light', pt: 'pedras rúnicas nórdicas saindo de bolsa de couro sobre musgo' },
    { lens: '24mm f/2.8', en: 'Milky way in a starry night sky above a lone tree on a hill, astrology and destiny mood', pt: 'céu estrelado com a Via Láctea sobre uma árvore solitária' }
  ],
  proj_frocia2: [
    { lens: '35mm f/1.8', en: 'Modern creator workspace at night, laptop screen glowing with an abstract AI content dashboard (no readable text), neon blue and purple reflections, city lights bokeh behind the window', pt: 'mesa de trabalho moderna à noite com laptop exibindo painel de IA' },
    { lens: '85mm f/1.8', en: 'Close-up of hands typing on a laptop with soft holographic light reflecting on the fingers, futuristic but realistic, cinematic teal and violet tones', pt: 'mãos digitando em laptop com reflexos de luz futurista' },
    { lens: '100mm macro f/2.8', en: 'Macro photograph of a glowing microchip on a circuit board with blue light trails, extremely detailed', pt: 'macro de microchip iluminado em placa de circuito' }
  ],
  proj_froc_marketing_engine: [
    { lens: '50mm f/1.8', en: 'Smartphone on a clean desk showing an upward growth analytics chart (no readable text), coffee cup and notebook, bright morning light, shallow depth of field', pt: 'smartphone com gráfico de crescimento sobre mesa com café' },
    { lens: '35mm f/2', en: 'Small business owner celebrating in a modern office looking at a laptop with rising sales charts, natural light, genuine joy, face partially turned away', pt: 'empreendedor comemorando resultados diante do laptop' },
    { lens: '24mm f/2.8', en: 'Marketing team planning at a glass wall full of colorful sticky notes, modern bright office, faces blurred by motion', pt: 'equipe de marketing planejando estratégia em parede de vidro com notas' }
  ]
};
SCENES.proj_portal_vip_magazine = SCENES.proj_froc_marketing_engine;

// Projetos criados depois pelo Admin (ids dinâmicos): o tema é reconhecido pelo nome/título.
SCENES.tema_mobilidade = [
  { lens: '35mm f/1.8', en: 'Modern car driving through a Brazilian city avenue at blue hour, glowing street lights and traffic light trails, driver\'s hands on the steering wheel seen from the back seat, realistic and safe', pt: 'carro rodando por avenida iluminada da cidade ao anoitecer' },
  { lens: '50mm f/1.8', en: 'Passenger holding a smartphone showing a generic ride map with a route line (no readable text, no logos) inside a clean car, warm city bokeh outside the window', pt: 'passageiro com celular mostrando rota de corrida dentro do carro' },
  { lens: '85mm f/2', en: 'Friendly driver opening the car door for a passenger on a sidewalk at golden hour, faces turned away or out of focus, sense of trust and fair price', pt: 'motorista abrindo a porta do carro para passageiro ao entardecer' },
  { lens: '24mm f/2.8', en: 'Aerial-like high view of a busy Brazilian city crossroads at night with car light trails, sense of mobility and many rides', pt: 'cruzamento movimentado da cidade à noite com rastros de luz dos carros' }
];
SCENES.tema_sobrenatural = [
  { lens: '24mm f/2.8', en: 'Old abandoned colonial mansion hallway at night lit only by a flashlight beam cutting through dust and faint mist, eerie but not gory', pt: 'corredor de casarão abandonado à noite iluminado por lanterna' },
  { lens: '50mm f/1.8', en: 'Hand holding a vintage handheld paranormal detector device with small glowing lights (no readable text) in a dark room, shallow depth of field', pt: 'mão segurando detector paranormal com luzes acesas em quarto escuro' },
  { lens: '35mm f/2', en: 'Wrought iron gate of an old cemetery covered in fog under moonlight, cinematic cold blue tones, mysterious atmosphere', pt: 'portão de cemitério antigo coberto de névoa sob a lua' },
  { lens: '85mm f/1.8', en: 'Single candle burning on a dusty wooden table in a dark old room, a faint translucent white curtain moving by the window, suspenseful mood', pt: 'vela acesa em sala antiga e escura com cortina se movendo' }
];
SCENES.tema_bruxaria = [
  { lens: '50mm f/1.8', en: 'Ancient leather-bound grimoire open on a dark wooden altar with burning candles, dried herbs and an old brass key, mystical warm light', pt: 'grimório antigo aberto em altar com velas, ervas secas e chave' },
  { lens: '85mm f/2', en: 'Weathered fortune-telling cards spread in a cross on a dark cloth beside a lit black candle and smoke, close-up, no readable text on the cards', pt: 'cartas de adivinhação dispostas em cruz ao lado de vela acesa' },
  { lens: '35mm f/2', en: 'Old iron cauldron with herbs and gentle steam over embers in a rustic stone room, candlelight and shadows, folk magic atmosphere', pt: 'caldeirão de ferro com ervas e vapor sobre brasas' },
  { lens: '50mm f/2', en: 'Hands of a wise old sorcerer arranging candles and crystals on a table at night, face hidden in shadow, respectful and mysterious', pt: 'mãos de bruxo arrumando velas e cristais sobre a mesa à noite' }
];
// Projeto cadastrado depois, de qualquer ramo (cafeteria, pet shop, energia solar...): a foto mostra o próprio assunto.
SCENES.tema_geral = [
  { lens: '35mm f/2', en: 'Photorealistic editorial scene that literally shows the subject of the article title, real people, real place and real objects of that subject in an authentic Brazilian setting, natural light', pt: 'cena real que mostra o assunto do artigo' },
  { lens: '50mm f/1.8', en: 'Close-up photorealistic detail of the main object or activity of the article topic, hands in action, rich natural textures, shallow depth of field, warm daylight', pt: 'detalhe em close do assunto principal do artigo' },
  { lens: '85mm f/2', en: 'Candid photorealistic moment of a satisfied customer enjoying the product or service of the article topic, face partly out of focus, soft window light', pt: 'cliente aproveitando o produto ou serviço do artigo' },
  { lens: '24mm f/2.8', en: 'Wide photorealistic establishing shot of the real environment where the article topic happens (store, home, street or workplace), clean composition, golden hour light', pt: 'ambiente real onde o assunto do artigo acontece' }
];
const INITIAL_PROJECT_IDS = ['proj_maria_padilha', 'proj_exu_responde', 'proj_manual_catolico', 'proj_magia_crencas', 'proj_oraculos_ts', 'proj_frocia2', 'proj_froc_marketing_engine', 'proj_portal_vip_magazine'];
SCENES.proj_oraculos_ts.push(
  { lens: '50mm f/2', en: 'Cowrie shells (búzios) scattered on a woven straw mat for divination, beads and a white candle, warm natural light, respectful Afro-Brazilian tradition', pt: 'búzios espalhados sobre esteira de palha para consulta' }
);

/** Grupo de cenas pelo tema do texto (usado quando o projeto não tem cenas próprias). */
export function coverSceneGroupFor(article: { title?: string; slug?: string; relatedProjectId?: string; projectId?: string; relatedProjectName?: string; category?: string }): string {
  const project = String(article?.relatedProjectId || article?.projectId || '');
  if (SCENES[project]) return project;
  const text = normalize(`${article?.title || ''} ${article?.slug || ''} ${article?.relatedProjectName || ''} ${article?.category || ''} ${project}`).replace(/[-_]/g, ' ');
  if (/corrida|motorista|uber|\b99\b|passageir|carona|mobilidade|froc ?x\b|transporte|dirigir|dirigindo|veiculo|carro|transito|taxi|combustivel|gasolina/.test(text)) return 'tema_mobilidade';
  if (/fantasma|sobrenatural|assombra|paranormal|cacador de|caca fantasma|detector/.test(text)) return 'tema_sobrenatural';
  if (/cipriano|bruxo|bruxa|bruxaria|feitico|grimorio/.test(text)) return 'tema_bruxaria';
  if (project && !INITIAL_PROJECT_IDS.includes(project)) {
    // Projeto novo: só cai num nicho espiritual com palavra forte; senão a foto mostra o próprio assunto.
    if (/padilha|pombagira|amarracao|seducao/.test(text)) return 'proj_maria_padilha';
    if (/\bexu\b|umbanda|quimbanda|encruzilhada/.test(text)) return 'proj_exu_responde';
    if (/catolic|novena|terco|biblia|nossa senhora/.test(text)) return 'proj_manual_catolico';
    if (/tarot|taro|cigano|runa|oraculo|buzios|astrolog|horoscopo/.test(text)) return 'proj_oraculos_ts';
    return 'tema_geral';
  }
  if (/padilha|pombagira|amor|seducao/.test(text)) return 'proj_maria_padilha';
  if (/\bexu\b|umbanda|encruzilhada/.test(text)) return 'proj_exu_responde';
  if (/catolic|novena|terco|santo|oracao|biblia|nossa senhora|dogma/.test(text)) return 'proj_manual_catolico';
  if (/tarot|taro|cigano|runa|oraculo|buzios|planetari|astrolog|signo|horoscopo/.test(text)) return 'proj_oraculos_ts';
  if (/inteligencia artificial|\bia\b|froc/.test(text)) return 'proj_frocia2';
  if (/marketing|seo|trafego|vendas|vender|produtos digitais|landing page|anuncio/.test(text)) return 'proj_froc_marketing_engine';
  return 'proj_magia_crencas';
}

/** Regra antiga (antes de reconhecer mobilidade/sobrenatural/bruxaria): só para achar capas a refazer. */
function legacySceneGroupFor(article: { title?: string; slug?: string; relatedProjectId?: string; projectId?: string }): string {
  const project = String(article?.relatedProjectId || article?.projectId || '');
  if (INITIAL_PROJECT_IDS.includes(project)) return project;
  const text = normalize(`${article?.title || ''} ${article?.slug || ''}`);
  if (/padilha|pombagira|amor|seducao/.test(text)) return 'proj_maria_padilha';
  if (/\bexu\b|umbanda|encruzilhada/.test(text)) return 'proj_exu_responde';
  if (/catolic|novena|terco|santo|oracao|biblia/.test(text)) return 'proj_manual_catolico';
  if (/tarot|taro|cigano|runa|oraculo/.test(text)) return 'proj_oraculos_ts';
  if (/inteligencia artificial|\bia\b|froc/.test(text)) return 'proj_frocia2';
  if (/marketing|seo|trafego|vendas/.test(text)) return 'proj_froc_marketing_engine';
  return 'proj_magia_crencas';
}

/** A capa atual foi feita com um tema diferente do certo (ex.: artigo de corrida com foto de ritual). */
export function coverNeedsThemeFix(article: { title?: string; slug?: string; relatedProjectId?: string; projectId?: string; relatedProjectName?: string; coverSceneGroup?: string }): boolean {
  const used = String(article?.coverSceneGroup || legacySceneGroupFor(article));
  return used !== coverSceneGroupFor(article);
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalize(text: string): string {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Escolhe a cena: projeto primeiro; palavras do título refinam dentro do nicho (ex.: runas em Oráculos). */
export function pickCoverScene(article: { id?: string; slug?: string; title?: string; relatedProjectId?: string; projectId?: string; relatedProjectName?: string }): Scene {
  const text = normalize(`${article?.title || ''} ${article?.slug || ''}`).replace(/-/g, ' ');
  const list = SCENES[coverSceneGroupFor(article)] || SCENES.proj_magia_crencas;
  if (list === SCENES.proj_oraculos_ts) {
    if (/runa|viking|nordic/.test(text)) return list[3];
    if (/cigano|lenormand/.test(text)) return list[2];
    if (/astrolog|signo|horoscopo|planetari/.test(text)) return list[4];
    if (/buzios/.test(text)) return list[5];
  }
  if (list === SCENES.proj_manual_catolico && /terco|rosario/.test(text)) return list[1];
  return list[hashString(`${article?.id || ''}|${article?.slug || ''}`) % list.length];
}

export function buildCoverPhotoPrompt(article: { id?: string; slug?: string; title?: string; relatedProjectId?: string; projectId?: string; relatedProjectName?: string; primaryKeyword?: string }): { prompt: string; alt: string } {
  const scene = pickCoverScene(article);
  const topic = String(article?.title || '').replace(/["“”]/g, '').slice(0, 160);
  const keyword = String(article?.primaryKeyword || '').slice(0, 80);
  const prompt = `${scene.en}. Shot on a full-frame camera with a ${scene.lens} lens.
The photo is the cover of a Brazilian article titled "${topic}"${keyword ? ` (main keyword: ${keyword})` : ''}: it must visually evoke this topic in a subtle, symbolic and realistic way, without writing any text.
${BASE_STYLE}`;
  const alt = topic ? `${topic}: ${scene.pt}` : scene.pt.charAt(0).toUpperCase() + scene.pt.slice(1);
  return { prompt, alt: alt.slice(0, 180) };
}

export function coverRouteUrl(slug: string): string {
  return `${config.appUrl.replace(/\/$/, '')}/api/portal/blog/articles/${encodeURIComponent(slug)}/cover`;
}

async function toWebp(buffer: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const attempts: Array<[number, number, number]> = [[1600, 900, 84], [1600, 900, 74], [1280, 720, 72]];
  let last: Buffer | null = null;
  for (const [w, h, q] of attempts) {
    last = await sharp(buffer).rotate().resize(w, h, { fit: 'cover', position: 'attention', withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toBuffer();
    if (last.length <= 700 * 1024) return { data: last, width: w, height: h };
  }
  return { data: last as Buffer, width: 1280, height: 720 };
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.slice(imageUrl.indexOf(',') + 1);
    return Buffer.from(base64, 'base64');
  }
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Falha ao baixar a imagem gerada (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Gera e guarda a capa fotográfica de um artigo. Não altera o documento do artigo:
 * quem chama decide gravar `coverImage`/`coverAlt` (permite uso na criação e no lote).
 */
export async function generateArticleCoverPhoto(article: {
  id: string;
  slug: string;
  title?: string;
  relatedProjectId?: string;
  relatedProjectName?: string;
  primaryKeyword?: string;
}, options: { userId?: string; collection?: string } = {}): Promise<{ coverUrl: string; coverAlt: string; sceneGroup: string }> {
  if (!article?.id || !article?.slug) throw new Error('Artigo sem id/slug para gerar capa.');
  const { prompt, alt } = buildCoverPhotoPrompt(article);
  const generated = await generateMarketingImage({
    userId: options.userId || 'portal_vip_blog_automation',
    company: { id: article.relatedProjectId || 'proj_portal_vip_magazine', name: article.relatedProjectName || 'Portal Vip Brasil' },
    title: article.title,
    theme: article.title || article.slug,
    rawPrompt: prompt,
    aspectRatio: '16:9',
    resolution: '1K',
    executionId: `cover_${article.id}_${Date.now()}`
  });
  const original = await fetchImageBuffer(generated.imageUrl);
  if (original.length < 5_000) throw new Error('A IA retornou uma imagem vazia ou inválida.');
  const webp = await toWebp(original);
  await firestore().collection(BLOG_COVERS_COLLECTION).doc(article.id).set({
    articleId: article.id,
    slug: article.slug,
    collection: options.collection || COLLECTIONS.blogArticles,
    mime: 'image/webp',
    data: webp.data.toString('base64'),
    width: webp.width,
    height: webp.height,
    bytes: webp.data.length,
    alt,
    model: generated.modelUsed,
    version: COVER_PHOTO_VERSION,
    createdAt: nowIso()
  });
  return { coverUrl: coverRouteUrl(article.slug), coverAlt: alt, sceneGroup: coverSceneGroupFor(article) };
}

export async function loadStoredCover(articleId: string): Promise<{ mime: string; buffer: Buffer } | null> {
  if (!articleId) return null;
  const snap = await firestore().collection(BLOG_COVERS_COLLECTION).doc(articleId).get();
  if (!snap?.exists) return null;
  const data = snap.data() as any;
  if (!data?.data) return null;
  return { mime: String(data.mime || 'image/webp'), buffer: Buffer.from(String(data.data), 'base64') };
}

export interface CoverBatchResult {
  status: 'ok' | 'master_off';
  processed: number;
  generated: number;
  failed: number;
  remaining: number;
  details: string[];
}

/**
 * Refaz as capas de artigos publicados em lotes (mais recentes primeiro).
 * Respeita o Botão Mestre e o teto financeiro (via generateMarketingImage), tem orçamento de tempo
 * e desiste de um artigo após 3 falhas para não gastar créditos em loop.
 */
export async function runCoverPhotoBatch(options: { limit?: number; timeBudgetMs?: number; userId?: string } = {}): Promise<CoverBatchResult> {
  const limit = Math.min(Math.max(Number(options.limit || 8), 1), 40);
  const deadline = Date.now() + Math.max(10_000, Number(options.timeBudgetMs || 240_000));
  if (!(await isGlobalAutomationEnabled())) {
    return { status: 'master_off', processed: 0, generated: 0, failed: 0, remaining: -1, details: ['Botão Mestre desligado: nenhuma imagem foi gerada (custo zero).'] };
  }
  const db = firestore();
  const pending: Array<{ id: string; collection: string; data: any }> = [];
  for (const col of [COLLECTIONS.blogArticles, COLLECTIONS.blogPosts]) {
    const snap = await db.collection(col).where('status', '==', 'published').get();
    for (const d of snap.docs || []) {
      const data = d.data() as any;
      if (!data?.slug) continue;
      const themeFix = Number(data.coverPhotoVersion || 0) >= COVER_PHOTO_VERSION && coverNeedsThemeFix({ ...data, relatedProjectId: data.relatedProjectId || data.projectId });
      if (Number(data.coverPhotoVersion || 0) >= COVER_PHOTO_VERSION && !themeFix) continue;
      if (Number(data.coverPhotoAttempts || 0) >= MAX_ATTEMPTS) continue;
      pending.push({ id: d.id, collection: col, data });
    }
  }
  pending.sort((a, b) => String(b.data.publishedAt || b.data.createdAt || '').localeCompare(String(a.data.publishedAt || a.data.createdAt || '')));

  const details: string[] = [];
  let processed = 0;
  let generated = 0;
  let failed = 0;
  for (const item of pending.slice(0, limit)) {
    if (Date.now() > deadline - 45_000) {
      details.push('Orçamento de tempo atingido; o restante continua no próximo lote.');
      break;
    }
    processed++;
    const ref = db.collection(item.collection).doc(item.id);
    try {
      const result = await generateArticleCoverPhoto({
        id: item.id,
        slug: String(item.data.slug),
        title: item.data.title,
        relatedProjectId: item.data.relatedProjectId || item.data.projectId,
        relatedProjectName: item.data.relatedProjectName,
        primaryKeyword: item.data.primaryKeyword
      }, { userId: options.userId, collection: item.collection });
      await ref.set({
        coverImage: result.coverUrl,
        coverAlt: result.coverAlt,
        coverImageGenerated: true,
        coverPhotoVersion: COVER_PHOTO_VERSION,
        coverSceneGroup: result.sceneGroup,
        coverPhotoUpdatedAt: nowIso(),
        coverPhotoError: null
      }, { merge: true });
      generated++;
      details.push(`OK: ${item.data.slug}`);
    } catch (err: any) {
      failed++;
      const message = String(err?.message || err).slice(0, 300);
      await ref.set({ coverPhotoAttempts: Number(item.data.coverPhotoAttempts || 0) + 1, coverPhotoError: message }, { merge: true }).catch(() => undefined);
      details.push(`FALHA: ${item.data.slug}: ${message}`);
      if (/Botão Mestre|GLOBAL_AUTOMATION_LOCKED|BUDGET_CAP|teto/i.test(message)) break;
    }
  }
  return { status: 'ok', processed, generated, failed, remaining: Math.max(0, pending.length - generated), details };
}

export async function coverPhotoStatus(): Promise<{ total: number; done: number; pending: number; failedPermanently: number }> {
  const db = firestore();
  let total = 0;
  let done = 0;
  let failedPermanently = 0;
  for (const col of [COLLECTIONS.blogArticles, COLLECTIONS.blogPosts]) {
    const snap = await db.collection(col).where('status', '==', 'published').get();
    for (const d of snap.docs || []) {
      const data = d.data() as any;
      if (!data?.slug) continue;
      total++;
      if (Number(data.coverPhotoVersion || 0) >= COVER_PHOTO_VERSION && !coverNeedsThemeFix({ ...data, relatedProjectId: data.relatedProjectId || data.projectId })) done++;
      else if (Number(data.coverPhotoAttempts || 0) >= MAX_ATTEMPTS) failedPermanently++;
    }
  }
  return { total, done, pending: total - done - failedPermanently, failedPermanently };
}
