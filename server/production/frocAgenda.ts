import { COLLECTIONS, firestore } from './store.js';
import { listAllPortalProjectsFromDb } from './almaPortfolio.js';

/**
 * Agenda do dono para o Froc: "o que sai hoje", "o que está atrasado", "o que a automação vai fazer".
 * Tudo no horário de Brasília (America/Sao_Paulo, UTC-03:00, sem horário de verão desde 2019).
 */

const TZ_OFFSET = '-03:00';
const PENDING = new Set(['pending', 'scheduled', 'retry_scheduled', 'publishing', 'queued', 'planned']);
const DONE = new Set(['published', 'partially_published']);

export interface AgendaPost {
  id: string;
  when: string;
  hora: string;
  projeto: string;
  titulo: string;
  plataformas: string[];
  status: string;
  erro?: string;
}

export interface OwnerAgenda {
  periodo: { de: string; ate: string; dias: number; agora: string };
  publicacoes: { total: number; porStatus: Record<string, number>; itens: AgendaPost[] };
  atrasadas: { total: number; itens: AgendaPost[] };
  falhasRecentes: { total: number; itens: AgendaPost[]; motivos: Array<{ motivo: string; quantidade: number; redes: string[]; ultima: string; oQueFazer: string }> };
  falhasHistorico: { total: number; maisDeDoisDias: number; motivos: Array<{ motivo: string; quantidade: number; redes: string[]; ultima: string; oQueFazer: string }> };
  totalGeral: { total: number; porStatus: Record<string, number>; proxima: AgendaPost | null; ultimaPublicada: AgendaPost | null };
  automacao: { projetosLigados: number; previstoNoPeriodo: Array<{ projeto: string; dia: string; horas: number[]; canais: string[] }> };
  blog: { publicadosNoPeriodo: Array<{ titulo: string; projeto: string; quando: string }> };
  kwai: { avisosNoPeriodo: Array<{ titulo: string; quando: string }> };
  videos: { emProducao: Array<{ titulo: string; projeto: string; status: string; desde: string }> };
  resumo: string;
}

/** YYYY-MM-DD de hoje em Brasília. */
export function brazilToday(nowMs = Date.now()): string {
  return new Date(nowMs - 3 * 3600_000).toISOString().slice(0, 10);
}

