import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MASTER_AUTOMATION,
  FIXED_EXCHANGE_RATE_BRL_PER_USD,
  isGlobalAutomationEnabled,
  isProjectAutomationEnabled,
  assertAutomationAllowed,
  toggleProjectAutomation
} from '../server/production/automationGate.js';
import {
  computePerceptualHash,
  computeHammingDistance,
  PERCEPTUAL_HASH_HAMMING_THRESHOLD
} from '../server/production/imageGuard.js';
import {
  AI_UNIT_COSTS_USD,
  AI_COST_PRICING_VERSION,
  preflightReserveBudget,
  reconcileBudgetReservation,
  calculateFinancialCostSummary
} from '../server/production/financialGuardian.js';

test('Automação Gate: Fail-Closed e valores padrão consistentes', () => {
  assert.equal(DEFAULT_MASTER_AUTOMATION.globalEnabled, false, 'Padrão ausente deve ser rigorosamente falso (Zero Custos)');
  assert.equal(DEFAULT_MASTER_AUTOMATION.monthlyBudgetCapBrl, 150.00);
  assert.equal(DEFAULT_MASTER_AUTOMATION.monthlyBudgetCapUsd, 27.27);
  assert.equal(FIXED_EXCHANGE_RATE_BRL_PER_USD, 5.50);
});

test('Automação Gate: toggleProjectAutomation retorna contrato esperado com campo enabled', async () => {
  const result = await toggleProjectAutomation('user_test_123', 'proj_catolico', false);
  assert.equal(result.success, true);
  assert.equal(result.enabled, false);
  assert.equal(result.projectId, 'proj_catolico');
  assert.equal(result.project.enabled, false);
  assert.equal(result.project.active, false);
  assert.equal(result.project.dailyBlogEnabled, false);
  assert.equal(result.project.dailyMarketingEnabled, false);
  assert.ok(result.message.includes('pausado com segurança'));

  // Teste de reativação
  const reactivated = await toggleProjectAutomation('user_test_123', 'proj_catolico', true);
  assert.equal(reactivated.enabled, true);
  assert.equal(reactivated.project.enabled, true);
  assert.equal(reactivated.project.active, true);
  assert.ok(reactivated.message.includes('ativado com sucesso'));
});

test('Image Guard: Perceptual dHash 64-bit e distância de Hamming anti-repetição', async () => {
  // Dois gradientes similares produzem dHash com baixa distância de Hamming
  const bufA = Buffer.alloc(8 * 9);
  const bufB = Buffer.alloc(8 * 9);

  for (let i = 0; i < bufA.length; i++) {
    bufA[i] = (i * 3) % 256;
    bufB[i] = (i * 3 + (i % 2 === 0 ? 1 : 0)) % 256;
  }

  const hashA = await computePerceptualHash(bufA);
  const hashB = await computePerceptualHash(bufB);

  assert.equal(hashA.length, 16, 'dHash deve ter 16 caracteres hexadecimais (64 bits)');
  assert.equal(hashB.length, 16);

  const distance = computeHammingDistance(hashA, hashB);
  assert.ok(typeof distance === 'number');

  // Mesma imagem tem distância 0
  assert.equal(computeHammingDistance(hashA, hashA), 0);
  assert.ok(distance < PERCEPTUAL_HASH_HAMMING_THRESHOLD, 'Gradientes similares devem ter distância de Hamming abaixo do threshold');
});

test('Financial Guardian: Tabela de preços e versão de precificação auditável', () => {
  assert.equal(AI_COST_PRICING_VERSION, '2026.1');
  assert.equal(AI_UNIT_COSTS_USD.textFlashArticle, 0.0008);
  assert.equal(AI_UNIT_COSTS_USD.textFlashPrompt, 0.0002);
  assert.equal(AI_UNIT_COSTS_USD.imageGen, 0.030);
  assert.equal(AI_UNIT_COSTS_USD.videoGenVeo, 0.200);
});

test('Financial Guardian: Reserva atômica pré-voo com teto orçamentário e reconciliação', async () => {
  const reservation = await preflightReserveBudget({
    userId: 'user_audit_123',
    operation: 'image',
    companyId: 'proj_test'
  });

  assert.equal(typeof reservation.allowed, 'boolean');
  assert.equal(reservation.estimatedCostUsd, AI_UNIT_COSTS_USD.imageGen);
  assert.equal(reservation.estimatedCostBrl, Math.round(AI_UNIT_COSTS_USD.imageGen * FIXED_EXCHANGE_RATE_BRL_PER_USD * 1000) / 1000);

  if (reservation.reservationId) {
    // Reconciliação com sucesso
    await reconcileBudgetReservation({
      reservationId: reservation.reservationId,
      userId: 'user_audit_123',
      success: true,
      actualCostUsd: 0.030
    });
  }

  // Consulta do resumo financeiro auditável
  const summary = await calculateFinancialCostSummary('user_audit_123');
  assert.ok(summary.currentMonth);
  assert.equal(summary.exchangeRateBrlPerUsd, FIXED_EXCHANGE_RATE_BRL_PER_USD);
  assert.ok(summary.monthlyBudgetCapBrl > 0);
  assert.ok(summary.monthlyBudgetCapUsd > 0);
  assert.ok(typeof summary.confirmedCostBrl === 'number');
  assert.ok(typeof summary.remainingBudgetBrl === 'number');
});
