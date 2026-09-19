import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listBlogArticles, getBlogArticleBySlug } from '../server/production/blogEngine.js';
import { COLLECTIONS, firestore, resetMemoryDb } from '../server/production/store.js';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('R8.1 SEO: listagem pública lê artigos dinâmicos sem depender de índice composto', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.blogArticles).doc('old').set({
    id: 'old', slug: 'artigo-antigo-r81', title: 'Artigo Antigo R81', excerpt: 'Antigo',
    status: 'published', category: 'SEO', relatedProjectId: 'proj_r81', publishedAt: '2026-09-01T10:00:00.000Z',
    tags: ['seo'], primaryKeyword: 'seo antigo'
  });
  await db.collection(COLLECTIONS.blogArticles).doc('new').set({
    id: 'new', slug: 'artigo-novo-r81', title: 'Artigo Novo R81', excerpt: 'Novo',
    status: 'published', category: 'SEO', relatedProjectId: 'proj_r81', publishedAt: '2026-09-05T10:00:00.000Z',
    tags: ['seo'], primaryKeyword: 'seo novo'
  });
  await db.collection(COLLECTIONS.blogArticles).doc('draft').set({
    id: 'draft', slug: 'rascunho-r81', title: 'Rascunho R81', excerpt: 'Rascunho',
    status: 'draft', category: 'SEO', relatedProjectId: 'proj_r81', publishedAt: '2026-09-06T10:00:00.000Z',
    tags: ['seo'], primaryKeyword: 'rascunho'
  });

  const result = await listBlogArticles({ status: 'published', projectId: 'proj_r81', limit: 20 });
  assert.deepEqual(result.articles.map((item) => item.id), ['new', 'old']);
  assert.equal(result.total, 2);
});

test('R8.1 SEO: deep-link retorna somente versão publicada com consulta simples por slug', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.blogArticles).doc('draft').set({
    id: 'draft', slug: 'mesmo-slug-r81', title: 'Draft', excerpt: 'Draft', status: 'draft', publishedAt: '2026-09-05T09:00:00.000Z'
  });
  await db.collection(COLLECTIONS.blogArticles).doc('published').set({
    id: 'published', slug: 'mesmo-slug-r81', title: 'Publicado', excerpt: 'Publicado', status: 'published', publishedAt: '2026-09-05T10:00:00.000Z'
  });
  const article = await getBlogArticleBySlug('mesmo-slug-r81');
  assert.equal(article?.id, 'published');
  assert.equal(article?.status, 'published');
});

test('R8.1 SEO: contratos de crescimento orgânico permanecem ativos no código', () => {
  const blog = source('server/production/blogEngine.ts');
  assert.match(blog, /generateMarketingImage/);
  assert.match(blog, /coverImageGenerated/);
  assert.match(blog, /buildDynamicTopicR81/);
  assert.ok(!blog.includes("chosenTopicItem = pool[0] ||"), 'Pool esgotado não pode voltar ao primeiro tema e duplicar pauta.');
  assert.match(blog, /collection\(COLLECTIONS\.blogArticles\)\.orderBy\('publishedAt', 'desc'\)\.limit\(500\)\.get\(\)/);
  assert.ok(!/where\('status', '==', filters\.status\)[\s\S]{0,500}orderBy\('publishedAt'/.test(blog), 'Listagem pública não pode depender do índice composto status + publishedAt.');
  assert.match(blog, /url: '\/vitrine\/' \+ project\.slug/);
  assert.match(blog, /daily_blog_seo/);
  assert.match(blog, /PHOTO\/PULL_FROM_URL exige domínio\/URL verificado/);
  assert.match(blog, /new Set\(\['facebook', 'instagram', 'linkedin', 'x', 'pinterest'\]\)/);
  assert.match(blog, /Array\.from\(new Set<string>\(/);

  const publicPages = source('server/production/publicPages.ts');
  assert.match(publicPages, /collection\(COLLECTIONS\.blogArticles\)\.where\('slug', '==', slug\)\.limit\(5\)\.get\(\)/);
  assert.match(publicPages, /articleSnap\.docs\.find/);
  assert.match(publicPages, /listBlogArticles/);
  assert.match(publicPages, /data-portal-seo-prerender=\"article\"/);
  assert.match(publicPages, /data-portal-seo-prerender=\"blog\"/);
  assert.match(publicPages, /meta\.bodyHtml/);
  assert.match(publicPages, /seoHref/);
  assert.match(publicPages, /keywords:/);

  const scheduler = source('server/production/scheduler.ts');
  const blogIndex = scheduler.indexOf('SEO orgânico primeiro: cria os artigos antes das tarefas pesadas');
  const videoIndex = scheduler.indexOf('Process pending video jobs');
  assert.ok(blogIndex >= 0 && videoIndex >= 0 && blogIndex < videoIndex, 'Blog diário deve executar antes dos jobs pesados de vídeo.');

  const router = source('server/production/router.ts');
  assert.match(router, /collection\(COLLECTIONS\.blogArticles\)\.where\('status', '==', 'published'\)/);
  assert.match(router, /\/sitemap\.xml/);
});
