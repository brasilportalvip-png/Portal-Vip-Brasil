import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { coverImageKey, withUniqueCovers, brandedCoverFallback } from '../src/utils/thematicCovers.js';
import { coverNeedsThemeFix, coverSceneGroupFor, pickCoverScene } from '../server/production/coverPhotoEngine.js';
import { looksLikeImageUrl, looksLikeVideoUrl, mediaKey, probeMedia } from '../server/production/mediaAudit.js';
import { isManualPublishChannel, isRemovedSocialProvider, normalizeProvider } from '../server/production/social.js';

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

test('Blog: nenhuma capa se repete na listagem, mesmo quando várias caem na mesma foto de catálogo', () => {
  const same = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80';
  const list = Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, slug: `artigo-${i}`, title: 'Prosperidade e gratidão', coverImage: i % 2 ? same : `${same}&v=${i}` }));
  const out = withUniqueCovers(list);
  const keys = out.map((a) => coverImageKey(a.coverImage));
  assert.equal(new Set(keys).size, keys.length, 'capas repetidas na listagem');
});

test('Blog: capa própria (gerada por IA) é mantida e logo nunca vira capa', () => {
  const own = '/api/portal/blog/articles/meu-artigo/cover';
  const [a, b] = withUniqueCovers([
    { id: '1', slug: 'meu-artigo', title: 'Runas nórdicas', coverImage: own },
    { id: '2', slug: 'outro', title: 'Runas nórdicas', coverImage: '/icons/logo.png' },
  ]);
  assert.equal(a.coverImage, own);
  assert.ok(!/logo/.test(String(b.coverImage)));
});

test('Blog: fundo de reserva é uma imagem SVG válida', () => {
  assert.match(brandedCoverFallback('x'), /^data:image\/svg\+xml/);
});

test('Capas por IA: artigos de corrida, fantasma e São Cipriano ganham o tema certo', () => {
  assert.equal(coverSceneGroupFor({ title: 'Qual app de corrida é mais barato?', slug: 'qual-app-corrida-mais-barato', relatedProjectId: 'proj_dinamico_1' }), 'tema_mobilidade');
  assert.equal(coverSceneGroupFor({ title: 'Como usar o detector de fantasma', slug: 'como-usar-detector-fantasma', relatedProjectId: 'proj_dinamico_2' }), 'tema_sobrenatural');
  assert.equal(coverSceneGroupFor({ title: 'Jogar cartas de São Cipriano online', slug: 'jogar-cartas-sao-cipriano-online', relatedProjectId: 'proj_dinamico_3' }), 'tema_bruxaria');
  assert.match(pickCoverScene({ id: 'b', slug: 'jogo-buzios-amor-funciona', title: 'Jogo de búzios', relatedProjectId: 'proj_oraculos_ts' }).en, /cowrie/i);
  // Projetos com cenas próprias continuam iguais.
  assert.equal(coverSceneGroupFor({ title: 'Qualquer', relatedProjectId: 'proj_manual_catolico' }), 'proj_manual_catolico');
});

test('Capas por IA: só refaz a capa que saiu com tema errado (sem gastar com as certas)', () => {
  assert.equal(coverNeedsThemeFix({ title: 'Qual app de corrida é mais barato?', slug: 'qual-app-corrida-mais-barato', relatedProjectId: 'proj_x' }), true);
  assert.equal(coverNeedsThemeFix({ title: 'Qual app de corrida é mais barato?', slug: 'qual-app-corrida-mais-barato', relatedProjectId: 'proj_x', coverSceneGroup: 'tema_mobilidade' }), false);
  assert.equal(coverNeedsThemeFix({ title: 'Oração de Maria Padilha', relatedProjectId: 'proj_maria_padilha' }), false);
});

test('Auditoria: reconhece imagem x vídeo e repetição com parâmetros diferentes', () => {
  assert.equal(looksLikeVideoUrl('https://x/y/video.mp4?alt=media'), true);
  assert.equal(looksLikeImageUrl('https://x/y/foto.webp'), true);
  assert.equal(mediaKey('https://images.unsplash.com/photo-123-abc?w=1'), mediaKey('https://images.unsplash.com/photo-123-abc?w=2'));
});

test('Auditoria: abre o endereço de verdade e acusa tipo errado ou link quebrado', async () => {
  const fake = (status: number, type: string) => async () => ({ ok: status < 400, status, headers: { get: () => type } });
  assert.equal(await probeMedia('https://a/b.jpg', 'image', fake(200, 'image/jpeg')), null);
  assert.match(String(await probeMedia('https://a/b.jpg', 'image', fake(404, 'text/html'))), /HTTP 404/);
  assert.match(String(await probeMedia('https://a/b.mp4', 'video', fake(200, 'image/png'))), /deveria ser vídeo/);
  assert.equal(await probeMedia('data:image/png;base64,AAAA', 'image'), null);
});

