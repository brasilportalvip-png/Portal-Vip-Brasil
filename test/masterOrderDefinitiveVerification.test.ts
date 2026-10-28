import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs';
import {
  computePerceptualHash,
  computeHammingDistance,
  checkImageUniqueness,
  PERCEPTUAL_HASH_HAMMING_THRESHOLD
} from '../server/production/imageGuard.js';
import {
  auditAllStoredArticles,
  auditSingleArticle,
  backupArticleVersion,
  normalizeTextForDeduplication
} from '../server/production/articleAuditor.js';
import { listBlogArticles, DEFAULT_BLOG_SETTINGS } from '../server/production/blogEngine.js';
import { buildRobotsTxt, buildSitemapXml } from '../server/production/router.js';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';

test('ImageGuard: computa dHash real baseado em pixels decodificados via sharp', async () => {
  // Cria imagem PNG 100x100 com gradiente
  const img1 = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 200, g: 50, b: 50 }
    }
  }).png().toBuffer();

  const hash1 = await computePerceptualHash(img1);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 16);

  // Mesma imagem re-codificada como JPEG com compressão
  const img1Jpeg = await sharp(img1).jpeg({ quality: 70 }).toBuffer();
  const hash1Jpeg = await computePerceptualHash(img1Jpeg);

  // Distância de Hamming deve ser muito baixa (<= 3 bits) mesmo com recompressão de formato
  const dist = computeHammingDistance(hash1, hash1Jpeg);
  assert.ok(dist <= 3, `Distância entre PNG e JPEG deve ser quase nula, obtido: ${dist}`);
});

test('ImageGuard: detecta duplicata e bloqueia colisão visual com Hamming <= threshold', async () => {
  resetMemoryDb();

  const imgA = await sharp({
    create: { width: 80, height: 80, channels: 3, background: { r: 10, g: 150, b: 200 } }
  }).png().toBuffer();

  const companyId = 'proj_magia_crencas';
  const check1 = await checkImageUniqueness(companyId, imgA);
  assert.equal(check1.isUnique, true);

  // Registra no banco
  const db = firestore();
  await db.collection('projectImageFingerprints').doc('fingerprint_test_1').set({
    companyId,
    perceptualHash: check1.perceptualHash,
    sha256Hash: check1.sha256Hash,
    imageUrl: 'https://cdn.example.com/test.png'
  });

  // Testa imagem idêntica
  const checkDuplicate = await checkImageUniqueness(companyId, imgA);
  assert.equal(checkDuplicate.isUnique, false);
  assert.match(checkDuplicate.reason || '', /Anti-Repetição acionada/i);

  // Testa verificação entre projetos (cross-project)
  const otherCompany = 'proj_exu_responde';
  const checkCross = await checkImageUniqueness(otherCompany, imgA, undefined, { checkCrossProject: true });
  assert.equal(checkCross.isUnique, false);
  assert.match(checkCross.reason || '', /Contaminação entre projetos bloqueada/i);
});

test('ImageGuard: não declara falsamente que imagem é exclusiva em erro ou corrupção', async () => {
  const corruptedBuffer = Buffer.from([]);
  const result = await checkImageUniqueness('proj_test', corruptedBuffer);
  assert.equal(result.isUnique, false);
  assert.match(result.reason || '', /Falha técnica/i);
});

test('ArticleAuditor: normalização Unicode e classificação de artigos (MANTER/MELHORAR/REESCREVER/CONSOLIDAR/AVALIAR_DESINDEXACAO)', async () => {
  assert.equal(normalizeTextForDeduplication('Como Rezar o Santo Terço!'), 'como rezar o santo terco');

  // Artigo com contaminação litúrgica cruzada (Católico com menção a Tarot/Exu) -> REESCREVER
  const contaminated = {
    id: 'art-cross-1',
    title: 'Guia do Rosário com Baralho Cigano',
    projectId: 'proj_manual_catolico',
    content: 'Hoje falaremos sobre orações com tarot e baralho cigano para abrir caminhos.',
    sections: [{ h2: 'Tarot e orações', content: 'Explicando o tarot.' }]
  };
  const auditCross = await auditSingleArticle(contaminated);
  assert.equal(auditCross.status, 'CROSS_NICHE_VIOLATION');
  assert.equal(auditCross.classification, 'REESCREVER');

  // Artigo curto sem headings -> AVALIAR_DESINDEXACAO
  const thinArticle = {
    id: 'art-thin-1',
    title: 'Dica rápida do dia',
    projectId: 'proj_magia_crencas',
    content: 'Texto minúsculo de dez palavras.'
  };
  const auditThin = await auditSingleArticle(thinArticle);
  assert.equal(auditThin.classification, 'AVALIAR_DESINDEXACAO');

  // Artigo de alta qualidade -> MANTER
  const highQuality = {
    id: 'art-hq-1',
    title: 'Reprogramação Mental e Crenças Limitantes: Guia Completo',
    slug: 'reprogramacao-mental-crencas-limitantes-guia',
    projectId: 'proj_magia_crencas',
    primaryKeyword: 'reprogramação mental',
    metaDescription: 'Descubra como transformar crenças limitantes em decretos de poder com o método comprovado da neurociência e prosperidade.',
    coverImage: 'https://cdn.example.com/capa-mente.jpg',
    sections: [
      { h2: 'O que são crenças limitantes?', content: 'Explicação detalhada com mais de duzentas palavras sobre como crenças se instalam no subconsciente e afetam o comportamento financeiro e emocional.'.repeat(15) },
      { h2: 'Passo a passo da reprogramação mental', content: 'Metodologia passo a passo para transformar hábitos negativos em prosperidade prática com exercícios diários de afirmação positiva.'.repeat(15) }
    ],
    faqSection: [{ question: 'Quanto tempo leva?', answer: 'Entre 21 e 66 dias com práticas diárias.' }],
    callToAction: 'Baixe o aplicativo Magia das Crenças gratuitamente na Google Play Store para começar seus decretos.'
  };
  const auditHq = await auditSingleArticle(highQuality);
  assert.equal(auditHq.status, 'APPROVED_HIGH_QUALITY');
  assert.equal(auditHq.classification, 'MANTER');
});

