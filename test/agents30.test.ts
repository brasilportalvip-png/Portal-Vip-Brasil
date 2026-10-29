import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_30_AGENTS,
  CANONICAL_AGENT_IDS,
  getAgentSpec,
  processAgentInteraction
} from '../server/production/agents.js';
import { updateMasterAutomationControl } from '../server/production/automationGate.js';

test.before(async () => {
  await updateMasterAutomationControl('setup', { globalEnabled: true, pauseAllExternalApis: false });
});

test('30 Agentes: Todos os 30 agentes oficiais estão cadastrados com IDs canônicos', () => {
  assert.equal(CANONICAL_AGENT_IDS.length, 30, 'Devem existir exatamente 30 agentes cadastrados');
  assert.equal(Object.keys(CANONICAL_30_AGENTS).length, 30);

  const expectedIds = [
    'TECH_LEAD_CORE',
    'AI_SYSTEMS_ARCHITECT',
    'DEV_OPS_CLOUD',
    'SECURITY_CYBER_GUARD',
    'YOAST_SEO_SPECIALIST',
    'XML_SITEMAP_ARCHITECT',
    'SEARCH_ENGINE_PING_MASTER',
    'ASO_GOOGLE_PLAY',
    'PORTUGUESE_COPYWRITER',
    'STORYTELLING_HOOKS',
    'EDITORIAL_BLOG_CHIEF',
    'EMAIL_RETENTION_COPY',
    'META_ADS_PRO',
    'GOOGLE_SEARCH_ADS_PRO',
    'TIKTOK_ADS_GROWTH',
    'PINTEREST_ADS_EXPERT',
    'LINKEDIN_B2B_ADS',
    'YOUTUBE_SHORTS_ADS',
    'VEO_VIDEO_PROMPT_DIRECTOR',
    'ANTI_REPETITION_ART_DIRECTOR',
    'CAROUSEL_DESIGN_MASTER',
    'THUMBNAIL_CTR_ENGINEER',
    'MARKETING_GROWTH_LEAD',
    'CRO_CONVERSION_RATE',
    'ANALYTICS_ROI_TRACKER',
    'COMPETITOR_INTELLIGENCE',
    'RUNIC_NORDIC_EXPERT',
    'TAROT_ORACLES_MASTER',
    'LOVE_PADILHA_SPECIALIST',
    'AFRO_DEFENDER_GUARDIAN'
  ];

  for (const id of expectedIds) {
    const spec = getAgentSpec(id);
    assert.ok(spec, `Agente ${id} deve existir no catálogo oficial`);
    assert.equal(spec.id, id);
    assert.ok(spec.name.length > 0, `Nome do agente ${id} não pode ser vazio`);
    assert.ok(spec.systemInstruction.length > 50, `Instrução do agente ${id} deve ser detalhada`);
  }
});

