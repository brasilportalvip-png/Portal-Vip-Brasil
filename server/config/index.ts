import dotenv from 'dotenv';
import { CREDIT_COSTS } from '../../shared/creditCosts.js';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test' || process.env.NODE_ENV === 'test';

function env(name: string, fallback = ''): string {
  const val = (process.env[name] ?? '').trim();
  if (isTest && !val) return fallback;
  return val ? val : fallback;
}

function required(name: string, fallback = ''): string {
  const value = env(name, fallback);
  if (isProduction && !value) {
    throw new Error(`[Froc.IA] Variável obrigatória ausente em produção: ${name}`);
  }
  return value;
}

const appUrl = (isProduction
  ? env('APP_URL')
  : env('APP_URL', 'http://localhost:3000')).replace(/\/$/, '');

const CAPACITOR_CORS_ORIGINS = [
  'capacitor://localhost',
  'https://localhost',
  'http://localhost'
] as const;

export function resolveCorsOrigins(
  configuredOrigins: string,
  applicationUrl: string
): string[] {
  const normalized = [
    applicationUrl,
    ...configuredOrigins.split(','),
    ...CAPACITOR_CORS_ORIGINS
  ]
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return [...new Set(normalized)];
}

const corsOrigins = resolveCorsOrigins(
  env('CORS_ORIGINS'),
  appUrl || 'http://localhost:3000'
);