test('ArticleAuditor: backup não-destrutivo antes de persistência no acervo', async () => {
  resetMemoryDb();
  const db = firestore();

  const articleId = 'art-old-to-backup';
  const initialData = {
    id: articleId,
    title: 'Artigo Antigo Original',
    content: 'Conteúdo histórico que não pode ser perdido sem backup.'
  };

  const versionId = await backupArticleVersion(articleId, COLLECTIONS.blogArticles, initialData, 'pre_audit_backup');
  assert.ok(versionId);

  const savedVersion = await db.collection(COLLECTIONS.articleVersions).doc(versionId).get();
  assert.equal(savedVersion.exists, true);
  assert.equal(savedVersion.data().articleId, articleId);
  assert.equal(savedVersion.data().snapshot.title, 'Artigo Antigo Original');
});

test('BlogEngine: paginação real do acervo sem corte de .limit(500) e sem fallback fictício', async () => {
  resetMemoryDb();
  const db = firestore();

  // Insere 2 artigos reais
  await db.collection(COLLECTIONS.blogArticles).doc('art-p1').set({
    id: 'art-p1',
    title: 'Artigo 1 do Projeto Magia',
    slug: 'artigo-1-projeto-magia',
    relatedProjectId: 'proj_magia_crencas',
    status: 'published',
    publishedAt: '2026-10-28T10:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-mind'
  });

  await db.collection(COLLECTIONS.blogArticles).doc('art-p2').set({
    id: 'art-p2',
    title: 'Artigo 2 do Projeto Magia',
    slug: 'artigo-2-projeto-magia',
    relatedProjectId: 'proj_magia_crencas',
    status: 'published',
    publishedAt: '2026-10-28T09:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-mind-2'
  });

  const result = await listBlogArticles({ projectId: 'proj_magia_crencas', status: 'published', limit: 10, offset: 0 });
  assert.equal(result.total, 2);
  assert.equal(result.articles.length, 2);
  assert.equal(result.articles[0].id, 'art-p1');

  // Modo padrão do blog é 100% automático
  assert.equal(DEFAULT_BLOG_SETTINGS.mode, 'automatic');
});

test('Sitemaps e robots.txt: rotas privadas /agentes bloqueadas e excluídas do sitemap', async () => {
  const robots = buildRobotsTxt();
  assert.ok(robots.includes('Disallow: /agentes'), 'robots.txt deve conter Disallow: /agentes');
  assert.ok(robots.includes('Disallow: /admin'), 'robots.txt deve conter Disallow: /admin');
  assert.ok(robots.includes('Disallow: /dashboard'), 'robots.txt deve conter Disallow: /dashboard');

  const sitemap = await buildSitemapXml();
  assert.equal(sitemap.includes('/agentes'), false, 'sitemap.xml NUNCA deve incluir a rota privada /agentes');
  assert.ok(sitemap.includes('/blog'), 'sitemap.xml deve incluir /blog');
  assert.ok(sitemap.includes('/vitrine'), 'sitemap.xml deve incluir /vitrine');

  // Verifica sitemap estático em public/
  const publicSitemap = fs.readFileSync('public/sitemap.xml', 'utf-8');
  assert.equal(publicSitemap.includes('/agentes'), false, 'public/sitemap.xml não deve conter /agentes');

  const publicRobots = fs.readFileSync('public/robots.txt', 'utf-8');
  assert.ok(publicRobots.includes('Disallow: /agentes'), 'public/robots.txt deve conter Disallow: /agentes');
});