test('30 Agentes: Validação estrita contra fallback silencioso (rejeita IDs desconhecidos com 400)', async () => {
  const invalidId = 'NON_EXISTENT_AGENT_123';
  assert.equal(getAgentSpec(invalidId), null, 'ID inválido não deve retornar spec');

  await assert.rejects(
    async () => {
      await processAgentInteraction({
        agentId: invalidId,
        prompt: 'Olá, teste de agente inválido'
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Agente não reconhecido/);
      assert.ok(Array.isArray(err.validAgentIds));
      assert.equal(err.validAgentIds.length, 30);
      return true;
    }
  );
});

test('30 Agentes: Mock test para todos os 30 agentes garantindo contrato dual response/reply e modelo gemini-3.8-flash', async () => {
  let capturedModel = '';
  let capturedContents = '';

  const mockAiClient = {
    models: {
      generateContent: async ({ model, contents }: any) => {
        capturedModel = model;
        capturedContents = contents;
        return {
          text: `Resposta simulada com sucesso para ${contents}`,
          usageMetadata: {
            totalTokenCount: 150
          }
        };
      }
    }
  };

  for (const agentId of CANONICAL_AGENT_IDS) {
    const prompt = `Pergunta de teste para ${agentId}`;
    const result = await processAgentInteraction({
      agentId,
      prompt,
      mockAiClient
    });

    assert.equal(result.agentId, agentId);
    assert.equal(result.model, 'gemini-3.8-flash', 'Modelo deve ser exatamente gemini-3.8-flash');
    assert.equal(capturedModel, 'gemini-3.8-flash');
    assert.ok(result.response.length > 0, 'Campo response deve ser preenchido');
    assert.equal(result.response, result.reply, 'Contrato dual response e reply deve ser consistente');
    assert.equal(result.tokensUsed, 150);
    assert.ok(result.timestamp);
  }
});

test('30 Agentes: Suporte transparente aos contratos de parâmetros alternativos (userMessage e projectId)', async () => {
  let capturedConfig: any = null;
  const mockAiClient = {
    models: {
      generateContent: async ({ config }: any) => {
        capturedConfig = config;
        return {
          text: 'Resposta de teste via contrato unificado',
          usageMetadata: { totalTokenCount: 80 }
        };
      }
    }
  };

  const result = await processAgentInteraction({
    agentId: 'YOAST_SEO_SPECIALIST',
    userMessage: 'Como rankear no topo do Google?',
    projectId: 'proj_magia_crencas',
    mockAiClient
  });

  assert.equal(result.agentId, 'YOAST_SEO_SPECIALIST');
  assert.equal(result.response, 'Resposta de teste via contrato unificado');
  assert.equal(result.reply, result.response);
  assert.ok(capturedConfig.systemInstruction.includes('Magia das Crenças'));
  assert.ok(capturedConfig.systemInstruction.includes('RESTRIÇÕES NEGATIVAS VISUAIS'));
  assert.ok(capturedConfig.systemInstruction.includes('RESTRIÇÕES NEGATIVAS EDITORIAIS'));
});

test('Dossiês de Marca: Todos os 7 projetos oficiais contêm os 35 campos obrigatórios estruturados', async () => {
  const { CANONICAL_BRAND_DOSSIERS, getMasterBrandDossier } = await import('../server/production/brandDossiers.js');
  const projectIds = [
    'proj_magia_crencas',
    'proj_exu_responde',
    'proj_maria_padilha',
    'proj_manual_catolico',
    'proj_froc_ia',
    'proj_oraculos',
    'proj_froc_marketing_engine'
  ];

  for (const id of projectIds) {
    const dossier = await getMasterBrandDossier(id);
    assert.ok(dossier, `Dossiê ${id} deve existir`);
    assert.equal(dossier?.projectId, id);

    // Verificação dos campos cruciais dos 35 campos
    assert.ok(dossier?.brandName?.length > 0);
    assert.ok(dossier?.slug?.length > 0);
    assert.ok(dossier?.segment?.length > 0);
    assert.ok(dossier?.category?.length > 0);
    assert.ok(dossier?.tagline?.length > 0);
    assert.ok(dossier?.mission?.length > 0);
    assert.ok(Array.isArray(dossier?.coreThemes) && dossier.coreThemes.length > 0);
    assert.ok(dossier?.targetAudience?.length > 0);
    assert.ok(dossier?.toneOfVoice?.length > 0);
    assert.ok(dossier?.brandArchetype?.length > 0);
    assert.ok(dossier?.websiteUrl?.startsWith('http'));
    assert.ok(dossier?.logoUrl?.length > 0);
    assert.notEqual(dossier?.logoUrl, '/icons/logo.png', `Logo do projeto ${id} não pode ser o logo genérico do portal`);
    assert.ok(dossier?.bannerUrl?.startsWith('http'));
    assert.ok(dossier?.colorPalette?.primary);
    assert.ok(Array.isArray(dossier?.visualNegativeConstraints) && dossier.visualNegativeConstraints.length > 0);
    assert.ok(Array.isArray(dossier?.editorialNegativeConstraints) && dossier.editorialNegativeConstraints.length > 0);
    assert.ok(Array.isArray(dossier?.culturalReligiousSensitivities) && dossier.culturalReligiousSensitivities.length > 0);
    assert.ok(Array.isArray(dossier?.keyDifferentiators) && dossier.keyDifferentiators.length > 0);
    assert.ok(Array.isArray(dossier?.primaryKeywords) && dossier.primaryKeywords.length > 0);
    assert.ok(Array.isArray(dossier?.longTailKeywords) && dossier.longTailKeywords.length > 0);
    assert.ok(Array.isArray(dossier?.searchIntentMap?.informational));
    assert.ok(Array.isArray(dossier?.conversionHooks) && dossier.conversionHooks.length > 0);
    assert.ok(Array.isArray(dossier?.callToActionCatalog) && dossier.callToActionCatalog.length > 0);
    assert.ok(Array.isArray(dossier?.socialPlatforms));
    assert.ok(Array.isArray(dossier?.contentPillars));
    assert.ok(dossier?.videoVisualDirectives?.length > 0);
    assert.ok(Array.isArray(dossier?.allowedImageArchetypes));
    assert.ok(Array.isArray(dossier?.prohibitedImageArchetypes));
    assert.ok(Array.isArray(dossier?.proofPoints));
    assert.ok(typeof dossier?.verificationStatus?.isAudited === 'boolean');
  }
});

test('Auditoria de Artigos: Auditoria não-destrutiva identifica Yoast SEO, contaminação de nicho e qualidade', async () => {
  const { auditSingleArticle } = await import('../server/production/articleAuditor.js');

  // Caso 1: Artigo com contaminação cruzada grave (ex: falar de diabo e satã no Exu Responde)
  const contaminatedArticle = {
    id: 'art_test_contam',
    title: 'Pacto com o diabo e conselho com Exu',
    slug: 'pacto-diabo-exu',
    projectId: 'proj_exu_responde',
    content: 'Este artigo fala sobre fazer pacto com o diabo e satã...',
    coverImage: '/icons/logo.png'
  };

  const audit1 = await auditSingleArticle(contaminatedArticle);
  assert.equal(audit1.status, 'CROSS_NICHE_VIOLATION');
  assert.equal(audit1.crossNicheContamination.detected, true);
  assert.ok(audit1.crossNicheContamination.violatingTerms.includes('diabo'));
  assert.equal(audit1.visualIntegrity.isGenericLogo, true);

  // Caso 2: Artigo de alta qualidade com padrão Yoast
  const highQualityArticle = {
    id: 'art_test_hq',
    title: 'Manual Católico: Como Rezar o Santo Terço Passo a Passo com Devoção',
    slug: 'como-rezar-o-santo-terco-passo-a-passo',
    projectId: 'proj_manual_catolico',
    primaryKeyword: 'como rezar o santo terço',
    metaDescription: 'Aprenda como rezar o Santo Terço passo a passo com este guia completo do Manual Católico. Conheça todos os mistérios sagrados e orações.',
    coverImage: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65',
    sections: [
      { h2: 'O Significado do Santo Terço na Vida Cristã', content: 'Rezar o terço é meditar na vida de Cristo através dos olhos da Virgem Maria. '.repeat(50) },
      { h2: 'Passo a Passo para Rezar os Mistérios', content: 'Inicie com o Sinal da Cruz e o Credo Apostólico. Em seguida, ofereça as intenções. '.repeat(50) }
    ],
    faqSection: [
      { question: 'Quais são os dias dos Mistérios Gozosos?', answer: 'Segundas-feiras e sábados.' }
    ],
    callToAction: 'Baixe agora o aplicativo oficial Manual Católico na Google Play Store e reze com áudios guiados.'
  };

  const audit2 = await auditSingleArticle(highQualityArticle);
  assert.equal(audit2.status, 'APPROVED_HIGH_QUALITY');
  assert.ok(audit2.score >= 80);
  assert.equal(audit2.yoastSeoChecks.hasTitleKeyword, true);
  assert.equal(audit2.yoastSeoChecks.metaDescriptionLengthOk, true);
  assert.equal(audit2.crossNicheContamination.detected, false);
  assert.equal(audit2.visualIntegrity.isGenericLogo, false);
});

test('Auditoria de Artigos: Detecção de duplicatas (títulos idênticos e mesma imagem de capa)', async () => {
  const { auditSingleArticle } = await import('../server/production/articleAuditor.js');

  const seenTitles = new Map<string, number>([['artigoduplicadoseo', 2]]);
  const seenCovers = new Map<string, number>([['https://example.com/capa-duplicada.jpg', 3]]);

  const duplicateArticle = {
    id: 'art_dup_1',
    title: 'Artigo Duplicado SEO',
    slug: 'artigo-duplicado-seo',
    projectId: 'proj_froc_marketing_engine',
    content: 'Conteúdo relevante e explicativo.',
    coverImage: 'https://example.com/capa-duplicada.jpg'
  };

  const audit = await auditSingleArticle(duplicateArticle, { seenTitles, seenCovers });
  assert.equal(audit.duplicateFlags.isDuplicateTitle, true);
  assert.equal(audit.duplicateFlags.isDuplicateCoverImage, true);
  assert.equal(audit.duplicateFlags.duplicateCoverCount, 3);
  assert.ok(audit.actionableSuggestions.some((s) => s.includes('Título idêntico')));
  assert.ok(audit.actionableSuggestions.some((s) => s.includes('Imagem de capa repetida')));
});

test('Custos & Automação: Trava financeira bloqueia chamadas de agentes se o Botão Mestre estiver desligado', async () => {
  const { updateMasterAutomationControl } = await import('../server/production/automationGate.js');

  const testUserId = 'admin_test_lock';
  await updateMasterAutomationControl(testUserId, { globalEnabled: false });

  await assert.rejects(
    async () => {
      await processAgentInteraction({
        agentId: 'TECH_LEAD_CORE',
        prompt: 'Qual a arquitetura recomendada?',
        userId: testUserId,
        mockAiClient: {
          models: {
            generateContent: async () => ({ text: 'ok' })
          }
        }
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 423);
      assert.match(err.message, /Automação bloqueada pelo Botão Mestre/);
      return true;
    }
  );

  // Restaura o botão mestre para ligado para os demais testes
  await updateMasterAutomationControl(testUserId, { globalEnabled: true });
});

