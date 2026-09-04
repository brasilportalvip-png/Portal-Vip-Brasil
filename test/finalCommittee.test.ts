import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { firestore, resetMemoryDb } from '../server/production/store.js';
import { createPortalProjectInDb, PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';
import { renderPublicPage } from '../server/production/publicPages.js';
import { INITIAL_SEEDED_ARTICLES, getBlogArticleBySlug, listBlogArticles, serializeBlogArticleForPublic } from '../server/production/blogEngine.js';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('Comitê final: Firestore em memória suporta orderBy encadeado antes de limit', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection('committee_order').doc('a').set({ id: 'a', publishedAt: '2026-01-01T00:00:00.000Z' });
  await db.collection('committee_order').doc('c').set({ id: 'c', publishedAt: '2026-03-01T00:00:00.000Z' });
  await db.collection('committee_order').doc('b').set({ id: 'b', publishedAt: '2026-02-01T00:00:00.000Z' });

  const snap = await db.collection('committee_order').orderBy('publishedAt', 'desc').limit(2).get();
  assert.deepEqual(snap.docs.map((doc: any) => doc.id), ['c', 'b']);
});

test('Comitê final: projeto criado pelo Admin possui SSR/SEO individual dinâmico', async () => {
  resetMemoryDb();
  const project = await createPortalProjectInDb({
    name: 'Projeto Futuro Comitê',
    websiteUrl: 'https://example.com/projeto-futuro',
    category: 'Projeto digital',
    description: 'Projeto de validação para comprovar que novos sites não dependem de array estático.'
  });

  const page = await renderPublicPage(`/vitrine/${project.slug}`);
  assert.equal(page.status, 200);
  assert.match(page.html, /Projeto Futuro Comitê/);
  assert.match(page.html, new RegExp(`/vitrine/${project.slug}`));
  assert.match(page.html, /application\/ld\+json/);
});

