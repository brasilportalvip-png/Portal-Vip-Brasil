import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { diagnoseAiError, calculateNextAttemptAt } from '../server/production/aiErrorDiagnostic.js';

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf-8');
}

test('Diagnóstico preciso de erros de IA: rate limit temporário (429)', () => {
  const err429 = {
    status: 429,
    message: 'Resource has been exhausted (e.g. check quota). Please retry in 15s.'
  };

  const diag = diagnoseAiError(err429);
  assert.equal(diag.category, 'rate_limit_temporary');
  assert.equal(diag.isRetryable, true);
  assert.equal(diag.statusCode, 429);
  assert.equal(diag.retryAfterSeconds, 15);
  assert.ok(diag.sanitizedMessage.includes('Limite temporário de requisições de IA atingido'));
  assert.ok(!diag.sanitizedMessage.includes('AIzaSy'));
});

test('Diagnóstico preciso: cota diária/mensal esgotada', () => {
  const errQuota = new Error('Google Gemini API: Daily quota exceeded for project froc-ai-prod. Billing plan limit reached.');
  const diag = diagnoseAiError(errQuota);

  assert.equal(diag.category, 'quota_exhausted');
  assert.equal(diag.isRetryable, false);
  assert.ok(diag.sanitizedMessage.includes('Cota diária ou limite de faturamento da API esgotado'));
});

test('Diagnóstico preciso: chave de API inválida', () => {
  const errKey = {
    status: 403,
    message: 'API_KEY_INVALID: API key not valid. Please pass a valid API key.'
  };

  const diag = diagnoseAiError(errKey);
  assert.equal(diag.category, 'invalid_key');
  assert.equal(diag.isRetryable, false);
  assert.ok(diag.sanitizedMessage.includes('Chave de API do provedor de IA inválida ou revogada'));
});

test('Diagnóstico preciso: servidor sobrecarregado (503)', () => {
  const err503 = {
    status: 503,
    message: 'The model is overloaded. Please try again later.'
  };

  const diag = diagnoseAiError(err503);
  assert.equal(diag.category, 'server_overloaded');
  assert.equal(diag.isRetryable, true);
  assert.ok(diag.sanitizedMessage.includes('Serviço de IA temporariamente sobrecarregado'));
});

test('Diagnóstico preciso: rejeição por filtro de segurança (Content Policy)', () => {
  const errSafety = new Error('The generation was blocked due to safety policies / safety rating violation.');
  const diag = diagnoseAiError(errSafety);

  assert.equal(diag.category, 'content_policy_violation');
  assert.equal(diag.isRetryable, false);
  assert.ok(diag.sanitizedMessage.includes('Conteúdo bloqueado pelas políticas de segurança do modelo'));
});

test('Cálculo de backoff com jitter e respeito a retryAfter', () => {
  const now = Date.now();

  // Com retryAfter explícito de 30s
  const nextAt30s = new Date(calculateNextAttemptAt(1, 30)).getTime();
  assert.ok(nextAt30s >= now + 25_000, 'Respeita pelo menos 25s para retryAfter de 30s');
  assert.ok(nextAt30s <= now + 40_000, 'Não ultrapassa margem razoável com jitter');

  // Sem retryAfter explícito (backoff exponencial)
  const attempt1 = new Date(calculateNextAttemptAt(1)).getTime();
  const attempt2 = new Date(calculateNextAttemptAt(2)).getTime();
  const attempt3 = new Date(calculateNextAttemptAt(3)).getTime();

  assert.ok(attempt2 > attempt1, 'Tentativa 2 deve agendar após tentativa 1');
  assert.ok(attempt3 > attempt2, 'Tentativa 3 deve agendar após tentativa 2');
});

import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { acquireVideoOperationLease, manualRetryVideoJob, clearManualRetryStateForTesting } from '../server/production/ai.js';

test('Reserva e idempotência do Autopilot e videoJobs no backend', async () => {
  resetMemoryDb();
  const db = firestore();
  const jobId = 'job_test_reserva_idempotencia';
  
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId).set({
    id: jobId,
    userId: 'user_test_1',
    companyId: 'default',
    prompt: 'Prompt teste de reserva',
    status: 'retry_scheduled',
    attemptCount: 1,
    maxAttempts: 5,
    nextAttemptAt: new Date(Date.now() - 5000).toISOString(),
    createdAt: new Date().toISOString()
  });

  // 1. Primeira aquisição adquire o lease e incrementa o fence de forma atômica
  const acq1 = await acquireVideoOperationLease(jobId, { workerId: 'worker_alpha' });
  assert.equal(acq1.acquired, true);
  assert.equal(acq1.leaseOwner, 'worker_alpha');
  assert.equal(acq1.attemptCount, 2);
  assert.ok(typeof acq1.leaseFence === 'number' && acq1.leaseFence >= 1);

  // 2. Chamada concorrente durante o lease ativo é rejeitada
  const acq2 = await acquireVideoOperationLease(jobId, { workerId: 'worker_beta' });
  assert.equal(acq2.acquired, false);
  assert.equal(acq2.reason, 'lease_active');
});

test('UI de Autopilot e Geração de Vídeo reflete status de retry e bloqueia falso sucesso', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const db = firestore();
  const jobId = 'job_test_ui_contracts';

  // Configura job com maxAttempts esgotado
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId).set({
    id: jobId,
    userId: 'user_owner',
    status: 'retry_scheduled',
    attemptCount: 5,
    maxAttempts: 5,
    createdAt: new Date().toISOString()
  });

  // O botão manual rejeita estritamente quando maxAttempts é atingido
  await assert.rejects(
    () => manualRetryVideoJob('user_owner', jobId),
    (err: any) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Limite máximo de tentativas \(5\) já atingido/);
      return true;
    }
  );
});
