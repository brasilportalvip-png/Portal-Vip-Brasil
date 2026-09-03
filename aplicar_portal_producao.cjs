const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const touched = new Set();

function file(rel) { return path.join(root, rel); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }
function write(rel, content) {
  const target = file(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.replace(/\r?\n/g, '\n'), 'utf8');
  touched.add(rel);
}
function replaceExact(rel, from, to, expected = 1) {
  let content = read(rel);
  const count = content.split(from).length - 1;
  if (count !== expected) {
    throw new Error(`[PATCH] ${rel}: esperado ${expected} ocorrência(s), encontrado ${count}. Arquivo pode ter mudado.`);
  }
  content = content.split(from).join(to);
  write(rel, content);
}
function replaceRegex(rel, regex, to, min = 1) {
  let content = read(rel);
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  if (count < min) throw new Error(`[PATCH] ${rel}: padrão não encontrado: ${regex}`);
  content = content.replace(regex, to);
  write(rel, content);
}

// 1) Adaptador: os projetos oficiais viram a identidade operacional usada pelas telas legadas.
write('src/lib/portalProjectAdapter.ts', `import type { Company } from '../types';
import { USER_PORTFOLIO_PROJECTS } from '../data/portalProjects';

export const PORTAL_PROJECT_COMPANIES: Company[] = USER_PORTFOLIO_PROJECTS.map((project) => ({
  id: project.id,
  userId: 'portal-project',
  name: project.name,
  slug: project.slug,
  logoUrl: project.logoUrl,
  description: project.description,
  businessType: 'online',
  onlineChannels: ['Site / Aplicativo', 'Redes Sociais'],
  website: project.websiteUrl,
  androidApp: project.playStoreUrl,
  category: project.category,
  segment: project.segment,
  products: [],
  services: [],
  targetAudience: project.targetAudience,
  coverageRegion: 'Digital / Brasil',
  differentials: project.highlights.join(' • '),
  brandTone: 'Autêntico, claro e coerente com a identidade do projeto',
  goals: 'Crescimento orgânico, autoridade, tráfego qualificado e divulgação automatizada',
  competitors: [],
  keywords: project.keywords,
  isPublicInVitrine: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}));

export function initialPortalProject(): Company | null {
  if (!PORTAL_PROJECT_COMPANIES.length) return null;
  try {
    const stored = localStorage.getItem('portal_vip_selected_project');
    return PORTAL_PROJECT_COMPANIES.find((project) => project.id === stored) || PORTAL_PROJECT_COMPANIES[0];
  } catch {
    return PORTAL_PROJECT_COMPANIES[0];
  }
}
`);

// 2) App: deixa de buscar /api/companies; usa somente o registro oficial de projetos.
replaceExact(
  'src/App.tsx',
  "import { auth } from './lib/firebase';",
  "import { auth } from './lib/firebase';\nimport { initialPortalProject, PORTAL_PROJECT_COMPANIES } from './lib/portalProjectAdapter';"
);
replaceExact('src/App.tsx', "import { CreditsPage } from './pages/CreditsPage';\n", '');
replaceExact(
  'src/App.tsx',
  "  empresa: '/empresa',",
  "  projetos: '/projetos',"
);
replaceExact('src/App.tsx', "  planos: '/planos',\n", '');
replaceExact('src/App.tsx', "  creditos: '/creditos',\n", '');
replaceExact(
  'src/App.tsx',
  "  'direitos-lgpd': 'lgpd'",
  "  'direitos-lgpd': 'lgpd',\n  empresa: 'projetos',\n  company: 'projetos',\n  companies: 'projetos',\n  planos: 'dashboard',\n  creditos: 'dashboard'"
);
replaceExact(
  'src/App.tsx',
  "  const [companies, setCompanies] = useState<Company[]>([]);\n  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);",
  "  const [companies, setCompanies] = useState<Company[]>(PORTAL_PROJECT_COMPANIES);\n  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => initialPortalProject());"
);
replaceExact(
  'src/App.tsx',
  "    setCompanies([]);\n    setSelectedCompany(null);",
  "    setCompanies(PORTAL_PROJECT_COMPANIES);\n    setSelectedCompany((current) => current || initialPortalProject());"
);
replaceRegex(
  'src/App.tsx',
  /  const refreshCompanies = useCallback\(async \(signal\?: AbortSignal, epoch\?: number\) => \{[\s\S]*?\n  \}, \[user\]\);/,
  `  const refreshCompanies = useCallback(async (_signal?: AbortSignal, _epoch?: number) => {
    setCompanies(PORTAL_PROJECT_COMPANIES);
    setSelectedCompany((current) => {
      if (current && PORTAL_PROJECT_COMPANIES.some((project) => project.id === current.id)) return current;
      return initialPortalProject();
    });
  }, []);`
);
replaceExact(
  'src/App.tsx',
  "  const handleSelectCompany = useCallback((company: Company) => {\n    setSelectedCompany(company);\n  }, []);",
  "  const handleSelectCompany = useCallback((company: Company) => {\n    setSelectedCompany(company);\n    try { localStorage.setItem('portal_vip_selected_project', company.id); } catch {}\n  }, []);"
);
replaceExact('src/App.tsx', "      case 'empresa':", "      case 'projetos':");
replaceExact(
  'src/App.tsx',
  "      case 'creditos':\n        return <CreditsPage wallet={wallet} onRefreshWallet={refreshWallet} onNavigate={navigate} />;\n      case 'planos':\n        return <CreditsPage wallet={wallet} onRefreshWallet={refreshWallet} onNavigate={navigate} />;\n",
  ''
);

