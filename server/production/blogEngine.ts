import { config } from '../config/index.js';
import { COLLECTIONS, firestore, newId, nowIso, stableId } from './store.js';
import { PORTAL_VIP_PROJECTS, PORTAL_VIP_OFFICIAL_ASSETS, getProjectBySlug, PortalProjectItem, listAllPortalProjectsFromDb, seedPortalProjectsIfEmpty } from './almaPortfolio.js';
import { executeAiWith2SecAntiFall } from './antiFallEngine.js';
import { generateMarketingImage } from './ai.js';
import { getAdminAuth } from '../providers/firebaseAdmin.js';
import { isGlobalAutomationEnabled, isProjectAutomationEnabled } from './automationGate.js';
import { verifyArticleQualityGate, NICHE_PROHIBITED_TERMS } from './articleAuditor.js';
import { generateArticleCoverPhoto, COVER_PHOTO_VERSION } from './coverPhotoEngine.js';

function safeString(value: any, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

/**
 * Resgata rascunhos e publicações pendentes presos no Firestore:
 * Aplica refinamentos estruturais (capas, nicho, extensão, SEO),
 * valida rigorosamente contra o Quality Gate e promove para 'published'
 * sem qualquer dependência de fila de aprovação humana.
 */
export async function rescueStuckDraftArticles(): Promise<{
  rescuedCount: number;
  rescuedArticles: StoredBlogArticle[];
  failedCount: number;
  details: string[];
}> {
  const db = firestore();
  const details: string[] = [];
  const rescuedArticles: StoredBlogArticle[] = [];
  let rescuedCount = 0;
  let failedCount = 0;

  try {
    const draftsSnap = await db.collection(COLLECTIONS.blogArticles)
      .where('status', 'in', ['draft', 'pending_approval'])
      .limit(100)
      .get();

    for (const doc of draftsSnap.docs) {
      try {
      const data = doc.data() as StoredBlogArticle;
      const article: StoredBlogArticle = { ...data, id: doc.id };

      // 1. Capa temática curada se inválida ou logo
      if (isInvalidOrLogoImage(article.coverImage)) {
        const thematic = resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category);
        article.coverImage = thematic.url;
        article.coverAlt = article.coverAlt || thematic.alt;
      }

      // 2. Sanitização de termos proibidos (nicho)
      const prohibitedTerms = NICHE_PROHIBITED_TERMS[article.relatedProjectId] || [];
      const projName = article.relatedProjectName || 'Portal Vip Brasil';
      for (const term of prohibitedTerms) {
        const reg = new RegExp(`\\b${term}\\b`, 'gi');
        // Campos podem estar ausentes em rascunhos antigos: nunca chamar .replace em undefined
        article.title = String(article.title || '').replace(reg, projName);
        if (typeof article.excerpt === 'string') article.excerpt = article.excerpt.replace(reg, projName);
        if (typeof article.introduction === 'string') article.introduction = article.introduction.replace(reg, projName);
        if (typeof article.conclusion === 'string') article.conclusion = article.conclusion.replace(reg, projName);
        article.sections = (Array.isArray(article.sections) ? article.sections : []).map((s) => ({
          ...s,
          h2: String(s?.h2 || '').replace(reg, projName),
          content: String(s?.content || '').replace(reg, projName),
          ...(Array.isArray(s?.h3s) ? { h3s: s.h3s.map((h) => ({ ...h, h3: String(h?.h3 || '').replace(reg, projName), content: String(h?.content || '').replace(reg, projName) })) } : {})
        }));
      }

      // 3. NÃO inventamos texto de enchimento. Parágrafos genéricos repetidos em centenas de
      //    artigos são conteúdo raso/duplicado para o Google (Helpful Content) e derrubam o ranking.
      //    Rascunhos curtos ficam como rascunho até serem reescritos com conteúdo real.

      // 4. Meta description derivada do próprio texto do artigo (única por artigo)
      if (!article.metaDescription || article.metaDescription.length < 60 || article.metaDescription.length > 250) {
        const source = [article.excerpt, article.introduction, ...(article.sections || []).map((s) => s.content)]
          .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (source.length >= 60) article.metaDescription = safeString(source, 157).replace(/\s+\S*$/, '') + '…';
      }

      // 5. Avaliação do Quality Gate
      const audit = await verifyArticleQualityGate(article, { projectId: article.relatedProjectId });
      if (audit.approved) {
        article.status = 'published';
        article.publishedAt = article.publishedAt || nowIso();
        article.updatedAt = nowIso();

        await db.collection(COLLECTIONS.blogArticles).doc(doc.id).set(article, { merge: true });
        rescuedCount++;
        rescuedArticles.push(article);
        details.push(`Artigo "${article.title}" (${doc.id}) resgatado e promovido para published.`);
      } else {
        failedCount++;
        details.push(`Artigo "${article.title}" (${doc.id}) bloqueado no Quality Gate: ${audit.rejectionReasons.join('; ')}`);
      }
      } catch (itemErr: any) {
        // Um rascunho malformado não pode interromper o resgate dos demais
        failedCount++;
        details.push(`Artigo ${doc.id} ignorado por erro: ${itemErr?.message || String(itemErr)}`);
      }
    }
  } catch (err: any) {
    console.warn('[BlogEngine] Erro ao executar rescueStuckDraftArticles:', err);
    details.push(`Erro: ${err?.message || String(err)}`);
  }

  return { rescuedCount, rescuedArticles, failedCount, details };
}

export async function acquireDailyBlogClaim(projectId: string, date: string): Promise<any | null> {
  const db = firestore();
  const id = stableId(`portal-daily-blog:${projectId}:${date}`);
  const ref = db.collection(COLLECTIONS.idempotency).doc(id);
  const now = Date.now();
  const acquired = await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    if (current?.status === 'completed') {
      const articleId = current?.articleId || 'daily-blog-' + stableId(date + ':' + projectId).slice(0, 48);
      const artSnap = await tx.get(db.collection(COLLECTIONS.blogArticles).doc(articleId));
      if (artSnap.exists && (artSnap.data() as any)?.status === 'published') {
        return false;
      }
    }
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
  keyTakeaways?: string[];
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
  coverPhotoVersion?: number;
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
  autoPromoteDrafts?: boolean;
  updatedAt: string;
}

