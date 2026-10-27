import { COLLECTIONS, firestore, nowIso, cleanObject, docData, queryData } from './store.js';

export interface PortalProjectSocialSettings {
  instagramEnabled?: boolean;
  facebookEnabled?: boolean;
  linkedinEnabled?: boolean;
  xEnabled?: boolean;
  pinterestEnabled?: boolean;
  youtubeEnabled?: boolean;
  tiktokEnabled?: boolean;
}

export interface PortalProjectItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  segment: string;
  websiteUrl: string;
  playStoreUrl?: string;
  appTitle?: string;
  hasApp: boolean;
  logoUrl: string;
  bannerUrl: string;
  tagline: string;
  description: string;
  highlights: string[];
  keywords: string[];
  targetAudience: string;
  socialMarketingAngles: string[];
  bingSeoKeywords: string[];
  active?: boolean;
  dailyMarketingEnabled?: boolean;
  dailyBlogEnabled?: boolean;
  socialSettings?: PortalProjectSocialSettings;
  createdAt?: string;
  updatedAt?: string;
  isSeedProject?: boolean;
  managedByPortalAdmin?: boolean;
}

export const PORTAL_VIP_OFFICIAL_ASSETS = {
  logoUrl: '/icons/logo.png',
  bannerUrl: '/icons/icon-512.png',
  brandName: 'Portal Vip Brasil',
  officialUrl: 'https://portal-vip-brasil.vercel.app'
};