// 3) Tela de projetos: somente projetos oficiais, sem CRUD de empresas.
write('src/pages/MyCompanyPage.tsx', `import React from 'react';
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
            <article key={project.id} className={\`rounded-3xl border p-5 transition-all \${active ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}\`}>
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
                <button type="button" onClick={() => onSelectCompany(project)} className={\`min-h-10 flex-1 rounded-xl px-3 text-xs font-black transition \${active ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/25'}\`}>
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
`);

// 4) Sidebar simplificada e sem plano/crédito/status inventado.
write('src/components/Sidebar.tsx', `import React from 'react';
import { BarChart3, BookOpen, Bot, Calendar, ChevronLeft, ChevronRight, FolderOpen, HelpCircle, LayoutDashboard, Settings, Share2, ShieldAlert, Sparkles, Store } from 'lucide-react';
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

const menuItems = [
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
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, user, isCollapsed, onToggleCollapse, isAdmin }) => (
  <aside className={\`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-white/[0.08] bg-[#080D1A]/95 backdrop-blur-xl transition-all duration-300 \${isCollapsed ? 'w-20' : 'w-64'}\`}>
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
        return <button key={item.id} onClick={() => onSelectTab(item.id)} title={isCollapsed ? item.label : undefined} className={\`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all \${active ? 'border-cyan-500/40 bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-300' : 'border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white'} \${isCollapsed ? 'justify-center px-0' : ''}\`}>
          <Icon size={18} className={active ? 'text-cyan-400' : 'text-slate-400'} />
          {!isCollapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
          {!isCollapsed && item.badge && <span className="rounded border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300">{item.badge}</span>}
        </button>;
      })}
      {isAdmin && <div className="mt-2 border-t border-slate-800 pt-2"><button onClick={() => onSelectTab('admin')} className={\`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-bold \${currentTab === 'admin' ? 'border-amber-500/40 bg-amber-500/20 text-amber-300' : 'border-transparent text-amber-400 hover:bg-amber-950/20'} \${isCollapsed ? 'justify-center px-0' : ''}\`}><ShieldAlert size={18}/>{!isCollapsed && <span>Painel Admin</span>}</button></div>}
    </div>
    <div className="border-t border-white/[0.08] bg-[#070B14]/80 p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-tr from-cyan-600 to-blue-600 text-xs font-bold text-white">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>
        {!isCollapsed && <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">{user?.name || 'Acesso privado'}</div><div className="truncate text-[10px] text-slate-400">{user?.email || 'Administrador'}</div></div>}
      </div>
    </div>
  </aside>
);
`);

// 5) Header: seletor de projetos, sem plano/créditos/cadastro e sem status falso.
write('src/components/Header.tsx', `import React, { useState } from 'react';
import { ChevronDown, ExternalLink, LogOut, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react';
import type { Company, User, Wallet } from '../types';

interface HeaderProps {
  user: User | null;
  wallet?: Wallet | null;
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
  return <header className={\`fixed right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#070B14]/85 px-6 backdrop-blur-xl transition-all duration-300 \${isSidebarCollapsed ? 'left-20' : 'left-64'}\`}>
    <div className="flex items-center gap-4">
      <div><h1 className="text-sm font-semibold text-white">Portal Vip Brasil</h1><p className="text-[11px] text-slate-400">Central privada de marketing e automação</p></div>
      <div className="relative">
        <button onClick={() => setShowProjects(!showProjects)} className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-white hover:border-cyan-500/40">
          <Sparkles size={14} className="text-cyan-400"/><span className="max-w-[190px] truncate font-medium">{selectedCompany?.name || 'Selecionar projeto'}</span><ChevronDown size={14} className="text-slate-400"/>
        </button>
        {showProjects && <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Meus Projetos & Sites</div>
          <div className="custom-scrollbar max-h-64 space-y-0.5 overflow-y-auto py-1">{companies.map((project) => <button key={project.id} onClick={() => { onSelectCompany(project); setShowProjects(false); }} className={\`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs \${selectedCompany?.id === project.id ? 'border border-cyan-500/30 bg-blue-600/20 font-semibold text-cyan-300' : 'text-slate-300 hover:bg-slate-800/80'}\`}><span className="truncate">{project.name}</span><span className="ml-2 truncate text-[9px] text-slate-500">{project.category}</span></button>)}</div>
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
`);

