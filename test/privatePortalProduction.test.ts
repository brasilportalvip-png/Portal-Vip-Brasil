import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

function assertAbsent(file: string, forbidden: string[]) {
  const content = read(file);
  for (const value of forbidden) {
    assert.ok(!content.includes(value), `${file} não pode conter: ${value}`);
  }
}

test('Arquitetura privada: módulos comerciais foram removidos fisicamente', () => {
  const removed = [
    'server/production/credits.ts',
    'server/production/plans.ts',
    'server/production/payments.ts',
    'server/production/antiAbuse.ts',
    'shared/creditCosts.ts',
    'src/lib/creditCosts.ts'
  ];
  for (const file of removed) {
    assert.equal(existsSync(file), false, `arquivo comercial ainda existe: ${file}`);
  }

  assert.equal(existsSync('test/scheduler.test.ts'), true);
  assert.equal(existsSync('test/mediaGeneration.test.ts'), true);
});

test('Arquitetura privada: core não depende de créditos, planos, pagamentos ou companies legadas', () => {
  assertAbsent('server/config/index.ts', [
    'MERCADO_PAGO',
    'CREDIT_COSTS',
    'freeSignupBonusCredits',
    'creditCosts:',
    'mercadoPago:'
  ]);

  assertAbsent('server/production/router.ts', [
    'COLLECTIONS.companies',
    'getPlanEntitlements',
    'grant-credits',
    "router.get('/plans'",
    "router.get('/credits",
    "router.post('/payments"
  ]);

  assertAbsent('server/production/ai.ts', [
    'reserveCredits',
    'commitReservation',
    'rollbackReservation',
    './credits.js',
    'config.creditCosts'
  ]);

  assertAbsent('server/production/scheduler.ts', [
    'COLLECTIONS.companies',
    'getEffectiveWallet',
    'getPlanEntitlements',
    'cleanupStaleReservations',
    'config.creditCosts',
    'maxMonthlyCredits',
    'usedCreditsThisMonth',
    'credit_low'
  ]);

  assertAbsent('src/types.ts', [
    './lib/creditCosts',
    'CREDIT_COSTS',
    'CreditOperation'
  ]);
});

test('Produção: cron e SEO usam a configuração oficial', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(vercel.crons?.[0]?.path, '/api/cron/process');
  assert.equal(vercel.crons?.[0]?.schedule, '0 13 * * *');

  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');

  assert.ok(sitemap.includes('https://portal-vip-brasil.vercel.app/'));
  assert.ok(robots.includes('https://portal-vip-brasil.vercel.app/sitemap.xml'));

  for (const value of ['almax-34709', '/planos', ['portalvipbrasil', '.com.br'].join('')]) {
    assert.ok(!sitemap.includes(value), `sitemap contém referência antiga: ${value}`);
  }
  for (const value of ['almax-34709', 'Allow: /planos', ['portalvipbrasil', '.com.br'].join('')]) {
    assert.ok(!robots.includes(value), `robots contém referência antiga: ${value}`);
  }
});

test('Produção: menu privado não reintroduz entradas públicas/legadas', () => {
  assertAbsent('src/components/Sidebar.tsx', [
    "id: 'home'",
    "id: 'vitrine'",
    "id: 'froc-ia'",
    "id: 'calendario'",
    "id: 'analytics'",
    "id: 'suporte'"
  ]);
  assertAbsent('src/components/MobileDrawer.tsx', [
    "id: 'home'",
    "id: 'vitrine'",
    "id: 'froc-ia'",
    "id: 'calendario'",
    "id: 'analytics'",
    "id: 'suporte'"
  ]);
});

test('Produção: testes migrados usam o contrato de projeto privado', () => {
  const tenant = read('test/tenant.test.ts');
  assert.ok(tenant.includes('PORTAL_VIP_PROJECTS'));
  assert.ok(!tenant.includes('COLLECTIONS.companies'));

  const tiktok = read('test/tiktok.test.ts');
  assert.ok(tiktok.includes('não pertence a este projeto'));
});


test('Identidade pública e automação usam somente o domínio oficial', () => {
  const legacyDomain = ['portalvipbrasil', '.com.br'].join('');
  const officialDomain = 'portal-vip-brasil.vercel.app';
  const files = [
    'index.html',
    'server/production/almaPortfolio.ts',
    'server/production/blogEngine.ts',
    'src/data/blogArticles.ts',
    'src/data/portalProjects.ts',
    'src/lib/brand.ts',
    'src/pages/BlogPortalPage.tsx',
    'src/pages/LegalPage.tsx',
    'src/pages/VitrinePage.tsx'
  ];

  for (const file of files) {
    const content = read(file);
    assert.ok(!content.includes(legacyDomain), `${file} ainda contém domínio legado`);
  }

  assert.ok(read('server/production/almaPortfolio.ts').includes(officialDomain));
  assert.ok(read('server/production/blogEngine.ts').includes(officialDomain));
  assert.ok(read('src/data/portalProjects.ts').includes(officialDomain));
  assert.ok(read('index.html').includes(officialDomain));
});


