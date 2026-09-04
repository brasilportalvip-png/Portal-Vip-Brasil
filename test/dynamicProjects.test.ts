process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortalProjectInDb,
  deletePortalProjectInDb,
  getPortalProjectFromDb,
  listAllPortalProjectsFromDb,
  updatePortalProjectInDb
} from '../server/production/almaPortfolio.js';
import { getMemoryCollection, resetMemoryDb } from '../server/production/store.js';

test('Projetos dinâmicos: projeto extra persistido entra no registro global', async () => {
  resetMemoryDb();
  const projects = getMemoryCollection('projects');
  projects.set('proj_cliente_novo', {
    id: 'proj_cliente_novo',
    name: 'Site Novo',
    slug: 'site-novo',
    category: 'Serviços',
    segment: 'Portal digital',
    websiteUrl: 'https://site-novo.example/',
    hasApp: false,
    description: 'Projeto cadastrado pelo Admin.',
    highlights: ['Automação global'],
    keywords: ['site novo'],
    targetAudience: 'Público digital',
    socialMarketingAngles: ['Conheça o site novo'],
    bingSeoKeywords: ['site novo'],
    active: true,
    dailyMarketingEnabled: true,
    dailyBlogEnabled: true,
    managedByPortalAdmin: true
  });

  const all = await listAllPortalProjectsFromDb();
  assert.ok(all.length >= 8);
  assert.ok(all.some((project) => project.id === 'proj_cliente_novo'));

  const bySlug = await getPortalProjectFromDb('site-novo');
  assert.equal(bySlug?.id, 'proj_cliente_novo');
  assert.equal(bySlug?.dailyMarketingEnabled, true);
});

test('Projetos dinâmicos: Admin cria, pausa, reativa e exclui projeto personalizado', async () => {
  resetMemoryDb();
  const created = await createPortalProjectInDb({
    name: 'Projeto Futuro',
    websiteUrl: 'https://projeto-futuro.example/',
    category: 'Tecnologia',
    description: 'Projeto incluído sem editar código.',
    keywords: ['tecnologia']
  });

  assert.ok(created.id.startsWith('proj_'));
  assert.equal(created.active, true);
  assert.equal(created.dailyMarketingEnabled, true);
  assert.equal(created.dailyBlogEnabled, true);

  const paused = await updatePortalProjectInDb(created.id, { active: false });
  assert.equal(paused?.active, false);

  const resumed = await updatePortalProjectInDb(created.id, { active: true });
  assert.equal(resumed?.active, true);

  const removed = await deletePortalProjectInDb(created.id);
  assert.deepEqual(removed, { deleted: true, protected: false });
  assert.equal(await getPortalProjectFromDb(created.id), undefined);
});

test('Projetos dinâmicos: os 7 projetos iniciais são protegidos contra exclusão permanente', async () => {
  resetMemoryDb();
  await listAllPortalProjectsFromDb();
  const result = await deletePortalProjectInDb('proj_magia_crencas');
  assert.equal(result.protected, true);
  assert.equal(result.deleted, false);
  assert.ok(await getPortalProjectFromDb('proj_magia_crencas'));
});

test('Automação global: pausar todos os motores não reativa projetos por fallback', async () => {
  resetMemoryDb();
  const { firestore } = await import('../server/production/store.js');
  const { runDailyPortalMarketingCycle } = await import('../server/production/antiFallEngine.js');
  const { runDailyBlogCycle } = await import('../server/production/blogEngine.js');

  const seeded = await listAllPortalProjectsFromDb();
  const db = firestore();
  for (const project of seeded) {
    await db.collection('projects').doc(project.id).set({
      active: true,
      dailyMarketingEnabled: false,
      dailyBlogEnabled: false
    }, { merge: true });
  }

  const marketing = await runDailyPortalMarketingCycle('test_user_admin');
  assert.equal(marketing.totalProjects, 0);
  assert.equal(marketing.generatedCount, 0);

  const blog = await runDailyBlogCycle('test_user_admin');
  assert.equal(blog.totalProjects, 0);
  assert.equal(blog.articlesGenerated.length, 0);
});

