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
  logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
  bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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
    logoUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
    bannerUrl: 'https://portal-vip-brasil.vercel.app/icons/icon-512.png',
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

function officialIdentityPatch(project: PortalProjectItem): Partial<PortalProjectItem> {
  const patch: Partial<PortalProjectItem> = {};
  for (const key of PORTAL_PROJECT_IDENTITY_FIELDS) (patch as any)[key] = project[key];
  return cleanObject(patch);
}

function projectIdentityNeedsSync(stored: any, official: PortalProjectItem): boolean {
  if (!stored || typeof stored !== 'object') return true;
  const patch = officialIdentityPatch(official) as any;
  return Object.entries(patch).some(([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value));
}

export function isSeedPortalProject(id: string): boolean {
  return SEED_PROJECT_IDS.has(String(id || ''));
}

export function mergeOfficialPortalProject(
  official: PortalProjectItem,
  stored?: Partial<PortalProjectItem> | null
): PortalProjectItem {
  const operational: any = stored && typeof stored === 'object' ? stored : {};
  return {
    ...operational,
    ...official,
    active: typeof operational.active === 'boolean' ? operational.active : true,
    dailyMarketingEnabled: typeof operational.dailyMarketingEnabled === 'boolean' ? operational.dailyMarketingEnabled : true,
    dailyBlogEnabled: typeof operational.dailyBlogEnabled === 'boolean' ? operational.dailyBlogEnabled : true,
    socialSettings: operational.socialSettings && typeof operational.socialSettings === 'object'
      ? operational.socialSettings
      : defaultProjectSocialSettings(official),
    createdAt: operational.createdAt,
    updatedAt: operational.updatedAt,
    isSeedProject: true
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
    logoUrl: safeWebUrl(raw?.logoUrl) || PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
    bannerUrl: safeWebUrl(raw?.bannerUrl) || safeWebUrl(raw?.logoUrl) || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
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
      const merged = mergeOfficialPortalProject(official, stored);
      if (!stored) {
        const newDoc = { ...merged, createdAt: now, updatedAt: now };
        writes.push(projectsRef.doc(official.id).set(cleanObject(newDoc), { merge: true }).catch((err) => {
          console.warn(`[PortalPortfolio] Erro ao criar projeto inicial ${official.id}:`, err);
        }));
        return newDoc;
      }
      if (projectIdentityNeedsSync(stored, official)) {
        writes.push(projectsRef.doc(official.id).set(cleanObject({ ...officialIdentityPatch(official), updatedAt: now }), { merge: true }).catch((err) => {
          console.warn(`[PortalPortfolio] Erro ao reparar identidade do projeto ${official.id}:`, err);
        }));
      }
      return merged;
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
          if (projectIdentityNeedsSync(stored, official)) {
            await docRef.set(cleanObject({ ...officialIdentityPatch(official), updatedAt: nowIso() }), { merge: true }).catch(() => undefined);
          }
          return mergeOfficialPortalProject(official, stored);
        }
      }
      const now = nowIso();
      const fresh = mergeOfficialPortalProject(official, {
        active: true, dailyMarketingEnabled: true, dailyBlogEnabled: true,
        socialSettings: defaultProjectSocialSettings(official), createdAt: now, updatedAt: now
      });
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
  await db.collection(COLLECTIONS.projects).doc(id).set(cleanObject(project));
  return project;
}

export async function updatePortalProjectInDb(id: string, updates: Partial<PortalProjectItem>): Promise<PortalProjectItem | null> {
  const current = await getPortalProjectFromDb(id);
  if (!current) return null;
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.projects).doc(current.id);
  const now = nowIso();

  if (isSeedPortalProject(current.id)) {
    const operationalPatch: Partial<PortalProjectItem> = {};
    if (typeof updates.active === 'boolean') operationalPatch.active = updates.active;
    if (typeof updates.dailyMarketingEnabled === 'boolean') operationalPatch.dailyMarketingEnabled = updates.dailyMarketingEnabled;
    if (typeof updates.dailyBlogEnabled === 'boolean') operationalPatch.dailyBlogEnabled = updates.dailyBlogEnabled;
    if (updates.socialSettings && typeof updates.socialSettings === 'object') operationalPatch.socialSettings = updates.socialSettings;
    await docRef.set(cleanObject({ ...operationalPatch, updatedAt: now }), { merge: true });
    return getPortalProjectFromDb(current.id) as Promise<PortalProjectItem>;
  }

  const merged = normalizeCustomProject({ ...current, ...updates, id: current.id, updatedAt: now }, current.id);
  if (merged.slug !== current.slug) await assertSlugAvailable(merged.slug, current.id);
  await docRef.set(cleanObject(merged), { merge: false });
  return merged;
}

export async function deletePortalProjectInDb(id: string): Promise<{ deleted: boolean; protected: boolean }> {
  const current = await getPortalProjectFromDb(id);
  if (!current) return { deleted: false, protected: false };
  if (isSeedPortalProject(current.id)) return { deleted: false, protected: true };
  await firestore().collection(COLLECTIONS.projects).doc(current.id).delete();
  return { deleted: true, protected: false };
}
