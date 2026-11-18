import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import * as firebaseAdminProvider from '../server/providers/firebaseAdmin.js';
import { firestore, resetMemoryDb, COLLECTIONS } from '../server/production/store.js';
import { createApp } from '../server/app.js';
import { detectArticleNiche, withUniqueCovers, resolveArticleCover, NICHE_PHOTO_CATALOG } from '../src/utils/thematicCovers.js';
import { detectServerArticleNiche, fixWrongNicheStockCover, THEMATIC_NICHE_IMAGES } from '../server/production/blogEngine.js';
import { coverSceneGroupFor } from '../server/production/coverPhotoEngine.js';

test('Biblioteca grande carrega (não estoura o limite da Vercel) e o texto completo continua acessível', async (t) => {
  resetMemoryDb();
  firebaseAdminProvider.setAdminAuthForTesting({ verifyIdToken: async () => ({ uid: 'u_lib', email: 'lib@example.com', email_verified: true, role: 'admin' }), getUser: async (uid: string) => ({ uid, customClaims: {} }) } as any);
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  t.after(() => { server.close(); firebaseAdminProvider.setAdminAuthForTesting(undefined); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const now = new Date().toISOString();
  await firestore().collection(COLLECTIONS.users).doc('u_lib').set({ id: 'u_lib', role: 'admin', termsAcceptedAt: now, privacyAcceptedAt: now, termsVersion: '2026.1', privacyVersion: '2026.1' });
  const png = 'data:image/png;base64,' + Buffer.alloc(150_000, 7).toString('base64');
  const col = firestore().collection(COLLECTIONS.contentItems);
  for (let i = 0; i < 700; i++) {
    await col.doc(`c${i}`).set({ id: `c${i}`, userId: 'u_lib', companyId: 'proj_exu_responde', type: i % 3 ? 'post' : 'article', title: `Item ${i}`, body: 'texto longo '.repeat(3000), imageUrl: i % 10 === 0 ? png : 'https://example.com/i.jpg', createdAt: new Date(Date.now() - i * 60_000).toISOString(), metadata: { finalPrompt: 'x'.repeat(5000) } });
  }
  const h = { authorization: 'Bearer ok' };
  const res = await fetch(`${base}/api/content`, { headers: h });
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.ok(Buffer.byteLength(text) < 3_200_000, `lista grande demais: ${Buffer.byteLength(text)} bytes`);
  const data = JSON.parse(text);
  assert.equal(data.total, 700);
  assert.ok(data.items.length >= 100);
  assert.equal(data.items[0].id, 'c0', 'os mais recentes primeiro');
  assert.equal(data.items[0].bodyTruncated, true);
  assert.equal(data.items[0].imageUrl, '/api/content/c0/image?field=imageUrl');
  assert.equal(data.items[0].metadata.finalPrompt, undefined);
  const full = await (await fetch(`${base}/api/content/c0`, { headers: h })).json();
  assert.equal(full.item.body.length, 'texto longo '.repeat(3000).length);
  const img = await fetch(`${base}/api/content/c0/image?field=imageUrl`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await img.arrayBuffer()).length, 150_000);
  // As rotas fixas continuam funcionando (não são confundidas com :id).
  assert.equal((await fetch(`${base}/api/content/scheduled`, { headers: h })).status, 200);
  const cal = await fetch(`${base}/api/content/calendar`, { headers: h });
  assert.equal(cal.status, 200);
  assert.ok(Buffer.byteLength(await cal.text()) < 4_000_000);
});

test('Capa do Froc X (mobilidade): carro/rua/motorista, nunca praia ou prosperidade', () => {
  const froc = { relatedProjectId: 'proj_froc_x', relatedProjectName: 'Froc X', title: 'Como ganhar mais nas madrugadas', slug: 'como-ganhar-mais-nas-madrugadas' };
  assert.equal(detectArticleNiche(froc), 'mobilidade_transporte');
  assert.equal(detectServerArticleNiche({ ...froc, projectId: froc.relatedProjectId, projectHint: 'Froc X Mobilidade' }), 'mobilidade_transporte');
  assert.equal(coverSceneGroupFor({ ...froc }), 'tema_mobilidade');
  assert.equal(NICHE_PHOTO_CATALOG.mobilidade_transporte.length, 10);
  assert.equal(THEMATIC_NICHE_IMAGES.mobilidade_transporte.length, 10);
  // Foto de prosperidade gravada no artigo é trocada pela de mobilidade (no servidor e na tela).
  const beach = THEMATIC_NICHE_IMAGES.prosperidade_crencas[0].url;
  const fixed = fixWrongNicheStockCover({ relatedProjectId: 'proj_froc_x', title: froc.title, slug: froc.slug }, beach, 'Froc X');
  assert.ok(THEMATIC_NICHE_IMAGES.mobilidade_transporte.some((p) => p.url === fixed), fixed);
  const clientBeach = NICHE_PHOTO_CATALOG.prosperidade_crencas[0].url;
  const clientFixed = resolveArticleCover(clientBeach, 'proj_froc_x', froc.title, froc.slug, 'a1', 'Mobilidade');
  assert.ok(NICHE_PHOTO_CATALOG.mobilidade_transporte.some((p) => p.url === clientFixed));
  // Capa de IA nunca é trocada.
  assert.equal(fixWrongNicheStockCover(froc, 'https://portal/api/portal/blog/articles/x/cover', 'Froc X'), 'https://portal/api/portal/blog/articles/x/cover');
  // Muitos artigos de mobilidade: sem repetir e sem pegar foto de outro nicho.
  const many = Array.from({ length: 14 }, (_, i) => ({ id: `m${i}`, slug: `corrida-${i}`, title: `Dica de corrida ${i}`, relatedProjectId: 'proj_froc_x', coverImage: '' as string | undefined }));
  const out = withUniqueCovers(many);
  const otherNiche = new Set(Object.entries(NICHE_PHOTO_CATALOG).filter(([k]) => k !== 'mobilidade_transporte').flatMap(([, v]) => v.map((p) => p.url)));
  assert.ok(out.every((a) => !otherNiche.has(String(a.coverImage))), 'pegou foto de outro nicho');
  const urls = out.map((a) => a.coverImage);
  assert.equal(new Set(urls).size, urls.length, 'capas repetidas');
  // Os projetos iniciais não mudam.
  assert.equal(detectServerArticleNiche({ title: 'Oração no carro', projectId: 'proj_manual_catolico' }), 'catolico_devocao');
});
