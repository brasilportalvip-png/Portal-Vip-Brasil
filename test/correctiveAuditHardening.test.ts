import test from 'node:test';
import assert from 'node:assert/strict';
import { firestore, resetMemoryDb, COLLECTIONS, nowIso } from '../server/production/store.js';
import {
  DEFAULT_MASTER_AUTOMATION,
  getMasterAutomationControl,
  isGlobalAutomationEnabled,
  isProjectAutomationEnabled,
  assertAutomationAllowed
} from '../server/production/automationGate.js';
import { verifyArticleQualityGate } from '../server/production/articleAuditor.js';
import {
  checkImageUniqueness,
  reserveImageFingerprintAtomically,
  computePerceptualHash
} from '../server/production/imageGuard.js';
import { recoverArticleBatch } from '../server/production/articleRecoveryEngine.js';
import { buildSitemapXml } from '../server/production/router.js';
import {
  getGoogleSearchConsoleStatus,
  querySearchAnalytics
} from '../server/production/googleSearchConsole.js';
import { preflightReserveBudget } from '../server/production/financialGuardian.js';

test('P0: Master OFF - Fail-closed estrito com documento ausente ou erro de banco', async () => {
  resetMemoryDb();

  // 1. Configuração padrão ausente: estritamente false
  assert.equal(DEFAULT_MASTER_AUTOMATION.globalEnabled, false, 'Default deve ser false');
  assert.equal(DEFAULT_MASTER_AUTOMATION.pauseAllExternalApis, true);

  // 2. Consulta com documento inexistente no Firestore retorna globalEnabled = false
  const controlMissing = await getMasterAutomationControl();
  assert.equal(controlMissing.globalEnabled, false);
  assert.equal(controlMissing.pauseAllExternalApis, true);
  assert.equal(await isGlobalAutomationEnabled(), false);

  // 3. Documento de usuário com enabled=true NÃO ignora o Master OFF global
  const db = firestore();
  await db.collection(COLLECTIONS.systemSettings).doc('master_control_user_outdated').set({
    globalEnabled: true,
    pauseAllExternalApis: false
  });
  // Global permanece desligado
  const controlUser = await getMasterAutomationControl('user_outdated');
  assert.equal(controlUser.globalEnabled, false, 'Master OFF global deve prevalecer sobre documento de usuário');
  assert.equal(await isGlobalAutomationEnabled('user_outdated'), false);

  // 4. assertAutomationAllowed lança HTTP 423
  await assert.rejects(
    async () => assertAutomationAllowed({ userId: 'user_outdated' }),
    (err: any) => err.statusCode === 423 && err.code === 'GLOBAL_AUTOMATION_LOCKED'
  );
});

test('P0: Master OFF - Projeto desligado e proteção de teto financeiro', async () => {
  resetMemoryDb();
  const db = firestore();

  // Liga o Master globalmente
  await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').set({
    globalEnabled: true,
    pauseAllExternalApis: false,
    projectToggles: {
      proj_oraculos: false // Projeto explicitamente desligado
    }
  });

  assert.equal(await isGlobalAutomationEnabled(), true);
  assert.equal(await isProjectAutomationEnabled('proj_oraculos'), false);

  // Tentativa de execução no projeto desligado lança 423
  await assert.rejects(
    async () => assertAutomationAllowed({ projectId: 'proj_oraculos' }),
    (err: any) => err.statusCode === 423 && err.code === 'PROJECT_AUTOMATION_LOCKED'
  );

  // Estouro de orçamento mensal
  await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').set({
    globalEnabled: true,
    pauseAllExternalApis: false,
    monthlyBudgetCapUsd: 0.0001, // Teto minúsculo
    monthlyBudgetCapBrl: 0.0005
  }, { merge: true });

  await assert.rejects(
    async () => assertAutomationAllowed({ userId: 'user_cap_test', operationType: 'video' }),
    (err: any) => err.statusCode === 423 && err.code === 'BUDGET_CAP_EXCEEDED'
  );
});

