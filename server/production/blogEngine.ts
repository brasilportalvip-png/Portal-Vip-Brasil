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

// Catálogo curado de fotografias temáticas em altíssima definição por nicho e micronicho para tráfego orgânico
export const THEMATIC_NICHE_IMAGES: Record<string, Array<{ url: string; alt: string }>> = {
  runes_viking: [
    {
      url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=1200&q=80',
      alt: 'Runas nórdicas gravadas em pedras místicas sobre madeira ancestral para tiragens'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      alt: 'Tocha sagrada e fogo iluminando símbolos nórdicos e força viking'
    },
    {
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Paisagem épica nórdica com névoa serena e pedras ancestrais'
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
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
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
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Altar tradicional de guardiões com elementos sagrados de proteção'
    },
    {
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
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
    trimmed.includes('portalvipbrasil.com.br') ||
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
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
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
        content: 'Reze pedindo proteção para o seu coração e abertura para relacionamentos recíprocos, leais e apaixonados.'
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
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
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
    coverImage: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
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
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
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
    coverImage: isInvalidOrLogoImage(article.coverImage)
      ? resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category).url
      : article.coverImage,
    coverImageAlt: article.coverAlt || resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category).alt,
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
      image: [
        isInvalidOrLogoImage(article.coverImage)
          ? resolveThematicCoverForProject(article.relatedProjectId, article.title).url
          : article.coverImage
      ],
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
    let items: StoredBlogArticle[] = snap.docs.map((d) => {
      const data = d.data() as any;
      const article: StoredBlogArticle = { id: d.id, ...data };
      if (isInvalidOrLogoImage(article.coverImage)) {
        const thematic = resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category);
        article.coverImage = thematic.url;
        article.coverAlt = article.coverAlt || thematic.alt;
        try {
          db.collection(COLLECTIONS.blogArticles).doc(d.id).set({
            coverImage: thematic.url,
            coverAlt: article.coverAlt,
            updatedAt: nowIso()
          }, { merge: true }).catch(() => {});
        } catch {}
      }
      return article;
    });

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
    if (publishedDoc) {
      const article: StoredBlogArticle = { id: publishedDoc.id, ...(publishedDoc.data() as any) };
      if (isInvalidOrLogoImage(article.coverImage)) {
        const thematic = resolveThematicCoverForProject(article.relatedProjectId, article.title, article.slug, article.id, article.category);
        article.coverImage = thematic.url;
        article.coverAlt = article.coverAlt || thematic.alt;
        try {
          firestore().collection(COLLECTIONS.blogArticles).doc(publishedDoc.id).set({
            coverImage: thematic.url,
            coverAlt: article.coverAlt,
            updatedAt: nowIso()
          }, { merge: true }).catch(() => {});
        } catch {}
      }
      return article;
    }
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
      theme: 'Imagem editorial temática original para o artigo "' + String(parsed.title || topic) + '". Contexto: ' + project.name + '. Palavra-chave principal: ' + primaryKeyword + '. Sem logotipos, sem marcas d\'água, sem texto sobre a foto. Fotografia de altíssima qualidade de acordo com o nicho.',
      style: 'Fotografia editorial premium, realista, rica em detalhes, iluminação cinematográfica, relevante ao nicho do artigo e sem logotipos',
      aspectRatio: '16:9',
      resolution: '1K'
    });
    if (generatedCover?.imageUrl && !isInvalidOrLogoImage(generatedCover.imageUrl)) {
      coverImage = generatedCover.imageUrl;
      coverImageStoragePath = generatedCover.storagePath;
      coverImageGenerated = true;
    }
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
    coverAlt: safeString(coverAlt || parsed.coverAlt || 'Imagem editorial temática sobre ' + primaryKeyword, 240),
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