/** Aceita "hoje", "amanhã", "ontem", YYYY-MM-DD ou DD/MM(/AAAA). */
export function resolveAgendaDay(input: unknown, nowMs = Date.now()): string {
  const raw = String(input ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const today = brazilToday(nowMs);
  const shift = (days: number) => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
  if (!raw || raw === 'hoje' || raw === 'today') return today;
  if (raw === 'amanha' || raw === 'tomorrow') return shift(1);
  if (raw === 'ontem' || raw === 'yesterday') return shift(-1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(`${raw}T12:00:00Z`))) return raw;
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (br) {
    const year = br[3] ? (br[3].length === 2 ? `20${br[3]}` : br[3]) : today.slice(0, 4);
    const iso = `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    if (!Number.isNaN(Date.parse(`${iso}T12:00:00Z`))) return iso;
  }
  return today;
}

function brTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms - 3 * 3600_000).toISOString();
  return `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)}`;
}

function count(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

/** Tira ids, números e links do erro para agrupar falhas iguais. */
export function normalizeFailureReason(raw: unknown): string {
  const text = String(raw || '').replace(/https?:\/\/\S+/g, '').replace(/\b[0-9a-f]{12,}\b/gi, '#').replace(/\d{3,}/g, '#').replace(/\s+/g, ' ').trim();
  return text.slice(0, 140) || 'sem motivo registrado';
}

/** O que fazer para cada tipo de falha (em linguagem simples). */
export function failureHint(reason: string): string {
  const r = reason.toLowerCase();
  if (/prepayment|credits? (are )?depleted|billing|402\b|saldo/.test(r)) return 'acabou o saldo pré-pago da API do Gemini (Google AI Studio): recarregar em aistudio.google.com, em Billing do projeto da chave usada no Portal';
  if (/token|expir|session|oauth|code 190|invalid.*access|reconect/.test(r)) return 'reconectar a conta em Redes Sociais';
  if (/permiss|#10\b|#200\b|pages_|instagram_content_publish|not authorized|nao autoriz|não autoriz/.test(r)) return 'reconectar aceitando todas as permissões pedidas';
  if (/nenhuma conta|not connected|sem conex|nao conectad|não conectad|no connection|conta .*desconect/.test(r)) return 'conectar a conta dessa rede no projeto';
  if (/media|mídia|imagem|image|video|vídeo|aspect|format|resolu|duration|duração/.test(r)) return 'formato de mídia não aceito pela rede (tamanho, proporção ou tipo)';
  if (/rate|limit|too many|429|quota/.test(r)) return 'limite da rede: tentar mais tarde';
  if (/timeout|timed out|econn|network|fetch failed|503|502|500/.test(r)) return 'falha temporária da rede: pode tentar de novo';
  return 'ver o detalhe do erro';
}

export async function buildOwnerAgenda(opts: { day?: unknown; days?: unknown; projectId?: string; nowMs?: number } = {}): Promise<OwnerAgenda> {
  const nowMs = opts.nowMs ?? Date.now();
  const day = resolveAgendaDay(opts.day, nowMs);
  const days = Math.max(1, Math.min(31, Math.round(Number(opts.days) || 1)));
  const startMs = Date.parse(`${day}T00:00:00${TZ_OFFSET}`);
  const endMs = startMs + days * 86400_000;
  const db = firestore();

  const projects = await listAllPortalProjectsFromDb().catch(() => [] as any[]);
  const projectName = new Map<string, string>(projects.map((p: any) => [String(p.id), String(p.name)] as [string, string]));
  for (const p of projects as any[]) if (p.slug) projectName.set(String(p.slug), String(p.name));
  const nameOf = (id: unknown) => projectName.get(String(id || '')) || String(id || 'sem projeto');

  const contentTitles = new Map<string, string>();
  const toPost = (p: any): AgendaPost => ({
    id: String(p.id),
    when: String(p.scheduledFor || ''),
    hora: brTime(String(p.scheduledFor || '')),
    projeto: nameOf(p.companyId || p.projectId),
    titulo: String(p.title || p.caption || contentTitles.get(String(p.contentItemId)) || p.contentItemId || '').replace(/\s+/g, ' ').slice(0, 90),
    plataformas: Array.isArray(p.platforms) ? p.platforms.map(String) : [],
    status: String(p.status || 'desconhecido'),
    ...(p.errorMessage || p.lastError || p.error ? { erro: String(p.errorMessage || p.lastError || p.error).slice(0, 160) } : {})
  });

  const all = (await db.collection(COLLECTIONS.scheduledPosts).limit(5000).get()).docs.map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((p: any) => !opts.projectId || p.companyId === opts.projectId || p.projectId === opts.projectId);

  // Títulos dos conteúdos só dos itens que vamos mostrar (evita ler a biblioteca inteira).
  const inWindow = all.filter((p: any) => { const t = Date.parse(p.scheduledFor); return t >= startMs && t < endMs; });
  const overdue = all.filter((p: any) => PENDING.has(String(p.status)) && Date.parse(p.scheduledFor) < nowMs && String(p.status) !== 'planned');
  const failed = all.filter((p: any) => String(p.status) === 'failed' && Date.parse(p.updatedAt || p.scheduledFor) >= nowMs - 7 * 86400_000);
  const needTitles = [...inWindow, ...overdue.slice(-15), ...failed.slice(-10)].filter((p: any) => !p.title && p.contentItemId).map((p: any) => String(p.contentItemId));
  for (const id of [...new Set(needTitles)].slice(0, 60)) {
    const snap = await db.collection(COLLECTIONS.contentItems).doc(id).get().catch(() => null);
    const data: any = snap && snap.exists ? snap.data() : null;
    if (data) contentTitles.set(id, String(data.title || data.headline || '').slice(0, 90));
  }

  const byTime = (a: any, b: any) => String(a.scheduledFor).localeCompare(String(b.scheduledFor));
  const statusAll: Record<string, number> = {};
  for (const p of all) count(statusAll, String(p.status || 'desconhecido'));
  const statusWindow: Record<string, number> = {};
  for (const p of inWindow) count(statusWindow, String(p.status || 'desconhecido'));
  const upcoming = all.filter((p: any) => PENDING.has(String(p.status)) && Date.parse(p.scheduledFor) >= nowMs).sort(byTime)[0];
  const lastPublished = all.filter((p: any) => DONE.has(String(p.status))).sort((a: any, b: any) => String(b.publishedAt || b.updatedAt || b.scheduledFor).localeCompare(String(a.publishedAt || a.updatedAt || a.scheduledFor)))[0];

  // Automação: projetos ligados e os horários que caem no período.
  const configs = (await db.collection(COLLECTIONS.autopilotConfigs).limit(500).get().catch(() => ({ docs: [] as any[] }))).docs.map((d: any) => d.data())
    .filter((c: any) => c && c.enabled && (!opts.projectId || c.companyId === opts.projectId));
  const previsto: OwnerAgenda['automacao']['previstoNoPeriodo'] = [];
  for (let i = 0; i < days; i++) {
    const dayIso = new Date(startMs + i * 86400_000 + 12 * 3600_000).toISOString().slice(0, 10);
    const weekday = new Date(`${dayIso}T12:00:00Z`).getUTCDay();
    for (const c of configs) {
      // Mesma regra do Autopilot (isDue): sem dias escolhidos, a frequência decide.
      const prefDays = Array.isArray(c.preferredDays) && c.preferredDays.length
        ? c.preferredDays
        : (c.frequency === 'daily' || !c.frequency) ? [0, 1, 2, 3, 4, 5, 6] : c.frequency === '3_times_week' ? [1, 3, 5] : [1];
      if (!prefDays.includes(weekday)) continue;
      previsto.push({ projeto: nameOf(c.companyId), dia: dayIso, horas: Array.isArray(c.preferredHours) && c.preferredHours.length ? c.preferredHours : [10], canais: Array.isArray(c.targetPlatforms) ? c.targetPlatforms : [] });
    }
  }

  // Blog: artigos publicados no período.
  const blogDocs = (await db.collection(COLLECTIONS.blogArticles).limit(3000).get().catch(() => ({ docs: [] as any[] }))).docs.map((d: any) => d.data());
  const blog = blogDocs
    .filter((a: any) => { const t = Date.parse(a.publishedAt || ''); return a.status === 'published' && t >= startMs && t < endMs && (!opts.projectId || a.relatedProjectId === opts.projectId); })
    .sort((a: any, b: any) => String(a.publishedAt).localeCompare(String(b.publishedAt)))
    .slice(0, 20)
    .map((a: any) => ({ titulo: String(a.title || '').slice(0, 90), projeto: nameOf(a.relatedProjectId), quando: brTime(a.publishedAt) }));

  // Kwai: avisos que vão tocar no celular no período.
  const kwaiDocs = (await db.collection('kwaiReminders').limit(500).get().catch(() => ({ docs: [] as any[] }))).docs.map((d: any) => d.data());
  const kwai = kwaiDocs
    .filter((r: any) => { const t = Date.parse(r.dueAt || ''); return t >= startMs && t < endMs; })
    .map((r: any) => ({ titulo: String(r.title || 'vídeo').slice(0, 90), quando: brTime(r.dueAt) }));

  // Vídeos em produção agora.
  const jobDocs = (await db.collection(COLLECTIONS.mediaGenerationJobs).limit(1000).get().catch(() => ({ docs: [] as any[] }))).docs.map((d: any) => d.data());
  const videos = jobDocs
    .filter((j: any) => ['queued', 'processing', 'retry_scheduled', 'finalizing'].includes(String(j.status)) && (!opts.projectId || j.companyId === opts.projectId))
    .slice(0, 15)
    .map((j: any) => ({ titulo: String(j.title || j.prompt || '').slice(0, 80), projeto: nameOf(j.companyId), status: String(j.status), desde: brTime(j.createdAt || '') }));

  // Motivos das falhas agrupados (últimos 7 dias e histórico), com o que fazer.
  const groupReasons = (list: any[]) => {
    const map = new Map<string, { motivo: string; quantidade: number; redes: Set<string>; ultima: string }>();
    for (const p of list) {
      const motivo = normalizeFailureReason(p.errorMessage || p.lastError || p.error);
      const item = map.get(motivo) || { motivo, quantidade: 0, redes: new Set<string>(), ultima: '' };
      item.quantidade++;
      for (const pl of Array.isArray(p.platforms) ? p.platforms : []) item.redes.add(String(pl));
      const when = String(p.updatedAt || p.scheduledFor || '');
      if (when > item.ultima) item.ultima = when;
      map.set(motivo, item);
    }
    return [...map.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, 8)
      .map((m) => ({ motivo: m.motivo, quantidade: m.quantidade, redes: [...m.redes], ultima: brTime(m.ultima), oQueFazer: failureHint(m.motivo) }));
  };
  const allFailed = all.filter((p: any) => String(p.status) === 'failed');
  const motivosRecentes = groupReasons(failed);
  const motivosHistorico = groupReasons(allFailed);
  const failedOld = allFailed.filter((p: any) => Date.parse(p.scheduledFor) < nowMs - 2 * 86400_000).length;

  const itens = inWindow.sort(byTime).slice(0, 40).map(toPost);
  const atrasadas = overdue.sort(byTime);
  const label = days === 1 ? `o dia ${day.slice(8, 10)}/${day.slice(5, 7)}` : `${days} dias a partir de ${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const st = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${v} ${k}`).join(', ') || 'nenhuma';
  const resumo = [
    `Agenda para ${label}: ${inWindow.length} publicação(ões) (${st(statusWindow)}).`,
    itens.length ? `Itens: ${itens.slice(0, 15).map((p) => `${p.hora} ${p.projeto} "${p.titulo}" em ${p.plataformas.join('/') || '—'} [${p.status}]`).join('; ')}.` : 'Nenhuma publicação marcada nesse período.',
    atrasadas.length ? `ATRASADAS (horário já passou e não saíram): ${atrasadas.length}; as mais recentes: ${atrasadas.slice(-5).map(toPost).map((p) => `${p.hora} ${p.projeto} [${p.status}]${p.erro ? ` erro: ${p.erro}` : ''}`).join('; ')}.` : 'Nada atrasado.',
    failed.length ? `Falhas nos últimos 7 dias: ${failed.length}. Motivos: ${motivosRecentes.map((m) => `${m.quantidade}x "${m.motivo}" (${m.redes.join('/') || 'rede?'}, última ${m.ultima}) → ${m.oQueFazer}`).join('; ')}.` : '',
    allFailed.length ? `Falhas no histórico inteiro: ${allFailed.length} (${failedOld} com mais de 2 dias: são posts velhos, NÃO devem ser republicados em massa). Principais motivos: ${motivosHistorico.slice(0, 4).map((m) => `${m.quantidade}x "${m.motivo}" → ${m.oQueFazer}`).join('; ')}.` : '',
    `Total no sistema: ${all.length} (${st(statusAll)}). Próxima: ${upcoming ? `${toPost(upcoming).hora} ${toPost(upcoming).projeto}` : 'nenhuma'}. Última publicada: ${lastPublished ? `${brTime(lastPublished.publishedAt || lastPublished.updatedAt || lastPublished.scheduledFor)} ${nameOf(lastPublished.companyId)}` : 'nenhuma'}.`,
    `Automação: ${configs.length} projeto(s) ligado(s)${previsto.length ? `; previsto: ${previsto.slice(0, 12).map((a) => `${a.projeto} às ${a.horas.join('h, ')}h`).join('; ')}` : '; nada previsto no período'}.`,
    blog.length ? `Blog publicado no período: ${blog.map((b) => `"${b.titulo}" (${b.projeto})`).join('; ')}.` : 'Nenhum artigo do blog publicado no período ainda.',
    kwai.length ? `Avisos do Kwai: ${kwai.map((k) => `${k.quando} ${k.titulo}`).join('; ')}.` : '',
    videos.length ? `Vídeos em produção: ${videos.map((v) => `${v.projeto} (${v.status})`).join('; ')}.` : ''
  ].filter(Boolean).join(' ');

  return {
    periodo: { de: new Date(startMs).toISOString(), ate: new Date(endMs).toISOString(), dias: days, agora: new Date(nowMs).toISOString() },
    publicacoes: { total: inWindow.length, porStatus: statusWindow, itens },
    atrasadas: { total: atrasadas.length, itens: atrasadas.slice(-20).map(toPost) },
    falhasRecentes: { total: failed.length, itens: failed.slice(-10).map(toPost), motivos: motivosRecentes },
    falhasHistorico: { total: allFailed.length, maisDeDoisDias: failedOld, motivos: motivosHistorico },
    totalGeral: { total: all.length, porStatus: statusAll, proxima: upcoming ? toPost(upcoming) : null, ultimaPublicada: lastPublished ? toPost(lastPublished) : null },
    automacao: { projetosLigados: configs.length, previstoNoPeriodo: previsto },
    blog: { publicadosNoPeriodo: blog },
    kwai: { avisosNoPeriodo: kwai },
    videos: { emProducao: videos },
    resumo
  };
}
