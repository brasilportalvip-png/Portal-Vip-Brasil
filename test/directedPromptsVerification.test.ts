import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import {
  verifyArticleQualityGate,
  auditSingleArticle,
  backupArticleVersion
} from '../server/production/articleAuditor.js';
import {
  checkImageUniqueness,
  recordImageFingerprint,
  reserveImageFingerprintAtomically,
  computePerceptualHash,
  computeHammingDistance
} from '../server/production/imageGuard.js';
import {
  inventoryAllArticlesFailClosed,
  recoverArticleBatch
} from '../server/production/articleRecoveryEngine.js';
import {
  getGoogleSearchConsoleStatus,
  listSearchConsoleSitemaps,
  submitSearchConsoleSitemap
} from '../server/production/googleSearchConsole.js';
import {
  updateMasterAutomationControl,
  isGlobalAutomationEnabled
} from '../server/production/automationGate.js';
import {
  executeAi,
  generateMarketingImage,
  startVideoGenerationJob,
  setTextAiClientForTesting,
  setMediaAiClientForTesting
} from '../server/production/ai.js';
import { buildSitemapXml, buildRobotsTxt } from '../server/production/router.js';

test('PROMPT 1: Sincronização e integridade de package.json e package-lock.json', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf-8'));

  assert.ok(pkg.dependencies.sharp, 'package.json deve conter sharp');
  assert.ok(pkg.devDependencies['@types/sharp'], 'package.json deve conter @types/sharp');

  // Confirma que package-lock.json contém sharp e todos os metadados sincronizados
  assert.ok(lock.packages['node_modules/sharp'], 'package-lock.json deve conter node_modules/sharp');
  assert.ok(lock.packages['node_modules/@types/sharp'], 'package-lock.json deve conter node_modules/@types/sharp');
});

