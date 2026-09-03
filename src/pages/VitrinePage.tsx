import React, { useState } from 'react';
import {
  ExternalLink,
  Globe,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Search,
  Share2,
  CheckCircle2,
  Layers,
  Zap,
  TrendingUp,
  Tag,
  ArrowRight,
  Cpu,
  RefreshCw,
  Copy
} from 'lucide-react';
import { USER_PORTFOLIO_PROJECTS, PORTAL_VIP_BRAND, PortalProject } from '../data/portalProjects';
import { BRAND } from '../lib/brand';
import { apiRequest } from '../lib/api';

interface VitrinePageProps {
  onNavigate?: (tab: string) => void;
}

export function VitrinePage({ onNavigate }: VitrinePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProjectModal, setActiveProjectModal] = useState<PortalProject | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTriggeringDaily, setIsTriggeringDaily] = useState<boolean>(false);
  const [dailyStatusMessage, setDailyStatusMessage] = useState<string | null>(null);

  const categories = ['todos', 'Espiritualidade & Devoção', 'Oráculos & Guardiões', 'Amor & Atração Magnética', 'Tradição Católica & Fé', 'Inteligência Artificial & Conteúdo', 'Tarot & Cartomancia', 'Automação & Redes Sociais'];

  const filteredProjects = USER_PORTFOLIO_PROJECTS.filter((project) => {
    const matchesCategory = selectedCategory === 'todos' || project.category === selectedCategory;
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleTriggerDailyPulse = async () => {
    setIsTriggeringDaily(true);
    setDailyStatusMessage(null);
    try {
      const res = await apiRequest<{ success: boolean; publishedCount: number; itemsGenerated: any[] }>('/api/portal/daily-pulse', {
        method: 'POST'
      });
      if (res.success) {
        setDailyStatusMessage(`Sucesso! ${res.publishedCount} publicações geradas e programadas com SEO para redes sociais.`);
      }
    } catch (err: any) {
      setDailyStatusMessage(`Falha: ${err?.message || 'o ciclo diário não foi confirmado pelo backend.'}`);
    } finally {
      setIsTriggeringDaily(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 pb-20 selection:bg-cyan-500 selection:text-black">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate?.('home')}>
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/30 p-1 flex items-center justify-center">
              <img
                src={PORTAL_VIP_BRAND.logoUrl}
                alt="Portal Vip Brasil"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-black text-white">
              Portal Vip <span className="text-cyan-400">Brasil</span>
            </span>
          </div>

          <nav className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => onNavigate?.('home')}
              className="text-slate-300 hover:text-cyan-400 transition-colors"
            >
              ← Voltar ao Blog
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              Central de Marketing
            </button>
          </nav>
        </div>
      </header>

      {/* Top Banner / Capa Oficial */}
      <div className="relative w-full overflow-hidden border-b border-cyan-500/20 bg-slate-950">
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src={PORTAL_VIP_BRAND.bannerUrl}
            alt="Portal Vip Brasil Banner"
            className="w-full h-full object-cover object-center filter blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/80 via-[#070B14]/90 to-[#070B14]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-5 text-left">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 p-2 shadow-2xl shadow-cyan-500/10 flex-shrink-0 flex items-center justify-center">
                <img
                  src={PORTAL_VIP_BRAND.logoUrl}
                  alt="Portal Vip Brasil Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Vitrine Oficial de Projetos & Marketing
                  </span>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Bing & Google SEO Indexado
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                  Portal Vip Brasil
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  Central de divulgação, vitrine oficial de sites e aplicativos da Play Store com automação diária de marketing e inteligência artificial de alta disponibilidade.
                </p>
              </div>
            </div>

            {/* Quick Action Box: Automação Diária */}
            <div className="w-full md:w-auto flex-shrink-0 bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col items-start gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Automação Diária de Marketing (1x/dia)</span>
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                A IA seleciona cada site da vitrine e gera publicações de fotos, vídeos e SEO para as redes sociais.
              </p>
              <button
                onClick={handleTriggerDailyPulse}
                disabled={isTriggeringDaily}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isTriggeringDaily ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Gerando Divulgação...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    Disparar Divulgação Agora
                  </>
                )}
              </button>
              {dailyStatusMessage && (
                <div className={`text-[11px] px-3 py-1.5 rounded-lg w-full border ${
                  dailyStatusMessage.startsWith('Falha:')
                    ? 'text-rose-300 bg-rose-950/40 border-rose-500/30'
                    : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                }`}>
                  {dailyStatusMessage}
                </div>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar projeto, palavra-chave ou app..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat === 'todos' ? 'Todos os Projetos' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Projetos / Vitrine */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">
              Vitrine de Sites & Aplicativos ({filteredProjects.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            SEO Otimizado para Bing Webmaster & Google Search
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 backdrop-blur-sm"
            >
              <div>
                {/* Header Card: Badges + App Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                    {project.category}
                  </span>
                  {project.hasApp ? (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      App Play Store
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      Web App
                    </span>
                  )}
                </div>

                {/* Project Title & Tagline */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-cyan-500/20 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <img
                      src={project.logoUrl}
                      alt={project.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{project.segment}</p>
                  </div>
                </div>

                <p className="text-xs italic text-cyan-200/80 mb-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                  "{project.tagline}"
                </p>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4">
                  {project.description}
                </p>

                {/* Highlights */}
                <div className="space-y-1.5 mb-5">
                  {project.highlights.slice(0, 3).map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="line-clamp-1">{hl}</span>
                    </div>
                  ))}
                </div>

                {/* Keywords Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {project.keywords.slice(0, 4).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-950 border border-slate-800 text-slate-400"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all border border-slate-700 hover:border-cyan-500"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Acessar Site</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  {project.hasApp && project.playStoreUrl ? (
                    <a
                      href={project.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl transition-all border border-emerald-500/40 hover:border-emerald-400"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Play Store</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </a>
                  ) : (
                    <button
                      onClick={() => setActiveProjectModal(project)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl transition-all border border-slate-700"
                    >
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ver Detalhes</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCopy(project.websiteUrl, project.id)}
                    className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedId === project.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Link Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveProjectModal(project)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <span>SEO & Redes</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info Box: SEO & Bing / Redundância Anti-Quedas */}
        <div className="mt-14 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">SEO Bing & Google Avançado</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Todos os 7 sites e aplicativos contam com metadados estruturados Schema.org, OpenGraph, Canonical e Sitemap integrado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Proteção Anti-Quedas (2s)</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Failover contínuo entre os modelos Gemini 3.7, 3.6 e 3.5 com latência controlada e garantia de resposta sem interrupções.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Publicação 1x ao Dia</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  A IA analisa seu portfólio diariamente e programa posts de fotos, vídeos e copys magnéticas em todas as redes sociais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Projeto */}
      {activeProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setActiveProjectModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-cyan-500/30 p-2 flex items-center justify-center">
                <img
                  src={activeProjectModal.logoUrl}
                  alt={activeProjectModal.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {activeProjectModal.category}
                </span>
                <h3 className="text-2xl font-black text-white mt-1">{activeProjectModal.name}</h3>
                <p className="text-xs text-slate-400">{activeProjectModal.segment}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">Descrição Completa:</h4>
                <p className="leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {activeProjectModal.description}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">Ângulos de Marketing para Redes Sociais:</h4>
                <ul className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {activeProjectModal.socialMarketingAngles.map((angle, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">Palavras-chave SEO (Bing & Google):</h4>
                <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {activeProjectModal.bingSeoKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/40 text-[11px]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <a
                  href={activeProjectModal.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all"
                >
                  <Globe className="w-4 h-4" />
                  <span>Acessar Website Oficial</span>
                </a>

                {activeProjectModal.hasApp && activeProjectModal.playStoreUrl && (
                  <a
                    href={activeProjectModal.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Baixar na Play Store</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Footer Institucional e Jurídico */}
      <footer className="mt-16 pt-10 border-t border-slate-800 text-slate-400">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">{BRAND.name}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Central oficial de projetos, vitrine de aplicativos da Google Play Store, sabedoria ancestral, tecnologia e automação de marketing digital em conformidade integral com a LGPD.
            </p>
            <div className="text-xs text-slate-500">
              Encarregado de Dados (DPO): <a href="mailto:brasilportalvip@gmail.com" className="text-cyan-400 hover:underline font-semibold">brasilportalvip@gmail.com</a>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Conformidade & Jurídico</h5>
            <ul className="space-y-2 text-xs">
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
                  Direitos LGPD & Exclusão de Dados
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
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Navegação & Ecossistema</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-cyan-400 transition-colors">
                  Blog Oficial & Artigos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('planos')} className="hover:text-cyan-400 transition-colors">
                  Planos & Assinaturas
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('froc-ia')} className="hover:text-cyan-400 transition-colors">
                  Froc IA Marketing Engine
                </button>
              </li>
              <li>
                <a
                  href="https://portalvipbrasil.com.br"
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

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} Portal Vip Brasil. Todos os direitos reservados.</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Proteção TLS 1.3 / HTTPS</span>
            <span>•</span>
            <span>Lei Geral de Proteção de Dados (Lei 13.709/2018)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default VitrinePage;