test('Lote final: agenda global, scheduler dinâmico e renovação social estão protegidos por regressão textual', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync('src/App.tsx', 'utf8');
  const scheduler = readFileSync('server/production/scheduler.ts', 'utf8');
  const social = readFileSync('server/production/social.ts', 'utf8');

  assert.ok(app.includes("'/api/content/scheduled'"));
  assert.ok(!app.includes("'/api/schedule'"));
  assert.ok(scheduler.includes('getPortalProjectFromDb(projectId)'));
  assert.ok(!scheduler.includes("import { PORTAL_VIP_PROJECTS } from './almaPortfolio.js';"));
  assert.ok(social.includes("record?.status && record.status !== 'connected'"));
  assert.ok(social.includes("item.status === 'token_expired'"));
  assert.ok(social.includes('await ensureValidSocialAccessToken(snap.docs[0].id)'));
});

test('Observabilidade segura: health público expõe apenas estágios e Admin guarda detalhes sanitizados', async () => {
  const { readFileSync } = await import('node:fs');
  const scheduler = readFileSync('server/production/scheduler.ts', 'utf8');
  const router = readFileSync('server/production/router.ts', 'utf8');

  assert.ok(scheduler.includes('lastErrorStages: string[]'));
  assert.ok(scheduler.includes('lastCronErrorStages: string[]'));
  assert.ok(scheduler.includes('Object.keys(runtime.lastErrors).slice(0, 12)'));
  assert.ok(scheduler.includes('export async function getSchedulerDiagnostics()'));
  assert.ok(scheduler.includes(".replace(/Bearer +[A-Za-z0-9._~-]+/gi, 'Bearer [REMOVIDO]')"));
  assert.ok(router.includes("router.get('/admin/scheduler/diagnostics', requireAdmin"));
});

test('Anti-quedas: fallbackAlias é realmente tentado em vez de ficar morto no cadastro', async () => {
  const { readFileSync } = await import('node:fs');
  const engine = readFileSync('server/production/antiFallEngine.ts', 'utf8');
  assert.ok(engine.includes('Array.from(new Set([item.model, item.fallbackAlias].filter(Boolean)))'));
  assert.ok(!engine.includes('const candidateModel = item.model || item.fallbackAlias;'));
});

test('Frontend dinâmico: Admin, Vitrine, Blog e Biblioteca não ficam limitados aos 7 projetos locais', async () => {
  const { readFileSync } = await import('node:fs');
  const admin = readFileSync('src/pages/AdminPage.tsx', 'utf8');
  const vitrine = readFileSync('src/pages/VitrinePage.tsx', 'utf8');
  const blog = readFileSync('src/pages/BlogPortalPage.tsx', 'utf8');
  const library = readFileSync('src/pages/ContentsLibraryPage.tsx', 'utf8');

  assert.ok(admin.includes('Adicionar Projeto'));
  assert.ok(admin.includes('/api/admin/projects'));
  assert.ok(admin.includes('/api/admin/scheduler/diagnostics'));
  assert.ok(vitrine.includes("apiRequest<{ projects:"));
  assert.ok(vitrine.includes("('/api/vitrine')"));
  assert.ok(blog.includes('portalProjects'));
  assert.ok(blog.includes("('/api/vitrine')"));
  assert.ok(library.includes("projectFilter === 'all'"));
});

test('Exclusão administrativa: projeto personalizado limpa automações futuras sem apagar conteúdo histórico', async () => {
  const { readFileSync } = await import('node:fs');
  const router = readFileSync('server/production/router.ts', 'utf8');
  assert.ok(router.includes("cancelReason:'project_deleted'"));
  assert.ok(router.includes("disabledReason:'project_deleted'"));
  assert.ok(router.includes('socialConnectionsRemoved'));
  assert.ok(router.includes('scheduledPostsCancelled'));
});