// 6) Mobile drawer simplificado.
write('src/components/MobileDrawer.tsx', `import React from 'react';
import { BarChart3, Bot, CalendarDays, FolderOpen, HelpCircle, LayoutDashboard, Network, Settings, ShieldCheck, Sparkles, Store, X, BookOpen } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { User } from '../types';
interface Props { open:boolean; currentTab:string; user:User|null; isAdmin:boolean; onClose:()=>void; onNavigate:(tab:string)=>void; }
const items = [
  ['home','Blog & Início',BookOpen], ['vitrine','Vitrine de Projetos',Store], ['dashboard','Central de Operação',LayoutDashboard],
  ['projetos','Meus Projetos & Sites',Sparkles], ['autopilot','Automação',Sparkles], ['froc-ia','Froc Marketing IA',Bot],
  ['redes-sociais','Redes Sociais',Network], ['calendario','Calendário',CalendarDays], ['conteudos','Biblioteca',FolderOpen],
  ['analytics','Métricas',BarChart3], ['perfil','Configurações',Settings], ['suporte','Ajuda',HelpCircle]
] as const;
export const MobileDrawer:React.FC<Props>=({open,currentTab,isAdmin,onClose,onNavigate})=>{ if(!open)return null; const go=(tab:string)=>{onNavigate(tab);onClose()}; return <div className="fixed inset-0 z-[60] lg:hidden"><button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Fechar menu"/><aside className="absolute bottom-0 left-0 top-0 w-[min(88vw,340px)] overflow-y-auto border-r border-slate-800 bg-[#0B0F19]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0B0F19]/95 p-4 backdrop-blur"><BrandLogo size="sm" showText={true} subtitle="Portal Vip Brasil"/><button onClick={onClose} className="rounded-xl border border-slate-800 p-2 text-slate-300"><X size={18}/></button></div><nav className="space-y-1 p-3">{items.map(([tab,label,Icon])=><button key={tab} onClick={()=>go(tab)} className={\`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold \${currentTab===tab?'border border-cyan-500/30 bg-cyan-500/12 text-cyan-300':'text-slate-300 hover:bg-slate-800'}\`}><Icon size={17}/>{label}</button>)}{isAdmin&&<button onClick={()=>go('admin')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-amber-300 hover:bg-slate-800"><ShieldCheck size={17}/>Administração</button>}</nav></aside></div>; };
`);

// 7) Login privado: remove cadastro público e login Google que poderia criar novas contas.
write('src/components/AuthModal.tsx', `import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiRequest } from '../lib/api';
import type { User, Wallet } from '../types';
import { BrandLogo } from './BrandLogo';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: (user: User, wallet?: Wallet | null) => void; }
type Mode = 'login' | 'forgot';

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  if (!isOpen) return null;

  const friendlyError = (err:any) => {
    const code = String(err?.code || '').toLowerCase();
    if (code.includes('invalid-credential')) return 'E-mail ou senha inválidos.';
    if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde e tente novamente.';
    if (String(err?.message || '').includes('Acesso administrativo')) return 'Acesso restrito ao administrador do Portal Vip Brasil.';
    return err?.message || 'Não foi possível concluir a autenticação.';
  };

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'forgot') {
        if (!email.trim()) throw new Error('Informe seu e-mail cadastrado.');
        await sendPasswordResetEmail(auth, email.trim(), { url: window.location.origin + '/' });
        setSuccess('Link seguro de redefinição enviado para o e-mail administrativo.');
        return;
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const data = await apiRequest<{ user: User; wallet?: Wallet | null }>('/api/auth/me');
      onSuccess(data.user, data.wallet || null);
      onClose();
    } catch (err:any) { await signOut(auth).catch(() => undefined); setError(friendlyError(err)); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-xl" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-[28px] border border-slate-700/80 bg-[#0F172A] p-6 shadow-2xl md:p-8"><button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18}/></button><div className="mb-6 text-center"><div className="mb-3 flex justify-center"><BrandLogo size="lg" showText={false}/></div><h2 className="text-xl font-extrabold text-white">{mode === 'forgot' ? 'Recuperar acesso' : 'Acesso administrativo'}</h2><p className="mt-1 text-xs text-slate-400">Portal Vip Brasil é uma central privada. Não há cadastro público.</p></div>{success&&<div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 size={16}/>{success}</div>}{error&&<div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">⚠️ {error}</div>}<form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-300">E-mail<div className="relative mt-1.5"><Mail className="absolute left-3.5 top-3 text-slate-500" size={16}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" className="froc-input pl-10" required/></div></label>{mode==='login'&&<label className="block text-xs font-semibold text-slate-300">Senha<div className="relative mt-1.5"><Lock className="absolute left-3.5 top-3 text-slate-500" size={16}/><input type={showPassword?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" className="froc-input pl-10 pr-11" required/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-2.5 p-1 text-slate-400">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}<button disabled={loading} className="froc-primary w-full">{loading?'Processando…':mode==='forgot'?'Enviar link seguro':'Entrar'}</button></form><div className="mt-5 flex items-center justify-between text-xs">{mode==='login'?<><span className="text-slate-500">Acesso somente autorizado</span><button onClick={()=>{setMode('forgot');setError('');setSuccess('')}} className="text-slate-400 hover:text-white">Esqueci minha senha</button></>:<button onClick={()=>{setMode('login');setError('');setSuccess('')}} className="flex items-center gap-1 text-slate-400"><ArrowLeft size={13}/>Voltar ao login</button>}</div><div className="mt-5 flex items-center justify-center gap-1 text-[10px] text-slate-500"><ShieldCheck size={12}/>Firebase Authentication + API restrita a administrador</div></div></div>;
};
`);

// 8) Configuração explícita de portal privado em produção.
replaceExact(
  'server/config/index.ts',
  "  isProduction,\n  appUrl,",
  "  isProduction,\n  privatePortalMode: env('PRIVATE_PORTAL_MODE', isTest ? 'false' : 'true').toLowerCase() === 'true',\n  appUrl,"
);

