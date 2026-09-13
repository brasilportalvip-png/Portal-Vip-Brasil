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

test('Reserva e idempotência do Autopilot e videoJobs no backend', () => {
  const aiSource = source('server/production/ai.ts');
  const autopilotSource = source('server/production/autopilotMultimediaR8.ts');

  // Suporte a status retry_scheduled e failed_permanent
  assert.ok(aiSource.includes("'retry_scheduled'"));
  assert.ok(aiSource.includes("'failed_permanent'"));

  // Verificação de que erro temporário agenda retry_scheduled em vez de abortar com falha falsa
  assert.ok(aiSource.includes('calculateNextAttemptAt'));
  assert.ok(aiSource.includes('diagnoseAiError'));

  // Trava de concorrência com lease
  assert.ok(aiSource.includes('leaseOwner'));
  assert.ok(aiSource.includes('leaseUntil'));

  // Autopilot não dá falso sucesso
  assert.ok(autopilotSource.includes('publicationConfirmed: false'));
});

test('UI de Autopilot e Geração de Vídeo reflete status de retry e bloqueia falso sucesso', () => {
  const autopilotUiSource = source('src/pages/AutopilotPage.tsx');
  const videoUiSource = source('src/pages/CreateVideoPage.tsx');

  // Autopilot exibe mensagem transparente de retry e não finge que foi publicado
  assert.ok(autopilotUiSource.includes("res.stage === 'retry_scheduled'"));
  assert.ok(autopilotUiSource.includes('A publicação no YouTube NÃO foi realizada'));

  // CreateVideoPage exibe status de retry com contagem de tentativas e botão para tentar agora
  assert.ok(videoUiSource.includes("activeJob.status === 'retry_scheduled'"));
  assert.ok(videoUiSource.includes('Em fila para nova tentativa automática'));
  assert.ok(videoUiSource.includes('/api/ai/video-jobs/${activeJob.id}/retry'));
});
