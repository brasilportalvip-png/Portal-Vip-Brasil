import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTAL_VIP_PROJECTS,
  getProjectBySlug,
  listAllPortalProjectsFromDb,
  seedPortalProjectsIfEmpty
} from '../server/production/almaPortfolio.js';
import { runDailyPortalMarketingCycle } from '../server/production/antiFallEngine.js';
import { runDailyBlogCycle } from '../server/production/blogEngine.js';
import { publishInstagramMedia, initYouTubeResumableUpload, publishText } from '../server/production/social.js';

test('Portal Vip Brasil - 7 Projetos Oficiais Iniciais', async () => {
  assert.equal(PORTAL_VIP_PROJECTS.length, 7, 'Devem existir 7 projetos oficiais iniciais pré-configurados');
  
  const slugs = PORTAL_VIP_PROJECTS.map((p) => p.slug);
  assert.ok(slugs.includes('magia-das-crencas'));
  assert.ok(slugs.includes('exu-responde'));
  assert.ok(slugs.includes('maria-padilha'));
  assert.ok(slugs.includes('manual-catolico'));
  assert.ok(slugs.includes('froc-ia'));
  assert.ok(slugs.includes('oraculos'));
  assert.ok(slugs.includes('froc-ia-marketing-engine'));

  const mariaPadilha = getProjectBySlug('maria-padilha');
  assert.ok(mariaPadilha, 'Projeto Maria Padilha deve ser encontrado por slug');
  assert.equal(mariaPadilha?.name, 'Maria Padilha Rainha das 7 Encruzilhadas');
});

test('Portal Vip Brasil - Seed Idempotente de Projetos', async () => {
  const seed1 = await seedPortalProjectsIfEmpty();
  assert.ok(seed1.totalProjects >= 7, 'Total de projetos deve ser pelo menos 7');

  const seed2 = await seedPortalProjectsIfEmpty();
  assert.equal(seed2.seededCount, 0, 'Execuções subsequentes de seed devem ser idempotentes e não duplicar');
  assert.equal(seed2.totalProjects, seed1.totalProjects);
});

test('Portal Vip Brasil - Ciclo Diário de Marketing Processa Todos os Projetos Ativos', async () => {
  const marketingResult = await runDailyPortalMarketingCycle('test_user_admin');
  assert.equal(marketingResult.success, true);
  assert.ok(marketingResult.totalProjects >= 7, 'O ciclo diário deve processar todos os projetos ativos, não apenas 1');
  assert.ok(marketingResult.itemsGenerated.length >= 7, 'Devem ser gerados itens para todos os projetos ativos');
});

test('Portal Vip Brasil - Ciclo Diário do Blog Processa Todos os Projetos Ativos', async () => {
  const blogResult = await runDailyBlogCycle('test_user_admin');
  assert.equal(blogResult.success, true);
  assert.ok(blogResult.totalProjects >= 7, 'O ciclo do blog deve processar todos os projetos ativos');
  assert.ok(blogResult.articlesGenerated.length >= 7, 'Artigos devem ser gerados para cada projeto');
  
  for (const article of blogResult.articlesGenerated) {
    assert.ok(article.projectId, 'Cada artigo deve ter o projectId associado');
    assert.ok(article.title, 'Cada artigo deve ter um título');
    assert.ok(article.sections?.length > 0 || article.excerpt, 'Cada artigo deve ter conteúdo útil nas seções');
  }
});

test('Portal Vip Brasil - Redes Sociais: Instagram Rejeita Publicação Apenas de Texto', async () => {
  await assert.rejects(
    async () => {
      await publishInstagramMedia({
        userId: 'test_user',
        companyId: 'portal_vip',
        caption: 'Teste sem imagem'
        // Sem imageUrl nem videoUrl
      });
    },
    /imagem ou vídeo|imageUrl ou videoUrl/i,
    'Instagram deve exigir imagem ou vídeo para publicar'
  );
});

test('Portal Vip Brasil - Redes Sociais: YouTube Rejeita Publicação Sem Título/Vídeo', async () => {
  await assert.rejects(
    async () => {
      await initYouTubeResumableUpload({
        userId: 'test_user',
        companyId: 'portal_vip',
        title: ''
      });
    },
    /obrigatório|Título do vídeo/i,
    'YouTube deve validar campos obrigatórios'
  );
});

test('Portal Vip Brasil - Redes Sociais: Sem Conexão Não Simula Sucesso Falso', async () => {
  const result = await publishText({
    userId: 'unconnected_user_id_12345',
    companyId: 'unconnected_company_99999',
    provider: 'x',
    text: 'Teste de segurança'
  });

  assert.equal(result.externalState, 'confirmed_failed', 'Provedor sem conexão não pode simular sucesso');
  assert.ok(result.error, 'Deve retornar mensagem clara de erro quando não conectado');
});
