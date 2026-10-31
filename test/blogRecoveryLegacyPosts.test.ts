import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listBlogArticles,
  getBlogArticleBySlug,
  invalidatePublishedBlogCache,
  normalizeLegacyBlogPost
} from '../server/production/blogEngine.js';
import { buildSitemapTxt, buildRobotsTxt } from '../server/production/router.js';
import { renderPublicPage } from '../server/production/publicPages.js';
import { COLLECTIONS, firestore, resetMemoryDb } from '../server/production/store.js';

function fresh() {
  resetMemoryDb();
  invalidatePublishedBlogCache();
  return firestore();
}

test('Recuperação: posts publicados SEM publishedAt voltam a aparecer no blog', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('sem-data').set({
    id: 'sem-data', slug: 'post-sem-data', title: 'Post sem data', excerpt: 'x', status: 'published', createdAt: '2026-05-01T10:00:00.000Z'
  });
  await db.collection(COLLECTIONS.blogArticles).doc('com-data').set({
    id: 'com-data', slug: 'post-com-data', title: 'Post com data', excerpt: 'y', status: 'published', publishedAt: '2026-06-01T10:00:00.000Z'
  });
  const result = await listBlogArticles({ status: 'published', limit: 50 });
  assert.deepEqual(result.articles.map((a) => a.id), ['com-data', 'sem-data']);
});

test('Recuperação: posts antigos da coleção legada blogPosts aparecem no blog e abrem por slug', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogPosts).doc('legado-1').set({
    id: 'legado-1', slug: 'post-legado', title: 'Post Legado', summary: 'Resumo do post legado', status: 'published',
    content: '## Primeira parte\nTexto da primeira parte.\n\n## Segunda parte\nTexto da segunda parte.',
    publishedAt: '2026-04-01T10:00:00.000Z'
  });
  await db.collection(COLLECTIONS.blogPosts).doc('legado-rascunho').set({
    id: 'legado-rascunho', slug: 'legado-rascunho', title: 'Rascunho', status: 'draft'
  });
  const result = await listBlogArticles({ status: 'published', limit: 50 });
  assert.equal(result.total, 1);
  assert.equal(result.articles[0].slug, 'post-legado');
  assert.equal(result.articles[0].excerpt, 'Resumo do post legado');
  assert.equal(result.articles[0].sections.length, 2);

  const article = await getBlogArticleBySlug('post-legado');
  assert.equal(article?.title, 'Post Legado');
  assert.equal(await getBlogArticleBySlug('legado-rascunho'), undefined);
});

test('Recuperação: slug duplicado entre coleções prevalece a versão nova (blogArticles)', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('novo').set({ id: 'novo', slug: 'mesmo', title: 'Novo', excerpt: '', status: 'published', publishedAt: '2026-06-01' });
  await db.collection(COLLECTIONS.blogPosts).doc('velho').set({ id: 'velho', slug: 'mesmo', title: 'Velho', status: 'published', publishedAt: '2026-01-01' });
  const result = await listBlogArticles({ status: 'published' });
  assert.equal(result.total, 1);
  assert.equal(result.articles[0].id, 'novo');
});

test('Recuperação: listagem pública não grava nada no banco', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('a').set({ id: 'a', slug: 'a', title: 'A', excerpt: '', status: 'published', coverImage: '/icons/logo.png' });
  const before = JSON.stringify((await db.collection(COLLECTIONS.blogArticles).doc('a').get()).data());
  await listBlogArticles({ status: 'published' });
  const after = JSON.stringify((await db.collection(COLLECTIONS.blogArticles).doc('a').get()).data());
  assert.equal(after, before);
});

test('Normalização legada gera seções a partir do markdown', () => {
  const article = normalizeLegacyBlogPost('x', { slug: 'x', title: 'X', content: 'Intro\n\n## A\nTexto A' });
  assert.equal(article.status, 'published');
  assert.ok(article.sections.some((s) => s.h2 === 'A'));
});

