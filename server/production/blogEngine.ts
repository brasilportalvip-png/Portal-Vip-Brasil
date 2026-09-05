import { config } from '../config/index.js';
import { COLLECTIONS, firestore, newId, nowIso, stableId } from './store.js';
import { PORTAL_VIP_PROJECTS, PORTAL_VIP_OFFICIAL_ASSETS, getProjectBySlug, PortalProjectItem, listAllPortalProjectsFromDb, seedPortalProjectsIfEmpty } from './almaPortfolio.js';
import { executeAiWith2SecAntiFall } from './antiFallEngine.js';
import { generateMarketingImage } from './ai.js';
import { getAdminAuth } from '../providers/firebaseAdmin.js';

function safeString(value: any, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

async function acquireDailyBlogClaim(projectId: string, date: string): Promise<any | null> {
  const db = firestore();
  const id = stableId(`portal-daily-blog:${projectId}:${date}`);
  const ref = db.collection(COLLECTIONS.idempotency).doc(id);
  const now = Date.now();
  const acquired = await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    if (current?.status === 'completed') return false;
    if (current?.status === 'processing' && Number(current?.lockedUntil || 0) > now) return false;
    tx.set(ref, {
      id, kind: 'portal_daily_blog', projectId, date, status: 'processing',
      lockedUntil: now + 20 * 60 * 1000, startedAt: nowIso(), updatedAt: nowIso()
    }, { merge: true });
    return true;
  });
  return acquired ? ref : null;
}

export interface BlogArticleSection {
  h2: string;
  content: string;
  h3s?: Array<{ h3: string; content: string }>;
}

export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface SocialRepurposePack {
  instagram: { caption: string; hashtags: string[]; utmUrl: string };
  facebook: { postText: string; utmUrl: string };
  linkedin: { postText: string; utmUrl: string };
  x: { tweetText: string; utmUrl: string };
}

export interface StoredBlogArticle {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  introduction?: string;
  category: string;
  tags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: 'informational' | 'educational' | 'commercial' | 'navigational' | 'tutorial' | 'guide';
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  featured: boolean;
  coverImage: string;
  coverAlt: string;
  coverImageStoragePath?: string;
  coverImageGenerated?: boolean;
  sections: BlogArticleSection[];
  faqSection: BlogFaqItem[];
  conclusion: string;
  callToAction: string;
  projectId?: string;
  relatedProjectId: string;
  relatedProjectName: string;
  relatedProjectUrl: string;
  relatedPlayStoreUrl?: string;
  hasApp: boolean;
  internalLinks: Array<{ label: string; url: string }>;
  socialCampaign?: SocialRepurposePack;
  status: 'published' | 'pending_approval' | 'draft' | 'archived';
  views: number;
  likes: number;
  shares: number;
  clicksWebsite: number;
  clicksPlayStore: number;
  createdAt: string;
  generationModel?: string;
}

export interface BlogSettings {
  mode: 'automatic' | 'approval';
  frequency: 'daily';
  defaultAuthorName: string;
  defaultAuthorRole: string;
  autoSocialRepurpose: boolean;
  indexNowEnabled: boolean;
  updatedAt: string;
}

// Configurações padrão do blog
const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  mode: 'automatic',
  frequency: 'daily',
  defaultAuthorName: 'Equipe Editorial Portal Vip Brasil',
  defaultAuthorRole: 'Especialista em Conteúdo & Tecnologia',
  autoSocialRepurpose: true,
  indexNowEnabled: true,
  updatedAt: new Date().toISOString()
};

