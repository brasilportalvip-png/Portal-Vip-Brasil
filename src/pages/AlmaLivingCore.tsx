import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlmaCyberFace } from '../components/AlmaCyberFace';
import { AlmaOrbitalSymbols, ORBITAL_SYMBOLS, type OrbitalSymbolDef } from '../components/AlmaOrbitalSymbols';
import { almaVoice, startAlmaListening } from '../lib/almaVoice';
import type { AlmaState, Company, User, Wallet, Campaign, ScheduledPost, ContentItem } from '../types';
import { Mic, MicOff, Volume2, VolumeX, Keyboard, X, Sparkles, Send } from 'lucide-react';

// Sub-ambientes modulares integrados sob a regência viva do ALMA
import { AlmaHomeHubPage } from './AlmaHomeHubPage';
import { AlmaAgentsPage } from './AlmaAgentsPage';
import { AlmaVisionPage } from './AlmaVisionPage';
import { AlmaMemoryPage } from './AlmaMemoryPage';
import { AutopilotPage } from './AutopilotPage';
import { CreateContentPage } from './CreateContentPage';
import { SeoPage } from './SeoPage';
import { FrocIaPage } from './FrocIaPage';
import { ProfilePage } from './ProfilePage';
import { DashboardPage } from './DashboardPage';
import { PlansPage } from './PlansPage';
import { VitrinePage } from './VitrinePage';

interface AlmaLivingCoreProps {
  user: User | null;
  wallet: Wallet | null;
  selectedCompany: Company | null;
  companies: Company[];
  campaigns: Campaign[];
  scheduledPosts: ScheduledPost[];
  contentItems: ContentItem[];
  onSelectCompany: (company: Company) => void;
  onRefreshWallet: () => Promise<void>;
  onRefreshCompanies: (signal?: AbortSignal, epoch?: number) => Promise<void>;
  onRefreshContents: () => Promise<void>;
  onRefreshSchedule: () => Promise<void>;
  onRefreshCampaigns: () => Promise<void>;
  reloadSession: () => Promise<void>;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  initialDimension?: string | null;
}

