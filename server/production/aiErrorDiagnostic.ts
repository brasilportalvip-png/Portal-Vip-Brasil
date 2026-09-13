import crypto from 'node:crypto';

export type AiErrorCategory =
  | 'rate_limit_temporary'
  | 'quota_exhausted'
  | 'quota_exceeded'
  | 'invalid_key'
  | 'api_or_model_disabled'
  | 'server_overloaded'
  | 'model_unavailable'
  | 'content_policy_violation'
  | 'permanent_config_error'
  | 'temporary_network_error';

export interface AiDiagnosticResult {
  category: AiErrorCategory;
  isRetryable: boolean;
  httpStatus?: number;
  statusCode?: number;
  retryAfterSeconds?: number;
  sanitizedMessage: string;
  rawErrorCode?: string;
  safeDetails?: string;
}

/**
 * Remove qualquer segredo, token, chave de API ou credencial de strings de log e erro.
 */
export function sanitizeSecretText(input: unknown): string {
  if (input == null) return '';
  const text = typeof input === 'string' ? input : String((input as any)?.message || input || '');
  return text
    .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[GEMINI_API_KEY_REMOVIDO]')
    .replace(/EAA[A-Za-z0-9_-]{20,}/g, '[META_TOKEN_REMOVIDO]')
    .replace(/(access_token|refresh_token|client_secret|authorization|api_key|token)[=:\s]+[^ ,;'"&\n\r]+/gi, '$1=[REMOVIDO]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REMOVIDO]')
    .replace(/https:\/\/[^/]+:[^@]+@/g, 'https://[CREDENCIAIS_REMOVIDAS]@')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

/**
 * Extrai o status HTTP de diferentes formatos de erro (GenAI SDK, Axios, Fetch, etc.)
 */
export function extractHttpStatus(error: any): number | undefined {
  if (!error) return undefined;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  if (typeof error.response?.status === 'number') return error.response.status;
  if (typeof error.code === 'number') return error.code;

  const msg = String(error.message || error || '');
  const match = msg.match(/\b(429|403|400|401|404|500|502|503|504)\b/);
  if (match) return parseInt(match[1], 10);
  return undefined;
}

/**
 * Extrai o valor do cabeçalho Retry-After em segundos, respeitando formatos numéricos ou data HTTP.
 */
export function extractRetryAfterSeconds(error: any): number | undefined {
  if (!error) return undefined;

  let headerVal: any =
    error.headers?.get?.('retry-after') ||
    error.response?.headers?.get?.('retry-after') ||
    error.headers?.['retry-after'] ||
    error.response?.headers?.['retry-after'];

  if (typeof headerVal === 'string') {
    headerVal = headerVal.trim();
    const parsedNum = parseInt(headerVal, 10);
    if (!Number.isNaN(parsedNum) && parsedNum >= 0) {
      return parsedNum;
    }
    const parsedDate = new Date(headerVal).getTime();
    if (!Number.isNaN(parsedDate)) {
      const diffSec = Math.ceil((parsedDate - Date.now()) / 1000);
      return diffSec > 0 ? diffSec : 0;
    }
  }

  // Tenta extrair da mensagem de erro (ex: "Quota exceeded... please retry after 30s" ou "retry after 45 seconds" ou "retry in 15s")
  const msg = String(error.message || error || '');
  const retryMatch = msg.match(/retry(?:-|\s+)(?:after|in)[:\s]+(\d+)\s*(?:s|sec|seconds)?/i) ||
                     msg.match(/wait\s+(\d+)\s*seconds/i) ||
                     msg.match(/aguarde\s+(\d+)\s*segundos/i);
  if (retryMatch) {
    const s = parseInt(retryMatch[1], 10);
    if (!Number.isNaN(s) && s > 0) return s;
  }

  return undefined;
}

/**
 * Diagnóstico preciso e sanitizado de erros da API do Google Gemini / Veo.
 */
export function diagnoseAiError(error: any): AiDiagnosticResult {
  const httpStatus = extractHttpStatus(error);
  const retryAfterSeconds = extractRetryAfterSeconds(error);
  const rawMsg = String(error?.message || error || '');
  const sanitized = sanitizeSecretText(rawMsg);
  const upperMsg = rawMsg.toUpperCase();

  // 1. Chave inválida / Erro de autenticação
  if (
    httpStatus === 401 ||
    upperMsg.includes('API_KEY_INVALID') ||
    upperMsg.includes('API KEY NOT VALID') ||
    upperMsg.includes('INVALID API KEY') ||
    upperMsg.includes('UNAUTHENTICATED') ||
    (httpStatus === 403 && upperMsg.includes('KEY'))
  ) {
    return {
      category: 'invalid_key',
      isRetryable: false,
      httpStatus: httpStatus || 401,
      statusCode: httpStatus || 401,
      rawErrorCode: 'API_KEY_INVALID',
      sanitizedMessage: 'Chave de API do provedor de IA inválida ou revogada. Verifique as credenciais no painel.'
    };
  }

  // 2. API ou modelo não habilitado no projeto
  if (
    upperMsg.includes('SERVICE_DISABLED') ||
    upperMsg.includes('HAS NOT BEEN USED IN PROJECT') ||
    upperMsg.includes('IS NOT ENABLED') ||
    upperMsg.includes('NOT_ENABLED') ||
    upperMsg.includes('API NOT ACTIVATED') ||
    (httpStatus === 403 && (upperMsg.includes('PERMISSION_DENIED') || upperMsg.includes('DISABLED')))
  ) {
    return {
      category: 'api_or_model_disabled',
      isRetryable: false,
      httpStatus: httpStatus || 403,
      statusCode: httpStatus || 403,
      rawErrorCode: 'API_OR_MODEL_DISABLED',
      sanitizedMessage: 'A API ou modelo solicitado não está habilitado no projeto do Google Cloud.'
    };
  }

  // 3. Cota diária ou mensal esgotada (não transitória)
  if (
    upperMsg.includes('DAILY_QUOTA_EXCEEDED') ||
    upperMsg.includes('DAILY QUOTA EXCEEDED') ||
    upperMsg.includes('MONTHLY_QUOTA_EXCEEDED') ||
    upperMsg.includes('MONTHLY QUOTA EXCEEDED') ||
    upperMsg.includes('QUOTA EXCEEDED FOR TODAY') ||
    upperMsg.includes('BILLING_NOT_ACTIVE') ||
    upperMsg.includes('BILLING PLAN LIMIT') ||
    upperMsg.includes('CREDIT_EXHAUSTED') ||
    (upperMsg.includes('RESOURCE_EXHAUSTED') && (upperMsg.includes('DAILY') || upperMsg.includes('BILLING')))
  ) {
    return {
      category: 'quota_exhausted',
      isRetryable: false,
      httpStatus: httpStatus || 429,
      statusCode: httpStatus || 429,
      rawErrorCode: 'QUOTA_EXHAUSTED',
      sanitizedMessage: 'Cota diária ou limite de faturamento da API esgotado no provedor Google Cloud.'
    };
  }

  // 4. Limite temporário de requisições (429 / rate limit)
  if (
    httpStatus === 429 ||
    upperMsg.includes('RESOURCE_EXHAUSTED') ||
    upperMsg.includes('RATE LIMIT') ||
    upperMsg.includes('TOO MANY REQUESTS') ||
    upperMsg.includes('QUOTA EXCEEDED') // Padrão transitório do Gemini
  ) {
    return {
      category: 'rate_limit_temporary',
      isRetryable: true,
      httpStatus: httpStatus || 429,
      statusCode: httpStatus || 429,
      retryAfterSeconds,
      rawErrorCode: 'RATE_LIMIT_TEMPORARY',
      sanitizedMessage: 'Limite temporário de requisições de IA atingido na API do Google Gemini. Aguarde alguns segundos e tente novamente.'
    };
  }

  // 5. Modelo indisponível / Sobrecarga de infraestrutura (503 / 404 de modelo temporário)
  if (
    httpStatus === 503 ||
    upperMsg.includes('UNAVAILABLE') ||
    upperMsg.includes('MODEL IS OVERLOADED') ||
    upperMsg.includes('SERVER_OVERLOADED') ||
    upperMsg.includes('SERVICE UNAVAILABLE') ||
    upperMsg.includes('HIGH DEMAND')
  ) {
    return {
      category: 'server_overloaded',
      isRetryable: true,
      httpStatus: httpStatus || 503,
      statusCode: httpStatus || 503,
      retryAfterSeconds,
      rawErrorCode: 'MODEL_OVERLOADED',
      sanitizedMessage: 'Serviço de IA temporariamente sobrecarregado ou em alta demanda. Nova tentativa automática agendada.'
    };
  }

  // 6. Erro permanente de configuração ou diretrizes de segurança (400, SAFETY)
  if (
    httpStatus === 400 ||
    upperMsg.includes('SAFETY') ||
    upperMsg.includes('HARM_CATEGORY') ||
    upperMsg.includes('BLOCKED_BY_SAFETY') ||
    upperMsg.includes('SAFETY POLICIES') ||
    upperMsg.includes('INVALID_ARGUMENT')
  ) {
    return {
      category: 'content_policy_violation',
      isRetryable: false,
      httpStatus: httpStatus || 400,
      statusCode: httpStatus || 400,
      rawErrorCode: 'CONTENT_POLICY_VIOLATION',
      sanitizedMessage: 'Conteúdo bloqueado pelas políticas de segurança do modelo de IA. Modifique o briefing e tente novamente.'
    };
  }

  // 7. Falha temporária de rede ou serviço (500, 502, 504, ECONNRESET, etc.)
  if (
    httpStatus === 500 ||
    httpStatus === 502 ||
    httpStatus === 504 ||
    upperMsg.includes('ECONNRESET') ||
    upperMsg.includes('ETIMEDOUT') ||
    upperMsg.includes('FETCH FAILED') ||
    upperMsg.includes('NETWORK ERROR') ||
    upperMsg.includes('SOCKET HANG UP')
  ) {
    return {
      category: 'temporary_network_error',
      isRetryable: true,
      httpStatus: httpStatus || 500,
      retryAfterSeconds,
      rawErrorCode: 'TEMPORARY_NETWORK_ERROR',
      sanitizedMessage: 'Falha temporária de conexão ou rede com o provedor de IA. Nova tentativa automática agendada.'
    };
  }

  // Padrão de fallback sanitizado
  return {
    category: 'rate_limit_temporary',
    isRetryable: true,
    httpStatus,
    retryAfterSeconds,
    rawErrorCode: 'UNKNOWN_TEMPORARY_ERROR',
    sanitizedMessage: sanitized.slice(0, 300) || 'Falha de comunicação temporária com a API de IA.'
  };
}

/**
 * Calcula o próximo horário de tentativa (nextAttemptAt) com backoff exponencial e jitter,
 * respeitando o cabeçalho Retry-After quando presente.
 */
export function calculateNextAttemptAt(
  attemptCount: number,
  retryAfterSeconds?: number,
  options?: { minDelaySeconds?: number; maxDelaySeconds?: number; baseSeconds?: number }
): string {
  const minDelaySec = options?.minDelaySeconds ?? 15;
  const maxDelaySec = options?.maxDelaySeconds ?? 1800; // 30 minutos máx
  const baseSec = options?.baseSeconds ?? 20;

  let delaySeconds: number;

  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    // Respeita Retry-After adicionando 2 segundos de margem de segurança
    delaySeconds = Math.max(minDelaySec, retryAfterSeconds + 2);
  } else {
    // Backoff exponencial: base * 2^(attempts-1) + jitter de +/- 20%
    const currentAttempt = Math.max(1, attemptCount);
    const exponentialBase = baseSec * Math.pow(2, currentAttempt - 1);
    const jitter = (Math.random() * 0.4 - 0.2) * exponentialBase; // -20% a +20%
    delaySeconds = Math.round(exponentialBase + jitter);
  }

  delaySeconds = Math.max(minDelaySec, Math.min(maxDelaySec, delaySeconds));
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}