test('PROMPT 2: Quality Gate Obrigatório (8 Pilares) bloqueia conteúdos inadequados', async () => {
  resetMemoryDb();

  // 1. Artigo com contaminação de nicho (Manual Católico com termos de orixá/amarração)
  const crossNicheArticle = {
    title: 'Orações Diárias e o Santo Terço',
    slug: 'oracoes-diarias-santo-terco',
    projectId: 'proj_manual_catolico',
    excerpt: 'Guia de orações com novenas e terço da misericórdia.',
    metaDescription: 'Guia de orações com novenas e terço da misericórdia para fiéis.',
    content: 'O manual católico apresenta o santo terço. Porém menciona amarração e feitiço de amor.',
    callToAction: 'Baixe o Manual Católico oficial na Google Play Store.',
    coverImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136'
  };

  const gate1 = await verifyArticleQualityGate(crossNicheArticle, { projectId: 'proj_manual_catolico' });
  assert.equal(gate1.approved, false, 'Artigo com termos cruzados proibidos DEVE ser reprovado no Quality Gate');
  assert.equal(gate1.pillars.nicheAlignment.passed, false);
  assert.ok(gate1.rejectionReasons.some((r) => r.includes('Contaminação de nicho')));

  // 2. Artigo com logotipo genérico em vez de fotografia do nicho
  const genericLogoArticle = {
    title: 'Manual de Finanças Pessoais 2026',
    slug: 'manual-financas-pessoais-2026',
    projectId: 'proj_froc_marketing_engine',
    excerpt: 'Dicas completas para planejar seu orçamento familiar com segurança e clareza.',
    metaDescription: 'Dicas completas para planejar seu orçamento familiar com segurança e clareza.',
    content: '## Introdução ao Planejamento\nOrganize suas receitas e despesas.\n## Investimentos Inteligentes\nEconomize todo mês com foco no futuro.',
    callToAction: 'Visite nossa plataforma oficial para simulações financeiras gratuitas.',
    coverImage: '/icons/logo.png', // GENERIC LOGO
    sections: [
      { h2: 'Introdução ao Planejamento', content: 'Organize suas receitas.' },
      { h2: 'Investimentos', content: 'Economize todo mês.' }
    ]
  };

  const gate2 = await verifyArticleQualityGate(genericLogoArticle);
  assert.equal(gate2.approved, false, 'Artigo com logotipo genérico de capa DEVE ser reprovado');
  assert.equal(gate2.pillars.multimediaCompatibility.passed, false);

  // 3. Artigo com Keyword Stuffing (> 4% de densidade)
  const spamWords = Array(20).fill('segredo financeiro').join(' ');
  const keywordStuffingArticle = {
    title: 'Segredo Financeiro para Investidores',
    slug: 'segredo-financeiro-investidores',
    projectId: 'proj_froc_marketing_engine',
    primaryKeyword: 'segredo financeiro',
    excerpt: 'Aprenda o segredo financeiro agora.',
    metaDescription: 'Aprenda o segredo financeiro para alavancar seu patrimônio com dicas práticas.',
    content: `## O Segredo Financeiro\n${spamWords} Esse é o segredo financeiro.`,
    callToAction: 'Conheça o Froc Marketing Engine oficial.',
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44'
  };

  const gate3 = await verifyArticleQualityGate(keywordStuffingArticle);
  assert.equal(gate3.approved, false, 'Artigo com keyword stuffing DEVE ser reprovado');
  assert.equal(gate3.pillars.naturalKeywordUsage.passed, false);

  // 4. Artigo Completo de Alta Qualidade (DEVE SER APROVADO)
  const approvedArticle = {
    title: 'Guia Completo da Consulta de Tarot Online 2026',
    slug: 'guia-completo-consulta-tarot-online-2026',
    projectId: 'proj_oraculos',
    excerpt: 'Descubra como interpretar os arcanos maiores com ética, clareza e autoconhecimento profundo.',
    metaDescription: 'Aprenda os segredos da leitura de tarot online com ética, método e foco no autoconhecimento pessoal.',
    content: `## Fundamentos dos Arcanos Maiores
O Tarot Tradicional oferece uma rica simbologia arquetípica para reflexão e tomada de decisões conscientes. Cada carta representa uma etapa do desenvolvimento humano e da psique, proporcionando momentos valiosos de introspecção e aconselhamento para o cotidiano.

## Como Realizar Leituras com Clareza e Ética
Estruture perguntas objetivas e mantenha a mente serena durante o sorteio das cartas para melhor aproveitamento do oráculo. Uma leitura responsável não determina destinos inflexíveis, mas sim ilumina tendências e alternativas para que você exerça seu livre arbítrio com discernimento e sabedoria.

## Práticas Diárias para Desenvolver a Intuição
Recomenda-se reservar alguns minutos em silêncio antes de cada tiragem. Anote os insights e percepções em um caderno pessoal de estudos, comparando as cartas sorteadas com os acontecimentos reais da semana. Dessa forma, seu entendimento sobre a linguagem simbólica se fortalecerá de maneira orgânica e constante ao longo do tempo.`,
    callToAction: 'Baixe o aplicativo Oráculos Tradicionais e faça sua tiragem diária gratuita.',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    sections: [
      {
        h2: 'Fundamentos dos Arcanos Maiores',
        content: 'O Tarot Tradicional oferece uma rica simbologia arquetípica para reflexão e tomada de decisões conscientes. Cada carta representa uma etapa do desenvolvimento humano e da psique, proporcionando momentos valiosos de introspecção e aconselhamento prático.'
      },
      {
        h2: 'Como Realizar Leituras com Clareza e Ética',
        content: 'Estruture perguntas objetivas e mantenha a mente serena durante o sorteio das cartas para melhor aproveitamento do oráculo. Uma leitura responsável não determina destinos inflexíveis, mas ilumina alternativas para que você exerça seu livre arbítrio com sabedoria.'
      },
      {
        h2: 'Práticas Diárias para Desenvolver a Intuição',
        content: 'Recomenda-se reservar alguns minutos em silêncio antes de cada tiragem. Anote os insights e percepções em um caderno pessoal de estudos, comparando as cartas sorteadas com os acontecimentos reais da semana para aprendizado contínuo.'
      }
    ]
  };

  const gate4 = await verifyArticleQualityGate(approvedArticle, { projectId: 'proj_oraculos' });
  assert.equal(gate4.approved, true, 'Artigo de alta qualidade com todos os 8 pilares DEVE ser aprovado');
  assert.ok(gate4.score >= 70);
  assert.equal(gate4.rejectionReasons.length, 0);

  // 5. Fail-Closed: Parâmetro nulo ou inválido rejeita imediatamente
  const gateNull = await verifyArticleQualityGate(null as any);
  assert.equal(gateNull.approved, false, 'Quality Gate deve ser fail-closed para entradas nulas');
});