export const PORTAL_VIP_PROJECTS: PortalProjectItem[] = [
  {
    id: 'proj_magia_crencas',
    name: 'Magia das Crenças',
    slug: 'magia-das-crencas',
    category: 'Espiritualidade, Fé & Autoconhecimento',
    segment: 'Portal Holístico e Aplicativo Devocional',
    websiteUrl: 'https://www.magiadascrencas.com.br/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.magiadascrencas.app',
    appTitle: 'Magia das Crenças App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/magia-crencas.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Desperte seu poder interior e a força das suas convicções.',
    description: 'Portal oficial e aplicativo devocional com orações, rituais sagrados, mensagens diárias, artigos holísticos e orientação espiritual para transformação e prosperidade.',
    highlights: [
      'Orações e decretos poderosos diários',
      'Artigos e ensinamentos espirituais profundos',
      'Aplicativo completo disponível na Play Store',
      'Comunidade e guias de prosperidade e proteção'
    ],
    keywords: ['magia das crenças', 'orações diárias', 'espiritualidade', 'simpatias e rituais', 'prosperidade espiritual', 'aplicativo de fé'],
    targetAudience: 'Pessoas em busca de evolução espiritual, paz mental, orações diárias e conexão sagrada.',
    socialMarketingAngles: [
      'Decreto poderoso do dia para abrir caminhos e atrair prosperidade imediata.',
      'Baixe agora o aplicativo oficial Magia das Crenças na Play Store e receba sua bênção diária.',
      'Vídeo devocional com oração guiada de fé inabalável para proteção do seu lar.'
    ],
    bingSeoKeywords: ['magia das crencas', 'magiadascrencas com br', 'oracao poderosa para alcancar graca', 'portal espiritual brasil']
  },
  {
    id: 'proj_exu_responde',
    name: 'Exu Responde',
    slug: 'exu-responde',
    category: 'Oráculos & Religiões de Matriz Africana',
    segment: 'Consultas Espirituais, Conselhos & Sabedoria',
    websiteUrl: 'https://exu-responde.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde',
    appTitle: 'Exu Responde App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/exu-responde.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Respostas diretas, firmeza nos caminhos e sabedoria ancestral.',
    description: 'Ambiente oracular dedicado aos guardiões, tiragens de conselhos imediatos, direcionamento para tomada de decisão e aplicativo interativo na Play Store.',
    highlights: [
      'Tiragens interativas de conselho e clareza',
      'Abertura e proteção de caminhos',
      'Aplicativo na Play Store com respostas em tempo real',
      'Interface imersiva e respeitosa aos fundamentos'
    ],
    keywords: ['exu responde', 'oraculo exu', 'conselho de guardião', 'abertura de caminhos', 'umbanda e quimbanda app', 'tarot guardiao'],
    targetAudience: 'Praticantes, simpatizantes e devotos que buscam conselhos rápidos e proteção nos seus caminhos.',
    socialMarketingAngles: [
      'Faça sua pergunta ao oráculo Exu Responde e receba a firmeza que você precisa hoje.',
      'Caminhos trancados? Veja o conselho do guardião no app Exu Responde.',
      'Instale grátis na Play Store o app Exu Responde e tire suas dúvidas a qualquer hora.'
    ],
    bingSeoKeywords: ['exu responde online', 'oraculo dos caminhos', 'consulta exu responde vercel app']
  },
  {
    id: 'proj_maria_padilha',
    name: 'Maria Padilha Rainha das 7 Encruzilhadas',
    slug: 'maria-padilha-rainha-das-7-encruzilhadas',
    category: 'Amor, Prosperidade & Sedução Sagrada',
    segment: 'Consultas do Coração, Orações & Simpatias',
    websiteUrl: 'https://maria-padilha-rainha-das-7-encruzil.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha',
    appTitle: 'Maria Padilha 7 Encruzilhadas App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/maria-padilha.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
    tagline: 'O poder do amor, da autoestima magnética e da vitória sentimental.',
    description: 'Plataforma oficial e aplicativo para aconselhamento afetivo, orações de poder para amar e ser amada, feitiços de proteção e conexão com a Rainha das 7 Encruzilhadas.',
    highlights: [
      'Aconselhamento amoroso e oracular',
      'Orações de firmeza, beleza e atração magnética',
      'App interativo disponível na Google Play Store',
      'Rituais de prosperidade e conquista'
    ],
    keywords: ['maria padilha', 'rainha das 7 encruzilhadas', 'oracao maria padilha', 'oraculo do amor', 'simpatia amorosa', 'pombagira app'],
    targetAudience: 'Pessoas que buscam reconquista amorosa, magnetismo pessoal, fortalecimento de união e autoestima.',
    socialMarketingAngles: [
      'Descubra a mensagem de Maria Padilha para o seu coração hoje.',
      'Oração forte para acender o amor e a atração: acesse o app na Play Store.',
      'Conselho amoroso da Rainha das 7 Encruzilhadas para transformar seu relacionamento.'
    ],
    bingSeoKeywords: ['maria padilha rainha das 7 encruzilhadas app', 'oracao de maria padilha', 'consulta amorosa padilha']
  },
  {
    id: 'proj_manual_catolico',
    name: 'Manual Católico',
    slug: 'manual-catolico',
    category: 'Tradição Católica & Devoção',
    segment: 'Guia do Cristão, Liturgia & Novenas',
    websiteUrl: 'https://manual-cat-lico.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=br.com.manualcatolico.app',
    appTitle: 'Manual Católico App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/manual-catolico.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Seu companheiro diário de oração, liturgia e doutrina católica.',
    description: 'Compêndio de orações tradicionais da Santa Igreja, santo do dia, novenas milagrosas, terço rezado, catecismo e aplicativo para vivência cristã diária.',
    highlights: [
      'Santo do dia e liturgia diária completa',
      'Guia de confissão e exame de consciência',
      'Novenas tradicionais e Santo Terço',
      'Aplicativo de bolso na Play Store'
    ],
    keywords: ['manual catolico', 'oracoes catolicas', 'santo do dia', 'liturgia diaria', 'novenas milagrosas', 'app catolico play store'],
    targetAudience: 'Católicos praticantes, devotos de santos, famílias cristãs e jovens em catequese.',
    socialMarketingAngles: [
      'Qual o Santo do dia hoje? Conheça a história inspiradora e a oração no Manual Católico.',
      'Reze o Santo Terço e as principais novenas com o app Manual Católico no seu celular.',
      'Fortaleça sua fé: baixe o Manual Católico na Google Play Store hoje mesmo.'
    ],
    bingSeoKeywords: ['manual catolico online', 'app oracoes catolicas', 'liturgia e novenas brasil']
  },
  {
    id: 'proj_frocia2',
    name: 'Froc IA',
    slug: 'froc-ia',
    category: 'Inteligência Artificial & Automação',
    segment: 'Geração de Conteúdo & Marketing Automatizado',
    websiteUrl: 'https://frocia2.vercel.app/',
    hasApp: false,
    logoUrl: '/icons/projects/froc-ia.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tagline: 'A evolução da inteligência artificial para marketing e produção de conteúdo.',
    description: 'Sistema avançado de criação com IA generativa, redação de artigos de alta autoridade, copys magnéticas para vendas e automação de canais digitais.',
    highlights: [
      'Geração de artigos e posts com SEO avançado',
      'Engenharia de prompts para conversão de vendas',
      'Criação de roteiros para Reels e TikTok',
      'Motor veloz baseado em modelos Gemini de ponta'
    ],
    keywords: ['froc ia', 'frocia', 'ia marketing', 'gerador de posts', 'automacao de conteudo', 'inteligencia artificial brasil'],
    targetAudience: 'Empreendedores, criadores de conteúdo, agências e profissionais de marketing.',
    socialMarketingAngles: [
      'Multiplique sua produção de marketing em 10x com o Froc IA.',
      'Como criar copys que vendem em menos de 30 segundos usando IA.',
      'Acesse o Froc IA e impulsione suas vendas online hoje mesmo.'
    ],
    bingSeoKeywords: ['frocia2 vercel app', 'ia para marketing digital', 'gerador de artigos seo brasil']
  },
  {
    id: 'proj_oraculos_ts',
    name: 'Oráculos',
    slug: 'oraculos',
    category: 'Tarot, Cartomancia & Runas',
    segment: 'Motor Oracular TypeScript de Alta Precisão',
    websiteUrl: 'https://oraculos-ts.vercel.app/',
    hasApp: false,
    logoUrl: '/icons/projects/oraculos.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
    tagline: 'O universo dos oráculos decodificado com tecnologia de ponta.',
    description: 'Plataforma completa de tiragens de Tarot de Marselha, Baralho Cigano, Runas Nórdicas e I Ching com interpretações profundas geradas em tempo real.',
    highlights: [
      'Tiragens completas de Tarot, Lenormand e Runas',
      'Interpretações ricas e detalhadas para amor, trabalho e finanças',
      'Interface moderna, rápida e responsiva',
      'Arquitetura em TypeScript de alta performance'
    ],
    keywords: ['oraculos', 'oraculos ts', 'tarot online gratis', 'baralho cigano online', 'runas nordicas', 'tiragem de cartas', 'previsao astrologica'],
    targetAudience: 'Buscadores de autoconhecimento, amantes de tarot e pessoas com dúvidas sobre o futuro.',
    socialMarketingAngles: [
      'Tire sua carta do dia no Oráculos e descubra o que o destino reservou para você.',
      'Tarot online com precisão cirúrgica: faça sua consulta gratuita agora.',
      'Baralho cigano e runas na palma da sua mão com o Oráculos.'
    ],
    bingSeoKeywords: ['oraculos ts vercel app', 'tarot online gratis brasil', 'baralho cigano tiragem']
  },
  {
    id: 'proj_froc_marketing_engine',
    name: 'Froc IA Marketing Engine',
    slug: 'froc-ia-marketing-engine',
    category: 'Motor de Automação & Tráfego Orgânico',
    segment: 'Autopilot, Social Hub & Campanhas',
    websiteUrl: 'https://froc-ia-marketing-engine.vercel.app/',
    hasApp: false,
    logoUrl: '/icons/projects/froc-marketing-engine.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    tagline: 'O ecossistema completo para dominar as redes sociais e o Google.',
    description: 'Motor central de marketing para criação automática de vídeos, imagens, artigos de blog e agendamento de publicações com proteção contínua anti-quedas.',
    highlights: [
      'Autopilot diário com geração automática de conteúdo',
      'Integração multi-redes e publicação direta',
      'Auditoria de SEO técnico e palavras-chave Bing/Google',
      'Tecnologia de alta disponibilidade com failover inteligente'
    ],
    keywords: ['froc ia marketing engine', 'motor de marketing', 'autopilot de redes sociais', 'publicacao automatica', 'marketing digital automatico'],
    targetAudience: 'Profissionais de marketing, donos de infoprodutos e redes de sites.',
    socialMarketingAngles: [
      'Automatize 100% da sua presença nas redes com o Froc IA Marketing Engine.',
      'Publicações diárias com SEO e engajamento no piloto automático.',
      'Conheça o motor de marketing definitivo para impulsionar seus projetos.'
    ],
    bingSeoKeywords: ['froc ia marketing engine vercel app', 'automacao de redes sociais brasil', 'motor de marketing ia']
  }
];

