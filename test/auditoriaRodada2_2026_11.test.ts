import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { publicMediaUrl } from '../server/production/socialMediaPublisher.js';
import { config } from '../server/config/index.js';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const base = config.appUrl.replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Smoke pós-merge: contrato público atual (X/Twitter removido do produto)
// ---------------------------------------------------------------------------

test('Rodada 2: smoke de produção não exige mais o pacote do X/Twitter', () => {
  const smoke = read('test/productionSmoke.mjs');
  assert.ok(!smoke.includes('socialRepurpose?.twitter?.thread'));
  assert.ok(smoke.includes('socialRepurpose?.instagram?.caption'));
  assert.ok(smoke.includes('socialRepurpose?.kwai?.hashtags'));
  // O serializador público continua sem o X (mesma regra do finalCommittee).
  const blog = read('server/production/blogEngine.ts');
  const serializer = blog.slice(blog.indexOf('export function serializeBlogArticleForPublic'));
  assert.ok(!/\btwitter\s*:/.test(serializer.slice(0, serializer.indexOf('\n}\n'))));
});

// ---------------------------------------------------------------------------
// Modelos de IA desligados pelo Google
// ---------------------------------------------------------------------------

test('Rodada 2: imagem usa Nano Banana 2.1 e ignora o gemini-3.1-flash-image desligado', () => {
  const cfg = read('server/config/index.ts');
  const ai = read('server/production/ai.ts');
  assert.ok(cfg.includes("env('GEMINI_MODEL_IMAGE', 'gemini-nano-banana-2.1')"));
  assert.ok(ai.includes("const CURRENT_IMAGE_MODEL = 'gemini-nano-banana-2.1';"));
  assert.ok(ai.includes("RETIRED_IMAGE_MODELS.has(model) ? CURRENT_IMAGE_MODEL : model"));
});

test('Rodada 2: nenhum código chama gemini-3.7-flash nem o alias inexistente gemini-3.1-pro', () => {
  for (const file of ['server/production/router.ts', 'server/production/almaCore.ts', 'server/production/antiFallEngine.ts']) {
    const code = read(file);
    assert.ok(!code.includes("model: 'gemini-3.7-flash'"), `${file} ainda chama gemini-3.7-flash`);
    assert.ok(!code.includes("'gemini-3.1-pro'"), `${file} ainda usa gemini-3.1-pro`);
  }
});

// ---------------------------------------------------------------------------
// Publicação social: mídia sempre como URL pública
// ---------------------------------------------------------------------------

test('Rodada 2: imagem em data: URI vira o endpoint público da Biblioteca', () => {
  assert.equal(
    publicMediaUrl('data:image/png;base64,AAAA', 'cnt_123', 'imageUrl'),
    `${base}/api/content/cnt_123/image?field=imageUrl`
  );
  assert.equal(publicMediaUrl('data:image/png;base64,AAAA', undefined, 'imageUrl'), undefined);
  assert.equal(publicMediaUrl('data:video/mp4;base64,AAAA', 'cnt_1', 'videoUrl'), undefined);
});

test('Rodada 2: caminho relativo vira URL absoluta e URL externa é preservada', () => {
  assert.equal(publicMediaUrl('/icons/icon-512.png', 'x', 'imageUrl'), `${base}/icons/icon-512.png`);
  assert.equal(publicMediaUrl('https://cdn.exemplo.com/a.jpg', 'x', 'imageUrl'), 'https://cdn.exemplo.com/a.jpg');
  assert.equal(publicMediaUrl('', 'x', 'imageUrl'), undefined);
});

// ---------------------------------------------------------------------------
// SEO e painel
// ---------------------------------------------------------------------------

test('Rodada 2: sitemap de imagens só publica URL absoluta', () => {
  const router = read('server/production/router.ts');
  assert.ok(router.includes('const absoluteSitemapUrl = (value?: string): string =>'));
  assert.ok(router.includes('const imageUrl = absoluteSitemapUrl(item.image?.url);'));
});

test('Rodada 2: painel conta publicações do mês no fuso local', () => {
  const dash = read('src/pages/DashboardPage.tsx');
  assert.ok(!dash.includes("new Date().toISOString().slice(0, 7)"));
  assert.ok(dash.includes('localMonthKey('));
});

// ---------------------------------------------------------------------------
// Proteção das contas compartilhadas: limite diário e adiamento
// ---------------------------------------------------------------------------

test('Rodada 2: respostas de limite/spam da rede são reconhecidas (e erros de tamanho não)', async () => {
  const { isProviderLimitResult } = await import('../server/production/scheduledPublisherR8.js');
  assert.equal(isProviderLimitResult({ success: false, error: 'Throttle limit for calls to this resource is reached', externalState: 'confirmed_failed' }), true);
  assert.equal(isProviderLimitResult({ success: false, error: 'spam_risk_too_many_posts', externalState: 'confirmed_failed' }), true);
  assert.equal(isProviderLimitResult({ success: false, error: 'uploadLimitExceeded', externalState: 'confirmed_failed' }), true);
  assert.equal(isProviderLimitResult({ success: false, statusCode: 429, error: 'x', externalState: 'confirmed_failed' }), true);
  assert.equal(isProviderLimitResult({ success: false, error: 'O vídeo excede o limite de 4 MB', externalState: 'confirmed_failed' }), false);
  assert.equal(isProviderLimitResult({ success: false, error: 'rate limit', externalState: 'unknown' }), false);
  assert.equal(isProviderLimitResult({ success: true, externalId: '1' }), false);
});

test('Rodada 2: adiamento vai para o dia seguinte entre 11h e 18h de Brasília', async () => {
  const { nextDaySpreadSlot, brDateKey } = await import('../server/production/scheduledPublisherR8.js');
  const now = Date.parse('2026-11-20T13:00:00Z'); // 10h em Brasília
  for (const id of ['a', 'sched_123', 'sched_zzz', 'p-99']) {
    const slot = Date.parse(nextDaySpreadSlot(id, now));
    assert.equal(brDateKey(slot), '2026-11-21');
    const brHour = new Date(slot - 3 * 3600_000).getUTCHours();
    assert.ok(brHour >= 11 && brHour <= 17, `hora ${brHour}`);
  }
  // Determinístico por post: o mesmo id sempre cai no mesmo horário.
  assert.equal(nextDaySpreadSlot('sched_123', now), nextDaySpreadSlot('sched_123', now));
});

test('Rodada 2: publicador aplica teto diário por rede antes de chamar a API', () => {
  const code = read('server/production/scheduledPublisherR8.ts');
  assert.ok(code.includes('DAILY_PROVIDER_CAPS[provider]'));
  assert.ok(code.includes('await incrementProviderDaily(db, provider)'));
  assert.ok(code.includes("status: 'scheduled',\n          scheduledFor: nextSlot"));
});

test('Rodada 2: Froc explica limite, spam e falhas antigas do X sem mandar recarregar', async () => {
  const { failureHint } = await import('../server/production/frocAgenda.js');
  assert.match(failureHint('spam_risk_too_many_posts', ['tiktok']), /excesso de envios/);
  assert.match(failureHint('Daily share limit reached', ['linkedin']), /limite diário/);
  assert.match(failureHint('uploadLimitExceeded', ['youtube']), /YouTube/);
  const x = failureHint('credits depleted', ['twitter']);
  assert.match(x, /retirada do Portal/);
  assert.ok(!/developer\.x\.com/.test(x));
});
