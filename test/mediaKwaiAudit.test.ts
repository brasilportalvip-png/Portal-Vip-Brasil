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
  assert.match(read('src/pages/CalendarPage.tsx'), /id: 'Kwai'[^\n]*autoPublish: false/);
  assert.match(read('src/pages/AutopilotPage.tsx'), /name: 'Kwai', key: 'kwai', direct: false/);
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
