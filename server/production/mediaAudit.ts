/**
 * Auditoria de imagens e vídeos do Portal (rodada no servidor de produção, com acesso real ao banco
 * e à internet). Confere:
 * - Blog: capa de cada artigo publicado abre, é imagem (não logo/ícone), não se repete entre artigos
 *   e combina com o tema do artigo.
 * - Vitrine: capa e logo de cada projeto abrem; capa não é o logo nem se repete entre projetos.
 * - Biblioteca: onde é vídeo há um vídeo de verdade (e não imagem), onde é imagem há imagem; nada
 *   repetido entre peças.
 * - Vídeos gerados: todo job concluído tem o arquivo de vídeo.
 */
import { COLLECTIONS, firestore, nowIso } from './store.js';
import { listAllPortalProjectsFromDb } from './almaPortfolio.js';
import { coverNeedsThemeFix, coverSceneGroupFor } from './coverPhotoEngine.js';
import { isInvalidOrLogoImage, publicCoverUrl } from './blogEngine.js';

export type MediaKind = 'image' | 'video';

export interface MediaIssue {
  area: 'blog' | 'vitrine' | 'biblioteca' | 'videos';
  severity: 'alta' | 'media' | 'baixa';
  item: string;
  problem: string;
  url?: string;
}

export interface MediaAuditReport {
  checkedAt: string;
  checkedUrls: number;
  totals: { blogArticles: number; projects: number; contentItems: number; videoJobs: number };
  issues: MediaIssue[];
  ok: boolean;
}

type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null } }>;

/** Mesma foto com parâmetros diferentes conta como repetida. */
export function mediaKey(url?: string | null): string {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const unsplash = raw.match(/images\.unsplash\.com\/(photo-[a-z0-9-]+)/i);
  if (unsplash) return unsplash[1].toLowerCase();
  return raw.split('#')[0].split('?')[0].toLowerCase();
}

export function looksLikeVideoUrl(url?: string | null): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(String(url || '')) || /^data:video\//i.test(String(url || ''));
}

export function looksLikeImageUrl(url?: string | null): boolean {
  return /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(String(url || '')) || /^data:image\//i.test(String(url || '')) || /images\.unsplash\.com/i.test(String(url || ''));
}

