import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb } from '../server/production/store.js';
import { companyContext, cleanHeadingText, normalizeArticleHeadings, countArticleWords } from '../server/production/ai.js';
import { buildSitemapXml, parseStrictBoolean } from '../server/production/router.js';
import { renderPublicPage } from '../server/production/publicPages.js';

test('AI Grounding: usa somente destinos reais e não inventa prova social', () => {
  const ctxEmpty = companyContext({ name: 'Projeto Teste', businessType: 'online', description: 'Projeto digital' });
  assert.match(ctxEmpty, /PROIBIÇÃO DE FATOS FICTÍCIOS/);
  assert.match(ctxEmpty, /NENHUM canal de contato ou link foi cadastrado/);

  const ctxWithChannels = companyContext({
    name: 'Projeto Oficial',
    businessType: 'online',
    website: 'https://example.com',
    whatsapp: '11999999999'
  });
  assert.match(ctxWithChannels, /https:\/\/example\.com/);
  assert.match(ctxWithChannels, /11999999999/);
});

test('AI Content: normaliza headings e preserva estrutura', () => {
  assert.equal(cleanHeadingText('## Meu Título'), 'Meu Título');
  const article = normalizeArticleHeadings({
    title: '## Título',
    introduction: 'Introdução com conteúdo real.',
    sections: [{ h2: 'H2: Seção', content: 'Conteúdo da seção.', h3s: [{ h3: '### Detalhe', content: 'Detalhe.' }] }],
    conclusion: 'Conclusão.',
    callToAction: 'Conheça mais.'
  });
  assert.equal(article.title, 'Título');
  assert.equal(article.sections[0].h2, 'Seção');
  assert.equal(article.sections[0].h3s[0].h3, 'Detalhe');
  assert.ok(countArticleWords(article) > 5);
});

test('SEO público: página raiz mantém verificação oficial e sitemap não anuncia rotas privadas/comerciais', async () => {
  resetMemoryDb();
  const page = await renderPublicPage('/');
  assert.equal(page.status, 200);
  assert.match(page.html, /name="google-site-verification"/);

  const sitemap = await buildSitemapXml();
  assert.match(sitemap, /\/blog/);
  assert.match(sitemap, /\/vitrine/);
  assert.doesNotMatch(sitemap, /\/planos(?:<|\/)/);
  assert.doesNotMatch(sitemap, /\/alma(?:<|\/)/);
  assert.doesNotMatch(sitemap, /\/empresa(?:<|\/)/);
  assert.doesNotMatch(sitemap, /\/creditos(?:<|\/)/);
});

test('parseStrictBoolean mantém semântica estrita', () => {
  assert.equal(parseStrictBoolean(true), true);
  assert.equal(parseStrictBoolean('true'), true);
  assert.equal(parseStrictBoolean(false), false);
  assert.equal(parseStrictBoolean('false'), false);
  assert.equal(parseStrictBoolean('sim'), false);
  assert.equal(parseStrictBoolean(1), false);
});
