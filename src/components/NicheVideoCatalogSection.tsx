import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Film,
  Share2,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Music,
  Clock,
  Mic,
  Tag,
  CheckCircle2,
  Radio,
  Flame
} from 'lucide-react';
import { NICHE_VIDEO_TEMPLATES, detectNicheForVideo, type NicheVideoTemplate } from '../lib/nicheVideoCatalog';
import type { Company } from '../types';

interface NicheVideoCatalogSectionProps {
  selectedCompany: Company | null;
  onApplyToVeo: (template: NicheVideoTemplate) => void;
  onApplyToScript: (template: NicheVideoTemplate) => void;
  onNavigateToTikTok: (template: NicheVideoTemplate) => void;
}

export const NicheVideoCatalogSection: React.FC<NicheVideoCatalogSectionProps> = ({
  selectedCompany,
  onApplyToVeo,
  onApplyToScript,
  onNavigateToTikTok
}) => {
  const detected = detectNicheForVideo(selectedCompany?.name || '', selectedCompany?.slug || selectedCompany?.id);
  const [selectedTemplate, setSelectedTemplate] = useState<NicheVideoTemplate>(detected);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sincronizar quando o projeto selecionado mudar
  useEffect(() => {
    const nextNiche = detectNicheForVideo(selectedCompany?.name || '', selectedCompany?.slug || selectedCompany?.id);
    setSelectedTemplate(nextNiche);
  }, [selectedCompany?.id, selectedCompany?.name, selectedCompany?.slug]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(selectedTemplate.viralScript.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const templatesList = Object.values(NICHE_VIDEO_TEMPLATES);

  return (
    <div id="niche-video-catalog-section" className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Flame size={12} className="text-amber-400" /> Catálogo Estratégico de Vídeos Verticais
            </span>
            <span className="text-[10px] font-bold text-slate-400">9:16 para TikTok & Reels</span>
          </div>
          <h3 className="text-lg font-black text-white mt-1">
            Vídeos com Identidade do Nicho & Gancho Magnético de Tráfego Orgânico
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada nicho possui vídeo demonstrativo vertical, prompt Veo 3.1 ultra-detalhado, roteiro com gancho de 0-3s e CTA para a Google Play Store.
          </p>
        </div>

        {selectedCompany && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-slate-800/80 px-3 py-1.5 border border-slate-700 text-xs">
            <Radio size={13} className="text-cyan-400 animate-pulse" />
            <span className="text-slate-400">Projeto Ativo:</span>
            <strong className="text-white font-semibold">{selectedCompany.name}</strong>
          </div>
        )}
      </div>

      {/* Grid de Seletor de Nichos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {templatesList.map((tpl) => {
          const isSelected = selectedTemplate.id === tpl.id;
          const isCurrentProjectNiche = detected.id === tpl.id;

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setSelectedTemplate(tpl);
                setIsPlaying(true);
              }}
              className={`relative flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {isCurrentProjectNiche && (
                <span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
              )}
              <span className="text-xl mb-1">{tpl.icon}</span>
              <span className="text-[11px] font-bold line-clamp-1 leading-tight">{tpl.nicheName.split('&')[0]}</span>
              <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{tpl.badge}</span>
            </button>
          );
        })}
      </div>

      {/* Visualizador do Nicho Selecionado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 sm:p-6">
        {/* Lado Esquerdo: Player de Vídeo Vertical 9:16 */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="relative w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black group">
            <video
              ref={videoRef}
              key={selectedTemplate.id}
              src={selectedTemplate.sampleVideoUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Overlay de Controle no Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 pointer-events-none">
              <div className="flex items-center justify-between pointer-events-auto">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/60 text-cyan-400 backdrop-blur border border-cyan-500/30">
                  {selectedTemplate.icon} {selectedTemplate.badge}
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>

              <div className="flex items-center justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-cyan-500/90 text-slate-950 hover:bg-cyan-400 hover:scale-110 transition shadow-lg"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                </button>
              </div>

              <div className="text-[10px] text-slate-300 pointer-events-auto text-center font-semibold">
                Formato TikTok / Reels (9:16)
              </div>
            </div>

            {/* Badge de Nicho Fixo */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-white border border-white/10">
                <span>{selectedTemplate.icon}</span> {selectedTemplate.nicheName.split('&')[0]}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2 text-center">
            Vídeo vertical gerado com a identidade do nicho.
          </div>
        </div>

        {/* Lado Direito: Informações Estratégicas & Botões Rápidos */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header do Nicho */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    {selectedTemplate.nicheName}
                  </h4>
                  <p className="text-xs text-cyan-400 font-semibold">{selectedTemplate.category}</p>
                </div>
              </div>
            </div>

            {selectedTemplate.playStoreUrl && (
              <a
                href={selectedTemplate.playStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-200 hover:border-cyan-400 hover:text-white transition"
              >
                <span>Google Play: {selectedTemplate.appName.split('App')[0]}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Headline & Gancho */}
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Manchete Magnética de Vídeo:
              </span>
              <p className="text-xs font-bold text-white leading-snug">{selectedTemplate.headline}</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5 flex items-center gap-1">
                <Clock size={11} /> Gancho de Retenção nos Primeiros 3 Segundos (0-3s):
              </span>
              <p className="text-xs font-bold text-amber-100">&ldquo;{selectedTemplate.viralScript.hook}&rdquo;</p>
            </div>
          </div>

          {/* Especificações Cinematográficas Veo 3.1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Movimento de Câmera</span>
              <p className="text-[11px] text-slate-200">{selectedTemplate.cameraMotion}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Iluminação</span>
              <p className="text-[11px] text-slate-200">{selectedTemplate.lighting}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Atmosfera / Tom</span>
              <p className="text-[11px] text-slate-200">{selectedTemplate.mood}</p>
            </div>
          </div>

          {/* Trilha Sonora & CTA */}
          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <div className="flex-1 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
              <Music size={14} className="text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Trilha em Alta Recomendada:</span>
                <span className="text-[11px] text-white font-medium">{selectedTemplate.viralScript.suggestedAudioTrack}</span>
              </div>
            </div>

            <div className="flex-1 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
              <Tag size={14} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">CTA Direcionada:</span>
                <span className="text-[11px] text-emerald-200 font-medium line-clamp-1">{selectedTemplate.viralScript.callToAction}</span>
              </div>
            </div>
          </div>

          {/* Hashtags Virais */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 mr-1">Hashtags do Nicho:</span>
            {selectedTemplate.viralScript.hashtags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-cyan-300 border border-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onApplyToVeo(selectedTemplate)}
              className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-xs font-bold text-white hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition"
            >
              <Sparkles size={14} /> Usar no Estúdio Veo 3.1
            </button>

            <button
              type="button"
              onClick={() => onApplyToScript(selectedTemplate)}
              className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <Film size={14} /> Carregar Roteiro Completo
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTikTok(selectedTemplate)}
              className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white hover:border-cyan-400 transition"
            >
              <Share2 size={14} /> Publicar no TikTok
            </button>

            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition ml-auto"
            >
              {copiedCaption ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedCaption ? 'Legenda Copiada!' : 'Copiar Legenda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