// Pautas e temas predefinidos para inicialização e fallback inteligente sem repetições
const PROJECT_TOPIC_POOLS: Record<string, Array<{
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: StoredBlogArticle['searchIntent'];
  category: string;
}>> = {
  proj_magia_crencas: [
    {
      topic: 'Como Despertar o Poder das Suas Crenças e Atrair Prosperidade Diária',
      primaryKeyword: 'poder das crenças',
      secondaryKeywords: ['orações de prosperidade', 'decretos diários', 'fé inabalável', 'abrir caminhos'],
      searchIntent: 'educational',
      category: 'Espiritualidade & Fé'
    },
    {
      topic: '7 Decretos Espirituais Matinais para Blindar sua Energia e Abrir Portas',
      primaryKeyword: 'decretos espirituais matinais',
      secondaryKeywords: ['blindagem espiritual', 'oração matinal poderosa', 'lei da atração espiritual'],
      searchIntent: 'guide',
      category: 'Espiritualidade & Fé'
    },
    {
      topic: 'Como o Aplicativo Magia das Crenças Ajuda na Sua Rotina Devocional',
      primaryKeyword: 'aplicativo magia das crenças',
      secondaryKeywords: ['app de oração diária', 'mensagens espirituais no celular', 'orações play store'],
      searchIntent: 'commercial',
      category: 'Tecnologia & Apps'
    },
    {
      topic: 'O Poder da Gratidão Antecipada: O Segredo dos Rituais de Prosperidade',
      primaryKeyword: 'rituais de prosperidade',
      secondaryKeywords: ['gratidão antecipada', 'espiritualidade prática', 'conexão divina'],
      searchIntent: 'informational',
      category: 'Espiritualidade & Fé'
    }
  ],
  proj_exu_responde: [
    {
      topic: 'Exu Responde: O Significado dos Guardiões e a Clareza nas Suas Decisões',
      primaryKeyword: 'exu responde',
      secondaryKeywords: ['conselho de guardião', 'oráculo exu online', 'abertura de caminhos espirituais'],
      searchIntent: 'informational',
      category: 'Oráculos & Guardiões'
    },
    {
      topic: 'Como Consultar o Oráculo dos Guardiões para Desbloquear a Vida Financeira e Afetiva',
      primaryKeyword: 'consulta oráculo guardiões',
      secondaryKeywords: ['firmeza de pensamentos', 'desbloqueio espiritual', 'sabedoria ancestral'],
      searchIntent: 'guide',
      category: 'Oráculos & Guardiões'
    },
    {
      topic: 'Aplicativo Exu Responde na Play Store: Tire Dúvidas e Receba Conselhos Imediatos',
      primaryKeyword: 'app exu responde play store',
      secondaryKeywords: ['oráculo no celular android', 'respostas espirituais rápidas', 'consulta de guardião app'],
      searchIntent: 'commercial',
      category: 'Tecnologia & Apps'
    }
  ],
  proj_maria_padilha: [
    {
      topic: 'Maria Padilha: Oração Forte para Autoestima, Amor Próprio e Magnetismo Pessoal',
      primaryKeyword: 'oração maria padilha',
      secondaryKeywords: ['rainha das 7 encruzilhadas', 'magnetismo pessoal', 'amor próprio e sedução sagrada'],
      searchIntent: 'guide',
      category: 'Amor & Relacionamentos'
    },
    {
      topic: 'Como Acender a Chama do Amor e Harmonizar Relacionamentos em Crise',
      primaryKeyword: 'harmonizar relacionamentos',
      secondaryKeywords: ['conselho amoroso oracular', 'firmeza sentimental', 'atração saudável'],
      searchIntent: 'educational',
      category: 'Amor & Relacionamentos'
    },
    {
      topic: 'Conheça o Aplicativo Oficial Maria Padilha Rainha das 7 Encruzilhadas',
      primaryKeyword: 'aplicativo maria padilha',
      secondaryKeywords: ['app orações maria padilha', 'oráculo do amor play store', 'mensagens de pombagira'],
      searchIntent: 'commercial',
      category: 'Tecnologia & Apps'
    }
  ],
  proj_manual_catolico: [
    {
      topic: 'Manual Católico: Guia Completo para Rezar o Santo Terço e as Principais Novenas',
      primaryKeyword: 'como rezar o santo terço',
      secondaryKeywords: ['manual católico', 'novenas milagrosas', 'orações católicas diárias', 'liturgia católica'],
      searchIntent: 'tutorial',
      category: 'Tradição Católica'
    },
    {
      topic: 'Santo do Dia e Exame de Consciência: Como Fortalecer a Fé Cristã na Rotina',
      primaryKeyword: 'santo do dia e liturgia',
      secondaryKeywords: ['exame de consciência diário', 'vida cristã', 'devoção aos santos'],
      searchIntent: 'educational',
      category: 'Tradição Católica'
    },
    {
      topic: 'Aplicativo Manual Católico na Google Play Store: Seu Devocionário de Bolso',
      primaryKeyword: 'aplicativo manual católico',
      secondaryKeywords: ['app católico play store', 'orações tradicionais no celular', 'catecismo e novenas app'],
      searchIntent: 'commercial',
      category: 'Tecnologia & Apps'
    }
  ],
  proj_frocia2: [
    {
      topic: 'Froc IA: Como a Inteligência Artificial Está Revolucionando a Produção de Conteúdo e SEO',
      primaryKeyword: 'inteligência artificial para conteúdo',
      secondaryKeywords: ['froc ia', 'gerador de artigos seo', 'marketing com ia', 'automação digital'],
      searchIntent: 'informational',
      category: 'Inteligência Artificial'
    },
    {
      topic: 'Engenharia de Prompts para Vendas: Como Criar Copys Magnéticas em Segundos',
      primaryKeyword: 'engenharia de prompts para marketing',
      secondaryKeywords: ['copys que convertem', 'ia generativa para negócios', 'textos persuasivos'],
      searchIntent: 'guide',
      category: 'Marketing & SEO'
    }
  ],
  proj_oraculos_ts: [
    {
      topic: 'Oráculos Online: Como Interpretar o Tarot de Marselha e o Baralho Cigano com Precisão',
      primaryKeyword: 'tarot online gratis',
      secondaryKeywords: ['oráculos ts', 'baralho cigano interpretação', 'runas nórdicas online', 'tiragem de cartas'],
      searchIntent: 'educational',
      category: 'Oráculos & Guardiões'
    },
    {
      topic: 'A Sabedoria das Runas Nórdicas: Como Decodificar Mensagens para o Futuro',
      primaryKeyword: 'runas nórdicas significado',
      secondaryKeywords: ['leitura de runas online', 'oráculo nórdico', 'autoconhecimento e destino'],
      searchIntent: 'informational',
      category: 'Oráculos & Guardiões'
    }
  ],
  proj_froc_marketing_engine: [
    {
      topic: 'Automação de Tráfego Orgânico: O Segredo para Indexar no Google e Bing Todos os Dias',
      primaryKeyword: 'automação de tráfego orgânico',
      secondaryKeywords: ['froc ia marketing engine', 'autopilot de blog e redes', 'seo sustentável', 'indexação diária'],
      searchIntent: 'guide',
      category: 'Marketing & SEO'
    },
    {
      topic: 'Como Construir um Ecossistema de Sites e Apps Conectados ao Piloto Automático',
      primaryKeyword: 'ecossistema de marketing digital',
      secondaryKeywords: ['divulgação de aplicativos play store', 'motor de conteúdo ia', 'portal vip brasil'],
      searchIntent: 'educational',
      category: 'Marketing & SEO'
    }
  ]
};

