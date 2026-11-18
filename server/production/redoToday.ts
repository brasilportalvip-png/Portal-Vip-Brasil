import { COLLECTIONS, firestore, nowIso, stableId } from './store.js';
import { config } from '../config/index.js';
import { findSocialConnection } from './social.js';
import { listAllPortalProjectsFromDb } from './almaPortfolio.js';

/**
 * Corrige o dia de hoje depois da correção das contas compartilhadas:
 * 1) Divulgação diária: libera de novo os projetos que geraram o post mas NÃO agendaram em nenhuma rede
 *    (o worker de 5 min refaz com a IA de verdade e publica nas contas oficiais).
 * 2) Artigos do blog publicados hoje que não foram divulgados nas redes: agenda a divulgação agora.
 * Nada é duplicado: projeto que já publicou e artigo que já tem divulgação ficam como estão.
 */
export async function redoTodayMissingPublications(userId: string, nowMs = Date.now()): Promise<{
  dailyReleased: string[];
  articlesScheduled: Array<{ title: string; project: string; platforms: string[] }>;
  skipped: number;
}> {
  const db = firestore();
  const todayUtc = new Date(nowMs).toISOString().slice(0, 10);
  const startBr = Date.parse(`${new Date(nowMs - 3 * 3600_000).toISOString().slice(0, 10)}T00:00:00-03:00`);
  const projects = await listAllPortalProjectsFromDb();
  const nameOf = new Map(projects.map((p: any) => [String(p.id), String(p.name)] as [string, string]));

  // 1) Divulgação diária: claims "completed" sem scheduleId (gerou mas não publicou)
  const dailyReleased: string[] = [];
  let skipped = 0;
  for (const project of projects as any[]) {
    if (project.active === false || project.dailyMarketingEnabled === false) continue;
    const ref = db.collection(COLLECTIONS.idempotency).doc(stableId(`portal-daily-marketing:${userId}:${project.id}:${todayUtc}`));
    const snap = await ref.get();
    const data: any = snap.exists ? snap.data() : null;
    if (data && data.status === 'completed' && !data.scheduleId) {
      await ref.set({ status: 'released_for_redo', attempts: 0, lockedUntil: 0, releasedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
      dailyReleased.push(String(project.name));
    } else {
      skipped++;
    }
  }
  if (dailyReleased.length) await db.collection(COLLECTIONS.systemSettings).doc(`daily_marketing_done_${todayUtc}`).delete().catch(() => undefined);

  // 2) Artigos de hoje sem divulgação social
  const articlesScheduled: Array<{ title: string; project: string; platforms: string[] }> = [];
  const articles = (await db.collection(COLLECTIONS.blogArticles).limit(3000).get()).docs.map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((a: any) => a.status === 'published' && Date.parse(a.publishedAt || '') >= startBr);
  for (const article of articles as any[]) {
    const scheduleId = 'blog-sched-' + stableId(article.id + ':social').slice(0, 48);
    const existing = await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).get();
    if (existing.exists) { skipped++; continue; }
    const projectId = String(article.relatedProjectId || '');
    if (!projectId) { skipped++; continue; }
    const platforms: string[] = [];
    for (const provider of ['facebook', 'instagram', 'linkedin']) {
      const resolved = await findSocialConnection(userId, projectId, provider).catch(() => null);
      if (resolved && String((resolved.data as any)?.status || 'connected') === 'connected') platforms.push(provider);
    }
    // Instagram exige imagem.
    const finalPlatforms = article.coverImage ? platforms : platforms.filter((p) => p !== 'instagram');
    if (!finalPlatforms.length) { skipped++; continue; }
    const url = config.appUrl.replace(/\/$/, '') + '/blog/' + article.slug;
    const contentId = 'blog-social-' + stableId(article.id).slice(0, 48);
    await db.collection(COLLECTIONS.contentItems).doc(contentId).set({
      id: contentId, userId, companyId: projectId, type: 'post',
      title: '[Artigo] ' + article.title, headline: article.title, body: article.excerpt || article.metaDescription || '',
      cta: url, hashtags: article.socialCampaign?.instagram?.hashtags || [],
      keywords: [article.primaryKeyword, ...(article.secondaryKeywords || [])].filter(Boolean),
      imageUrl: article.coverImage || '', targetPlatform: finalPlatforms[0], creditsUsed: 0, status: 'scheduled',
      metadata: { source: 'daily_blog_seo', blogArticleId: article.id, articleUrl: url, redoToday: true },
      createdAt: nowIso(), updatedAt: nowIso()
    }, { merge: true });
    await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
      id: scheduleId, userId, companyId: projectId, contentItemId: contentId, platforms: finalPlatforms,
      scheduledFor: nowIso(), status: 'scheduled', autopilotGenerated: true, blogRepurpose: true,
      createdAt: nowIso(), updatedAt: nowIso()
    }, { merge: true });
    articlesScheduled.push({ title: String(article.title), project: nameOf.get(projectId) || projectId, platforms: finalPlatforms });
  }
  return { dailyReleased, articlesScheduled, skipped };
}