test('P1: Recuperação de artigos sem boilerplate artificial e com checkpoint persistente', async () => {
  resetMemoryDb();
  const db = firestore();

  // Liga Master
  await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').set({
    globalEnabled: true,
    pauseAllExternalApis: false
  });

  // Cria artigo antigo curto
  await db.collection(COLLECTIONS.blogArticles).doc('art_p1_sample').set({
    id: 'art_p1_sample',
    title: 'Novenas e Proteção Espiritual',
    slug: 'novenas-protecao-espiritual',
    projectId: 'proj_manual_catolico',
    content: 'Pequeno texto inicial.',
    coverImage: '/icons/logo.png', // Capa genérica que deve ser corrigida
    status: 'published'
  });

  const recoveryResult = await recoverArticleBatch({ batchSize: 5 });
  assert.equal(recoveryResult.success, true);
  assert.equal(recoveryResult.processedCount, 1);
  assert.equal(recoveryResult.healedCount + recoveryResult.rewrittenCount, 1);

  // Verifica que o texto não contém frases genéricas de preenchimento
  const updatedDoc = (await db.collection(COLLECTIONS.blogArticles).doc('art_p1_sample').get()).data() as any;
  assert.ok(!updatedDoc.content.includes('fillerWords'));
  assert.ok(updatedDoc.content.length > 250);
  assert.notEqual(updatedDoc.coverImage, '/icons/logo.png');

  // Verifica checkpoint persistido no Firestore
  const chkDoc = await db.collection(COLLECTIONS.systemSettings).doc('article_recovery_checkpoint').get();
  assert.equal(chkDoc.exists, true);
  assert.equal((chkDoc.data() as any).lastArticleId, 'art_p1_sample');
});

test('P2: Quality Gate - Reprovação de conteúdo vazio, repetitivo e factual falso mesmo com >300 palavras', async () => {
  // 1. Artigo com mais de 300 palavras mas baixa diversidade lexical (repetição excessiva de mesma frase)
  const repetitiveArticle = {
    title: 'Estratégias de Crescimento Digital 2026',
    slug: 'estrategias-crescimento-digital-2026',
    projectId: 'proj_froc_marketing_engine',
    excerpt: 'Guia completo com dicas para expandir sua presença online no mercado atual.',
    metaDescription: 'Guia completo com dicas para expandir sua presença online no mercado atual com resultados.',
    callToAction: 'Acesse o site oficial da plataforma para conhecer as soluções completas.',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    sections: [
      {
        h2: 'Crescimento e Estratégia',
        content: Array(15).fill('Esta é uma frase repetida para preencher espaço de forma artificial sem conteúdo novo.').join(' ')
      },
      {
        h2: 'Planejamento e Execução',
        content: Array(15).fill('Esta é uma frase repetida para preencher espaço de forma artificial sem conteúdo novo.').join(' ')
      }
    ]
  };

  const gateRepetitive = await verifyArticleQualityGate(repetitiveArticle);
  assert.equal(gateRepetitive.approved, false, 'Artigo com repetição excessiva (baixa diversidade lexical) DEVE ser reprovado');
  assert.equal(gateRepetitive.pillars.editorialQualityGrammar.passed, false);

  // 2. Artigo com alegação factual enganosa (promessa institucional falsa / ANVISA)
  const fakeClaimArticle = {
    title: 'Guia Completo da Espiritualidade e Bem Estar',
    slug: 'guia-espiritualidade-bem-estar',
    projectId: 'proj_magia_crencas',
    excerpt: 'Descubra ensinamentos fundamentais para harmonizar sua mente e sua jornada diária.',
    metaDescription: 'Descubra ensinamentos fundamentais para harmonizar sua mente e sua jornada diária com clareza.',
    callToAction: 'Visite a plataforma oficial e conheça os programas de desenvolvimento pessoal.',
    coverImage: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5',
    content: '## Introdução ao Bem-Estar\nPráticas mentais auxiliam na clareza mental e no foco diário dos praticantes.\n\n## Cura Definitiva Aprovada pela Anvisa\nNosso método foi 100% comprovado com cura mística definitiva e aprovado pela anvisa para todos os males.',
    sections: [
      {
        h2: 'Introdução ao Bem-Estar',
        content: 'Práticas mentais auxiliam na clareza mental e no foco diário dos praticantes de forma responsável.'
      },
      {
        h2: 'Cura Aprovada',
        content: 'Alega cura mística definitiva e diz ser aprovado pela anvisa sem qualquer risco.'
      }
    ]
  };

  const gateFake = await verifyArticleQualityGate(fakeClaimArticle);
  assert.equal(gateFake.approved, false, 'Artigo com alegação institucional inverídica DEVE ser reprovado');
  assert.equal(gateFake.pillars.factualPrecisionNoHallucination.passed, false);
});

