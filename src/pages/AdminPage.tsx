import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  FolderKanban,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Share2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Trash2,
  X
} from 'lucide-react';
import type { BlogPost } from '../types';
import { apiRequest } from '../lib/api';

interface AdminPageProps {
  onNavigate:(tab:string)=>void;
  onProjectsChanged?:()=>void|Promise<void>;
}

type TicketItem={id:string;userEmail:string;subject:string;message:string;status:string;createdAt:string};
type AdminStats={
  totalProjects:number;
  totalContentsGenerated:number;
  totalSocialConnections:number;
  totalPublishedArticles:number;
  pendingOrFailed?:number;
  enabledAutopilot?:number;
};

type SchedulerDiagnostics={
  lastErrorCount:number;
  lastErrors:Record<string,string>|null;
  lastCronErrorCount:number;
  lastCronErrors:Record<string,string>|null;
  updatedAt:string|null;
};

type AdminProject={
  id:string;
  name:string;
  slug:string;
  category:string;
  segment:string;
  websiteUrl:string;
  playStoreUrl?:string;
  appTitle?:string;
  hasApp:boolean;
  logoUrl:string;
  bannerUrl:string;
  tagline:string;
  description:string;
  highlights:string[];
  keywords:string[];
  targetAudience:string;
  socialMarketingAngles:string[];
  bingSeoKeywords:string[];
  active?:boolean;
  dailyMarketingEnabled?:boolean;
  dailyBlogEnabled?:boolean;
  isSeedProject?:boolean;
  createdAt?:string;
  updatedAt?:string;
};

type ProjectForm={
  name:string;
  slug:string;
  category:string;
  segment:string;
  websiteUrl:string;
  playStoreUrl:string;
  appTitle:string;
  logoUrl:string;
  bannerUrl:string;
  tagline:string;
  description:string;
  highlights:string;
  keywords:string;
  targetAudience:string;
  socialMarketingAngles:string;
  bingSeoKeywords:string;
  active:boolean;
  dailyMarketingEnabled:boolean;
  dailyBlogEnabled:boolean;
};

const EMPTY_STATS:AdminStats={totalProjects:0,totalContentsGenerated:0,totalSocialConnections:0,totalPublishedArticles:0};
const EMPTY_PROJECT:ProjectForm={
  name:'',slug:'',category:'',segment:'',websiteUrl:'',playStoreUrl:'',appTitle:'',logoUrl:'',bannerUrl:'',tagline:'',description:'',highlights:'',keywords:'',targetAudience:'',socialMarketingAngles:'',bingSeoKeywords:'',active:true,dailyMarketingEnabled:true,dailyBlogEnabled:true
};

const splitList=(value:string)=>value.split(/[\n,]+/).map((item)=>item.trim()).filter(Boolean);
const joinList=(value?:string[])=>Array.isArray(value)?value.join(', '):'';

