import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import * as firebaseAdminProvider from '../server/providers/firebaseAdmin.js';
import { firestore, resetMemoryDb, COLLECTIONS } from '../server/production/store.js';
import { createApp } from '../server/app.js';
import { renderPublicPage } from '../server/production/publicPages.js';

// Em produção o app entrega estas páginas via renderPublicPage (SSR de SEO).
const ssrPage = async (path: string) => { const p = await renderPublicPage(path); return { status: p.status, text: p.html }; };

/**
 * Comitê ponta a ponta: o servidor real (createApp) responde por HTTP a um
 * visitante anônimo, a um usuário comum e ao administrador, como no navegador.
 */
const TOKENS: Record<string, any> = {
  'tok-admin': { uid: 'e2e_admin', email: 'admin-e2e@example.com', email_verified: true, role: 'admin', frocRole: 'admin' },
  'tok-user': { uid: 'e2e_user', email: 'user-e2e@example.com', email_verified: true }
};

async function startServer() {
  firebaseAdminProvider.setAdminAuthForTesting({
    verifyIdToken: async (token: string) => {
      if (TOKENS[token]) return { ...TOKENS[token] };
      const err: any = new Error('invalid'); err.code = 'auth/argument-error'; throw err;
    },
    getUser: async (uid: string) => ({ uid, customClaims: {} }),
    setCustomUserClaims: async () => undefined
  } as any);
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let ip = 0;
  const call = async (method: string, path: string, opts: { token?: string; body?: any } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': `10.9.${Math.floor(ip / 250)}.${(ip++ % 250) + 1}` };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), redirect: 'manual' });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* html/xml */ }
    return { status: res.status, text, json, headers: res.headers };
  };
  return { server, call };
}

