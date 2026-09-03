import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  FileText,
  Image as ImageIcon,
  Megaphone,
  PenTool,
  Search,
  Sparkles,
  Video,
  CheckCircle2,
  TrendingUp,
  Zap,
  Globe,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Share2,
  Copy
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { USER_PORTFOLIO_PROJECTS, PORTAL_VIP_BRAND } from '../data/portalProjects';
import type { Campaign, Company, ScheduledPost, User, Wallet } from '../types';
import { apiRequest } from '../lib/api';

interface Props {
  user: User | null;
  wallet: Wallet | null;
  selectedCompany: Company | null;
  campaigns: Campaign[];
  scheduledPosts: ScheduledPost[];
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  user,
  wallet,
  selectedCompany,
  campaigns,
  scheduledPosts,
  onNavigate,
  onOpenAuth
}) => {
  const [status, setStatus] = useState({ hasSeoAudit: false, connectedSocialCount: 0 });
  const [isTriggeringDaily, setIsTriggeringDaily] = useState(false);
  const [dailyFeedback, setDailyFeedback] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStatus({ hasSeoAudit: false, connectedSocialCount: 0 });
      return;
    }
    apiRequest<{ hasSeoAudit: boolean; connectedSocialCount: number }>(
      `/api/dashboard/status${selectedCompany?.id ? `?companyId=${encodeURIComponent(selectedCompany.id)}` : ''}`
    )
      .then(setStatus)
      .catch(() => undefined);
  }, [user, selectedCompany?.id]);

  const month = new Date().toISOString().slice(0, 7);
  const companyPosts = scheduledPosts.filter((p) => !selectedCompany || p.companyId === selectedCompany.id);
  const companyCampaigns = campaigns.filter((c) => !selectedCompany || c.companyId === selectedCompany.id);

  const active = companyCampaigns.filter((c) => c.status === 'active').length;
  const queued = companyPosts.filter((p) => p.status === 'scheduled' || p.status === 'publishing').length;
  const publishedMonth = companyPosts.filter((p) => p.status === 'published' && String(p.publishedAt || p.scheduledFor).startsWith(month)).length;

  const totals = companyCampaigns.reduce(
    (a, c) => ({
      reach: a.reach + Number(c.metrics?.reach || 0),
      clicks: a.clicks + Number(c.metrics?.clicks || 0),
      leads: a.leads + Number(c.metrics?.leads || 0),
      conversions: a.conversions + Number(c.metrics?.conversions || 0)
    }),
    { reach: 0, clicks: 0, leads: 0, conversions: 0 }
  );

  const handleCopyLink = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleTriggerDailyPulse = async () => {
    setIsTriggeringDaily(true);
    setDailyFeedback(null);
    try {
      const res = await apiRequest<{ success: boolean; publishedCount: number; itemsGenerated: any[] }>('/api/portal/daily-pulse', {
        method: 'POST'
      });
      if (res?.success) {
        setDailyFeedback({
          success: true,
          message: `Ciclo concluído! ${res.publishedCount} publicações com SEO geradas e programadas para divulgação.`,
          count: res.publishedCount
        });
      }
    } catch (error: any) {
      setDailyFeedback({
        success: false,
        message: error?.message || 'O ciclo diário não foi confirmado pelo backend.'
      });
    } finally {
      setIsTriggeringDaily(false);
    }
  };

  const quickActions = [
    ['Criar Post IA', PenTool, 'criar-conteudo', 'Copy, imagem e hashtags para redes'],
    ['Artigo para Blog', FileText, 'criar-artigo', 'Redação profunda com SEO Bing/Google'],
    ['Estúdio de Imagem', ImageIcon, 'criar-imagem', 'Geração visual com IA em alta resolução'],
    ['Roteiro de Vídeo', Video, 'criar-video', 'Scripts verticais para Reels e TikTok'],
    ['Auditoria de SEO', Search, 'seo', 'Análise de metadados e palavras-chave'],
    ['Campanha Completa', Megaphone, 'campanhas', 'Planejamento e copy multicanal']
  ] as const;

  const activationSteps = useMemo(
    () =>
      [
        ['Ver Vitrine Oficial (7 Sites/Apps)', true, 'vitrine'],
        ['Auditoria SEO Bing & Google', status.hasSeoAudit, 'seo'],
        ['Conectar Redes Sociais', status.connectedSocialCount > 0, 'redes-sociais'],
        ['Configurar Automação 1x/dia', true, 'autopilot'],
        ['Criar Artigo no Blog', true, 'criar-artigo'],
        ['Gerar Campanha Multicanal', companyCampaigns.length > 0, 'campanhas']
      ] as const,
    [status, companyCampaigns.length]
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950/30 p-8 md:p-12 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <BrandLogo size="lg" showText={true} subtitle="Central de Marketing" />
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-white md:text-5xl">
            Portal Vip Brasil: Central de Marketing e Automação com Inteligência Artificial.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Acesse o painel para gerenciar a vitrine de sites e aplicativos da Google Play Store, disparar a automação diária de divulgação e criar campanhas com SEO para Bing e Google.
          </p>
          <button onClick={onOpenAuth} className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/20 hover:scale-105 transition-all inline-flex items-center gap-2">
            <Sparkles size={18} />
            Entrar no Painel do Administrador
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fadeIn pb-12">
      {/* Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/90 via-[#0B0F19] to-slate-950 p-6 shadow-2xl md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                <Zap size={13} className="text-cyan-400" /> Portal Vip Brasil • Central de Marketing
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                <ShieldCheck size={13} className="text-emerald-400" /> 7 Projetos Ativos
              </span>
            </div>
            <h2 className="text-2xl font-black text-white md:text-3xl">
              Olá, {user.name?.split(' ')[0] || 'Administrador'} 👋
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-slate-300">
              Sua central oficial de divulgação diária e marketing para todos os seus sites e aplicativos da Google Play Store.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleTriggerDailyPulse}
              disabled={isTriggeringDaily}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTriggeringDaily ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executando Ciclo...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Disparar Divulgação Diária (1x/dia)</span>
                </>
              )}
            </button>
            <button
              onClick={() => onNavigate('vitrine')}
              className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Ver Vitrine Pública</span>
            </button>
          </div>
        </div>

        {dailyFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{dailyFeedback.message}</span>
          </div>
        )}
      </section>

      {/* Showcase Grid of 7 Projects in Admin View */}
      <section className="froc-panel">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Vitrine de Sites e Aplicativos Cadastrados ({USER_PORTFOLIO_PROJECTS.length})
            </h3>
            <p className="text-xs text-slate-400">
              Projetos monitorados para divulgação automática diária e indexação Bing/Google.
            </p>
          </div>
          <button
            onClick={() => onNavigate('vitrine')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Ver Vitrine Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USER_PORTFOLIO_PROJECTS.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    {proj.category}
                  </span>
                  <h4 className="text-sm font-black text-white mt-0.5">{proj.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {proj.description}
                  </p>
                </div>
                {proj.hasApp ? (
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0" title="Possui Aplicativo na Play Store">
                    <Smartphone className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0" title="Site / Plataforma Web">
                    <Globe className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <a
                    href={proj.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <span>Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {proj.hasApp && proj.playStoreUrl && (
                    <a
                      href={proj.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <span>App</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => onNavigate('campanhas')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold transition-colors"
                >
                  Gerar Post IA
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {[
          ['Sites & Apps', USER_PORTFOLIO_PROJECTS.length],
          ['Posts na Fila', queued],
          ['Publicados no Mês', publishedMonth],
          ['Campanhas Ativas', active],
          ['Alcance registrado', totals.reach],
          ['Cliques registrados', totals.clicks]
        ].map(([label, value]) => (
          <div key={label as string} className="froc-panel p-4 hover:border-cyan-500/30 transition-colors">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="mt-2 text-2xl font-black text-white">{String(value)}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <section className="froc-panel">
        <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Ações Rápidas de Criação & Marketing
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map(([label, Icon, tab, desc]) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all flex flex-col justify-between"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-bold group-hover:scale-105 transition-transform">
                <Icon size={17} />
              </div>
              <div className="mt-3">
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {label}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 line-clamp-2">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Activation Track */}
      <section className="froc-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="froc-section-title">Checklist Operacional do Portal Vip Brasil</h3>
            <p className="mt-1 text-xs text-slate-400">Status dos módulos de SEO, redes sociais e automação.</p>
          </div>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
            {activationSteps.filter((x) => x[1]).length} de {activationSteps.length} prontos
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activationSteps.map(([label, done, tab], i) => (
            <button
              key={label}
              onClick={() => onNavigate(tab)}
              className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                done
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                    done ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <ArrowRight size={14} className={done ? 'text-emerald-400' : 'text-slate-500'} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

