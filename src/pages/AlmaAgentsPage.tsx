import React, { useState } from 'react';
import {
  Layers,
  Search,
  Compass,
  Briefcase,
  Megaphone,
  Share2,
  Home,
  Palette,
  Code2,
  BarChart3,
  DollarSign,
  Calendar,
  CheckSquare,
  Globe,
  MapPin,
  Camera,
  Film,
  Sparkles,
  Send,
  ArrowRight,
  Bot
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export const AlmaAgentsPage: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('STRATEGY');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentOutput, setAgentOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const agents = [
    { id: 'RESEARCH', name: 'Alma Research', icon: Search, role: 'Investigação profunda na web, fatos e inteligência competitiva.', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { id: 'STRATEGY', name: 'Alma Strategy', icon: Compass, role: 'Tomada de decisão estratégica e planejamento executivo.', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    { id: 'BUSINESS', name: 'Alma Business', icon: Briefcase, role: 'Modelos de negócio, precificação, unit economics e viabilidade.', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'MARKETING', name: 'Alma Marketing', icon: Megaphone, role: 'Branding, posicionamento, campanhas e funis de conversão.', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
    { id: 'SOCIAL', name: 'Alma Social', icon: Share2, role: 'Gestão de redes sociais, calendários de postagens e métricas.', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'ARCHITECT', name: 'Alma Architect', icon: Home, role: 'Design de interiores, espacial, reformas, plantas e orçamentos.', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'CREATIVE', name: 'Alma Creative', icon: Palette, role: 'Criação de textos, roteiros, slogans e conceitos visuais.', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'CODE', name: 'Alma Code', icon: Code2, role: 'Engenharia de software, scripts, arquitetura e automações.', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'DATA', name: 'Alma Data', icon: BarChart3, role: 'Planilhas, métricas, indicadores, projeções e JSON/CSV.', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
    { id: 'FINANCE', name: 'Alma Finance', icon: DollarSign, role: 'Orçamento, finanças corporativas, fluxo de caixa e ROI.', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    { id: 'PROJECT', name: 'Alma Project', icon: Calendar, role: 'Metas, cronogramas, workflows em etapas e entregáveis.', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { id: 'PRODUCTIVITY', name: 'Alma Productivity', icon: CheckSquare, role: 'Tarefas diárias, rotinas, lembretes e priorização.', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
    { id: 'WEB', name: 'Alma Web', icon: Globe, role: 'Navegação web, leitura de URLs, APIs e serviços online.', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    { id: 'HOME', name: 'Alma Home', icon: Home, role: 'Automação residencial, Matter, iluminação, clima e segurança.', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    { id: 'MAPS', name: 'Alma Maps', icon: MapPin, role: 'Rotas, trânsito, mobilidade, logística e estabelecimentos.', color: 'text-lime-400 bg-lime-500/10 border-lime-500/30' },
    { id: 'VISION', name: 'Alma Vision', icon: Camera, role: 'Inspeção visual, reconhecimento de imagem, OCR e plantas.', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' },
    { id: 'MEDIA', name: 'Alma Media', icon: Film, role: 'Geração de imagens, roteirização de vídeos, áudio e artes.', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
  ];

  const currentAgentObj = agents.find(a => a.id === selectedAgent) || agents[0];

  const handleRunAgent = async () => {
    if (!agentPrompt.trim()) return;
    setLoading(true);
    setAgentOutput('');

    try {
      const intentRes = await apiRequest<{ intent: any }>('/api/alma/intent', {
        method: 'POST',
        body: {
          prompt: `[Atuando como ${currentAgentObj.name}]: ${agentPrompt}`,
          context: { forcedAgent: selectedAgent }
        }
      });

      const res = await apiRequest<{ summary: string; agentOutputs: Record<string, any> }>('/api/alma/orchestrate', {
        method: 'POST',
        body: { intent: intentRes.intent }
      });

      const specificOut = res.agentOutputs?.[selectedAgent] || res.summary;
      setAgentOutput(specificOut);
    } catch (err: any) {
      setAgentOutput(`Erro ao acionar agente: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-[#0A1329] to-slate-900 border border-indigo-500/30 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-500/20">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">ALMA Agent Studio</h2>
            <p className="text-xs text-slate-300">
              17 Agentes Nativos Especializados trabalhando sob a regência do ALMA Core.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Seleção dos 17 Agentes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {agents.map(ag => {
          const Icon = ag.icon;
          const isSel = selectedAgent === ag.id;
          return (
            <button
              key={ag.id}
              onClick={() => {
                setSelectedAgent(ag.id);
                setAgentOutput('');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isSel
                  ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-[#0E172A]/70 hover:bg-[#0E172A] border-slate-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 ${ag.color}`}>
                <Icon size={16} />
              </div>
              <h4 className="text-xs font-bold text-white truncate">{ag.name}</h4>
              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{ag.role}</p>
            </button>
          );
        })}
      </div>

      {/* Workspace do Agente Selecionado */}
      <div className="p-6 rounded-3xl bg-[#090E1F] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className={`p-3 rounded-2xl border ${currentAgentObj.color}`}>
            <currentAgentObj.icon size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{currentAgentObj.name}</h3>
            <p className="text-xs text-slate-400">{currentAgentObj.role}</p>
          </div>
        </div>

        {/* Input Direto para o Agente */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Instrução ou tarefa para o agente:</label>
          <div className="relative">
            <textarea
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder={`Ex: Como ${currentAgentObj.name}, elabore um plano detalhado para...`}
              className="w-full bg-slate-950/90 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 h-24 resize-none"
            />
            <button
              onClick={handleRunAgent}
              disabled={loading || !agentPrompt.trim()}
              className="absolute right-3 bottom-3 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
            >
              {loading ? 'Executando...' : 'Acionar Agente'}
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Output do Agente */}
        {agentOutput && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
            {agentOutput}
          </div>
        )}
      </div>
    </div>
  );
};
