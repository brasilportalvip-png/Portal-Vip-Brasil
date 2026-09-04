import React from 'react';
import { CheckCircle2, ExternalLink, Globe2, Smartphone, Sparkles, Target } from 'lucide-react';
import type { Company } from '../types';

interface Props {
  companies: Company[];
  selectedCompany: Company | null;
  onRefreshCompanies: () => void;
  onSelectCompany: (company: Company) => void;
}

export const MyCompanyPage: React.FC<Props> = ({ companies, selectedCompany, onSelectCompany }) => {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fadeIn">
      <header className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-white">
              <Sparkles className="text-cyan-400" /> Meus Projetos & Sites
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              Todos os projetos ativos participam do motor global do Portal Vip Brasil. A seleção abaixo serve apenas como foco para ações manuais e configuração de conexões específicas.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
            <div className="text-2xl font-black text-emerald-300">{companies.length}</div>
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-200/80">projetos ativos</div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((project) => {
          const focused = selectedCompany?.id === project.id;
          return (
            <article key={project.id} className={`rounded-3xl border p-5 transition-all ${focused ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                  {project.logoUrl ? <img src={project.logoUrl} alt="" className="h-full w-full object-cover" /> : <Globe2 className="m-3 text-cyan-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-white">{project.name}</h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">{project.category}</p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Projeto ativo</span>
                {project.dailyMarketingEnabled !== false && <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">Marketing diário</span>}
                {project.dailyBlogEnabled !== false && <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-300">Blog diário</span>}
              </div>

              <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-slate-400">{project.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => onSelectCompany(project)} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-black transition ${focused ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500/40'}`}>
                  <span className="inline-flex items-center gap-1.5"><Target size={13}/>{focused ? 'Foco manual atual' : 'Abrir ferramentas'}</span>
                </button>
                {project.website && (
                  <a href={project.website} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-300 hover:text-white" title="Abrir site">
                    <ExternalLink size={14} />
                  </a>
                )}
                {project.androidApp && (
                  <a href={project.androidApp} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-300 hover:text-white" title="Abrir aplicativo">
                    <Smartphone size={14} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!companies.length && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
          Nenhum projeto ativo. Cadastre ou reative um projeto em Administração → Projetos & Sites.
        </div>
      )}
    </div>
  );
};
