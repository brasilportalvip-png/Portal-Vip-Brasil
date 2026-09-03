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
  'id',
  'name',
  'slug',
  'category',
  'segment',
  'websiteUrl',
  'playStoreUrl',
  'appTitle',
  'hasApp',
  'logoUrl',
  'bannerUrl',
  'tagline',
  'description',
  'highlights',
  'keywords',
  'targetAudience',
  'socialMarketingAngles',
  'bingSeoKeywords'
];

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
  for (const key of PORTAL_PROJECT_IDENTITY_FIELDS) {
    (patch as any)[key] = project[key];
  }
  return cleanObject(patch);
}

function projectIdentityNeedsSync(stored: any, official: PortalProjectItem): boolean {
  if (!stored || typeof stored !== 'object') return true;
  const patch = officialIdentityPatch(official) as any;
  for (const [key, value] of Object.entries(patch)) {
    if (JSON.stringify(stored[key]) !== JSON.stringify(value)) return true;
  }
  return false;
}

/**
 * Combina estado operacional persistido com a identidade canônica do projeto.
 * Firestore pode controlar automação/conexões/estado, mas não substitui identidade,
 * URLs, logo, banner, descrição ou metadados oficiais do registro do Portal.
 */
export function mergeOfficialPortalProject(
  official: PortalProjectItem,
  stored?: Partial<PortalProjectItem> | null
): PortalProjectItem {
  const operational: any = stored && typeof stored === 'object' ? stored : {};
  return {
    ...operational,
    ...official,
    active: typeof operational.active === 'boolean' ? operational.active : true,
    dailyMarketingEnabled: typeof operational.dailyMarketingEnabled === 'boolean'
      ? operational.dailyMarketingEnabled
      : true,
    dailyBlogEnabled: typeof operational.dailyBlogEnabled === 'boolean'
      ? operational.dailyBlogEnabled
      : true,
    socialSettings: operational.socialSettings && typeof operational.socialSettings === 'object'
      ? operational.socialSettings
      : defaultProjectSocialSettings(official),
    createdAt: operational.createdAt,
    updatedAt: operational.updatedAt
  };
}

/**
 * Sincronização idempotente dos 7 Projetos Oficiais no Firestore (Collection: 'projects').
 * Garante que a coleção 'projects' seja a única fonte da verdade, sem duplicar dados.
 */
export async function seedPortalProjectsIfEmpty(): Promise<{
  seededCount: number;
  totalProjects: number;
  projects: PortalProjectItem[];
}> {
  const db = firestore();
  const projectsRef = db.collection(COLLECTIONS.projects);
  const existingSnap = await projectsRef.get().catch(() => null);
  const existingIds = new Set<string>();

  if (existingSnap && !existingSnap.empty) {
    for (const doc of existingSnap.docs) existingIds.add(doc.id);
  }

  const seededCount = PORTAL_VIP_PROJECTS.filter((project) => !existingIds.has(project.id)).length;
  const projects = await listAllPortalProjectsFromDb();

  return {
    seededCount,
    totalProjects: projects.length,
    projects
  };
}

/**
 * Retorna todos os projetos do Portal Vip Brasil a partir do Firestore,
 * com fallback gracioso para os 7 projetos pré-configurados em caso de offline.
 */
export async function listAllPortalProjectsFromDb(): Promise<PortalProjectItem[]> {
  try {
    const db = firestore();
    const projectsRef = db.collection(COLLECTIONS.projects);
    const snap = await projectsRef.get();
    const storedDocs = snap.empty ? [] : queryData<PortalProjectItem>(snap);
    const storedById = new Map<string, any>(storedDocs.map((doc: any) => [doc.id, doc]));
    const now = nowIso();
    const writes: Promise<any>[] = [];

    const projects = PORTAL_VIP_PROJECTS.map((official) => {
      const stored = storedById.get(official.id);
      const merged = mergeOfficialPortalProject(official, stored);

      if (!stored) {
        const newDoc = {
          ...merged,
          createdAt: now,
          updatedAt: now
        };
        writes.push(
          projectsRef.doc(official.id).set(cleanObject(newDoc), { merge: true }).catch((err) => {
            console.warn(`[PortalPortfolio] Erro ao criar projeto oficial ${official.id}:`, err);
          })
        );
        return newDoc;
      }

      if (projectIdentityNeedsSync(stored, official)) {
        writes.push(
          projectsRef.doc(official.id).set(
            cleanObject({
              ...officialIdentityPatch(official),
              updatedAt: now
            }),
            { merge: true }
          ).catch((err) => {
            console.warn(`[PortalPortfolio] Erro ao reparar identidade do projeto ${official.id}:`, err);
          })
        );
      }

      return merged;
    });

    if (writes.length) await Promise.all(writes);
    return projects;
  } catch (err) {
    console.warn('[PortalPortfolio] Erro ao consultar Firestore projects, usando lista oficial:', err);
  }

  return PORTAL_VIP_PROJECTS.map((project) => mergeOfficialPortalProject(project));
}

/**
 * Consulta um projeto por ID ou Slug no banco Firestore (com fallback seguro).
 */
export async function getPortalProjectFromDb(idOrSlug: string): Promise<PortalProjectItem | undefined> {
  const norm = String(idOrSlug || '').trim().toLowerCase();
  if (!norm) return undefined;

  const official = PORTAL_VIP_PROJECTS.find(
    (project) => project.id.toLowerCase() === norm || project.slug.toLowerCase() === norm
  );
  if (!official) return undefined;

  try {
    const db = firestore();
    const docRef = db.collection(COLLECTIONS.projects).doc(official.id);
    const snap = await docRef.get();

    if (snap.exists) {
      const stored = docData<PortalProjectItem>(snap);
      if (stored) {
        if (projectIdentityNeedsSync(stored, official)) {
          await docRef.set(
            cleanObject({
              ...officialIdentityPatch(official),
              updatedAt: nowIso()
            }),
            { merge: true }
          ).catch((err) => {
            console.warn(`[PortalPortfolio] Erro ao reparar identidade individual ${official.id}:`, err);
          });
        }
        return mergeOfficialPortalProject(official, stored);
      }
    }

    const now = nowIso();
    const fresh = mergeOfficialPortalProject(official, {
      active: true,
      dailyMarketingEnabled: true,
      dailyBlogEnabled: true,
      socialSettings: defaultProjectSocialSettings(official),
      createdAt: now,
      updatedAt: now
    });
    await docRef.set(cleanObject(fresh), { merge: true }).catch((err) => {
      console.warn(`[PortalPortfolio] Erro ao criar projeto oficial ${official.id}:`, err);
    });
    return fresh;
  } catch (err) {
    console.warn('[PortalPortfolio] Erro ao consultar projeto individual no Firestore:', err);
  }

  return mergeOfficialPortalProject(official);
}

/**
 * Atualiza campos ou configurações de marketing/blog de um projeto no Firestore.
 */
export async function updatePortalProjectInDb(id: string, updates: Partial<PortalProjectItem>): Promise<PortalProjectItem | null> {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.projects).doc(id);
  const now = nowIso();

  const cleanUpdates = cleanObject({
    ...updates,
    updatedAt: now
  });

  await docRef.set(cleanUpdates, { merge: true });
  const fresh = await getPortalProjectFromDb(id);
  return fresh || null;
}