test('Comitê final: artigos editoriais seed não carregam métricas fictícias e abrem por URL individual', async () => {
  resetMemoryDb();
  assert.ok(INITIAL_SEEDED_ARTICLES.length > 0, 'Deve existir ao menos um artigo editorial inicial.');
  for (const article of INITIAL_SEEDED_ARTICLES) {
    assert.equal(article.views, 0, `${article.slug}: views deve começar em zero`);
    assert.equal(article.likes, 0, `${article.slug}: likes deve começar em zero`);
    assert.equal(article.shares, 0, `${article.slug}: shares deve começar em zero`);
    assert.equal(article.clicksWebsite, 0, `${article.slug}: clicksWebsite deve começar em zero`);
    assert.equal(article.clicksPlayStore, 0, `${article.slug}: clicksPlayStore deve começar em zero`);
  }

  const page = await renderPublicPage(`/blog/${INITIAL_SEEDED_ARTICLES[0].slug}`);
  assert.equal(page.status, 200);
  assert.match(page.html, new RegExp(`/blog/${INITIAL_SEEDED_ARTICLES[0].slug}`));
  assert.match(page.html, new RegExp(INITIAL_SEEDED_ARTICLES[0].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});



test('Comitê final: API pública do Blog não encontra rascunho por slug', async () => {
  resetMemoryDb();
  await firestore().collection('blogArticles').doc('draft-secret').set({
    id: 'draft-secret',
    slug: 'rascunho-nao-publico',
    status: 'draft',
    title: 'Rascunho interno'
  });
  assert.equal(await getBlogArticleBySlug('rascunho-nao-publico'), undefined);
});

test('Comitê final: fallback editorial respeita filtro de projeto e não injeta artigos de outro site', async () => {
  resetMemoryDb();
  const result = await listBlogArticles({ projectId: 'projeto-sem-artigos', status: 'published' });
  assert.equal(result.total, 0);
  assert.deepEqual(result.articles, []);
});

test('Comitê final: contrato público do Blog entrega todos os campos usados pelo frontend', () => {
  const stored = INITIAL_SEEDED_ARTICLES[0];
  const project = PORTAL_VIP_PROJECTS.find((item) => item.id === stored.relatedProjectId);
  const article = serializeBlogArticleForPublic(stored, project);

  assert.equal(article.slug, stored.slug);
  assert.equal(article.coverImageAlt, stored.coverAlt);
  assert.ok(Array.isArray(article.keywords) && article.keywords.length > 0);
  assert.ok(Array.isArray(article.faq));
  assert.ok(article.relatedProjectSlug);
  assert.ok(article.canonicalUrl.endsWith(`/blog/${stored.slug}`));
  assert.equal(article.schemaJsonLd?.['@type'], 'Article');
  assert.ok(Array.isArray(article.socialRepurpose?.twitter?.thread));
  assert.ok(article.socialRepurpose?.facebook?.utmUrl);
  assert.ok(typeof article.author?.bio === 'string' && article.author.bio.length > 0);
});

test('Comitê final: rotas públicas profundas permanecem canônicas no React', () => {
  const app = source('src/App.tsx');
  assert.ok(app.includes('const dynamicPublicMatch = clean.match('));
  assert.ok(app.includes('dynamicPublicMatch[1]'));
  assert.ok(app.includes('canonicalPath: clean'));
  assert.ok(!app.includes("commitNavigation(initialRoute.tab, 'replace')"), 'A inicialização não pode reduzir /blog/:slug ou /vitrine/:slug para a rota raiz.');

  const blog = source('src/pages/BlogPortalPage.tsx');
  assert.ok(blog.includes('`/api/portal/blog/articles/${encodeURIComponent(slug)}`'));
  assert.match(blog, /import\.meta\.env\.DEV \? convertLocalArticles\(BLOG_ARTICLES\) : \[\]/);
  assert.ok(blog.includes("window.history.pushState({ tab: 'blog', slug: article.slug }"));
  assert.ok(!blog.includes('a.likes + (isLiked ? -1 : 1)'), 'Curtida local não pode alterar a métrica-base e depois somá-la novamente na renderização.');

  const vitrine = source('src/pages/VitrinePage.tsx');
  assert.ok(vitrine.includes("window.history.pushState({ tab: 'vitrine', slug: project.slug }"));
  assert.ok(!vitrine.includes('Todos os 7 sites e aplicativos'), 'A Vitrine não pode continuar limitada textualmente a sete projetos.');
  assert.ok(!vitrine.includes('garantia de resposta sem interrupções'), 'A interface não pode prometer disponibilidade absoluta sem telemetria que a comprove.');
});

test('Comitê final: SSR dinâmico, biblioteca de marca e execução administrativa usam contratos reais', () => {
  const publicPages = source('server/production/publicPages.ts');
  assert.match(publicPages, /getPortalProjectFromDb/);
  assert.match(publicPages, /INITIAL_SEEDED_ARTICLES/);
  assert.ok(!publicPages.includes('getProjectBySlug(slug)'), 'SSR da Vitrine não pode consultar somente o array inicial.');

  const types = source('src/types.ts');
  assert.match(types, /bannerUrl\?:string/);
  const adapter = source('src/lib/portalProjectAdapter.ts');
  assert.match(adapter, /bannerUrl: project\.bannerUrl/);
  assert.match(adapter, /dailyBlogEnabled: project\.dailyBlogEnabled !== false/);
  const displayTypes = source('src/data/portalProjects.ts');
  assert.match(displayTypes, /dailyBlogEnabled\?: boolean/);
  const library = source('src/pages/ContentsLibraryPage.tsx');
  assert.match(library, /Ativos de marca dos projetos/);
  assert.match(library, /project\.logoUrl/);
  assert.match(library, /project\.bannerUrl/);

  const router = source('server/production/router.ts');
  assert.match(router, /router\.post\('\/admin\/scheduler\/run-now'/);
  assert.match(router, /processSchedulerTick\(\{ trigger: 'authorized_api' \}\)/);
  assert.match(router, /portal-final-r5c-20260904/);
  assert.match(router, /!project \|\| project\.active === false/);

  const admin = source('src/pages/AdminPage.tsx');
  assert.match(admin, /Executar ciclo completo agora/);
  assert.match(admin, /\/api\/admin\/scheduler\/run-now/);
});


test('Comitê final: CI mantém quality gate e acrescenta smoke de produção pós-merge', () => {
  const ci = source('.github/workflows/ci.yml');
  assert.match(ci, /node-version: 22/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /smoke-production:/);
  assert.match(ci, /test\/productionSmoke\.mjs/);
  assert.match(ci, /EXPECTED_RELEASE: portal-final-r5c-20260904/);
});