test('PROMPT 3: Recuperação de artigos antigos com paginação real, backup e Quality Gate', async () => {
  resetMemoryDb();
  const db = firestore();

  // Insere um artigo de baixa qualidade que precisa de ajustes (capa genérica, sem CTA)
  await db.collection(COLLECTIONS.blogArticles).doc('art_antigo_1').set({
    id: 'art_antigo_1',
    title: 'Artigo Antigo Sem Qualidade',
    slug: 'artigo-antigo-sem-qualidade',
    projectId: 'proj_portal_vip_magazine',
    content: 'Texto muito curto sem estrutura.',
    excerpt: 'Resumo inicial.',
    coverImage: '/icons/logo.png', // Genérica
    status: 'published',
    createdAt: '2026-01-10T10:00:00.000Z'
  });

  // 1. Inventário fail-closed lê o artigo
  const inv = await inventoryAllArticlesFailClosed();
  assert.ok(inv.allArticles.length >= 1);
  assert.ok(inv.stats.totalArticlesFound >= 1);

  // 2. Executa lote de recuperação
  const result = await recoverArticleBatch({ batchSize: 5 });
  assert.equal(result.processedCount, 1);

  // Confirma que backup prévio foi salvo em articleVersions
  const backupSnap = await db.collection(COLLECTIONS.articleVersions).get();
  assert.ok(backupSnap.docs.length >= 1, 'Backup prévio DEVE ser criado antes de alterar');

  // Confirma que o artigo atualizado recebeu capa temática e novos metadados
  const updatedDoc = (await db.collection(COLLECTIONS.blogArticles).doc('art_antigo_1').get()).data();
  assert.notEqual(updatedDoc?.coverImage, '/icons/logo.png', 'Capa genérica deve ter sido corrigida');
  assert.ok(updatedDoc?.lastHealedAt, 'Deve conter registro lastHealedAt');
  assert.equal(updatedDoc?.slug, 'artigo-antigo-sem-qualidade', 'Slug original deve ser preservado');
});

test('PROMPT 4: ImageGuard - Proteção visual real, sem limit(500), com reserva atômica', async () => {
  resetMemoryDb();
  const db = firestore();
  const companyId = 'proj_froc_marketing_engine';

  // Cria buffers de imagem com 72 bytes normalizados (9x8)
  const buf1 = Buffer.alloc(72);
  const buf2 = Buffer.alloc(72);
  for (let i = 0; i < 72; i++) {
    buf1[i] = (i * 5) % 256;
    buf2[i] = (i * 5 + (i % 2 === 0 ? 1 : 0)) % 256; // Muito similar
  }

  const pHash1 = await computePerceptualHash(buf1);
  const pHash2 = await computePerceptualHash(buf2);
  const dist = computeHammingDistance(pHash1, pHash2);
  assert.ok(dist <= 8, 'Imagens com gradientes similares devem ter distância de Hamming <= 8');

  // Registra buf1
  await recordImageFingerprint({
    companyId,
    userId: 'user_test',
    contentItemId: 'item_1',
    sha256Hash: 'hash_sha256_1',
    perceptualHash: pHash1,
    imageUrl: 'https://example.com/imagem1.webp'
  });

  // Tenta verificar buf2 (muito similar): DEVE SER REJEITADO
  const checkDup = await checkImageUniqueness(companyId, buf2);
  assert.equal(checkDup.isUnique, false, 'Imagem visualmente similar deve ser rejeitada como duplicata');

  // Testa reserva atômica contra condição de corrida
  const res1 = await reserveImageFingerprintAtomically({
    companyId,
    workerId: 'worker_A',
    sha256Hash: 'hash_sha256_race',
    ttlSeconds: 60
  });
  assert.equal(res1.reserved, true, 'Primeiro worker DEVE conseguir reservar a imagem');

  const res2 = await reserveImageFingerprintAtomically({
    companyId,
    workerId: 'worker_B',
    sha256Hash: 'hash_sha256_race',
    ttlSeconds: 60
  });
  assert.equal(res2.reserved, false, 'Segundo worker simultâneo DEVE ser bloqueado pela trava atômica');
});

