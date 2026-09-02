import React from 'react';
import { BookOpen, Store, LayoutDashboard, PlusCircle, UserRound } from 'lucide-react';

interface Props { currentTab: string; onNavigate: (tab: string) => void; }
const items = [
  { tab: 'home', label: 'Blog', icon: BookOpen, highlight: true },
  { tab: 'vitrine', label: 'Vitrine', icon: Store },
  { tab: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { tab: 'criar-artigo', label: 'Criar', icon: PlusCircle },
  { tab: 'perfil', label: 'Conta', icon: UserRound }
];

export const BottomNav: React.FC<Props> = ({ currentTab, onNavigate }) => (
  <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800/90 bg-[#0B0F19]/95 px-[max(10px,env(safe-area-inset-left))] pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
    <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
      {items.map(({ tab, label, icon: Icon, highlight }) => {
        const active = currentTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition ${
              active
                ? highlight
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'bg-cyan-500/12 text-cyan-300'
                : highlight
                ? 'text-cyan-400/80 hover:bg-slate-800/70 hover:text-white'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} className={highlight && !active ? 'text-cyan-400' : ''} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);