/** Abre a URL (HEAD, com GET de 1 byte como reserva) e confere se é do tipo certo. */
export async function probeMedia(url: string, kind: MediaKind, fetchImpl: FetchLike = fetch as unknown as FetchLike, base = ''): Promise<string | null> {
  if (!url) return 'sem endereço';
  if (/^data:/i.test(url)) return url.toLowerCase().startsWith(`data:${kind}/`) ? null : `conteúdo embutido não é ${kind === 'image' ? 'imagem' : 'vídeo'}`;
  let absolute = url;
  if (url.startsWith('/')) {
    if (!base) return null;
    absolute = base.replace(/\/$/, '') + url;
  }
  if (!/^https?:\/\//i.test(absolute)) return 'endereço inválido';
  const attempt = async (method: 'HEAD' | 'GET') => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      return await fetchImpl(absolute, { method, redirect: 'follow', signal: controller.signal, headers: method === 'GET' ? { Range: 'bytes=0-0' } : {} });
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    let res = await attempt('HEAD');
    if (!res.ok && [403, 405, 501].includes(res.status)) res = await attempt('GET');
    if (!res.ok && res.status !== 206) return `não abre (HTTP ${res.status})`;
    const type = String(res.headers.get('content-type') || '').toLowerCase();
    if (type && !type.startsWith(`${kind}/`) && !type.includes('octet-stream')) {
      return `deveria ser ${kind === 'image' ? 'imagem' : 'vídeo'}, mas o servidor entrega "${type.split(';')[0]}"`;
    }
    return null;
  } catch (error: any) {
    return error?.name === 'AbortError' ? 'não respondeu em 8 segundos' : 'não abre (falha de rede)';
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runMediaAudit(options: { userId?: string; checkUrls?: boolean; maxUrls?: number; baseUrl?: string; fetchImpl?: FetchLike } = {}): Promise<MediaAuditReport> {
  const db = firestore();
  const issues: MediaIssue[] = [];
  const toProbe: Array<{ url: string; kind: MediaKind; issue: Omit<MediaIssue, 'problem'> }> = [];

  // ---------------- Blog
  const articles: any[] = [];
  for (const col of [COLLECTIONS.blogArticles, COLLECTIONS.blogPosts]) {
    const snap = await db.collection(col).where('status', '==', 'published').get().catch(() => ({ docs: [] as any[] }));
    for (const doc of snap.docs || []) articles.push({ id: doc.id, ...(doc.data() as any) });
  }
  const coverOwners = new Map<string, string[]>();
  for (const article of articles) {
    const label = String(article.title || article.slug || article.id).slice(0, 90);
    const stored = String(article.coverImage || '');
    if (!stored || isInvalidOrLogoImage(stored)) {
      issues.push({ area: 'blog', severity: 'media', item: label, problem: 'sem capa própria (usa foto de catálogo); a capa fotográfica por IA é gerada no próximo lote' });
    }
    if (article.coverPhotoVersion && coverNeedsThemeFix({ ...article, relatedProjectId: article.relatedProjectId || article.projectId })) {
      issues.push({ area: 'blog', severity: 'alta', item: label, problem: `capa com tema errado; refeita automaticamente no próximo lote (tema certo: ${coverSceneGroupFor({ ...article, relatedProjectId: article.relatedProjectId || article.projectId })})` });
    }
    const effective = publicCoverUrl(article);
    const key = mediaKey(effective);
    if (key) coverOwners.set(key, [...(coverOwners.get(key) || []), label]);
    toProbe.push({ url: effective, kind: 'image', issue: { area: 'blog', severity: 'alta', item: label, url: effective } });
  }
  for (const [key, owners] of coverOwners) {
    if (owners.length > 1) {
      issues.push({ area: 'blog', severity: 'alta', item: owners.slice(0, 4).join(' | '), problem: `mesma capa em ${owners.length} artigos (${key})` });
    }
  }

  // ---------------- Vitrine
  const projects = await listAllPortalProjectsFromDb().catch(() => [] as any[]);
  const bannerOwners = new Map<string, string[]>();
  for (const project of projects as any[]) {
    const name = String(project.name || project.id);
    const banner = String(project.bannerUrl || '');
    const logo = String(project.logoUrl || '');
    if (!banner || isInvalidOrLogoImage(banner) || banner === logo) {
      issues.push({ area: 'vitrine', severity: 'media', item: name, problem: 'sem capa própria (a vitrine mostra uma capa desenhada no lugar); cadastre a capa no Admin' });
    } else {
      const key = mediaKey(banner);
      bannerOwners.set(key, [...(bannerOwners.get(key) || []), name]);
      toProbe.push({ url: banner, kind: 'image', issue: { area: 'vitrine', severity: 'alta', item: `${name} (capa)`, url: banner } });
    }
    if (logo) toProbe.push({ url: logo, kind: 'image', issue: { area: 'vitrine', severity: 'media', item: `${name} (logo)`, url: logo } });
    else issues.push({ area: 'vitrine', severity: 'baixa', item: name, problem: 'sem logo cadastrado' });
  }
  for (const [key, owners] of bannerOwners) {
    if (owners.length > 1) issues.push({ area: 'vitrine', severity: 'alta', item: owners.join(' | '), problem: `mesma capa em ${owners.length} projetos (${key})` });
  }

  // ---------------- Biblioteca (conteúdos do dono)
  let contentCount = 0;
  if (options.userId) {
    const snap = await db.collection(COLLECTIONS.contentItems).where('userId', '==', options.userId).get().catch(() => ({ docs: [] as any[] }));
    const recent = (snap.docs || []).map((d: any) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 200);
    contentCount = recent.length;
    const imageOwners = new Map<string, string[]>();
    for (const item of recent) {
      const label = String(item.title || item.headline || item.id).slice(0, 80);
      const imageUrl = String(item.imageUrl || '');
      const videoUrl = String(item.videoUrl || '');
      if (item.type === 'video' && !videoUrl) issues.push({ area: 'biblioteca', severity: 'alta', item: label, problem: 'peça de vídeo sem arquivo de vídeo' });
      if (videoUrl && looksLikeImageUrl(videoUrl)) issues.push({ area: 'biblioteca', severity: 'alta', item: label, problem: 'o campo de vídeo aponta para uma imagem', url: videoUrl });
      if (imageUrl && looksLikeVideoUrl(imageUrl)) issues.push({ area: 'biblioteca', severity: 'alta', item: label, problem: 'o campo de imagem aponta para um vídeo', url: imageUrl });
      if (videoUrl) toProbe.push({ url: videoUrl, kind: 'video', issue: { area: 'biblioteca', severity: 'alta', item: `${label} (vídeo)`, url: videoUrl } });
      if (imageUrl && !/^data:/i.test(imageUrl)) {
        const key = mediaKey(imageUrl);
        imageOwners.set(key, [...(imageOwners.get(key) || []), label]);
        toProbe.push({ url: imageUrl, kind: 'image', issue: { area: 'biblioteca', severity: 'media', item: `${label} (imagem)`, url: imageUrl } });
      }
    }
    for (const [key, owners] of imageOwners) {
      if (owners.length > 1) issues.push({ area: 'biblioteca', severity: 'media', item: owners.slice(0, 4).join(' | '), problem: `mesma imagem em ${owners.length} peças (${key})` });
    }
  }

  // ---------------- Vídeos gerados
  let jobCount = 0;
  if (options.userId) {
    const snap = await db.collection(COLLECTIONS.mediaGenerationJobs).where('userId', '==', options.userId).get().catch(() => ({ docs: [] as any[] }));
    for (const doc of snap.docs || []) {
      const job = doc.data() as any;
      if (job?.type && job.type !== 'video') continue;
      jobCount++;
      if (['completed', 'ready_to_publish', 'published'].includes(String(job.status)) && !job.videoUrl) {
        issues.push({ area: 'videos', severity: 'alta', item: String(job.title || doc.id).slice(0, 80), problem: 'vídeo marcado como pronto, mas sem arquivo' });
      }
    }
  }

  // ---------------- Abre cada endereço de verdade
  let checkedUrls = 0;
  if (options.checkUrls !== false) {
    const seen = new Set<string>();
    const unique = toProbe.filter((p) => {
      const k = `${p.kind}:${p.url}`;
      if (!p.url || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, Math.max(1, options.maxUrls ?? 150));
    const results = await mapLimit(unique, 6, (p) => probeMedia(p.url, p.kind, options.fetchImpl, options.baseUrl));
    checkedUrls = unique.length;
    results.forEach((problem, i) => {
      if (problem) issues.push({ ...unique[i].issue, problem });
    });
  }

  const order = { alta: 0, media: 1, baixa: 2 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    checkedAt: nowIso(),
    checkedUrls,
    totals: { blogArticles: articles.length, projects: (projects as any[]).length, contentItems: contentCount, videoJobs: jobCount },
    issues,
    ok: !issues.some((i) => i.severity === 'alta'),
  };
}
