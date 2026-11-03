import React, { useEffect, useState } from 'react';
import { Menu, X, Plus, Trash2, MessageSquare, Power, Store, Newspaper, LayoutDashboard, Rocket, Image, Video, FileText, PenSquare, Bot, Globe, Megaphone, Calendar, Share2, FolderOpen, BarChart3, Settings, ShieldCheck, LogIn, LogOut, LifeBuoy, Sparkles } from 'lucide-react';
import { formatChatDate, type SavedChat } from '../../froc/history';

interface Props {
  isOwner: boolean;
  isLoggedIn: boolean;
  chats: SavedChat[];
  currentChatId: string;
  conversationOpen: boolean;
  onNewChat: () => void;
  onOpenChat: (c: SavedChat) => void;
  onDeleteChat: (id: string) => void;
  onEndChat: () => void;
  onNavigate: (tab: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  /** Abre já na lista de conversas, pedindo para confirmar a exclusão desta. */
  askDeleteId?: string | null;
  onAskDeleteHandled?: () => void;
}

const PUBLIC_LINKS: Array<[string, string, React.ElementType]> = [
  ['vitrine', 'Vitrine de projetos', Store],
  ['blog', 'Blog e posts', Newspaper],
];

const OWNER_LINKS: Array<[string, string, React.ElementType]> = [
  ['dashboard', 'Central de operação', LayoutDashboard],
  ['projetos', 'Meus projetos & sites', Sparkles],
  ['autopilot', 'Automação', Rocket],
  ['criar-conteudo', 'Criar conteúdo', PenSquare],
  ['criar-imagem', 'Criar imagem', Image],
  ['criar-video', 'Criar vídeo', Video],
  ['criar-artigo', 'Criar artigo', FileText],
  ['agentes', '30 agentes IA', Bot],
  ['seo', 'SEO & pings', Globe],
  ['campanhas', 'Campanhas', Megaphone],
  ['calendario', 'Calendário', Calendar],
  ['redes-sociais', 'Redes sociais', Share2],
  ['conteudos', 'Conteúdos', FolderOpen],
  ['analytics', 'Analytics', BarChart3],
  ['perfil', 'Configurações', Settings],
  ['admin', 'Administração', ShieldCheck],
  ['suporte', 'Suporte', LifeBuoy],
];

/** Menu ☰ (três tracinhos): conversas, vitrine, posts e todas as funções, num lugar só. */
export function FrocMenu(p: Props) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (p.askDeleteId) { setOpen(true); setConfirmId(p.askDeleteId); p.onAskDeleteHandled?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.askDeleteId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (fn: () => void) => () => { setOpen(false); setConfirmId(null); fn(); };
  const item = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-[#d4a937]/10 hover:text-[#f5d67a] transition cursor-pointer text-left';
  const tab = open ? 0 : -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="froc-menu-button"
        aria-label="Abrir menu"
        aria-expanded={open}
        className="shrink-0 w-10 h-10 rounded-xl border border-[#d4a937]/50 text-[#f5d67a] flex items-center justify-center cursor-pointer hover:bg-[#d4a937]/10"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className={`fixed inset-0 z-[80] ${open ? '' : 'pointer-events-none invisible'}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/70 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside
          data-testid="froc-menu-panel"
          className={`absolute left-0 top-0 h-full w-[86%] max-w-xs bg-[#070707] border-r border-[#d4a937]/40 shadow-2xl overflow-y-auto pvf-scroll transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#d4a937]/30">
            <span className="pvf-gold-text font-black tracking-widest text-sm">PORTAL VIP BRASIL</span>
            <button onClick={() => setOpen(false)} tabIndex={tab} aria-label="Fechar menu" className="w-8 h-8 flex items-center justify-center text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          <nav aria-label="Conversas" className="py-1">
            <button className={item} onClick={go(p.onNewChat)} tabIndex={tab} data-testid="froc-menu-new"><Plus className="w-4 h-4 text-emerald-400" /> Nova conversa</button>
            {p.conversationOpen && (
              <button className={item} onClick={go(p.onEndChat)} tabIndex={tab} data-testid="froc-menu-end"><Power className="w-4 h-4 text-pink-400" /> Fechar conversa</button>
            )}
          </nav>
          <div className="px-4 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">Conversas salvas neste aparelho</div>
          <ul className="pb-2" data-testid="froc-chat-list">
            {!p.chats.length && <li className="px-4 py-2 text-xs text-slate-500">Nenhuma conversa ainda.</li>}
            {p.chats.map((c) => (
              <li key={c.id} className={`group flex items-center gap-1 pr-2 ${c.id === p.currentChatId ? 'bg-[#d4a937]/10' : ''}`}>
                {confirmId === c.id ? (
                  <div className="flex-1 flex items-center gap-2 px-4 py-2 text-xs">
                    <span className="text-pink-300 flex-1">Excluir esta conversa?</span>
                    <button className="px-2 py-1 rounded bg-pink-600 text-white cursor-pointer" tabIndex={tab} data-testid="froc-chat-delete-yes" onClick={() => { p.onDeleteChat(c.id); setConfirmId(null); }}>Excluir</button>
                    <button className="px-2 py-1 rounded border border-slate-600 text-slate-300 cursor-pointer" tabIndex={tab} onClick={() => setConfirmId(null)}>Não</button>
                  </div>
                ) : (
                  <>
                    <button className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2 text-left cursor-pointer" tabIndex={tab} onClick={go(() => p.onOpenChat(c))}>
                      <MessageSquare className="w-3.5 h-3.5 text-[#d4a937] shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-slate-200">{c.title}</span>
                        <span className="block text-[10px] text-slate-500">{formatChatDate(c.updatedAt)}</span>
                      </span>
                    </button>
                    <button aria-label="Excluir conversa" data-testid="froc-chat-delete" tabIndex={tab} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-pink-400 cursor-pointer" onClick={() => setConfirmId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <nav aria-label="Portal" className="border-t border-slate-900 py-1">
            {PUBLIC_LINKS.map(([id, label, Icon]) => (
              <button key={id} className={item} onClick={go(() => p.onNavigate(id))} tabIndex={tab} data-testid={`froc-menu-${id}`}><Icon className="w-4 h-4 text-[#f5d67a]" /> {label}</button>
            ))}
          </nav>
          {p.isOwner && (
            <nav aria-label="Ferramentas do dono" className="border-t border-slate-900 py-1">
              <div className="px-4 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#d4a937]">Ferramentas do dono</div>
              {OWNER_LINKS.map(([id, label, Icon]) => (
                <button key={id} className={item} onClick={go(() => p.onNavigate(id))} tabIndex={tab}><Icon className="w-4 h-4 text-emerald-400" /> {label}</button>
              ))}
            </nav>
          )}
          <nav aria-label="Conta" className="border-t border-slate-900 py-1">
            {p.isLoggedIn
              ? <button className={item} onClick={go(p.onLogout)} tabIndex={tab}><LogOut className="w-4 h-4 text-pink-400" /> Sair</button>
              : <button className={item} onClick={go(p.onLogin)} tabIndex={tab} data-testid="froc-menu-login"><LogIn className="w-4 h-4 text-slate-400" /> Entrar (área do dono)</button>}
            <a href="/termos" tabIndex={tab} onClick={(e) => { e.preventDefault(); setOpen(false); p.onNavigate('termos'); }} className="block px-4 py-2 text-[12px] text-slate-500 hover:text-[#f5d67a]">Termos de uso</a>
            <a href="/privacidade" tabIndex={tab} onClick={(e) => { e.preventDefault(); setOpen(false); p.onNavigate('privacidade'); }} className="block px-4 py-2 text-[12px] text-slate-500 hover:text-[#f5d67a]">Política de privacidade</a>
          </nav>
        </aside>
      </div>
    </>
  );
}
