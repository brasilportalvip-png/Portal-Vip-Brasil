import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_30_AGENTS,
  CANONICAL_AGENT_IDS,
  getAgentSpec,
  processAgentInteraction
} from '../server/production/agents.js';

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
