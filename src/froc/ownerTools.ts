/**
 * Executor das ferramentas do dono: cada uma chama um endpoint que JÁ existe no portal
 * (o servidor exige admin em todos). Devolve um resumo curto para o Froc e anexos para a tela.
 */
import { OWNER_TOOLS, type FrocAction } from '../../shared/froc/brain';

type Req = <T = any>(endpoint: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: any; timeoutMs?: number }) => Promise<T>;

export interface FrocAttachment {
  kind: 'image' | 'video' | 'text' | 'link';
  title?: string;
  url?: string;
  body?: string;
}

export interface OwnerToolResult {
  ok: boolean;
  summary: string;
  attachments?: FrocAttachment[];
}

type OwnerAction = Extract<FrocAction, { name: 'owner_tool' }>;

const s = (v: unknown) => (v == null ? '' : String(v));
const cut = (v: unknown, n: number) => s(v).replace(/\s+/g, ' ').trim().slice(0, n);

/** Descrição curta da ação para o cartão de confirmação. */
export function describeOwnerAction(a: OwnerAction): string {
  const spec = OWNER_TOOLS[a.tool];
  const args = Object.entries(a.args || {})
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : cut(v, 80)}`)
    .join(' · ');
  return `${spec?.label || a.tool}${args ? ` — ${args}` : ''}`;
}

export function needsConfirmation(a: FrocAction): boolean {
  return a.name === 'owner_tool' && !!OWNER_TOOLS[a.tool]?.confirm;
}

function projectId(a: OwnerAction, fallback?: string | null): string {
  return s(a.args.projectId) || s(fallback) || '';
}

export async function runOwnerTool(a: OwnerAction, req: Req, ctx: { selectedProjectId?: string | null } = {}): Promise<OwnerToolResult> {
  const arg = a.args || {};
  const pid = projectId(a, ctx.selectedProjectId);
  const slow = 280_000;
  switch (a.tool) {
    case 'status_overview': {
      const r: any = await req(`/api/dashboard/status${pid ? `?companyId=${encodeURIComponent(pid)}` : ''}`);
      return { ok: true, summary: `Status do portal: ${cut(JSON.stringify(r), 1500)}` };
    }
    case 'admin_overview': {
      const r: any = await req('/api/admin/overview');
      return { ok: true, summary: `Resumo da administração: ${cut(JSON.stringify(r), 1500)}` };
    }
    case 'list_projects': {
      const r: any = await req('/api/admin/projects');
      const list = (r?.projects || []).map((p: any) => `${p.name} (id ${p.id}, ${p.active === false ? 'inativo' : 'ativo'}, marketing diário ${p.dailyMarketingEnabled === false ? 'off' : 'on'}, blog diário ${p.dailyBlogEnabled === false ? 'off' : 'on'})`);
      return { ok: true, summary: `${list.length} projetos: ${list.join('; ')}` };
    }
    case 'list_content': {
      const r: any = await req(`/api/content${pid ? `?companyId=${encodeURIComponent(pid)}` : ''}`);
      const items = (r?.items || []).slice(0, 12).map((i: any) => `${i.type} "${cut(i.title || i.headline, 70)}" (id ${i.id}, projeto ${i.companyId}, ${i.status})`);
      return { ok: true, summary: `${(r?.items || []).length} conteúdos. Mais recentes: ${items.join('; ') || 'nenhum'}` };
    }
    case 'agenda': {
      const q = new URLSearchParams();
      if (s(arg.day)) q.set('day', s(arg.day));
      if (arg.days) q.set('days', s(arg.days));
      if (pid && s(arg.projectId)) q.set('projectId', pid);
      const r: any = await req(`/api/froc/owner/agenda?${q.toString()}`);
      const a = r?.agenda || {};
      return { ok: true, summary: cut(a.resumo || JSON.stringify(a), 3500) };
    }
    case 'list_scheduled': {
      const r: any = await req(`/api/content/scheduled${s(arg.projectId) ? `?companyId=${encodeURIComponent(pid)}` : ''}`);
      const all: any[] = r?.scheduledPosts || [];
      const status = s(arg.status).toLowerCase();
      const now = Date.now();
      // Antes: mostrava os 12 MAIS ANTIGOS (setembro). Agora: os próximos a partir de agora, ou o status pedido (mais recentes).
      const list = status
        ? all.filter((p) => String(p.status).toLowerCase() === status).sort((a, b) => String(b.scheduledFor).localeCompare(String(a.scheduledFor)))
        : all.filter((p) => Date.parse(p.scheduledFor) >= now).sort((a, b) => String(a.scheduledFor).localeCompare(String(b.scheduledFor)));
      const byStatus: Record<string, number> = {};
      for (const p of all) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      const br = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? iso : new Date(t - 3 * 3600_000).toISOString().slice(0, 16).replace('T', ' '); };
      const items = list.slice(0, 15).map((p: any) => `${br(p.scheduledFor)} ${cut(p.title || p.contentItemId, 60)} (id ${p.id}, ${(p.platforms || []).join('/')}, ${p.status}${p.errorMessage || p.lastError ? `, erro: ${cut(p.errorMessage || p.lastError, 100)}` : ''})`);
      return { ok: true, summary: `${all.length} agendamentos no total (${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ')}). ${status ? `Com status ${status}` : 'Próximos a partir de agora'} (${list.length}): ${items.join('; ') || 'nenhum'}` };
    }
    case 'project_details': {
      const r: any = await req('/api/admin/projects');
      const p = (r?.projects || []).find((x: any) => x.id === pid || x.slug === pid || String(x.name).toLowerCase() === s(arg.projectId).toLowerCase());
      if (!p) return { ok: false, summary: `Projeto ${pid || '(não informado)'} não encontrado. Use list_projects para ver os ids.` };
      const keep = ['id', 'slug', 'name', 'category', 'segment', 'tagline', 'description', 'highlights', 'socialMarketingAngles', 'targetAudience', 'keywords', 'websiteUrl', 'playStoreUrl', 'hasApp', 'logoUrl', 'active', 'dailyMarketingEnabled', 'dailyBlogEnabled'];
      const out: Record<string, any> = {};
      for (const k of keep) if (p[k] !== undefined && p[k] !== '') out[k] = p[k];
      return { ok: true, summary: `Cadastro de ${p.name}: ${cut(JSON.stringify(out), 3000)}` };
    }
    case 'list_campaigns': {
      const r: any = await req(`/api/campaigns${pid && s(arg.projectId) ? `?companyId=${encodeURIComponent(pid)}` : ''}`);
      const list = (r?.campaigns || []).slice(0, 15).map((c: any) => `"${cut(c.name, 60)}" (${c.status || 'rascunho'}, ${(c.targetPlatforms || []).join('/')}${c.startDate ? `, início ${String(c.startDate).slice(0, 10)}` : ''})`);
      return { ok: true, summary: `${(r?.campaigns || []).length} campanhas: ${list.join('; ') || 'nenhuma'}` };
    }
    case 'video_jobs': {
      const r: any = await req('/api/ai/video-jobs');
      const jobs: any[] = r?.jobs || r?.videoJobs || [];
      const list = jobs.slice(0, 12).map((j: any) => `${cut(j.title || j.prompt, 60)} (${j.status}${j.brandingApplied === false && j.brandingReason ? `, sem marca: ${cut(j.brandingReason, 80)}` : ''}${j.errorMessage ? `, erro: ${cut(j.errorMessage, 80)}` : ''})`);
      return { ok: true, summary: `${jobs.length} vídeos: ${list.join('; ') || 'nenhum'}` };
    }
    case 'support_tickets': {
      const r: any = await req('/api/admin/support/tickets');
      const list = (r?.tickets || []).slice(0, 12).map((t: any) => `"${cut(t.subject, 60)}" (${t.status || 'aberto'}, ${String(t.createdAt || '').slice(0, 10)})`);
      return { ok: true, summary: `${(r?.tickets || []).length} chamados: ${list.join('; ') || 'nenhum'}` };
    }
    case 'system_health': {
      const [diag, blog, dash]: any[] = await Promise.all([
        req('/api/admin/scheduler/diagnostics').catch((e: any) => ({ erro: String(e?.message || e) })),
        req('/api/portal/blog/diagnostics').catch((e: any) => ({ erro: String(e?.message || e) })),
        req('/api/dashboard/status').catch((e: any) => ({ erro: String(e?.message || e) }))
      ]);
      return { ok: true, summary: `Agendador: ${cut(JSON.stringify(diag), 900)} | Blog: ${cut(JSON.stringify(blog), 900)} | Painel: ${cut(JSON.stringify(dash), 900)}` };
    }
    case 'owner_notes': {
      const r: any = await req('/api/froc/owner/notes');
      const list = (r?.notes || []).slice(0, 15).map((n: any) => `${String(n.createdAt || '').slice(0, 10)} [${n.status}] ${cut(n.text, 120)}`);
      return { ok: true, summary: `${(r?.notes || []).length} pedidos anotados: ${list.join('; ') || 'nenhum'}` };
    }
    case 'autopilot_overview': {
      const r: any = await req('/api/autopilot/overview');
      return { ok: true, summary: `Automação: ${cut(JSON.stringify(r), 1500)}` };
    }
    case 'cost_summary': {
      const r: any = await req('/api/autopilot/cost-summary');
      return { ok: true, summary: `Custos: ${cut(JSON.stringify(r), 1200)}` };
    }
    case 'social_readiness': {
      if (!pid) return { ok: false, summary: 'Preciso saber de qual projeto verificar as redes sociais (projectId).' };
      const r: any = await req(`/api/social/readiness?companyId=${encodeURIComponent(pid)}`);
      return { ok: true, summary: `Redes sociais de ${pid}: ${cut(JSON.stringify(r), 1200)}` };
    }
    case 'blog_articles': {
      const r: any = await req(`/api/portal/blog/articles?limit=10${pid ? `&projectId=${encodeURIComponent(pid)}` : ''}`);
      const list = (r?.articles || r?.items || []).slice(0, 10).map((x: any) => `"${cut(x.title, 70)}" (id ${x.id}, ${x.status || 'published'})`);
      return { ok: true, summary: `Artigos publicados: ${list.join('; ') || 'nenhum'}` };
    }
    case 'generate_post': {
      const r: any = await req('/api/ai/generate-post', { method: 'POST', timeoutMs: slow, body: { topic: s(arg.topic), platform: s(arg.platform) || 'Instagram', companyId: pid, tone: s(arg.tone), goal: s(arg.goal) } });
      const p = r?.post || {};
      const body = [p.headline, p.body, p.cta, (p.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
      return { ok: true, summary: `Post criado e salvo na biblioteca (id ${r?.contentItem?.id}). Título: "${cut(p.headline, 100)}".`, attachments: [{ kind: 'text', title: p.headline || 'Post', body }] };
    }
    case 'generate_carousel': {
      const r: any = await req('/api/ai/generate-carousel', { method: 'POST', timeoutMs: slow, body: { topic: s(arg.topic), companyId: pid, goal: s(arg.goal) } });
      const c = r?.carousel || {};
      const body = [(c.slides || []).map((sl: any, i: number) => `${i + 1}. ${sl.title || sl.headline || ''} — ${sl.text || sl.body || ''}`).join('\n'), c.caption].filter(Boolean).join('\n\n');
      return { ok: true, summary: `Carrossel "${cut(c.carouselTitle, 80)}" salvo (id ${r?.contentItem?.id}) com ${(c.slides || []).length} slides.`, attachments: [{ kind: 'text', title: c.carouselTitle || 'Carrossel', body }] };
    }
    case 'generate_video_script': {
      const r: any = await req('/api/ai/generate-video-script', { method: 'POST', timeoutMs: slow, body: { topic: s(arg.topic), companyId: pid } });
      const v = r?.videoScript || {};
      const body = [(v.scenes || []).map((sc: any, i: number) => `Cena ${i + 1}: ${sc.visual || sc.description || ''} ${sc.narration || sc.voiceover || ''}`).join('\n'), v.caption].filter(Boolean).join('\n\n');
      return { ok: true, summary: `Roteiro "${cut(v.scriptTitle, 80)}" salvo (id ${r?.contentItem?.id}).`, attachments: [{ kind: 'text', title: v.scriptTitle || 'Roteiro', body }] };
    }
    case 'generate_copy': {
      const type = ['cta', 'headline', 'caption', 'variations'].includes(s(arg.type)) ? s(arg.type) : 'caption';
      const r: any = await req('/api/ai/generate-copy', { method: 'POST', timeoutMs: slow, body: { prompt: s(arg.prompt), type, companyId: pid } });
      const text = typeof r?.text === 'string' ? r.text : JSON.stringify(r?.text || '');
      return { ok: true, summary: `Texto pronto: ${cut(text, 300)}`, attachments: [{ kind: 'text', title: 'Texto', body: text }] };
    }
    case 'generate_strategy': {
      if (!pid) return { ok: false, summary: 'Para a estratégia preciso do projeto (projectId).' };
      const r: any = await req('/api/ai/generate-strategy', { method: 'POST', timeoutMs: slow, body: { companyId: pid, goal: s(arg.goal), timeframe: s(arg.timeframe) === 'mes' ? 'mes' : 'semana' } });
      const text = cut(JSON.stringify(r?.strategy || {}), 4000);
      return { ok: true, summary: `Estratégia criada: ${cut(text, 600)}`, attachments: [{ kind: 'text', title: 'Estratégia', body: text }] };
    }
    case 'generate_article': {
      const r: any = await req('/api/ai/generate-article', { method: 'POST', timeoutMs: slow, body: { topic: s(arg.topic), companyId: pid } });
      return { ok: true, summary: `Artigo "${cut(r?.article?.title || r?.contentItem?.title, 100)}" salvo na biblioteca (id ${r?.contentItem?.id}).`, attachments: [{ kind: 'text', title: r?.article?.title || 'Artigo', body: cut(r?.contentItem?.body, 6000) }] };
    }
    case 'generate_image': {
      const aspect = ['1:1', '9:16', '16:9', '4:5', '3:4'].includes(s(arg.aspectRatio)) ? s(arg.aspectRatio) : '1:1';
      const r: any = await req('/api/ai/generate-image', { method: 'POST', timeoutMs: slow, body: { theme: s(arg.theme), style: s(arg.style), aspectRatio: aspect, companyId: pid } });
      const url = r?.imageUrl || r?.image?.imageUrl;
      return { ok: !!url, summary: url ? `Imagem criada e salva na biblioteca (id ${r?.contentItem?.id}).` : 'A imagem não voltou.', attachments: url ? [{ kind: 'image', url, title: cut(arg.theme, 80) }] : [] };
    }
    case 'generate_project_article': {
      if (!pid) return { ok: false, summary: 'Qual projeto recebe o post do dia? (projectId)' };
      const r: any = await req('/api/portal/blog/generate-project-article', { method: 'POST', timeoutMs: slow, body: { projectId: pid, customTopic: s(arg.topic) || undefined } });
      const art = r?.article || {};
      return { ok: true, summary: `Artigo do blog "${cut(art.title, 100)}" criado (status ${art.status || r?.status || 'gerado'}, id ${art.id}).`, attachments: art.slug ? [{ kind: 'link', title: art.title, url: `/blog/${art.slug}` }] : [] };
    }
    case 'seo_ping_all': {
      const r: any = await req('/api/seo/ping-all', { method: 'POST', timeoutMs: slow, body: {} });
      return { ok: true, summary: `Ping de SEO enviado: ${cut(JSON.stringify(r), 600)}` };
    }
    case 'save_owner_note': {
      const r: any = await req('/api/froc/owner/note', { method: 'POST', body: { text: s(arg.text) } });
      return { ok: true, summary: `Pedido anotado (id ${r?.id}). Fica salvo em "Pedidos do dono" para enviar ao desenvolvedor.` };
    }
    case 'generate_video': {
      const aspect = s(arg.aspectRatio) === '16:9' ? '16:9' : '9:16';
      const r: any = await req('/api/ai/generate-video', { method: 'POST', timeoutMs: slow, body: { prompt: s(arg.prompt), companyId: pid, aspectRatio: aspect, preset: 'demo_720p' } });
      const job = r?.job || r?.videoJob || r;
      return { ok: true, summary: `Vídeo em produção (job ${job?.id || job?.jobId || '?'}, status ${job?.status || 'iniciado'}). Ele aparece na biblioteca e na tela Criar vídeo quando ficar pronto.` };
    }
    case 'daily_pulse': {
      const r: any = await req('/api/portal/daily-pulse', { method: 'POST', timeoutMs: slow, body: {} });
      return { ok: true, summary: `Ciclo diário de marketing: ${cut(JSON.stringify(r), 900)}` };
    }
    case 'blog_daily_cycle': {
      const r: any = await req('/api/portal/blog/daily-cycle', { method: 'POST', timeoutMs: slow, body: {} });
      return { ok: true, summary: `Ciclo do blog: ${(r?.articlesGenerated || []).length} artigos gerados. ${cut(JSON.stringify({ ...r, articlesGenerated: undefined }), 500)}` };
    }
    case 'autopilot_trigger': {
      if (!pid) return { ok: false, summary: 'Para disparar a automação preciso do projeto (projectId).' };
      const r: any = await req('/api/autopilot/trigger-now', { method: 'POST', timeoutMs: slow, body: { companyId: pid } });
      return { ok: r?.success !== false, summary: `Automação de ${pid}: ${cut(r?.message, 200)} (etapa ${r?.stage || '?'}, status ${r?.status || '?'})` };
    }
    case 'autopilot_master': {
      const body: any = {};
      if (typeof arg.globalEnabled === 'boolean') body.globalEnabled = arg.globalEnabled;
      if (typeof arg.pauseAllExternalApis === 'boolean') body.pauseAllExternalApis = arg.pauseAllExternalApis;
      if (['automatic', 'manual_approval'].includes(s(arg.mode))) body.mode = s(arg.mode);
      if (!Object.keys(body).length) return { ok: false, summary: 'Nada para mudar na automação geral.' };
      const r: any = await req('/api/autopilot/master-control', { method: 'POST', body });
      return { ok: true, summary: `Automação geral atualizada: ${cut(JSON.stringify(r?.control || r), 500)}` };
    }
    case 'autopilot_project_toggle': {
      if (!pid || typeof arg.enabled !== 'boolean') return { ok: false, summary: 'Preciso do projeto e se é para ligar ou desligar.' };
      await req('/api/autopilot/project-toggle', { method: 'POST', body: { projectId: pid, enabled: arg.enabled } });
      return { ok: true, summary: `Automação do projeto ${pid} ${arg.enabled ? 'LIGADA' : 'DESLIGADA'}.` };
    }
    case 'update_project': {
      if (!pid) return { ok: false, summary: 'Qual projeto editar? (projectId)' };
      const fields = ['tagline', 'description', 'highlights', 'keywords', 'targetAudience', 'websiteUrl', 'playStoreUrl', 'active', 'dailyMarketingEnabled', 'dailyBlogEnabled'];
      const updates: Record<string, any> = {};
      for (const f of fields) if (arg[f] !== undefined) updates[f] = arg[f];
      if (!Object.keys(updates).length) return { ok: false, summary: 'Nenhum campo para alterar.' };
      const r: any = await req(`/api/admin/projects/${encodeURIComponent(pid)}`, { method: 'PATCH', body: updates });
      return { ok: true, summary: `Projeto ${r?.project?.name || pid} atualizado: ${Object.keys(updates).join(', ')}.` };
    }
    case 'set_article_status': {
      const status = ['published', 'pending_approval', 'draft', 'archived'].includes(s(arg.status)) ? s(arg.status) : '';
      if (!s(arg.articleId) || !status) return { ok: false, summary: 'Preciso do id do artigo e do status (published, draft, pending_approval ou archived).' };
      await req(`/api/portal/blog/articles/${encodeURIComponent(s(arg.articleId))}/status`, { method: 'PATCH', body: { status } });
      return { ok: true, summary: `Artigo ${s(arg.articleId)} agora está ${status}.` };
    }
    case 'schedule_content': {
      if (!s(arg.contentItemId) || !s(arg.scheduledFor) || !pid) return { ok: false, summary: 'Para agendar preciso do conteúdo (contentItemId), do projeto e da data/hora.' };
      const platforms = Array.isArray(arg.platforms) && arg.platforms.length ? arg.platforms : ['instagram'];
      const r: any = await req('/api/content/schedule', { method: 'POST', body: { contentItemId: s(arg.contentItemId), scheduledFor: s(arg.scheduledFor), companyId: pid, platforms } });
      return { ok: true, summary: `Agendado para ${s(arg.scheduledFor)} em ${platforms.join(', ')}: ${cut(r?.message || r?.status || 'ok', 200)}` };
    }
    case 'cancel_scheduled': {
      if (!s(arg.scheduledId)) return { ok: false, summary: 'Qual agendamento cancelar? (scheduledId — aparece na agenda/list_scheduled)' };
      const r: any = await req(`/api/content/scheduled/${encodeURIComponent(s(arg.scheduledId))}/cancel`, { method: 'POST', body: {} });
      return { ok: true, summary: `Agendamento ${s(arg.scheduledId)} cancelado. ${cut(r?.message || '', 160)}` };
    }
    case 'retry_scheduled': {
      if (!s(arg.scheduledId)) return { ok: false, summary: 'Qual agendamento tentar de novo? (scheduledId)' };
      const r: any = await req(`/api/content/scheduled/${encodeURIComponent(s(arg.scheduledId))}/retry`, { method: 'POST', body: {} });
      return { ok: true, summary: `Agendamento ${s(arg.scheduledId)} voltou para a fila. ${cut(r?.message || '', 160)}` };
    }
    case 'run_scheduler_now': {
      const r: any = await req('/api/admin/scheduler/run-now', { method: 'POST', timeoutMs: slow, body: {} });
      return { ok: true, summary: `Publicador rodou agora: ${cut(JSON.stringify(r), 900)}` };
    }
  }
  return { ok: false, summary: `Ferramenta ${a.tool} não reconhecida.` };
}
