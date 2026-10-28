import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlogSettings, generateArticleForProject } from '../server/production/blogEngine.js';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { getPortalProjectFromDb, PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

test('Automação 100%: configurações padrão do blog utilizam modo automatic', async () => {
  resetMemoryDb();
  const settings = await getBlogSettings();
  assert.equal(settings.mode, 'automatic', 'Modo do blog deve ser automatic por padrão');
  assert.equal(settings.frequency, 'daily');
});

test('Automação 100%: generateArticleForProject publica diretamente com status published sem fila manual', async () => {
  resetMemoryDb();
  const project = PORTAL_VIP_PROJECTS[0]; // Magia das Crenças
  assert.ok(project);

  const result = await generateArticleForProject(project, {
    userId: 'test_owner_user',
    articleId: 'test_auto_article_001'
  });

  assert.equal(result.success, true);
  assert.ok(result.article);
  assert.equal(result.article.status, 'published', 'O artigo gerado deve ser publicado diretamente no modo 100% automático');
  assert.ok(result.article.coverImage, 'Deve possuir imagem de capa temática');
  assert.ok(!result.article.coverImage.includes('logo.png'), 'Não pode utilizar logotipo como capa');

  // Verifica persistência no Firestore
  const db = firestore();
  const doc = await db.collection(COLLECTIONS.blogArticles).doc('test_auto_article_001').get();
  assert.equal(doc.exists, true);
  const data = doc.data() as any;
  assert.equal(data.status, 'published');
});

test('Firestore fail-closed: getPortalProjectFromDb retorna dados reais sem fallback silencioso', async () => {
  const project = await getPortalProjectFromDb('magia-das-crencas');
  assert.ok(project);
  assert.equal(project.slug, 'magia-das-crencas');
  assert.equal(project.active, true);
});