// Configurações padrão do blog — Publicação 100% Automática diária orientada pelo Botão Mestre
export const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  mode: 'automatic',
  frequency: 'daily',
  defaultAuthorName: 'Equipe Editorial Portal Vip Brasil',
  defaultAuthorRole: 'Especialista em Conteúdo & Tecnologia',
  autoSocialRepurpose: true,
  indexNowEnabled: true,
  autoPromoteDrafts: true,
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
  proj_froc_ia: [
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
  proj_oraculos: [
    {
      topic: 'Oráculos Online: Como Interpretar o Tarot de Marselha e o Baralho Cigano com Precisão',
      primaryKeyword: 'tarot online gratis',
      secondaryKeywords: ['oráculos', 'baralho cigano interpretação', 'runas nórdicas online', 'tiragem de cartas'],
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

// Catálogo curado de fotografias temáticas em altíssima definição por nicho e micronicho para tráfego orgânico
export const THEMATIC_NICHE_IMAGES: Record<string, Array<{ url: string; alt: string }>> = {
  runes_viking: [
    {
      url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=1200&q=80',
      alt: 'Runas nórdicas gravadas em pedras místicas sobre madeira ancestral para tiragens'
    },
    {
      url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
      alt: 'Fogo ancestral e símbolos nórdicos esculpidos em pedra rúnica'
    },
    {
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      alt: 'Paisagem nórdica majestosa com névoa serena e pedras ancestrais'
    },
    {
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Montanhas imponentes e céus nórdicos invocando a coragem e sabedoria viking'
    },
    {
      url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Floresta ancestral mística envolta em neblina para rituais rúnicos'
    },
    {
      url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
      alt: 'Caminho ancestral entre carvalhos sagrados e energia da mitologia nórdica'
    },
    {
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      alt: 'Grimório antigo e manuscrito de símbolos rúnicos e ensinamentos arcanos'
    }
  ],
  tarot_oraculos: [
    {
      url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cartas clássicas de tarot e baralho cigano distribuídas com riqueza de detalhes'
    },
    {
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mesa de cartomancia com cartas clássicas de tarot e velas de firmeza'
    },
    {
      url: 'https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cartas de baralho oracular iluminadas com estética mística e revelações'
    },
    {
      url: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mandala astrológica com cartas arcanas e alinhamento oracular'
    },
    {
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cristais de ametista e quartzo ao lado de cartas oraculares iluminadas'
    },
    {
      url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Velas cintilantes e atmosfera de vidência e revelação espiritual'
    },
    {
      url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      alt: 'Meditação profunda e intuição conectada às leituras oraculares'
    },
    {
      url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estudo aprofundado dos mistérios e arcanos maiores da cartomancia'
    }
  ],
  love_maria_padilha: [
    {
      url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
      alt: 'Rosas vermelhas rubras intensas simbolizando paixão irresistível e poder afetivo'
    },
    {
      url: 'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pétalas escarlates aveludadas para atração amorosa, magnetismo e Maria Padilha'
    },
    {
      url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=80',
      alt: 'Buquê de rosas aveludadas para rituais de atração, magnetismo e amor próprio'
    },
    {
      url: 'https://images.unsplash.com/photo-1548094878-84ced0f68b08?auto=format&fit=crop&w=1200&q=80',
      alt: 'Velas vermelhas sagradas ardendo em firmeza de intenção e sedução'
    },
    {
      url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
      alt: 'Conexão amorosa e sentimento verdadeiro sob iluminação romântica'
    },
    {
      url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pétalas de rosas escarlates e atmosfera encantadora de conquista'
    },
    {
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      alt: 'Luzes douradas e ambiente misterioso da Rainha das Encruzilhadas'
    },
    {
      url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
      alt: 'Símbolo do coração dourado e atração de alma gêmea'
    }
  ],
  exu_guardioes: [
    {
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Fogueira sagrada na noite e firmeza de guardiões para destravamento de caminhos'
    },
    {
      url: 'https://images.unsplash.com/photo-1498855926480-d98e83099315?auto=format&fit=crop&w=1200&q=80',
      alt: 'Chama ancestral radiante e quebra de demandas espirituais com proteção de Exu'
    },
    {
      url: 'https://images.unsplash.com/photo-1475724017904-b712052c192a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Chamas ardentes e labaredas de purificação e força ancestral'
    },
    {
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
      alt: 'Energia crepuscular e força espiritual protetora na encruzilhada'
    },
    {
      url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Encruzilhada iluminada com caminhos amplos e abertos para novas oportunidades'
    },
    {
      url: 'https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?auto=format&fit=crop&w=1200&q=80',
      alt: 'Fogueira ceremonial na natureza emanando poder e proteção de Exu'
    },
    {
      url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Altar tradicional de guardiões com elementos sagrados de proteção'
    },
    {
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estrada dourada no horizonte que simboliza vitória sobre obstáculos'
    }
  ],
  catolico_devocao: [
    {
      url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      alt: 'Bíblia Sagrada e terço com velas acesas no momento de oração'
    },
    {
      url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
      alt: 'Vela sagrada no altar da igreja e recolhimento litúrgico'
    },
    {
      url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
      alt: 'Interior majestoso de templo católico com iluminação suave de devoção'
    },
    {
      url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cúpula e vitrais sacros inspirando serenidade, oração e bênçãos'
    },
    {
      url: 'https://images.unsplash.com/photo-1515549832467-8783363e19b6?auto=format&fit=crop&w=1200&q=80',
      alt: 'Atmosfera de santuário católico, paz interior e novenas milagrosas'
    },
    {
      url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mãos em oração com fé inabalável e bênção divina'
    },
    {
      url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Raios celestiais descendo como graça e conforto espiritual'
    }
  ],
  prosperidade_crencas: [
    {
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      alt: 'Céu estrelado e montanhas iluminadas pelo poder das crenças positivas'
    },
    {
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      alt: 'Conquista, elegância e realização dos objetivos de prosperidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Crescimento financeiro, riqueza e manifestação da prosperidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Nascer do sol dourado no mar refletindo gratidão e abundância financeira'
    },
    {
      url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Luz solar incidindo sobre sementes de prosperidade e conquista material'
    },
    {
      url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
      alt: 'Raios dourados entre árvores trazendo renovação de energias e fé'
    },
    {
      url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=1200&q=80',
      alt: 'Brilho dourado cintilante e atração de boa sorte e harmonia'
    },
    {
      url: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pôr do sol inspirador com serenidade e afirmações positivas'
    }
  ],
  ia_inteligencia_artificial: [
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      alt: 'Ondas sinápticas de inteligência artificial generativa em tons vibrantes'
    },
    {
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cérebro digital com conexões neurais avançadas de IA e inovação'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planeta digital e conexões globais de dados em alta velocidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Matriz de código e algoritmos inteligentes de automação'
    },
    {
      url: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Robótica avançada e integração com modelos generativos autônomos'
    },
    {
      url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80',
      alt: 'Laptop de alta tecnologia e arquitetura de sistemas autônomos'
    },
    {
      url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Tecnologia de inteligência artificial com visual limpo e moderno'
    },
    {
      url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
      alt: 'Linhas de código de alto desempenho impulsionando automações digitais'
    },
    {
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      alt: 'Processador neural de última geração com luzes azuis e douradas'
    },
    {
      url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Interações digitais e fluxo contínuo de inovação com IA'
    }
  ],
  trafego_organico_growth: [
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Dashboard de tráfego orgânico com curvas de crescimento exponencial e métricas de SEO'
    },
    {
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
      alt: 'Trabalho estratégico de crescimento de audiência e atração de tráfego orgânico'
    },
    {
      url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estratégia de crescimento acelerado e posicionamento no topo das pesquisas'
    },
    {
      url: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=1200&q=80',
      alt: 'Escalada para a posição número 1 no Google e Play Store'
    },
    {
      url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planejamento digital com foco em métricas de conversão e visitas recorrentes'
    },
    {
      url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Gráficos de conversão e explosão de visualizações orgânicas'
    },
    {
      url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
      alt: 'Aplicativo mobile moderno no smartphone com milhares de downloads'
    },
    {
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      alt: 'Métricas de engajamento, SEO técnico e audiência orgânica qualificada'
    },
    {
      url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planejamento tático de conversão e marketing de autoridade'
    },
    {
      url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
      alt: 'Resultados financeiros gerados por tráfego orgânico consistente'
    }
  ]
};

// Aliases para manter compatibilidade com chaves de projetos legados
THEMATIC_NICHE_IMAGES.proj_magia_crencas = THEMATIC_NICHE_IMAGES.prosperidade_crencas;
THEMATIC_NICHE_IMAGES.proj_exu_responde = THEMATIC_NICHE_IMAGES.exu_guardioes;
THEMATIC_NICHE_IMAGES.proj_maria_padilha = THEMATIC_NICHE_IMAGES.love_maria_padilha;
THEMATIC_NICHE_IMAGES.proj_manual_catolico = THEMATIC_NICHE_IMAGES.catolico_devocao;
THEMATIC_NICHE_IMAGES.proj_frocia2 = THEMATIC_NICHE_IMAGES.ia_inteligencia_artificial;
THEMATIC_NICHE_IMAGES.proj_oraculos_ts = THEMATIC_NICHE_IMAGES.tarot_oraculos;
THEMATIC_NICHE_IMAGES.proj_froc_marketing_engine = THEMATIC_NICHE_IMAGES.trafego_organico_growth;

export const PROJECT_NICHE_HASHTAGS: Record<string, string[]> = {
  proj_magia_crencas: ['#MagiaDasCrencas', '#OracoesPoderosas', '#Prosperidade', '#FeInabalavel', '#DecretosPositivos', '#LeiDaAtracao', '#Espiritualidade', '#PortalVipBrasil'],
  proj_exu_responde: ['#ExuResponde', '#OraculoDosCaminhos', '#SabedoriaAncestral', '#Guardioes', '#FirmezaEspiritual', '#AberturaDeCaminhos', '#PortalVipBrasil'],
  proj_maria_padilha: ['#MariaPadilha', '#RainhaDas7Encruzilhadas', '#AmorProprio', '#AutoestimaFeminina', '#MagnetismoPessoal', '#SimpatiaAmorosa', '#PoderFeminino', '#PortalVipBrasil'],
  proj_manual_catolico: ['#ManualCatolico', '#SantoDoDia', '#SantoTerco', '#Novenas', '#FeCrista', '#LiturgiaDiaria', '#IgrejaCatolica', '#PortalVipBrasil'],
  proj_frocia2: ['#FrocIA', '#InteligenciaArtificial', '#MarketingDigital', '#AutomacaoDeConteudo', '#SEOAvancado', '#CriacaoDeConteudo', '#Inovacao', '#PortalVipBrasil'],
  proj_oraculos_ts: ['#OraculosTS', '#TarotOnline', '#BaralhoCigano', '#RunasNordicas', '#Autoconhecimento', '#TiragemDeCartas', '#Espiritualidade', '#PortalVipBrasil'],
  proj_froc_marketing_engine: ['#FrocIAMarketingEngine', '#TrafegoOrganico', '#MarketingPlayStore', '#ASO2026', '#Rank1Google', '#CrescimentoDigital', '#MarketingDeConteudo', '#PortalVipBrasil']
};

/**
 * Normaliza uma string removendo acentos e pontuação para busca léxica precisa
 */
function normalizeTextForNiche(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Seleciona a melhor chave de fotos temáticas a partir do título, tags, categoria ou projeto
 */
export function detectServerArticleNiche(meta: {
  title?: string;
  topic?: string;
  slug?: string;
  category?: string;
  projectId?: string;
}): string {
  const titleAndSlug = normalizeTextForNiche(`${meta.title || ''} ${meta.topic || ''} ${meta.slug || ''}`);
  const fullCorpus = normalizeTextForNiche(`${meta.title || ''} ${meta.topic || ''} ${meta.slug || ''} ${meta.category || ''}`);
  const proj = meta.projectId || '';

  // O projeto do artigo manda (IDs reais do portfólio). O detector antigo usava IDs inexistentes
  // (proj_froc_ia, proj_marketing_seo) e deixava palavras soltas do título decidirem o nicho.
  const projectNiche: Record<string, string> = {
    proj_maria_padilha: 'love_maria_padilha',
    proj_exu_responde: 'exu_guardioes',
    proj_manual_catolico: 'catolico_devocao',
    proj_magia_crencas: 'prosperidade_crencas',
    proj_oraculos_ts: 'tarot_oraculos',
    proj_frocia2: 'ia_inteligencia_artificial',
    proj_froc_marketing_engine: 'trafego_organico_growth',
    proj_portal_vip_magazine: 'trafego_organico_growth'
  };
  if (projectNiche[proj]) {
    if (projectNiche[proj] === 'tarot_oraculos' && /runa|viking|nordic|futhark/.test(titleAndSlug)) return 'runes_viking';
    return projectNiche[proj];
  }

  // === FASE 1: Detecção de Alta Precisão pelo TÍTULO e SLUG do artigo ===
  if (
    titleAndSlug.includes('tarot') ||
    titleAndSlug.includes('cigano') ||
    titleAndSlug.includes('baralho') ||
    titleAndSlug.includes('marselha') ||
    titleAndSlug.includes('arcanos') ||
    titleAndSlug.includes('tiragem')
  ) {
    return 'tarot_oraculos';
  }

  if (
    titleAndSlug.includes('runa') ||
    titleAndSlug.includes('viking') ||
    titleAndSlug.includes('futhark') ||
    titleAndSlug.includes('odin') ||
    titleAndSlug.includes('nordic')
  ) {
    return 'runes_viking';
  }

  if (
    titleAndSlug.includes('padilha') ||
    titleAndSlug.includes('simpatia amor') ||
    titleAndSlug.includes('amorosa') ||
    titleAndSlug.includes('seducao') ||
    titleAndSlug.includes('paixao') ||
    titleAndSlug.includes('amarra') ||
    titleAndSlug.includes('relacionamento') ||
    titleAndSlug.includes('afetiv')
  ) {
    return 'love_maria_padilha';
  }

  if (
    titleAndSlug.includes('exu') ||
    titleAndSlug.includes('quimbanda') ||
    titleAndSlug.includes('umbanda') ||
    titleAndSlug.includes('guardiao') ||
    titleAndSlug.includes('guardioes') ||
    titleAndSlug.includes('encruzilhada') ||
    titleAndSlug.includes('tranca rua') ||
    titleAndSlug.includes('abertura de caminho') ||
    titleAndSlug.includes('abrir caminho')
  ) {
    return 'exu_guardioes';
  }

  if (
    titleAndSlug.includes('catolico') ||
    titleAndSlug.includes('novena') ||
    titleAndSlug.includes('terco') ||
    titleAndSlug.includes('salmo') ||
    titleAndSlug.includes('biblia') ||
    titleAndSlug.includes('oracao') ||
    titleAndSlug.includes('santo') ||
    titleAndSlug.includes('santa') ||
    titleAndSlug.includes('devocionario') ||
    titleAndSlug.includes('missa')
  ) {
    return 'catolico_devocao';
  }

  if (
    titleAndSlug.includes('prosperidade') ||
    titleAndSlug.includes('gratidao') ||
    titleAndSlug.includes('abundancia') ||
    titleAndSlug.includes('riqueza') ||
    titleAndSlug.includes('crenca') ||
    titleAndSlug.includes('crencas') ||
    titleAndSlug.includes('manifestacao') ||
    titleAndSlug.includes('atrair dinheiro') ||
    titleAndSlug.includes('leis da atracao')
  ) {
    return 'prosperidade_crencas';
  }

  if (
    titleAndSlug.includes('froc ia') ||
    titleAndSlug.includes('inteligencia artificial') ||
    titleAndSlug.includes('ia generativa') ||
    titleAndSlug.includes('chatgpt') ||
    titleAndSlug.includes('automacao de conteudo') ||
    titleAndSlug.includes('geradores de texto') ||
    titleAndSlug.includes('deep research')
  ) {
    return 'ia_inteligencia_artificial';
  }

  if (
    titleAndSlug.includes('trafego organico') ||
    titleAndSlug.includes('seo') ||
    titleAndSlug.includes('google play') ||
    titleAndSlug.includes('play store') ||
    titleAndSlug.includes('downloads') ||
    titleAndSlug.includes('ranking') ||
    titleAndSlug.includes('indexar') ||
    titleAndSlug.includes('growth') ||
    titleAndSlug.includes('marketing')
  ) {
    return 'trafego_organico_growth';
  }

  // === FASE 2: Detecção pelo Corpus Inteiro (Categorias, Tags) ===
  if (fullCorpus.includes('runa') || fullCorpus.includes('viking') || fullCorpus.includes('nordic')) return 'runes_viking';
  if (fullCorpus.includes('tarot') || fullCorpus.includes('cartomanc') || fullCorpus.includes('cigano')) return 'tarot_oraculos';
  if (fullCorpus.includes('padilha') || fullCorpus.includes('amorosa') || fullCorpus.includes('seducao')) return 'love_maria_padilha';
  if (fullCorpus.includes('exu') || fullCorpus.includes('umbanda') || fullCorpus.includes('quimbanda')) return 'exu_guardioes';
  if (fullCorpus.includes('catolico') || fullCorpus.includes('novena') || fullCorpus.includes('terco')) return 'catolico_devocao';
  if (fullCorpus.includes('prosperidade') || fullCorpus.includes('gratidao') || proj === 'proj_magia_crencas') return 'prosperidade_crencas';
  if (fullCorpus.includes('inteligencia artificial') || fullCorpus.includes('froc ia') || proj === 'proj_froc_ia') return 'ia_inteligencia_artificial';
  if (fullCorpus.includes('trafego') || fullCorpus.includes('marketing') || fullCorpus.includes('seo') || proj === 'proj_marketing_seo' || proj === 'proj_froc_marketing') return 'trafego_organico_growth';

  // === FASE 3: Fallback por Projeto ===
  if (proj && THEMATIC_NICHE_IMAGES[proj]) {
    return proj;
  }
  return 'prosperidade_crencas';
}

function computeServerHash(seedString: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedString.length; i++) {
    h ^= seedString.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

export function resolveThematicCoverForProject(
  projectId: string,
  topic?: string,
  slug?: string,
  id?: string,
  category?: string
): { url: string; alt: string } {
  const nicheKey = detectServerArticleNiche({ title: topic, topic, slug, category, projectId });
  const list = THEMATIC_NICHE_IMAGES[nicheKey] || THEMATIC_NICHE_IMAGES.prosperidade_crencas;
  const seed = `${id || ''}::${slug || ''}::${topic || ''}`;
  const hash = computeServerHash(seed);
  return list[hash % list.length];
}

export function isInvalidOrLogoImage(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'about:blank' || trimmed.length < 10) return true;
  if (
    trimmed.includes('logo.png') ||
    trimmed.includes('/logo') ||
    trimmed.includes('icon-512') ||
    trimmed.includes('icon-192') ||
    trimmed.includes('/icons/') ||
    trimmed.includes('apple-touch-icon') ||
    trimmed.includes('favicon') ||
    trimmed.includes('cropped-507d5ca1') ||
    trimmed.includes('chatgpt-image-19-de-mai') ||
    trimmed.includes('wp-content/uploads') ||
    trimmed.includes('placeholder')
  ) {
    return true;
  }
  if (trimmed.startsWith('data:image/png;base64,ivborw0kggoaaaansuheugaaaaeeaaab')) return true;
  return false;
}

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
    coverImage: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Luz dourada matinal simbolizando a força das crenças e fé inabalável',
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
    coverImage: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=1200&q=80',
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
  },
  {
    id: 'art-maria-padilha-amor-magnetico',
    slug: 'maria-padilha-rainha-das-7-encruzilhadas-autoestima-e-amor',
    title: 'Maria Padilha Rainha das 7 Encruzilhadas: Autoestima Magnética e Poder no Amor',
    seoTitle: 'Maria Padilha Rainha das 7 Encruzilhadas: Autoestima e Amor | Portal Vip Brasil',
    metaDescription: 'Aprenda a oração da atração e como elevar sua frequência pessoal para se tornar irresistível, segura de si e conquistar a harmonia no amor.',
    excerpt: 'Aprenda a oração da atração e como elevar sua frequência pessoal para se tornar irresistível, segura de si e conquistar a harmonia no relacionamento.',
    category: 'Amor & Relacionamentos',
    tags: ['Maria Padilha', 'Amor', 'Autoestima', 'Pombagira', 'Sedução', 'Magnetismo Pessoal', 'PortalVipBrasil'],
    primaryKeyword: 'maria padilha rainha das 7 encruzilhadas',
    secondaryKeywords: ['oração maria padilha', 'oráculo do amor', 'autoestima feminina', 'simpatia amorosa'],
    searchIntent: 'guide',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-28T09:00:00.000Z',
    updatedAt: '2026-08-28T09:00:00.000Z',
    readTime: '4 min de leitura',
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Rosas vermelhas aveludadas expressando o magnetismo, autoestima e poder amoroso de Maria Padilha',
    relatedProjectId: 'proj_maria_padilha',
    relatedProjectName: 'Maria Padilha Rainha das 7 Encruzilhadas',
    relatedProjectUrl: 'https://maria-padilha-rainha-das-7-encruzil.vercel.app/',
    relatedPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha',
    hasApp: true,
    sections: [
      {
        h2: 'O Segredo do Magnetismo Feminino e Pessoal',
        content: 'Ninguém consegue amar verdadeiramente quem não se valoriza em primeiro lugar. A energia de **Maria Padilha Rainha das 7 Encruzilhadas** ensina a soberania da alma: quem conhece o próprio valor não aceita migalhas emocionais nem vive na incerteza.',
        h3s: [
          {
            h3: 'Ritual Simples de Empoderamento Diante do Espelho',
            content: 'Olhe nos seus próprios olhos e declare com autoridade: "Eu sou digna de ser amada, respeitada e cortejada. Minha energia atrai o amor mais nobre e verdadeiro."'
          },
          {
            h3: 'Banhos Aromáticos de Atração',
            content: 'A combinação de pétalas de rosas vermelhas com anis-estrelado limpa o campo emocional e desperta o brilho pessoal.'
          }
        ]
      },
      {
        h2: 'Oração de Firmeza e Atração Sentimental',
        content: 'Reze com devoção pedindo proteção divina para o seu coração, blindagem espiritual contra a inveja e abertura definitiva de caminhos para relacionamentos recíprocos, leais e felizes.'
      }
    ],
    faqSection: [
      {
        question: 'Onde encontro o app oficial de Maria Padilha?',
        answer: 'O aplicativo está disponível na Google Play Store com orações, simpatias e conselhos diários.'
      },
      {
        question: 'Qual o melhor dia para realizar as orações de amor?',
        answer: 'Sextas-feiras e noites de lua crescente são tradicionalmente muito favoráveis para firmezas de atração e harmonia amorosa.'
      }
    ],
    conclusion: 'A verdadeira conquista começa quando você passa a se admirar em primeiro lugar. Eleve seu magnetismo hoje.',
    callToAction: 'Consulte o oráculo no site oficial ou instale o aplicativo Maria Padilha na Google Play Store.',
    internalLinks: [
      { label: 'Vitrine Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Oráculos TS e Tarot Online', url: '/blog/oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online' }
    ],
    socialCampaign: {
      instagram: {
        caption: 'Desperte seu magnetismo pessoal e o poder do amor próprio com os ensinamentos da Rainha das 7 Encruzilhadas. Leia no Blog Portal Vip Brasil!',
        hashtags: ['#MariaPadilha', '#RainhaDas7Encruzilhadas', '#AmorProprio', '#AutoestimaFeminina', '#MagnetismoPessoal', '#PortalVipBrasil'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/maria-padilha-rainha-das-7-encruzilhadas-autoestima-e-amor?utm_source=instagram&utm_medium=social&utm_campaign=blog_maria_padilha'
      },
      facebook: {
        postText: 'Aprenda a elevar sua frequência amorosa e atrair relacionamentos prósperos e recíprocos. Acesse o artigo completo no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/maria-padilha-rainha-das-7-encruzilhadas-autoestima-e-amor?utm_source=facebook&utm_medium=social&utm_campaign=blog_maria_padilha'
      },
      linkedin: {
        postText: 'Artigo sobre inteligência emocional, autoestima e desenvolvimento pessoal no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/maria-padilha-rainha-das-7-encruzilhadas-autoestima-e-amor?utm_source=linkedin&utm_medium=social&utm_campaign=blog_maria_padilha'
      },
      x: {
        tweetText: 'Eleve seu magnetismo pessoal e harmonia amorosa com o guia no Blog Portal Vip Brasil:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/maria-padilha-rainha-das-7-encruzilhadas-autoestima-e-amor?utm_source=x&utm_medium=social&utm_campaign=blog_maria_padilha'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-28T09:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  },
  {
    id: 'art-manual-catolico-santo-do-dia',
    slug: 'manual-catolico-o-guia-diario-de-oracoes-e-fortalecimento-na-fe',
    title: 'Manual Católico: O Valor das Novenas, do Santo Terço e da Liturgia Diária',
    seoTitle: 'Manual Católico: Santo Terço, Novenas e Liturgia Diária | Portal Vip Brasil',
    metaDescription: 'Como estruturar uma rotina devocional cristã com a liturgia diária, exame de consciência e a proteção dos santos padroeiros para sua família.',
    excerpt: 'Como estruturar uma rotina devocional cristã com a liturgia do dia, exame de consciência e a proteção dos santos padroeiros para a sua família.',
    category: 'Tradição Católica',
    tags: ['Manual Católico', 'Santo Terço', 'Novenas', 'Liturgia Diária', 'Fé Cristã', 'Igreja Católica', 'PortalVipBrasil'],
    primaryKeyword: 'manual católico',
    secondaryKeywords: ['liturgia diária', 'santo terço', 'novenas milagrosas', 'santo do dia'],
    searchIntent: 'educational',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-27T09:00:00.000Z',
    updatedAt: '2026-08-27T09:00:00.000Z',
    readTime: '5 min de leitura',
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1548625361-16eb4318c4fc?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Catedral histórica com vitrais e raios de sol iluminando a devoção católica',
    relatedProjectId: 'proj_manual_catolico',
    relatedProjectName: 'Manual Católico',
    relatedProjectUrl: 'https://manual-cat-lico.vercel.app/',
    relatedPlayStoreUrl: 'https://play.google.com/store/apps/details?id=br.com.manualcatolico.app',
    hasApp: true,
    sections: [
      {
        h2: 'A Força da Oração Constante',
        content: 'A tradição da Santa Igreja nos ensina que a oração diária é o escudo mais eficaz contra as tribulações modernas. Rezar o Santo Terço em família traz paz inexplicável ao lar e serenidade para os pensamentos.',
        h3s: [
          {
            h3: 'O Santo do Dia e Suas Lições',
            content: 'Conhecer as vidas dos santos nos oferece modelos concretos de perseverança, caridade e fé diante das adversidades.'
          },
          {
            h3: 'O Exame de Consciência Noturno',
            content: 'Uma revisão sincera das ações do dia renova o espírito e prepara o cristão para o sacramento da reconciliação.'
          }
        ]
      },
      {
        h2: 'Novenas Tradicionais de Intercessão',
        content: 'A novena a Nossa Senhora Desatadora dos Nós e a oração a São Bento continuam transformando corações e restaurando a esperança em milhares de lares brasileiros.'
      }
    ],
    faqSection: [
      {
        question: 'O aplicativo Manual Católico funciona offline?',
        answer: 'Sim, o app oficial na Play Store mantém as orações essenciais disponíveis mesmo sem conexão à internet.'
      },
      {
        question: 'Onde posso acompanhar a liturgia diária?',
        answer: 'Tanto no portal web oficial quanto no aplicativo Manual Católico, com as leituras completas da Santa Missa.'
      }
    ],
    conclusion: 'A fé cultivada dia a dia é o maior legado de paz para a sua família. Reze com o coração aberto.',
    callToAction: 'Baixe o aplicativo Manual Católico na Google Play Store e leve um devocionário completo no bolso.',
    internalLinks: [
      { label: 'Vitrine de Aplicativos Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Como Despertar o Poder das Crenças', url: '/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos' }
    ],
    socialCampaign: {
      instagram: {
        caption: 'Fortaleça sua rotina devocional cristã com a liturgia diária, Santo Terço e novenas milagrosas no Manual Católico. Leia no Blog Portal Vip Brasil!',
        hashtags: ['#ManualCatolico', '#SantoDoDia', '#SantoTerco', '#Novenas', '#FeCrista', '#LiturgiaDiaria', '#PortalVipBrasil'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/manual-catolico-o-guia-diario-de-oracoes-e-fortalecimento-na-fe?utm_source=instagram&utm_medium=social&utm_campaign=blog_manual_catolico'
      },
      facebook: {
        postText: 'Como estruturar uma vida de oração com o Santo Terço e a liturgia diária. Leia o guia devocional no Blog Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/manual-catolico-o-guia-diario-de-oracoes-e-fortalecimento-na-fe?utm_source=facebook&utm_medium=social&utm_campaign=blog_manual_catolico'
      },
      linkedin: {
        postText: 'Tradição, fé e perseverança na rotina diária: conheça o devocionário Manual Católico no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/manual-catolico-o-guia-diario-de-oracoes-e-fortalecimento-na-fe?utm_source=linkedin&utm_medium=social&utm_campaign=blog_manual_catolico'
      },
      x: {
        tweetText: 'Acompanhe a liturgia diária e o Santo Terço no aplicativo Manual Católico. Saiba mais no Portal Vip Brasil:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/manual-catolico-o-guia-diario-de-oracoes-e-fortalecimento-na-fe?utm_source=x&utm_medium=social&utm_campaign=blog_manual_catolico'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-27T09:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  },
  {
    id: 'art-ia-marketing-froc-2026',
    slug: 'como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo',
    title: 'Como a IA Generativa e o Froc IA Estão Revolucionando o Marketing Digital',
    seoTitle: 'IA Generativa e Marketing Digital com Froc IA | Portal Vip Brasil',
    metaDescription: 'Estratégias avançadas de automação para produzir artigos de alta autoridade, posts virais e copys persuasivas que dominam o Google e o Bing.',
    excerpt: 'Estratégias avançadas de automação para produzir artigos de alta autoridade, posts virais e copys persuasivas que dominam o Google e o Bing.',
    category: 'Inteligência Artificial',
    tags: ['Froc IA', 'Inteligência Artificial', 'SEO', 'Marketing Digital', 'Automação', 'Criação de Conteúdo', 'PortalVipBrasil'],
    primaryKeyword: 'froc ia',
    secondaryKeywords: ['ia marketing digital', 'gerador de artigos seo', 'automação de conteúdo'],
    searchIntent: 'guide',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-25T09:00:00.000Z',
    updatedAt: '2026-08-25T09:00:00.000Z',
    readTime: '7 min de leitura',
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Ondas abstratas digitais de inteligência artificial generativa e inovação tecnológica',
    relatedProjectId: 'proj_frocia2',
    relatedProjectName: 'Froc IA',
    relatedProjectUrl: 'https://frocia2.vercel.app/',
    hasApp: false,
    sections: [
      {
        h2: 'A Nova Fronteira do Tráfego Orgânico com IA',
        content: 'Em 2026, os mecanismos de pesquisa premiam a profundidade, a clareza e a originalidade técnica do conteúdo. Ferramentas genéricas já não bastam; é fundamental utilizar modelos avançados de IA para estruturar argumentos sólidos e dados confiáveis.',
        h3s: [
          {
            h3: 'Pesquisa Semântica de Cauda Longa',
            content: 'Como mapear termos de busca com alto volume de intenção e baixa concorrência usando o motor do Froc IA.'
          },
          {
            h3: 'Storytelling Persuasivo e Retenção de Audiência',
            content: 'Técnicas de redação que aumentam o tempo de permanência na página, sinalizando relevância máxima para os algoritmos de busca.'
          }
        ]
      },
      {
        h2: 'Automação Multicanal Integrada',
        content: 'A partir de um único artigo mestre, o Froc IA desdobra publicações prontas para Instagram, Facebook, LinkedIn e X, acompanhadas de hashtags nichadas de alto alcance orgânico.'
      }
    ],
    faqSection: [
      {
        question: 'O que diferencia o Froc IA de outros geradores de texto?',
        answer: 'Ele foi treinado especificamente para métricas de conversão de marketing e conformidade estrita com as diretrizes de conteúdo útil dos motores de busca.'
      },
      {
        question: 'Como acessar a plataforma Froc IA?',
        answer: 'A plataforma está acessível online através do endereço oficial frocia2.vercel.app.'
      }
    ],
    conclusion: 'A inteligência artificial não substitui a estratégia humana; ela multiplica por dez a sua capacidade de execução.',
    callToAction: 'Acesse o Froc IA e experimente a nova era da automação de marketing digital.',
    internalLinks: [
      { label: 'Vitrine Oficial Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Estratégia de Divulgação Diária na Play Store', url: '/blog/estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store' }
    ],
    socialCampaign: {
      instagram: {
        caption: 'Multiplique sua produção de marketing em 10x com copys persuasivas e SEO avançado gerados pelo Froc IA. Leia no Blog Portal Vip Brasil!',
        hashtags: ['#FrocIA', '#InteligenciaArtificial', '#MarketingDigital', '#AutomacaoDeConteudo', '#SEOAvancado', '#Inovacao', '#PortalVipBrasil'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo?utm_source=instagram&utm_medium=social&utm_campaign=blog_froc_ia'
      },
      facebook: {
        postText: 'Descubra como a IA generativa está revolucionando a geração de tráfego orgânico e a conversão de vendas. Leia no Blog Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo?utm_source=facebook&utm_medium=social&utm_campaign=blog_froc_ia'
      },
      linkedin: {
        postText: 'Inovação e inteligência artificial aplicada ao marketing digital e SEO em 2026: análise completa no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo?utm_source=linkedin&utm_medium=social&utm_campaign=blog_froc_ia'
      },
      x: {
        tweetText: 'Como o Froc IA automatiza artigos de blog e posts para redes com SEO de ponta. Confira no Portal Vip Brasil:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo?utm_source=x&utm_medium=social&utm_campaign=blog_froc_ia'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-25T09:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  },
  {
    id: 'art-oraculos-ts-tarot-lenormand',
    slug: 'oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online',
    title: 'Oráculos TS: O Guia Completo de Tarot, Baralho Cigano e Runas Nórdicas',
    seoTitle: 'Oráculos TS: Tarot, Baralho Cigano e Runas Online | Portal Vip Brasil',
    metaDescription: 'Conheça o motor oracular desenvolvido em TypeScript com interpretações precisas e arquetípicas para iluminar suas escolhas do dia a dia.',
    excerpt: 'Conheça o motor oracular desenvolvido em TypeScript com interpretações precisas e arquetípicas para iluminar suas escolhas do dia a dia.',
    category: 'Oráculos & Guardiões',
    tags: ['Oráculos TS', 'Tarot Online', 'Baralho Cigano', 'Runas', 'Autoconhecimento', 'PortalVipBrasil'],
    primaryKeyword: 'oráculos ts',
    secondaryKeywords: ['tarot online grátis', 'baralho cigano tiragem', 'runas nórdicas online'],
    searchIntent: 'informational',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-22T09:00:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z',
    readTime: '5 min de leitura',
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Cartas clássicas de tarot e baralho cigano sobre madeira rústica e velas',
    relatedProjectId: 'proj_oraculos_ts',
    relatedProjectName: 'Oráculos',
    relatedProjectUrl: 'https://oraculos-ts.vercel.app/',
    hasApp: false,
    sections: [
      {
        h2: 'A Simbologia Viva dos Oráculos Tradicionais',
        content: 'O Tarot de Marselha, o Baralho Cigano (Petit Lenormand) e as Runas Nórdicas são sistemas arquetípicos milenares que espelham com perfeição as dinâmicas da psique e as probabilidades de destino.',
        h3s: [
          {
            h3: 'Tarot de Marselha para Decisões Profissionais',
            content: 'Como as lâminas dos Arcanos Maiores revelam o momento exato de arriscar ou recuar em novos empreendimentos.'
          },
          {
            h3: 'O Baralho Cigano e os Laços do Coração',
            content: 'Cartas diretas que decodificam sentimentos, intenções sinceras e reconciliações afetivas.'
          }
        ]
      },
      {
        h2: 'Alta Performance com Motor em TypeScript',
        content: 'O sistema **Oráculos TS** foi construído com arquitetura modular, garantindo carregamento instantâneo, tiragens aleatórias criptograficamente seguras e interpretações ricas sem anúncios intrusivos.'
      }
    ],
    faqSection: [
      {
        question: 'As consultas no Oráculos TS são gratuitas?',
        answer: 'Sim, a plataforma permite tiragens diárias gratuitas de cartas e runas.'
      },
      {
        question: 'Qual é a diferença entre o Tarot e o Baralho Cigano?',
        answer: 'O Tarot trabalha arquétipos profundos e jornadas de evolução pessoal, enquanto o Baralho Cigano é focado em questões práticas, cotidianas e relacionamentos.'
      }
    ],
    conclusion: 'Consultar os oráculos é um ato de autoconhecimento e conexão com a sabedoria universal.',
    callToAction: 'Acesse o Oráculos TS e faça sua tiragem agora mesmo.',
    internalLinks: [
      { label: 'Vitrine Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Exu Responde e Guardiões', url: '/blog/exu-responde-como-consultar-os-guardioes-com-respeito-e-clareza' }
    ],
    socialCampaign: {
      instagram: {
        caption: 'Tire sua carta do dia no Oráculos TS e receba conselhos precisos do Tarot, Baralho Cigano e Runas Nórdicas. Leia no Blog Portal Vip Brasil!',
        hashtags: ['#OraculosTS', '#TarotOnline', '#BaralhoCigano', '#RunasNordicas', '#Autoconhecimento', '#PortalVipBrasil'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online?utm_source=instagram&utm_medium=social&utm_campaign=blog_oraculos_ts'
      },
      facebook: {
        postText: 'Descubra a mensagem dos arcanos para o seu dia com o motor oracular Oráculos TS. Acesse o artigo completo no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online?utm_source=facebook&utm_medium=social&utm_campaign=blog_oraculos_ts'
      },
      linkedin: {
        postText: 'Tecnologia moderna e arquétipos clássicos: conheça o projeto Oráculos TS no ecossistema Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online?utm_source=linkedin&utm_medium=social&utm_campaign=blog_oraculos_ts'
      },
      x: {
        tweetText: 'Consulte o Tarot online e o Baralho Cigano gratuitamente no Oráculos TS:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/oraculos-ts-guia-completo-de-tarot-baralho-cigano-e-runas-online?utm_source=x&utm_medium=social&utm_campaign=blog_oraculos_ts'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-22T09:00:00.000Z',
    generationModel: 'gemini-3.7-flash'
  },
  {
    id: 'art-divulgacao-diaria-apps-playstore',
    slug: 'estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store',
    title: 'Estratégia de Divulgação Diária: Como Escalar Downloads de Apps na Play Store',
    seoTitle: 'Estratégia de Divulgação Diária na Google Play Store | Portal Vip Brasil',
    metaDescription: 'Descubra como o ecossistema do Portal Vip Brasil publica diariamente nas redes sociais para manter fluxo contínuo de usuários e engajamento orgânico.',
    excerpt: 'Como o ecossistema do Portal Vip Brasil publica diariamente nas redes sociais para manter fluxo contínuo de usuários e engajamento orgânico.',
    category: 'Marketing & SEO',
    tags: ['Portal Vip Brasil', 'Play Store', 'Marketing Diário', 'SEO Bing Google', 'Tráfego Orgânico', 'ASO', 'PortalVipBrasil'],
    primaryKeyword: 'divulgação diária play store',
    secondaryKeywords: ['marketing orgânico de apps', 'escalar downloads play store', 'froc ia marketing engine'],
    searchIntent: 'guide',
    author: { name: 'Equipe Editorial Portal Vip Brasil', avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl, role: 'Conteúdo Editorial' },
    publishedAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
    readTime: '6 min de leitura',
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Dashboard analítico de tráfego orgânico, SEO e métricas de conversão',
    relatedProjectId: 'proj_froc_marketing_engine',
    relatedProjectName: 'Froc IA Marketing Engine',
    relatedProjectUrl: 'https://froc-ia-marketing-engine.vercel.app/',
    hasApp: false,
    sections: [
      {
        h2: 'Por Que a Consistência Diária Vence o Tráfego Pago',
        content: 'A maioria dos aplicativos lançados na Google Play Store perde tração após as primeiras semanas por falta de divulgação contínua. Manter postagens diárias de alto engajamento nas redes com links rastreados gera tração sustentável e custo de aquisição zero.',
        h3s: [
          {
            h3: 'ASO (App Store Optimization) e Autoridade Externa',
            content: 'Os backlinks originados de blogs autoritativos e redes sociais ativas são sinais vitais de relevância para o ranqueamento na Play Store.'
          },
          {
            h3: 'Automação de Conteúdo em Piloto Automático',
            content: 'Como o Froc IA Marketing Engine orquestra a publicação diária sem sobrecarregar a equipe operacional.'
          }
        ]
      },
      {
        h2: 'O Ecossistema Integrado do Portal Vip Brasil',
        content: 'No Portal Vip Brasil, cada projeto possui páginas dedicadas, artigos no blog com palavras-chave estratégicas e campanhas para redes sociais com hashtags personalizadas.'
      }
    ],
    faqSection: [
      {
        question: 'O que é o Froc IA Marketing Engine?',
        answer: 'É a plataforma central de automação do Portal Vip Brasil para gerenciamento de marketing de conteúdo e autopilot.'
      },
      {
        question: 'Como os links para os apps são divulgados?',
        answer: 'Todos os posts e artigos incluem botões diretos e links UTM para download seguro na Google Play Store.'
      }
    ],
    conclusion: 'A escala de downloads depende da disciplina de publicação diária com conteúdo que realmente agrega valor ao leitor.',
    callToAction: 'Conheça todos os nossos aplicativos publicados na aba Vitrine do Portal Vip Brasil.',
    internalLinks: [
      { label: 'Vitrine Oficial Portal Vip Brasil', url: '/vitrine' },
      { label: 'Artigo: Como a IA Generativa Transforma o Marketing', url: '/blog/como-a-ia-generativa-e-o-froc-ia-estao-revolucionando-a-criacao-de-conteudo' }
    ],
    socialCampaign: {
      instagram: {
        caption: 'Como manter um fluxo constante de downloads e tráfego orgânico para seus aplicativos na Google Play Store. Leia no Blog Portal Vip Brasil!',
        hashtags: ['#FrocIAMarketingEngine', '#TrafegoOrganico', '#MarketingPlayStore', '#ASO2026', '#Rank1Google', '#PortalVipBrasil'],
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store?utm_source=instagram&utm_medium=social&utm_campaign=blog_marketing_engine'
      },
      facebook: {
        postText: 'Descubra os segredos da divulgação diária orgânica para aplicativos na Google Play Store. Leia completo no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store?utm_source=facebook&utm_medium=social&utm_campaign=blog_marketing_engine'
      },
      linkedin: {
        postText: 'Estratégias de ASO e crescimento orgânico de aplicativos móveis: estudo prático publicado no Portal Vip Brasil.',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store?utm_source=linkedin&utm_medium=social&utm_campaign=blog_marketing_engine'
      },
      x: {
        tweetText: 'Aprenda como escalar downloads de aplicativos na Play Store com divulgação diária no Blog Portal Vip Brasil:',
        utmUrl: 'https://portal-vip-brasil.vercel.app/blog/estrategia-de-divulgacao-diaria-para-aplicativos-na-google-play-store?utm_source=x&utm_medium=social&utm_campaign=blog_marketing_engine'
      }
    },
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: '2026-08-20T09:00:00.000Z',
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
      const data = doc.data() as BlogSettings;
      // Requisito 100% Automático: Cura imediata de configurações legadas em modo 'approval'
      if (data.mode === 'approval' || (data.mode as any) === 'manual_approval' || !data.mode) {
        const healed: BlogSettings = {
          ...DEFAULT_BLOG_SETTINGS,
          ...data,
          mode: 'automatic',
          autoPromoteDrafts: true,
          updatedAt: nowIso()
        };
        try {
          await firestore().collection(COLLECTIONS.blogSettings).doc('main').set({ mode: 'automatic', autoPromoteDrafts: true, updatedAt: nowIso() }, { merge: true });
        } catch {}
        return healed;
      }
      return { ...DEFAULT_BLOG_SETTINGS, ...data, mode: 'automatic', autoPromoteDrafts: true };
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
  // Modo de aprovação manual é estritamente proibido; forçar modo 100% automático
  const sanitizedPartial: Partial<BlogSettings> = { ...partial, mode: 'automatic' };
  const updated: BlogSettings = {
    ...current,
    ...sanitizedPartial,
    mode: 'automatic',
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
    coverImage: publicCoverUrl(article),
    coverImageAlt: article.coverAlt || resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category).alt,
    readingTimeMinutes: Number.parseInt(article.readTime || '', 10) || 5,
    readTime: article.readTime,
    contentMarkdown: words.join('\n\n'),
    sections: article.sections || [],
    keyTakeaways: Array.isArray(article.keyTakeaways) ? article.keyTakeaways.filter((item) => typeof item === 'string' && item.trim()).slice(0, 6) : [],
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
      image: [publicCoverUrl(article)],
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      author: { '@type': 'Organization', name: article.author?.name || 'Portal Vip Brasil' },
      publisher: { '@type': 'Organization', name: 'Portal Vip Brasil' },
      mainEntityOfPage: canonicalUrl
    },
    socialRepurpose: {
      instagram: {
        caption: social?.instagram?.caption || article.excerpt,
        hashtags: (social?.instagram?.hashtags && social.instagram.hashtags.length > 0)
          ? social.instagram.hashtags
          : (PROJECT_NICHE_HASHTAGS[article.relatedProjectId] || ['#PortalVipBrasil', '#Tecnologia', '#Marketing']),
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
 * Converte um documento legado da coleção `blogPosts` (formato antigo: summary/content/featuredImageUrl)
 * para o formato StoredBlogArticle usado pelo blog público. Nada é gravado no banco.
 */
export function normalizeLegacyBlogPost(id: string, data: any): StoredBlogArticle {
  const content = String(data?.content || '');
  const sections: BlogArticleSection[] = Array.isArray(data?.sections) && data.sections.length
    ? data.sections
    : content
      .split(/\n(?=#{2}\s)/)
      .map((block: string) => block.trim())
      .filter(Boolean)
      .map((block: string, index: number) => {
        const match = block.match(/^#{2,3}\s+(.+)\n?([\s\S]*)$/);
        return match
          ? { h2: match[1].trim(), content: match[2].trim() }
          : { h2: index === 0 ? '' : `Parte ${index + 1}`, content: block };
      }) as any;
  const excerpt = safeString(data?.excerpt || data?.summary || data?.seoDescription || content.replace(/[#*_>`]/g, ''), 300);
  const created = data?.publishedAt || data?.createdAt || data?.updatedAt || '';
  const authorName = typeof data?.author === 'object' ? data.author?.name : data?.author;
  return {
    ...data,
    id,
    slug: String(data?.slug || id),
    title: String(data?.title || 'Artigo Portal Vip Brasil'),
    seoTitle: String(data?.seoTitle || data?.title || ''),
    metaDescription: safeString(data?.metaDescription || data?.seoDescription || excerpt, 180),
    excerpt,
    category: String(data?.category || 'Artigos'),
    tags: Array.isArray(data?.tags) ? data.tags : [],
    primaryKeyword: String(data?.primaryKeyword || ''),
    secondaryKeywords: Array.isArray(data?.secondaryKeywords) ? data.secondaryKeywords : [],
    searchIntent: data?.searchIntent || 'informational',
    author: { name: authorName || 'Equipe Editorial Portal Vip Brasil', avatar: '', role: '' },
    publishedAt: created,
    updatedAt: data?.updatedAt || created,
    readTime: data?.readTime || `${Math.max(2, Math.round(content.split(/\s+/).length / 200))} min`,
    featured: Boolean(data?.featured),
    coverImage: String(data?.coverImage || data?.featuredImageUrl || ''),
    coverAlt: String(data?.coverAlt || data?.title || ''),
    sections,
    faqSection: Array.isArray(data?.faqSection) ? data.faqSection : [],
    conclusion: String(data?.conclusion || ''),
    callToAction: String(data?.callToAction || ''),
    relatedProjectId: String(data?.relatedProjectId || data?.projectId || ''),
    relatedProjectName: String(data?.relatedProjectName || 'Portal Vip Brasil'),
    relatedProjectUrl: String(data?.relatedProjectUrl || config.appUrl),
    hasApp: Boolean(data?.hasApp),
    internalLinks: Array.isArray(data?.internalLinks) ? data.internalLinks : [],
    status: 'published',
    views: Number(data?.views || 0),
    likes: Number(data?.likes || 0),
    shares: Number(data?.shares || 0),
    clicksWebsite: Number(data?.clicksWebsite || 0),
    clicksPlayStore: Number(data?.clicksPlayStore || 0),
    createdAt: data?.createdAt || created,
    legacySource: 'blogPosts'
  } as StoredBlogArticle;
}

// Títulos de seção do antigo texto-modelo/enchimento automático. Artigos que os contêm são
// páginas quase idênticas entre si: ficam visíveis ao leitor, mas com noindex e fora do sitemap
// até serem reescritos com conteúdo real.
const TEMPLATE_SECTION_MARKERS = [
  'Recursos Estratégicos e Aplicações Práticas',
  'Como Começar e Ter Acesso aos Recursos Oficiais',
  'Impacto Estratégico e Aplicações Práticas de',
  'Metodologia Recomendada e Boas Práticas',
  'Recomendações Editoriais e Conclusões para o Sucesso',
  'Panorama e Contextualização:',
  'Metodologia Prática e Aplicação Estratégica',
  'Orientações Finais e Recursos Oficiais',
  'e Seus Principais Benefícios',
  'Como Começar a Utilizar Hoje Mesmo',
  'Visão Geral e Contextualização de'
];

export function isTemplateLikeArticle(article: any): boolean {
  if (!article || typeof article !== 'object') return false;
  if (article.needsEditorialRewrite === true) return true;
  const headings = (Array.isArray(article.sections) ? article.sections : []).map((sec: any) => String(sec?.h2 || ''));
  const content = typeof article.content === 'string' ? article.content : '';
  const hits = TEMPLATE_SECTION_MARKERS.filter((marker) => headings.some((h: string) => h.includes(marker)) || content.includes(marker)).length;
  return hits >= 2;
}

/**
 * Garante tipos seguros em qualquer artigo vindo do banco (documentos antigos podem ter campos
 * ausentes, nulos ou em formato diferente). Um único documento malformado não pode derrubar o blog.
 */
export function sanitizeStoredArticle(article: any): StoredBlogArticle {
  const str = (v: any) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const arr = (v: any) => (Array.isArray(v) ? v.filter((x) => x != null) : []);
  const sections = arr(article?.sections)
    .filter((sec: any) => typeof sec === 'object')
    .map((sec: any) => ({
      ...sec,
      h2: str(sec.h2),
      content: str(sec.content),
      h3s: arr(sec.h3s).filter((h: any) => typeof h === 'object').map((h: any) => ({ ...h, h3: str(h.h3), content: str(h.content) }))
    }));
  const authorRaw = article?.author;
  return {
    ...article,
    id: str(article?.id),
    slug: str(article?.slug),
    title: str(article?.title) || 'Artigo Portal Vip Brasil',
    seoTitle: str(article?.seoTitle),
    metaDescription: str(article?.metaDescription || article?.seoDescription),
    excerpt: str(article?.excerpt || article?.summary || article?.metaDescription),
    introduction: str(article?.introduction),
    conclusion: str(article?.conclusion),
    callToAction: str(article?.callToAction),
    category: str(article?.category) || 'Artigos',
    tags: arr(article?.tags).map(str),
    primaryKeyword: str(article?.primaryKeyword),
    secondaryKeywords: arr(article?.secondaryKeywords).map(str),
    sections,
    faqSection: arr(article?.faqSection).filter((f: any) => typeof f === 'object'),
    internalLinks: arr(article?.internalLinks).filter((l: any) => typeof l === 'object'),
    author: typeof authorRaw === 'object' && authorRaw
      ? { name: str(authorRaw.name), avatar: str(authorRaw.avatar), role: str(authorRaw.role) }
      : { name: str(authorRaw) || 'Equipe Editorial Portal Vip Brasil', avatar: '', role: '' },
    coverImage: str(article?.coverImage || article?.featuredImageUrl),
    coverAlt: str(article?.coverAlt || article?.coverImageAlt),
    relatedProjectId: str(article?.relatedProjectId || article?.projectId),
    relatedProjectName: str(article?.relatedProjectName),
    relatedProjectUrl: str(article?.relatedProjectUrl),
    readTime: str(article?.readTime),
    publishedAt: str(article?.publishedAt || article?.createdAt || article?.updatedAt),
    updatedAt: str(article?.updatedAt || article?.publishedAt || article?.createdAt),
    createdAt: str(article?.createdAt || article?.publishedAt)
  } as StoredBlogArticle;
}

/**
 * Capas geradas por IA foram gravadas como data URI (base64, ~1 MB cada) dentro do documento.
 * Enviá-las na listagem gerava respostas de 13 MB (acima do limite da Vercel) e derrubava o blog.
 * No conteúdo público, toda capa data: vira uma URL própria e leve, servida pela rota de capa.
 */
export function isDataUriImage(url: any): boolean {
  return typeof url === 'string' && /^data:image\//i.test(url.trim());
}

export function publicCoverUrl(article: { slug?: string; coverImage?: string; relatedProjectId?: string; title?: string; id?: string; category?: string }): string {
  const cover = String(article?.coverImage || '');
  if (isDataUriImage(cover) && article?.slug) {
    return `${config.appUrl.replace(/\/$/, '')}/api/portal/blog/articles/${encodeURIComponent(article.slug)}/cover`;
  }
  if (isInvalidOrLogoImage(cover)) {
    return resolveThematicCoverForProject(article?.relatedProjectId || '', article?.title, article?.slug, article?.id, article?.category).url;
  }
  return cover;
}

export function decodeDataUriImage(url: string): { mime: string; buffer: Buffer } | null {
  const match = String(url || '').trim().match(/^data:(image\/(?:png|jpe?g|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
    return buffer.length > 0 ? { mime: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'), buffer } : null;
  } catch {
    return null;
  }
}

function safeSanitizeArticle(id: string, build: () => any): StoredBlogArticle | null {
  try {
    return sanitizeStoredArticle(build());
  } catch (err) {
    console.warn('[BlogEngine] Artigo ignorado por formato inválido:', id, err);
    return null;
  }
}

// Cache curto por instância serverless: evita reler o acervo inteiro a cada visita.
const PUBLISHED_CACHE_TTL_MS = 60_000;
let publishedCache: { at: number; items: StoredBlogArticle[] } | null = null;

export function invalidatePublishedBlogCache(): void {
  publishedCache = null;
}

/**
 * Carrega TODOS os artigos publicados (blogArticles + blogPosts legados), somente leitura.
 * - Não usa orderBy no Firestore (orderBy exclui documentos sem o campo publishedAt).
 * - Não grava nada no banco durante uma visita pública.
 * - Não roda Quality Gate nem promove rascunhos durante a leitura.
 */
export async function loadAllPublishedBlogArticles(): Promise<StoredBlogArticle[]> {
  const ttl = process.env.NODE_ENV === 'test' ? 0 : PUBLISHED_CACHE_TTL_MS;
  if (publishedCache && Date.now() - publishedCache.at < ttl) return publishedCache.items;
  const db = firestore();
  try {
    const [articlesSnap, legacySnap] = await Promise.all([
      db.collection(COLLECTIONS.blogArticles).where('status', '==', 'published').get(),
      db.collection(COLLECTIONS.blogPosts).where('status', '==', 'published').get().catch((err: any) => {
        console.warn('[BlogEngine] Coleção legada blogPosts indisponível:', err?.message || err);
        return { docs: [] };
      })
    ]);
    const bySlug = new Map<string, StoredBlogArticle>();
    for (const d of articlesSnap.docs || []) {
      const article = safeSanitizeArticle(d.id, () => ({ id: d.id, ...(d.data() as any) }));
      if (!article || !article.slug) continue;
      if ((article as any).noindex === true) continue;
      article.publishedAt = article.publishedAt || article.createdAt || article.updatedAt || '';
      if (!bySlug.has(article.slug)) bySlug.set(article.slug, article);
    }
    for (const d of legacySnap.docs || []) {
      const article = safeSanitizeArticle(d.id, () => normalizeLegacyBlogPost(d.id, d.data()));
      if (!article) continue;
      if (!article.slug || bySlug.has(article.slug) || (article as any).noindex === true) continue;
      bySlug.set(article.slug, article);
    }
    const items = [...bySlug.values()].map((article) => {
      if (isInvalidOrLogoImage(article.coverImage)) {
        const thematic = resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category);
        return { ...article, coverImage: thematic.url, coverAlt: article.coverAlt || thematic.alt };
      }
      return article;
    });
    items.sort((a, b) => String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || '')));
    publishedCache = { at: Date.now(), items };
    return items;
  } catch (err) {
    if (publishedCache) {
      console.warn('[BlogEngine] Falha de leitura; servindo última lista válida em cache:', err);
      return publishedCache.items;
    }
    throw err;
  }
}

/**
 * Lista artigos públicos do Blog com filtros e paginação.
 */
export async function listBlogArticles(filters: {
  category?: string;
  projectId?: string;
  query?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  articles: StoredBlogArticle[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}> {
  let items: StoredBlogArticle[];
  try {
    items = [...await loadAllPublishedBlogArticles()];
  } catch (err) {
    console.error('[BlogEngine] Erro de leitura no Firestore ao listar artigos:', err);
    throw new Error(`Falha ao carregar artigos do banco de dados: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Banco realmente vazio: mostra os artigos oficiais iniciais (somente leitura, sem gravar).
  if (items.length === 0) items = INITIAL_SEEDED_ARTICLES.filter((article) => article.status === 'published');

  if (filters.projectId && filters.projectId !== 'todos') {
    items = items.filter((article) => article.relatedProjectId === filters.projectId || (article as any).relatedProjectSlug === filters.projectId);
  }
  if (filters.category && filters.category !== 'Todos') {
    items = items.filter((article) => article.category === filters.category);
  }
  if (filters.query) {
    const q = filters.query.toLowerCase().trim();
    items = items.filter((art) =>
      String(art.title || '').toLowerCase().includes(q) ||
      String(art.excerpt || '').toLowerCase().includes(q) ||
      (art.tags || []).some((t) => String(t).toLowerCase().includes(q)) ||
      String(art.primaryKeyword || '').toLowerCase().includes(q) ||
      (art.secondaryKeywords || []).some((keyword) => String(keyword).toLowerCase().includes(q)) ||
      String((art as any).relatedProjectName || '').toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 200);
  const offset = Math.max(Number(filters.offset || 0), 0);
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { articles: items.slice(offset, offset + limit), total, limit, offset, page, totalPages };
}

/**
 * Diagnóstico administrativo do acervo: quantos artigos existem em cada coleção e status.
 * Somente leitura. Serve para confirmar onde estão os posts antigos.
 */
export async function diagnoseBlogInventory(): Promise<Record<string, any>> {
  const db = firestore();
  const result: Record<string, any> = {};
  for (const col of [COLLECTIONS.blogArticles, COLLECTIONS.blogPosts]) {
    const snap = await db.collection(col).get();
    const byStatus: Record<string, number> = {};
    let withoutPublishedAt = 0;
    let withoutSlug = 0;
    let templateLike = 0;
    for (const d of snap.docs) {
      const data = d.data() as any;
      if (isTemplateLikeArticle(data)) templateLike++;
      const status = String(data?.status || 'sem_status');
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (!data?.publishedAt) withoutPublishedAt++;
      if (!data?.slug) withoutSlug++;
    }
    result[col] = { total: snap.docs.length, byStatus, withoutPublishedAt, withoutSlug, templateLikeNoindex: templateLike };
  }
  result.publicVisible = (await loadAllPublishedBlogArticles()).length;
  return result;
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
    if (publishedDoc) {
      const article: StoredBlogArticle = sanitizeStoredArticle({ id: publishedDoc.id, ...(publishedDoc.data() as any) });
      if (isInvalidOrLogoImage(article.coverImage)) {
        const thematic = resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category);
        article.coverImage = thematic.url;
        article.coverAlt = article.coverAlt || thematic.alt;
      }
      return article;
    }
  } catch (err) {
    console.warn('[BlogEngine] Erro ao buscar artigo por slug no Firestore:', err);
  }
  // Coleção legada blogPosts (posts antigos), aceitando o slug original sem normalização.
  try {
    const legacy = await firestore().collection(COLLECTIONS.blogPosts).where('slug', 'in', [...new Set([slug, clean])]).limit(5).get();
    const legacyDoc = (legacy.docs || []).find((doc: any) => String((doc.data() as any)?.status || '') === 'published');
    if (legacyDoc) return normalizeLegacyBlogPost(legacyDoc.id, legacyDoc.data());
  } catch (err) {
    console.warn('[BlogEngine] Erro ao buscar artigo legado por slug:', err);
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
const SLUG_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'para', 'pra', 'com', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'por', 'que', 'sua', 'seu', 'ao', 'aos']);

/** Slug curto no padrão Yoast: 3 a 6 palavras, sem stopwords nem datas. */
export function buildSeoSlug(text: string): string {
  const base = slugify(String(text || '').replace(/\d{4}-\d{2}-\d{2}/g, ' ').replace(/\b(?:19|20)\d{2}\b/g, ' '));
  const words = base.split('-').filter((w) => w && !SLUG_STOPWORDS.has(w));
  const short = words.slice(0, 6).join('-');
  return short.length >= 3 ? short : base.slice(0, 60).replace(/-+$/, '');
}

async function withTimeout<T>(ms: number, label: string, run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Tempo esgotado (${Math.round(ms / 1000)}s) em ${label}.`)), ms); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
  const poolTopicItem = pool.find((item) => !pastTitles.some((t) => t.toLowerCase() === item.topic.toLowerCase()));
  // Quando as pautas cadastradas acabam, a IA escolhe o melhor ângulo de busca real a partir de uma
  // semente (palavra-chave + intenção). O título montado por template NUNCA é publicado literalmente:
  // era ele que gerava títulos como "Como X se conecta a X em X: guia prático 2026-10-30".
  let chosenTopicItem = poolTopicItem;
  if (!chosenTopicItem) chosenTopicItem = buildDynamicTopicR81(project, pastTitles, cycleDate);
  const aiChoosesTopic = !options?.customTopic && !poolTopicItem;

  const topic = options?.customTopic || chosenTopicItem.topic;
  const primaryKeyword = chosenTopicItem.primaryKeyword || project.keywords[0] || project.name;
  const searchIntent = options?.customIntent || chosenTopicItem.searchIntent || 'educational';


  // 3. Prompt editorial: SEO Yoast completo + E-E-A-T + persuasão ética + JSON estruturado
  const recentTitles = pastTitles.slice(-60);
  const appLine = project.hasApp && project.playStoreUrl
    ? `- Aplicativo oficial na Google Play: ${project.playStoreUrl} (${project.appTitle || project.name})`
    : '- Produto 100% web (NÃO diga que existe aplicativo na Play Store).';
  const pautaBlock = aiChoosesTopic
    ? `PAUTA (você escolhe o ângulo):
- Semente de palavra-chave: "${primaryKeyword}" | intenção sugerida: ${searchIntent}.
- Escolha UMA dúvida real que brasileiros digitam no Google sobre este nicho (cauda longa, ex.: "como fazer…", "o que significa…", "oração para…", "qual o melhor…", "passo a passo…").
- A palavra-chave foco deve ser essa busca real, natural, com 2 a 6 palavras. NÃO use o nome do projeto como palavra-chave foco.
- O título NÃO pode repetir o nome do projeto mais de uma vez nem conter datas.`
    : `PAUTA DEFINIDA:
- Tema: ${topic}
- Palavra-chave foco: ${primaryKeyword}
- Intenção de busca: ${searchIntent}`;

  const prompt = `Você é redator-chefe sênior, especialista em SEO (padrão Yoast SEO verde em todos os itens) e em copywriting persuasivo ético, escrevendo em português do Brasil para o blog do Portal Vip Brasil.

PROJETO (dados reais — nunca invente recursos, números, depoimentos ou estatísticas):
- Nome: ${project.name}
- Categoria: ${project.category} | Segmento: ${project.segment}
- Público: ${project.targetAudience || 'brasileiros interessados no tema'}
- Site oficial: ${project.websiteUrl}
${appLine}
- Diferenciais reais: ${(project.highlights || []).join(' | ')}
- Palavras-chave do projeto: ${(project.keywords || []).join(', ')}

${pautaBlock}

TÍTULOS JÁ PUBLICADOS (não repita tema, ângulo nem palavra-chave foco): ${recentTitles.join(' | ') || 'nenhum'}

OBJETIVO: o leitor deve sentir nos primeiros segundos que encontrou EXATAMENTE o que procurava, confiar no conteúdo e terminar querendo acessar o site/app oficial.

REGRAS YOAST SEO (todas obrigatórias):
1. seoTitle com até 60 caracteres, palavra-chave foco no INÍCIO, termina com " | Portal Vip Brasil" somente se couber.
2. metaDescription entre 120 e 156 caracteres, contém a palavra-chave foco e termina com um convite à ação.
3. suggestedSlug com 3 a 5 palavras, minúsculas, hífens, sem acentos, sem datas, sem stopwords (de, da, do, e, para, com, em, o, a).
4. introduction: a PRIMEIRA frase contém a palavra-chave foco e já responde a dúvida de forma direta (40 a 60 palavras, ideal para trecho em destaque do Google); depois 1 ou 2 frases de gancho emocional (curiosidade + promessa do que o leitor vai descobrir).
5. Corpo com 1.200 a 1.800 palavras no total, em 5 a 7 seções H2. Use a palavra-chave foco ou sinônimo em 2 ou 3 H2 (NUNCA em todos) e de forma natural no texto (densidade 0,8% a 1,5%, sem repetir em sequência).
6. Cada seção H2 com 150 a 300 palavras; use H3 quando houver passos, listas ou variações. Parágrafos curtos (até 3 frases), frases com até 20 palavras na maioria, palavras de transição (além disso, por isso, ou seja, por exemplo, em seguida) em pelo menos 30% das frases, voz ativa.
7. Inclua pelo menos uma seção prática em passo a passo ou lista numerada, e uma seção "erros comuns" ou "cuidados".
8. secondaryKeywords: 4 a 6 variações semânticas e perguntas relacionadas ("as pessoas também perguntam").
9. faqSection: 4 a 6 perguntas reais de busca com respostas diretas de 40 a 80 palavras.
10. keyTakeaways: 4 a 5 frases curtas com os pontos-chave (resumo rápido para quem tem pressa).

PERSUASÃO ÉTICA (sem promessas falsas):
- Desperte curiosidade (pergunta ou fato intrigante), identificação (a dor/desejo do leitor), autoridade (explicação clara e segura) e desejo (o que muda na vida dele).
- Inclua 1 micro-chamada natural no meio do texto apontando para ${project.name} e uma conclusão que acolhe e motiva.
- callToAction: 1 ou 2 frases fortes, específicas e acolhedoras, com o link ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` e o convite para baixar o app (${project.playStoreUrl})` : ''}.
- Proibido: garantias de resultado (amor, dinheiro, cura), diagnósticos médicos/jurídicos/financeiros, sensacionalismo, termos de outros nichos, desrespeito a qualquer religião. Temas espirituais com respeito e linguagem acolhedora.

REDES SOCIAIS:
- instagram.caption com gancho na 1ª linha, 2-4 linhas de valor e CTA; hashtags: 10 a 15 misturando amplas, de nicho, de cauda longa em português e #PortalVipBrasil.
- facebook, linkedin e x adaptados ao tom de cada rede (x com até 240 caracteres).

RESPONDA APENAS COM JSON VÁLIDO, exatamente nesta estrutura:
{
  "title": "título H1 natural e irresistível (50 a 70 caracteres)",
  "suggestedSlug": "string",
  "seoTitle": "string",
  "metaDescription": "string",
  "primaryKeyword": "palavra-chave foco",
  "secondaryKeywords": ["string"],
  "searchIntent": "informational | educational | tutorial | guide | commercial | navigational",
  "excerpt": "2 frases que dão vontade de ler",
  "introduction": "string",
  "keyTakeaways": ["string"],
  "category": "${project.category}",
  "tags": ["string"],
  "readTime": "X min de leitura",
  "sections": [{ "h2": "string", "content": "string", "h3s": [{ "h3": "string", "content": "string" }] }],
  "faqSection": [{ "question": "string", "answer": "string" }],
  "conclusion": "string",
  "callToAction": "string",
  "socialCampaign": {
    "instagram": { "caption": "string", "hashtags": ["#tag"] },
    "facebook": { "postText": "string" },
    "linkedin": { "postText": "string" },
    "x": { "tweetText": "string" }
  }
}`;

  const aiRes = await executeAiWith2SecAntiFall({
    prompt,
    systemInstruction: 'Você é a IA Editorial do Portal Vip Brasil: redator sênior brasileiro, especialista em SEO Yoast, E-E-A-T e copywriting ético. Escreve conteúdo original, verdadeiro, profundo e envolvente, e responde somente com JSON válido.',
    jsonOutput: true,
    maxTokens: 12000,
    // Um artigo completo leva dezenas de segundos para ser gerado. Com 2,5s TODA geração caía no
    // texto-modelo de contingência e o blog publicava centenas de páginas quase idênticas.
    timeoutMs: 90000
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
    // Em produção NUNCA publicamos o texto-modelo: páginas quase idênticas são conteúdo duplicado
    // para Google/Bing e derrubam a reputação do domínio inteiro. Sem IA, o ciclo tenta de novo amanhã.
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`[BlogEngine] IA não retornou artigo válido para ${project.name}; nada foi publicado (texto-modelo bloqueado).`);
    }
    // Somente em testes automatizados: estrutura de contingência para validar o fluxo.
    parsed = {
      title: topic,
      suggestedSlug: slugify(topic),
      seoTitle: safeString(`${topic} | Portal Vip Brasil`, 65),
      metaDescription: safeString(`Guia aprofundado e completo sobre ${project.name}: descubra funcionalidades essenciais, diferenciais estratégicos e orientações práticas de ${project.category}.`, 160),
      excerpt: `Tudo o que você precisa saber sobre ${project.name}: orientações, recursos e caminhos para potencializar seus resultados no segmento de ${project.category}.`,
      introduction: `Neste artigo detalhado, apresentamos uma visão abrangente sobre ${project.name}, seus objetivos estratégicos, recursos essenciais e orientações indispensáveis para quem busca excelência e fundamentação em ${project.category}.`,
      category: project.category,
      tags: project.keywords,
      primaryKeyword,
      secondaryKeywords: project.keywords.slice(0, 3),
      readTime: '5 min de leitura',
      coverAlt: `Fotografia editorial representativa sobre ${project.name} e seu nicho`,
      sections: [
        {
          h2: `Visão Geral e Contextualização de ${project.name}`,
          content: `${project.description}\n\nDesenvolvido com foco no público de ${project.targetAudience}, a iniciativa destaca-se pela maturidade técnica e pela proposta de valor clara. Entre os diferenciais e destaques cadastrados no ecossistema estão: ${project.highlights.join(', ')}. Esses elementos garantem que usuários encontrem suporte qualificado e recursos modernos em sua jornada.`
        },
        {
          h2: `Recursos Estratégicos e Aplicações Práticas`,
          content: `A aplicação prática das soluções de ${project.name} envolve a integração de métodos consolidados com tecnologia de ponta. Profissionais e entusiastas de ${project.category} contam com uma estrutura intuitiva, orientada à obtenção de resultados consistentes e seguros. O acompanhamento contínuo e a atualização das ferramentas asseguram que as demandas do setor sejam atendidas com agilidade e eficiência.`
        },
        {
          h2: 'Como Começar e Ter Acesso aos Recursos Oficiais',
          content: `Para aproveitar ao máximo todos os recursos disponíveis de forma segura e imediata, acesse o website oficial através de ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` ou realize o download direto do aplicativo na Google Play Store (${project.playStoreUrl})` : ''}. Mantenha-se informado através dos canais homologados pelo Portal Vip Brasil para garantir acesso a conteúdos atualizados e suporte especializado.`
        }
      ],
      faqSection: [
        {
          question: `O que é ${project.name}?`,
          answer: `${project.description} Trata-se de uma solução homologada no ecossistema Portal Vip Brasil.`
        },
        {
          question: `Onde posso acessar ${project.name}?`,
          answer: `Você pode acessar diretamente pelo endereço oficial ${project.websiteUrl}.`
        }
      ],
      conclusion: `Consulte sempre as informações oficiais de ${project.name} e utilize exclusivamente os canais certificados para usufruir de todos os benefícios da plataforma.`,
      callToAction: `Acesse agora mesmo o site oficial ${project.websiteUrl} e conheça todos os recursos em detalhes.`,
      socialCampaign: {
        instagram: { caption: `Confira o novo artigo editorial sobre ${project.name} no Blog Portal Vip Brasil!`, hashtags: ['#PortalVipBrasil', '#Tecnologia', '#Marketing'] },
        facebook: { postText: `Novo conteúdo editorial disponível sobre ${project.name}. Acesse e confira os detalhes!` },
        linkedin: { postText: `Publicação oficial do Portal Vip Brasil sobre ${project.name} no segmento de ${project.category}.` },
        x: { tweetText: `Confira o novo artigo sobre ${project.name} no blog oficial Portal Vip Brasil:` }
      }
    };
  }

  const defaultExcerpt = `Tudo o que você precisa saber sobre ${project.name}: orientações, recursos e caminhos para potencializar seus resultados no segmento de ${project.category}.`;
  const articleExcerpt = parsed.excerpt || parsed.metaDescription || defaultExcerpt;
  const articleSections: BlogArticleSection[] = (Array.isArray(parsed.sections) && parsed.sections.length > 0)
    ? parsed.sections
    : [
        {
          h2: `Visão Geral e Contextualização de ${project.name}`,
          content: `${project.description}\n\nEntre os recursos cadastrados estão: ${project.highlights.join(', ')}.`
        },
        {
          h2: 'Como Começar e Ter Acesso aos Recursos Oficiais',
          content: `Para aproveitar ao máximo todos os recursos disponíveis de forma segura, acesse o website oficial ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` ou faça o download do aplicativo na Google Play Store (${project.playStoreUrl})` : ''}.`
        }
      ];

  const articleId = options?.articleId || newId('blog_art');
  // Em produção, artigo sem título/seções suficientes não é publicado (nunca cai no texto da pauta-semente)
  if (process.env.NODE_ENV !== 'test' && (!parsed?.title || !Array.isArray(parsed?.sections) || parsed.sections.length < 3)) {
    throw new Error(`[BlogEngine] IA retornou artigo incompleto para ${project.name}; nada foi publicado.`);
  }
  let finalSlug = buildSeoSlug(parsed.suggestedSlug || parsed.title || topic);
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
  const nicheHashtags = PROJECT_NICHE_HASHTAGS[project.id] || ['#PortalVipBrasil', '#MarketingDigital', '#SEO'];
  const hashtags = (Array.isArray(parsed.socialCampaign?.instagram?.hashtags) && parsed.socialCampaign.instagram.hashtags.length > 0)
    ? Array.from(new Set([...parsed.socialCampaign.instagram.hashtags, ...nicheHashtags]))
    : nicheHashtags;

  const socialCampaign: SocialRepurposePack = {
    instagram: {
      caption: parsed.socialCampaign?.instagram?.caption || articleExcerpt,
      hashtags,
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

  const thematicCover = resolveThematicCoverForProject(project.id, parsed?.title || topic, finalSlug, articleId, parsed?.category);
  let coverImage = thematicCover.url;
  let coverAlt = parsed.coverAlt || thematicCover.alt;
  let coverImageStoragePath: string | undefined;
  let coverImageGenerated = false;
  try {
    // Capa fotográfica ultrarrealista do nicho certo, guardada fora do artigo (WebP leve via rota de capa)
    const photo = await withTimeout(75_000, 'capa fotográfica', () => generateArticleCoverPhoto({
      id: articleId,
      slug: finalSlug,
      title: String(parsed.title || topic),
      relatedProjectId: project.id,
      relatedProjectName: project.name,
      primaryKeyword
    }, { userId: options?.userId, collection: COLLECTIONS.blogArticles }));
    coverImage = photo.coverUrl;
    coverAlt = photo.coverAlt;
    coverImageGenerated = true;
  } catch (coverError) {
    console.warn('[BlogEngine] Capa IA indisponível para ' + project.id + '; usando fotografia temática curada do nicho.', coverError);
  }

  // Garantia absoluta contra uso de logos ou placeholders
  if (isInvalidOrLogoImage(coverImage)) {
    coverImage = thematicCover.url;
    coverAlt = thematicCover.alt;
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
    keyTakeaways: (Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : []).map((item: any) => safeString(item, 220)).filter(Boolean).slice(0, 6),
    category: parsed.category || project.category,
    tags: Array.from(new Set<string>((Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : project.keywords).map((item: any) => String(item || '').trim()).filter((item: string) => item.length > 0))).slice(0, 12),
    primaryKeyword: safeString(parsed.primaryKeyword || primaryKeyword, 160),
    secondaryKeywords: Array.from(new Set<string>((Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : chosenTopicItem.secondaryKeywords || []).map((item: any) => String(item || '').trim()).filter((item: string) => item.length > 0))).slice(0, 12),
    searchIntent: (['informational', 'educational', 'commercial', 'navigational', 'tutorial', 'guide'].includes(parsed.searchIntent) ? parsed.searchIntent : searchIntent) as StoredBlogArticle['searchIntent'],
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
    coverAlt: safeString(coverAlt || parsed.coverAlt || 'Imagem editorial temática sobre ' + primaryKeyword, 240),
    coverImageStoragePath,
    coverImageGenerated,
    ...(coverImageGenerated ? { coverPhotoVersion: COVER_PHOTO_VERSION } : {}),
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

  // Quality Gate 100% Automatizado (8 Pilares Inegociáveis):
  let qualityAudit = await verifyArticleQualityGate(newArticle, { projectId: project.id });
  if (!qualityAudit.approved) {
    console.warn(`[BlogEngine QualityGate] Artigo ${articleId} necessita de refinamento técnico:`, qualityAudit.rejectionReasons);

    // 1. Correção visual automática: substitui capa genérica/inválida pela capa temática curada do nicho
    if (qualityAudit.pillars.multimediaCompatibility && !qualityAudit.pillars.multimediaCompatibility.passed) {
      newArticle.coverImage = thematicCover.url;
      newArticle.coverAlt = thematicCover.alt;
    }

    // 2. Correção de contaminação cruzada automática: higieniza termos indevidos
    if (qualityAudit.pillars.nicheAlignment && !qualityAudit.pillars.nicheAlignment.passed) {
      const prohibitedTerms = NICHE_PROHIBITED_TERMS[project.id] || [];
      for (const term of prohibitedTerms) {
        const reg = new RegExp(`\\b${term}\\b`, 'gi');
        newArticle.title = newArticle.title.replace(reg, project.name);
        newArticle.excerpt = newArticle.excerpt.replace(reg, project.name);
        newArticle.conclusion = newArticle.conclusion.replace(reg, project.name);
        newArticle.sections = newArticle.sections.map(s => ({
          ...s,
          h2: s.h2.replace(reg, project.name),
          content: s.content.replace(reg, project.name)
        }));
      }
    }

    // 3. Sem texto de enchimento: artigo curto é reprovado e regenerado, nunca inflado com parágrafos padrão.

    // 4. Correção estrutural de SEO automática (meta-descrição e CTA)
    if (qualityAudit.pillars.seoStructureMetadata && !qualityAudit.pillars.seoStructureMetadata.passed) {
      if (!newArticle.metaDescription || newArticle.metaDescription.length < 60 || newArticle.metaDescription.length > 250) {
        const source = [newArticle.excerpt, newArticle.introduction, ...(newArticle.sections || []).map((s: any) => s.content)]
          .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (source.length >= 60) newArticle.metaDescription = safeString(source, 157).replace(/\s+\S*$/, '') + '…';
      }
      if (!newArticle.callToAction || newArticle.callToAction.length < 15) {
        newArticle.callToAction = `Acesse agora o site oficial de ${project.name} em ${project.websiteUrl} e confira todas as novidades disponíveis.`;
      }
    }

    // 5. Correção de keyword stuffing automática
    if (qualityAudit.pillars.naturalKeywordUsage && !qualityAudit.pillars.naturalKeywordUsage.passed && primaryKeyword) {
      let kwCount = 0;
      const kwReg = new RegExp(`\\b${primaryKeyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'gi');
      newArticle.sections = newArticle.sections.map(s => {
        const sanitizedContent = s.content.replace(kwReg, (match) => {
          kwCount++;
          return kwCount > 2 ? 'a iniciativa' : match;
        });
        return { ...s, content: sanitizedContent };
      });
    }

    // 6. Re-teste automatizado imediato no Quality Gate
    qualityAudit = await verifyArticleQualityGate(newArticle, { projectId: project.id });
  }

  // Se mesmo após autocorreção não atingir aprovação técnica,
  // BLOQUEIA conteúdo inadequado e NÃO cria fila manual:
  if (!qualityAudit.approved) {
    throw new Error(`[QualityGate Auto-Reject] Artigo não atingiu aprovação técnica automática (${qualityAudit.rejectionReasons.join('; ')}). Publicação cancelada sem fila manual.`);
  }

  // Publicação 100% automática orientada pelo Botão Mestre
  const finalStatus: StoredBlogArticle['status'] = options?.forceApproval
    ? 'pending_approval'
    : (settings.mode === 'approval' ? 'pending_approval' : 'published');

  newArticle.status = finalStatus;

  try {
    await db.collection(COLLECTIONS.blogArticles).doc(articleId).set(newArticle);
  } catch (err) {
    console.error('[BlogEngine] Erro ao gravar artigo no Firestore:', err);
    throw new Error('Falha ao persistir o artigo diário no Firestore.');
  }

  // Notifica IndexNow se estiver publicado (Bing e mecanismos participantes).
  if (finalStatus === 'published' && settings.indexNowEnabled) {
    await notifyIndexNow([articlePublicUrl]);
  }

  // Repurpose social do artigo: cria uma única fila idempotente para conexões compatíveis com imagem/texto.
  if (finalStatus === 'published' && settings.autoSocialRepurpose && options?.userId) {
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
export async function runDailyBlogCycle(userIdOrOptions?: string | { userId?: string; signal?: AbortSignal }): Promise<{
  success: boolean;
  articlesGenerated: StoredBlogArticle[];
  totalProjects: number;
  publishedCount: number;
  pendingCount: number;
  skippedCount: number;
  failedCount: number;
}> {
  const userId = typeof userIdOrOptions === 'string' ? userIdOrOptions : userIdOrOptions?.userId;
  const signal = typeof userIdOrOptions === 'object' ? userIdOrOptions?.signal : undefined;

  const isGlobalOn = await isGlobalAutomationEnabled(userId);
  if (!isGlobalOn) {
    console.log('[BlogEngine] Ciclo diário de blog cancelado: Automação desligada no Botão Mestre.');
    return {
      success: true,
      articlesGenerated: [],
      totalProjects: 0,
      publishedCount: 0,
      pendingCount: 0,
      skippedCount: 0,
      failedCount: 0
    };
  }

  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }

  const projectsToProcess: PortalProjectItem[] = [];
  for (const p of allProjects) {
    if (p.active !== false && p.dailyBlogEnabled !== false) {
      const allowed = await isProjectAutomationEnabled(p.id, userId);
      if (allowed) projectsToProcess.push(p);
    }
  }
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

  // Resgate automático imediato de rascunhos presos no Firestore
  try {
    const rescued = await rescueStuckDraftArticles();
    if (rescued.rescuedCount > 0) {
      console.log(`[BlogEngine] ${rescued.rescuedCount} rascunho(s) preso(s) resgatado(s) e publicado(s) com sucesso.`);
      for (const item of rescued.rescuedArticles) {
        articlesGenerated.push(item);
        publishedCount++;
      }
    }
  } catch (rescueErr) {
    console.warn('[BlogEngine] Aviso ao resgatar rascunhos no ciclo diário:', rescueErr);
  }

  const worker = async () => {
    while (true) {
      if (signal?.aborted) return;
      const currentIndex = cursor++;
      if (currentIndex >= projectsToProcess.length) return;
      const project = projectsToProcess[currentIndex];
      if (signal?.aborted) return;
      const claimRef = await acquireDailyBlogClaim(project.id, cycleDate);
      if (!claimRef) {
        skippedCount += 1;
        continue;
      }
      if (signal?.aborted) {
        await claimRef.set({ status: 'failed', lockedUntil: 0, lastError: 'cycle_aborted', updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
        return;
      }

      const deterministicArticleId = 'daily-blog-' + stableId(cycleDate + ':' + project.id).slice(0, 48);
      try {
        if (signal?.aborted) throw new Error('Operação cancelada por timeout/abort.');
        const res = await generateArticleForProject(project, { userId: automationUserId, articleId: deterministicArticleId });
        if (signal?.aborted) throw new Error('Operação cancelada por timeout/abort pós geração.');
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

  // Todos os projetos em paralelo: cada artigo leva até ~165s (texto + foto); em série o ciclo estourava o tempo.
  const concurrency = Math.min(8, projectsToProcess.length);
  if (concurrency > 0) {
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  articlesGenerated.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));

  // Se nenhum artigo foi gerado ou publicado neste ciclo e o acervo público estiver vazio,
  // garante a semeadura dos artigos de autoridade para manter o blog funcional
  if (publishedCount === 0 && articlesGenerated.length === 0) {
    try {
      const seedRes = await seedInitialBlogArticlesIfEmpty();
      if (seedRes.seededCount > 0) {
        console.log(`[BlogEngine] ${seedRes.seededCount} artigos oficiais semeados para manter o blog ativo.`);
        publishedCount += seedRes.seededCount;
      }
    } catch {}
  }

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

/**
 * Varre todos os artigos armazenados no Firestore e substitui permanentemente capas inválidas,
 * logos ou URLs antigas pelas novas fotografias temáticas de alta resolução.
 */
export async function healAllStoredBlogCovers(): Promise<{ healedCount: number; details: string[] }> {
  const details: string[] = [];
  let healedCount = 0;
  try {
    const db = firestore();
    const snap = await db.collection(COLLECTIONS.blogArticles).get();
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      if (isInvalidOrLogoImage(data?.coverImage)) {
        const thematic = resolveThematicCoverForProject(data?.relatedProjectId, data?.title, data?.slug, doc.id, data?.category);
        await db.collection(COLLECTIONS.blogArticles).doc(doc.id).set({
          coverImage: thematic.url,
          coverAlt: data?.coverAlt || thematic.alt,
          updatedAt: nowIso()
        }, { merge: true });
        healedCount++;
        details.push(`Artigo "${data?.title || doc.id}" atualizado com capa temática.`);
      }
    }
  } catch (err: any) {
    console.warn('[BlogEngine] Erro ao executar healAllStoredBlogCovers:', err);
    details.push(`Erro: ${err?.message || String(err)}`);
  }
  return { healedCount, details };
}

/**
 * Garante que o acervo inicial do blog público esteja semeado e publicado no Firestore
 * caso não existam artigos com status 'published'.
 */
export async function seedInitialBlogArticlesIfEmpty(): Promise<{ seededCount: number; totalPublished: number }> {
  const db = firestore();
  try {
    const snap = await db.collection(COLLECTIONS.blogArticles).where('status', '==', 'published').limit(1).get();
    if (!snap.empty && snap.docs.length > 0) {
      return { seededCount: 0, totalPublished: snap.docs.length };
    }
    let seededCount = 0;
    for (const article of INITIAL_SEEDED_ARTICLES) {
      await db.collection(COLLECTIONS.blogArticles).doc(article.id).set({
        ...article,
        status: 'published',
        publishedAt: article.publishedAt || nowIso(),
        updatedAt: nowIso()
      }, { merge: true });
      seededCount++;
    }
    return { seededCount, totalPublished: seededCount };
  } catch (err: any) {
    console.warn('[BlogEngine] Erro ao semear artigos iniciais no Firestore:', err);
    return { seededCount: 0, totalPublished: 0 };
  }
}

