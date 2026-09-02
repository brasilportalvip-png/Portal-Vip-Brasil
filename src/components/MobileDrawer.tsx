import React from 'react';
import { BarChart3, Bot, BriefcaseBusiness, Building2, CalendarDays, Coins, FileText, HelpCircle, Image, LayoutDashboard, Megaphone, Network, Rocket, Search, Settings, ShieldCheck, Store, Video, X, Sparkles, BookOpen } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { User } from '../types';
interface Props { open:boolean; currentTab:string; user:User|null; isAdmin:boolean; onClose:()=>void; onNavigate:(tab:string)=>void; }
const items = [
  ['home','Blog Oficial & Início',BookOpen],
  ['vitrine','Vitrine de Apps (7)',Store],
  ['dashboard','Central de Marketing',LayoutDashboard],
  ['empresa','Meus Projetos & Sites',Building2],
  ['autopilot','Automação Diária (1x/dia)',Rocket],
  ['campanhas','Gerador de Campanhas',BriefcaseBusiness],
  ['criar-artigo','Criar Artigo para Blog',FileText],
  ['criar-conteudo','Criar Conteúdo IA',Megaphone],
  ['criar-imagem','Criar Imagem',Image],
  ['criar-video','Criar Vídeo',Video],
  ['seo','SEO Bing & Google',Search],
  ['froc-ia','Froc IA Marketing',Bot],
  ['redes-sociais','Redes Sociais',Network],
  ['calendario','Calendário de Posts',CalendarDays],
  ['conteudos','Biblioteca de Mídias',FileText],
  ['analytics','Métricas & Analytics',BarChart3],
  ['perfil','Configurações & Perfil',Settings],
  ['suporte','Central de Ajuda',HelpCircle]
] as const;

export const MobileDrawer:React.FC<Props>=({open,currentTab,isAdmin,onClose,onNavigate})=>{
  if(!open)return null;
  const go=(tab:string)=>{onNavigate(tab);onClose()};
  return <div className="fixed inset-0 z-[60] lg:hidden"><button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Fechar menu"/><aside className="absolute bottom-0 left-0 top-0 w-[min(88vw,340px)] overflow-y-auto border-r border-slate-800 bg-[#0B0F19] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0B0F19]/95 p-4 backdrop-blur"><BrandLogo size="sm" showText={true} subtitle="Portal Vip Brasil" /><button onClick={onClose} className="rounded-xl border border-slate-800 p-2 text-slate-300 hover:text-white"><X size={18}/></button></div><nav className="space-y-1 p-3">{items.map(([tab,label,Icon])=><button key={tab} onClick={()=>go(tab)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold ${currentTab===tab?'bg-cyan-500/12 text-cyan-300 border border-cyan-500/30':'text-slate-300 hover:bg-slate-800'}`}><Icon size={17}/>{label}</button>)}{isAdmin&&<button onClick={()=>go('admin')} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold ${currentTab==='admin'?'bg-rose-500/10 text-rose-300 border border-rose-500/30':'text-slate-300 hover:bg-slate-800'}`}><ShieldCheck size={17}/>Administração</button>}</nav></aside></div>;
};