// 9) Backend: requireAuth bloqueia qualquer usuário não-admin no modo privado.
replaceExact(
  'server/production/auth.ts',
  "import { getAdminAuth } from '../providers/firebaseAdmin.js';",
  "import { getAdminAuth } from '../providers/firebaseAdmin.js';\nimport { config } from '../config/index.js';"
);
replaceExact(
  'server/production/auth.ts',
  "  req.firebaseUser = decoded;\n  req.user = profile;\n\n  if (!isConsentFlow(req) && !hasAcceptedLatestTerms(profile)) {",
  "  req.firebaseUser = decoded;\n  req.user = profile;\n\n  if (config.privatePortalMode && profile.role !== 'admin') {\n    res.status(403).json({ error: 'Acesso administrativo privado. Esta conta não possui autorização para operar o Portal Vip Brasil.' });\n    return;\n  }\n\n  if (!isConsentFlow(req) && !hasAcceptedLatestTerms(profile)) {"
);

// 10) Backend: projetos oficiais são entidades virtuais válidas; nada depende de COLLECTIONS.companies para operar.
replaceRegex(
  'server/production/router.ts',
  /export async function ownedCompany\(userId: string, companyId\?: string\): Promise<any \| undefined> \{[\s\S]*?\n\}\n\nexport async function requireOwnedCompany[\s\S]*?\n\}\n\n\/\/ `portal_vip`[\s\S]*?\n\}/,
  `function portalProjectAsOperationalCompany(userId: string, companyId: string): any | undefined {
  if (companyId === 'portal_vip') {
    return { id: 'portal_vip', userId, name: 'Portal Vip Brasil', slug: 'portal-vip-brasil', category: 'Portal', description: 'Central privada de marketing do Portal Vip Brasil.', products: [], services: [], keywords: [], isPublicInVitrine: false, virtual: true, portalProject: true };
  }
  const project = PORTAL_VIP_PROJECTS.find((item) => item.id === companyId);
  if (!project) return undefined;
  return {
    id: project.id,
    userId,
    name: project.name,
    slug: project.slug,
    logoUrl: project.logoUrl,
    description: project.description,
    businessType: 'online',
    website: project.websiteUrl,
    androidApp: project.playStoreUrl,
    category: project.category,
    segment: project.segment,
    products: [],
    services: [],
    targetAudience: project.targetAudience,
    differentials: project.highlights.join(' • '),
    keywords: project.keywords,
    isPublicInVitrine: true,
    virtual: true,
    portalProject: true
  };
}

export async function ownedCompany(userId: string, companyId?: string): Promise<any | undefined> {
  if (!companyId) return undefined;
  const officialProject = portalProjectAsOperationalCompany(userId, companyId);
  if (officialProject) return officialProject;
  if (config.privatePortalMode) return undefined;
  const snap = await firestore().collection(COLLECTIONS.companies).doc(companyId).get();
  if (!snap.exists) return undefined;
  const data = { id: snap.id, ...snap.data() } as any;
  return data.userId === userId ? data : undefined;
}

export async function requireOwnedCompany(userId: string, companyId: string): Promise<any> {
  const project = await ownedCompany(userId, companyId);
  if (!project) {
    const error: any = new Error('Projeto não encontrado ou sem permissão.');
    error.statusCode = 404;
    throw error;
  }
  return project;
}

async function requireSocialCompany(userId: string, companyId: string): Promise<any> {
  return requireOwnedCompany(userId, companyId);
}`
);

// Endpoints legados de empresa ficam somente leitura no modo privado.
replaceExact(
  'server/production/router.ts',
  "router.get('/companies', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  const snap = await firestore().collection(COLLECTIONS.companies).where('userId', '==', req.user!.id).get();\n  const companies = queryData<any>(snap).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));\n  res.json({ companies });\n}));",
  "router.get('/companies', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  if (config.privatePortalMode) {\n    return res.json({ companies: PORTAL_VIP_PROJECTS.map((project) => portalProjectAsOperationalCompany(req.user!.id, project.id)) });\n  }\n  const snap = await firestore().collection(COLLECTIONS.companies).where('userId', '==', req.user!.id).get();\n  const companies = queryData<any>(snap).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));\n  res.json({ companies });\n}));"
);
replaceExact(
  'server/production/router.ts',
  "router.post('/companies', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  const name = safeString(req.body?.name, 120);",
  "router.post('/companies', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  if (config.privatePortalMode) return res.status(410).json({ error: 'Cadastro de empresas foi removido. Use os projetos oficiais do Portal.' });\n  const name = safeString(req.body?.name, 120);"
);
replaceExact(
  'server/production/router.ts',
  "router.patch('/companies/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  const current = await requireOwnedCompany(req.user!.id, req.params.id);",
  "router.patch('/companies/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  if (config.privatePortalMode) return res.status(410).json({ error: 'Edição de empresas foi removida. Projetos oficiais são gerenciados pelo registro do Portal.' });\n  const current = await requireOwnedCompany(req.user!.id, req.params.id);"
);
replaceExact(
  'server/production/router.ts',
  "router.post('/companies/:id/logo', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  const company = await requireOwnedCompany(req.user!.id, req.params.id);",
  "router.post('/companies/:id/logo', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  if (config.privatePortalMode) return res.status(410).json({ error: 'Upload de logo por empresa foi removido. Use os ativos do projeto oficial.' });\n  const company = await requireOwnedCompany(req.user!.id, req.params.id);"
);
replaceExact(
  'server/production/router.ts',
  "router.delete('/companies/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  const company = await requireOwnedCompany(req.user!.id, req.params.id);",
  "router.delete('/companies/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {\n  if (config.privatePortalMode) return res.status(410).json({ error: 'Exclusão de empresas foi removida. Projetos oficiais não podem ser apagados por esta rota.' });\n  const company = await requireOwnedCompany(req.user!.id, req.params.id);"
);