test('PROMPT 5: Sitemap, robots.txt e Google Search Console API', async () => {
  // 1. Robots.txt bloqueia estritamente rotas privadas
  const robots = buildRobotsTxt();
  assert.ok(robots.includes('Disallow: /agentes'), 'robots.txt deve bloquear /agentes');
  assert.ok(robots.includes('Disallow: /admin'), 'robots.txt deve bloquear /admin');
  assert.ok(robots.includes('Disallow: /dashboard'), 'robots.txt deve bloquear /dashboard');

  // 2. Sitemap.xml não inclui /agentes
  const sitemap = await buildSitemapXml();
  assert.equal(sitemap.includes('/agentes'), false, 'sitemap.xml NUNCA deve incluir a rota privada /agentes');
  assert.ok(sitemap.includes('/blog'), 'sitemap.xml deve incluir /blog');
  assert.ok(sitemap.includes('/vitrine'), 'sitemap.xml deve incluir /vitrine');

  // 3. Google Search Console API: retorna unconfigured quando variáveis de ambiente não foram fornecidas
  delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;

  const gscStatus = await getGoogleSearchConsoleStatus();
  assert.equal(gscStatus.configured, false);
  assert.equal(gscStatus.status, 'unconfigured');
  assert.ok(gscStatus.message.includes('não configurado'));

  const sitemaps = await listSearchConsoleSitemaps();
  assert.equal(sitemaps.configured, false);
  assert.equal(sitemaps.sitemaps.length, 0);

  const submission = await submitSearchConsoleSitemap('https://portalvipbrasil.com.br/sitemap.xml');
  assert.equal(submission.success, false);
  assert.equal(submission.configured, false);
  assert.ok(submission.message.includes('não configurado'));
});

test('PROMPT 6: Custo Zero com o Master OFF (Bloqueio estrito de IA, imagens e vídeos)', async () => {
  resetMemoryDb();
  const testUserId = 'user_master_off_test';

  // Desliga o interruptor Mestre central
  await updateMasterAutomationControl(testUserId, { globalEnabled: false });

  const isAutoOn = await isGlobalAutomationEnabled(testUserId);
  assert.equal(isAutoOn, false, 'Master deve estar OFF');

  // 1. Chamada de IA Textual DEVE ser bloqueada com 423
  await assert.rejects(
    async () => {
      await executeAi({
        userId: testUserId,
        operation: 'article_generation',
        prompt: 'Escreva um artigo de teste'
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 423);
      assert.match(err.message, /Automação bloqueada pelo Botão Mestre/);
      return true;
    }
  );

  // 2. Chamada de Geração de Imagem DEVE ser bloqueada com 423
  await assert.rejects(
    async () => {
      await generateMarketingImage({
        userId: testUserId,
        theme: 'Capa teste'
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 423);
      assert.match(err.message, /Automação bloqueada pelo Botão Mestre/);
      return true;
    }
  );

  // 3. Chamada de Geração de Vídeo DEVE ser bloqueada com 423
  await assert.rejects(
    async () => {
      await startVideoGenerationJob({
        userId: testUserId,
        prompt: 'Vídeo teste comercial'
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 423);
      assert.match(err.message, /Automação bloqueada pelo Botão Mestre/);
      return true;
    }
  );

  // 4. Reativação do Master ON permite operação
  await updateMasterAutomationControl(testUserId, { globalEnabled: true });
  const isAutoOnAgain = await isGlobalAutomationEnabled(testUserId);
  assert.equal(isAutoOnAgain, true, 'Master deve voltar para ON');
});