test('E2E: visitante, usuário e administrador percorrem o Portal de ponta a ponta', async (t) => {
  resetMemoryDb();
  const { server, call } = await startServer();
  t.after(() => { server.close(); firebaseAdminProvider.setAdminAuthForTesting(undefined); });

  // ---------------- Visitante anônimo ----------------
  const health = await call('GET', '/api/health');
  assert.equal(health.status, 200, health.text);

  const projects = await call('GET', '/api/portal/projects');
  assert.equal(projects.status, 200, projects.text);
  assert.ok(projects.json.projects.length >= 7, 'Vitrine deve ter os projetos oficiais');
  const firstSlug = projects.json.projects[0].slug;
  assert.equal((await call('GET', `/api/portal/projects/${firstSlug}`)).status, 200);
  assert.equal((await call('GET', '/api/portal/projects/nao-existe-xyz')).status, 404);

  const articles = await call('GET', '/api/portal/blog/articles');
  assert.equal(articles.status, 200, articles.text);
  const list = articles.json.articles || articles.json.items || [];
  assert.ok(list.length > 0, 'Blog público deve listar artigos publicados');
  const covers = list.map((a: any) => a.coverImage || a.imageUrl).filter(Boolean);
  assert.equal(new Set(covers).size, covers.length, 'Capas do blog não podem se repetir');
  const art = await call('GET', `/api/portal/blog/articles/${list[0].slug}`);
  assert.equal(art.status, 200, art.text);

  for (const p of ['/', '/blog', '/vitrine', `/vitrine/${firstSlug}`, `/blog/${list[0].slug}`, '/termos', '/privacidade', '/cookies', '/exclusao-de-dados']) {
    const page = await ssrPage(p);
    assert.equal(page.status, 200, `${p} -> ${page.status}`);
    assert.match(page.text, /<title>[^<]+<\/title>/, `${p} sem <title>`);
    assert.doesNotMatch(page.text, /twitter:|pinterest\.com|x\.com\//i, `${p} ainda cita X/Pinterest`);
  }
  const sitemap = await call('GET', '/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.text, /<urlset/);
  assert.match(sitemap.text, new RegExp(`/vitrine/${firstSlug}`));
  const robots = await call('GET', '/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.text, /Sitemap:/i);

  // Áreas privadas fechadas para visitante.
  for (const [m, p] of [['GET', '/api/content'], ['GET', '/api/admin/overview'], ['GET', '/api/admin/media-audit'], ['POST', '/api/admin/projects'], ['GET', '/api/push/status'], ['GET', '/api/autopilot/config?companyId=x']]) {
    assert.equal((await call(m, p, m === 'POST' ? { body: {} } : {})).status, 401, `${m} ${p} aberto sem login`);
  }
  for (const p of ['/api/cron/social-publications', '/api/cron/process', '/api/cron/blog-covers', '/api/cron/video-retries']) {
    assert.equal((await call('POST', p, { body: {} })).status, 401, `${p} aceitou sem CRON_SECRET`);
  }
  assert.equal((await call('GET', '/api/content', { token: 'forjado' })).status, 401);
  const track = await call('POST', '/api/portal/blog/track', { body: { articleId: list[0].id, metric: 'views' } });
  assert.equal(track.status, 202);
  assert.equal((await call('POST', '/api/portal/blog/track', { body: { articleId: 'x', metric: 'hack' } })).status, 400);

  // ---------------- Usuário comum ----------------
  const need = await call('GET', '/api/content', { token: 'tok-user' });
  assert.equal(need.status, 428, 'Sem aceite de termos deve pedir consentimento');
  assert.equal((await call('POST', '/api/auth/accept-terms', { token: 'tok-user', body: { termsAccepted: true } })).status, 400);
  assert.equal((await call('POST', '/api/auth/accept-terms', { token: 'tok-user', body: { termsAccepted: true, privacyAccepted: true } })).status, 200);
  const me = await call('GET', '/api/auth/me', { token: 'tok-user' });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.role, 'user');
  for (const [m, p] of [['GET', '/api/admin/overview'], ['GET', '/api/admin/media-audit'], ['POST', '/api/admin/projects'], ['PATCH', '/api/portal/projects/x'], ['POST', '/api/portal/blog/covers/regenerate']]) {
    assert.equal((await call(m, p, { token: 'tok-user', body: m === 'GET' ? undefined : {} })).status, 403, `${m} ${p} liberado para usuário comum`);
  }

  // ---------------- Administrador ----------------
  assert.equal((await call('POST', '/api/auth/accept-terms', { token: 'tok-admin', body: { termsAccepted: true, privacyAccepted: true } })).status, 200);
  const adminMe = await call('GET', '/api/auth/me', { token: 'tok-admin' });
  assert.equal(adminMe.json.user.role, 'admin');

  const overview = await call('GET', '/api/admin/overview', { token: 'tok-admin' });
  assert.equal(overview.status, 200, overview.text);

  const created = await call('POST', '/api/admin/projects', { token: 'tok-admin', body: { name: 'Projeto E2E Comitê', websiteUrl: 'https://example.com/e2e', category: 'Teste', description: 'Projeto criado pelo comitê ponta a ponta para validar o painel do administrador.' } });
  assert.equal(created.status, 201, created.text);
  const proj = created.json.project;
  const pub = await call('GET', '/api/portal/projects');
  assert.ok(pub.json.projects.some((p: any) => p.id === proj.id), 'Projeto novo deve aparecer na Vitrine');
  const ssr = await ssrPage(`/vitrine/${proj.slug}`);
  assert.equal(ssr.status, 200);
  assert.match(ssr.text, /Projeto E2E Comitê/);

  const paused = await call('PATCH', `/api/admin/projects/${proj.id}`, { token: 'tok-admin', body: { active: false } });
  assert.equal(paused.status, 200, paused.text);
  assert.equal((await call('GET', `/api/portal/projects/${proj.slug}`)).status, 404, 'Projeto pausado não pode ficar público');
  assert.equal((await call('PATCH', `/api/admin/projects/${proj.id}`, { token: 'tok-admin', body: { active: true } })).status, 200);

  const companies = await call('GET', '/api/companies', { token: 'tok-admin' });
  assert.equal(companies.status, 200);
  const companyId = proj.id;
  assert.ok(companies.json.projects.some((p: any) => p.id === companyId));

  // Conteúdo
  assert.equal((await call('POST', '/api/content', { token: 'tok-admin', body: { title: '' } })).status, 400);
  const content = await call('POST', '/api/content', { token: 'tok-admin', body: { title: 'Post E2E', body: 'Texto do post E2E', companyId, imageUrl: 'https://example.com/a.jpg' } });
  assert.equal(content.status, 201, content.text);
  const contentId = content.json.item.id;
  const listC = await call('GET', `/api/content?companyId=${companyId}`, { token: 'tok-admin' });
  assert.ok(listC.json.items.some((i: any) => i.id === contentId));
  // Usuário comum não enxerga conteúdo do admin.
  const otherList = await call('GET', '/api/content', { token: 'tok-user' });
  assert.ok(!otherList.json.items.some((i: any) => i.id === contentId), 'Vazamento de conteúdo entre usuários');

  // Agendamento: X/Pinterest retirados, Kwai exige vídeo.
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const xs = await call('POST', '/api/content/schedule', { token: 'tok-admin', body: { contentItemId: contentId, scheduledFor: future, companyId, platforms: ['x'] } });
  assert.equal(xs.status, 400);
  const kwaiNoVideo = await call('POST', '/api/content/schedule', { token: 'tok-admin', body: { contentItemId: contentId, scheduledFor: future, companyId, platforms: ['kwai'] } });
  assert.equal(kwaiNoVideo.status, 400);
  assert.match(kwaiNoVideo.json.error, /Kwai/);
  const videoId = 'content_e2e_video';
  await firestore().collection(COLLECTIONS.contentItems).doc(videoId).set({ id: videoId, userId: 'e2e_admin', companyId, type: 'video', title: 'Vídeo E2E', body: 'Roteiro', videoUrl: 'https://example.com/v.mp4', status: 'saved', createdAt: new Date().toISOString() });
  const kwai = await call('POST', '/api/content/schedule', { token: 'tok-admin', body: { contentItemId: videoId, scheduledFor: future, companyId, platforms: ['kwai'] } });
  assert.equal(kwai.status, 201, kwai.text);
  assert.equal(kwai.json.scheduled.status, 'planned');
  const reminders = await firestore().collection('kwaiReminders').get();
  assert.equal(reminders.size, 1, 'Agendar no Kwai deve criar um aviso para o celular');
  const plan = await call('POST', '/api/content/schedule', { token: 'tok-admin', body: { contentItemId: contentId, scheduledFor: future, companyId, platforms: ['instagram'], isPlanning: true } });
  assert.equal(plan.status, 201, plan.text);
  const sched = await call('GET', '/api/content/scheduled', { token: 'tok-admin' });
  assert.equal(sched.status, 200);
  const cancel = await call('POST', `/api/content/scheduled/${plan.json.scheduled.id}/cancel`, { token: 'tok-admin', body: {} });
  assert.equal(cancel.status, 200, cancel.text);
  // Usuário comum não agenda em projeto alheio? (projetos do portal são compartilhados pelo dono; usuário não pode usar conteúdo do admin)
  const steal = await call('POST', '/api/content/schedule', { token: 'tok-user', body: { contentItemId: contentId, scheduledFor: future, companyId, platforms: ['instagram'], isPlanning: true } });
  assert.ok([403, 404].includes(steal.status), `Usuário agendou conteúdo alheio: ${steal.status}`);

  // Autopilot com Kwai
  const apGet = await call('GET', `/api/autopilot/config?companyId=${companyId}`, { token: 'tok-admin' });
  assert.equal(apGet.status, 200, apGet.text);
  assert.ok(apGet.json.config.targetPlatforms.some((p: string) => /kwai/i.test(p)), 'Kwai deve estar nos canais padrão do Autopilot');
  assert.ok(!apGet.json.config.targetPlatforms.some((p: string) => /^(x|twitter|pinterest)$/i.test(p)));
  const apSave = await call('POST', '/api/autopilot/config', { token: 'tok-admin', body: { companyId, enabled: true, mode: 'automatic', targetPlatforms: ['Kwai'], preferredHours: [9, 99], preferredDays: [1, 9] } });
  assert.equal(apSave.status, 200, apSave.text);
  assert.equal(apSave.json.warning, null, 'Kwai sozinho não pode gerar aviso de “sem login”');
  assert.deepEqual(apSave.json.config.preferredHours, [9]);
  assert.deepEqual(apSave.json.config.preferredDays, [1]);

  // Campanhas: criar, editar, data inválida, outro usuário e excluir
  const camp = await call('POST', '/api/campaigns', { token: 'tok-admin', body: { name: 'Campanha E2E', companyId, targetPlatforms: ['Instagram', 'Kwai'] } });
  assert.equal(camp.status, 201, camp.text);
  const campId = camp.json.campaign.id;
  const badDate = await call('POST', '/api/campaigns', { token: 'tok-admin', body: { name: 'Data ruim', companyId, startDate: 'amanhã' } });
  assert.equal(badDate.status, 400, `Data inválida deve dar 400, veio ${badDate.status}`);
  const badPatch = await call('PATCH', `/api/campaigns/${campId}`, { token: 'tok-admin', body: { endDate: 'nunca' } });
  assert.equal(badPatch.status, 400, `Data inválida na edição deve dar 400, veio ${badPatch.status}`);
  const okPatch = await call('PATCH', `/api/campaigns/${campId}`, { token: 'tok-admin', body: { status: 'active' } });
  assert.equal(okPatch.json.campaign.status, 'active');
  assert.equal((await call('PATCH', `/api/campaigns/${campId}`, { token: 'tok-user', body: { status: 'paused' } })).status, 404);
  const cal = await call('GET', `/api/content/calendar?companyId=${companyId}`, { token: 'tok-admin' });
  assert.equal(cal.status, 200);
  assert.ok(cal.json.scheduled.length >= 1);
  assert.equal((await call('DELETE', `/api/campaigns/${campId}`, { token: 'tok-admin' })).status, 200);

  // Redes sociais e push
  const conns = await call('GET', `/api/social/connections/${companyId}`, { token: 'tok-admin' });
  assert.equal(conns.status, 200, conns.text);
  const xConnect = await call('GET', `/api/social/x/connect?companyId=${companyId}`, { token: 'tok-admin' });
  assert.ok(xConnect.status >= 400, 'Conectar X deve ser recusado');
  const pk = await call('GET', '/api/push/public-key', { token: 'tok-admin' });
  assert.equal(pk.status, 200);
  assert.match(pk.json.publicKey, /^[A-Za-z0-9_-]{80,}$/);
  const badSub = await call('POST', '/api/push/subscribe', { token: 'tok-admin', body: { subscription: { endpoint: 'http://evil.local/x', keys: {} } } });
  assert.equal(badSub.status, 400, 'Inscrição push inválida deve ser recusada');
  const st = await call('GET', '/api/push/status', { token: 'tok-admin' });
  assert.equal(st.status, 200);

  // Painel do administrador: blog e auditoria de mídia
  const adminBlog = await call('GET', '/api/admin/blog', { token: 'tok-admin' });
  assert.equal(adminBlog.status, 200, adminBlog.text);
  const coverStatus = await call('GET', '/api/portal/blog/covers/status', { token: 'tok-admin' });
  assert.equal(coverStatus.status, 200, coverStatus.text);
  const settings = await call('GET', '/api/portal/blog/settings', { token: 'tok-admin' });
  assert.equal(settings.status, 200, settings.text);
  const tickets = await call('GET', '/api/admin/support/tickets', { token: 'tok-admin' });
  assert.equal(tickets.status, 200, tickets.text);
  const diag = await call('GET', '/api/admin/scheduler/diagnostics', { token: 'tok-admin' });
  assert.equal(diag.status, 200, diag.text);

  // Suporte pelo usuário chega ao admin
  const ticket = await call('POST', '/api/support/tickets', { token: 'tok-user', body: { subject: 'Ajuda E2E', message: 'Mensagem de teste do comitê.', category: 'duvida' } });
  assert.ok([200, 201].includes(ticket.status), ticket.text);
  const tickets2 = await call('GET', '/api/admin/support/tickets', { token: 'tok-admin' });
  assert.ok(JSON.stringify(tickets2.json).includes('Ajuda E2E'));

  // Exclusão: conteúdo removido some da biblioteca
  const del = await call('DELETE', `/api/content/${contentId}`, { token: 'tok-admin' });
  assert.equal(del.status, 200, del.text);
  const after = await call('GET', '/api/content', { token: 'tok-admin' });
  assert.ok(!after.json.items.some((i: any) => i.id === contentId));
  const delProj = await call('DELETE', `/api/admin/projects/${proj.id}`, { token: 'tok-admin' });
  assert.equal(delProj.status, 200, delProj.text);
  assert.equal((await ssrPage(`/vitrine/${proj.slug}`)).status, 404);
});