// 11) Créditos deixam de ser bloqueio operacional no portal privado. Mantém reserva técnica para compatibilidade, sem saldo/cobrança.
replaceExact('server/production/credits.ts', "import { recalculateUserPlan } from './plans.js';", "import { recalculateUserPlan } from './plans.js';\nimport { config } from '../config/index.js';");
replaceExact(
  'server/production/credits.ts',
  "  const amount = requireCreditAmount(data.amount, 'Custo de créditos');\n  const operation = String(data.operation || '').trim();",
  "  const amount = requireCreditAmount(data.amount, 'Custo de créditos');\n  const operation = String(data.operation || '').trim();\n  if (config.privatePortalMode) {\n    if (!operation || operation.length > 200) throw new Error('Operação inválida.');\n    const reservationRef = firestore().collection(COLLECTIONS.creditReservations).doc(newId('res'));\n    const timestamp = nowIso();\n    await reservationRef.set({ id: reservationRef.id, userId: data.userId, companyId: data.companyId || null, amount, operation, status: 'reserved', billingMode: 'private_portal', createdAt: timestamp, updatedAt: timestamp });\n    return { reservationId: reservationRef.id, wallet: defaultWallet(data.userId) };\n  }"
);
replaceExact(
  'server/production/credits.ts',
  "export async function commitReservation(data: {\n  userId: string;\n  reservationId: string;\n  source: string;\n  metadata?: Record<string, any>;\n}): Promise<WalletRecord> {\n  const db = firestore();",
  "export async function commitReservation(data: {\n  userId: string;\n  reservationId: string;\n  source: string;\n  metadata?: Record<string, any>;\n}): Promise<WalletRecord> {\n  if (config.privatePortalMode) {\n    const ref = firestore().collection(COLLECTIONS.creditReservations).doc(data.reservationId);\n    const snap = await ref.get();\n    if (!snap.exists || (snap.data() as any)?.userId !== data.userId) throw new Error('Reserva operacional inválida.');\n    if ((snap.data() as any)?.status === 'reserved') await ref.set({ status: 'committed', committedAt: nowIso(), updatedAt: nowIso(), source: data.source, metadata: data.metadata || {} }, { merge: true });\n    return defaultWallet(data.userId);\n  }\n  const db = firestore();"
);
replaceExact(
  'server/production/credits.ts',
  "export async function rollbackReservation(userId: string, reservationId: string, reason: string): Promise<boolean> {\n  const db = firestore();",
  "export async function rollbackReservation(userId: string, reservationId: string, reason: string): Promise<boolean> {\n  if (config.privatePortalMode) {\n    const ref = firestore().collection(COLLECTIONS.creditReservations).doc(reservationId);\n    const snap = await ref.get();\n    if (!snap.exists || (snap.data() as any)?.userId !== userId) return false;\n    if ((snap.data() as any)?.status !== 'reserved') return false;\n    await ref.set({ status: 'rolled_back', rollbackReason: String(reason || 'Operação cancelada.').slice(0, 500), rolledBackAt: nowIso(), updatedAt: nowIso() }, { merge: true });\n    return true;\n  }\n  const db = firestore();"
);

// 12) Textos/controles mais críticos deixam de apresentar créditos/empresa ao administrador.
replaceExact('src/pages/CreateContentPage.tsx', "import { Company, Wallet, ContentItem, CREDIT_COSTS } from '../types';", "import { Company, Wallet, ContentItem } from '../types';");
replaceRegex('src/pages/CreateContentPage.tsx', /\n  const currentCost = contentType === 'post'[\s\S]*?: CREDIT_COSTS\.cta;\n/, '\n');
replaceExact('src/pages/CreateContentPage.tsx', '<Sparkles size={16} /> Gerar Conteúdo ({currentCost} cr)', '<Sparkles size={16} /> Gerar Conteúdo');

