import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server/app.js';

test('Regressão de Rotas da API Portal Vip Brasil: Endpoints montados corretamente em /api', async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/portal/blog/articles NÃO deve retornar 404
    const resArticles = await fetch(`${baseUrl}/api/portal/blog/articles`);
    assert.notEqual(resArticles.status, 404, 'GET /api/portal/blog/articles não deve retornar 404');
    assert.equal(resArticles.status, 200, 'GET /api/portal/blog/articles deve retornar 200');
    const articlesData = await resArticles.json();
    assert.ok(Array.isArray(articlesData.articles), 'Deve retornar lista de artigos');

    // 2. GET /api/portal/projects NÃO deve retornar 404
    const resProjects = await fetch(`${baseUrl}/api/portal/projects`);
    assert.notEqual(resProjects.status, 404, 'GET /api/portal/projects não deve retornar 404');
    assert.equal(resProjects.status, 200, 'GET /api/portal/projects deve retornar 200');
    const projectsData = await resProjects.json();
    assert.ok(Array.isArray(projectsData.projects), 'Deve retornar lista de projetos');
    assert.ok(projectsData.brand, 'Deve retornar assets oficiais da marca');

    const resTracking = await fetch(`${baseUrl}/api/portal/blog/track`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId: 'public-test', metric: 'views' })
    });
    assert.equal(resTracking.status, 202, 'Tracking público deve ser aceito sem gravar no Firestore');
    const trackingData = await resTracking.json();
    assert.equal(trackingData.persisted, false, 'Tracking público deve permanecer best-effort');

    // 3. Configurações editoriais são administrativas e devem falhar fechadas sem autenticação
    const resSettings = await fetch(`${baseUrl}/api/portal/blog/settings`);
    assert.notEqual(resSettings.status, 404, 'GET /api/portal/blog/settings não deve retornar 404');
    assert.equal(resSettings.status, 401, 'GET /api/portal/blog/settings deve exigir autenticação');

    const protectedMutations = [
      ['/api/portal/daily-pulse', 'POST'],
      ['/api/portal/blog/settings', 'POST'],
      ['/api/portal/blog/generate-project-article', 'POST'],
      ['/api/portal/blog/daily-cycle', 'POST'],
      ['/api/portal/blog/articles/test/status', 'PATCH']
    ] as const;
    for (const [pathname, method] of protectedMutations) {
      const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(response.status, 401, `${method} ${pathname} deve exigir autenticação`);
    }

    // 4. GET /api/api/portal/projects DEVE retornar 404 (garantindo que rota duplicada não existe)
    const resDuplicate = await fetch(`${baseUrl}/api/api/portal/projects`);
    assert.equal(resDuplicate.status, 404, 'Rota incorreta /api/api/portal/projects deve retornar 404');

    // 5. GET /api/api/portal/blog/articles DEVE retornar 404
    const resDuplicateArticles = await fetch(`${baseUrl}/api/api/portal/blog/articles`);
    assert.equal(resDuplicateArticles.status, 404, 'Rota incorreta /api/api/portal/blog/articles deve retornar 404');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
