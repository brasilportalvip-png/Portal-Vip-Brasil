import React from 'react';
import { BarChart3, BookOpen, Bot, Calendar, ChevronLeft, ChevronRight, FolderOpen, HelpCircle, LayoutDashboard, Settings, Share2, ShieldAlert, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { Company, User as UserType, Wallet } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: UserType | null;
  wallet?: Wallet | null;
  selectedCompany?: Company | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Blog & Início', icon: BookOpen, badge: 'PORTAL' },
  { id: 'vitrine', label: 'Vitrine de Projetos', icon: Store, badge: 'VIP' },
  { id: 'dashboard', label: 'Central de Operação', icon: LayoutDashboard },
  { id: 'projetos', label: 'Meus Projetos & Sites', icon: Sparkles },
  { id: 'autopilot', label: 'Automação', icon: Sparkles, badge: 'AUTO' },
  { id: 'froc-ia', label: 'Froc Marketing IA', icon: Bot },
  { id: 'redes-sociais', label: 'Redes Sociais', icon: Share2 },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
  { id: 'conteudos', label: 'Biblioteca', icon: FolderOpen },
  { id: 'analytics', label: 'Métricas', icon: BarChart3 },
  { id: 'perfil', label: 'Configurações', icon: Settings },
  { id: 'suporte', label: 'Ajuda', icon: HelpCircle }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, user, isCollapsed, onToggleCollapse, isAdmin }) => (
  <aside className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-white/[0.08] bg-[#080D1A]/95 backdrop-blur-xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
    <div className="flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#070B14]/80 px-4">
      <div className="cursor-pointer overflow-hidden" onClick={() => onSelectTab('dashboard')}><BrandLogo size="md" showText={!isCollapsed} /></div>
      <button onClick={onToggleCollapse} className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-white" title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </div>
    <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2 py-3">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = currentTab === item.id;
        return <button key={item.id} onClick={() => onSelectTab(item.id)} title={isCollapsed ? item.label : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${active ? 'border-cyan-500/40 bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-300' : 'border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white'} ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <Icon size={18} className={active ? 'text-cyan-400' : 'text-slate-400'} />
          {!isCollapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
          {!isCollapsed && item.badge && <span className="rounded border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300">{item.badge}</span>}
        </button>;
      })}
      {isAdmin && <div className="mt-2 border-t border-slate-800 pt-2"><button onClick={() => onSelectTab('admin')} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-bold ${currentTab === 'admin' ? 'border-amber-500/40 bg-amber-500/20 text-amber-300' : 'border-transparent text-amber-400 hover:bg-amber-950/20'} ${isCollapsed ? 'justify-center px-0' : ''}`}><ShieldAlert size={18}/>{!isCollapsed && <span>Painel Admin</span>}</button></div>}
    </div>
    <div className="border-t border-white/[0.08] bg-[#070B14]/80 p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-tr from-cyan-600 to-blue-600 text-xs font-bold text-white">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>
        {!isCollapsed && <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">{user?.name || 'Acesso privado'}</div><div className="truncate text-[10px] text-slate-400">{user?.email || 'Administrador'}</div></div>}
      </div>
    </div>
  </aside>
);