// Imagens: remove saldo/custos visíveis e troca linguagem empresa -> projeto.
replaceExact('src/pages/CreateImagePage.tsx', "import type { Company, Wallet } from '../types';\nimport { CREDIT_COSTS } from '../types';", "import type { Company, Wallet } from '../types';");
replaceRegex('src/pages/CreateImagePage.tsx', /\n  const resolutionCost = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[resolution\]\);\n/, '\n');
replaceRegex('src/pages/CreateImagePage.tsx', /\n        <div className="flex items-center gap-2">[\s\S]*?Saldo: \{wallet\?\.balance \?\? 0\} créditos[\s\S]*?<\/div>\n      <\/header>/, '\n      </header>');
replaceExact('src/pages/CreateImagePage.tsx', "setError('Selecione uma empresa para aplicar as diretrizes e identidade da marca.');", "setError('Selecione um projeto para aplicar as diretrizes e identidade da marca.');");
replaceExact('src/pages/CreateImagePage.tsx', "Selecione uma empresa para que a IA respeite identidade, público, produtos e tom da marca.", "Selecione um projeto para que a IA respeite identidade, público e tom da marca.");
replaceExact('src/pages/CreateImagePage.tsx', "onNavigate('empresa')", "onNavigate('projetos')");
replaceExact('src/pages/CreateImagePage.tsx', 'Configurar empresa', 'Selecionar projeto');
replaceExact('src/pages/CreateImagePage.tsx', '<span className="text-[10px] text-cyan-400 font-bold">{resolutionCost} créditos</span>', '<span className="text-[10px] text-cyan-400 font-bold">Qualidade de saída</span>');
replaceExact('src/pages/CreateImagePage.tsx', "{ key: '1K', label: '1K Standard', cost: CREDIT_COSTS.image_ai_1k || 15, desc: 'Rápida e leve' },\n                  { key: '2K', label: '2K High-Def', cost: CREDIT_COSTS.image_ai_2k || 25, desc: 'Alta nitidez' },\n                  { key: '4K', label: '4K Ultra HD', cost: CREDIT_COSTS.image_ai_4k || 40, desc: 'Publicitário' }", "{ key: '1K', label: '1K Standard', desc: 'Rápida e leve' },\n                  { key: '2K', label: '2K High-Def', desc: 'Alta nitidez' },\n                  { key: '4K', label: '4K Ultra HD', desc: 'Publicitário' }");
replaceExact('src/pages/CreateImagePage.tsx', '<span className="text-[9px] font-bold text-cyan-300 mt-0.5">{res.cost} cr</span>\n', '');
replaceExact('src/pages/CreateImagePage.tsx', "{loadingPrompt ? 'Criando…' : `Direção visual · ${CREDIT_COSTS.image_prompt} cr`}", "{loadingPrompt ? 'Criando…' : 'Criar direção visual'}");
replaceExact('src/pages/CreateImagePage.tsx', "{loadingImage ? 'Gerando imagem…' : `Gerar imagem · ${resolutionCost} cr`}", "{loadingImage ? 'Gerando imagem…' : 'Gerar imagem'}");
replaceExact('src/pages/CreateImagePage.tsx', 'A cobrança ocorre somente após a imagem ser renderizada e salva com sucesso no Storage. Se houver falha, seus créditos são automaticamente estornados.', 'A imagem só é marcada como concluída depois de ser renderizada e salva com sucesso no Storage. Em caso de falha, a operação permanece como erro e pode ser revisada.');
replaceExact('src/pages/CreateImagePage.tsx', 'Modelo: {generatedImage.modelUsed} • Consumo: {generatedImage.creditsUsed} créditos', 'Modelo: {generatedImage.modelUsed} • Operação concluída');

// Vídeo: remove saldo/custos visíveis e linguagem de empresa.
replaceExact('src/pages/CreateVideoPage.tsx', "import type { Company, Wallet, VideoJob } from '../types';\nimport { CREDIT_COSTS } from '../types';", "import type { Company, Wallet, VideoJob } from '../types';");
replaceRegex('src/pages/CreateVideoPage.tsx', /\n  const currentPresetCost = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[preset\]\);\n/, '\n');
replaceExact('src/pages/CreateVideoPage.tsx', "setVideoError('Selecione uma empresa para aplicar a identidade da marca.');", "setVideoError('Selecione um projeto para aplicar a identidade da marca.');");
replaceRegex('src/pages/CreateVideoPage.tsx', /\n        <div className="flex items-center gap-2">[\s\S]*?Saldo: \{wallet\?\.balance \?\? 0\} créditos[\s\S]*?<\/div>\n      <\/header>/, '\n      </header>');
replaceExact('src/pages/CreateVideoPage.tsx', '<Film size={15} /> Roteirizador Estruturado ({CREDIT_COSTS.video_script} cr)', '<Film size={15} /> Roteirizador Estruturado');
replaceExact('src/pages/CreateVideoPage.tsx', "Selecione uma empresa para aplicar as diretrizes e público da marca.", "Selecione um projeto para aplicar as diretrizes e público da marca.");
replaceExact('src/pages/CreateVideoPage.tsx', "onNavigate('empresa')", "onNavigate('projetos')");
replaceExact('src/pages/CreateVideoPage.tsx', 'Configurar empresa', 'Selecionar projeto');
replaceExact('src/pages/CreateVideoPage.tsx', '<span className="text-[10px] text-cyan-400 font-bold">{currentPresetCost} créditos</span>', '<span className="text-[10px] text-cyan-400 font-bold">Qualidade de saída</span>');
replaceExact('src/pages/CreateVideoPage.tsx', "{ key: 'demo_720p', label: 'Fast 720p', cost: CREDIT_COSTS.video_veo_fast || 50, desc: 'Mais rápido' },\n                      { key: 'pro_1080p', label: 'Pro 1080p', cost: CREDIT_COSTS.video_veo_1080p || 100, desc: 'Full HD Ideal' },\n                      { key: 'cinema_4k', label: 'Cinema 4K', cost: CREDIT_COSTS.video_veo_4k || 200, desc: 'Ultra HD' }", "{ key: 'demo_720p', label: 'Fast 720p', desc: 'Mais rápido' },\n                      { key: 'pro_1080p', label: 'Pro 1080p', desc: 'Full HD Ideal' },\n                      { key: 'cinema_4k', label: 'Cinema 4K', desc: 'Ultra HD' }");
replaceExact('src/pages/CreateVideoPage.tsx', '<span className="text-[9px] font-bold text-cyan-300 mt-0.5">{p.cost} cr</span>\n', '');