const ALMA_DEFAULT_FIREBASE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDJ+Z1B6x9Adz+w
g5ZsGwYMSfeRAtNJXmvR1G7HTJYXnVk37lucShgwyqKrf+0MDmnLHtx24fg8Dt2g
7/Ft5zC9yhMMl44/NtfjSfT6tKeUA8NHqRk/l6l6goUA38yYReAZ5yDyg6uXhTdS
K4rE3wMuCzqUY4ujxMr+8eqHEUYjHVDUi1YJoG2F+kJ1un1tUiAKzOJuOq9s2HRE
e9lC3dfNGtXMzZMTqauRztrfdBT4Le/JwHOkqkXL/LI/H/DFZZnEbj0YkpQt6XxC
/1UQrm6TFzj6ve8Q/cNgHn3bCaNVhEMxJ/uQ8pNWe4ytJTwOL8gZNCMLR/UQV8Ia
nUtC6imRAgMBAAECggEAUuR4LwKha+LFJ9uJk8qve8Grsj8Xmgf/djmaUX9UJlL0
t+jCfm1Galfv1TUGg6kysCN1VfE94OA1A4UWcAWvUmUp1kQpJDaM+gJzYaVdFXlJ
3xI+g4PqEZaZoZc4L9KVu+vI8N8rQF9zKe0m4c+pTW9cVmRYfhkZOvLsTwy+3U/C
b8iP7zp5zulEzWn995yjDZvOuHc7m2NuYvX06uvxGvipf6Z4lBJ/VSB099VSOkn8
vbDxdFPOvjYGWngYP4V+K3XzuBW9U1bgcf75VysYQmHL9K3mFq/oforqgQBbNZZk
8F1SYwQ1r4AznEOaTjKwlT2JRZJ3cqzCpbaCIf0nJQKBgQD4AwRMH4mA+gTl4jz3
4vrJAq3FL/iUamX9I/zK411sForMQIjpOlvL3+3FFUGCoGpprecepSRs1q9TAQlR
6/aPOJUOQrhjldYq2AdwjR97va73/VIpllhMtGb9uRIYv57pa1Vs1nlCEnq0vkiI
ee+awKxyD6bjT+ov4CO19dP4VwKBgQDQewBTnNbZkvZ6Wc4RK46pGe4/K+iK21Gy
nnEkbUtUjDOAOOb1ajiqEM/KVuzCEZi42ec3k3lx9N3bMpFMSUK/kzk3Os2aeBzg
PjYxYNLmygEgGfdaHOL5rcmrZr5sT1qTh2vfWbNquA4GSi7rlWviiWI75N/n1X+Y
RvhmU3rcVwKBgQCCRFtifIIl66zc7mslrOQa5rxNQXgoxIYTY26pRqlQV7rJs+/1
yQBkYpcqGJMTQJ0EKyKlVwp93Hm0eGvjyrPz4D1ygxsEu7QFRvkJZiauQSCBA16/
l0eD6pHaHPZjZ2rZodX51+FTEg+/ld7VSG7Q8vjg5FW9OcGBKhK3xYpz+wKBgQDF
+FdaDrAy0Yx+qLK2uU7yIy6LDE35NcTBwhUcizCia7QoCWDAIQsH64j10k9nBkCp
IDqhGsiTPvxBvyYcc+EPfGUzngJJsc9x3YGmqBP9lks1SZMKHi4m/DFqMtmWjlAr
kcgMwuhN6dNfg6hEi5Jz/xOqXm+Efcd5OcN9n74mZwKBgQCPSKMFVAktm2iO4Am5
Yc1Lt9ZZ9iEOpjKBlpDEAxSTDCc6PlHvmH8v4K6I6M0Ac1wdf0RiaAQOOWrO531Q
x7YIYmotGsK2WXPhRtAI8EWB6/e5JHhNhRha8jyOE3OHt7oJoJumODjX+C3Jd6Xm
7Vk8LSvybh/FjzdUgxRxO10BHg==
-----END PRIVATE KEY-----`;

export const config = {
  port: Number(process.env.PORT || 3000),
  host: '0.0.0.0',
  nodeEnv,
  isProduction,
  appUrl,
  corsOrigins,
  geminiApiKey: env('GEMINI_API_KEY'),
  geminiMediaApiKey: env('GEMINI_MEDIA_API_KEY') || env('GEMINI_API_KEY'),
  geminiModels: {
    text: env('GEMINI_MODEL_TEXT', 'gemini-2.5-flash'),
    pro: env('GEMINI_MODEL_PRO', 'gemini-3.1-pro-preview'),
    fallback: env('GEMINI_MODEL_FALLBACK', 'gemini-3.1-flash-lite'),
    image: env('GEMINI_MODEL_IMAGE', 'gemini-3.1-flash-image'),
    imageLite: env('GEMINI_MODEL_IMAGE_LITE', 'gemini-3.1-flash-lite-image'),
    veoLite: env('GEMINI_MODEL_VEO_LITE', 'veo-3.1-lite-generate-preview'),
    veoFast: env('GEMINI_MODEL_VEO_FAST', 'veo-3.1-fast-generate-preview'),
    veoCinema: env('GEMINI_MODEL_VEO_CINEMA', 'veo-3.1-generate-preview'),
    veo: env('GEMINI_MODEL_VEO', 'veo-3.1-generate-preview')
  },
  firebase: {
    projectId: env('FIREBASE_ADMIN_PROJECT_ID', 'almax-34709'),
    clientEmail: env('FIREBASE_ADMIN_CLIENT_EMAIL', 'firebase-adminsdk-fbsvc@almax-34709.iam.gserviceaccount.com'),
    privateKey: (env('FIREBASE_ADMIN_PRIVATE_KEY') || ALMA_DEFAULT_FIREBASE_KEY).replace(/\\n/g, '\n')
  },
  mercadoPago: {
    accessToken: env('MERCADO_PAGO_ACCESS_TOKEN', isTest ? 'TEST-mock-access-token-123456' : ''),
    webhookSecret: env('MERCADO_PAGO_WEBHOOK_SECRET', isTest ? 'TEST-mock-webhook-secret-123456' : ''),
    publicKey: env('MERCADO_PAGO_PUBLIC_KEY', isTest ? 'TEST-mock-public-key-123456' : ''),
    billingMode: env('MERCADO_PAGO_BILLING_MODE', 'subscription').toLowerCase() === 'one_time' ? 'one_time' : 'subscription'
  },
  encryptionKey: env('TOKEN_ENCRYPTION_KEY', isTest ? 'test_token_encryption_key_32bytes_long!' : ''),
  cronSecret: env('CRON_SECRET', isTest ? 'test_cron_secret' : ''),
  adminBootstrap: {
    enabled: env('ADMIN_BOOTSTRAP_ENABLED', isProduction ? 'false' : 'true').toLowerCase() === 'true',
    key: env('ADMIN_BOOTSTRAP_KEY', isTest ? 'test_admin_bootstrap_key' : '')
  },
  adminBootstrapKey: env('ADMIN_BOOTSTRAP_KEY', isTest ? 'test_admin_bootstrap_key' : ''),
  freeSignupBonusCredits: Number(env('FREE_SIGNUP_BONUS_CREDITS', '25')),
  support: {
    email: env('SUPPORT_EMAIL', 'brasilportalvip@gmail.com'),
    whatsapp: env('SUPPORT_WHATSAPP')
  },
  blog: {
    autoEnabled: env('AUTO_BLOG_ENABLED', 'false').toLowerCase() === 'true',
    author: env('BLOG_AUTHOR', 'Equipe Froc.IA')
  },
  social: {
    meta: {
      clientId: env('META_APP_ID', isTest ? 'mock_meta_app_id' : ''),
      clientSecret: env('META_APP_SECRET', isTest ? 'mock_meta_app_secret' : ''),
      graphVersion: env('META_GRAPH_VERSION', 'v24.0')
    },
    linkedin: {
      clientId: env('LINKEDIN_CLIENT_ID', isTest ? 'mock_linkedin_client_id' : ''),
      clientSecret: env('LINKEDIN_CLIENT_SECRET', isTest ? 'mock_linkedin_client_secret' : ''),
      apiVersion: env('LINKEDIN_API_VERSION')
    },
    google: {
      clientId: env('GOOGLE_CLIENT_ID', isTest ? 'mock_google_client_id' : ''),
      clientSecret: env('GOOGLE_CLIENT_SECRET', isTest ? 'mock_google_client_secret' : '')
    },
    tiktok: {
      clientId: env('TIKTOK_CLIENT_KEY', isTest ? 'mock_tiktok_client_id' : ''),
      clientSecret: env('TIKTOK_CLIENT_SECRET', isTest ? 'mock_tiktok_client_secret' : '')
    },
    pinterest: {
      clientId: env('PINTEREST_APP_ID', isTest ? 'mock_pinterest_client_id' : ''),
      clientSecret: env('PINTEREST_APP_SECRET', isTest ? 'mock_pinterest_client_secret' : '')
    },
    x: {
      clientId: env('X_CLIENT_ID', isTest ? 'mock_x_client_id' : ''),
      clientSecret: env('X_CLIENT_SECRET', isTest ? 'mock_x_client_secret' : '')
    }
  },
  plans: [
    {
      id: 'plan_start', name: 'START', price: 49.0, period: 'mês', credits: 100,
      bonusCredits: 10, totalCredits: 110, popular: false,
      features: ['110 créditos mensais incluídos', 'Até 2 empresas cadastradas', 'Criação de posts, legendas e CTAs', 'Análise de SEO básica', 'Agendamento de publicações', 'Acesso à Vitrine Froc']
    },
    {
      id: 'plan_pro', name: 'PRO', price: 99.9, period: 'mês', credits: 210,
      bonusCredits: 20, totalCredits: 230, popular: true,
      features: ['230 créditos mensais incluídos', 'Até 5 empresas cadastradas', 'Motor Froc AI completo', 'SEO inteligente', 'Autopilot com aprovação manual', 'Artigos para blog', 'Conexões sociais', 'Suporte prioritário']
    },
    {
      id: 'plan_business', name: 'BUSINESS', price: 199.9, period: 'mês', credits: 450,
      bonusCredits: 30, totalCredits: 480, popular: false,
      features: ['480 créditos mensais incluídos', 'Até 15 empresas cadastradas', 'Autopilot automático', 'Campanhas multicanal', 'Froc Magazine', 'SEO técnico e Schema', 'Analytics consolidado']
    },
    {
      id: 'plan_agency', name: 'AGENCY', price: 399.9, period: 'mês', credits: 900,
      bonusCredits: 100, totalCredits: 1000, popular: false,
      features: ['1.000 créditos mensais incluídos', 'Empresas ilimitadas', 'Prioridade de processamento', 'Autopilot multi-marca', 'Roteiros e prompts avançados', 'Webhooks e integrações', 'Gerente de conta dedicado']
    }
  ],
  creditCosts: CREDIT_COSTS
} as const;


export function assertProductionConfig(): void {
  if (!isProduction) return;
  const requiredValues: Array<[string, string]> = [
    ['APP_URL', config.appUrl],
    ['FIREBASE_ADMIN_PROJECT_ID', config.firebase.projectId],
    ['FIREBASE_ADMIN_CLIENT_EMAIL', config.firebase.clientEmail],
    ['FIREBASE_ADMIN_PRIVATE_KEY', config.firebase.privateKey],
    ['TOKEN_ENCRYPTION_KEY', config.encryptionKey],
    ['CRON_SECRET', config.cronSecret],
    ['GEMINI_API_KEY', config.geminiApiKey],
    ['GEMINI_MEDIA_API_KEY', process.env.GEMINI_MEDIA_API_KEY || '']
  ];
  for (const [name, value] of requiredValues) {
    if (!value) throw new Error(`[Froc.IA] Configuração de produção incompleta: ${name}`);
  }

  // Validação estrita de formato e segurança para APP_URL em produção
  if (!config.appUrl.startsWith('https://')) {
    throw new Error(`[Froc.IA] APP_URL em produção deve usar HTTPS obrigatório (atual: ${config.appUrl})`);
  }
  if (config.appUrl.includes('localhost') || config.appUrl.includes('127.0.0.1')) {
    throw new Error(`[Froc.IA] APP_URL em produção não pode ser localhost ou 127.0.0.1 (atual: ${config.appUrl})`);
  }

  if (config.mercadoPago.accessToken || config.mercadoPago.webhookSecret) {
    if (!config.mercadoPago.accessToken) throw new Error('[Froc.IA] Configuração de produção incompleta: MERCADO_PAGO_ACCESS_TOKEN');
    if (!config.mercadoPago.webhookSecret) throw new Error('[Froc.IA] Configuração de produção incompleta: MERCADO_PAGO_WEBHOOK_SECRET');
  }

  if (config.adminBootstrap.enabled && !config.adminBootstrap.key) {
    throw new Error('[Froc.IA] ADMIN_BOOTSTRAP_KEY obrigatória quando ADMIN_BOOTSTRAP_ENABLED=true');
  }

  // Validação de pares de credenciais OAuth opcionais
  const oauthProviders = [
    { name: 'Meta', id: config.social.meta.clientId, secret: config.social.meta.clientSecret, idVar: 'META_APP_ID', secretVar: 'META_APP_SECRET' },
    { name: 'LinkedIn', id: config.social.linkedin.clientId, secret: config.social.linkedin.clientSecret, idVar: 'LINKEDIN_CLIENT_ID', secretVar: 'LINKEDIN_CLIENT_SECRET' },
    { name: 'Google/YouTube', id: config.social.google.clientId, secret: config.social.google.clientSecret, idVar: 'GOOGLE_CLIENT_ID', secretVar: 'GOOGLE_CLIENT_SECRET' },
    { name: 'TikTok', id: config.social.tiktok.clientId, secret: config.social.tiktok.clientSecret, idVar: 'TIKTOK_CLIENT_KEY', secretVar: 'TIKTOK_CLIENT_SECRET' },
    { name: 'Pinterest', id: config.social.pinterest.clientId, secret: config.social.pinterest.clientSecret, idVar: 'PINTEREST_APP_ID', secretVar: 'PINTEREST_APP_SECRET' },
    { name: 'X', id: config.social.x.clientId, secret: config.social.x.clientSecret, idVar: 'X_CLIENT_ID', secretVar: 'X_CLIENT_SECRET' }
  ];

  for (const p of oauthProviders) {
    if (Boolean(p.id) !== Boolean(p.secret)) {
      throw new Error(`[Froc.IA] Configuração OAuth incompleta para ${p.name}: ${p.idVar} e ${p.secretVar} devem ser configurados juntos.`);
    }
  }
}