// Seed de artigos iniciais de alta autoridade
export const INITIAL_SEEDED_ARTICLES: StoredBlogArticle[] = [
  {
    id: 'art-magia-crencas-decretos-2026',
    slug: 'como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos',
    title: 'Como Despertar o Poder das Suas Crenças e Atrair Prosperidade Diária',
    seoTitle: 'Como Despertar o Poder das Suas Crenças e Prosperar | Portal Vip Brasil',
    metaDescription: 'Descubra como decretos mentais, orações e a firmeza de intenção desbloqueiam portas e transformam sua realidade no portal Magia das Crenças.',
    excerpt: 'Descubra como decretos mentais, orações guiadas e a firmeza de intenção podem desbloquear portas e transformar sua realidade financeira e espiritual.',
    category: 'Espiritualidade & Fé',
    tags: ['Magia das Crenças', 'Prosperidade', 'Orações', 'Lei da Atração', 'Fé'],
    primaryKeyword: 'poder das crenças',
    secondaryKeywords: ['orações de prosperidade', 'decretos diários', 'fé inabalável'],
    searchIntent: 'educational',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    readTime: '5 min de leitura',
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Luz dourada simbolizando a força das crenças e fé inabalável',
    relatedProjectId: 'proj_magia_crencas',
    relatedProjectName: 'Magia das Crenças',
    relatedProjectUrl: 'https://www.magiadascrencas.com.br/',
    relatedPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.magiadascrencas.app',
    hasApp: true,
    sections: [
      {
        h2: 'O Poder da Intenção Focalizada e o Campo Mental',
        content: 'O universo responde à frequência em que você vibra. Quando a sua mente, o seu coração e as suas palavras estão alinhados na mesma convicção, não existem barreiras que permaneçam fechadas. No portal **Magia das Crenças**, ensinamos que a fé não é apenas esperar passivamente; é um ato de cocriação diária onde você decreta a sua vitória antes mesmo que os olhos físicos a vejam.'
      },
      {
        h2: 'Os Três Pilares da Transformação Diária',
        content: 'Para transformar crenças limitantes em magnetismo realizador, adote esta disciplina matinal:',
        h3s: [
          {
            h3: '1. A Palavra Falada (O Decreto do Amanhecer)',
            content: 'Ao acordar, antes de qualquer distração digital, declare: *"Hoje meus caminhos estão abertos pela providência divina. A abundância flui para a minha vida com graça e harmonia."*'
          },
          {
            h3: '2. O Silêncio da Gratidão Antecipada',
            content: 'Agradeça por aquilo que você ainda está aguardando como se já estivesse em suas mãos. A gratidão é o ímã magnético do plano espiritual.'
          },
          {
            h3: '3. A Ação Firme e Inspirada',
            content: 'Dê passos concretos em direção aos seus objetivos sem duvidar do resultado que a vida está preparando.'
          }
        ]
      }
    ],
    faqSection: [
      {
        question: 'O que é o portal Magia das Crenças?',
        answer: 'É um portal e aplicativo oficial com orações diárias, mensagens de conforto, decretos de prosperidade e rituais sagrados para fortalecimento espiritual.'
      },
      {
        question: 'Onde posso baixar o aplicativo Magia das Crenças?',
        answer: 'O aplicativo está disponível gratuitamente na Google Play Store para dispositivos Android.'
      }
    ],
    conclusion: 'A sua realidade externa é um reflexo direto das certezas que você cultiva no seu íntimo. Comece hoje a alimentar sua mente com palavras de luz e vitória.',
    callToAction: 'Visite o site oficial Magia das Crenças e baixe o aplicativo na Play Store para receber suas orações diárias.',
    internalLinks: [
      { label: 'Vitrine Oficial do Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Exu Responde e Sabedoria Ancestral', url: '/blog/exu-responde-como-consultar-os-guardioes-com-respeito-e-clareza' }
    ],
    socialCampaign: {
      instagram: {
        caption: '✨ Desperte o poder das suas crenças! Novo artigo no Blog Oficial do Portal Vip Brasil ensina como atrair prosperidade e abrir caminhos hoje. Leia no Portal Vip Brasil.',
        hashtags: ['#MagiaDasCrencas', '#Prosperidade', '#Fe', '#PortalVipBrasil', '#DecretoDoDia'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=instagram&utm_medium=social&utm_campaign=blog_magia_crencas'
      },
      facebook: {
        postText: 'Como transformar sua rotina com o poder das palavras certas? Leia o novo guia completo no Blog Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=facebook&utm_medium=social&utm_campaign=blog_magia_crencas'
      },
      linkedin: {
        postText: 'Artigo publicado no Portal Vip Brasil: Como a intenção focada e os hábitos mentais impactam a clareza e tomada de decisão.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=linkedin&utm_medium=social&utm_campaign=blog_magia_crencas'
      },
      x: {
        tweetText: 'Aprenda como desbloquear seus caminhos com o poder dos decretos diários no Blog Portal Vip Brasil:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=x&utm_medium=social&utm_campaign=blog_magia_crencas'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-09-01T08:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  },
  {
    id: 'art-exu-responde-sabedoria-ancestral',
    slug: 'exu-responde-como-consultar-os-guardioes-com-respeito-e-clareza',
    title: 'Exu Responde: O Significado dos Guardiões e a Clareza nas Suas Decisões',
    seoTitle: 'Exu Responde: Como Consultar os Guardiões com Respeito e Clareza',
    metaDescription: 'Entenda como a sabedoria ancestral dos oráculos e dos guardiões de encruzilhada traz respostas diretas para dilemas amorosos e de caminhos.',
    excerpt: 'Entenda como a sabedoria ancestral dos oráculos e dos guardiões de encruzilhada traz respostas diretas para dilemas amorosos, profissionais e de proteção.',
    category: 'Oráculos & Guardiões',
    tags: ['Exu Responde', 'Oráculo', 'Guardiões', 'Firmeza', 'Caminhos Abertos'],
    primaryKeyword: 'exu responde',
    secondaryKeywords: ['conselho de guardião', 'oráculo de encruzilhada'],
    searchIntent: 'informational',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-30T09:00:00.000Z',
    updatedAt: '2026-08-30T09:00:00.000Z',
    readTime: '6 min de leitura',
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Chama acesa simbolizando a iluminação dos caminhos e sabedoria oracular',
    relatedProjectId: 'proj_exu_responde',
    relatedProjectName: 'Exu Responde',
    relatedProjectUrl: 'https://exu-responde.vercel.app/',
    relatedPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde',
    hasApp: true,
    sections: [
      {
        h2: 'A Sabedoria Prática dos Guardiões',
        content: 'Na cosmovisão das religiões de matriz africana, o Guardião é o mensageiro da verdade, o dinamizador das energias e o fiel da balança. Consultar um oráculo não significa buscar atalhos mágicos, mas obter a clareza de discernimento para enxergar onde seus passos estão tropeçando e onde é preciso agir com coragem.'
      },
      {
        h2: 'Como Funciona a Consulta no Exu Responde',
        content: 'O ambiente **Exu Responde** foi projetado para oferecer mensagens ponderadas, respeitosas e fundamentadas na ética espiritual.',
        h3s: [
          {
            h3: 'Conselhos para Vida Profissional',
            content: 'Direcionamentos práticos para tomar decisões corporativas e destravar negociações estagnadas.'
          },
          {
            h3: 'Harmonia e Firmeza Pessoal',
            content: 'Reflexões para afastar a indecisão e fortalecer a autoconfiança no dia a dia.'
          }
        ]
      }
    ],
    faqSection: [
      {
        question: 'O que é o Exu Responde?',
        answer: 'É uma plataforma online e aplicativo de conselhos oraculares rápidos e direcionamentos com sabedoria ancestral.'
      },
      {
        question: 'Onde encontro o app oficial?',
        answer: 'Disponível na Google Play Store com o nome Exu Responde.'
      }
    ],
    conclusion: 'Ter clareza no caminhar é o primeiro passo para não se perder nas encruzilhadas da vida. Consulte com fé e aja com honra.',
    callToAction: 'Faça sua tiragem no site oficial ou instale o aplicativo Exu Responde na Play Store.',
    internalLinks: [
      { label: 'Vitrine Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Maria Padilha e Magnetismo', url: '/blog/maria-padilha-rainha-oracao-para-autoestima-e-amor-proprio' }
    ],
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-30T09:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  }
];

// Helper para gerar slug permanente limpo
export function slugify(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Retorna as configurações do Blog
 */
export async function getBlogSettings(): Promise<BlogSettings> {
  try {
    const doc = await firestore().collection(COLLECTIONS.blogSettings).doc('main').get();
    if (doc.exists) {
      return { ...DEFAULT_BLOG_SETTINGS, ...(doc.data() as BlogSettings) };
    }
  } catch (err) {
    console.warn('[BlogEngine] Erro ao carregar configurações do blog, usando padrão:', err);
  }
  return DEFAULT_BLOG_SETTINGS;
}

/**
 * Atualiza configurações do Blog
 */
export async function updateBlogSettings(partial: Partial<BlogSettings>): Promise<BlogSettings> {
  const current = await getBlogSettings();
  const updated: BlogSettings = {
    ...current,
    ...partial,
    updatedAt: nowIso()
  };
  try {
    await firestore().collection(COLLECTIONS.blogSettings).doc('main').set(updated, { merge: true });
  } catch (err) {
    console.warn('[BlogEngine] Erro ao salvar configurações no Firestore:', err);
  }
  return updated;
}

export function serializeBlogArticleForPublic(article: StoredBlogArticle, project?: PortalProjectItem): Record<string, any> {
  const knownProject = project || PORTAL_VIP_PROJECTS.find((item) => item.id === article.relatedProjectId);
  const relatedProjectSlug = knownProject?.slug || slugify(article.relatedProjectName || article.relatedProjectId);
  const canonicalUrl = `${config.appUrl.replace(/\/$/, '')}/blog/${article.slug}`;
  const words = [
    article.introduction || '',
    ...(article.sections || []).flatMap((section) => [
      section.h2,
      section.content,
      ...(section.h3s || []).flatMap((sub) => [sub.h3, sub.content])
    ]),
    article.conclusion || '',
    article.callToAction || ''
  ].filter(Boolean);
  const social = article.socialCampaign;
  const searchIntent = ['commercial', 'navigational', 'informational'].includes(article.searchIntent)
    ? article.searchIntent
    : 'informational';

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.excerpt,
    excerpt: article.excerpt,
    metaDescription: article.metaDescription,
    keywords: [...new Set([article.primaryKeyword, ...(article.secondaryKeywords || []), ...(article.tags || [])].filter(Boolean))],
    category: article.category,
    targetAudience: knownProject?.targetAudience || '',
    searchIntent,
    coverImage: article.coverImage,
    coverImageAlt: article.coverAlt,
    readingTimeMinutes: Number.parseInt(article.readTime || '', 10) || 5,
    readTime: article.readTime,
    contentMarkdown: words.join('\n\n'),
    sections: article.sections || [],
    keyTakeaways: [],
    faq: article.faqSection || [],
    relatedProjectId: article.relatedProjectId,
    relatedProjectName: article.relatedProjectName,
    relatedProjectSlug,
    relatedProjectUrl: article.relatedProjectUrl,
    relatedPlayStoreUrl: article.relatedPlayStoreUrl,
    canonicalUrl,
    schemaJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.metaDescription || article.excerpt,
      image: article.coverImage ? [article.coverImage] : undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      author: { '@type': 'Organization', name: article.author?.name || 'Portal Vip Brasil' },
      publisher: { '@type': 'Organization', name: 'Portal Vip Brasil' },
      mainEntityOfPage: canonicalUrl
    },
    socialRepurpose: {
      instagram: {
        caption: social?.instagram?.caption || article.excerpt,
        hashtags: social?.instagram?.hashtags || [],
        utmUrl: social?.instagram?.utmUrl || canonicalUrl
      },
      facebook: {
        postText: social?.facebook?.postText || article.excerpt,
        utmUrl: social?.facebook?.utmUrl || canonicalUrl
      },
      linkedin: {
        postText: social?.linkedin?.postText || article.excerpt,
        professionalTakeaway: '',
        utmUrl: social?.linkedin?.utmUrl || canonicalUrl
      },
      twitter: {
        thread: [social?.x?.tweetText, social?.x?.utmUrl].filter(Boolean),
        utmUrl: social?.x?.utmUrl || canonicalUrl
      }
    },
    author: {
      name: article.author?.name || 'Portal Vip Brasil',
      role: article.author?.role || 'Equipe Editorial',
      avatar: article.author?.avatar || PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
      bio: 'Conteúdo editorial do Portal Vip Brasil associado ao projeto oficial informado neste artigo.'
    },
    views: Number(article.views || 0),
    likes: Number(article.likes || 0),
    shares: Number(article.shares || 0),
    clicksWebsite: Number(article.clicksWebsite || 0),
    clicksPlayStore: Number(article.clicksPlayStore || 0),
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    status: article.status,
    featured: Boolean(article.featured)
  };
}

/**
 * Lista artigos do Blog com filtros e paginação
 */
export async function listBlogArticles(filters: {
  category?: string;
  projectId?: string;
  query?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: StoredBlogArticle[]; total: number }> {
  try {
    const db = firestore();
    const snap = await db.collection(COLLECTIONS.blogArticles).orderBy('publishedAt', 'desc').limit(500).get();
    let items: StoredBlogArticle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    if (filters.status && filters.status !== 'all') {
      items = items.filter((article) => article.status === filters.status);
    }
    if (filters.projectId) {
      items = items.filter((article) => article.relatedProjectId === filters.projectId);
    }
    if (filters.category && filters.category !== 'Todos') {
      items = items.filter((article) => article.category === filters.category);
    }

    if (items.length === 0) {
      items = INITIAL_SEEDED_ARTICLES.filter((article) =>
        (!filters.status || filters.status === 'all' || article.status === filters.status) &&
        (!filters.projectId || article.relatedProjectId === filters.projectId) &&
        (!filters.category || filters.category === 'Todos' || article.category === filters.category)
      );
    }

    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      items = items.filter((art) =>
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.tags?.some((t) => t.toLowerCase().includes(q)) ||
        art.primaryKeyword?.toLowerCase().includes(q) ||
        art.secondaryKeywords?.some((keyword) => keyword.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || '')));
    const total = items.length;
    const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 200);
    const offset = Math.max(Number(filters.offset || 0), 0);
    return { articles: items.slice(offset, offset + limit), total };
  } catch (err) {
    console.warn('[BlogEngine] Erro ao listar artigos do Firestore, usando fallback local:', err);
    let items = [...INITIAL_SEEDED_ARTICLES];
    if (filters.status && filters.status !== 'all') items = items.filter((a) => a.status === filters.status);
    if (filters.category && filters.category !== 'Todos') items = items.filter((a) => a.category === filters.category);
    if (filters.projectId) items = items.filter((a) => a.relatedProjectId === filters.projectId);
    items.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
    return { articles: items, total: items.length };
  }
}

/**
 * Busca um artigo pelo seu slug amigável
 */
export async function getBlogArticleBySlug(slug: string): Promise<StoredBlogArticle | undefined> {
  const clean = slugify(slug);
  try {
    const snap = await firestore()
      .collection(COLLECTIONS.blogArticles)
      .where('slug', '==', clean)
      .limit(10)
      .get();

    const publishedDoc = snap.docs.find((doc) => String((doc.data() as any)?.status || '') === 'published');
    if (publishedDoc) return { id: publishedDoc.id, ...(publishedDoc.data() as any) };
  } catch (err) {
    console.warn('[BlogEngine] Erro ao buscar artigo por slug no Firestore:', err);
  }
  return INITIAL_SEEDED_ARTICLES.find((a) => a.slug === clean || a.id === slug);
}

/**
 * Notificação via protocolo IndexNow para buscadores (Bing, Yandex, etc.)
 */
export async function notifyIndexNow(urls: string[]): Promise<{ submitted: boolean; status?: number; reason?: string }> {
  if (!urls || urls.length === 0) return { submitted: false, reason: 'no_urls' };
  if (!config.indexNowKey) return { submitted: false, reason: 'not_configured' };

  let appUrl: URL;
  try {
    appUrl = new URL(config.appUrl);
  } catch {
    return { submitted: false, reason: 'invalid_app_url' };
  }

  const uniqueUrls = [...new Set(urls.map((value) => String(value || '').trim()).filter(Boolean))]
    .filter((value) => {
      try { return new URL(value).host === appUrl.host; } catch { return false; }
    })
    .slice(0, 10_000);
  if (!uniqueUrls.length) return { submitted: false, reason: 'no_same_host_urls' };

  const payload = {
    host: appUrl.host,
    key: config.indexNowKey,
    keyLocation: `${appUrl.origin}/indexnow-key.txt`,
    urlList: uniqueUrls
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const accepted = response.status === 200 || response.status === 202;
    if (accepted) {
      console.info(`[IndexNow] ${uniqueUrls.length} URL(s) submetida(s). HTTP ${response.status}.`);
      return { submitted: true, status: response.status };
    }
    console.warn(`[IndexNow] Envio rejeitado. HTTP ${response.status}.`);
    return { submitted: false, status: response.status, reason: 'http_rejected' };
  } catch (err: any) {
    console.warn('[IndexNow] Falha de transporte (não bloqueante):', err?.name || err?.message || String(err));
    return { submitted: false, reason: 'transport_error' };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBlogAutomationUserId(value: unknown): string {
  const id = String(value || '').trim();
  return id && id.length <= 128 && !id.includes('/') ? id : '';
}

async function resolveBlogAutomationUserId(explicitUserId?: string): Promise<string | undefined> {
  const explicit = normalizeBlogAutomationUserId(explicitUserId);
  if (explicit) return explicit;
  const ownerEmail = config.privateAdminEmails[0];
  const auth = getAdminAuth();
  if (!ownerEmail || !auth) return undefined;
  try {
    const record = await auth.getUserByEmail(ownerEmail);
    const uid = normalizeBlogAutomationUserId(record?.uid);
    return uid || undefined;
  } catch (error) {
    console.warn('[BlogEngine] Proprietário não pôde ser resolvido para repurpose social; artigo continuará normalmente.', error);
    return undefined;
  }
}

function buildDynamicTopicR81(
  project: PortalProjectItem,
  pastTitles: string[],
  cycleDate: string
): {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: StoredBlogArticle['searchIntent'];
  category: string;
} {
  const keywords = [...new Set([
    ...(project.bingSeoKeywords || []),
    ...(project.keywords || []),
    project.name
  ].map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 16);
  const safeKeywords = keywords.length ? keywords : [project.name];
  const templates: Array<{ intent: StoredBlogArticle['searchIntent']; build: (keyword: string) => string }> = [
    { intent: 'guide', build: (keyword) => project.name + ': guia prático sobre ' + keyword + ' e como começar' },
    { intent: 'tutorial', build: (keyword) => 'Como usar ' + keyword + ' com ' + project.name + ': passo a passo para iniciantes' },
    { intent: 'informational', build: (keyword) => keyword + ': principais dúvidas, conceitos e boas práticas em ' + project.name },
    { intent: 'educational', build: (keyword) => 'Erros comuns sobre ' + keyword + ' e como ' + project.name + ' ajuda a evitá-los' },
    { intent: 'commercial', build: (keyword) => project.name + ' vale a pena para quem busca ' + keyword + '? Recursos e acesso oficial' },
    { intent: 'navigational', build: (keyword) => 'Onde encontrar ' + project.name + ' para ' + keyword + ': site e canais oficiais' }
  ];
  const normalizedPast = new Set(pastTitles.map((title) => String(title || '').trim().toLowerCase()));
  const offset = pastTitles.length;
  const attempts = Math.max(1, safeKeywords.length * templates.length);
  for (let i = 0; i < attempts; i += 1) {
    const position = offset + i;
    const keyword = safeKeywords[position % safeKeywords.length];
    const template = templates[Math.floor(position / safeKeywords.length) % templates.length];
    const topic = template.build(keyword);
    if (!normalizedPast.has(topic.toLowerCase())) {
      return {
        topic,
        primaryKeyword: keyword.toLowerCase(),
        secondaryKeywords: safeKeywords.filter((item) => item !== keyword).slice(0, 5),
        searchIntent: template.intent,
        category: project.category
      };
    }
  }
  const keyword = safeKeywords[offset % safeKeywords.length];
  const companion = safeKeywords[(offset + 1) % safeKeywords.length] || project.name;
  return {
    topic: 'Como ' + keyword + ' se conecta a ' + companion + ' em ' + project.name + ': guia prático ' + cycleDate,
    primaryKeyword: keyword.toLowerCase(),
    secondaryKeywords: safeKeywords.filter((item) => item !== keyword).slice(0, 5),
    searchIntent: 'guide',
    category: project.category
  };
}

/**
 * Gera 1 artigo inédito com IA para um projeto específico
 */
export async function generateArticleForProject(
  project: PortalProjectItem,
  options?: {
    customTopic?: string;
    customIntent?: StoredBlogArticle['searchIntent'];
    forceApproval?: boolean;
    userId?: string;
    articleId?: string;
  }
): Promise<{ success: boolean; article: StoredBlogArticle }> {
  const settings = await getBlogSettings();
  const db = firestore();
  const todayIso = nowIso();

  // 1. Pesquisa de histórico anterior para evitar pauta, palavra-chave e slug duplicados
  let pastArticles: Array<{ title: string; slug: string; primaryKeyword: string }> = [];
  try {
    const pastSnap = await db
      .collection(COLLECTIONS.blogArticles)
      .where('relatedProjectId', '==', project.id)
      .get();
    pastArticles = pastSnap.docs.map((d) => {
      const item = d.data() as any;
      return {
        title: String(item.title || ''),
        slug: String(item.slug || ''),
        primaryKeyword: String(item.primaryKeyword || '')
      };
    });
  } catch {
    pastArticles = INITIAL_SEEDED_ARTICLES
      .filter((a) => a.relatedProjectId === project.id)
      .map((a) => ({ title: a.title, slug: a.slug, primaryKeyword: a.primaryKeyword }));
  }
  const pastTitles = pastArticles.map((item) => item.title).filter(Boolean);

  // 2. Seleciona pauta inédita; quando o pool acaba, cria um novo ângulo long-tail em vez de repetir o primeiro tema.
  const pool = PROJECT_TOPIC_POOLS[project.id] || [];
  const cycleDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  let chosenTopicItem = pool.find((item) => !pastTitles.some((t) => t.toLowerCase() === item.topic.toLowerCase()));
  if (!chosenTopicItem) chosenTopicItem = buildDynamicTopicR81(project, pastTitles, cycleDate);

  const topic = options?.customTopic || chosenTopicItem.topic;
  const primaryKeyword = chosenTopicItem.primaryKeyword || project.keywords[0] || project.name;
  const searchIntent = options?.customIntent || chosenTopicItem.searchIntent || 'educational';


  // 3. Prompt de Engenharia Editorial para o Gemini com JSON estruturado
  const prompt = `Você é o Redator-Chefe e Especialista em SEO do Portal Vip Brasil.
Crie um artigo completo, original, aprofundado e altamente relevante para o Blog Oficial do Portal Vip Brasil.

DADOS REAIS DO PROJETO:
- Nome: ${project.name}
- Categoria: ${project.category}
- Segmento: ${project.segment}
- Website Oficial: ${project.websiteUrl}
${project.hasApp && project.playStoreUrl ? `- Possui Aplicativo na Play Store: ${project.playStoreUrl} (${project.appTitle})` : '- Produto 100% Web / Plataforma Digital (NÃO INVENTAR QUE TEM APLICATIVO NA PLAY STORE)'}
- Diferenciais Reais: ${project.highlights.join(' | ')}
- Palavras-chave do Projeto: ${project.keywords.join(', ')}

DIRETRIZES DA PAUTA:
- Tema do Artigo: ${topic}
- Palavra-Chave Principal: ${primaryKeyword}
- Intenção de Busca: ${searchIntent}
- Títulos já utilizados anteriormente (EVITE DUPLICAR): ${pastTitles.join(' | ') || 'Nenhum'}

REQUISITOS OBRIGATÓRIOS:
1. Título atraente, claro e sem clickbait falso.
2. Slug limpo em minúsculas com hífens.
3. SEO Title (máx 65 caracteres) e Meta Description rica (140 a 160 caracteres).
4. Resumo (Excerpt) de 2 frases.
5. Pelo menos 3 Seções ricas (H2) com subtópicos (H3) quando apropriado. Conteúdo com profundidade real e valor prático.
6. Seção de Perguntas Frequentes (FAQ) com 2 a 3 perguntas e respostas diretas e úteis.
7. Conclusão inspiradora e Chamada para Ação (CTA) clara direcionando para o site oficial (${project.websiteUrl}) ${project.hasApp ? `e para baixar o aplicativo na Play Store (${project.playStoreUrl})` : ''}.
8. Pacote de Repurposing para Redes Sociais: legendas prontas para Instagram, Facebook, LinkedIn e X com UTM links.

RESPONDA EXCLUSIVAMENTE EM FORMATO JSON com a seguinte estrutura:
{
  "title": "string",
  "suggestedSlug": "string",
  "seoTitle": "string",
  "metaDescription": "string",
  "excerpt": "string",
  "category": "${project.category}",
  "tags": ["tag1", "tag2", "tag3"],
  "primaryKeyword": "${primaryKeyword}",
  "secondaryKeywords": ["termo1", "termo2"],
  "readTime": "5 min de leitura",
  "coverAlt": "Descrição da imagem da capa",
  "sections": [
    { "h2": "string", "content": "string", "h3s": [{ "h3": "string", "content": "string" }] }
  ],
  "faqSection": [
    { "question": "string", "answer": "string" }
  ],
  "conclusion": "string",
  "callToAction": "string",
  "socialCampaign": {
    "instagram": { "caption": "string", "hashtags": ["#tag1", "#tag2"] },
    "facebook": { "postText": "string" },
    "linkedin": { "postText": "string" },
    "x": { "tweetText": "string" }
  }
}`;

  const aiRes = await executeAiWith2SecAntiFall({
    prompt,
    systemInstruction: 'Você é a IA Editorial do Portal Vip Brasil. Produza artigos ricos, verídicos, otimizados para SEO e com profundo valor para os leitores.',
    jsonOutput: true,
    maxTokens: 4000,
    timeoutMs: 2500
  });

  let parsed: any;
  try {
    const rawParsed = JSON.parse(aiRes.text);
    if (rawParsed && typeof rawParsed === 'object' && (rawParsed.sections?.length > 0 || rawParsed.excerpt || rawParsed.title)) {
      parsed = rawParsed;
    } else {
      throw new Error('Formato retornado pela IA incompleto');
    }
  } catch {
    // Fallback estruturado de contingência
    parsed = {
      title: topic,
      suggestedSlug: slugify(topic),
      seoTitle: `${topic} | Portal Vip Brasil`,
      metaDescription: `Confira o guia completo sobre ${project.name} no Portal Vip Brasil. Descubra benefícios, recursos e orientações práticas.`,
      excerpt: `Tudo o que você precisa saber sobre ${project.name}: orientações, recursos e caminhos para potencializar seus resultados.`,
      introduction: `Neste artigo, apresentamos todos os detalhes sobre ${project.name}, seus objetivos, funcionalidades essenciais e como ter acesso rápido.`,
      category: project.category,
      tags: project.keywords,
      primaryKeyword,
      secondaryKeywords: project.keywords.slice(0, 3),
      readTime: '5 min de leitura',
      coverAlt: `Ilustração representativa de ${project.name}`,
      sections: [
        {
          h2: `Conheça ${project.name} e Seus Principais Benefícios`,
          content: `${project.description}\n\nEntre os recursos cadastrados estão: ${project.highlights.join(', ')}.`
        },
        {
          h2: 'Como Começar a Utilizar Hoje Mesmo',
          content: `Para aproveitar ao máximo todos os recursos disponíveis, acesse o website oficial ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` ou faça o download do aplicativo oficial diretamente na Google Play Store (${project.playStoreUrl})` : ''}.`
        }
      ],
      faqSection: [
        {
          question: `O que é ${project.name}?`,
          answer: `${project.description}`
        },
        {
          question: `Onde posso acessar ${project.name}?`,
          answer: `Você pode acessar pelo endereço oficial ${project.websiteUrl}.`
        }
      ],
      conclusion: `Consulte as informações oficiais de ${project.name} e utilize somente os recursos descritos nos canais cadastrados.`,
      callToAction: `Acesse agora o site oficial ${project.websiteUrl} e confira as novidades.`,
      socialCampaign: {
        instagram: { caption: `Confira o novo artigo sobre ${project.name} no Blog Portal Vip Brasil!`, hashtags: ['#PortalVipBrasil', '#Tecnologia', '#Marketing'] },
        facebook: { postText: `Novo conteúdo disponível sobre ${project.name}. Acesse e confira!` },
        linkedin: { postText: `Publicação oficial do Portal Vip Brasil sobre ${project.name}.` },
        x: { tweetText: `Novo artigo sobre ${project.name} no blog Portal Vip Brasil:` }
      }
    };
  }

  const defaultExcerpt = `Tudo o que você precisa saber sobre ${project.name}: orientações, recursos e caminhos para potencializar seus resultados.`;
  const articleExcerpt = parsed.excerpt || parsed.metaDescription || defaultExcerpt;
  const articleSections: BlogArticleSection[] = (Array.isArray(parsed.sections) && parsed.sections.length > 0)
    ? parsed.sections
    : [
        {
          h2: `Conheça ${project.name} e Seus Principais Benefícios`,
          content: `${project.description}\n\nEntre os recursos cadastrados estão: ${project.highlights.join(', ')}.`
        },
        {
          h2: 'Como Começar a Utilizar Hoje Mesmo',
          content: `Para aproveitar ao máximo todos os recursos disponíveis, acesse o website oficial ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` ou faça o download do aplicativo oficial diretamente na Google Play Store (${project.playStoreUrl})` : ''}.`
        }
      ];

  const articleId = options?.articleId || newId('blog_art');
  let finalSlug = slugify(parsed.suggestedSlug || parsed.title || topic);
  try {
    const slugSnap = await db.collection(COLLECTIONS.blogArticles).where('slug', '==', finalSlug).limit(5).get();
    const collision = slugSnap.docs.some((doc) => doc.id !== articleId);
    if (collision) {
      const dateSuffix = todayIso.slice(0, 10).replace(/-/g, '');
      finalSlug = slugify(finalSlug + '-' + dateSuffix + '-' + stableId(articleId).slice(0, 6));
    }
  } catch {
    // O ID diário determinístico ainda evita duplicação do mesmo ciclo se a checagem de slug falhar.
  }
  const targetStatus = (options?.forceApproval || settings.mode === 'approval') ? 'pending_approval' : 'published';

  // URLs com UTM tracking para redes sociais
  const articlePublicUrl = config.appUrl.replace(/\/$/, '') + '/blog/' + finalSlug;
  const socialCampaign: SocialRepurposePack = {
    instagram: {
      caption: parsed.socialCampaign?.instagram?.caption || articleExcerpt,
      hashtags: Array.isArray(parsed.socialCampaign?.instagram?.hashtags) ? parsed.socialCampaign.instagram.hashtags : ['#PortalVipBrasil'],
      utmUrl: `${articlePublicUrl}?utm_source=instagram&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    facebook: {
      postText: parsed.socialCampaign?.facebook?.postText || articleExcerpt,
      utmUrl: `${articlePublicUrl}?utm_source=facebook&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    linkedin: {
      postText: parsed.socialCampaign?.linkedin?.postText || articleExcerpt,
      utmUrl: `${articlePublicUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    x: {
      tweetText: parsed.socialCampaign?.x?.tweetText || parsed.title || topic,
      utmUrl: `${articlePublicUrl}?utm_source=x&utm_medium=social&utm_campaign=daily_blog_seo`
    }
  };

  let coverImage = project.bannerUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
  let coverImageStoragePath: string | undefined;
  let coverImageGenerated = false;
  try {
    const generatedCover = await generateMarketingImage({
      userId: options?.userId || 'portal_vip_blog_automation',
      company: {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        segment: project.segment,
        targetAudience: project.targetAudience,
        keywords: project.keywords || [],
        website: project.websiteUrl,
        websiteUrl: project.websiteUrl
      },
      theme: 'Imagem editorial original para o artigo "' + String(parsed.title || topic) + '". Contexto: ' + project.name + '. Palavra-chave principal: ' + primaryKeyword + '. Sem logotipos de terceiros e sem texto longo na arte.',
      style: 'Fotografia editorial premium, realista, limpa, relevante ao tema e apropriada para Google Discover e redes sociais',
      aspectRatio: '16:9',
      resolution: '1K'
    });
    if (generatedCover?.imageUrl) {
      coverImage = generatedCover.imageUrl;
      coverImageStoragePath = generatedCover.storagePath;
      coverImageGenerated = true;
    }
  } catch (coverError) {
    console.warn('[BlogEngine] Capa IA indisponível para ' + project.id + '; usando banner oficial como fallback seguro.', coverError);
  }

  const relatedInternalLinks: Array<{ label: string; url: string }> = [
    { label: 'Conheça ' + project.name + ' na Vitrine Portal Vip Brasil', url: '/vitrine/' + project.slug },
    { label: 'Acesse o site oficial de ' + project.name, url: project.websiteUrl }
  ];
  try {
    const relatedSnap = await db.collection(COLLECTIONS.blogArticles)
      .where('relatedProjectId', '==', project.id)
      .limit(20)
      .get();
    const related = relatedSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((item: any) => item.status === 'published' && item.slug && item.slug !== finalSlug)
      .sort((a: any, b: any) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
      .slice(0, 3);
    for (const item of related) {
      relatedInternalLinks.push({ label: String(item.title || 'Artigo relacionado'), url: '/blog/' + item.slug });
    }
  } catch {
    // Links essenciais de vitrine/site já existem; artigos relacionados são enriquecimento opcional.
  }

  const newArticle: StoredBlogArticle = {
    id: articleId,
    slug: finalSlug,
    title: parsed.title || topic,
    seoTitle: safeString(parsed.seoTitle || String(parsed.title || topic) + ' | Portal Vip Brasil', 65),
    metaDescription: safeString(parsed.metaDescription || articleExcerpt, 160),
    excerpt: articleExcerpt,
    introduction: parsed.introduction || undefined,
    category: parsed.category || project.category,
    tags: Array.from(new Set<string>((Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : project.keywords).map((item: any) => String(item || '').trim()).filter((item: string) => item.length > 0))).slice(0, 12),
    primaryKeyword: safeString(parsed.primaryKeyword || primaryKeyword, 160),
    secondaryKeywords: Array.from(new Set<string>((Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : chosenTopicItem.secondaryKeywords || []).map((item: any) => String(item || '').trim()).filter((item: string) => item.length > 0))).slice(0, 12),
    searchIntent,
    author: {
      name: settings.defaultAuthorName,
      avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
      role: settings.defaultAuthorRole
    },
    publishedAt: todayIso,
    updatedAt: todayIso,
    readTime: parsed.readTime || '5 min de leitura',
    featured: false,
    coverImage,
    coverAlt: safeString(parsed.coverAlt || 'Imagem editorial sobre ' + primaryKeyword + ' no artigo ' + String(parsed.title || topic), 240),
    coverImageStoragePath,
    coverImageGenerated,
    sections: articleSections,
    faqSection: Array.isArray(parsed.faqSection) ? parsed.faqSection : [],
    conclusion: parsed.conclusion || '',
    callToAction: parsed.callToAction || '',
    projectId: project.id,
    relatedProjectId: project.id,
    relatedProjectName: project.name,
    relatedProjectUrl: project.websiteUrl,
    relatedPlayStoreUrl: project.playStoreUrl,
    hasApp: Boolean(project.hasApp),
    internalLinks: relatedInternalLinks,
    socialCampaign,
    status: targetStatus,
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: todayIso,
    generationModel: aiRes.modelUsed
  };

  try {
    await db.collection(COLLECTIONS.blogArticles).doc(articleId).set(newArticle);
  } catch (err) {
    console.error('[BlogEngine] Erro ao gravar artigo no Firestore:', err);
    throw new Error('Falha ao persistir o artigo diário no Firestore.');
  }

  // Notifica IndexNow se estiver publicado (Bing e mecanismos participantes).
  if (targetStatus === 'published' && settings.indexNowEnabled) {
    await notifyIndexNow([articlePublicUrl]);
  }

  // Repurpose social do artigo: cria uma única fila idempotente para conexões compatíveis com imagem/texto.
  if (targetStatus === 'published' && settings.autoSocialRepurpose && options?.userId) {
    try {
      const connectionsSnap = await db.collection(COLLECTIONS.socialConnections)
        .where('userId', '==', options.userId)
        .where('companyId', '==', project.id)
        .get();
      // TikTok não entra no repurpose fotográfico automático: PHOTO/PULL_FROM_URL exige domínio/URL verificado pelo TikTok.
      // O Autopilot R8 atende TikTok com vídeo FILE_UPLOAD, que não depende desse requisito externo.
      const allowed = new Set(['facebook', 'instagram', 'linkedin', 'x', 'pinterest']);
      const platforms = [...new Set(connectionsSnap.docs
        .map((doc) => doc.data() as any)
        .filter((connection) => String(connection.status || 'connected') === 'connected')
        .map((connection) => String(connection.provider || '').toLowerCase())
        .filter((provider) => allowed.has(provider)))];

      if (platforms.length > 0) {
        const socialContentId = 'blog-social-' + stableId(articleId).slice(0, 48);
        const socialScheduleId = 'blog-sched-' + stableId(articleId + ':social').slice(0, 48);
        await db.collection(COLLECTIONS.contentItems).doc(socialContentId).set({
          id: socialContentId,
          userId: options.userId,
          companyId: project.id,
          type: 'post',
          title: '[Artigo] ' + newArticle.title,
          headline: newArticle.title,
          body: newArticle.excerpt,
          cta: articlePublicUrl,
          hashtags: socialCampaign.instagram.hashtags || [],
          keywords: [newArticle.primaryKeyword, ...(newArticle.secondaryKeywords || [])].filter(Boolean),
          imageUrl: newArticle.coverImage,
          targetPlatform: platforms[0],
          creditsUsed: 0,
          status: 'scheduled',
          metadata: {
            source: 'daily_blog_seo',
            blogArticleId: articleId,
            articleUrl: articlePublicUrl,
            coverImageGenerated
          },
          createdAt: nowIso(),
          updatedAt: nowIso()
        }, { merge: true });
        await db.collection(COLLECTIONS.scheduledPosts).doc(socialScheduleId).set({
          id: socialScheduleId,
          userId: options.userId,
          companyId: project.id,
          contentItemId: socialContentId,
          platforms,
          scheduledFor: nowIso(),
          status: 'scheduled',
          autopilotGenerated: true,
          blogRepurpose: true,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }, { merge: true });
      }
    } catch (socialError) {
      // Falha social não desfaz artigo já persistido/indexável.
      console.warn('[BlogEngine] Artigo publicado; repurpose social ignorado neste ciclo por falha não bloqueante.', socialError);
    }
  }

  return { success: true, article: newArticle };
}

/**
 * Ciclo Diário Completo do Blog:
 * Produz 1 artigo original inédito para CADA projeto ativo da vitrine!
 */
export async function runDailyBlogCycle(userId?: string): Promise<{
  success: boolean;
  articlesGenerated: StoredBlogArticle[];
  totalProjects: number;
  publishedCount: number;
  pendingCount: number;
  skippedCount: number;
  failedCount: number;
}> {
  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }

  const projectsToProcess = allProjects.filter((p) => p.active !== false && p.dailyBlogEnabled !== false);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const partMap: Record<string, string> = {};
  for (const part of parts) partMap[part.type] = part.value;
  const cycleDate = partMap.year + '-' + partMap.month + '-' + partMap.day;

  const automationUserId = await resolveBlogAutomationUserId(userId);
  console.log('[BlogEngine] Iniciando ciclo diário SEO idempotente para ' + projectsToProcess.length + ' projetos.');
  const articlesGenerated: StoredBlogArticle[] = [];
  let publishedCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = cursor++;
      if (currentIndex >= projectsToProcess.length) return;
      const project = projectsToProcess[currentIndex];
      const claimRef = await acquireDailyBlogClaim(project.id, cycleDate);
      if (!claimRef) {
        skippedCount += 1;
        continue;
      }

      const deterministicArticleId = 'daily-blog-' + stableId(cycleDate + ':' + project.id).slice(0, 48);
      try {
        const res = await generateArticleForProject(project, { userId: automationUserId, articleId: deterministicArticleId });
        if (!res.success || !res.article) throw new Error('Geração do artigo não retornou persistência confirmada.');

        articlesGenerated.push(res.article);
        if (res.article.status === 'published') publishedCount += 1;
        else pendingCount += 1;

        await claimRef.set({
          status: 'completed', lockedUntil: 0, articleId: deterministicArticleId,
          completedAt: nowIso(), updatedAt: nowIso()
        }, { merge: true });
      } catch (err: any) {
        failedCount += 1;
        const message = err?.message ? String(err.message).slice(0, 500) : String(err).slice(0, 500);
        await claimRef.set({
          status: 'failed', lockedUntil: 0, lastError: message, failedAt: nowIso(), updatedAt: nowIso()
        }, { merge: true }).catch(() => undefined);
        console.error('[BlogEngine] Falha no projeto ' + project.name + ':', message);
      }
    }
  };

  const concurrency = Math.min(3, projectsToProcess.length);
  if (concurrency > 0) {
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  articlesGenerated.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  return {
    success: failedCount === 0,
    articlesGenerated,
    totalProjects: projectsToProcess.length,
    publishedCount,
    pendingCount,
    skippedCount,
    failedCount
  };
}