// Scheduler: remove usuário hardcoded e reforça isolamento por projeto antes da publicação.
replaceExact(
  'server/production/scheduler.ts',
  "import { runDailyBlogCycle } from './blogEngine.js';",
  "import { runDailyBlogCycle } from './blogEngine.js';\nimport { PORTAL_VIP_PROJECTS } from './almaPortfolio.js';"
);
replaceExact(
  'server/production/scheduler.ts',
  "      const isPortalProject = Boolean(post.projectId || post.companyId?.startsWith('proj_') || post.autopilotGenerated || post.metadata?.isPortalVipAutomation);\n      const isAdmin = userData?.role === 'admin' || post.userId === 'portal_vip_admin' || isPortalProject;",
  "      const operationalProjectId = String(post.projectId || post.companyId || '');\n      const isPortalProject = PORTAL_VIP_PROJECTS.some((project) => project.id === operationalProjectId);\n      const isAdmin = userData?.role === 'admin' || isPortalProject;"
);
replaceExact(
  'server/production/scheduler.ts',
  "      if (content.userId !== post.userId || (!isPortalProject && content.companyId !== post.companyId)) {\n        throw new Error('Violação de isolamento multi-tenant: Conteúdo não pertence ao usuário ou empresa do agendamento.');\n      }",
  "      if (content.userId !== post.userId || content.companyId !== post.companyId) {\n        throw new Error('Violação de isolamento: o conteúdo não pertence ao mesmo usuário e projeto do agendamento.');\n      }"
);

// 13) Mobile: remove atalho de saldo/créditos.
write('src/components/MobileTopBar.tsx', `import React from 'react';
import { Menu, UserRound, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { User, Wallet } from '../types';
interface Props { user: User | null; wallet?: Wallet | null; menuOpen: boolean; onToggleMenu: () => void; onOpenAuth: () => void; onNavigate: (tab: string) => void; }
export const MobileTopBar: React.FC<Props> = ({ user, menuOpen, onToggleMenu, onOpenAuth, onNavigate }) => (
  <header className="fixed inset-x-0 top-0 z-50 flex h-[calc(58px+env(safe-area-inset-top))] items-end border-b border-slate-800/80 bg-[#0B0F19]/95 px-3 pb-2 backdrop-blur-xl lg:hidden">
    <div className="flex w-full items-center justify-between gap-3">
      <button onClick={onToggleMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
      <button onClick={() => onNavigate('dashboard')} className="min-w-0 flex-1 text-left"><BrandLogo size="sm" showText={true} subtitle="Central Privada" /></button>
      {user ? <button onClick={() => onNavigate('perfil')} className="flex h-10 items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-300"><UserRound size={15}/>Admin</button> : <button onClick={onOpenAuth} className="froc-primary px-3.5 py-2 text-xs">Entrar</button>}
    </div>
  </header>
);
`);

// 14) Dashboard: elimina dados fictícios e usa status real da automação.
replaceExact(
  'src/pages/DashboardPage.tsx',
  "  const [status, setStatus] = useState({ hasSeoAudit: false, connectedSocialCount: 0 });",
  "  const [status, setStatus] = useState({ hasSeoAudit: false, connectedSocialCount: 0, autopilotEnabled: false });"
);
replaceExact(
  'src/pages/DashboardPage.tsx',
  "      setStatus({ hasSeoAudit: false, connectedSocialCount: 0 });",
  "      setStatus({ hasSeoAudit: false, connectedSocialCount: 0, autopilotEnabled: false });"
);
replaceExact(
  'src/pages/DashboardPage.tsx',
  "    apiRequest<{ hasSeoAudit: boolean; connectedSocialCount: number }>(",
  "    apiRequest<{ hasSeoAudit: boolean; connectedSocialCount: number; autopilotEnabled: boolean }>("
);
replaceExact(
  'src/pages/DashboardPage.tsx',
  "      setDailyFeedback({\n        success: true,\n        message: 'Ciclo diário executado com redundância anti-quedas da IA.'\n      });",
  "      setDailyFeedback({\n        success: false,\n        message: 'Não foi possível confirmar a execução do ciclo diário. Verifique o status da automação antes de publicar.'\n      });"
);
replaceExact(
  'src/pages/DashboardPage.tsx',
  "        ['Ver Vitrine Oficial (7 Sites/Apps)', true, 'vitrine'],\n        ['Auditoria SEO Bing & Google', status.hasSeoAudit, 'seo'],\n        ['Conectar Redes Sociais', status.connectedSocialCount > 0, 'redes-sociais'],\n        ['Configurar Automação 1x/dia', true, 'autopilot'],\n        ['Criar Artigo no Blog', true, 'criar-artigo'],\n        ['Gerar Campanha Multicanal', companyCampaigns.length > 0, 'campanhas']",
  "        ['Projeto selecionado', Boolean(selectedCompany), 'projetos'],\n        ['Auditoria SEO Bing & Google', status.hasSeoAudit, 'seo'],\n        ['Redes sociais conectadas', status.connectedSocialCount > 0, 'redes-sociais'],\n        ['Automação ativa', status.autopilotEnabled, 'autopilot'],\n        ['Publicação realizada no mês', publishedMonth > 0, 'calendario'],\n        ['Campanha criada', companyCampaigns.length > 0, 'campanhas']"
);
replaceExact('src/pages/DashboardPage.tsx', "    [status, companyCampaigns.length]", "    [status, companyCampaigns.length, publishedMonth, selectedCompany]");
replaceExact('src/pages/DashboardPage.tsx', '7 Projetos Ativos', '{USER_PORTFOLIO_PROJECTS.length} Projetos Registrados');
replaceExact('src/pages/DashboardPage.tsx', "['Alcance Estimado', totals.reach || '12.4k'],\n          ['Engajamento', totals.clicks || '1.8k']", "['Alcance Registrado', totals.reach],\n          ['Cliques Registrados', totals.clicks]");