export function getProjectBySlug(slug: string): PortalProjectItem | undefined {
  return PORTAL_VIP_PROJECTS.find((p) => p.slug === slug || p.id === slug);
}

const PORTAL_PROJECT_IDENTITY_FIELDS: Array<keyof PortalProjectItem> = [
  'id', 'name', 'slug', 'category', 'segment', 'websiteUrl', 'playStoreUrl', 'appTitle', 'hasApp',
  'logoUrl', 'bannerUrl', 'tagline', 'description', 'highlights', 'keywords', 'targetAudience',
  'socialMarketingAngles', 'bingSeoKeywords'
];

const SEED_PROJECT_IDS = new Set(PORTAL_VIP_PROJECTS.map((project) => project.id));

function safeText(value: unknown, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

function safeWebUrl(value: unknown): string {
  const raw = safeText(value, 1500);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function safeList(value: unknown, maxItems = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => safeText(item, 300)).filter(Boolean);
}

function safeSlug(value: unknown, fallback = 'projeto'): string {
  const slug = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function defaultProjectSocialSettings(project: PortalProjectItem): PortalProjectSocialSettings {
  return {
    instagramEnabled: true,
    facebookEnabled: true,
    linkedinEnabled: true,
    xEnabled: true,
    pinterestEnabled: false,
    youtubeEnabled: Boolean(project.hasApp),
    tiktokEnabled: false
  };
}

export function isSeedPortalProject(id: string): boolean {
  return SEED_PROJECT_IDS.has(String(id || ''));
}

export function mergeOfficialPortalProject(
  official: PortalProjectItem,
  stored?: Partial<PortalProjectItem> | null
): PortalProjectItem {
  if (!stored || typeof stored !== 'object') {
    return {
      ...official,
      active: true,
      dailyMarketingEnabled: true,
      dailyBlogEnabled: true,
      socialSettings: defaultProjectSocialSettings(official),
      isSeedProject: true,
      managedByPortalAdmin: true
    };
  }

  // Persisted data in Firestore takes STRICT PRIORITY over static code constants.
  // Static seed values only act as fallbacks if a field has not been populated.
  const name = safeText(stored.name, 120) || official.name;
  const slug = safeSlug(stored.slug || official.slug);
  const websiteUrl = safeWebUrl(stored.websiteUrl) || official.websiteUrl;
  const playStoreUrl = stored.playStoreUrl !== undefined
    ? (safeWebUrl(stored.playStoreUrl) || undefined)
    : official.playStoreUrl;
  const logoUrl = safeWebUrl(stored.logoUrl) || safeText(stored.logoUrl, 1000) || official.logoUrl;
  const bannerUrl = safeWebUrl(stored.bannerUrl) || safeText(stored.bannerUrl, 1000) || official.bannerUrl;

  return {
    ...official,
    ...stored,
    id: official.id, // Primary ID is invariant
    name,
    slug,
    category: safeText(stored.category, 150) || official.category,
    segment: safeText(stored.segment, 200) || official.segment,
    websiteUrl,
    playStoreUrl,
    appTitle: stored.appTitle !== undefined ? safeText(stored.appTitle, 200) : official.appTitle,
    hasApp: typeof stored.hasApp === 'boolean' ? stored.hasApp : Boolean(playStoreUrl),
    logoUrl,
    bannerUrl,
    tagline: stored.tagline !== undefined ? safeText(stored.tagline, 500) : official.tagline,
    description: stored.description !== undefined ? safeText(stored.description, 5000) : official.description,
    highlights: Array.isArray(stored.highlights) && stored.highlights.length > 0 ? safeList(stored.highlights) : official.highlights,
    keywords: Array.isArray(stored.keywords) && stored.keywords.length > 0 ? safeList(stored.keywords) : official.keywords,
    targetAudience: stored.targetAudience !== undefined ? safeText(stored.targetAudience, 3000) : official.targetAudience,
    socialMarketingAngles: Array.isArray(stored.socialMarketingAngles) && stored.socialMarketingAngles.length > 0
      ? safeList(stored.socialMarketingAngles)
      : official.socialMarketingAngles,
    bingSeoKeywords: Array.isArray(stored.bingSeoKeywords) && stored.bingSeoKeywords.length > 0
      ? safeList(stored.bingSeoKeywords)
      : official.bingSeoKeywords,
    active: typeof stored.active === 'boolean' ? stored.active : true,
    dailyMarketingEnabled: typeof stored.dailyMarketingEnabled === 'boolean' ? stored.dailyMarketingEnabled : true,
    dailyBlogEnabled: typeof stored.dailyBlogEnabled === 'boolean' ? stored.dailyBlogEnabled : true,
    socialSettings: stored.socialSettings && typeof stored.socialSettings === 'object'
      ? stored.socialSettings
      : (official.socialSettings || defaultProjectSocialSettings(official)),
    createdAt: stored.createdAt || official.createdAt,
    updatedAt: stored.updatedAt || official.updatedAt,
    isSeedProject: true,
    managedByPortalAdmin: true
  } as PortalProjectItem;
}

function normalizeCustomProject(raw: any, fallbackId?: string): PortalProjectItem {
  const id = safeText(raw?.id || fallbackId, 200);
  const name = safeText(raw?.name, 120) || 'Projeto sem nome';
  const playStoreUrl = safeWebUrl(raw?.playStoreUrl) || undefined;
  const project: PortalProjectItem = {
    id,
    name,
    slug: safeSlug(raw?.slug || name, safeSlug(id || 'projeto')),
    category: safeText(raw?.category, 150) || 'Projeto digital',
    segment: safeText(raw?.segment, 200) || 'Site / Aplicativo',
    websiteUrl: safeWebUrl(raw?.websiteUrl),
    playStoreUrl,
    appTitle: safeText(raw?.appTitle, 200) || undefined,
    hasApp: typeof raw?.hasApp === 'boolean' ? raw.hasApp : Boolean(playStoreUrl),
    logoUrl: safeWebUrl(raw?.logoUrl) || safeText(raw?.logoUrl, 1000) || PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
    bannerUrl: safeWebUrl(raw?.bannerUrl) || safeText(raw?.bannerUrl, 1000) || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
    tagline: safeText(raw?.tagline, 500),
    description: safeText(raw?.description, 5000),
    highlights: safeList(raw?.highlights),
    keywords: safeList(raw?.keywords),
    targetAudience: safeText(raw?.targetAudience, 3000),
    socialMarketingAngles: safeList(raw?.socialMarketingAngles),
    bingSeoKeywords: safeList(raw?.bingSeoKeywords),
    active: typeof raw?.active === 'boolean' ? raw.active : true,
    dailyMarketingEnabled: typeof raw?.dailyMarketingEnabled === 'boolean' ? raw.dailyMarketingEnabled : true,
    dailyBlogEnabled: typeof raw?.dailyBlogEnabled === 'boolean' ? raw.dailyBlogEnabled : true,
    socialSettings: raw?.socialSettings && typeof raw.socialSettings === 'object'
      ? raw.socialSettings
      : undefined,
    createdAt: safeText(raw?.createdAt, 100) || undefined,
    updatedAt: safeText(raw?.updatedAt, 100) || undefined,
    isSeedProject: false,
    managedByPortalAdmin: true
  } as PortalProjectItem;
  if (!project.socialSettings) project.socialSettings = defaultProjectSocialSettings(project);
  return project;
}

async function assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
  const snap = await firestore().collection(COLLECTIONS.projects).where('slug', '==', slug).limit(5).get();
  const conflict = snap.docs.find((doc) => doc.id !== exceptId);
  if (conflict) {
    const error: any = new Error(`Já existe um projeto usando o slug "${slug}".`);
    error.statusCode = 409;
    throw error;
  }
}

export async function seedPortalProjectsIfEmpty(): Promise<{
  seededCount: number;
  totalProjects: number;
  projects: PortalProjectItem[];
}> {
  const db = firestore();
  const projectsRef = db.collection(COLLECTIONS.projects);
  const existingSnap = await projectsRef.get().catch(() => null);
  const existingIds = new Set<string>();
  if (existingSnap && !existingSnap.empty) for (const doc of existingSnap.docs) existingIds.add(doc.id);
  const seededCount = PORTAL_VIP_PROJECTS.filter((project) => !existingIds.has(project.id)).length;
  const projects = await listAllPortalProjectsFromDb();
  return { seededCount, totalProjects: projects.length, projects };
}

export async function listAllPortalProjectsFromDb(): Promise<PortalProjectItem[]> {
  try {
    const db = firestore();
    const projectsRef = db.collection(COLLECTIONS.projects);
    const snap = await projectsRef.get();
    const storedDocs = snap.empty ? [] : queryData<PortalProjectItem>(snap);
    const storedById = new Map<string, any>(storedDocs.map((doc: any) => [doc.id, doc]));
    const now = nowIso();
    const writes: Promise<any>[] = [];

    const seededProjects = PORTAL_VIP_PROJECTS.map((official) => {
      const stored = storedById.get(official.id);
      if (!stored) {
        // Only seed initially if this project document does not exist yet in Firestore
        const newDoc = {
          ...official,
          active: true,
          dailyMarketingEnabled: true,
          dailyBlogEnabled: true,
          socialSettings: defaultProjectSocialSettings(official),
          isSeedProject: true,
          managedByPortalAdmin: true,
          createdAt: now,
          updatedAt: now
        };
        writes.push(projectsRef.doc(official.id).set(cleanObject(newDoc), { merge: true }).catch((err) => {
          console.warn(`[PortalPortfolio] Erro ao criar projeto inicial ${official.id}:`, err);
        }));
        return newDoc;
      }
      // Never overwrite stored user edits with static defaults on reads!
      return mergeOfficialPortalProject(official, stored);
    });

    const customProjects = storedDocs
      .filter((stored: any) => !SEED_PROJECT_IDS.has(stored.id) && stored.managedByPortalAdmin === true)
      .map((stored: any) => normalizeCustomProject(stored, stored.id));

    if (writes.length) await Promise.all(writes);
    return [...seededProjects, ...customProjects].sort((a, b) => {
      if (a.isSeedProject && !b.isSeedProject) return -1;
      if (!a.isSeedProject && b.isSeedProject) return 1;
      return String(a.name).localeCompare(String(b.name), 'pt-BR');
    });
  } catch (err) {
    console.warn('[PortalPortfolio] Erro ao consultar Firestore projects, usando lista inicial:', err);
    return PORTAL_VIP_PROJECTS.map((project) => mergeOfficialPortalProject(project));
  }
}

export async function getPortalProjectFromDb(idOrSlug: string): Promise<PortalProjectItem | undefined> {
  const raw = safeText(idOrSlug, 200);
  const norm = raw.toLowerCase();
  if (!norm) return undefined;

  const official = PORTAL_VIP_PROJECTS.find(
    (project) => project.id.toLowerCase() === norm || project.slug.toLowerCase() === norm
  );

  try {
    const db = firestore();
    const projectsRef = db.collection(COLLECTIONS.projects);

    if (official) {
      const docRef = projectsRef.doc(official.id);
      const snap = await docRef.get();
      if (snap.exists) {
        const stored = docData<PortalProjectItem>(snap);
        if (stored) {
          // Return persisted user modifications directly!
          return mergeOfficialPortalProject(official, stored);
        }
      }
      // First-time seed only if document does not exist in DB
      const now = nowIso();
      const fresh: PortalProjectItem = {
        ...official,
        active: true,
        dailyMarketingEnabled: true,
        dailyBlogEnabled: true,
        socialSettings: defaultProjectSocialSettings(official),
        isSeedProject: true,
        managedByPortalAdmin: true,
        createdAt: now,
        updatedAt: now
      };
      await docRef.set(cleanObject(fresh), { merge: true }).catch(() => undefined);
      return fresh;
    }

    const directSnap = await projectsRef.doc(raw).get().catch(() => null);
    if (directSnap?.exists) {
      const stored = docData<PortalProjectItem>(directSnap) as any;
      if (!stored || stored.managedByPortalAdmin !== true) return undefined;
      return normalizeCustomProject(stored, directSnap.id);
    }

    const slugSnap = await projectsRef.where('slug', '==', safeSlug(norm)).limit(10).get();
    const managedDoc = slugSnap.docs.find((doc: any) => (doc.data() as any)?.managedByPortalAdmin === true);
    if (managedDoc) {
      const stored = docData<PortalProjectItem>(managedDoc);
      return stored ? normalizeCustomProject(stored, managedDoc.id) : undefined;
    }
  } catch (err) {
    console.warn('[PortalPortfolio] Erro ao consultar projeto individual no Firestore:', err);
  }

  return official ? mergeOfficialPortalProject(official) : undefined;
}

export async function createPortalProjectInDb(input: Partial<PortalProjectItem>): Promise<PortalProjectItem> {
  const db = firestore();
  const name = safeText(input?.name, 120);
  const websiteUrl = safeWebUrl(input?.websiteUrl);
  if (!name || !websiteUrl) {
    const error: any = new Error('Nome e URL oficial são obrigatórios para cadastrar um projeto.');
    error.statusCode = 400;
    throw error;
  }

  const slug = safeSlug(input?.slug || name);
  await assertSlugAvailable(slug);
  const id = `proj_${slug.replace(/-/g, '_')}_${Date.now().toString(36)}`.slice(0, 180);
  const now = nowIso();
  const project = normalizeCustomProject({
    ...input,
    websiteUrl,
    id,
    slug,
    active: input.active !== false,
    dailyMarketingEnabled: input.dailyMarketingEnabled !== false,
    dailyBlogEnabled: input.dailyBlogEnabled !== false,
    createdAt: now,
    updatedAt: now,
    managedByPortalAdmin: true
  }, id);

  const docRef = db.collection(COLLECTIONS.projects).doc(id);
  await docRef.set(cleanObject(project));

  // Read-After-Write verification
  const verifySnap = await docRef.get();
  if (!verifySnap.exists) {
    const error: any = new Error(`Falha crítica de persistência: projeto ${id} não encontrado após inserção no Firestore.`);
    error.statusCode = 500;
    throw error;
  }

  return project;
}

export async function updatePortalProjectInDb(
  id: string,
  updates: Partial<PortalProjectItem>,
  options?: { expectedUpdatedAt?: string }
): Promise<PortalProjectItem | null> {
  const current = await getPortalProjectFromDb(id);
  if (!current) return null;

  // Concurrency check: avoid blind overwrite if record was modified since client read it
  if (options?.expectedUpdatedAt && current.updatedAt && options.expectedUpdatedAt !== current.updatedAt) {
    const error: any = new Error(`Conflito de edição: este projeto foi alterado recentemente por outro processo em ${current.updatedAt}. Recarregue a página para obter a versão mais recente.`);
    error.statusCode = 409;
    throw error;
  }

  const db = firestore();
  const docRef = db.collection(COLLECTIONS.projects).doc(current.id);
  const now = nowIso();

  // Validate slug conflict if slug is being updated
  if (updates.slug && safeSlug(updates.slug) !== current.slug) {
    await assertSlugAvailable(safeSlug(updates.slug), current.id);
  }

  // Build the comprehensive update payload preserving all editable fields
  const toSave: Record<string, any> = {
    id: current.id,
    updatedAt: now
  };

  if (updates.name !== undefined) toSave.name = safeText(updates.name, 120);
  if (updates.slug !== undefined) toSave.slug = safeSlug(updates.slug, current.slug);
  if (updates.category !== undefined) toSave.category = safeText(updates.category, 150);
  if (updates.segment !== undefined) toSave.segment = safeText(updates.segment, 200);
  if (updates.websiteUrl !== undefined) toSave.websiteUrl = safeWebUrl(updates.websiteUrl) || safeText(updates.websiteUrl, 1500);
  if (updates.playStoreUrl !== undefined) toSave.playStoreUrl = safeWebUrl(updates.playStoreUrl) || undefined;
  if (updates.appTitle !== undefined) toSave.appTitle = safeText(updates.appTitle, 200);
  if (typeof updates.hasApp === 'boolean') toSave.hasApp = updates.hasApp;
  if (updates.logoUrl !== undefined) toSave.logoUrl = safeWebUrl(updates.logoUrl) || safeText(updates.logoUrl, 1500);
  if (updates.bannerUrl !== undefined) toSave.bannerUrl = safeWebUrl(updates.bannerUrl) || safeText(updates.bannerUrl, 1500);
  if (updates.tagline !== undefined) toSave.tagline = safeText(updates.tagline, 500);
  if (updates.description !== undefined) toSave.description = safeText(updates.description, 5000);
  if (updates.targetAudience !== undefined) toSave.targetAudience = safeText(updates.targetAudience, 3000);
  if (Array.isArray(updates.highlights)) toSave.highlights = safeList(updates.highlights);
  if (Array.isArray(updates.keywords)) toSave.keywords = safeList(updates.keywords);
  if (Array.isArray(updates.socialMarketingAngles)) toSave.socialMarketingAngles = safeList(updates.socialMarketingAngles);
  if (Array.isArray(updates.bingSeoKeywords)) toSave.bingSeoKeywords = safeList(updates.bingSeoKeywords);
  if (typeof updates.active === 'boolean') toSave.active = updates.active;
  if (typeof updates.dailyMarketingEnabled === 'boolean') toSave.dailyMarketingEnabled = updates.dailyMarketingEnabled;
  if (typeof updates.dailyBlogEnabled === 'boolean') toSave.dailyBlogEnabled = updates.dailyBlogEnabled;
  if (updates.socialSettings && typeof updates.socialSettings === 'object') toSave.socialSettings = updates.socialSettings;

  if (isSeedPortalProject(current.id)) {
    toSave.isSeedProject = true;
    toSave.managedByPortalAdmin = true;
  } else {
    toSave.isSeedProject = false;
    toSave.managedByPortalAdmin = true;
  }

  // 1. Perform atomic write to Firestore
  await docRef.set(cleanObject(toSave), { merge: true });

  // 2. Read-After-Write Verification: confirm Firestore actively holds the saved values
  const verifySnap = await docRef.get();
  if (!verifySnap.exists) {
    const error: any = new Error(`Falha crítica de persistência: documento ${current.id} não pôde ser verificado no Firestore.`);
    error.statusCode = 500;
    throw error;
  }

  const storedData = docData<PortalProjectItem>(verifySnap) as any;
  if (!storedData) {
    const error: any = new Error(`Falha crítica de persistência: dados vazios retornados do Firestore para o projeto ${current.id}.`);
    error.statusCode = 500;
    throw error;
  }

  // Check critical fields
  for (const field of ['name', 'slug', 'websiteUrl', 'logoUrl', 'bannerUrl', 'tagline', 'description', 'active'] as const) {
    if (toSave[field] !== undefined) {
      const expected = toSave[field];
      const actual = storedData[field];
      if (expected !== actual) {
        const error: any = new Error(`Falha na verificação de gravação do Firestore para o campo '${field}': esperado "${expected}", obtido "${actual}".`);
        error.statusCode = 500;
        throw error;
      }
    }
  }

  // 3. Return verified updated project
  if (isSeedPortalProject(current.id)) {
    const official = PORTAL_VIP_PROJECTS.find((p) => p.id === current.id)!;
    return mergeOfficialPortalProject(official, storedData);
  }
  return normalizeCustomProject(storedData, current.id);
}

export async function deletePortalProjectInDb(id: string): Promise<{ deleted: boolean; protected: boolean }> {
  const current = await getPortalProjectFromDb(id);
  if (!current) return { deleted: false, protected: false };
  if (isSeedPortalProject(current.id)) return { deleted: false, protected: true };
  await firestore().collection(COLLECTIONS.projects).doc(current.id).delete();
  return { deleted: true, protected: false };
}

