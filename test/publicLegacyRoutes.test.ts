import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createApp } from '../server/app.js';

test('Produção: /alma público é 404 e APIs internas /api/alma permanecem fora deste bloqueio', async (t) => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  for (const path of ['/alma', '/alma/home', '/alma/agentes', '/alma/visao', '/alma/memoria']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, `${path} deve ser 404`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
    assert.match(await response.text(), /Página não encontrada/i);
  }

  const apiFallback = await fetch(base + '/api/plans');
  assert.equal(apiFallback.status, 404);
  const payload = await apiFallback.json() as any;
  assert.equal(payload.error, 'Endpoint Portal Vip Brasil não encontrado.');
});

test('Produção: Vercel encaminha /alma* ao backend antes do fallback SPA', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const routes = vercel.routes || [];
  const almaIndex = routes.findIndex((route: any) => route.src === '^/alma(?:/.*)?$' && route.dest === '/api/index.ts');
  const filesystemIndex = routes.findIndex((route: any) => route.handle === 'filesystem');

  assert.ok(almaIndex >= 0, 'vercel.json precisa interceptar /alma*');
  assert.ok(filesystemIndex >= 0, 'vercel.json precisa manter fallback filesystem');
  assert.ok(almaIndex < filesystemIndex, '/alma* deve ser tratado antes do fallback SPA');
});

test('Produção: identidade central não usa nome Froc no pacote ou erros genéricos da API', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const app = readFileSync('server/app.ts', 'utf8');
  const router = readFileSync('server/production/router.ts', 'utf8');

  assert.equal(pkg.name, 'portal-vip-brasil');
  assert.equal(lock.name, 'portal-vip-brasil');
  assert.equal(lock.packages?.['']?.name, 'portal-vip-brasil');

  assert.ok(!app.includes('Endpoint Froc.IA não encontrado.'));
  assert.ok(app.includes('Endpoint Portal Vip Brasil não encontrado.'));
  assert.ok(!app.includes('[Froc API Error]'));
  assert.ok(!router.includes("[Froc API]"));

  for (const publicLegacy of [
    "      '/alma',",
    "      '/alma/home',",
    "      '/alma/agentes',",
    "      '/alma/visao',",
    "      '/alma/memoria',"
  ]) {
    assert.ok(!app.includes(publicLegacy), `rota pública legada ainda registrada: ${publicLegacy}`);
  }

  assert.ok(router.includes("router.get('/alma/memories'") || router.includes("router.post('/alma/"));
});


test('Produção: aliases legados de empresa e comercial retornam 404 real + noindex', async (t) => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  for (const path of ['/empresa', '/company', '/companies', '/planos', '/creditos']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, `${path} deve ser 404`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
    assert.match(await response.text(), /Página não encontrada/i);
  }
});

test('Produção: Vercel intercepta aliases legados antes do fallback SPA', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const routes = vercel.routes || [];
  const legacyIndex = routes.findIndex((route: any) =>
    route.src === '^/(?:empresa|company|companies|planos|creditos)/?$' &&
    route.dest === '/api/index.ts'
  );
  const filesystemIndex = routes.findIndex((route: any) => route.handle === 'filesystem');

  assert.ok(legacyIndex >= 0, 'vercel.json precisa interceptar aliases legados');
  assert.ok(filesystemIndex >= 0, 'vercel.json precisa manter fallback filesystem');
  assert.ok(legacyIndex < filesystemIndex, 'aliases legados devem ser tratados antes do fallback SPA');
});

test('Frontend: aliases legados não são mais canonicalizados para projetos/dashboard', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');

  for (const alias of ['empresa', 'company', 'companies', 'planos', 'creditos']) {
    const aliasPattern = new RegExp(`\\b${alias}\\s*:\\s*['"](?:projetos|dashboard)['"]`);
    assert.equal(aliasPattern.test(appSource), false, `alias ${alias} ainda está ativo no frontend`);
  }
});