export const AlmaLivingCore: React.FC<AlmaLivingCoreProps> = ({
  user,
  wallet,
  selectedCompany,
  companies,
  campaigns,
  scheduledPosts,
  contentItems,
  onSelectCompany,
  onRefreshWallet,
  onRefreshCompanies,
  onRefreshContents,
  onRefreshSchedule,
  onRefreshCampaigns,
  reloadSession,
  onOpenAuth,
  onLogout,
  onNavigate,
  initialDimension = null
}) => {
  const [almaState, setAlmaState] = useState<AlmaState>('IDLE');
  const [activeSymbol, setActiveSymbol] = useState<OrbitalSymbolDef | null>(null);
  const [activeDimension, setActiveDimension] = useState<string | null>(initialDimension);
  const [targetGaze, setTargetGaze] = useState<{ x: number; y: number } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showInputLine, setShowInputLine] = useState(false);
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const micControllerRef = useRef<{ stop: () => void } | null>(null);
  const hasGreetedRef = useRef(false);

  // Sincroniza callbacks de voz
  useEffect(() => {
    almaVoice.setSpeakingCallback((speaking) => {
      setIsSpeaking(speaking);
      if (speaking) {
        setAlmaState('SPEAKING');
      } else {
        setAlmaState('IDLE');
      }
    });

    // Despertar inicial do ALMA X ao carregar a tela
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        almaVoice.playHarmonicChime([392, 523, 659, 784], 'sine', 2.0);
        almaVoice.speak('Eu sou ALMA X. Seu regente digital.');
      }, 900);
    }

    return () => {
      almaVoice.stopSpeaking();
      if (micControllerRef.current) {
        micControllerRef.current.stop();
      }
    };
  }, []);

  // Manipulação de foco sobre os símbolos orbitais
  const handleHoverSymbol = useCallback((symbol: OrbitalSymbolDef | null) => {
    setActiveSymbol(symbol);
    if (symbol) {
      setTargetGaze(symbol.gazeCoord);
      almaVoice.playHarmonicChime(symbol.audioHarmonics, 'sine', 0.8);
      // Apresentação verbal do símbolo pelo ALMA
      almaVoice.speak(symbol.voiceIntroduction);
    } else {
      setTargetGaze(null);
    }
  }, []);

  // Ativação e transformação contínua do ambiente
  const handleSelectSymbol = useCallback((symbol: OrbitalSymbolDef) => {
    setTargetGaze(symbol.gazeCoord);
    setAlmaState('EXECUTING');
    almaVoice.playHarmonicChime([528, 660, 792, 1056], 'triangle', 1.4);
    almaVoice.speak(symbol.voiceIntroduction);

    setTimeout(() => {
      setActiveDimension(symbol.tabTarget);
      setAlmaState('IDLE');
    }, 450);
  }, []);

  // Controle de Entrada por Voz
  const toggleVoiceListening = () => {
    if (isListening) {
      if (micControllerRef.current) {
        micControllerRef.current.stop();
        micControllerRef.current = null;
      }
      setIsListening(false);
      setAlmaState('IDLE');
      return;
    }

    almaVoice.playHarmonicChime([659, 880], 'sine', 0.5);
    setAlmaState('LISTENING');
    setIsListening(true);
    setTranscript('');

    const listener = startAlmaListening(
      (text) => {
        setTranscript(text);
        handleVoiceCommand(text);
      },
      () => {
        setIsListening(false);
        setAlmaState('IDLE');
      },
      () => {
        setIsListening(false);
        if (almaState === 'LISTENING') setAlmaState('IDLE');
      }
    );

    micControllerRef.current = listener;
  };

  // Processamento de intenção de voz natural
  const handleVoiceCommand = (command: string) => {
    const clean = command.toLowerCase().trim();
    setAlmaState('THINKING');
    almaVoice.playHarmonicChime([440, 554, 659], 'sine', 0.7);

    setTimeout(() => {
      if (clean.includes('casa') || clean.includes('luz') || clean.includes('ambiente') || clean.includes('quarto') || clean.includes('sala')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-home');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('ver') || clean.includes('olhar') || clean.includes('visão') || clean.includes('câmera') || clean.includes('documento')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-vision');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('agente') || clean.includes('conselho') || clean.includes('especialista') || clean.includes('equipe')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-agents');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('memória') || clean.includes('lembrar') || clean.includes('histórico') || clean.includes('contexto')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-memory');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('criar') || clean.includes('texto') || clean.includes('artigo') || clean.includes('vídeo') || clean.includes('imagem')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-create');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('negócio') || clean.includes('empresa') || clean.includes('estratégia') || clean.includes('venda')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-business');
        if (sym) handleSelectSymbol(sym);
      } else if (clean.includes('piloto') || clean.includes('automático') || clean.includes('autônomo') || clean.includes('executar')) {
        const sym = ORBITAL_SYMBOLS.find(s => s.id === 'sym-autopilot');
        if (sym) handleSelectSymbol(sym);
      } else {
        almaVoice.speak('Comando acolhido. Orquestrando intenção.', () => {
          setAlmaState('IDLE');
        });
      }
    }, 700);
  };

  // Envio do campo discreto de texto
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setShowInputLine(false);
    handleVoiceCommand(text);
  };

  // Retorno ao centro puro do ALMA
  const handleReturnToCenter = () => {
    almaVoice.playHarmonicChime([784, 659, 523], 'sine', 1.0);
    setActiveDimension(null);
    setTargetGaze(null);
    setAlmaState('IDLE');
  };

  // Renderização da projeção dimensional ativa
  const renderDimensionContent = () => {
    switch (activeDimension) {
      case 'alma-home':
        return <AlmaHomeHubPage />;
      case 'alma-agents':
        return <AlmaAgentsPage />;
      case 'alma-vision':
        return <AlmaVisionPage />;
      case 'alma-memory':
        return <AlmaMemoryPage />;
      case 'autopilot':
        return <AutopilotPage selectedCompany={selectedCompany} wallet={wallet} onNavigate={onNavigate} />;
      case 'criar-conteudo':
        return <CreateContentPage companies={companies} selectedCompany={selectedCompany} wallet={wallet} onRefreshWallet={onRefreshWallet} onRefreshContents={onRefreshContents} onNavigate={onNavigate} />;
      case 'seo':
        return <SeoPage selectedCompany={selectedCompany} wallet={wallet} onRefreshWallet={onRefreshWallet} />;
      case 'froc-ia':
        return <FrocIaPage selectedCompany={selectedCompany} wallet={wallet} onRefreshWallet={onRefreshWallet} onNavigate={onNavigate} />;
      case 'perfil':
        return <ProfilePage user={user} wallet={wallet} onRefreshUser={reloadSession} onNavigate={onNavigate} />;
      case 'planos':
        return <PlansPage wallet={wallet} onRefreshWallet={onRefreshWallet} onNavigate={onNavigate} />;
      case 'dashboard':
        return <DashboardPage user={user} wallet={wallet} selectedCompany={selectedCompany} campaigns={campaigns} scheduledPosts={scheduledPosts} onNavigate={onNavigate} onOpenAuth={onOpenAuth} />;
      case 'vitrine':
        return <VitrinePage onNavigate={onNavigate} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#010207] text-white select-none overflow-hidden flex items-center justify-center font-sans">
      {/* Luzes volumétricas biofotônicas de fundo */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] max-w-[1200px] max-h-[1200px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),rgba(99,102,241,0.06)_45%,transparent_75%)] blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(1,2,7,0.75)_80%,#010207_100%)]" />
      </div>

      {/* ==========================================
          O ALMA É A PRÓPRIA TELA (CENTRO ABSOLUTO)
         ========================================== */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center transition-all duration-700 ${
          activeDimension ? 'opacity-30 scale-90 pointer-events-none blur-sm' : 'opacity-100 scale-100 pointer-events-auto'
        }`}
      >
        {/* Presença do Humanoide ALMA X */}
        <AlmaCyberFace
          state={almaState}
          size="fullscreen"
          interactive={true}
          targetGaze={targetGaze}
          speaking={isSpeaking}
          onClick={() => {
            almaVoice.playHarmonicChime([528, 660, 792], 'sine', 1.0);
            almaVoice.speak('Eu observo, compreendo e executo.');
          }}
        />

        {/* Símbolos Orbitais Luminosos do Arco-Íris */}
        <AlmaOrbitalSymbols
          activeSymbolId={activeSymbol?.id || null}
          onHoverSymbol={handleHoverSymbol}
          onSelectSymbol={handleSelectSymbol}
        />
      </div>

      {/* ==========================================
          CONTROLES DE ENERGIA & BIO-ACÚSTICA (DISCRETOS)
         ========================================== */}
      <div className="fixed bottom-6 inset-x-0 z-30 flex items-center justify-center gap-4 pointer-events-none">
        {/* Beacon Central de Voz */}
        <button
          type="button"
          onClick={toggleVoiceListening}
          className={`pointer-events-auto relative p-4 rounded-full backdrop-blur-2xl border transition-all duration-500 shadow-2xl focus:outline-none ${
            isListening
              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)] scale-110'
              : 'bg-[#050914]/80 border-cyan-500/30 hover:border-cyan-400 hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
          }`}
        >
          {isListening ? (
            <Mic size={22} className="text-emerald-400 animate-pulse" />
          ) : (
            <Mic size={22} className="text-cyan-300" />
          )}
        </button>

        {/* Alternar Voz / Silêncio */}
        <button
          type="button"
          onClick={() => {
            const muted = almaVoice.toggleMute();
            setIsMuted(muted);
          }}
          className="pointer-events-auto p-3 rounded-full bg-[#050914]/70 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all backdrop-blur-xl"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Alternar Entrada Discreta de Teclado */}
        <button
          type="button"
          onClick={() => setShowInputLine(!showInputLine)}
          className={`pointer-events-auto p-3 rounded-full bg-[#050914]/70 border transition-all backdrop-blur-xl ${
            showInputLine ? 'border-cyan-400 text-cyan-300' : 'border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300'
          }`}
        >
          <Keyboard size={18} />
        </button>
      </div>

      {/* Linha de Entrada de Texto Discreta (só surge se solicitada) */}
      {showInputLine && (
        <div className="fixed bottom-24 inset-x-4 max-w-xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <form
            onSubmit={handleSendText}
            className="flex items-center rounded-full bg-[#070D1E]/95 border border-cyan-500/40 p-1.5 shadow-[0_0_35px_rgba(6,182,212,0.3)] backdrop-blur-2xl"
          >
            <div className="pl-3 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <input
              type="text"
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="..."
              className="w-full bg-transparent px-3 py-1.5 text-sm text-white focus:outline-none placeholder-slate-500"
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Transcrição de Voz em Tempo Real (Flutuante) */}
      {transcript && isListening && (
        <div className="fixed top-12 inset-x-4 max-w-md mx-auto z-30 text-center pointer-events-none animate-in fade-in duration-200">
          <span className="inline-block px-4 py-2 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 backdrop-blur-xl shadow-lg">
            {transcript}
          </span>
        </div>
      )}

      {/* ==========================================
          TRANSFORMAÇÃO CONTÍNUA DO AMBIENTE (PROJEÇÃO HOLOGRÁFICA)
         ========================================== */}
      {activeDimension && (
        <div className="fixed inset-0 z-20 overflow-y-auto bg-[#02040A]/92 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
          {/* Botão de Fechamento / Retorno ao Centro Puro do ALMA */}
          <button
            type="button"
            onClick={handleReturnToCenter}
            className="fixed top-6 right-6 z-50 p-3 rounded-full bg-[#060B1C]/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:scale-110 transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)]"
          >
            <X size={20} />
          </button>

          {/* Conteúdo da Dimensão Ativa */}
          <div className="w-full min-h-screen px-4 py-16 sm:px-8 max-w-7xl mx-auto">
            {renderDimensionContent()}
          </div>
        </div>
      )}
    </div>
  );
};
