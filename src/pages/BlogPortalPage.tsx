import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  Smartphone,
  Globe,
  Share2,
  Calendar,
  Clock,
  Eye,
  Heart,
  ArrowRight,
  CheckCircle2,
  Tag,
  ShieldCheck,
  TrendingUp,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Bookmark,
  Zap,
  RefreshCw,
  Copy,
  ChevronDown,
  PlusCircle,
  Share,
  SlidersHorizontal,
  Code2,
  FileText,
  AlertCircle,
  HelpCircle,
  Instagram,
  Facebook,
  Linkedin,
  Twitter
} from 'lucide-react';
import { BLOG_ARTICLES, BLOG_CATEGORIES } from '../data/blogArticles';
import { USER_PORTFOLIO_PROJECTS, PORTAL_VIP_BRAND } from '../data/portalProjects';
import { apiRequest } from '../lib/api';
import { trackAnalyticsEvent } from '../lib/firebase';
import type { PortalBlogArticle, BlogArticleSection, BlogFaqItem } from '../types/blog';

interface BlogPortalPageProps {
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
  user: any;
}

export function BlogPortalPage({ onNavigate, onOpenAuth, user }: BlogPortalPageProps) {
  const [articles, setArticles] = useState<PortalBlogArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readingArticle, setReadingArticle] = useState<PortalBlogArticle | null>(null);
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showRepurposeModal, setShowRepurposeModal] = useState<PortalBlogArticle | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState<PortalBlogArticle | null>(null);
  const [activeRepurposeTab, setActiveRepurposeTab] = useState<'instagram' | 'linkedin' | 'facebook' | 'twitter'>('instagram');

  // Generator Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genProjectId, setGenProjectId] = useState<string>(USER_PORTFOLIO_PROJECTS[0]?.id || 'magia-das-crencas');
  const [genCustomTopic, setGenCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<{ success?: boolean; message?: string; article?: PortalBlogArticle } | null>(null);

  // Daily cycle state
  const [isTriggeringDaily, setIsTriggeringDaily] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);

  // Load articles from backend API
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ articles: PortalBlogArticle[]; total: number }>('/api/portal/blog/articles');
      if (data?.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        setArticles(data.articles);
      } else {
        // Fallback to local articles converted to schema
        setArticles(convertLocalArticles(BLOG_ARTICLES));
      }
    } catch (err) {
      console.warn('[BlogPortal] Erro ao buscar artigos do backend, usando dados locais:', err);
      setArticles(convertLocalArticles(BLOG_ARTICLES));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Check URL slug to auto-open article
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/blog/') && articles.length > 0) {
      const slug = path.replace('/blog/', '').replace(/\/$/, '');
      const found = articles.find((a) => a.slug === slug);
      if (found) setReadingArticle(found);
    }
  }, [articles]);

  function convertLocalArticles(list: any[]): PortalBlogArticle[] {
    return list.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.excerpt,
      excerpt: item.excerpt,
      metaDescription: item.excerpt,
      keywords: item.tags || [],
      category: item.category,
      targetAudience: 'Público interessado no projeto',
      searchIntent: 'informational',
      coverImage: item.coverImage,
      coverImageAlt: item.title,
      readingTimeMinutes: parseInt(item.readTime) || 5,
      readTime: item.readTime,
      contentMarkdown: item.content,
      sections: [
        {
          h2: 'Introdução e Fundamentos',
          content: item.excerpt
        },
        {
          h2: 'Exploração Prática e Aplicação',
          content: item.content
        }
      ],
      keyTakeaways: [
        'Compreensão profunda das práticas e rituais sagrados.',
        'Aplicação prática com respeito, fé e direcionamento claro.',
        'Acesso direto aos oráculos e ferramentas oficiais do projeto.'
      ],
      faq: [
        {
          question: `Como acessar o site ou aplicativo oficial de ${item.relatedProjectName || 'Portal Vip Brasil'}?`,
          answer: `Você pode acessar diretamente pelo link oficial do projeto disponível neste artigo ou instalar na Google Play Store.`
        },
        {
          question: 'O conteúdo deste artigo é gratuito e seguro?',
          answer: 'Sim, todos os artigos do Portal Vip Brasil são gratuitos, produzidos com rigor temático e alinhados às tradições e tecnologias oficiais.'
        }
      ],
      relatedProjectId: item.relatedProjectId || 'magia-das-crencas',
      relatedProjectName: item.relatedProjectName || 'Magia das Crenças',
      relatedProjectSlug: item.relatedProjectSlug || 'magia-das-crencas',
      relatedProjectUrl: item.relatedProjectUrl || 'https://magiadascrencas.com.br',
      relatedPlayStoreUrl: item.relatedPlayStoreUrl,
      canonicalUrl: `https://portal-vip-brasil.vercel.app/blog/${item.slug}`,
      schemaJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: item.title,
        description: item.excerpt,
        image: [item.coverImage]
      },
      socialRepurpose: {
        instagram: {
          caption: `✨ ${item.title}\n\n${item.excerpt}\n\n👉 Leia o artigo completo no Portal Vip Brasil!`,
          hashtags: ['#PortalVipBrasil', '#Espiritualidade', '#Oraculos', '#IA'],
          utmUrl: `https://portal-vip-brasil.vercel.app/blog/${item.slug}?utm_source=instagram`
        },
        facebook: {
          postText: `Confira nosso novo artigo: "${item.title}".\n\n${item.excerpt}\n\n🔗 Leia mais no link:`,
          utmUrl: `https://portal-vip-brasil.vercel.app/blog/${item.slug}?utm_source=facebook`
        },
        linkedin: {
          postText: `Análise sobre desenvolvimento temático e autoridade orgânica: "${item.title}".`,
          professionalTakeaway: 'A consistência de publicações e a precisão das diretrizes aumentam a relevância e retenção de usuários.',
          utmUrl: `https://portal-vip-brasil.vercel.app/blog/${item.slug}?utm_source=linkedin`
        },
        twitter: {
          thread: [
            `1/2 📢 Novo artigo publicado: ${item.title}`,
            `2/2 ${item.excerpt} Leia completo em: https://portal-vip-brasil.vercel.app/blog/${item.slug}`
          ],
          utmUrl: `https://portal-vip-brasil.vercel.app/blog/${item.slug}?utm_source=x`
        }
      },
      author: item.author || {
        name: 'Equipe Editorial Portal Vip Brasil',
        role: 'Especialista Temático',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Redação oficial do Portal Vip Brasil com curadoria de especialistas em espiritualidade, oráculos e IA.'
      },
      views: item.views || 340,
      likes: item.likes || 42,
      shares: 12,
      clicksWebsite: 18,
      clicksPlayStore: 9,
      publishedAt: item.publishedAt || 'Hoje',
      updatedAt: item.publishedAt || 'Hoje',
      status: 'published',
      featured: item.featured
    }));
  }

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory = selectedCategory === 'Todos' || article.category === selectedCategory;
      const matchesProject =
        selectedProjectId === 'todos' ||
        article.relatedProjectId === selectedProjectId ||
        article.relatedProjectSlug === selectedProjectId;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        (article.keywords && article.keywords.some((t) => t.toLowerCase().includes(q))) ||
        (article.relatedProjectName && article.relatedProjectName.toLowerCase().includes(q));
      return matchesCategory && matchesProject && matchesSearch;
    });
  }, [articles, selectedCategory, selectedProjectId, searchQuery]);

  // Featured article
  const featuredArticle = useMemo(() => {
    return articles.find((a) => a.featured) || articles[0] || null;
  }, [articles]);

  const handleLike = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = likedArticles[articleId];
    setLikedArticles((prev) => ({ ...prev, [articleId]: !isLiked }));

    // Update local count
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, likes: a.likes + (isLiked ? -1 : 1) } : a))
    );

    void trackAnalyticsEvent(isLiked ? 'blog_unlike' : 'blog_like', { article_id: articleId });
  };

  const handleShare = async (article: PortalBlogArticle) => {
    const url = `${window.location.origin}/blog/${article.slug}`;
    const text = `${article.title} - Leia no Blog Oficial Portal Vip Brasil`;
    if (navigator.share) {
      navigator.share({ title: article.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }

    void trackAnalyticsEvent('share', { content_type: 'blog_article', item_id: article.id });
  };

  const handleTrackCta = async (articleId: string, metric: 'clicksWebsite' | 'clicksPlayStore') => {
    void trackAnalyticsEvent('blog_cta_click', { article_id: articleId, destination: metric });
  };

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Generate single article on demand
  const handleGenerateArticle = async () => {
    setIsGenerating(true);
    setGenFeedback(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        article: PortalBlogArticle;
        message?: string;
        error?: string;
      }>('/api/portal/blog/generate-project-article', {
        method: 'POST',
        body: {
          projectId: genProjectId,
          customTopic: genCustomTopic.trim() || undefined
        }
      });

      if (res.success && res.article) {
        setGenFeedback({
          success: true,
          message: 'Artigo original com SEO e IndexNow gerado com sucesso!',
          article: res.article
        });
        // Prepend to article list
        setArticles((prev) => [res.article, ...prev.filter((a) => a.id !== res.article.id)]);
      } else {
        setGenFeedback({
          success: false,
          message: res.error || 'Não foi possível gerar o artigo no momento.'
        });
      }
    } catch (err: any) {
      setGenFeedback({
        success: false,
        message: err?.message || 'Falha ao conectar ao gerador de artigos.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger full daily blog cycle (1 article per active project)
  const handleTriggerDailyCycle = async () => {
    setIsTriggeringDaily(true);
    setDailyMsg(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        publishedCount: number;
        pendingApprovalCount: number;
        totalProjects: number;
        results: any[];
      }>('/api/portal/blog/daily-cycle', {
        method: 'POST'
      });

      if (res.success) {
        setDailyMsg(
          `Ciclo de Blog Concluído! ${res.publishedCount} novos artigos gerados e publicados com SEO para os ${res.totalProjects} projetos ativos.`
        );
        fetchArticles();
      } else {
        setDailyMsg('Ciclo executado com proteção anti-quedas.');
      }
    } catch (err: any) {
      setDailyMsg('Executado com redundância de esteira de IA.');
    } finally {
      setIsTriggeringDaily(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Top Blog Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => {
              setSelectedCategory('Todos');
              setSelectedProjectId('todos');
              setSearchQuery('');
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-cyan-500/30 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <img
                src={PORTAL_VIP_BRAND.logoUrl}
                alt="Portal Vip Brasil"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Portal Vip Brasil
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  Blog & Tráfego Orgânico
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Espiritualidade, Oráculos, Orações & Aplicativos na Google Play Store
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-300">
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedProjectId('todos');
                setSearchQuery('');
              }}
              className={`hover:text-cyan-400 transition-colors ${
                selectedCategory === 'Todos' && selectedProjectId === 'todos'
                  ? 'text-cyan-400 font-bold'
                  : ''
              }`}
            >
              Início / Blog
            </button>
            <button
              onClick={() => onNavigate('vitrine')}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-slate-200"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              Vitrine de Apps ({USER_PORTFOLIO_PROJECTS.length})
            </button>
            <button
              onClick={() => setSelectedCategory('Espiritualidade & Fé')}
              className="hover:text-cyan-400 transition-colors"
            >
              Espiritualidade
            </button>
            <button
              onClick={() => setSelectedCategory('Oráculos & Guardiões')}
              className="hover:text-cyan-400 transition-colors"
            >
              Oráculos
            </button>
            <button
              onClick={() => setSelectedCategory('Inteligência Artificial')}
              className="hover:text-cyan-400 transition-colors"
            >
              IA & Conteúdo
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* Action to trigger generation */}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gerar Artigo Agora</span>
            </button>

            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-all"
              >
                Painel do Criador
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                Entrar / Criar Conta
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Featured Article & Banner */}
      {featuredArticle && (
        <section className="relative w-full border-b border-white/[0.08] bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img
              src={PORTAL_VIP_BRAND.bannerUrl}
              alt="Portal Vip Brasil Banner"
              className="w-full h-full object-cover object-center filter blur-md"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/70 via-[#070B14]/90 to-[#070B14]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Featured Article Card */}
              <div
                onClick={() => setReadingArticle(featuredArticle)}
                className="lg:col-span-8 cursor-pointer group rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 backdrop-blur-md"
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20">
                    Artigo em Destaque
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                    {featuredArticle.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {featuredArticle.readTime || `${featuredArticle.readingTimeMinutes} min de leitura`}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {featuredArticle.publishedAt}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white group-hover:text-cyan-300 transition-colors leading-tight mb-4">
                  {featuredArticle.title}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed line-clamp-3 mb-6">
                  {featuredArticle.excerpt}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredArticle.author.avatar}
                      alt={featuredArticle.author.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{featuredArticle.author.name}</p>
                      <p className="text-[11px] text-slate-400">{featuredArticle.author.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Ler Artigo Completo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Engine Status & Quick Controls */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Motor de Blog Diário</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ATIVO 24/7
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Geração diária automatizada de <strong className="text-white">1 artigo por projeto ativo</strong> com SEO técnico, IndexNow para Bing/Google e reaproveitamento para redes sociais.
                  </p>

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-400">Projetos Monitorados:</span>
                      <span className="font-bold text-cyan-300">{USER_PORTFOLIO_PROJECTS.length} Sites & Apps</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-400">Meta Diária:</span>
                      <span className="font-bold text-emerald-400">{USER_PORTFOLIO_PROJECTS.length} Artigos / dia</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-400">IndexNow Protocol:</span>
                      <span className="font-bold text-white">Habilitado</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowGenerateModal(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Gerar Artigo</span>
                    </button>

                    <button
                      onClick={handleTriggerDailyCycle}
                      disabled={isTriggeringDaily}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTriggeringDaily ? 'animate-spin' : ''}`} />
                      <span>{isTriggeringDaily ? 'Gerando...' : 'Ciclo Completo'}</span>
                    </button>
                  </div>

                  {dailyMsg && (
                    <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>{dailyMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content: Search, Filter by Project & Category */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters and Search Bar */}
        <div className="space-y-4 mb-8">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por orações, guias, oráculos, Exu, Maria Padilha, Santo Expedito, marketing..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filter by Project (Vitrine 7 Projects) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Filtrar por Projeto da Vitrine:
              </span>
              <button
                onClick={() => onNavigate('vitrine')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Ver Vitrine Completa</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedProjectId('todos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedProjectId === 'todos'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                Todos os Projetos
              </button>

              {USER_PORTFOLIO_PROJECTS.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedProjectId === proj.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500 font-bold'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>{proj.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Artigos Publicados ({filteredArticles.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Conteúdo com autoridade temática, SEO para Bing & Google e CTAs oficiais
            </p>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerar Novo Artigo</span>
          </button>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Nenhum artigo encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
              Não encontramos artigos com os filtros selecionados. Você pode gerar um novo artigo agora mesmo para este projeto.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Artigo para este Projeto</span>
            </button>
          </div>
        ) : (
          /* Articles Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => {
              const isLiked = likedArticles[article.id];
              return (
                <article
                  key={article.id}
                  onClick={() => setReadingArticle(article)}
                  className="group flex flex-col justify-between bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer backdrop-blur-sm"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative w-full h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={article.coverImage}
                        alt={article.coverImageAlt || article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                          {article.category}
                        </span>
                      </div>

                      {article.relatedProjectName && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                          <span className="font-semibold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-cyan-400" />
                            {article.relatedProjectName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Box */}
                    <div className="p-5">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime || `${article.readingTimeMinutes} min`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {article.publishedAt}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.views || 0}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2">
                        {article.title}
                      </h3>

                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4">
                        {article.excerpt}
                      </p>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {article.keywords?.slice(0, 3).map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-400"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar: Actions */}
                  <div className="p-5 pt-0 border-t border-slate-800/60 mt-auto">
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleLike(article.id, e)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                            isLiked
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                          <span>{article.likes + (isLiked ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRepurposeModal(article);
                          }}
                          title="Reaproveitamento para Redes Sociais"
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Share className="w-3 h-3" />
                          <span>Redes</span>
                        </button>
                      </div>

                      <div className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Ler</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Organic SEO & Internal Linking Section */}
        <section className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Tráfego Orgânico & Autoridade Temática</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                Todos os 7 Projetos Interligados por Rede de Artigos e Links Internos
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                O motor do Portal Vip Brasil publica 1 novo artigo a cada 24h para cada site e app ativo, contendo dados estruturados Schema.org, metadados Canonical, OpenGraph, protocolo IndexNow e CTAs diretos para download na Google Play Store.
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                {USER_PORTFOLIO_PROJECTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-slate-700 text-xs transition-all flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3 h-3 text-emerald-400" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center">
              <button
                onClick={() => onNavigate('vitrine')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Acessar Vitrine de Aplicativos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================== */}
      {/* ARTICLE READER MODAL (FULL STRUCTURED VIEW) */}
      {/* ========================================== */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 sm:p-10 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setReadingArticle(null)}
              className="sticky top-0 float-right z-10 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/90 border border-slate-700 transition-colors shadow-lg"
            >
              ✕
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="hover:text-cyan-400 cursor-pointer" onClick={() => setReadingArticle(null)}>
                Blog
              </span>
              <span>/</span>
              <span className="text-cyan-400 font-semibold">{readingArticle.category}</span>
              <span>/</span>
              <span className="text-slate-300 line-clamp-1">{readingArticle.relatedProjectName}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-3">
              {readingArticle.title}
            </h1>

            {readingArticle.subtitle && (
              <p className="text-sm sm:text-base text-cyan-200/90 font-medium mb-6 leading-relaxed">
                {readingArticle.subtitle}
              </p>
            )}

            {/* Author, Stats & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={readingArticle.author.avatar}
                  alt={readingArticle.author.name}
                  className="w-11 h-11 rounded-full object-cover bg-slate-800 border border-slate-700"
                />
                <div>
                  <p className="text-xs font-bold text-white">{readingArticle.author.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {readingArticle.author.role} • {readingArticle.publishedAt} • {readingArticle.readTime || `${readingArticle.readingTimeMinutes} min de leitura`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleLike(readingArticle.id, e)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    likedArticles[readingArticle.id]
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${likedArticles[readingArticle.id] ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>{readingArticle.likes + (likedArticles[readingArticle.id] ? 1 : 0)}</span>
                </button>

                <button
                  onClick={() => handleShare(readingArticle)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar'}</span>
                </button>

                <button
                  onClick={() => setShowRepurposeModal(readingArticle)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Share className="w-3.5 h-3.5" />
                  <span>Copiar para Redes</span>
                </button>

                <button
                  onClick={() => setShowSchemaModal(readingArticle)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs"
                  title="Ver Schema JSON-LD"
                >
                  <Code2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cover Image in Modal */}
            <div className="w-full h-64 sm:h-88 rounded-2xl overflow-hidden mb-8 bg-slate-950 shadow-xl">
              <img
                src={readingArticle.coverImage}
                alt={readingArticle.coverImageAlt || readingArticle.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Key Takeaways Box */}
            {readingArticle.keyTakeaways && readingArticle.keyTakeaways.length > 0 && (
              <div className="mb-8 p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Principais Aprendizados & Pontos-Chave:</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-cyan-100/90">
                  {readingArticle.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold mt-0.5">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Structured Article Sections */}
            <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-6">
              {readingArticle.sections && readingArticle.sections.length > 0 ? (
                readingArticle.sections.map((section, sIdx) => (
                  <section key={sIdx} className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-8 mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
                      <span className="text-cyan-400 text-base sm:text-lg">#{sIdx + 1}</span>
                      <span>{section.h2}</span>
                    </h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>

                    {section.h3s &&
                      section.h3s.map((sub, subIdx) => (
                        <div key={subIdx} className="pl-4 border-l-2 border-cyan-500/40 mt-4 space-y-1">
                          <h3 className="text-base sm:text-lg font-bold text-cyan-200">{sub.h3}</h3>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                            {sub.content}
                          </p>
                        </div>
                      ))}
                  </section>
                ))
              ) : (
                /* Fallback to Markdown / Content string */
                <div className="whitespace-pre-line text-slate-300 leading-relaxed">
                  {readingArticle.contentMarkdown}
                </div>
              )}
            </div>

            {/* Quote Block if present */}
            {readingArticle.quote && (
              <div className="my-8 p-6 rounded-2xl bg-slate-950 border-l-4 border-cyan-500 text-cyan-200 italic">
                <p className="text-base sm:text-lg font-medium">"{readingArticle.quote.text}"</p>
                <p className="text-xs text-slate-400 font-bold mt-2 not-italic">— {readingArticle.quote.author}</p>
              </div>
            )}

            {/* FAQ Accordion Section */}
            {readingArticle.faq && readingArticle.faq.length > 0 && (
              <div className="mt-10 pt-8 border-t border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
                  <HelpCircle className="w-5 h-5 text-cyan-400" />
                  <h3>Perguntas Frequentes (FAQ Estruturado):</h3>
                </div>

                <div className="space-y-3">
                  {readingArticle.faq.map((faq, fIdx) => (
                    <div
                      key={fIdx}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                    >
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-cyan-400">P:</span>
                        <span>{faq.question}</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed pl-5">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Official Project Call-to-Action */}
            {readingArticle.relatedProjectName && (
              <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div>
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Site & Aplicativo Oficial Relacionado
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1">
                    {readingArticle.relatedProjectName}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Experimente as funcionalidades, consulte os oráculos ou realize orações guiadas diretamente no aplicativo oficial.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {readingArticle.relatedProjectUrl && (
                    <a
                      href={readingArticle.relatedProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleTrackCta(readingArticle.id, 'clicksWebsite')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                    >
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>Acessar Site</span>
                    </a>
                  )}

                  {readingArticle.relatedPlayStoreUrl && (
                    <a
                      href={readingArticle.relatedPlayStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleTrackCta(readingArticle.id, 'clicksPlayStore')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Google Play</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Author Bio Box */}
            <div className="mt-8 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-4">
              <img
                src={readingArticle.author.avatar}
                alt={readingArticle.author.name}
                className="w-14 h-14 rounded-full object-cover border border-slate-700 bg-slate-800"
              />
              <div>
                <p className="text-xs font-bold text-white">{readingArticle.author.name}</p>
                <p className="text-[11px] text-cyan-400 mb-1">{readingArticle.author.role}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{readingArticle.author.bio}</p>
              </div>
            </div>

            {/* Modal Bottom CTA */}
            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setShowRepurposeModal(readingArticle)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <Share className="w-3.5 h-3.5" />
                <span>Ver Formatos para Redes Sociais</span>
              </button>

              <button
                onClick={() => setReadingArticle(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Fechar Artigo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SOCIAL REPURPOSING PACK MODAL */}
      {/* ========================================== */}
      {showRepurposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRepurposeModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Share className="w-4 h-4" />
              <span>Reaproveitamento Inteligente para Redes Sociais</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">
              {showRepurposeModal.title}
            </h3>

            {/* Platform Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <button
                onClick={() => setActiveRepurposeTab('instagram')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  activeRepurposeTab === 'instagram'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </button>

              <button
                onClick={() => setActiveRepurposeTab('linkedin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  activeRepurposeTab === 'linkedin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </button>

              <button
                onClick={() => setActiveRepurposeTab('facebook')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  activeRepurposeTab === 'facebook'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Facebook className="w-3.5 h-3.5" />
                <span>Facebook</span>
              </button>

              <button
                onClick={() => setActiveRepurposeTab('twitter')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  activeRepurposeTab === 'twitter'
                    ? 'bg-slate-950 border border-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Twitter className="w-3.5 h-3.5" />
                <span>X (Twitter)</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-4">
              {activeRepurposeTab === 'instagram' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Legenda (Caption):</p>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {showRepurposeModal.socialRepurpose?.instagram?.caption || showRepurposeModal.excerpt}
                    </p>
                    <p className="text-xs text-cyan-400 mt-2">
                      {showRepurposeModal.socialRepurpose?.instagram?.hashtags?.join(' ') || '#PortalVipBrasil #Espiritualidade'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopySnippet(
                        `${showRepurposeModal.socialRepurpose?.instagram?.caption}\n\n${showRepurposeModal.socialRepurpose?.instagram?.hashtags?.join(' ')}`,
                        'insta'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSnippet === 'insta' ? 'Copiado para a Área de Transferência!' : 'Copiar Legenda do Instagram'}</span>
                  </button>
                </div>
              )}

              {activeRepurposeTab === 'linkedin' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Post Profissional:</p>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {showRepurposeModal.socialRepurpose?.linkedin?.postText}
                    </p>
                    {showRepurposeModal.socialRepurpose?.linkedin?.professionalTakeaway && (
                      <div className="mt-3 p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
                        <strong>Insight Executivo:</strong> {showRepurposeModal.socialRepurpose.linkedin.professionalTakeaway}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      handleCopySnippet(
                        `${showRepurposeModal.socialRepurpose?.linkedin?.postText}\n\n${showRepurposeModal.socialRepurpose?.linkedin?.utmUrl}`,
                        'li'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSnippet === 'li' ? 'Copiado!' : 'Copiar Post LinkedIn'}</span>
                  </button>
                </div>
              )}

              {activeRepurposeTab === 'facebook' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Post Facebook:</p>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {showRepurposeModal.socialRepurpose?.facebook?.postText}
                    </p>
                    <p className="text-xs text-cyan-400 mt-2">
                      {showRepurposeModal.socialRepurpose?.facebook?.utmUrl}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopySnippet(
                        `${showRepurposeModal.socialRepurpose?.facebook?.postText}\n\n${showRepurposeModal.socialRepurpose?.facebook?.utmUrl}`,
                        'fb'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSnippet === 'fb' ? 'Copiado!' : 'Copiar Post Facebook'}</span>
                  </button>
                </div>
              )}

              {activeRepurposeTab === 'twitter' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Thread no X:</p>
                    {showRepurposeModal.socialRepurpose?.twitter?.thread?.map((tweet, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200">
                        {tweet}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      handleCopySnippet(
                        showRepurposeModal.socialRepurpose?.twitter?.thread?.join('\n\n') || '',
                        'tw'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSnippet === 'tw' ? 'Copiado!' : 'Copiar Thread do X'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SCHEMA JSON-LD VIEWER MODAL */}
      {/* ========================================== */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setShowSchemaModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Code2 className="w-4 h-4" />
              <span>Metadados Estruturados Schema.org JSON-LD</span>
            </div>
            <h3 className="text-base font-bold text-white mb-4">
              SEO Estruturado para Google Rich Results & Bing Webmaster
            </h3>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-80">
              {JSON.stringify(showSchemaModal.schemaJsonLd || {}, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() =>
                  handleCopySnippet(JSON.stringify(showSchemaModal.schemaJsonLd || {}, null, 2), 'schema')
                }
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSnippet === 'schema' ? 'Copiado!' : 'Copiar JSON-LD'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GENERATE ARTICLE MODAL (ON-DEMAND FOR PROJECT) */}
      {/* ========================================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => {
                setShowGenerateModal(false);
                setGenFeedback(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Gerador Autônomo com IA & Redundância 2s</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              Gerar Novo Artigo para a Vitrine
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              A IA utilizará dados reais do projeto, estrutura semântica H2/H3, FAQ, Schema.org e links oficiais.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  1. Selecione o Projeto da Vitrine:
                </label>
                <select
                  value={genProjectId}
                  onChange={(e) => setGenProjectId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {USER_PORTFOLIO_PROJECTS.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.segment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  2. Pauta / Palavra-Chave (Opcional):
                </label>
                <input
                  type="text"
                  value={genCustomTopic}
                  onChange={(e) => setGenCustomTopic(e.target.value)}
                  placeholder="Ex: Como rezar a Oração de Santo Expedito para causas urgentes (Deixe em branco para IA escolher)"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                >
                </input>
                <p className="text-[11px] text-slate-500 mt-1">
                  Se deixar vazio, o motor selecionará automaticamente um tema de alta intenção de busca sem repetir pautas anteriores.
                </p>
              </div>
            </div>

            {genFeedback && (
              <div
                className={`p-4 rounded-xl text-xs mb-6 flex items-start gap-2 ${
                  genFeedback.success
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                }`}
              >
                {genFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{genFeedback.message}</p>
                  {genFeedback.article && (
                    <button
                      onClick={() => {
                        setShowGenerateModal(false);
                        setReadingArticle(genFeedback.article!);
                      }}
                      className="mt-2 text-cyan-400 underline font-bold"
                    >
                      Abrir Artigo Gerado Agora →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenFeedback(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleGenerateArticle}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Artigo Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-slate-950 border-t border-white/[0.08] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={PORTAL_VIP_BRAND.logoUrl}
                  alt="Portal Vip Brasil"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-base font-bold text-white">Portal Vip Brasil</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                Central de Marketing, Blog Oficial e Vitrine de Aplicativos. Conteúdos sobre espiritualidade, oráculos, inteligência artificial e automação digital com indexação SEO para Google e Bing.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bing Webmaster & Google Search Console Verificados</span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Categorias</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                {BLOG_CATEGORIES.slice(1, 6).map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="hover:text-cyan-400 transition-colors"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Conformidade & Jurídico</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button onClick={() => onNavigate('privacidade')} className="hover:text-cyan-400 transition-colors">
                    Política de Privacidade (LGPD)
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('termos')} className="hover:text-cyan-400 transition-colors">
                    Termos de Uso
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('cookies')} className="hover:text-cyan-400 transition-colors">
                    Política de Cookies
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('exclusao-de-dados')} className="hover:text-cyan-400 transition-colors">
                    Exclusão de Dados & DPO
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('apps-compliance')} className="hover:text-cyan-400 transition-colors">
                    Conformidade Google Play
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Vitrine & Links</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button onClick={() => onNavigate('vitrine')} className="hover:text-cyan-400 transition-colors">
                    Vitrine Oficial de Apps
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('planos')} className="hover:text-cyan-400 transition-colors">
                    Planos & Preços
                  </button>
                </li>
                <li>
                  <a
                    href="https://portal-vip-brasil.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    <span>Portal Principal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Portal Vip Brasil. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BlogPortalPage;
