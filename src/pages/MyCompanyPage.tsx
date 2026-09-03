import React from 'react';
import { CheckCircle2, ExternalLink, Globe2, Smartphone, Sparkles } from 'lucide-react';
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
      <header>
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <Sparkles className="text-cyan-400" /> Meus Projetos & Sites
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
          Esta é a fonte operacional do Portal Vip Brasil. Selecione o projeto que receberá campanhas, conteúdo, SEO, automação e conexões sociais.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((project) => {
          const active = selectedCompany?.id === project.id;
          return (
            <article key={project.id} className={`rounded-3xl border p-5 transition-all ${active ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                  {project.logoUrl ? <img src={project.logoUrl} alt="" className="h-full w-full object-cover" /> : <Globe2 className="m-3 text-cyan-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-white">{project.name}</h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">{project.category}</p>
                </div>
                {active && <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
              </div>

              <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-slate-400">{project.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => onSelectCompany(project)} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-black transition ${active ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/25'}`}>
                  {active ? 'Projeto ativo' : 'Usar neste projeto'}
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
          Ainda sem projetos configurados no registro oficial do Portal.
        </div>
      )}
    </div>
  );
};