test('Identidade central: automação e shell privado usam Portal Vip Brasil, preservando Froc.IA apenas como projeto', () => {
  const scheduler = read('server/production/scheduler.ts');
  const publicPages = read('server/production/publicPages.ts');

  for (const legacy of [
    '[Froc Autopilot]',
    'Froc Autopilot criou novo conteúdo',
    'Froc Autopilot executado',
    "'Froc Magazine'",
    "generatedBy: 'froc_auto_blog'"
  ]) {
    assert.ok(!scheduler.includes(legacy), `scheduler ainda contém identidade central legada: ${legacy}`);
  }

  assert.ok(scheduler.includes('[Portal Vip Automação]'));
  assert.ok(scheduler.includes('Automação do Portal Vip Brasil criou novo conteúdo'));
  assert.ok(scheduler.includes('Automação do Portal Vip Brasil executada'));
  assert.ok(scheduler.includes("'Portal Vip Brasil Magazine'"));
  assert.ok(scheduler.includes("generatedBy: 'portal_vip_auto_blog'"));

  assert.ok(!publicPages.includes('data-froc-path'));
  assert.ok(publicPages.includes('data-portal-path'));

  // Não proíbe Froc.IA como projeto oficial; este teste é deliberadamente específico
  // aos rótulos centrais acima.
});


test('Saneamento arquitetural final: Portal não reintroduz identidade central Froc, wallet ou créditos visíveis', () => {
  assertAbsent('server/production/ai.ts', ['Froc Magazine']);
  assertAbsent('server/production/auth.ts', ['[Froc Auth Security]', '[Froc Auth]', 'Usuário Froc']);
  assertAbsent('src/lib/firebase.ts', [
    '[Froc Firebase]',
    'setFrocAnalyticsConsent',
    'hasFrocAnalyticsConsent',
    "const ANALYTICS_CONSENT_KEY = 'froc.analytics.consent.v1'"
  ]);
  assertAbsent('src/pages/AdminPage.tsx', ['Froc Magazine']);
  assertAbsent('src/pages/CreateArticlePage.tsx', ['Froc Magazine']);
  assertAbsent('src/pages/SeoPage.tsx', ['Froc SEO Inteligente', 'Score SEO Froc.IA']);
  assertAbsent('src/pages/CreateVideoPage.tsx', ['Créditos utilizados:', 'créditos ficam reservados', 'créditos foram estornados']);
  assertAbsent('src/pages/ContentsLibraryPage.tsx', ['cr consumidos', 'organizado por empresa.']);
  assertAbsent('src/components/AuthModal.tsx', ['Wallet', 'data.wallet']);
  assertAbsent('src/pages/AlmaLivingCore.tsx', ['Wallet', 'wallet={wallet}', "case 'planos':", 'onRefreshWallet']);
  assertAbsent('src/pages/LandingPage.tsx', ['wallet={null}', 'onRefreshWallet']);

  const firebase = read('src/lib/firebase.ts');
  assert.ok(firebase.includes("portal_vip.analytics.consent.v1"));
  assert.ok(firebase.includes("LEGACY_ANALYTICS_CONSENT_KEY = 'froc.analytics.consent.v1'"));
  assert.ok(firebase.includes('setPortalAnalyticsConsent'));
  assert.ok(firebase.includes('getPortalAnalyticsConsent'));

  const banner = read('src/components/AnalyticsConsentBanner.tsx');
  assert.ok(banner.includes('Recusar métricas'));
  assert.ok(banner.includes('Permitir métricas'));

  const app = read('src/App.tsx');
  assert.ok(app.includes('AnalyticsConsentBanner'));
  assert.ok(!app.includes('wallet={wallet}'));
  assert.ok(!app.includes('refreshWallet'));

  const types = read('src/types.ts');
  assert.ok(!types.includes('export interface Wallet'));
  assert.ok(!types.includes('export interface CreditTransaction'));
  assert.ok(!types.includes('export interface Plan'));
  assert.ok(!types.includes('creditsReserved:'));
  assert.ok(!types.includes('creditsCommitted?:'));

  assert.equal(existsSync('public/og-froc.png'), false);
});
