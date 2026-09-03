import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

test('Produção final: cron não usa usuário sintético e marketing diário é idempotente por projeto/data', () => {
  const engine = read('server/production/antiFallEngine.ts');
  assert.ok(!engine.includes('portal_vip_admin'));
  assert.ok(engine.includes('getUserByEmail(ownerEmail)'));
  assert.ok(engine.includes('COLLECTIONS.idempotency'));
  assert.ok(engine.includes('portal-daily-marketing:'));
  assert.ok(engine.includes('daily-content-'));
  assert.ok(engine.includes('daily-sched-'));
});

test('Produção final: fallback da IA respeita o projeto atual e não fixa Magia das Crenças', () => {
  const engine = read('server/production/antiFallEngine.ts');
  assert.ok(engine.includes('fallbackProject?: PortalProjectItem'));
  assert.ok(engine.includes('fallbackProject: project'));
  assert.ok(!engine.includes('PORTAL_VIP_PROJECTS[0]'));
});

test('Produção final: agendamento textual direto exclui Instagram/TikTok/YouTube/Pinterest', () => {
  const engine = read('server/production/antiFallEngine.ts');
  assert.ok(engine.includes('isTextAutoPublishSupported'));
  assert.ok(engine.includes("provider === 'facebook'"));
  assert.ok(engine.includes("provider === 'linkedin'"));
  assert.ok(engine.includes("provider === 'x'"));
  assert.ok(!engine.includes("platforms: ['facebook', 'instagram', 'linkedin', 'x']"));
});

test('Produção final: blog diário usa claim por projeto/data e gravação Firestore não pode virar sucesso falso', () => {
  const blog = read('server/production/blogEngine.ts');
  assert.ok(blog.includes('portal-daily-blog:'));
  assert.ok(blog.includes('COLLECTIONS.idempotency'));
  assert.ok(blog.includes('articleId: deterministicArticleId'));
  assert.ok(blog.includes("throw new Error('Falha ao persistir o artigo diário no Firestore.')"));
});

test('Produção final: só existe um pipeline automático de blog no scheduler', () => {
  const scheduler = read('server/production/scheduler.ts');
  assert.ok(!scheduler.includes('autoBlog = await processAutoBlog()'));
  assert.ok(scheduler.includes('runDailyBlogCycle()'));
  assert.ok(scheduler.includes('scheduledPostsAfterGeneration'));
});

test('Produção final: SEO de artigo consulta blogArticles e legado blogPosts', () => {
  const publicPages = read('server/production/publicPages.ts');
  assert.ok(publicPages.includes('COLLECTIONS.blogArticles'));
  assert.ok(publicPages.includes('COLLECTIONS.blogPosts'));
  assert.ok(publicPages.includes('articleSnap'));
});

test('Produção final: IndexNow é requisição real e chave não fica hardcoded', () => {
  const env = read('.env.example');
  const config = read('server/config/index.ts');
  const app = read('server/app.ts');
  const vercel = read('vercel.json');
  const blog = read('server/production/blogEngine.ts');
  assert.ok(env.includes('INDEXNOW_KEY='));
  assert.ok(config.includes('indexNowKey'));
  assert.ok(app.includes("/indexnow-key.txt"));
  assert.ok(app.includes('config.indexNowKey'));
  assert.ok(vercel.includes('indexnow-key'));
  assert.ok(blog.includes('https://api.indexnow.org/indexnow'));
  assert.ok(blog.includes("method: 'POST'"));
  assert.ok(blog.includes('await notifyIndexNow([articlePublicUrl])'));
  assert.ok(!blog.includes('portalvipbrasil_indexnow_key_2026'));
});

test('Produção final: PWA não tenta mais cachear asset removido e favicon existente é usado', () => {
  assert.ok(!read('public/sw.js').includes('/og-froc.png'));
  const html = read('index.html');
  assert.ok(html.includes('/icons/icon-192.png'));
  assert.ok(!html.includes('/favicon.svg'));
  assert.ok(!html.includes('BING_WEBMASTER_VERIFICATION_PORTALVIP'));
});

test('Produção final: Blog público não inventa métricas e não declara 24/7 sem telemetria', () => {
  const blogPage = read('src/pages/BlogPortalPage.tsx');
  assert.ok(blogPage.includes('views: 0'));
  assert.ok(blogPage.includes('likes: 0'));
  assert.ok(blogPage.includes('shares: 0'));
  assert.ok(!blogPage.includes('ATIVO 24/7'));
  assert.ok(!blogPage.includes('IndexNow gerado com sucesso'));
});

test('Produção final: Dashboard exibe saúde real do Firestore e telemetria do cron', () => {
  const dashboard = read('src/pages/DashboardPage.tsx');
  assert.ok(dashboard.includes("apiRequest<any>('/api/health')"));
  assert.ok(dashboard.includes('Saúde operacional'));
  assert.ok(dashboard.includes('Firestore'));
  assert.ok(dashboard.includes('Cron Vercel'));
  assert.ok(dashboard.includes('Último ciclo'));
  assert.ok(dashboard.includes('Pendências / falhas'));
  assert.ok(!dashboard.includes('7 Projetos Ativos'));
});