export const AdminPage:React.FC<AdminPageProps>=({onProjectsChanged})=>{
  const[tab,setTab]=useState<'overview'|'projects'|'support'|'blog'>('overview');
  const[stats,setStats]=useState<AdminStats>(EMPTY_STATS);
  const[tickets,setTickets]=useState<TicketItem[]>([]);
  const[posts,setPosts]=useState<BlogPost[]>([]);
  const[projects,setProjects]=useState<AdminProject[]>([]);
  const[schedulerDiagnostics,setSchedulerDiagnostics]=useState<SchedulerDiagnostics>({lastErrorCount:0,lastErrors:null,lastCronErrorCount:0,lastCronErrors:null,updatedAt:null});
  const[loading,setLoading]=useState(false);
  const[feedback,setFeedback]=useState('');
  const[topic,setTopic]=useState('');
  const[generating,setGenerating]=useState(false);
  const[projectForm,setProjectForm]=useState<ProjectForm>(EMPTY_PROJECT);
  const[editingProjectId,setEditingProjectId]=useState<string|null>(null);
  const[savingProject,setSavingProject]=useState(false);
  const[runningScheduler,setRunningScheduler]=useState(false);

  const loadOverview=async()=>{
    const d=await apiRequest<{stats:Partial<AdminStats>}>('/api/admin/overview');
    setStats({...EMPTY_STATS,...(d.stats||{})});
  };
  const loadTickets=async()=>{
    const d=await apiRequest<{tickets:TicketItem[]}>('/api/admin/support/tickets');
    setTickets(d.tickets||[]);
  };
  const loadBlog=async()=>{
    const d=await apiRequest<{posts:BlogPost[]}>('/api/admin/blog');
    setPosts(d.posts||[]);
  };
  const loadProjects=async()=>{
    const d=await apiRequest<{projects:AdminProject[]}>('/api/admin/projects');
    setProjects(d.projects||[]);
  };
  const loadSchedulerDiagnostics=async()=>{
    const d=await apiRequest<{diagnostics:SchedulerDiagnostics}>('/api/admin/scheduler/diagnostics');
    if(d.diagnostics)setSchedulerDiagnostics(d.diagnostics);
  };
  const refresh=async()=>{
    setLoading(true);
    setFeedback('');
    try{
      await Promise.all([loadOverview(),loadTickets(),loadBlog(),loadProjects(),loadSchedulerDiagnostics()]);
    }catch(err:any){
      setFeedback(err.message||'Falha ao carregar administração.');
    }finally{
      setLoading(false);
    }
  };
  useEffect(()=>{void refresh()},[]);

  const activeCount=useMemo(()=>projects.filter((project)=>project.active!==false).length,[projects]);

  const runSchedulerNow=async()=>{
    setRunningScheduler(true);setFeedback('');
    try{
      const d=await apiRequest<{success:boolean;result:any}>('/api/admin/scheduler/run-now',{method:'POST',timeoutMs:290_000});
      const errors=Object.keys(d.result?.errors||{});
      setFeedback(d.result?.skipped
        ? 'O coordenador ja estava em execucao; nenhuma segunda instancia foi iniciada.'
        : errors.length
          ? `Ciclo completo executado com ${errors.length} etapa(s) em estado degradado: ${errors.join(', ')}. Veja o diagnostico abaixo.`
          : 'Ciclo completo executado pelo mesmo coordenador do cron sem falhas registradas.');
      await Promise.all([loadOverview(),loadSchedulerDiagnostics(),loadProjects()]);
      await onProjectsChanged?.();
    }catch(err:any){setFeedback(err.message||'Falha ao executar o ciclo completo.');}
    finally{setRunningScheduler(false);}
  };

  const ticketStatus=async(id:string,status:string)=>{
    try{
      await apiRequest(`/api/admin/support/tickets/${id}`,{method:'PATCH',body:{status}});
      await loadTickets();
    }catch(err:any){setFeedback(err.message||'Falha ao atualizar chamado.');}
  };

  const generate=async()=>{
    setGenerating(true);setFeedback('');
    try{
      const d=await apiRequest<{post:BlogPost}>('/api/admin/blog/generate-now',{method:'POST',body:{topic:topic||undefined}});
      setFeedback(`Rascunho “${d.post.title}” gerado. Revise antes de publicar.`);
      setTopic('');await loadBlog();
    }catch(err:any){setFeedback(err.message||'Falha ao gerar artigo.');}
    finally{setGenerating(false);}
  };
  const publish=async(post:BlogPost)=>{
    try{await apiRequest(`/api/admin/blog/${post.id}`,{method:'PATCH',body:{status:'published'}});setFeedback('Artigo publicado e elegível para o sitemap.');await loadBlog();}
    catch(err:any){setFeedback(err.message||'Falha ao publicar artigo.');}
  };
  const archive=async(post:BlogPost)=>{
    try{await apiRequest(`/api/admin/blog/${post.id}`,{method:'PATCH',body:{status:'archived'}});await loadBlog();}
    catch(err:any){setFeedback(err.message||'Falha ao arquivar artigo.');}
  };

  const beginCreate=()=>{setEditingProjectId('new');setProjectForm(EMPTY_PROJECT);setFeedback('');};
  const beginEdit=(project:AdminProject)=>{
    setEditingProjectId(project.id);
    setProjectForm({
      name:project.name||'',slug:project.slug||'',category:project.category||'',segment:project.segment||'',websiteUrl:project.websiteUrl||'',playStoreUrl:project.playStoreUrl||'',appTitle:project.appTitle||'',logoUrl:project.logoUrl||'',bannerUrl:project.bannerUrl||'',tagline:project.tagline||'',description:project.description||'',highlights:joinList(project.highlights),keywords:joinList(project.keywords),targetAudience:project.targetAudience||'',socialMarketingAngles:joinList(project.socialMarketingAngles),bingSeoKeywords:joinList(project.bingSeoKeywords),active:project.active!==false,dailyMarketingEnabled:project.dailyMarketingEnabled!==false,dailyBlogEnabled:project.dailyBlogEnabled!==false
    });
    setFeedback('');
  };
  const cancelEdit=()=>{setEditingProjectId(null);setProjectForm(EMPTY_PROJECT);};
  const projectPayload=()=>({
    ...projectForm,
    hasApp:Boolean(projectForm.playStoreUrl.trim()),
    highlights:splitList(projectForm.highlights),
    keywords:splitList(projectForm.keywords),
    socialMarketingAngles:splitList(projectForm.socialMarketingAngles),
    bingSeoKeywords:splitList(projectForm.bingSeoKeywords)
  });
  const saveProject=async()=>{
    if(!projectForm.name.trim()||!projectForm.websiteUrl.trim()){setFeedback('Nome e URL oficial do site são obrigatórios.');return;}
    setSavingProject(true);setFeedback('');
    try{
      if(editingProjectId==='new'){
        const d=await apiRequest<{project:AdminProject}>('/api/admin/projects',{method:'POST',body:projectPayload()});
        setFeedback(`Projeto “${d.project.name}” cadastrado e incluído automaticamente no motor global.`);
      }else if(editingProjectId){
        const d=await apiRequest<{project:AdminProject}>(`/api/admin/projects/${editingProjectId}`,{method:'PATCH',body:projectPayload()});
        setFeedback(`Projeto “${d.project.name}” atualizado.`);
      }
      cancelEdit();
      await Promise.all([loadProjects(),loadOverview()]);
      await onProjectsChanged?.();
    }catch(err:any){setFeedback(err.message||'Falha ao salvar projeto.');}
    finally{setSavingProject(false);}
  };
  const toggleProject=async(project:AdminProject)=>{
    try{
      await apiRequest(`/api/admin/projects/${project.id}`,{method:'PATCH',body:{active:project.active===false}});
      setFeedback(project.active===false?'Projeto reativado e devolvido às automações.':'Projeto pausado. O histórico foi preservado e ele saiu dos próximos ciclos automáticos.');
      await Promise.all([loadProjects(),loadOverview()]);
      await onProjectsChanged?.();
    }catch(err:any){setFeedback(err.message||'Falha ao alterar projeto.');}
  };
  const deleteProject=async(project:AdminProject)=>{
    if(project.isSeedProject){setFeedback('Os 7 projetos iniciais são protegidos contra exclusão permanente. Use Pausar para removê-los temporariamente das automações.');return;}
    if(!window.confirm(`Excluir “${project.name}” do cadastro de projetos? O histórico de conteúdos não será apagado.`))return;
    if(!window.confirm('Confirma a exclusão deste projeto personalizado? Esta ação remove o projeto da Vitrine e das próximas automações.'))return;
    try{
      await apiRequest(`/api/admin/projects/${project.id}`,{method:'DELETE'});
      setFeedback(`Projeto “${project.name}” removido do cadastro. O histórico operacional foi preservado.`);
      await Promise.all([loadProjects(),loadOverview()]);
      await onProjectsChanged?.();
    }catch(err:any){setFeedback(err.message||'Falha ao excluir projeto.');}
  };

  const cards=[
    [FolderKanban,'Projetos ativos',stats.totalProjects],
    [FileText,'Conteúdos dos projetos',stats.totalContentsGenerated],
    [Share2,'Conexões sociais ativas',stats.totalSocialConnections],
    [BookOpen,'Artigos publicados',stats.totalPublishedArticles]
  ] as const;

  return <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-white"><ShieldAlert className="text-rose-400"/>Administração Portal Vip Brasil</h2>
        <p className="text-xs text-slate-400">Governança privada dos seus projetos, conteúdos, canais e automações.</p>
      </div>
      <button onClick={()=>void refresh()} className="froc-secondary inline-flex items-center justify-center gap-2"><RefreshCw size={14} className={loading?'animate-spin':''}/>Atualizar</button>
    </header>

    {feedback&&<div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-200">{feedback}</div>}

    <div className="flex gap-2 overflow-x-auto pb-1">
      {([
        ['overview','Visão geral',BarChart3],['projects','Projetos & Sites',FolderKanban],['support','Suporte',Ticket],['blog','Blog Portal Vip',BookOpen]
      ] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold ${tab===id?'bg-blue-600 text-white':'border border-slate-700 bg-slate-900 text-slate-400'}`}><Icon size={14}/>{label}</button>)}
    </div>

    {tab==='overview'&&<>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([Icon,label,value])=><div key={label} className="froc-panel"><Icon size={18} className="text-cyan-400"/><div className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-3xl font-black text-white">{Number(value).toLocaleString('pt-BR')}</div></div>)}</div>
      <section className="froc-panel">
        <h3 className="froc-section-title">Central administrativa privada</h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Este painel não administra clientes, planos, assinaturas ou créditos. Todo projeto ativo cadastrado em Projetos & Sites entra automaticamente no motor diário de marketing e Blog.</p>
      </section>
      <section className="froc-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="froc-section-title">Diagnóstico da última execução do scheduler</h3>
            <p className="mt-2 text-xs text-slate-400">O botão abaixo usa exatamente o mesmo coordenador, lock e pipeline do cron. Os detalhes ficam visíveis somente para administrador.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className={`rounded-xl border px-3 py-2 text-xs font-black ${schedulerDiagnostics.lastErrorCount>0?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{schedulerDiagnostics.lastErrorCount>0?`${schedulerDiagnostics.lastErrorCount} falha(s) na última execução`:'Última execução sem falhas'}</div>
            <button onClick={()=>void runSchedulerNow()} disabled={runningScheduler} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-[11px] font-black text-cyan-200 disabled:opacity-50"><PlayCircle size={14}/>{runningScheduler?'Executando ciclo completo...':'Executar ciclo completo agora'}</button>
          </div>
        </div>
        {schedulerDiagnostics.lastErrors&&Object.keys(schedulerDiagnostics.lastErrors).length>0?<div className="mt-4 space-y-2">{Object.entries(schedulerDiagnostics.lastErrors).map(([stage,message])=><div key={stage} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-amber-300">{stage}</div><div className="mt-1 text-xs leading-5 text-slate-300">{message}</div></div>)}</div>:<div className="mt-4 text-xs text-slate-500">Nenhum erro detalhado persistido para a última execução.</div>}
        <div className="mt-3 text-[10px] text-slate-600">Último Vercel Cron: {schedulerDiagnostics.lastCronErrorCount>0?`${schedulerDiagnostics.lastCronErrorCount} falha(s)`:'sem falhas registradas'}.</div>
        {schedulerDiagnostics.updatedAt&&<div className="mt-1 text-[10px] text-slate-600">Telemetria atualizada: {new Date(schedulerDiagnostics.updatedAt).toLocaleString('pt-BR')}</div>}
      </section>
    </>}

    {tab==='projects'&&<>
      <section className="froc-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="froc-section-title">Projetos & Sites</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{activeCount} ativos de {projects.length} cadastrados. Projetos novos entram automaticamente em Marketing Diário, Blog Diário, Vitrine, SEO/sitemap e Biblioteca global.</p>
          </div>
          <button onClick={beginCreate} className="froc-primary inline-flex items-center justify-center gap-2"><Plus size={15}/>Adicionar Projeto</button>
        </div>
      </section>

      {editingProjectId&&<section className="froc-panel space-y-4">
        <div className="flex items-center justify-between"><h3 className="froc-section-title">{editingProjectId==='new'?'Novo projeto':'Editar projeto'}</h3><button onClick={cancelEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={16}/></button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300">Nome *<input className="froc-input mt-1" value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Slug opcional<input className="froc-input mt-1" value={projectForm.slug} onChange={e=>setProjectForm({...projectForm,slug:e.target.value})} placeholder="gerado automaticamente se vazio"/></label>
          <label className="text-xs font-semibold text-slate-300">URL oficial *<input className="froc-input mt-1" value={projectForm.websiteUrl} onChange={e=>setProjectForm({...projectForm,websiteUrl:e.target.value})} placeholder="https://..."/></label>
          <label className="text-xs font-semibold text-slate-300">Play Store<input className="froc-input mt-1" value={projectForm.playStoreUrl} onChange={e=>setProjectForm({...projectForm,playStoreUrl:e.target.value})} placeholder="opcional"/></label>
          <label className="text-xs font-semibold text-slate-300">Categoria<input className="froc-input mt-1" value={projectForm.category} onChange={e=>setProjectForm({...projectForm,category:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Segmento<input className="froc-input mt-1" value={projectForm.segment} onChange={e=>setProjectForm({...projectForm,segment:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Título do app<input className="froc-input mt-1" value={projectForm.appTitle} onChange={e=>setProjectForm({...projectForm,appTitle:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Tagline<input className="froc-input mt-1" value={projectForm.tagline} onChange={e=>setProjectForm({...projectForm,tagline:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Logo URL<input className="froc-input mt-1" value={projectForm.logoUrl} onChange={e=>setProjectForm({...projectForm,logoUrl:e.target.value})} placeholder="opcional; usa logo do Portal por padrão"/></label>
          <label className="text-xs font-semibold text-slate-300">Banner URL<input className="froc-input mt-1" value={projectForm.bannerUrl} onChange={e=>setProjectForm({...projectForm,bannerUrl:e.target.value})}/></label>
        </div>
        <label className="block text-xs font-semibold text-slate-300">Descrição<textarea className="froc-input mt-1 min-h-24" value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})}/></label>
        <label className="block text-xs font-semibold text-slate-300">Público-alvo<textarea className="froc-input mt-1 min-h-20" value={projectForm.targetAudience} onChange={e=>setProjectForm({...projectForm,targetAudience:e.target.value})}/></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300">Destaques — separados por vírgula ou linha<textarea className="froc-input mt-1 min-h-24" value={projectForm.highlights} onChange={e=>setProjectForm({...projectForm,highlights:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Palavras-chave<textarea className="froc-input mt-1 min-h-24" value={projectForm.keywords} onChange={e=>setProjectForm({...projectForm,keywords:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Ângulos de marketing<textarea className="froc-input mt-1 min-h-24" value={projectForm.socialMarketingAngles} onChange={e=>setProjectForm({...projectForm,socialMarketingAngles:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-300">Palavras-chave SEO/Bing<textarea className="froc-input mt-1 min-h-24" value={projectForm.bingSeoKeywords} onChange={e=>setProjectForm({...projectForm,bingSeoKeywords:e.target.value})}/></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={projectForm.active} onChange={e=>setProjectForm({...projectForm,active:e.target.checked})}/>Projeto ativo</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={projectForm.dailyMarketingEnabled} onChange={e=>setProjectForm({...projectForm,dailyMarketingEnabled:e.target.checked})}/>Marketing diário</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={projectForm.dailyBlogEnabled} onChange={e=>setProjectForm({...projectForm,dailyBlogEnabled:e.target.checked})}/>Blog diário</label>
        </div>
        <div className="flex gap-3"><button disabled={savingProject} onClick={()=>void saveProject()} className="froc-primary inline-flex items-center gap-2"><Save size={14}/>{savingProject?'Salvando…':'Salvar projeto'}</button><button onClick={cancelEdit} className="froc-secondary">Cancelar</button></div>
      </section>}

      <section className="froc-panel">
        <div className="space-y-3">{projects.length?projects.map(project=><div key={project.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><div className="truncate text-sm font-black text-white">{project.name}</div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${project.active!==false?'bg-emerald-500/10 text-emerald-300':'bg-slate-800 text-slate-400'}`}>{project.active!==false?'ativo':'pausado'}</span>{project.isSeedProject&&<span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase text-blue-300">inicial protegido</span>}</div>
              <div className="mt-1 text-[10px] text-slate-500">{project.websiteUrl} · {project.slug}</div>
              <div className="mt-2 flex flex-wrap gap-2"><span className={`text-[10px] ${project.dailyMarketingEnabled!==false?'text-cyan-300':'text-slate-600'}`}>Marketing diário {project.dailyMarketingEnabled!==false?'ON':'OFF'}</span><span className={`text-[10px] ${project.dailyBlogEnabled!==false?'text-violet-300':'text-slate-600'}`}>Blog diário {project.dailyBlogEnabled!==false?'ON':'OFF'}</span></div>
            </div>
            <div className="flex flex-wrap gap-2"><button onClick={()=>beginEdit(project)} className="froc-secondary inline-flex items-center gap-1"><Pencil size={13}/>Editar</button><button onClick={()=>void toggleProject(project)} className="froc-secondary inline-flex items-center gap-1">{project.active===false?<><PlayCircle size={13}/>Reativar</>:<><PauseCircle size={13}/>Pausar</>}</button>{!project.isSeedProject&&<button onClick={()=>void deleteProject(project)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-300"><Trash2 size={13}/>Excluir</button>}</div>
          </div>
        </div>):<div className="text-xs text-slate-500">Nenhum projeto cadastrado.</div>}</div>
      </section>
    </>}

    {tab==='support'&&<section className="froc-panel"><div className="mb-4 flex items-center justify-between"><h3 className="froc-section-title">Chamados</h3><span className="text-[10px] text-slate-500">{tickets.length} registros</span></div><div className="space-y-3">{tickets.length?tickets.map(t=><div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-sm font-bold text-white">{t.subject}</div><div className="mt-1 text-[10px] text-slate-500">{t.userEmail} · {new Date(t.createdAt).toLocaleString('pt-BR')}</div></div><select value={t.status} onChange={e=>void ticketStatus(t.id,e.target.value)} className="min-h-9 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white"><option value="open">Aberto</option><option value="in_progress">Em atendimento</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option></select></div><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-300">{t.message}</p></div>):<div className="text-xs text-slate-500">Nenhum chamado.</div>}</div></section>}

    {tab==='blog'&&<><section className="froc-panel"><h3 className="froc-section-title flex items-center gap-2"><Sparkles size={15} className="text-cyan-400"/>Gerar rascunho editorial com IA</h3><p className="mt-2 text-xs text-slate-400">A IA cria um rascunho para revisão administrativa. Só considere publicado quando o backend confirmar a alteração de status.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={topic} onChange={e=>setTopic(e.target.value)} className="froc-input flex-1" placeholder="Tema opcional; vazio usa pauta editorial segura"/><button disabled={generating} onClick={()=>void generate()} className="froc-primary shrink-0">{generating?'Gerando…':'Gerar rascunho'}</button></div></section><section className="froc-panel"><h3 className="froc-section-title mb-4">Artigos</h3><div className="space-y-3">{posts.length?posts.map(p=><div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-white">{p.title}</div><div className="mt-1 text-[10px] text-slate-500">/{p.slug} · {p.status}</div><p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.summary}</p></div><div className="flex gap-2">{p.status!=='published'&&<button onClick={()=>void publish(p)} className="froc-primary inline-flex items-center gap-1"><CheckCircle2 size={13}/>Publicar</button>}{p.status!=='archived'&&<button onClick={()=>void archive(p)} className="froc-secondary">Arquivar</button>}</div></div>):<div className="text-xs text-slate-500">Nenhum artigo cadastrado.</div>}</div></section></>}
  </div>;
};