test('Redes: X e Pinterest saíram; Kwai é manual e aparece nos lugares certos', () => {
  for (const removed of ['x', 'X', 'twitter', 'Pinterest']) {
    assert.equal(normalizeProvider(removed), null);
    assert.equal(isRemovedSocialProvider(removed), true);
  }
  assert.equal(isManualPublishChannel('Kwai'), true);
  assert.match(read('src/pages/SocialNetworksPage.tsx'), /id:'kwai'/);
  assert.match(read('src/pages/ContentsLibraryPage.tsx'), /Postar no Kwai/);
  assert.match(read('src/pages/CalendarPage.tsx'), /id: 'Kwai'[^\n]*Aviso no celular/);
  assert.match(read('src/pages/AutopilotPage.tsx'), /name: 'Kwai', key: 'kwai', direct: true/);
  for (const file of ['index.html', 'server/production/publicPages.ts']) assert.ok(!/twitter:/.test(read(file)), file);
  for (const file of ['src/pages/SocialNetworksPage.tsx', 'src/pages/CalendarPage.tsx', 'src/pages/AutopilotPage.tsx', 'src/pages/CreateContentPage.tsx', 'src/pages/CampaignsPage.tsx', 'src/pages/BlogPortalPage.tsx']) {
    assert.ok(!/Pinterest|Twitter|'X'|𝕏/.test(read(file)), `${file} ainda cita X/Pinterest`);
  }
});

test('Vídeos: o catálogo nunca toca o clipe de texto falso no lugar de vídeo real', () => {
  const catalog = read('src/components/NicheVideoCatalogSection.tsx');
  assert.ok(!catalog.includes('src={selectedTemplate.sampleVideoUrl}'));
  assert.match(catalog, /realVideo \?/);
});

test('Avisos no celular: conteúdo criptografado (RFC 8291) abre com a chave do aparelho', async () => {
  const crypto = await import('node:crypto');
  const { encryptPushPayload } = await import('../server/production/webPush.js');
  // "Aparelho": par de chaves P-256 + segredo de autenticação, como o navegador gera.
  const device = crypto.createECDH('prime256v1');
  device.generateKeys();
  const auth = crypto.randomBytes(16);
  const message = Buffer.from(JSON.stringify({ title: 'Hora de postar no Kwai', url: '/conteudos?kwai=c1' }));
  const record = encryptPushPayload({ p256dh: device.getPublicKey().toString('base64url'), auth: auth.toString('base64url') }, message);

  // Decriptação independente, seguindo a RFC 8291/8188 (lado do navegador).
  const salt = record.subarray(0, 16);
  assert.equal(record.readUInt32BE(16), 4096);
  const idLen = record[20];
  const serverPublic = record.subarray(21, 21 + idLen);
  const ciphertext = record.subarray(21 + idLen);
  const shared = device.computeSecret(serverPublic);
  const hk = (s: Buffer, ikm: Buffer, info: Buffer, n: number) => Buffer.from(crypto.hkdfSync('sha256', ikm, s, info, n));
  const ikm = hk(auth, shared, Buffer.concat([Buffer.from('WebPush: info\0'), device.getPublicKey(), serverPublic]), 32);
  const cek = hk(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hk(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);
  assert.equal(plain[plain.length - 1], 0x02, 'delimitador do último registro');
  assert.deepEqual(plain.subarray(0, plain.length - 1), message);
});

test('Avisos no celular: assinatura VAPID (ES256) é válida para o servidor de push', async () => {
  const crypto = await import('node:crypto');
  const { generateVapidKeys, vapidAuthorization } = await import('../server/production/webPush.js');
  const keys = generateVapidKeys();
  const header = vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys);
  const match = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  assert.ok(match, header);
  const [, h, c, sig, k] = match!;
  assert.equal(k, keys.publicKey);
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.ok(claims.exp > Date.now() / 1000);
  const pub = Buffer.from(keys.publicKey, 'base64url');
  const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${c}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});

test('Kwai: aviso vencido sai uma única vez, com link para postar com um toque', async () => {
  const { resetMemoryDb, firestore, COLLECTIONS } = await import('../server/production/store.js');
  const { queueKwaiReminder, processDueKwaiReminders, KWAI_REMINDERS } = await import('../server/production/kwaiReminders.js');
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.contentItems).doc('c1').set({ id: 'c1', userId: 'u1', companyId: 'p1', title: 'Vídeo do dia', videoUrl: 'https://cdn/x.mp4' });
  await queueKwaiReminder({ key: 'a', userId: 'u1', companyId: 'p1', contentItemId: 'c1', title: 'Vídeo do dia', dueAt: new Date(Date.now() - 1000).toISOString() });
  await queueKwaiReminder({ key: 'b', userId: 'u1', companyId: 'p1', contentItemId: 'c1', title: 'Amanhã', dueAt: new Date(Date.now() + 86_400_000).toISOString() });
  const sentTo: any[] = [];
  const result = await processDueKwaiReminders({ sendPush: async (userId: string, msg: any) => { sentTo.push({ userId, msg }); return 1; } });
  assert.equal(result.sent, 1);
  assert.equal(sentTo[0].userId, 'u1');
  assert.equal(sentTo[0].msg.url, '/conteudos?kwai=c1');
  const again = await processDueKwaiReminders({ sendPush: async () => 1 });
  assert.equal(again.sent, 0, 'não avisa em dobro');
  const left = await db.collection(KWAI_REMINDERS).get();
  assert.equal(left.size, 1, 'o aviso de amanhã continua na fila');
});

test('Avisos no celular: bate byte a byte com o exemplo oficial da RFC 8291 (Apêndice A)', async () => {
  const { encryptPushPayload } = await import('../server/production/webPush.js');
  const out = encryptPushPayload(
    { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
    Buffer.from('When I grow up, I want to be a watermelon'),
    { serverPrivateKey: Buffer.from('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', 'base64url'), salt: Buffer.from('DGv6ra1nlYgDCS1FRnbzlw', 'base64url') }
  );
  assert.equal(out.toString('base64url'), 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
});