test('SEO: sitemap.txt lista URLs absolutas, uma por linha, e robots aponta os dois sitemaps', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('s').set({ id: 's', slug: 'artigo-sitemap', title: 'S', status: 'published', publishedAt: '2026-06-01' });
  const txt = await buildSitemapTxt();
  const lines = txt.trim().split('\n');
  assert.ok(lines.length >= 3);
  for (const line of lines) assert.match(line, /^https?:\/\/\S+$/);
  assert.ok(lines.some((l) => l.endsWith('/blog/artigo-sitemap')));
  assert.ok(!txt.includes('/admin'));
  const robots = buildRobotsTxt();
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);
  assert.match(robots, /Sitemap: .*\/sitemap\.txt/);
});

test('SEO: páginas legais têm título e descrição próprios (sem duplicar a home)', async () => {
  fresh();
  const home = await renderPublicPage('/termos');
  const priv = await renderPublicPage('/privacidade');
  assert.match(home.html, /<title>Termos de Uso — Portal Vip Brasil<\/title>/);
  assert.match(priv.html, /<title>Política de Privacidade \(LGPD\) — Portal Vip Brasil<\/title>/);
  assert.match(priv.html, /BreadcrumbList/);
});

test('SEO: home pré-renderizada tem H1, conteúdo rico e WebSite/SearchAction', async () => {
  fresh();
  const page = await renderPublicPage('/');
  assert.equal(page.status, 200);
  assert.match(page.html, /<h1>/);
  assert.match(page.html, /SearchAction/);
  assert.match(page.html, /max-image-preview:large/);
});

test('SEO: artigo gerado por texto-modelo fica visível mas com noindex e fora do sitemap', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('modelo').set({
    id: 'modelo', slug: 'artigo-modelo', title: 'Artigo Modelo', excerpt: 'm', status: 'published', publishedAt: '2026-06-01',
    sections: [
      { h2: 'Conheça Projeto X e Seus Principais Benefícios', content: 'texto' },
      { h2: 'Como Começar a Utilizar Hoje Mesmo', content: 'texto' }
    ]
  });
  await db.collection(COLLECTIONS.blogArticles).doc('real').set({
    id: 'real', slug: 'artigo-real', title: 'Artigo Real', excerpt: 'r', status: 'published', publishedAt: '2026-06-02',
    sections: [{ h2: 'Um tema específico', content: 'texto original' }]
  });
  const list = await listBlogArticles({ status: 'published' });
  assert.equal(list.total, 2, 'Os dois continuam visíveis para o leitor');
  const txt = await buildSitemapTxt();
  assert.ok(txt.includes('/blog/artigo-real'));
  assert.ok(!txt.includes('/blog/artigo-modelo'));
  const page = await renderPublicPage('/blog/artigo-modelo');
  assert.equal(page.status, 200);
  assert.match(page.html, /noindex,follow/);
  const realPage = await renderPublicPage('/blog/artigo-real');
  assert.doesNotMatch(realPage.html, /noindex/);
});

test('Robustez: documentos malformados não derrubam a listagem pública', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('ruim').set({
    id: 'ruim', slug: 'artigo-ruim', status: 'published', title: 123, tags: 'nao-e-lista',
    sections: [null, 'texto solto', { h2: null, content: 42, h3s: 'x' }], author: null, faqSection: {}
  });
  await db.collection(COLLECTIONS.blogArticles).doc('bom').set({
    id: 'bom', slug: 'artigo-bom', status: 'published', title: 'Bom', excerpt: 'ok', publishedAt: '2026-06-01'
  });
  const list = await listBlogArticles({ status: 'published' });
  assert.equal(list.total, 2);
  const { serializeBlogArticleForPublic } = await import('../server/production/blogEngine.js');
  for (const article of list.articles) {
    const pub = serializeBlogArticleForPublic(article);
    assert.ok(pub.slug);
    assert.ok(Array.isArray(pub.keywords));
  }
});
