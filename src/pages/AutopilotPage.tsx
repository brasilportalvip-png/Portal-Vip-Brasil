import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Rocket, ShieldCheck, Zap } from 'lucide-react';
import type { Company } from '../types';
import { apiRequest } from '../lib/api';

interface Props {
  selectedCompany: Company | null;
  onNavigate: (tab: string) => void;
}

interface AutopilotConfig {
  id?: string;
  companyId: string;
  enabled: boolean;
  mode: 'manual_approval' | 'automatic';
  frequency: 'daily' | '3_times_week' | 'weekly';
  targetPlatforms: string[];
  primaryGoal: string;
  lastRunAt?: string;
}

const channels = [
  { name: 'Facebook', direct: true },
  { name: 'LinkedIn', direct: true },
  { name: 'X', direct: true },
  { name: 'Instagram', direct: false },
  { name: 'TikTok', direct: false },
  { name: 'YouTube', direct: false },
  { name: 'Pinterest', direct: false }
];

export const AutopilotPage: React.FC<Props> = ({ selectedCompany, onNavigate }) => {
  const [cfg, setCfg] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedCompany?.id) { setCfg(null); return; }
    setLoading(true);
    setMessage('');
    apiRequest<{ config: AutopilotConfig }>(`/api/autopilot/config?companyId=${encodeURIComponent(selectedCompany.id)}`)
      .then((data) => setCfg(data.config))
      .catch((error) => setMessage(error.message || 'Falha ao carregar o Autopilot.'))
      .finally(() => setLoading(false));
  }, [selectedCompany?.id]);

  const patch = (value: Partial<AutopilotConfig>) => setCfg((current) => current ? { ...current, ...value } : current);

  const setMode = (mode: AutopilotConfig['mode']) => {
    if (!cfg) return;
    if (mode === 'automatic') {
      const compatible = cfg.targetPlatforms.filter((name) => ['Facebook','LinkedIn','X'].includes(name));
      patch({ mode, targetPlatforms: compatible.length ? compatible : ['Facebook'] });
    } else {
      patch({ mode });
    }
  };

  const toggleChannel = (name: string, direct: boolean) => {
    if (!cfg) return;
    if (cfg.mode === 'automatic' && !direct) {
      setMessage(`${name} exige mídia ou fluxo específico e não será usado como publicação textual automática.`);
      return;
    }
    patch({ targetPlatforms: cfg.targetPlatforms.includes(name) ? cfg.targetPlatforms.filter((item) => item !== name) : [...cfg.targetPlatforms, name] });
  };

  const save = async () => {
    if (!cfg || !selectedCompany) return;
    if (cfg.mode === 'automatic' && !cfg.targetPlatforms.some((p) => ['Facebook','LinkedIn','X'].includes(p))) {
      setMessage('Selecione Facebook, LinkedIn ou X para publicação textual automática.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const data = await apiRequest<{ config: AutopilotConfig }>('/api/autopilot/config', {
        method: 'POST',
        body: { ...cfg, companyId: selectedCompany.id }
      });
      setCfg(data.config);
      setMessage('Configuração salva com sucesso.');
    } catch (error: any) {
      setMessage(error.message || 'Falha ao salvar a automação.');
    } finally { setSaving(false); }
  };

  const runNow = async () => {
    if (!selectedCompany) return;
    setLoading(true); setMessage('');
    try {
      await apiRequest('/api/autopilot/trigger-now', { method: 'POST', body: { companyId: selectedCompany.id } });
      setMessage('Ciclo executado. O conteúdo foi gerado para este projeto.');
    } catch (error: any) {
      setMessage(error.message || 'Falha ao executar o ciclo.');
    } finally { setLoading(false); }
  };

  if (!selectedCompany) return (
    <div className="froc-panel mx-auto max-w-3xl text-center">
      <Bot size={38} className="mx-auto text-cyan-400"/>
      <h2 className="mt-3 text-lg font-bold text-white">Selecione um projeto</h2>
      <p className="mt-1 text-xs text-slate-400">A automação é sempre isolada por projeto.</p>
      <button onClick={() => onNavigate('projetos')} className="froc-primary mt-5">Meus Projetos & Sites</button>
    </div>
  );

  if (loading && !cfg) return <div className="grid min-h-72 place-items-center text-xs text-slate-400">Carregando Autopilot…</div>;
  if (!cfg) return <div className="froc-panel text-rose-300">Não foi possível carregar a configuração. {message}</div>;

  return <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
    <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-blue-950 via-[#0F172A] to-slate-900 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"><Bot size={25}/></div>
          <div><h2 className="text-xl font-black text-white">Automação · {selectedCompany.name}</h2><p className="text-xs text-slate-400">Geração e publicação controladas por projeto e por conexão social válida.</p></div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => patch({ enabled: e.target.checked })}/>
          <span className={`text-xs font-bold ${cfg.enabled ? 'text-emerald-300' : 'text-slate-400'}`}>{cfg.enabled ? 'Ativo' : 'Pausado'}</span>
        </label>
      </div>
    </header>

    {message && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-200">{message}</div>}

    <section className="froc-panel space-y-6">
      <div>
        <h3 className="froc-section-title">Frequência</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {([['daily','Diariamente'],['3_times_week','3x por semana'],['weekly','Semanalmente']] as const).map(([id,label]) => (
            <button key={id} onClick={() => patch({ frequency: id })} className={`min-h-16 rounded-2xl border p-4 text-left text-xs font-bold ${cfg.frequency===id?'border-cyan-400 bg-cyan-500/10 text-white':'border-slate-700 bg-slate-900 text-slate-300'}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-5">
        <h3 className="froc-section-title">Modo de operação</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <button onClick={() => setMode('manual_approval')} className={`rounded-2xl border p-4 text-left ${cfg.mode==='manual_approval'?'border-cyan-400 bg-cyan-500/10':'border-slate-700 bg-slate-900'}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-white"><ShieldCheck size={16} className="text-cyan-400"/>Aprovação manual</div>
            <p className="mt-1 text-[11px] text-slate-400">Gera e salva para revisão antes da publicação.</p>
          </button>
          <button onClick={() => setMode('automatic')} className={`rounded-2xl border p-4 text-left ${cfg.mode==='automatic'?'border-cyan-400 bg-cyan-500/10':'border-slate-700 bg-slate-900'}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-white"><Rocket size={16} className="text-cyan-400"/>Automático</div>
            <p className="mt-1 text-[11px] text-slate-400">Publica apenas nos canais suportados e conectados ao projeto correto.</p>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-5">
        <h3 className="froc-section-title">Canais alvo</h3>
        <div className="mt-3 flex flex-wrap gap-2">{channels.map((ch) => {
          const selected = cfg.targetPlatforms.includes(ch.name);
          const disabled = cfg.mode==='automatic' && !ch.direct;
          return <button key={ch.name} onClick={() => toggleChannel(ch.name,ch.direct)} className={`min-h-10 rounded-xl border px-3 text-xs font-semibold ${disabled?'cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600':selected?'border-cyan-400/60 bg-cyan-500/10 text-cyan-200':'border-slate-700 bg-slate-900 text-slate-400'}`}>{ch.name}{disabled?' · mídia/revisão':''}</button>;
        })}</div>
      </div>

      <label className="block border-t border-slate-800 pt-5 text-xs font-semibold text-slate-300">Objetivo principal
        <textarea value={cfg.primaryGoal || ''} onChange={(e) => patch({ primaryGoal: e.target.value })} className="froc-input mt-1.5 min-h-24"/>
      </label>

      {cfg.lastRunAt && <p className="text-[11px] text-slate-500">Última execução registrada: {new Date(cfg.lastRunAt).toLocaleString('pt-BR')}</p>}

      <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row">
        <button onClick={save} disabled={saving} className="froc-primary flex items-center justify-center gap-2"><CheckCircle2 size={15}/>{saving?'Salvando…':'Salvar Automação'}</button>
        <button onClick={runNow} disabled={loading} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-5 text-xs font-bold text-slate-200"><span className="flex items-center gap-2"><Zap size={15}/>{loading?'Executando…':'Executar agora'}</span></button>
      </div>
    </section>
  </div>;
};
