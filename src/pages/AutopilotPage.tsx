import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Rocket, ShieldCheck, Zap } from 'lucide-react';
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
  targetPlatforms: string[];
  primaryGoal: string;
  lastRunAt?: string;
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

export const AutopilotPage: React.FC<Props> = ({ companies, selectedCompany, onRefreshContents, onNavigate }) => {
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
  const save = async () => {
    if (!cfg || !selectedCompany) return;
    if (cfg.mode === 'automatic' && cfg.targetPlatforms.length === 0) {
      setMessage('Selecione ao menos uma rede social para o Autopilot multimídia.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const data = await apiRequest<{ config: AutopilotConfig }>('/api/autopilot/config', { method: 'POST', body: { ...cfg, companyId: selectedCompany.id } });
      setCfg(data.config); setMessage('Configuração específica salva com sucesso.');
    } catch (error: any) { setMessage(error.message || 'Falha ao salvar a automação.'); }
    finally { setSaving(false); }
  };
  const runNow = async () => {
    if (!selectedCompany) return;
    setLoading(true); setMessage('');
    try {
      const data = await apiRequest<{ result?: { success?: boolean; contentId?: string; message?: string } }>('/api/autopilot/trigger-now', { method: 'POST', body: { companyId: selectedCompany.id } });
      if (!data?.result?.success || !data.result.contentId) throw new Error(data?.result?.message || 'O ciclo terminou sem comprovar a gravação do conteúdo.');
      await onRefreshContents();
      setMessage(data.result.message || 'Conteúdo gerado com sucesso.');
    } catch (error: any) { setMessage(error.message || 'Falha ao executar o ciclo.'); }
    finally { setLoading(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
    <header className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"><Bot size={25}/></div>
          <div><h2 className="text-xl font-black text-white">Automação Global</h2><p className="text-xs text-slate-400">Os {companies.length} projetos ativos entram no ciclo diário global de marketing e Blog. Nenhum deles depende do foco manual selecionado.</p></div>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center"><div className="text-2xl font-black text-emerald-300">{companies.length}</div><div className="text-[10px] font-black uppercase text-emerald-200/80">ativos no motor</div></div>
      </div>
    </header>

    <section className="froc-panel">
      <h3 className="froc-section-title">Projetos no ciclo global</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{companies.map((project)=><div key={project.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs font-bold text-white">{project.name}</div><div className="mt-1 text-[10px] text-emerald-300">Marketing {project.dailyMarketingEnabled!==false?'ON':'OFF'} · Blog {project.dailyBlogEnabled!==false?'ON':'OFF'}</div></div>)}</div>
    </section>

    {!selectedCompany ? <div className="froc-panel text-center"><Bot size={38} className="mx-auto text-cyan-400"/><h2 className="mt-3 text-lg font-bold text-white">Escolha um foco manual</h2><p className="mt-1 text-xs text-slate-400">O ciclo global continua ativo. O foco só é necessário para configurar uma automação social específica ou executar agora em um projeto.</p><button onClick={() => onNavigate('projetos')} className="froc-primary mt-5">Meus Projetos & Sites</button></div> : <>
      <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-blue-950 via-[#0F172A] to-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-white">Configuração específica · {selectedCompany.name}</h2><p className="mt-1 text-xs text-slate-400">Opcional: controla geração manual/Autopilot e publicação social deste projeto. Não pausa os demais.</p></div>{cfg&&<label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4"><input type="checkbox" checked={cfg.enabled} onChange={(e) => patch({ enabled: e.target.checked })}/><span className={`text-xs font-bold ${cfg.enabled ? 'text-emerald-300' : 'text-slate-400'}`}>{cfg.enabled ? 'Autopilot específico ativo' : 'Autopilot específico pausado'}</span></label>}</div>
      </section>

      {message && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-200">{message}</div>}
      {loading && !cfg ? <div className="grid min-h-48 place-items-center text-xs text-slate-400">Carregando configuração…</div> : cfg ? <section className="froc-panel space-y-6">
        <div><h3 className="froc-section-title">Frequência específica</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{([['daily','Diariamente'],['3_times_week','3x por semana'],['weekly','Semanalmente']] as const).map(([id,label]) => <button key={id} onClick={() => patch({ frequency: id })} className={`min-h-16 rounded-2xl border p-4 text-left text-xs font-bold ${cfg.frequency===id?'border-cyan-400 bg-cyan-500/10 text-white':'border-slate-700 bg-slate-900 text-slate-300'}`}>{label}</button>)}</div></div>
        <div className="border-t border-slate-800 pt-5"><h3 className="froc-section-title">Modo de operação social</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><button onClick={() => setMode('manual_approval')} className={`rounded-2xl border p-4 text-left ${cfg.mode==='manual_approval'?'border-cyan-400 bg-cyan-500/10':'border-slate-700 bg-slate-900'}`}><div className="flex items-center gap-2 text-xs font-bold text-white"><ShieldCheck size={16} className="text-cyan-400"/>Aprovação manual</div><p className="mt-1 text-[11px] text-slate-400">Gera e salva para revisão.</p></button><button onClick={() => setMode('automatic')} className={`rounded-2xl border p-4 text-left ${cfg.mode==='automatic'?'border-cyan-400 bg-cyan-500/10':'border-slate-700 bg-slate-900'}`}><div className="flex items-center gap-2 text-xs font-bold text-white"><Rocket size={16} className="text-cyan-400"/>Automático</div><p className="mt-1 text-[11px] text-slate-400">Cria mídia e publica nos canais conectados. TikTok recebe rascunho para confirmação; YouTube usa fila de vídeo Veo.</p></button></div></div>
        <div className="border-t border-slate-800 pt-5"><h3 className="froc-section-title">Canais alvo</h3><div className="mt-3 flex flex-wrap gap-2">{channels.map((ch) => { const selected = cfg.targetPlatforms.includes(ch.name); const disabled = cfg.mode==='automatic' && !ch.direct; return <button key={ch.name} onClick={() => toggleChannel(ch.name,ch.direct)} className={`min-h-10 rounded-xl border px-3 text-xs font-semibold ${disabled?'cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600':selected?'border-cyan-400/60 bg-cyan-500/10 text-cyan-200':'border-slate-700 bg-slate-900 text-slate-400'}`}>{ch.name}{disabled?' · mídia/revisão':''}</button>; })}</div></div>
        <label className="block border-t border-slate-800 pt-5 text-xs font-semibold text-slate-300">Objetivo principal<textarea value={cfg.primaryGoal || ''} onChange={(e) => patch({ primaryGoal: e.target.value })} className="froc-input mt-1.5 min-h-24"/></label>
        {cfg.lastRunAt && <p className="text-[11px] text-slate-500">Última execução específica: {new Date(cfg.lastRunAt).toLocaleString('pt-BR')}</p>}
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row"><button onClick={save} disabled={saving} className="froc-primary flex items-center justify-center gap-2"><CheckCircle2 size={15}/>{saving?'Salvando…':'Salvar configuração'}</button><button onClick={runNow} disabled={loading} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-5 text-xs font-bold text-slate-200"><span className="flex items-center gap-2"><Zap size={15}/>{loading?'Executando…':'Executar agora neste foco'}</span></button></div>
      </section> : <div className="froc-panel text-rose-300">Não foi possível carregar a configuração. {message}</div>}
    </>}
  </div>;
};
