import assert from 'node:assert/strict';

const base = String(process.env.PRODUCTION_URL || 'https://portal-vip-brasil.vercel.app').replace(/\/$/, '');
const expectedRelease = String(process.env.EXPECTED_RELEASE || 'portal-final-r5c-20260904').trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20_000);
  try {
    return await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      body: options.body,
      redirect: 'follow',
      headers: { 'User-Agent': 'PortalVipBrasil-Production-Smoke/2.0', ...(options.headers || {}) },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function json(path) {
  const response = await request(path);
  const body = await response.text();
  assert.equal(response.status, 200, `${path} respondeu HTTP ${response.status}: ${body.slice(0, 300)}`);
  try { return JSON.parse(body); }
  catch { throw new Error(`${path} não retornou JSON válido: ${body.slice(0, 300)}`); }
}

function assertHeader(response, name, matcher, message) {
  const value = response.headers.get(name) || '';
  assert.match(value, matcher, message || `Header ${name} inválido ou ausente: ${value}`);
}

async function waitForExpectedDeployment() {
  let latest = null;
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    try {
      latest = await json('/api/health');
      const deployedRelease = String(latest?.deployment?.release || '');
      console.log(`[smoke] tentativa ${attempt}/36 — release=${deployedRelease || 'anterior'} esperado=${expectedRelease}`);
      if (deployedRelease === expectedRelease) return latest;
    } catch (error) {
      console.log(`[smoke] tentativa ${attempt}/36 ainda não pronta: ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(10_000);
  }
  throw new Error(`O deploy de produção não apresentou a release esperada ${expectedRelease} dentro da janela de validação.`);
}

console.log(`[smoke] Portal Vip Brasil: ${base}`);
const health = await waitForExpectedDeployment();

assert.equal(health?.database?.status, 'healthy', 'Firestore de produção deve estar healthy.');
assert.equal(health?.automation?.cronSecretConfigured, true, 'CRON_SECRET deve estar configurado.');
assert.equal(health?.automation?.nativeCronConfigured, true, 'Cron nativo Vercel deve estar configurado.');
assert.equal(health?.automation?.scheduleUtc, '0 13 * * *', 'Agenda oficial do cron mudou inesperadamente.');
assert.equal(health?.automation?.timezone, 'America/Sao_Paulo');

const healthResponse = await request('/api/health');
assert.equal(healthResponse.status, 200, '/api/health não respondeu 200.');
assertHeader(healthResponse, 'cache-control', /no-store/i, 'API deve permanecer sem cache em produção.');

const root = await request('/');
assert.equal(root.status, 200, 'Home pública não respondeu 200.');
assertHeader(root, 'content-security-policy', /default-src 'self'/i, 'CSP de produção ausente.');
assertHeader(root, 'strict-transport-security', /max-age=/i, 'HSTS de produção ausente.');
assertHeader(root, 'x-content-type-options', /nosniff/i, 'X-Content-Type-Options ausente.');
assertHeader(root, 'x-frame-options', /deny/i, 'Proteção contra framing ausente.');
assertHeader(root, 'referrer-policy', /strict-origin-when-cross-origin/i, 'Referrer-Policy inesperada.');
assert.match(await root.text(), /Portal Vip Brasil/i);

const unauthAdmin = await request('/api/admin/scheduler/run-now', { method: 'POST' });
assert.ok([401, 403].includes(unauthAdmin.status), `Endpoint administrativo sem token respondeu ${unauthAdmin.status}; esperado 401/403.`);

for (const blockedPath of ['/alma', '/creditos']) {
  const blocked = await request(blockedPath);
  assert.equal(blocked.status, 404, `${blockedPath} deve responder 404 real.`);
  assertHeader(blocked, 'x-robots-tag', /noindex/i, `${blockedPath} deve permanecer noindex.`);
}

const projectsPayload = await json('/api/portal/projects');
assert.ok(Array.isArray(projectsPayload.projects) && projectsPayload.projects.length > 0, 'API pública de projetos está vazia.');
const activeProject = projectsPayload.projects.find((project) => project?.slug) || projectsPayload.projects[0];
assert.ok(activeProject?.slug, 'Nenhum projeto ativo possui slug válido.');

const vitrinePayload = await json('/api/vitrine');
assert.ok(Array.isArray(vitrinePayload.projects), 'Vitrine não retornou projects.');
assert.ok(vitrinePayload.projects.some((project) => project.id === activeProject.id), 'Projeto ativo não apareceu na Vitrine dinâmica.');

const projectPath = `/vitrine/${encodeURIComponent(activeProject.slug)}`;
const projectPage = await request(projectPath);
assert.equal(projectPage.status, 200, `Página individual ${projectPath} não respondeu 200.`);
const projectHtml = await projectPage.text();
assert.match(projectHtml, new RegExp(projectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(projectHtml, /rel="canonical"/i);
assert.match(projectHtml, /application\/ld\+json/i);

const blogPayload = await json('/api/portal/blog/articles?limit=1');
assert.ok(Array.isArray(blogPayload.articles), 'Blog não retornou articles.');
if (blogPayload.articles.length > 0) {
  const article = blogPayload.articles[0];
  assert.ok(article.slug, 'Artigo retornado sem slug.');
  assert.ok(Array.isArray(article.keywords), 'Contrato público do Blog não retornou keywords.');
  assert.ok(Array.isArray(article.faq), 'Contrato público do Blog não retornou faq.');
  assert.ok(article.coverImageAlt, 'Contrato público do Blog não retornou coverImageAlt.');
  assert.ok(article.relatedProjectSlug, 'Contrato público do Blog não retornou relatedProjectSlug.');
  assert.equal(article.schemaJsonLd?.['@type'], 'Article', 'Contrato público do Blog não retornou Schema Article.');
  assert.ok(Array.isArray(article.socialRepurpose?.twitter?.thread), 'Contrato público do Blog não retornou pacote social do X.');

  const articlePath = `/blog/${encodeURIComponent(article.slug)}`;
  const articlePage = await request(articlePath);
  assert.equal(articlePage.status, 200, `Página individual ${articlePath} não respondeu 200.`);
  const articleHtml = await articlePage.text();
  assert.match(articleHtml, new RegExp(articlePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(articleHtml, /og:type" content="article"/i);
}

const sitemap = await request('/sitemap.xml');
assert.equal(sitemap.status, 200, 'sitemap.xml não respondeu 200.');
const sitemapXml = await sitemap.text();
assert.match(sitemapXml, /<urlset/i);
assert.ok(sitemapXml.includes(projectPath), 'sitemap.xml não contém a página individual do projeto ativo.');

const robots = await request('/robots.txt');
assert.equal(robots.status, 200, 'robots.txt não respondeu 200.');
const robotsTxt = await robots.text();
assert.match(robotsTxt, /Sitemap:/i);
assert.match(robotsTxt, /Disallow: \/admin/i);

const manifest = await json('/manifest.webmanifest');
assert.equal(manifest.name, 'Portal Vip Brasil');
assert.equal(manifest.scope, '/');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest PWA sem ícones esperados.');

const serviceWorker = await request('/sw.js');
assert.equal(serviceWorker.status, 200, 'Service Worker não respondeu 200.');
assertHeader(serviceWorker, 'service-worker-allowed', /^\/$/, 'Service-Worker-Allowed deve ser /.');
assertHeader(serviceWorker, 'cache-control', /no-cache|no-store/i, 'Service Worker não pode ficar preso em cache longo.');

const indexNow = await request('/indexnow-key.txt');
assert.equal(indexNow.status, 200, 'indexnow-key.txt não respondeu 200.');
assert.match((await indexNow.text()).trim(), /^[A-Za-z0-9-]{8,128}$/);

console.log(
  `[smoke] OK — ${projectsPayload.projects.length} projeto(s), Firestore/cron, auth boundary, headers, rotas, SEO/PWA/IndexNow verificados.`
);
