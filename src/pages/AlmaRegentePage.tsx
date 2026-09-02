import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Camera,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Home,
  Compass,
  Briefcase,
  Megaphone,
  Share2,
  Code2,
  BarChart3,
  Search,
  Zap,
  Shield,
  Clock,
  Eye,
  Sliders
} from 'lucide-react';
import { AlmaCyberFace } from '../components/AlmaCyberFace';
import type { AlmaState, AlmaIntent, AlmaOrchestrationPlan, AlmaAgentType, AlmaAutonomyLevel } from '../types';
import { apiRequest } from '../lib/api';

interface AlmaRegentePageProps {
  onNavigate: (tab: string) => void;
}

export const AlmaRegentePage: React.FC<AlmaRegentePageProps> = ({ onNavigate }) => {
  const [promptInput, setPromptInput] = useState('');
  const [almaState, setAlmaState] = useState<AlmaState>('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autonomyLevel, setAutonomyLevel] = useState<AlmaAutonomyLevel>('assisted');
  const [currentPlan, setCurrentPlan] = useState<AlmaOrchestrationPlan | null>(null);
  const [activeTabSub, setActiveTabSub] = useState<'cockpit' | 'graph' | 'deliverables'>('cockpit');
  const [executionLogs, setExecutionLogs] = useState<Array<{ time: string; text: string; agent?: string }>>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);

  // Inicializar Web Speech Recognition se disponível
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setAlmaState('LISTENING');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPromptInput(transcript);
        handleExecuteIntent(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setAlmaState('IDLE');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakText = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.onstart = () => setAlmaState('SPEAKING');
    utterance.onend = () => setAlmaState('IDLE');
    utterance.onerror = () => setAlmaState('IDLE');
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setAlmaState('IDLE');
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Speech recognition start error:', err);
        setIsListening(false);
      }
    }
  };

  const handleExecuteIntent = async (overridePrompt?: string) => {
    const targetPrompt = overridePrompt || promptInput;
    if (!targetPrompt.trim()) return;

    setErrorMessage('');
    setAlmaState('THINKING');
    const logTime = new Date().toLocaleTimeString('pt-BR');
    setExecutionLogs(prev => [
      { time: logTime, text: `Intenção recebida: "${targetPrompt}"` },
      ...prev
    ]);

    try {
      // 1. Alma Intent Engine
      const intentRes = await apiRequest<{ intent: AlmaIntent }>('/api/alma/intent', {
        method: 'POST',
        body: { prompt: targetPrompt }
      });

      const intent = intentRes.intent;
      setAlmaState('PLANNING');

      // 2. Criar Plano de Orquestração
      const initialPlan: AlmaOrchestrationPlan = {
        id: `plan_${Date.now()}`,
        goal: intent.goal,
        intent,
        status: intent.requiresApproval && autonomyLevel === 'manual' ? 'waiting_approval' : 'in_progress',
        currentStepIndex: 0,
        steps: intent.actionSequence.map((seq, idx) => ({
          id: `step_${idx + 1}`,
          agent: seq.agent as AlmaAgentType,
          title: `Etapa ${seq.step}: ${seq.agent}`,
          description: seq.action,
          status: 'pending',
          result: seq.output
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentPlan(initialPlan);

      // Se for manual e requer aprovação, aguardar
      if (initialPlan.status === 'waiting_approval') {
        setAlmaState('WAITING_APPROVAL');
        speakText(`Intenção analisada: ${intent.explanation}. Deseja que eu execute este plano?`);
        return;
      }

      // 3. Alma Core Orchestrator
      setAlmaState('EXECUTING');
      const orchestrateRes = await apiRequest<{
        planId: string;
        summary: string;
        stepsExecuted: any[];
        agentOutputs: Record<string, any>;
      }>('/api/alma/orchestrate', {
        method: 'POST',
        body: { intent }
      });

      // Atualizar plano com as entregas
      const updatedSteps = initialPlan.steps.map((st, i) => {
        const match = orchestrateRes.stepsExecuted.find((e: any) => e.step === i + 1 || e.agent === st.agent);
        return {
          ...st,
          status: 'completed' as const,
          result: match ? match.output : st.result
        };
      });

      setCurrentPlan({
        ...initialPlan,
        status: 'completed',
        steps: updatedSteps,
        finalResult: orchestrateRes.summary
      });

      setAlmaState('SUCCESS');
      speakText(orchestrateRes.summary);

      setExecutionLogs(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), text: `Execução concluída com sucesso: ${orchestrateRes.summary}` },
        ...prev
      ]);
    } catch (err: any) {
      setAlmaState('ERROR');
      setErrorMessage(err.message || 'Falha na orquestração pelo ALMA Core.');
    }
  };

  const quickPrompts = [
    { label: '🎬 Modo Cinema', prompt: 'Alma, prepare a sala para assistir filme agora.' },
    { label: '🌙 Modo Sono', prompt: 'Alma, vou dormir, prepare toda a casa.' },
    { label: '📊 Diagnóstico de Vendas', prompt: 'Alma, analise por que minhas vendas diminuíram e gere um plano.' },
    { label: '🚀 Lançar Produto', prompt: 'Alma, quero lançar um novo produto com estratégia multicanal completa.' },
    { label: '📅 Reunião de Amanhã', prompt: 'Alma, prepare uma reunião executiva com pauta, apresentação e tarefas.' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Top Banner de Status do Regente */}
      <div className="p-4 md:p-6 rounded-3xl bg-gradient-to-r from-[#070D1F] via-[#0A1229] to-[#0D1836] border border-cyan-500/30 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-wider">ALMA X</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase tracking-widest">
                  O Regente Digital
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Você expressa a intenção. A Alma coordena inteligência, dispositivos, internet e agentes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Autonomia */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
              <Shield size={14} className="text-cyan-400" />
              <span className="text-slate-400">Autonomia:</span>
              <select
                value={autonomyLevel}
                onChange={(e) => setAutonomyLevel(e.target.value as AlmaAutonomyLevel)}
                className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="manual" className="bg-slate-900 text-white">Manual (Confirma Tudo)</option>
                <option value="assisted" className="bg-slate-900 text-white">Assistido (Recomendado)</option>
                <option value="automatic" className="bg-slate-900 text-white">Automático (Baixo/Médio Risco)</option>
                <option value="agent" className="bg-slate-900 text-white">Agente Pleno</option>
              </select>
            </div>

            {/* Toggle TTS */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                ttsEnabled
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/80 border-slate-700 text-slate-500'
              }`}
              title={ttsEnabled ? 'Voz ativada' : 'Voz desativada'}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Cockpit Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda/Centro: O Rosto Cibernético & Voz */}
        <div className="lg:col-span-6 p-6 md:p-8 rounded-3xl bg-[#090E1F]/90 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Status:</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {almaState}
            </span>
          </div>

          {/* Rosto do Alma */}
          <div className="my-4 cursor-pointer" onClick={() => handleExecuteIntent('Alma, qual é o status do sistema e o que você pode fazer hoje?')}>
            <AlmaCyberFace state={almaState} size="hero" />
          </div>

          {/* Feedback de voz ou status */}
          <p className="text-xs text-slate-400 font-mono max-w-sm mb-4">
            {almaState === 'LISTENING' && '🎤 Ouvindo com atenção... Fale agora.'}
            {almaState === 'THINKING' && '⚡ Alma Core interpretando intenção e domínio...'}
            {almaState === 'PLANNING' && '📋 Mobilizando agentes nativos e desenhando rota...'}
            {almaState === 'EXECUTING' && '⚙️ Executando ações nos dispositivos e APIs...'}
            {almaState === 'SPEAKING' && '🔊 Alma X comunicando diretrizes executivas...'}
            {almaState === 'SUCCESS' && '✨ Intenção concluída com precisão técnica.'}
            {almaState === 'IDLE' && 'Toque no microfone ou digite uma intenção.'}
          </p>

          {/* Acessos Rápidos por Domínio */}
          <div className="w-full flex items-center justify-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
            <button
              onClick={() => onNavigate('alma-home')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-all hover:text-cyan-300"
            >
              <Home size={13} className="text-amber-400" />
              <span>Casa</span>
            </button>
            <button
              onClick={() => onNavigate('alma-agents')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-all hover:text-indigo-300"
            >
              <Layers size={13} className="text-indigo-400" />
              <span>17 Agentes</span>
            </button>
            <button
              onClick={() => onNavigate('alma-vision')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-all hover:text-emerald-300"
            >
              <Camera size={13} className="text-emerald-400" />
              <span>Visão</span>
            </button>
            <button
              onClick={() => onNavigate('alma-memory')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-all hover:text-purple-300"
            >
              <Clock size={13} className="text-purple-400" />
              <span>Memória</span>
            </button>
          </div>
        </div>

        {/* Coluna Direita: Console de Intenção & Orquestração */}
        <div className="lg:col-span-6 space-y-4">
          {/* Input Bar do Regente */}
          <div className="p-4 md:p-5 rounded-3xl bg-[#090E1F] border border-cyan-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                Intenção em Linguagem Natural
              </span>
              <span className="text-[11px] text-slate-400">Ex: "Alma, resolva isso"</span>
            </div>

            <div className="relative flex items-center">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecuteIntent();
                  }
                }}
                placeholder="Ex: Alma, prepare a reunião de amanhã ou ajuste a sala para filme..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-3.5 pr-24 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none h-20"
              />

              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                  }`}
                  title="Comando por Voz"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteIntent()}
                  disabled={!promptInput.trim() || almaState === 'THINKING' || almaState === 'EXECUTING'}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
                  title="Executar Intenção"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Presets de Intenção Rápida */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Exemplos de Regência:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPromptInput(qp.prompt);
                      handleExecuteIntent(qp.prompt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Erros se houver */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resultado do Plano / Grafo de Execução */}
          {currentPlan && (
            <div className="p-5 rounded-3xl bg-[#090E1F] border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-cyan-400" />
                    Plano de Regência Ativo
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{currentPlan.goal}</p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentPlan.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {currentPlan.status}
                </span>
              </div>

              {/* Síntese Executiva */}
              {currentPlan.finalResult && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed font-medium">
                  {currentPlan.finalResult}
                </div>
              )}

              {/* Etapas Orquestradas por Agente */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentPlan.steps.map((st, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        Agente {st.agent}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">OK</span>
                    </div>
                    <p className="text-xs text-slate-300">{st.description}</p>
                    {st.result && (
                      <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg mt-1 font-mono">
                        {st.result}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