test('P3: ImageGuard - Reserva atômica por dHash perceptual bloqueia imagens reencodadas', async () => {
  resetMemoryDb();

  const buf = Buffer.alloc(72);
  for (let i = 0; i < 72; i++) buf[i] = (i * 7) % 256;
  const pHash = await computePerceptualHash(buf);

  // Worker 1 reserva com SHA-256 A
  const res1 = await reserveImageFingerprintAtomically({
    companyId: 'proj_test',
    workerId: 'worker_1',
    sha256Hash: 'sha256_versao_a',
    perceptualHash: pHash
  });
  assert.equal(res1.reserved, true);

  // Worker 2 tenta publicar a mesma imagem reencodada (SHA-256 B, mas mesmo pHash)
  const res2 = await reserveImageFingerprintAtomically({
    companyId: 'proj_test',
    workerId: 'worker_2',
    sha256Hash: 'sha256_versao_b_reencodada',
    perceptualHash: pHash // Mesmo hash perceptual
  });
  assert.equal(res2.reserved, false, 'Reserva atômica DEVE bloquear colisão visual mesmo com SHA-256 diferente');
  assert.ok(res2.reason?.includes('visualmente equivalente'));
});

test('P4: Sitemap dinâmico - Exclusão de rotas privadas, XML válido e sem artigos de exemplo', async () => {
  resetMemoryDb();
  const db = firestore();

  await db.collection(COLLECTIONS.blogArticles).doc('art_real_1').set({
    id: 'art_real_1',
    title: 'Artigo Real de Produção',
    slug: 'artigo-real-de-producao',
    status: 'published',
    publishedAt: '2026-03-15T12:00:00.000Z'
  });

  await db.collection(COLLECTIONS.blogArticles).doc('art_noindex').set({
    id: 'art_noindex',
    title: 'Artigo Bloqueado',
    slug: 'artigo-bloqueado',
    status: 'published',
    noindex: true
  });

  const xml = await buildSitemapXml();
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('/blog/artigo-real-de-producao'));
  assert.ok(!xml.includes('/blog/artigo-bloqueado'), 'Páginas noindex NÃO podem estar no sitemap');
  assert.ok(!xml.includes('/agentes'), 'Rotas privadas NÃO podem estar no sitemap');
  assert.ok(!xml.includes('/admin'), 'Rotas de administração NÃO podem estar no sitemap');
  assert.ok(!xml.includes('/dashboard'), 'Dashboard NÃO pode estar no sitemap');
});

test('P5: Google Search Console - Diferenciação de status e Search Analytics sem dados falsos', async () => {
  // Sem credenciais no ambiente de teste
  delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
  delete process.env.GOOGLE_PRIVATE_KEY;

  const status = await getGoogleSearchConsoleStatus();
  assert.equal(status.configured, false);
  assert.equal(status.status, 'unconfigured');
  assert.ok(status.message.includes('não configurado'));

  const analytics = await querySearchAnalytics();
  assert.equal(analytics.configured, false);
  assert.equal(analytics.rows.length, 0);
  assert.equal(analytics.totalClicks, 0);
  assert.ok(analytics.error);
});
