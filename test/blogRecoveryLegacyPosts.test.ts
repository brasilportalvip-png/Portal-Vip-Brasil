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

test('Desempenho: capa em base64 nunca vai na listagem pública; vira URL leve da rota de capa', async () => {
  const db = fresh();
  const pixel = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='.repeat(1);
  const huge = pixel + 'A'.repeat(0);
  await db.collection(COLLECTIONS.blogArticles).doc('b64').set({
    id: 'b64', slug: 'artigo-capa-base64', title: 'Capa base64', excerpt: 'x', status: 'published', publishedAt: '2026-06-01', coverImage: huge
  });
  const list = await listBlogArticles({ status: 'published' });
  const { serializeBlogArticleForPublic, decodeDataUriImage, publicCoverUrl } = await import('../server/production/blogEngine.js');
  const pub = serializeBlogArticleForPublic(list.articles[0]);
  const json = JSON.stringify(pub);
  assert.equal(json.includes(';base64,'), false, 'Resposta pública não pode conter imagem embutida em base64');
  assert.match(pub.coverImage, /\/api\/portal\/blog\/articles\/artigo-capa-base64\/cover$/);
  assert.equal(pub.schemaJsonLd.image[0], pub.coverImage);
  const decoded = decodeDataUriImage(huge);
  assert.equal(decoded?.mime, 'image/png');
  assert.ok((decoded?.buffer.length || 0) > 0);
  assert.equal(publicCoverUrl({ slug: 's', coverImage: 'https://images.unsplash.com/photo-1?w=1200' }), 'https://images.unsplash.com/photo-1?w=1200');
  const page = await renderPublicPage('/blog/artigo-capa-base64');
  assert.equal(page.html.includes(';base64,'), false, 'HTML do artigo não pode embutir a capa em base64');
  const txt = await buildSitemapTxt();
  assert.equal(txt.includes(';base64,'), false);
});

test('Capas fotográficas: prompt ultrarrealista do nicho certo, sem texto, com alt descritivo', async () => {
  const { buildCoverPhotoPrompt, pickCoverScene } = await import('../server/production/coverPhotoEngine.js');
  const rosa = buildCoverPhotoPrompt({ id: 'a1', slug: 'oracao-de-maria-padilha', title: 'Oração de Maria Padilha para o amor', relatedProjectId: 'proj_maria_padilha' });
  assert.match(rosa.prompt, /rose/i);
  assert.match(rosa.prompt, /Ultra-realistic/);
  assert.match(rosa.prompt, /NO text/);
  assert.ok(rosa.alt.startsWith('Oração de Maria Padilha'));
  const runas = pickCoverScene({ id: 'b', slug: 'significado-das-runas', title: 'Significado das runas nórdicas', relatedProjectId: 'proj_oraculos_ts' });
  assert.match(runas.en, /rune/i);
  const terco = pickCoverScene({ id: 'c', slug: 'como-rezar-o-terco', title: 'Como rezar o terço', relatedProjectId: 'proj_manual_catolico' });
  assert.match(terco.en, /rosary/i);
  for (const project of ['proj_exu_responde', 'proj_magia_crencas', 'proj_frocia2', 'proj_froc_marketing_engine', 'proj_portal_vip_magazine']) {
    const { prompt } = buildCoverPhotoPrompt({ id: project, slug: project, title: 'Teste', relatedProjectId: project });
    assert.ok(prompt.length > 300);
  }
});

test('Capas fotográficas: lote respeita Botão Mestre desligado (custo zero) e não quebra com falhas', async () => {
  const db = fresh();
  await db.collection(COLLECTIONS.blogArticles).doc('c1').set({ id: 'c1', slug: 'capa-1', title: 'Capa 1', status: 'published', relatedProjectId: 'proj_maria_padilha', publishedAt: '2026-06-01' });
  const { runCoverPhotoBatch, coverPhotoStatus } = await import('../server/production/coverPhotoEngine.js');
  const off = await runCoverPhotoBatch({ limit: 2 });
  assert.equal(off.status, 'master_off');
  assert.equal(off.generated, 0);
  const st = await coverPhotoStatus();
  assert.equal(st.total, 1);
  assert.equal(st.pending, 1);

  await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').set({ globalEnabled: true, pauseAllExternalApis: false });
  const on = await runCoverPhotoBatch({ limit: 2, timeBudgetMs: 120_000 });
  assert.equal(on.status, 'ok');
  assert.equal(on.processed, 1);
  assert.equal(on.generated + on.failed, 1);
  const after = (await db.collection(COLLECTIONS.blogArticles).doc('c1').get()).data() as any;
  if (on.failed) assert.equal(after.coverPhotoAttempts, 1, 'Falha registra tentativa para não gastar créditos em loop');
});

test('Capas fotográficas: capa guardada em blogCovers é carregada como imagem real', async () => {
  const db = fresh();
  const { loadStoredCover, BLOG_COVERS_COLLECTION } = await import('../server/production/coverPhotoEngine.js');
  await db.collection(BLOG_COVERS_COLLECTION).doc('x1').set({ articleId: 'x1', mime: 'image/webp', data: Buffer.from('RIFFxxxxWEBP').toString('base64') });
  const cover = await loadStoredCover('x1');
  assert.equal(cover?.mime, 'image/webp');
  assert.equal(cover?.buffer.toString(), 'RIFFxxxxWEBP');
  assert.equal(await loadStoredCover('nao-existe'), null);
});

test('Novos artigos: slug curto no padrão Yoast (sem stopwords, sem datas)', async () => {
  const { buildSeoSlug } = await import('../server/production/blogEngine.js');
  assert.equal(buildSeoSlug('Oração de Maria Padilha para o amor voltar 2026-10-30'), 'oracao-maria-padilha-amor-voltar');
  assert.equal(buildSeoSlug('Como jogar runas nórdicas: guia completo para iniciantes'), 'como-jogar-runas-nordicas-guia-completo');
  assert.ok(buildSeoSlug('de da do').length >= 3);
});

test('Novos artigos: resumo rápido (keyTakeaways) chega ao frontend', async () => {
  const { serializeBlogArticleForPublic, sanitizeStoredArticle } = await import('../server/production/blogEngine.js');
  const art = sanitizeStoredArticle({ id: 'k', slug: 'k', title: 'K', status: 'published', keyTakeaways: ['Ponto 1', '', 'Ponto 2', 3] });
  const pub = serializeBlogArticleForPublic(art);
  assert.deepEqual(pub.keyTakeaways, ['Ponto 1', 'Ponto 2']);
});
