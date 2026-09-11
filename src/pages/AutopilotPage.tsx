import React, { useEffect, useState, useRef } from 'react';
import { Bot, CheckCircle2, Rocket, ShieldCheck, Zap, RefreshCw, AlertTriangle, Clock, Film, Globe, Sparkles } from 'lucide-react';
import type { Company } from '../types';
import { apiRequest } from '../lib/api';

interface Props {
  companies: Company[];
  selectedCompany: Company | null;
  onRefreshContents: () => void | Promise<void>;
  onNavigate: (tab: string) => void;
}

interface AutopilotConfig {
  id?: string;
  companyId: string;
  enabled: boolean;
  mode: 'manual_approval' | 'automatic';
  frequency: 'daily' | '3_times_week' | 'weekly';
  preferredHours?: number[];
  targetPlatforms: string[];
  primaryGoal: string;
  lastRunAt?: string;
  lastError?: string | null;
}

interface ProjectOverviewItem {
  project: {
    id: string;
    name: string;
    slug: string;
    category: string;
    segment: string;
    websiteUrl: string;
    hasApp: boolean;
    playStoreUrl?: string;
    active: boolean;
    dailyMarketingEnabled: boolean;
    dailyBlogEnabled: boolean;
  };
  autopilot: {
    enabled: boolean;
    mode: 'manual_approval' | 'automatic';
    frequency: string;
    preferredHours: number[];
    preferredDays: number[];
    targetPlatforms: string[];
    primaryGoal: string;
    lastRunAt: string | null;
    lastRunSlot: string | null;
    lastJobId: string | null;
    lastJobStatus: 'pending' | 'processing' | 'video_processing' | 'completed' | 'failed' | null;
    lastError: string | null;
    lastErrorAt: string | null;
  };
  latestJob: {
    id: string;
    status: 'pending' | 'processing' | 'video_processing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string | null;
    contentId?: string | null;
    videoJobId?: string | null;
    error?: string | null;
  } | null;
}

const channels = [
  { name: 'Facebook', direct: true },
  { name: 'Instagram', direct: true },
  { name: 'LinkedIn', direct: true },
  { name: 'X', direct: true },
  { name: 'TikTok', direct: true },
  { name: 'YouTube', direct: true },
  { name: 'Pinterest', direct: true }
];

const availableHours = [
  { hour: 8, label: '08:00' },
  { hour: 9, label: '09:00' },
  { hour: 10, label: '10:00 (Padrão)' },
  { hour: 11, label: '11:00' },
  { hour: 14, label: '14:00' },
  { hour: 16, label: '16:00' },
  { hour: 18, label: '18:00' },
  { hour: 20, label: '20:00' }
];

