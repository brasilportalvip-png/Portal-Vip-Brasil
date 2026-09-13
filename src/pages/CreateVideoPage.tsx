import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Video,
  Sparkles,
  Copy,
  Check,
  Film,
  Download,
  Clock,
  Mic,
  Play,
  RotateCcw,
  Zap,
  Sliders,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2,
  Flame,
  Send,
  ExternalLink,
  Smartphone,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import type { Company, VideoJob } from '../types';
import { apiRequest } from '../lib/api';
import { NicheVideoCatalogSection } from '../components/NicheVideoCatalogSection';
import type { NicheVideoTemplate } from '../lib/nicheVideoCatalog';

interface CreateVideoPageProps {
  selectedCompany: Company | null;
  onRefreshContents?: () => void;
  onNavigate: (tab: string) => void;
}

export const CreateVideoPage: React.FC<CreateVideoPageProps> = ({
  selectedCompany,
  onRefreshContents,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'generate_video' | 'generate_script'>('generate_video');

  // Estado para Geração de Vídeo com Veo 3.1
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [preset, setPreset] = useState<'demo_720p' | 'pro_1080p' | 'cinema_4k'>('pro_1080p');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [cameraMotion, setCameraMotion] = useState('Pan suave com aproximação dinâmica');
  const [lighting, setLighting] = useState('Iluminação cinematográfica com luz de preenchimento suave');
  const [mood, setMood] = useState('Sofisticado, moderno e envolvente');

  const [activeJob, setActiveJob] = useState<VideoJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<VideoJob[]>([]);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [videoError, setVideoError] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para Criador de Roteiro
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Reels / TikTok (60s)');
  const [objective, setObjective] = useState('Quebrar objeção e converter em vendas');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platformPreview, setPlatformPreview] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const [generatedScript, setGeneratedScript] = useState<{
    scriptTitle?: string;
    hook: string;
    scenes: Array<{
      sceneNumber: number;
      timeSeconds: string;
      visualDescription: string;
      audioVoiceover: string;
      onScreenText: string;
    }>;
    callToAction: string;
    suggestedAudioTrack: string;
    caption: string;
    hashtags?: string[];
    nicheId?: string;
    nicheName?: string;
  } | null>(null);

  // Reset video script when company changes (E05)
  useEffect(() => {
    setGeneratedScript(null);
    setVideoError('');
    setScriptError('');
  }, [selectedCompany?.id]);

  // Carregar histórico de jobs recentes
  const loadRecentJobs = async () => {
    if (!selectedCompany?.id) {
      setRecentJobs([]);
      setActiveJob(null);
      return;
    }
    try {
      const data = await apiRequest<{ jobs: VideoJob[] }>(`/api/ai/video-jobs?companyId=${selectedCompany.id}`);
      if (Array.isArray(data.jobs)) {
        setRecentJobs(data.jobs);
        // Se houver algum em processamento, seleciona para acompanhar
        const ongoing = data.jobs.find((j) => j.status === 'processing' || j.status === 'pending' || j.status === 'finalizing');
        if (ongoing && !activeJob) {
          setActiveJob(ongoing);
        }
      }
    } catch {
      // Falha silenciosa de polling
    }
  };

  useEffect(() => {
    loadRecentJobs();
  }, [selectedCompany?.id]);

  // Polling para acompanhar o status do activeJob
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'failed_permanent' || activeJob.status === 'published') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const data = await apiRequest<{ job: VideoJob }>(`/api/ai/video-jobs/${activeJob.id}`);
        if (data.job) {
          setActiveJob(data.job);
          if (data.job.status === 'completed' || data.job.status === 'failed' || data.job.status === 'failed_permanent' || data.job.status === 'published') {
            onRefreshContents?.();
            loadRecentJobs();
          }
        }
      } catch (err: any) {
        console.warn('Erro durante polling de vídeo:', err);
      }
    }, 4000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeJob?.id, activeJob?.status]);

  const handleStartVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim()) {
      setVideoError('Informe a descrição / briefing da cena do vídeo.');
      return;
    }
    if (!selectedCompany?.id) {
      setVideoError('Selecione um projeto para aplicar a identidade da marca.');
      return;
    }

    setVideoError('');
    setIsStartingJob(true);

    try {
      const data = await apiRequest<{ job: VideoJob }>('/api/ai/generate-video', {
        method: 'POST',
        body: {
          companyId: selectedCompany.id,
          prompt: videoPrompt,
          title: videoTitle || `Vídeo IA - ${videoPrompt.slice(0, 50)}`,
          preset,
          aspectRatio,
          cameraMotion,
          lighting,
          mood
        }
      });

      setActiveJob(data.job);
      loadRecentJobs();
    } catch (err: any) {
      setVideoError(err.message || 'Erro ao iniciar geração de vídeo com Veo 3.1.');
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setScriptError('Informe o tema do vídeo.');
      return;
    }

    setScriptError('');
    setLoadingScript(true);

    try {
      const data = await apiRequest<{ videoScript: any }>('/api/ai/generate-video-script', {
        method: 'POST',
        body: {
          companyId: selectedCompany?.id,
          topic,
          format: `${format} com objetivo de ${objective}`
        }
      });

      setGeneratedScript(data.videoScript);
      onRefreshContents?.();
    } catch (err: any) {
      setScriptError(err.message || 'Erro ao gerar roteiro de vídeo.');
    } finally {
      setLoadingScript(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToVeo = (template: NicheVideoTemplate) => {
    setActiveTab('generate_video');
    setVideoTitle(`Vídeo IA: ${template.nicheName} - ${template.headline.slice(0, 45)}`);
    setVideoPrompt(template.videoPrompt);
    setCameraMotion(template.cameraMotion);
    setLighting(template.lighting);
    setMood(template.mood);
    setAspectRatio('9:16');
    const el = document.getElementById('studio-header');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleApplyToScript = (template: NicheVideoTemplate) => {
    setActiveTab('generate_script');
    setTopic(template.headline);
    setFormat('Reels / TikTok / Shorts (30-60 segundos)');
    setObjective(`Direcionar audiência orgânica para instalar o app ${template.appName} na Play Store`);
    setGeneratedScript({
      scriptTitle: template.headline,
      hook: template.viralScript.hook,
      scenes: template.viralScript.scenes,
      callToAction: template.viralScript.callToAction,
      suggestedAudioTrack: template.viralScript.suggestedAudioTrack,
      caption: template.viralScript.caption,
      hashtags: template.viralScript.hashtags,
      nicheId: template.id,
      nicheName: template.nicheName
    });
    const el = document.getElementById('studio-header');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavigateToSocial = (_template: NicheVideoTemplate) => {
    onNavigate('redes-sociais');
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <header id="studio-header" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Video className="text-cyan-400" /> Estúdio de Vídeos do Portal Vip Brasil
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Geração real de vídeo com Google Veo 3.1 (Full HD / 4K) e roteirizador estratégico com gancho magnético.
          </p>
        </div>

      </header>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('generate_video')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'generate_video'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={15} /> Geração Real com Veo 3.1 (Vídeo MP4)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('generate_script')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'generate_script'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film size={15} /> Roteirizador Estruturado
        </button>
      </div>

      {!selectedCompany && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
          Selecione um projeto para aplicar as diretrizes e público da marca.{' '}
          <button onClick={() => onNavigate('projetos')} className="ml-1 font-bold underline">
            Configurar projeto
          </button>
        </div>
      )}

      {/* TAB 1: GERAÇÃO REAL COM VEO 3.1 */}
      {activeTab === 'generate_video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário Veo 3.1 */}
          <div className="lg:col-span-5 froc-panel space-y-4">
            <form onSubmit={handleStartVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título / Identificação do Vídeo
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ex: Comercial Coleção Verão 2026"
                  className="froc-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Briefing / Descrição da Cena (Veo 3.1) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Ex: Câmera com movimento dinâmico aproximando de um café artesanal com fumaça subindo, iluminação cinematográfica quente e elegante..."
                  className="froc-input resize-y"
                />
              </div>

              {/* Seletor de Preset e Resolução */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Qualidade / Resolução</span>
                  <span className="text-[10px] text-cyan-400 font-bold">Preset: {preset.replaceAll('_', ' ')}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'demo_720p', label: 'Fast 720p', desc: 'Mais rápido' },
                      { key: 'pro_1080p', label: 'Pro 1080p', desc: 'Full HD Ideal' },
                      { key: 'cinema_4k', label: 'Cinema 4K', desc: 'Ultra HD' }
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPreset(p.key)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        preset === p.key
                          ? 'border-cyan-500 bg-cyan-500/15 text-white shadow-sm shadow-cyan-500/20'
                          : 'border-slate-700/80 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-black">{p.label}</span>
                      <span className="text-[9px] text-slate-400">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proporção</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="froc-input"
                  >
                    <option value="9:16">Vertical 9:16 (Reels/TikTok/Shorts)</option>
                    <option value="16:9">Horizontal 16:9 (YouTube/Vídeo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Movimento de Câmera</label>
                  <select
                    value={cameraMotion}
                    onChange={(e) => setCameraMotion(e.target.value)}
                    className="froc-input"
                  >
                    <option>Pan suave com aproximação dinâmica</option>
                    <option>Dolly in lento e elegante</option>
                    <option>Drone aéreo cinematográfico</option>
                    <option>Câmera lenta 60fps estilizada</option>
                    <option>Órbita circular de produto 360°</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Iluminação & Atmosfera</label>
                <select
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  className="froc-input"
                >
                  <option>Iluminação cinematográfica com luz de preenchimento suave</option>
                  <option>Golden Hour com raios solares dramáticos</option>
                  <option>Estúdio High-Key limpo e moderno</option>
                  <option>Cyberpunk / Neon urbano vibrante</option>
                </select>
              </div>

              {videoError && <p className="text-xs text-rose-400">⚠️ {videoError}</p>}

              <button
                type="submit"
                disabled={isStartingJob || (activeJob && activeJob.status === 'processing')}
                className="froc-primary w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black"
              >
                {isStartingJob ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Iniciando no Veo 3.1...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar Vídeo Real
                  </>
                )}
              </button>
            </form>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] leading-relaxed text-slate-400">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-0.5">
                <Zap size={12} className="text-amber-400" /> Processamento Assíncrono com Confirmação Segura
              </div>
              O vídeo é renderizado em segundo plano pelo Google Veo 3.1 e só é marcado como concluído quando o arquivo MP4 estiver pronto e disponível para download.
            </div>
          </div>

          {/* Painel de Visualização / Player / Status */}
          <div className="lg:col-span-7 froc-panel flex flex-col justify-between min-h-[480px]">
            {activeJob ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Film size={16} className="text-cyan-400" />
                      {activeJob.title || 'Geração de Vídeo'}
                    </h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Job ID: <span className="font-mono text-slate-300">{activeJob.id}</span> • Formato {activeJob.aspectRatio} • {activeJob.preset}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      activeJob.status === 'completed' || activeJob.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : activeJob.status === 'retry_scheduled'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : activeJob.status === 'failed' || activeJob.status === 'failed_permanent'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : activeJob.status === 'finalizing'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                    }`}
                  >
                    {activeJob.status === 'completed' || activeJob.status === 'published'
                      ? 'Concluído'
                      : activeJob.status === 'retry_scheduled'
                      ? 'Em fila para nova tentativa'
                      : activeJob.status === 'failed' || activeJob.status === 'failed_permanent'
                      ? 'Falhou'
                      : activeJob.status === 'finalizing'
                      ? 'Finalizando...'
                      : 'Renderizando...'}
                  </span>
                </div>

                {/* Status em Fila de Retry */}
                {activeJob.status === 'retry_scheduled' ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-center space-y-4 my-auto">
                    <Clock size={36} className="text-amber-400 mx-auto animate-pulse" />
                    <div>
                      <div className="text-sm font-bold text-amber-200">Em fila para nova tentativa automática</div>
                      <p className="text-xs text-amber-300/80 max-w-md mx-auto mt-1">
                        {activeJob.lastErrorMessage || activeJob.errorMessage || 'Limite temporário de requisições de IA atingido na API do Google Gemini.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
                      <div>Tentativa: <strong className="text-white">{activeJob.attemptCount || 1}/{activeJob.maxAttempts || 5}</strong></div>
                      {activeJob.nextAttemptAt && (
                        <div>Próxima tentativa: <strong className="text-cyan-300">{new Date(activeJob.nextAttemptAt).toLocaleTimeString('pt-BR')}</strong></div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await apiRequest<{ job: VideoJob }>(`/api/ai/video-jobs/${activeJob.id}/retry`, { method: 'POST' });
                            if (res.job) setActiveJob(res.job);
                          } catch (e: any) {
                            console.warn('Erro ao forçar retentativa:', e);
                          }
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 text-xs transition-colors"
                      >
                        <RefreshCw size={14} /> Tentar agora
                      </button>
                    </div>
                  </div>
                ) : activeJob.status === 'processing' || activeJob.status === 'pending' || activeJob.status === 'finalizing' ? (
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6 text-center space-y-4 my-auto">
                    <Loader2 size={36} className="text-cyan-400 animate-spin mx-auto" />
                    <div>
                      <div className="text-sm font-bold text-white">Renderizando vídeo com Veo 3.1</div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        A IA está gerando os frames, iluminação e movimento do seu vídeo. Este processo pode levar de 30 a 90 segundos.
                      </p>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(15, activeJob.progressPct || 25)}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-bold text-cyan-300">
                      Progresso estimado: {activeJob.progressPct || 25}%
                    </div>
                  </div>
                ) : activeJob.status === 'completed' && activeJob.videoUrl ? (
                  /* Player de Vídeo Concluído */
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center">
                      <video
                        src={activeJob.videoUrl}
                        controls
                        playsInline
                        className={`w-full max-h-[460px] object-contain rounded-xl ${
                          activeJob.aspectRatio === '9:16' ? 'max-w-[280px] mx-auto' : ''
                        }`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div>
                        <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Vídeo salvo na sua Biblioteca de Conteúdos
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Processamento confirmado pelo Google Veo 3.1
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={activeJob.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={`${activeJob.id}.mp4`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition-all"
                        >
                          <Download size={14} /> Baixar MP4
                        </a>
                        <button
                          type="button"
                          onClick={() => onNavigate('redes-sociais')}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-xs font-bold text-white hover:opacity-95 transition-all"
                        >
                          <Share2 size={14} /> Publicar no TikTok
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Falha */
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
                    <AlertTriangle size={36} className="text-rose-400 mx-auto" />
                    <div className="text-sm font-bold text-rose-200">Falha na geração do vídeo</div>
                    <p className="text-xs text-rose-300/80 max-w-md mx-auto">
                      {activeJob.error || 'Ocorreu um erro no processamento. Nenhuma conclusão foi registrada; tente novamente ou revise o job.'}
                    </p>
                  </div>
                )}

                {/* Histórico Recente de Jobs */}
                {recentJobs.length > 1 && (
                  <div className="border-t border-slate-800 pt-4 mt-6">
                    <div className="text-xs font-bold text-slate-300 mb-2">Vídeos Recentes da Projeto</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {recentJobs.slice(0, 3).map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => setActiveJob(j)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            activeJob.id === j.id
                              ? 'border-cyan-500 bg-cyan-500/10'
                              : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-bold text-white truncate">{j.title || 'Vídeo IA'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                            <span>{j.preset}</span>
                            <span className={j.status === 'completed' ? 'text-emerald-400' : 'text-cyan-400'}>
                              {j.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 my-auto">
                <Video size={48} className="mb-3 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-300">Nenhum vídeo sendo gerado no momento</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Configure o briefing à esquerda para renderizar um vídeo publicitário de alta definição com o modelo Google Veo 3.1.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRIADOR DE ROTEIROS DE VÍDEO */}
      {activeTab === 'generate_script' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário de Roteiro */}
          <div className="lg:col-span-5 froc-panel space-y-4">
            <form onSubmit={handleGenerateScript} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tema / Assunto do Vídeo *</label>
                <textarea
                  rows={3}
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: 3 erros que você comete ao escolher seu fornecedor e como evitar prejuízos..."
                  className="froc-input resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Formato do Vídeo</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="froc-input"
                >
                  <option value="Reels / TikTok / Shorts (30-60 segundos)">Reels / TikTok / Shorts (30-60 segundos)</option>
                  <option value="Vídeo Institucional / Apresentação (2 minutos)">Vídeo Institucional (2 minutos)</option>
                  <option value="Vídeo de Vendas VSL (3-5 minutos)">Vídeo de Vendas VSL (3-5 minutos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Objetivo Estratégico</label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Gerar comentários e mandar link no direct"
                  className="froc-input"
                />
              </div>

              {scriptError && <p className="text-xs text-rose-400">⚠️ {scriptError}</p>}

              <button
                type="submit"
                disabled={loadingScript}
                className="froc-primary w-full py-3 text-xs font-black flex items-center justify-center gap-2"
              >
                {loadingScript ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Film size={16} /> Gerar Roteiro Completo
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saída do Roteiro */}
          <div className="lg:col-span-7 froc-panel flex flex-col justify-between min-h-[450px]">
            {generatedScript ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Header do Roteiro com Seletor de Plataforma */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPlatformPreview('tiktok')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        platformPreview === 'tiktok'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone size={12} /> TikTok
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformPreview('instagram')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        platformPreview === 'instagram'
                          ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Flame size={12} /> Instagram Reels
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformPreview('youtube')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        platformPreview === 'youtube'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Film size={12} /> YouTube
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(generatedScript, null, 2))}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
                      title="Copiar JSON estruturado completo"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      {copied ? 'Copiado!' : 'Copiar Roteiro'}
                    </button>
                  </div>
                </div>

                {/* Badge da Plataforma e Dica Técnica de Otimização */}
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">
                      {platformPreview === 'tiktok' && '🎵 Otimização TikTok (9:16): Foco em áudio em alta, legendas dinâmicas e retenção agressiva.'}
                      {platformPreview === 'instagram' && '📸 Otimização Instagram Reels (9:16): Foco em estética visual, engajamento nos comentários e link na bio.'}
                      {platformPreview === 'youtube' && '▶️ Otimização YouTube Shorts / Widescreen: Título magnético com SEO, gancho nos primeiros 5s e links na descrição.'}
                    </span>
                  </div>
                  {generatedScript.suggestedAudioTrack && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                      Áudio: <strong className="text-slate-200">{generatedScript.suggestedAudioTrack}</strong>
                    </span>
                  )}
                </div>

                {/* ESTRUTURA: COMEÇO (0-3s) */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      1. COMEÇO: Gancho Magnético de Retenção (0-3s)
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-mono">Parada imediata de scroll</span>
                  </div>
                  <p className="text-xs font-black text-white">&ldquo;{generatedScript.hook}&rdquo;</p>
                  <p className="text-[10px] text-slate-400 italic">
                    Dica: Fale este gancho olhando diretamente para a câmera ou com animação de texto em tela nos primeiros 2 segundos.
                  </p>
                </div>

                {/* ESTRUTURA: MEIO (Cenas de Desenvolvimento) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                      2. MEIO: Cenas & Desenvolvimento com Quebra de Padrão
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{generatedScript.scenes?.length || 0} cenas sequenciais</span>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {generatedScript.scenes?.map((scene, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#1E293B] border border-slate-700/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-black text-cyan-300 uppercase flex items-center gap-1.5">
                            <Film size={12} /> Cena {scene.sceneNumber}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1 font-mono">
                            <Clock size={11} /> {scene.timeSeconds}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          <strong className="text-slate-400">Visual & Câmera:</strong> {scene.visualDescription}
                        </div>
                        {scene.onScreenText && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-500/20">
                            <strong>Texto na Tela:</strong> &ldquo;{scene.onScreenText}&rdquo;
                          </div>
                        )}
                        <div className="text-xs text-white bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                          <strong className="text-cyan-400 flex items-center gap-1 mb-0.5">
                            <Mic size={11} /> Fala / Voz:
                          </strong>
                          {scene.audioVoiceover}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ESTRUTURA: FIM (Clímax & CTA para Play Store / Conversão) */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> 3. FIM: Clímax & Chamada para Ação (CTA)
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">Conversão e Download</span>
                  </div>
                  <p className="text-xs font-bold text-white">{generatedScript.callToAction}</p>
                  <p className="text-[10px] text-slate-400">
                    O final orienta explicitamente a instalação do aplicativo na Google Play Store e a visita ao site oficial.
                  </p>
                </div>

                {/* Legenda Pronta e Hashtags */}
                {generatedScript.caption && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Legenda Formatada para {platformPreview.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const fullCaption = `${generatedScript.caption}\n\n${(generatedScript.hashtags || []).join(' ')}`;
                          navigator.clipboard.writeText(fullCaption);
                          setCopiedCaption(true);
                          setTimeout(() => setCopiedCaption(false), 2000);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1 transition-all"
                      >
                        {copiedCaption ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        {copiedCaption ? 'Legenda Copiada!' : 'Copiar Legenda'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-3">
                      {generatedScript.caption}
                    </p>
                    {generatedScript.hashtags && generatedScript.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {generatedScript.hashtags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/40">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ações Rápidas */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('generate_video');
                      const firstScene = generatedScript.scenes?.[0]?.visualDescription || generatedScript.hook;
                      setVideoTitle(`Vídeo IA: ${generatedScript.scriptTitle || topic}`);
                      setVideoPrompt(`Cinematic vertical video (9:16). ${firstScene}. Photorealistic lighting, dynamic camera motion.`);
                      setAspectRatio('9:16');
                      const el = document.getElementById('studio-header');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 text-xs font-black text-slate-950 transition-all shadow-md"
                  >
                    <Sparkles size={14} /> Renderizar Vídeo no Veo 3.1
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('redes-sociais')}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 text-xs font-bold text-white transition-all"
                  >
                    <Send size={13} /> Agendar Publicação Social
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 my-auto">
                <Film size={40} className="mb-3 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-400">Nenhum roteiro gerado ainda</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Preencha o tema ao lado ou escolha um modelo pronto no Catálogo Estratégico abaixo para gerar um roteiro de alta conversão.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATÁLOGO ESTRATÉGICO DE VÍDEOS VERTICAIS (TIKTOK, INSTAGRAM, YOUTUBE SHORTS) */}
      <NicheVideoCatalogSection
        selectedCompany={selectedCompany}
        onApplyToVeo={handleApplyToVeo}
        onApplyToScript={handleApplyToScript}
        onNavigateToTikTok={handleNavigateToSocial}
      />
    </div>
  );
};
