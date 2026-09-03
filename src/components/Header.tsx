import React, { useState } from 'react';
import { ChevronDown, ExternalLink, LogOut, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react';
import type { Company, User } from '../types';

interface HeaderProps {
  user: User | null;
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  isSidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ user, companies, selectedCompany, onSelectCompany, onOpenAuth, onLogout, onNavigate, isSidebarCollapsed }) => {
  const [showProjects, setShowProjects] = useState(false);
  const [showUser, setShowUser] = useState(false);
  return <header className={`fixed right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#070B14]/85 px-6 backdrop-blur-xl transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
    <div className="flex items-center gap-4">
      <div><h1 className="text-sm font-semibold text-white">Portal Vip Brasil</h1><p className="text-[11px] text-slate-400">Central privada de marketing e automação</p></div>
      <div className="relative">
        <button onClick={() => setShowProjects(!showProjects)} className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-white hover:border-cyan-500/40">
          <Sparkles size={14} className="text-cyan-400"/><span className="max-w-[190px] truncate font-medium">{selectedCompany?.name || 'Selecionar projeto'}</span><ChevronDown size={14} className="text-slate-400"/>
        </button>
        {showProjects && <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Meus Projetos & Sites</div>
          <div className="custom-scrollbar max-h-64 space-y-0.5 overflow-y-auto py-1">{companies.map((project) => <button key={project.id} onClick={() => { onSelectCompany(project); setShowProjects(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs ${selectedCompany?.id === project.id ? 'border border-cyan-500/30 bg-blue-600/20 font-semibold text-cyan-300' : 'text-slate-300 hover:bg-slate-800/80'}`}><span className="truncate">{project.name}</span><span className="ml-2 truncate text-[9px] text-slate-500">{project.category}</span></button>)}</div>
          <button onClick={() => { onNavigate('projetos'); setShowProjects(false); }} className="mt-1 w-full border-t border-slate-800 px-3 py-2 text-left text-xs font-bold text-cyan-400 hover:text-cyan-300">Gerenciar seleção de projetos</button>
        </div>}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {selectedCompany?.website && <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white md:flex"><ExternalLink size={13}/>Abrir projeto</a>}
      {user ? <div className="relative"><button onClick={() => setShowUser(!showUser)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#1E293B] p-1.5"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-xs font-bold text-white">{user.name ? user.name[0].toUpperCase() : 'U'}</div><ChevronDown size={14} className="text-slate-400"/></button>{showUser && <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-700 bg-[#1E293B] p-2 shadow-2xl"><div className="border-b border-slate-700/80 px-3 py-2"><p className="truncate text-xs font-bold text-white">{user.name}</p><p className="truncate text-[11px] text-slate-400">{user.email}</p></div><button onClick={() => { onNavigate('perfil'); setShowUser(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"><UserIcon size={14}/>Configurações</button>{user.role === 'admin' && <button onClick={() => { onNavigate('admin'); setShowUser(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-amber-950/40"><ShieldAlert size={14}/>Painel Administrativo</button>}<button onClick={() => { onLogout(); setShowUser(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/30"><LogOut size={14}/>Sair</button></div>}</div> : <button onClick={onOpenAuth} className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white">Entrar</button>}
    </div>
  </header>;
};