export const AutopilotPage: React.FC<Props> = ({ companies, selectedCompany, onRefreshContents, onNavigate }) => {
  const [activeCompanyId, setActiveCompanyId] = useState<string>(selectedCompany?.id || companies[0]?.id || '');
  const [overview, setOverview] = useState<ProjectOverviewItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [cfg, setCfg] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [executionStatus, setExecutionStatus] = useState('');
  const [runningAll, setRunningAll] = useState(false);
  const [runningProjectKey, setRunningProjectKey] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (selectedCompany?.id) {
      setActiveCompanyId(selectedCompany.id);
    } else if (companies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(companies[0].id);
    }
  }, [selectedCompany?.id, companies]);

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await apiRequest<{ projects: ProjectOverviewItem[] }>('/api/autopilot/overview');
      if (Array.isArray(data.projects)) {
        setOverview(data.projects);
      }
    } catch {
      // Falha silenciosa ou mantém anterior
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!activeCompanyId) { setCfg(null); return; }
    setLoading(true);
    setMessage('');
    apiRequest<{ config: AutopilotConfig }>(`/api/autopilot/config?companyId=${encodeURIComponent(activeCompanyId)}`)
      .then((data) => setCfg(data.config))
      .catch((error) => setMessage(error.message || 'Falha ao carregar o Autopilot.'))
      .finally(() => setLoading(false));
  }, [activeCompanyId]);

  const patch = (value: Partial<AutopilotConfig>) => setCfg((current) => current ? { ...current, ...value } : current);

  const setMode = (mode: AutopilotConfig['mode']) => {
    if (!cfg) return;
    patch({ mode });
  };

  const toggleChannel = (name: string, direct: boolean) => {
    if (!cfg) return;
    if (cfg.mode === 'automatic' && !direct) {
      setMessage(`${name} usa o fluxo multimídia específico da própria rede.`);
      return;
    }
    patch({ targetPlatforms: cfg.targetPlatforms.includes(name) ? cfg.targetPlatforms.filter((item) => item !== name) : [...cfg.targetPlatforms, name] });
  };

  const setPreferredHour = (h: number) => {
    if (!cfg) return;
    patch({ preferredHours: [h] });
  };

  const save = async () => {
    if (!cfg || !activeCompanyId) return;
    if (cfg.mode === 'automatic' && cfg.targetPlatforms.length === 0) {
      setMessage('Selecione ao menos uma rede social para o Autopilot multimídia.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const data = await apiRequest<{ config: AutopilotConfig; message?: string; warning?: string }>('/api/autopilot/config', {
        method: 'POST',
        body: {
          ...cfg,
          companyId: activeCompanyId,
          preferredHours: Array.isArray(cfg.preferredHours) && cfg.preferredHours.length > 0 ? cfg.preferredHours : [10]
        }
      });
      setCfg(data.config);
      setMessage(data.warning || data.message || 'Configuração multimídia salva com sucesso.');
      await loadOverview();
    } catch (error: any) {
      setMessage(error.message || 'Falha ao salvar a automação.');
    } finally {
      setSaving(false);
    }
  };

  const clearErrors = async (companyId?: string) => {
    try {
      await apiRequest('/api/autopilot/clear-errors', {
        method: 'POST',
        body: { companyId }
      });
      await loadOverview();
      setMessage(companyId ? 'Aviso do projeto limpo com sucesso.' : 'Histórico de avisos limpo com sucesso.');
    } catch {
      // Ignora erro
    }
  };

  const runProjectNow = async (companyId: string) => {
    if (loading || isRunningRef.current) return;
    isRunningRef.current = true;
    setRunningProjectKey(companyId);
    setLoading(true);
    setMessage('');
    setExecutionStatus('Iniciando ciclo inteligente do Autopilot...');

    let step = 0;
    const steps = [
      'Analisando nicho e gerando texto estratégico com IA...',
      'Criando arte e mídia visual em alta resolução...',
      'Processando formatos e preparando agendamento...',
      'Gravando publicações e registros no Firestore...',
      'Operação avançada em andamento no servidor...'
    ];

    const timer = setInterval(() => {
      if (step < steps.length) {
        setExecutionStatus(steps[step]);
        step += 1;
      }
    }, 7000);

    try {
      const data = await apiRequest<{
        result?: {
          success?: boolean;
          contentId?: string;
          videoJobId?: string;
          scheduleId?: string;
          message?: string;
          error?: string;
        };
      }>('/api/autopilot/trigger-now', {
        method: 'POST',
        body: { companyId },
        timeoutMs: 240_000
      });

      const res = data?.result;
      if (!res?.success) {
        throw new Error(res?.error || res?.message || 'Falha na execução do ciclo.');
      }
      await onRefreshContents();
      await loadOverview();
      setMessage(res.message || 'Conteúdo gerado com sucesso.');
    } catch (error: any) {
      setMessage(error.message || 'Falha ao executar o ciclo.');
      await loadOverview();
    } finally {
      clearInterval(timer);
      setExecutionStatus('');
      setLoading(false);
      setRunningProjectKey(null);
      isRunningRef.current = false;
    }
  };

  const runAllActiveNow = async () => {
    if (runningAll || loading) return;
    setRunningAll(true);
    setMessage('');
    setExecutionStatus('Disparando execução independente em todos os projetos com Autopilot habilitado...');

    try {
      const data = await apiRequest<{
        totalEligible: number;
        successCount: number;
        failedCount: number;
        message: string;
      }>('/api/autopilot/trigger-all', {
        method: 'POST',
        timeoutMs: 240_000
      });

      await onRefreshContents();
      await loadOverview();
      setMessage(data.message || `Ciclo concluído para ${data.totalEligible || 0} projeto(s).`);
    } catch (error: any) {
      setMessage(error.message || 'Falha ao executar ciclo em todos os projetos.');
      await loadOverview();
    } finally {
      setExecutionStatus('');
      setRunningAll(false);
    }
  };

  const activeOverviewItem = overview.find((item) => item.project.id === activeCompanyId);
  const activeCompanyItem = companies.find((c) => c.id === activeCompanyId);
  const activeProjectName = activeOverviewItem?.project.name || activeCompanyItem?.name || 'Projeto';
  const activeAutopilotCount = overview.filter((item) => item.autopilot.enabled).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
      {/* Header Principal */}
      <header className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <Bot size={25} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Autopilot Multimídia & Automação</h2>
              <p className="text-xs text-slate-400">
                Cada projeto possui execução 100% independente, com chaves de idempotência e processamento assíncrono de vídeo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAllActiveNow}
              disabled={runningAll || loading}
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <Sparkles size={16} className={runningAll ? 'animate-spin' : ''} />
              {runningAll ? 'Executando Todos...' : `Executar Todos os Ativos (${activeAutopilotCount})`}
            </button>
          </div>
        </div>

        {/* Guia de Separação Conceitual dos Motores */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 pt-4 border-t border-emerald-500/15 text-xs">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Globe size={15} /> 1. Motor Diário de Marketing & Blog (Portal)
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Gerencia os artigos de autoridade e posts institucionais no Portal Vip Brasil. Controlado pela chave <code className="text-emerald-300">dailyMarketingEnabled</code> de cada projeto.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Film size={15} /> 2. Autopilot Multimídia & Redes Sociais
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Cria criativos 1K, legendas e vídeos Veo para Instagram, TikTok, YouTube e Facebook. Ativado pela chave individual <code className="text-cyan-300">autopilotConfigs.enabled</code>.
            </p>
          </div>
        </div>
      </header>

      {/* Grade de Status dos 7 Projetos Ativos */}
      <section className="froc-panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="froc-section-title">Status dos 7 Projetos Ativos</h3>
            <p className="text-[11px] text-slate-400">
              Acompanhe o estado de cada projeto no Motor Global e no Autopilot Multimídia.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => clearErrors()}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              title="Limpar avisos de erro anteriores em todos os projetos"
            >
              <CheckCircle2 size={12} />
              Limpar avisos
            </button>
            <button
              onClick={loadOverview}
              disabled={loadingOverview}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={12} className={loadingOverview ? 'animate-spin text-cyan-400' : ''} />
              Atualizar status
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(overview.length > 0 ? overview : companies.map((c) => ({
            project: {
              id: c.id,
              name: c.name,
              slug: c.slug || c.id,
              category: c.category || '',
              segment: c.segment || '',
              websiteUrl: (c as any).websiteUrl || (c as any).website || '',
              hasApp: false,
              active: true,
              dailyMarketingEnabled: c.dailyMarketingEnabled !== false,
              dailyBlogEnabled: c.dailyBlogEnabled !== false
            },
            autopilot: {
              enabled: false,
              mode: 'manual_approval' as const,
              frequency: 'daily',
              preferredHours: [10],
              preferredDays: [0, 1, 2, 3, 4, 5, 6],
              targetPlatforms: ['Instagram', 'Facebook'],
              primaryGoal: '',
              lastRunAt: null,
              lastRunSlot: null,
              lastJobId: null,
              lastJobStatus: null,
              lastError: null,
              lastErrorAt: null
            },
            latestJob: null
          }))).map((item) => {
            const isSelected = item.project.id === activeCompanyId;
            const isRunningThis = runningProjectKey === item.project.id;
            const jobStatus = item.latestJob?.status || item.autopilot.lastJobStatus;

            return (
              <div
                key={item.project.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-cyan-500/60 bg-cyan-950/20 shadow-md shadow-cyan-950/30'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-white">{item.project.name}</span>
                      {item.project.category && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[180px]">
                          {item.project.category}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.autopilot.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.autopilot.enabled ? 'Autopilot ON' : 'Autopilot OFF'}
                    </span>
                  </div>

                  {/* Status das duas camadas */}
                  <div className="mt-3 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Motor Global:</span>
                      <span className="font-semibold text-emerald-400">
                        {item.project.dailyMarketingEnabled !== false ? 'Marketing ON' : 'Marketing OFF'} · Blog {item.project.dailyBlogEnabled !== false ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Horário Autopilot:</span>
                      <span className="font-mono text-cyan-300">
                        {item.autopilot.preferredHours?.[0] ? `${String(item.autopilot.preferredHours[0]).padStart(2, '0')}:00` : '10:00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Último Job:</span>
                      <span className="font-semibold">
                        {jobStatus === 'completed' && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Concluído
                          </span>
                        )}
                        {jobStatus === 'video_processing' && (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Film size={12} /> Vídeo Veo assíncrono
                          </span>
                        )}
                        {jobStatus === 'processing' && (
                          <span className="text-amber-300 flex items-center gap-1 animate-pulse">
                            <RefreshCw size={12} className="animate-spin" /> Processando...
                          </span>
                        )}
                        {jobStatus === 'failed' && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle size={12} /> Falha isolada
                          </span>
                        )}
                        {(!jobStatus || jobStatus === 'pending') && (
                          <span className="text-slate-500">Aguardando ciclo</span>
                        )}
                      </span>
                    </div>

                    {item.autopilot.lastRunAt && (
                      <div className="text-[10px] text-slate-500 pt-0.5">
                        Executado: {new Date(item.autopilot.lastRunAt).toLocaleDateString('pt-BR')} às {new Date(item.autopilot.lastRunAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {item.autopilot.lastError && (
                      <div className="mt-1 rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-[10px] text-rose-300 flex items-center justify-between gap-1.5">
                        <span className="truncate" title={item.autopilot.lastError}>
                          Erro: {item.autopilot.lastError}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearErrors(item.project.id);
                          }}
                          className="shrink-0 text-[10px] text-rose-300 hover:text-white px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 transition-colors font-medium"
                          title="Limpar este aviso de erro"
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações por card */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => setActiveCompanyId(item.project.id)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Configurando' : 'Configurar'}
                  </button>
                  <button
                    onClick={() => runProjectNow(item.project.id)}
                    disabled={loading || isRunningThis}
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors disabled:opacity-50"
                    title="Executar agora neste projeto"
                  >
                    <Zap size={14} className={isRunningThis ? 'animate-spin text-cyan-400' : ''} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Banner de Execução e Mensagens */}
      {executionStatus && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/60 p-4 text-xs text-cyan-200 animate-pulse shadow-lg shadow-cyan-950/40">
          <RefreshCw size={16} className="animate-spin text-cyan-400 flex-shrink-0" />
          <span className="font-semibold">{executionStatus}</span>
        </div>
      )}

      {message && !executionStatus && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-200">
          {message}
        </div>
      )}

      {/* Painel de Edição do Projeto Selecionado */}
      {!activeCompanyId ? (
        <div className="froc-panel text-center">
          <Bot size={38} className="mx-auto text-cyan-400" />
          <h2 className="mt-3 text-lg font-bold text-white">Escolha um projeto para configurar</h2>
          <p className="mt-1 text-xs text-slate-400">
            Selecione qualquer um dos 7 projetos acima para configurar os canais sociais e horário de postagem.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-blue-950 via-[#0F172A] to-slate-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  Configuração Multimídia · {activeProjectName}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Controla a geração e publicação multimídia (fotos, vídeos Veo e redes) deste projeto. Não interfere nos outros 6 projetos.
                </p>
              </div>
              {cfg && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => patch({ enabled: e.target.checked })}
                  />
                  <span className={`text-xs font-bold ${cfg.enabled ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {cfg.enabled ? 'Autopilot Multimídia ATIVO' : 'Autopilot Multimídia PAUSADO'}
                  </span>
                </label>
              )}
            </div>
          </section>

          {loading && !cfg ? (
            <div className="grid min-h-48 place-items-center text-xs text-slate-400">
              Carregando configuração…
            </div>
          ) : cfg ? (
            <section className="froc-panel space-y-6">
              {/* Horário de Execução (preferredHours) */}
              <div>
                <h3 className="froc-section-title flex items-center gap-2">
                  <Clock size={16} className="text-cyan-400" /> Horário preferencial de execução
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  O cron diário respeita este horário para agendar e publicar. Padrão: 10:00 (horário de Brasília).
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableHours.map((item) => {
                    const currentHour = cfg.preferredHours?.[0] ?? 10;
                    const isSelected = currentHour === item.hour;
                    return (
                      <button
                        key={item.hour}
                        onClick={() => setPreferredHour(item.hour)}
                        className={`min-h-11 rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/10 text-white shadow-sm shadow-cyan-950'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequência */}
              <div className="border-t border-slate-800 pt-5">
                <h3 className="froc-section-title">Frequência de postagem</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {([
                    ['daily', 'Diariamente'],
                    ['3_times_week', '3x por semana'],
                    ['weekly', 'Semanalmente']
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => patch({ frequency: id })}
                      className={`min-h-14 rounded-2xl border p-4 text-left text-xs font-bold ${
                        cfg.frequency === id
                          ? 'border-cyan-400 bg-cyan-500/10 text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo de operação */}
              <div className="border-t border-slate-800 pt-5">
                <h3 className="froc-section-title">Modo de operação social</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() => setMode('manual_approval')}
                    className={`rounded-2xl border p-4 text-left ${
                      cfg.mode === 'manual_approval' ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <ShieldCheck size={16} className="text-cyan-400" /> Aprovação manual
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Gera imagens e textos com IA e salva no banco de conteúdos para sua aprovação antes de publicar.
                    </p>
                  </button>
                  <button
                    onClick={() => setMode('automatic')}
                    className={`rounded-2xl border p-4 text-left ${
                      cfg.mode === 'automatic' ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Rocket size={16} className="text-cyan-400" /> Automático
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Cria mídia e agenda automaticamente nos canais conectados. O vídeo Veo é enviado assincronamente para a fila do YouTube/TikTok.
                    </p>
                  </button>
                </div>
              </div>

              {/* Canais Alvo */}
              <div className="border-t border-slate-800 pt-5">
                <h3 className="froc-section-title">Canais alvo para publicação</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {channels.map((ch) => {
                    const selected = cfg.targetPlatforms.includes(ch.name);
                    const disabled = cfg.mode === 'automatic' && !ch.direct;
                    return (
                      <button
                        key={ch.name}
                        onClick={() => toggleChannel(ch.name, ch.direct)}
                        className={`min-h-10 rounded-xl border px-3.5 text-xs font-semibold ${
                          disabled
                            ? 'cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600'
                            : selected
                              ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200'
                              : 'border-slate-700 bg-slate-900 text-slate-400'
                        }`}
                      >
                        {ch.name}
                        {disabled ? ' · mídia/revisão' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Objetivo Principal */}
              <label className="block border-t border-slate-800 pt-5 text-xs font-semibold text-slate-300">
                Objetivo de comunicação e vendas
                <textarea
                  value={cfg.primaryGoal || ''}
                  onChange={(e) => patch({ primaryGoal: e.target.value })}
                  placeholder="Ex: Atrair novos clientes para os serviços de estética, reforçar autoridade e promover promoções sazonais..."
                  className="froc-input mt-1.5 min-h-20"
                />
              </label>

              {cfg.lastRunAt && (
                <p className="text-[11px] text-slate-500">
                  Última execução deste projeto: {new Date(cfg.lastRunAt).toLocaleString('pt-BR')}
                </p>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row">
                <button
                  onClick={save}
                  disabled={saving || loading}
                  className="froc-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {saving ? 'Salvando…' : 'Salvar configuração deste projeto'}
                </button>
                <button
                  onClick={() => runProjectNow(activeCompanyId)}
                  disabled={loading || saving}
                  className={`min-h-11 rounded-xl border px-5 text-xs font-bold transition-all ${
                    loading
                      ? 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300 cursor-not-allowed opacity-90'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap size={15} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
                    {loading ? (executionStatus || 'Executando Autopilot…') : 'Executar agora neste foco'}
                  </span>
                </button>
              </div>
            </section>
          ) : (
            <div className="froc-panel text-rose-300">
              Não foi possível carregar a configuração. {message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