// API de status do dashboard passa a reportar automação persistida real.
replaceExact(
  'server/production/router.ts',
  "  const [seoSnap, socialSnap] = await Promise.all([\n    firestore().collection(COLLECTIONS.seoReports).where('userId','==',req.user!.id).get(),\n    firestore().collection(COLLECTIONS.socialConnections).where('userId','==',req.user!.id).get()\n  ]);\n  const seoReports = queryData<any>(seoSnap).filter(x=>!companyId||x.companyId===companyId);\n  const socialConnections = queryData<any>(socialSnap).filter(x=>(!companyId||x.companyId===companyId)&&x.status==='connected');\n  res.json({ hasSeoAudit:seoReports.length>0, connectedSocialCount:socialConnections.length, seoReportsCount:seoReports.length });",
  "  const [seoSnap, socialSnap, autopilotSnap] = await Promise.all([\n    firestore().collection(COLLECTIONS.seoReports).where('userId','==',req.user!.id).get(),\n    firestore().collection(COLLECTIONS.socialConnections).where('userId','==',req.user!.id).get(),\n    firestore().collection(COLLECTIONS.autopilotConfigs).where('userId','==',req.user!.id).get()\n  ]);\n  const seoReports = queryData<any>(seoSnap).filter(x=>!companyId||x.companyId===companyId);\n  const socialConnections = queryData<any>(socialSnap).filter(x=>(!companyId||x.companyId===companyId)&&x.status==='connected');\n  const autopilotConfigs = queryData<any>(autopilotSnap).filter(x=>!companyId||x.companyId===companyId);\n  res.json({ hasSeoAudit:seoReports.length>0, connectedSocialCount:socialConnections.length, seoReportsCount:seoReports.length, autopilotEnabled:autopilotConfigs.some(x=>x.enabled===true) });"
);

// 15) Perfil privado sem qualquer menção a plano comercial.
replaceExact(
  'src/pages/ProfilePage.tsx',
  "<span className=\"flex items-center gap-1\"><ShieldCheck size={13} className=\"text-emerald-400\"/>Conta protegida pelo Firebase Auth</span><span>Plano: <strong className=\"text-white\">{wallet?.planId?.replace('plan_','').toUpperCase()||'START'}</strong></span>",
  "<span className=\"flex items-center gap-1\"><ShieldCheck size={13} className=\"text-emerald-400\"/>Acesso administrativo privado</span>"
);
replaceExact('src/pages/ProfilePage.tsx', 'Contas criadas por Google podem gerenciar senha pelo provedor.', 'O acesso administrativo usa autenticação por e-mail e senha no Firebase Auth.');

// 16) Vercel: registra cron real 1x/dia e canonicaliza a rota /projetos.
replaceExact(
  'vercel.json',
  '  "version": 2,',
  '  "version": 2,\n  "crons": [\n    {\n      "path": "/api/cron/process",\n      "schedule": "0 10 * * *"\n    }\n  ],'
);
replaceExact(
  'vercel.json',
  '      "src": "^/(?:vitrine(?:/.*)?|blog(?:/.*)?|planos|termos|privacidade)/?$",',
  '      "src": "^/(?:vitrine(?:/.*)?|blog(?:/.*)?|termos|privacidade|cookies|exclusao-de-dados|apps-compliance)/?$",'
);
replaceExact(
  'vercel.json',
  '      "src": "^/(?:dashboard|empresa|froc-ia|autopilot|criar-conteudo|criar-imagem|criar-video|criar-artigo|seo|campanhas|calendario|redes-sociais|conteudos|analytics|creditos|perfil|configuracoes|suporte|admin)/?$",',
  '      "src": "^/(?:dashboard|projetos|froc-ia|autopilot|criar-conteudo|criar-imagem|criar-video|criar-artigo|seo|campanhas|calendario|redes-sociais|conteudos|analytics|perfil|configuracoes|suporte|admin)/?$",'
);

// Páginas comerciais removidas do frontend; rotas antigas são redirecionadas pelo App para o dashboard.
for (const obsolete of ['src/pages/CreditsPage.tsx', 'src/pages/PlansPage.tsx']) {
  const target = file(obsolete);
  if (fs.existsSync(target)) { fs.unlinkSync(target); touched.add(obsolete + ' (removido)'); }
}

// 13) Ambiente de produção privado por padrão.
let envExample = read('.env.example');
if (!envExample.includes('PRIVATE_PORTAL_MODE=')) {
  envExample = `# Portal Vip Brasil é uma central administrativa privada.\nPRIVATE_PORTAL_MODE=true\n` + envExample;
  write('.env.example', envExample);
}

console.log('\n[Portal Vip Brasil] Correções aplicadas com sucesso:');
for (const rel of [...touched].sort()) console.log(' - ' + rel);
console.log('\nPróximo passo: npm run check');

// O aplicador não deve entrar no commit.
try { fs.unlinkSync(__filename); } catch {}
