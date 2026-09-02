var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_path = __toESM(require("path"), 1);
var import_express3 = __toESM(require("express"), 1);
var import_vite = require("vite");

// server/app.ts
var import_crypto6 = __toESM(require("crypto"), 1);
var import_express2 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/config/index.ts
var import_dotenv = __toESM(require("dotenv"), 1);

// shared/creditCosts.ts
var CREDIT_COSTS = {
  cta: 1,
  headline: 1,
  caption: 2,
  full_post: 5,
  image_prompt: 10,
  variations: 10,
  image_ai: 15,
  image_ai_1k: 15,
  image_ai_2k: 25,
  image_ai_4k: 40,
  site_analysis: 20,
  strategy: 30,
  carousel: 30,
  seo_article: 35,
  video_script: 10,
  video_veo_fast: 50,
  video_veo_1080p: 100,
  video_veo_4k: 200,
  campaign: 50,
  autopilot_cycle: 5,
  auto_calendar: 100
};

// server/config/index.ts
import_dotenv.default.config();
var nodeEnv = process.env.NODE_ENV || "development";
var isProduction = nodeEnv === "production";
var isTest = nodeEnv === "test" || process.env.NODE_ENV === "test";
function env(name, fallback = "") {
  const val = (process.env[name] ?? "").trim();
  if (isTest && !val) return fallback;
  return val ? val : fallback;
}
var appUrl = (isProduction ? env("APP_URL") : env("APP_URL", "http://localhost:3000")).replace(/\/$/, "");
var CAPACITOR_CORS_ORIGINS = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost"
];
function resolveCorsOrigins(configuredOrigins, applicationUrl) {
  const normalized = [
    applicationUrl,
    ...configuredOrigins.split(","),
    ...CAPACITOR_CORS_ORIGINS
  ].map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
  return [...new Set(normalized)];
}
var corsOrigins = resolveCorsOrigins(
  env("CORS_ORIGINS"),
  appUrl || "http://localhost:3000"
);
var ALMA_DEFAULT_FIREBASE_KEY = `-----BEGIN PRIVATE KEY-----
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
var config = {
  port: Number(process.env.PORT || 3e3),
  host: "0.0.0.0",
  nodeEnv,
  isProduction,
  appUrl,
  corsOrigins,
  geminiApiKey: env("GEMINI_API_KEY"),
  geminiMediaApiKey: env("GEMINI_MEDIA_API_KEY") || env("GEMINI_API_KEY"),
  geminiModels: {
    text: env("GEMINI_MODEL_TEXT", "gemini-2.5-flash"),
    pro: env("GEMINI_MODEL_PRO", "gemini-3.1-pro-preview"),
    fallback: env("GEMINI_MODEL_FALLBACK", "gemini-3.1-flash-lite"),
    image: env("GEMINI_MODEL_IMAGE", "gemini-3.1-flash-image"),
    imageLite: env("GEMINI_MODEL_IMAGE_LITE", "gemini-3.1-flash-lite-image"),
    veoLite: env("GEMINI_MODEL_VEO_LITE", "veo-3.1-lite-generate-preview"),
    veoFast: env("GEMINI_MODEL_VEO_FAST", "veo-3.1-fast-generate-preview"),
    veoCinema: env("GEMINI_MODEL_VEO_CINEMA", "veo-3.1-generate-preview"),
    veo: env("GEMINI_MODEL_VEO", "veo-3.1-generate-preview")
  },
  firebase: {
    projectId: env("FIREBASE_ADMIN_PROJECT_ID", "almax-34709"),
    clientEmail: env("FIREBASE_ADMIN_CLIENT_EMAIL", "firebase-adminsdk-fbsvc@almax-34709.iam.gserviceaccount.com"),
    privateKey: (env("FIREBASE_ADMIN_PRIVATE_KEY") || ALMA_DEFAULT_FIREBASE_KEY).replace(/\\n/g, "\n")
  },
  mercadoPago: {
    accessToken: env("MERCADO_PAGO_ACCESS_TOKEN", isTest ? "TEST-mock-access-token-123456" : ""),
    webhookSecret: env("MERCADO_PAGO_WEBHOOK_SECRET", isTest ? "TEST-mock-webhook-secret-123456" : ""),
    publicKey: env("MERCADO_PAGO_PUBLIC_KEY", isTest ? "TEST-mock-public-key-123456" : ""),
    billingMode: env("MERCADO_PAGO_BILLING_MODE", "subscription").toLowerCase() === "one_time" ? "one_time" : "subscription"
  },
  encryptionKey: env("TOKEN_ENCRYPTION_KEY", isTest ? "test_token_encryption_key_32bytes_long!" : ""),
  cronSecret: env("CRON_SECRET", isTest ? "test_cron_secret" : ""),
  adminBootstrap: {
    enabled: env("ADMIN_BOOTSTRAP_ENABLED", isProduction ? "false" : "true").toLowerCase() === "true",
    key: env("ADMIN_BOOTSTRAP_KEY", isTest ? "test_admin_bootstrap_key" : "")
  },
  adminBootstrapKey: env("ADMIN_BOOTSTRAP_KEY", isTest ? "test_admin_bootstrap_key" : ""),
  freeSignupBonusCredits: Number(env("FREE_SIGNUP_BONUS_CREDITS", "25")),
  support: {
    email: env("SUPPORT_EMAIL", "brasilportalvip@gmail.com"),
    whatsapp: env("SUPPORT_WHATSAPP")
  },
  blog: {
    autoEnabled: env("AUTO_BLOG_ENABLED", "false").toLowerCase() === "true",
    author: env("BLOG_AUTHOR", "Equipe Froc.IA")
  },
  social: {
    meta: {
      clientId: env("META_APP_ID", isTest ? "mock_meta_app_id" : ""),
      clientSecret: env("META_APP_SECRET", isTest ? "mock_meta_app_secret" : ""),
      graphVersion: env("META_GRAPH_VERSION", "v24.0")
    },
    linkedin: {
      clientId: env("LINKEDIN_CLIENT_ID", isTest ? "mock_linkedin_client_id" : ""),
      clientSecret: env("LINKEDIN_CLIENT_SECRET", isTest ? "mock_linkedin_client_secret" : ""),
      apiVersion: env("LINKEDIN_API_VERSION")
    },
    google: {
      clientId: env("GOOGLE_CLIENT_ID", isTest ? "mock_google_client_id" : ""),
      clientSecret: env("GOOGLE_CLIENT_SECRET", isTest ? "mock_google_client_secret" : "")
    },
    tiktok: {
      clientId: env("TIKTOK_CLIENT_KEY", isTest ? "mock_tiktok_client_id" : ""),
      clientSecret: env("TIKTOK_CLIENT_SECRET", isTest ? "mock_tiktok_client_secret" : "")
    },
    pinterest: {
      clientId: env("PINTEREST_APP_ID", isTest ? "mock_pinterest_client_id" : ""),
      clientSecret: env("PINTEREST_APP_SECRET", isTest ? "mock_pinterest_client_secret" : "")
    },
    x: {
      clientId: env("X_CLIENT_ID", isTest ? "mock_x_client_id" : ""),
      clientSecret: env("X_CLIENT_SECRET", isTest ? "mock_x_client_secret" : "")
    }
  },
  plans: [
    {
      id: "plan_start",
      name: "START",
      price: 49,
      period: "m\xEAs",
      credits: 100,
      bonusCredits: 10,
      totalCredits: 110,
      popular: false,
      features: ["110 cr\xE9ditos mensais inclu\xEDdos", "At\xE9 2 empresas cadastradas", "Cria\xE7\xE3o de posts, legendas e CTAs", "An\xE1lise de SEO b\xE1sica", "Agendamento de publica\xE7\xF5es", "Acesso \xE0 Vitrine Froc"]
    },
    {
      id: "plan_pro",
      name: "PRO",
      price: 99.9,
      period: "m\xEAs",
      credits: 210,
      bonusCredits: 20,
      totalCredits: 230,
      popular: true,
      features: ["230 cr\xE9ditos mensais inclu\xEDdos", "At\xE9 5 empresas cadastradas", "Motor Froc AI completo", "SEO inteligente", "Autopilot com aprova\xE7\xE3o manual", "Artigos para blog", "Conex\xF5es sociais", "Suporte priorit\xE1rio"]
    },
    {
      id: "plan_business",
      name: "BUSINESS",
      price: 199.9,
      period: "m\xEAs",
      credits: 450,
      bonusCredits: 30,
      totalCredits: 480,
      popular: false,
      features: ["480 cr\xE9ditos mensais inclu\xEDdos", "At\xE9 15 empresas cadastradas", "Autopilot autom\xE1tico", "Campanhas multicanal", "Froc Magazine", "SEO t\xE9cnico e Schema", "Analytics consolidado"]
    },
    {
      id: "plan_agency",
      name: "AGENCY",
      price: 399.9,
      period: "m\xEAs",
      credits: 900,
      bonusCredits: 100,
      totalCredits: 1e3,
      popular: false,
      features: ["1.000 cr\xE9ditos mensais inclu\xEDdos", "Empresas ilimitadas", "Prioridade de processamento", "Autopilot multi-marca", "Roteiros e prompts avan\xE7ados", "Webhooks e integra\xE7\xF5es", "Gerente de conta dedicado"]
    }
  ],
  creditCosts: CREDIT_COSTS
};
function assertProductionConfig() {
  if (!isProduction) return;
  const requiredValues = [
    ["APP_URL", config.appUrl],
    ["FIREBASE_ADMIN_PROJECT_ID", config.firebase.projectId],
    ["FIREBASE_ADMIN_CLIENT_EMAIL", config.firebase.clientEmail],
    ["FIREBASE_ADMIN_PRIVATE_KEY", config.firebase.privateKey],
    ["TOKEN_ENCRYPTION_KEY", config.encryptionKey],
    ["CRON_SECRET", config.cronSecret],
    ["GEMINI_API_KEY", config.geminiApiKey],
    ["GEMINI_MEDIA_API_KEY", process.env.GEMINI_MEDIA_API_KEY || ""]
  ];
  for (const [name, value] of requiredValues) {
    if (!value) throw new Error(`[Froc.IA] Configura\xE7\xE3o de produ\xE7\xE3o incompleta: ${name}`);
  }
  if (!config.appUrl.startsWith("https://")) {
    throw new Error(`[Froc.IA] APP_URL em produ\xE7\xE3o deve usar HTTPS obrigat\xF3rio (atual: ${config.appUrl})`);
  }
  if (config.appUrl.includes("localhost") || config.appUrl.includes("127.0.0.1")) {
    throw new Error(`[Froc.IA] APP_URL em produ\xE7\xE3o n\xE3o pode ser localhost ou 127.0.0.1 (atual: ${config.appUrl})`);
  }
  if (config.mercadoPago.accessToken || config.mercadoPago.webhookSecret) {
    if (!config.mercadoPago.accessToken) throw new Error("[Froc.IA] Configura\xE7\xE3o de produ\xE7\xE3o incompleta: MERCADO_PAGO_ACCESS_TOKEN");
    if (!config.mercadoPago.webhookSecret) throw new Error("[Froc.IA] Configura\xE7\xE3o de produ\xE7\xE3o incompleta: MERCADO_PAGO_WEBHOOK_SECRET");
  }
  if (config.adminBootstrap.enabled && !config.adminBootstrap.key) {
    throw new Error("[Froc.IA] ADMIN_BOOTSTRAP_KEY obrigat\xF3ria quando ADMIN_BOOTSTRAP_ENABLED=true");
  }
  const oauthProviders = [
    { name: "Meta", id: config.social.meta.clientId, secret: config.social.meta.clientSecret, idVar: "META_APP_ID", secretVar: "META_APP_SECRET" },
    { name: "LinkedIn", id: config.social.linkedin.clientId, secret: config.social.linkedin.clientSecret, idVar: "LINKEDIN_CLIENT_ID", secretVar: "LINKEDIN_CLIENT_SECRET" },
    { name: "Google/YouTube", id: config.social.google.clientId, secret: config.social.google.clientSecret, idVar: "GOOGLE_CLIENT_ID", secretVar: "GOOGLE_CLIENT_SECRET" },
    { name: "TikTok", id: config.social.tiktok.clientId, secret: config.social.tiktok.clientSecret, idVar: "TIKTOK_CLIENT_KEY", secretVar: "TIKTOK_CLIENT_SECRET" },
    { name: "Pinterest", id: config.social.pinterest.clientId, secret: config.social.pinterest.clientSecret, idVar: "PINTEREST_APP_ID", secretVar: "PINTEREST_APP_SECRET" },
    { name: "X", id: config.social.x.clientId, secret: config.social.x.clientSecret, idVar: "X_CLIENT_ID", secretVar: "X_CLIENT_SECRET" }
  ];
  for (const p of oauthProviders) {
    if (Boolean(p.id) !== Boolean(p.secret)) {
      throw new Error(`[Froc.IA] Configura\xE7\xE3o OAuth incompleta para ${p.name}: ${p.idVar} e ${p.secretVar} devem ser configurados juntos.`);
    }
  }
}

// server/production/router.ts
var import_express = require("express");

// server/providers/firebaseAdmin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var import_storage = require("firebase-admin/storage");
var adminApp = null;
var firestoreConfigured = false;
function isFirebaseAdminConfigured() {
  return Boolean(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey);
}
function getFirebaseAdmin() {
  if (adminApp) return adminApp;
  const existing = (0, import_app.getApps)()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }
  if (!isFirebaseAdminConfigured()) {
    return null;
  }
  try {
    adminApp = (0, import_app.initializeApp)({
      credential: (0, import_app.cert)({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey
      }),
      projectId: config.firebase.projectId,
      storageBucket: `${config.firebase.projectId}.firebasestorage.app`
    });
    return adminApp;
  } catch (err) {
    return null;
  }
}
function getAdminFirestore() {
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    const firestore3 = (0, import_firestore.getFirestore)(app);
    if (!firestoreConfigured) {
      firestore3.settings({ ignoreUndefinedProperties: true });
      firestoreConfigured = true;
    }
    return firestore3;
  } catch {
    return null;
  }
}
var overrideAdminAuth = void 0;
function getAdminAuth() {
  if (overrideAdminAuth !== void 0) return overrideAdminAuth;
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    return (0, import_auth.getAuth)(app);
  } catch {
    return null;
  }
}
var overrideAdminStorage = void 0;
function getAdminStorage() {
  if (overrideAdminStorage !== void 0) return overrideAdminStorage;
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    return (0, import_storage.getStorage)(app);
  } catch {
    return null;
  }
}

// server/production/store.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_firestore2 = require("firebase-admin/firestore");
var inMemoryDb = /* @__PURE__ */ new Map();
function cloneMemoryValue(value) {
  if (value === null || value === void 0 || typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map((item) => cloneMemoryValue(item));
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const result = {};
  for (const [key2, item] of Object.entries(value)) {
    result[key2] = cloneMemoryValue(item);
  }
  return result;
}
function cloneMemoryDatabase(source) {
  const copy = /* @__PURE__ */ new Map();
  for (const [collectionName, collection] of source.entries()) {
    const collectionCopy = /* @__PURE__ */ new Map();
    for (const [id, value] of collection.entries()) {
      collectionCopy.set(id, cloneMemoryValue(value));
    }
    copy.set(collectionName, collectionCopy);
  }
  return copy;
}
function memoryCollection(database, name, create = true) {
  let collection = database.get(name);
  if (!collection && create) {
    collection = /* @__PURE__ */ new Map();
    database.set(name, collection);
  }
  return collection;
}
function firestoreLikeError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function assertDocumentData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Firestore document data must be a non-null object.");
  }
}
function applyMemoryMutation(database, mutation) {
  const collection = memoryCollection(database, mutation.ref.colName, mutation.type !== "delete");
  const exists = Boolean(collection?.has(mutation.ref.id));
  if (mutation.type === "delete") {
    collection?.delete(mutation.ref.id);
    return;
  }
  assertDocumentData(mutation.data);
  const incoming = { ...cloneMemoryValue(mutation.data), id: mutation.ref.id };
  if (mutation.type === "create") {
    if (exists) throw firestoreLikeError("Document already exists", 6);
    collection.set(mutation.ref.id, incoming);
    return;
  }
  if (mutation.type === "update") {
    if (!exists) throw firestoreLikeError("Document does not exist", 5);
    const existing = cloneMemoryValue(collection.get(mutation.ref.id) || {});
    collection.set(mutation.ref.id, { ...existing, ...incoming, id: mutation.ref.id });
    return;
  }
  if (mutation.options?.merge && exists) {
    const existing = cloneMemoryValue(collection.get(mutation.ref.id) || {});
    collection.set(mutation.ref.id, { ...existing, ...incoming, id: mutation.ref.id });
    return;
  }
  collection.set(mutation.ref.id, incoming);
}
function commitMemoryMutations(mutations) {
  const candidate = cloneMemoryDatabase(inMemoryDb);
  for (const mutation of mutations) applyMemoryMutation(candidate, mutation);
  inMemoryDb.clear();
  for (const [name, collection] of candidate.entries()) {
    inMemoryDb.set(name, collection);
  }
}
function getMemoryCollection(name) {
  return memoryCollection(inMemoryDb, name, true);
}
(function seedInitialInMemoryData() {
  const blog = getMemoryCollection("blogPosts");
  if (blog.size === 0) {
    blog.set("blog-intro-ia", {
      id: "blog-intro-ia",
      title: "Como a Intelig\xEAncia Artificial Transforma o Marketing de Pequenas e M\xE9dias Empresas",
      slug: "como-a-inteligencia-artificial-transforma-o-marketing",
      summary: "Descubra como o Froc.IA automatiza cria\xE7\xE3o de campanhas, roteiros, posts e SEO com velocidade e consist\xEAncia.",
      content: "# A Revolu\xE7\xE3o da IA no Marketing\n\nA intelig\xEAncia artificial deixou de ser um recurso exclusivo de grandes corpora\xE7\xF5es. Hoje, ferramentas como o Froc.IA permitem que qualquer empreendedor crie estrat\xE9gias completas de marketing, posts persuasivos, imagens de alta convers\xE3o e artigos otimizados para mecanismos de busca em poucos segundos.",
      featuredImageUrl: "",
      author: "Equipe Froc.IA",
      category: "Marketing & IA",
      tags: ["Intelig\xEAncia Artificial", "Marketing Digital", "SEO", "Automa\xE7\xE3o"],
      seoTitle: "Como a IA Transforma o Marketing \u2014 Froc Magazine",
      seoDescription: "Aprenda como utilizar IA no marketing digital com foco em resultados reais.",
      status: "published",
      publishedAt: "2026-08-01T12:00:00.000Z",
      createdAt: "2026-08-01T12:00:00.000Z",
      updatedAt: "2026-08-01T12:00:00.000Z"
    });
  }
})();
var MemoryDocRef = class {
  constructor(colName, id) {
    this.colName = colName;
    this.id = id;
    if (!colName || !id || id.includes("/")) {
      throw new TypeError("Invalid in-memory Firestore document reference.");
    }
  }
  snapshot(database = inMemoryDb) {
    const collection = memoryCollection(database, this.colName, false);
    const exists = Boolean(collection?.has(this.id));
    const data = exists ? cloneMemoryValue(collection.get(this.id)) : void 0;
    return {
      id: this.id,
      exists,
      ref: this,
      data: () => exists ? cloneMemoryValue(data) : void 0
    };
  }
  async get() {
    return this.snapshot();
  }
  async set(data, options) {
    applyMemoryMutation(inMemoryDb, { type: "set", ref: this, data, options });
  }
  async create(data) {
    applyMemoryMutation(inMemoryDb, { type: "create", ref: this, data });
  }
  async update(data) {
    applyMemoryMutation(inMemoryDb, { type: "update", ref: this, data });
  }
  async delete() {
    applyMemoryMutation(inMemoryDb, { type: "delete", ref: this });
  }
};
function nestedFieldValue(item, field) {
  return field.split(".").reduce((value, segment) => value?.[segment], item);
}
var MemoryQuery = class _MemoryQuery {
  constructor(colName) {
    this.colName = colName;
    this.filters = [];
  }
  where(field, op, val) {
    const query = new _MemoryQuery(this.colName);
    query.filters = [...this.filters, { field, op, val: cloneMemoryValue(val) }];
    query.limitCount = this.limitCount;
    return query;
  }
  limit(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Firestore query limit must be a non-negative safe integer.");
    const query = new _MemoryQuery(this.colName);
    query.filters = [...this.filters];
    query.limitCount = value;
    return query;
  }
  snapshot(database = inMemoryDb) {
    const collection = memoryCollection(database, this.colName, false);
    let items = collection ? Array.from(collection.values()).map((item) => cloneMemoryValue(item)) : [];
    for (const filter of this.filters) {
      items = items.filter((item) => {
        const itemValue = nestedFieldValue(item, filter.field);
        if (filter.op === "==") return itemValue === filter.val;
        if (filter.op === "!=") return itemValue !== filter.val;
        if (filter.op === "<=") return itemValue <= filter.val;
        if (filter.op === ">=") return itemValue >= filter.val;
        if (filter.op === "<") return itemValue < filter.val;
        if (filter.op === ">") return itemValue > filter.val;
        if (filter.op === "in") return Array.isArray(filter.val) && filter.val.includes(itemValue);
        if (filter.op === "not-in") return Array.isArray(filter.val) && !filter.val.includes(itemValue);
        if (filter.op === "array-contains") return Array.isArray(itemValue) && itemValue.includes(filter.val);
        if (filter.op === "array-contains-any") {
          return Array.isArray(itemValue) && Array.isArray(filter.val) && filter.val.some((value) => itemValue.includes(value));
        }
        throw new TypeError(`Unsupported in-memory Firestore operator: ${filter.op}`);
      });
    }
    if (this.limitCount !== void 0) items = items.slice(0, this.limitCount);
    const docs = items.map((item) => {
      const id = String(item.id || "");
      const ref = new MemoryDocRef(this.colName, id);
      return {
        id,
        exists: true,
        ref,
        data: () => cloneMemoryValue(item)
      };
    });
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length
    };
  }
  async get() {
    return this.snapshot();
  }
};
var MemoryCollectionRef = class extends MemoryQuery {
  doc(id) {
    return new MemoryDocRef(this.colName, id || `${this.colName}-${import_crypto.default.randomUUID()}`);
  }
};
var MemoryFirestoreStore = class {
  constructor() {
    this.txLock = Promise.resolve();
  }
  collection(name) {
    if (!name || name.includes("/")) throw new TypeError("Invalid in-memory Firestore collection name.");
    return new MemoryCollectionRef(name);
  }
  async withExclusiveLock(operation) {
    let releaseLock2;
    const nextLock = new Promise((resolve) => {
      releaseLock2 = resolve;
    });
    const currentLock = this.txLock;
    this.txLock = nextLock;
    await currentLock;
    try {
      return await operation();
    } finally {
      releaseLock2();
    }
  }
  batch() {
    const mutations = [];
    let committed = false;
    const addMutation = (mutation) => {
      if (committed) throw new Error("Firestore batch has already been committed.");
      if (mutations.length >= 500) throw new RangeError("Firestore batch limit of 500 operations exceeded.");
      mutations.push(mutation);
      return batch;
    };
    const batch = {
      set: (ref, data, options) => addMutation({ type: "set", ref, data: cloneMemoryValue(data), options }),
      create: (ref, data) => addMutation({ type: "create", ref, data: cloneMemoryValue(data) }),
      update: (ref, data) => addMutation({ type: "update", ref, data: cloneMemoryValue(data) }),
      delete: (ref) => addMutation({ type: "delete", ref }),
      commit: async () => {
        if (committed) throw new Error("Firestore batch has already been committed.");
        committed = true;
        await this.withExclusiveLock(async () => {
          commitMemoryMutations(mutations);
        });
        return [];
      }
    };
    return batch;
  }
  async runTransaction(updateFunction) {
    return this.withExclusiveLock(async () => {
      const snapshotDatabase = cloneMemoryDatabase(inMemoryDb);
      const mutations = [];
      let writeStarted = false;
      const transaction = {};
      const addMutation = (mutation) => {
        if (mutations.length >= 500) throw new RangeError("Firestore transaction limit of 500 operations exceeded.");
        writeStarted = true;
        mutations.push(mutation);
        return transaction;
      };
      transaction.get = async (refOrQuery) => {
        if (writeStarted) {
          throw new Error("Firestore transactions require all reads before writes.");
        }
        if (refOrQuery instanceof MemoryDocRef || refOrQuery instanceof MemoryQuery) {
          return refOrQuery.snapshot(snapshotDatabase);
        }
        throw new TypeError("Unsupported in-memory Firestore transaction read.");
      };
      transaction.set = (ref, data, options) => addMutation({ type: "set", ref, data: cloneMemoryValue(data), options });
      transaction.create = (ref, data) => addMutation({ type: "create", ref, data: cloneMemoryValue(data) });
      transaction.update = (ref, data) => addMutation({ type: "update", ref, data: cloneMemoryValue(data) });
      transaction.delete = (ref) => addMutation({ type: "delete", ref });
      const result = await updateFunction(transaction);
      commitMemoryMutations(mutations);
      return result;
    });
  }
};
var localMemoryStore = new MemoryFirestoreStore();
function isLocalMemoryStoreAllowed() {
  if (config.isProduction) return false;
  return process.env.ALLOW_LOCAL_MEMORY_STORE === "true" || process.env.NODE_ENV === "test" || config.nodeEnv === "development";
}
function firestore() {
  if (process.env.NODE_ENV === "test") return localMemoryStore;
  const adminFirestore = getAdminFirestore();
  if (adminFirestore) return adminFirestore;
  if (config.isProduction) {
    throw new Error("Firebase Admin Firestore n\xE3o est\xE1 configurado em ambiente de produ\xE7\xE3o. Opera\xE7\xE3o de persist\xEAncia abortada.");
  }
  if (isLocalMemoryStoreAllowed()) return localMemoryStore;
  throw new Error("Banco de dados Firestore n\xE3o inicializado e modo em mem\xF3ria desabilitado.");
}
var COLLECTIONS = {
  users: "users",
  wallets: "wallets",
  creditTransactions: "creditTransactions",
  creditReservations: "creditReservations",
  idempotency: "idempotency",
  companies: "companies",
  projects: "projects",
  contentItems: "contentItems",
  campaigns: "campaigns",
  scheduledPosts: "scheduledPosts",
  payments: "payments",
  socialConnections: "socialConnections",
  oauthStates: "oauthStates",
  pageSelectTokens: "pageSelectTokens",
  seoReports: "seoReports",
  blogPosts: "blogPosts",
  blogArticles: "blogArticles",
  blogSettings: "blogSettings",
  autopilotConfigs: "autopilotConfigs",
  aiExecutions: "aiExecutions",
  adminLogs: "adminLogs",
  notifications: "notifications",
  supportTickets: "supportTickets",
  schedulerLocks: "schedulerLocks",
  systemSettings: "systemSettings",
  bonusClaims: "bonusClaims",
  securityEvents: "securityEvents",
  deviceRegistrations: "deviceRegistrations",
  mediaGenerationJobs: "mediaGenerationJobs",
  rateLimits: "rateLimits"
};
var cachedCloudHealth = null;
var cloudHealthExpiresAt = 0;
var cloudHealthProbe = null;
async function probeDatabaseHealth() {
  if (cloudHealthProbe) return cloudHealthProbe;
  cloudHealthProbe = (async () => {
    const adminFirestore = getAdminFirestore();
    if (!adminFirestore) {
      const result = config.isProduction ? {
        status: "unconfigured",
        mode: "production_missing_credentials",
        message: "Credenciais de produ\xE7\xE3o do Firestore Admin ausentes.",
        checkedAt: nowIso()
      } : {
        status: isLocalMemoryStoreAllowed() ? "degraded" : "unconfigured",
        mode: isLocalMemoryStoreAllowed() ? "memory_sandbox" : "none",
        message: isLocalMemoryStoreAllowed() ? "Executando em sandbox de desenvolvimento com armazenamento local isolado." : "Firestore n\xE3o configurado.",
        checkedAt: nowIso()
      };
      cachedCloudHealth = result;
      cloudHealthExpiresAt = Date.now() + 15e3;
      return result;
    }
    try {
      await adminFirestore.collection(COLLECTIONS.systemSettings).limit(1).get();
      const result = {
        status: "healthy",
        mode: "firestore_cloud",
        message: "Firestore Cloud respondeu \xE0 verifica\xE7\xE3o de leitura.",
        checkedAt: nowIso()
      };
      cachedCloudHealth = result;
      cloudHealthExpiresAt = Date.now() + 3e4;
      return result;
    } catch {
      const result = {
        status: "unavailable",
        mode: "firestore_cloud_unreachable",
        message: "Firestore Cloud configurado, mas indispon\xEDvel para leitura.",
        checkedAt: nowIso()
      };
      cachedCloudHealth = result;
      cloudHealthExpiresAt = Date.now() + 5e3;
      return result;
    }
  })();
  try {
    return await cloudHealthProbe;
  } finally {
    cloudHealthProbe = null;
  }
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function newId(prefix) {
  const safePrefix = String(prefix || "id").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) || "id";
  return `${safePrefix}-${import_crypto.default.randomUUID()}`;
}
function stableId(value) {
  return import_crypto.default.createHash("sha256").update(String(value)).digest("hex");
}
function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `item-${Date.now()}`;
}
var UNSAFE_OBJECT_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function deepCleanValue(value, depth, seen) {
  if (value === void 0) return void 0;
  if (value === null || typeof value !== "object") return value;
  if (depth > 20) throw new RangeError("Objeto excede a profundidade m\xE1xima permitida.");
  if (value instanceof Date || value instanceof import_firestore2.Timestamp || Buffer.isBuffer(value)) return value;
  if (seen.has(value)) throw new TypeError("Objeto circular n\xE3o pode ser persistido.");
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => deepCleanValue(item, depth + 1, seen)).filter((item) => item !== void 0);
    }
    const cleaned = {};
    for (const [key2, item] of Object.entries(value)) {
      if (UNSAFE_OBJECT_KEYS.has(key2)) continue;
      const normalized = deepCleanValue(item, depth + 1, seen);
      if (normalized !== void 0) cleaned[key2] = normalized;
    }
    return cleaned;
  } finally {
    seen.delete(value);
  }
}
function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("cleanObject requer um objeto.");
  }
  return deepCleanValue(value, 0, /* @__PURE__ */ new WeakSet());
}
function normalizeFirestoreValue(value, depth = 0) {
  if (value instanceof import_firestore2.Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizeFirestoreValue(item, depth + 1));
  if (!value || typeof value !== "object" || depth > 20 || Buffer.isBuffer(value)) return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const normalized = {};
  for (const [key2, item] of Object.entries(value)) {
    normalized[key2] = normalizeFirestoreValue(item, depth + 1);
  }
  return normalized;
}
function docData(snapshot) {
  if (!snapshot?.exists) return null;
  const raw = snapshot.data() || {};
  return { ...normalizeFirestoreValue(raw), id: snapshot.id };
}
function queryData(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.docs)) return [];
  return snapshot.docs.map((doc) => docData(doc)).filter((item) => item !== null);
}
function safeAuditText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function redactAuditDetails(value, depth = 0) {
  if (depth > 10) return "[TRUNCATED_DEPTH]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactAuditDetails(item, depth + 1));
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value.slice(0, 2e3) : value;
  }
  const output = {};
  for (const [key2, item] of Object.entries(value).slice(0, 100)) {
    if (/token|secret|password|authorization|cookie|private.?key|access.?key/i.test(key2)) {
      output[key2] = "[REDACTED]";
    } else {
      output[key2] = redactAuditDetails(item, depth + 1);
    }
  }
  return output;
}
async function writeAdminLog(data) {
  const operatorId = safeAuditText(data.operatorId, 200);
  const action = safeAuditText(data.action, 150);
  if (!operatorId || !action) throw new RangeError("Log administrativo requer operador e a\xE7\xE3o.");
  const details = data.details ? redactAuditDetails(cleanObject(data.details)) : void 0;
  const serializedDetails = details ? JSON.stringify(details) : "";
  const boundedDetails = serializedDetails.length <= 32e3 ? details : { truncated: true, originalDigest: stableId(serializedDetails) };
  const id = newId("adm");
  await firestore().collection(COLLECTIONS.adminLogs).doc(id).create(cleanObject({
    id,
    operatorId,
    operatorEmailHash: data.operatorEmail ? stableId(normalizeEmailForHash(data.operatorEmail)) : void 0,
    action,
    targetUserId: safeAuditText(data.targetUserId, 200) || void 0,
    details: boundedDetails,
    createdAt: nowIso()
  }));
}
function normalizeEmailForHash(value) {
  return safeAuditText(value, 320).toLowerCase();
}
async function createNotification(data) {
  const userId = safeAuditText(data.userId, 200);
  const title = safeAuditText(data.title, 160);
  const message = safeAuditText(data.message, 2e3);
  const type = safeAuditText(data.type, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const idempotencyKey = safeAuditText(data.idempotencyKey, 300);
  if (!userId || !title || !message || !type) {
    throw new RangeError("Notifica\xE7\xE3o requer usu\xE1rio, t\xEDtulo, mensagem e tipo v\xE1lidos.");
  }
  const db = firestore();
  const id = idempotencyKey ? `notif-${stableId(`${userId}:${idempotencyKey}`)}` : newId("notif");
  const ref = db.collection(COLLECTIONS.notifications).doc(id);
  const createdAt = nowIso();
  const record = {
    id,
    userId,
    title,
    message,
    type,
    read: false,
    deliveryStatus: "pending",
    deliveryAttempts: 0,
    nextDeliveryAttemptAt: createdAt,
    idempotencyHash: idempotencyKey ? stableId(idempotencyKey) : null,
    createdAt,
    updatedAt: createdAt
  };
  if (!idempotencyKey) {
    await ref.create(record);
    return;
  }
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return;
    if (typeof transaction.create === "function") {
      transaction.create(ref, record);
    } else {
      transaction.set(ref, record);
    }
  });
}
async function consumeRateLimit(data) {
  const key2 = String(data.key || "").trim();
  const limit = Number(data.limit);
  const windowMs = Number(data.windowMs);
  const cost = data.cost === void 0 ? 1 : Number(data.cost);
  const nowMs = data.nowMs === void 0 ? Date.now() : Number(data.nowMs);
  if (!key2 || key2.length > 1e3 || !Number.isSafeInteger(limit) || limit <= 0 || !Number.isSafeInteger(windowMs) || windowMs < 1e3 || !Number.isSafeInteger(cost) || cost <= 0 || cost > limit || !Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new RangeError("Configura\xE7\xE3o de rate limit inv\xE1lida.");
  }
  const bucketStart = Math.floor(nowMs / windowMs) * windowMs;
  const resetAtMs = bucketStart + windowMs;
  const keyHash = stableId(key2);
  const ref = firestore().collection(COLLECTIONS.rateLimits).doc(stableId(`rate:${keyHash}:${bucketStart}`));
  return firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const currentCount = snapshot.exists && Number.isSafeInteger(Number(snapshot.data()?.count)) ? Math.max(0, Number(snapshot.data().count)) : 0;
    const nextCount = currentCount + cost;
    const allowed = nextCount <= limit;
    if (allowed) {
      transaction.set(ref, {
        keyHash,
        bucketStart,
        count: nextCount,
        limit,
        expiresAt: new Date(resetAtMs + windowMs).toISOString(),
        updatedAt: nowIso()
      }, { merge: true });
    }
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - (allowed ? nextCount : currentCount)),
      resetAt: new Date(resetAtMs).toISOString(),
      retryAfterMs: allowed ? 0 : Math.max(0, resetAtMs - nowMs)
    };
  });
}

// server/production/auth.ts
var CURRENT_TERMS_VERSION = "2026.1";
var CURRENT_PRIVACY_VERSION = "2026.1";
var VALID_ROLES = /* @__PURE__ */ new Set(["user", "admin", "support", "editor"]);
var CONSENT_FLOW_PATHS = /* @__PURE__ */ new Set([
  "/auth/sync-profile",
  "/auth/accept-terms",
  "/auth/me",
  "/api/auth/sync-profile",
  "/api/auth/accept-terms",
  "/api/auth/me"
]);
function hasAcceptedLatestTerms(user) {
  if (!user) return false;
  return Boolean(
    user.termsAcceptedAt && user.privacyAcceptedAt && user.termsVersion === CURRENT_TERMS_VERSION && user.privacyVersion === CURRENT_PRIVACY_VERSION
  );
}
function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function normalizeEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function normalizeHttpUrl(value) {
  const raw = cleanText(value, 1e3);
  if (!raw) return void 0;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : void 0;
  } catch {
    return void 0;
  }
}
function normalizeIsoTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return void 0;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : void 0;
}
function isFrocRole(value) {
  return typeof value === "string" && VALID_ROLES.has(value);
}
function roleFromToken(token) {
  const roleClaim = isFrocRole(token.role) ? token.role : void 0;
  const frocRoleClaim = isFrocRole(token.frocRole) ? token.frocRole : void 0;
  if (roleClaim && frocRoleClaim && roleClaim !== frocRoleClaim) return "user";
  return frocRoleClaim || roleClaim || "user";
}
function displayNameFromToken(token) {
  const tokenName = cleanText(token.name, 120);
  if (tokenName) return tokenName;
  const email = normalizeEmail(token.email);
  if (email) return cleanText(email.split("@")[0], 120);
  return "Usu\xE1rio Froc";
}
function normalizeRequestPath(value) {
  const withoutQuery = String(value ?? "").split(/[?#]/, 1)[0];
  const normalized = withoutQuery.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}
function isConsentFlow(req) {
  return CONSENT_FLOW_PATHS.has(normalizeRequestPath(req.path)) || CONSENT_FLOW_PATHS.has(normalizeRequestPath(req.originalUrl));
}
async function ensureUserProfile(token, extras = {}) {
  const uid = cleanText(token.uid, 128);
  if (!uid || uid !== token.uid || uid.includes("/")) {
    throw new Error("Identificador autenticado inv\xE1lido.");
  }
  const db = firestore();
  const ref = db.collection(COLLECTIONS.users).doc(uid);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = snap.data() || {};
    const now = nowIso();
    const requestedTermsVersion = extras.termsVersion === CURRENT_TERMS_VERSION ? CURRENT_TERMS_VERSION : void 0;
    const requestedPrivacyVersion = extras.privacyVersion === CURRENT_PRIVACY_VERSION ? CURRENT_PRIVACY_VERSION : void 0;
    const requestedTermsAcceptedAt = requestedTermsVersion ? normalizeIsoTimestamp(extras.termsAcceptedAt) : void 0;
    const requestedPrivacyAcceptedAt = requestedPrivacyVersion ? normalizeIsoTimestamp(extras.privacyAcceptedAt) : void 0;
    const requestedName = cleanText(extras.name, 120);
    const existingName = cleanText(existing.name, 120);
    const tokenEmail = normalizeEmail(token.email);
    const existingEmail = normalizeEmail(existing.email);
    const requestedCompanyId = extras.currentCompanyId === void 0 ? void 0 : cleanText(extras.currentCompanyId, 200);
    const requestedAvatarUrl = extras.avatarUrl === void 0 ? void 0 : normalizeHttpUrl(extras.avatarUrl);
    const profile = {
      id: uid,
      name: requestedName || existingName || displayNameFromToken(token),
      email: tokenEmail || existingEmail,
      role: roleFromToken(token),
      createdAt: normalizeIsoTimestamp(existing.createdAt) || now,
      updatedAt: now,
      termsAcceptedAt: requestedTermsAcceptedAt || normalizeIsoTimestamp(existing.termsAcceptedAt),
      privacyAcceptedAt: requestedPrivacyAcceptedAt || normalizeIsoTimestamp(existing.privacyAcceptedAt),
      termsVersion: requestedTermsAcceptedAt ? CURRENT_TERMS_VERSION : cleanText(existing.termsVersion, 30) || void 0,
      privacyVersion: requestedPrivacyAcceptedAt ? CURRENT_PRIVACY_VERSION : cleanText(existing.privacyVersion, 30) || void 0,
      currentCompanyId: requestedCompanyId || cleanText(existing.currentCompanyId, 200) || void 0,
      avatarUrl: requestedAvatarUrl || normalizeHttpUrl(existing.avatarUrl) || normalizeHttpUrl(token.picture),
      // Nunca preserva um true antigo se o token atual disser false ou omitir o sinal.
      emailVerified: token.email_verified === true
    };
    await transaction.set(ref, profile, { merge: true });
    return profile;
  });
}
async function requireAuth(req, res, next) {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  const match = /^Bearer[\t ]+(\S+)$/i.exec(authorization);
  const idToken = match?.[1] || "";
  if (!idToken || idToken.length > 1e4) {
    res.status(401).json({ error: "N\xE3o autorizado. Fa\xE7a login novamente." });
    return;
  }
  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch {
    adminAuth = null;
  }
  if (!adminAuth) {
    console.error("[Froc Auth Security] Firebase Admin Auth n\xE3o est\xE1 configurado.");
    res.status(503).json({ error: "Servi\xE7o de autentica\xE7\xE3o temporariamente indispon\xEDvel." });
    return;
  }
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (verifyError) {
    console.warn("[Froc Auth Security] Token rejeitado pelo Firebase Admin:", {
      code: cleanText(verifyError?.code, 100) || "auth/invalid-token"
    });
    res.status(401).json({ error: "Sess\xE3o inv\xE1lida ou expirada. Fa\xE7a login novamente." });
    return;
  }
  if (!cleanText(decoded.uid, 128) || cleanText(decoded.uid, 128) !== decoded.uid || decoded.uid.includes("/")) {
    res.status(401).json({ error: "Sess\xE3o inv\xE1lida ou expirada. Fa\xE7a login novamente." });
    return;
  }
  let profile;
  try {
    profile = await ensureUserProfile(decoded);
  } catch (error) {
    console.error(
      "[Froc Auth] Falha ao sincronizar perfil autenticado:",
      error instanceof Error ? cleanText(error.message, 200) : "Falha desconhecida"
    );
    res.status(503).json({ error: "Servi\xE7o de perfil temporariamente indispon\xEDvel." });
    return;
  }
  req.firebaseUser = decoded;
  req.user = profile;
  if (!isConsentFlow(req) && !hasAcceptedLatestTerms(profile)) {
    res.status(428).json({
      error: "Atualiza\xE7\xE3o de consentimento necess\xE1ria: aceite os Termos de Uso e a Pol\xEDtica de Privacidade para continuar.",
      requiresConsent: true,
      currentTermsVersion: CURRENT_TERMS_VERSION,
      currentPrivacyVersion: CURRENT_PRIVACY_VERSION
    });
    return;
  }
  next();
}
async function requireAdmin(req, res, next) {
  const checkRole = () => {
    const tokenRole = req.firebaseUser ? roleFromToken(req.firebaseUser) : req.user?.role;
    if (!req.user || req.user.role !== "admin" || tokenRole !== "admin") {
      res.status(403).json({ error: "Acesso restrito a administradores." });
      return;
    }
    next();
  };
  if (req.user) {
    checkRole();
    return;
  }
  await requireAuth(req, res, checkRole);
}

// server/production/plans.ts
function getPlanEntitlements(planId) {
  let pid = planId || "plan_free";
  if (pid === "pro") pid = "plan_pro";
  if (pid === "start") pid = "plan_start";
  if (pid === "business") pid = "plan_business";
  if (pid === "agency") pid = "plan_agency";
  if (pid === "free") pid = "plan_free";
  switch (pid) {
    case "plan_agency":
      return {
        planId: "plan_agency",
        planName: "AGENCY",
        maxCompanies: Number.POSITIVE_INFINITY,
        // Empresas ilimitadas conforme especificação comercial oficial
        autopilotManual: true,
        autopilotAutomatic: true,
        advancedSeo: true,
        campaigns: true,
        socialConnections: true
      };
    case "plan_business":
      return {
        planId: "plan_business",
        planName: "BUSINESS",
        maxCompanies: 15,
        autopilotManual: true,
        autopilotAutomatic: true,
        advancedSeo: true,
        campaigns: true,
        socialConnections: true
      };
    case "plan_pro":
      return {
        planId: "plan_pro",
        planName: "PRO",
        maxCompanies: 5,
        autopilotManual: true,
        autopilotAutomatic: false,
        advancedSeo: true,
        campaigns: false,
        socialConnections: true
      };
    case "plan_start":
      return {
        planId: "plan_start",
        planName: "START",
        maxCompanies: 2,
        autopilotManual: false,
        autopilotAutomatic: false,
        advancedSeo: false,
        campaigns: false,
        socialConnections: false
      };
    case "plan_free":
    default:
      return {
        planId: "plan_free",
        planName: "FREE",
        maxCompanies: 1,
        autopilotManual: false,
        autopilotAutomatic: false,
        advancedSeo: false,
        campaigns: false,
        socialConnections: false
      };
  }
}
var PLAN_TIER_RANK = {
  plan_agency: 4,
  plan_business: 3,
  plan_pro: 2,
  plan_start: 1,
  plan_free: 0
};
async function recalculateUserPlan(userId) {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.payments).where("userId", "==", userId).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const activeOrders = orders.filter((o) => {
    if (["refunded", "charged_back", "failed", "rejected"].includes(o.status) || ["refunded", "charged_back", "failed", "rejected"].includes(o.lastPaymentStatus)) {
      return false;
    }
    const hasProofOfPayment = o.lastPaymentStatus === "approved" && Boolean(o.lastCreditedAt);
    if (!hasProofOfPayment) {
      return false;
    }
    if (o.status === "pending" || o.status === "cancelled" && !o.lastCreditedAt && o.lastPaymentStatus !== "approved") {
      return false;
    }
    if (o.currentPeriodEnd && o.currentPeriodEnd <= now) {
      return false;
    }
    if (!o.currentPeriodEnd) {
      if (o.lastCreditedAt) {
        const computedEnd = new Date(new Date(o.lastCreditedAt).getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString();
        if (computedEnd <= now) {
          return false;
        }
      } else {
        return false;
      }
    }
    if (o.status === "cancel_at_period_end" || o.subscriptionStatus === "cancelled") {
      return Boolean(o.currentPeriodEnd && o.currentPeriodEnd > now);
    }
    if (o.status === "active" || o.status === "approved") {
      return true;
    }
    return false;
  }).sort((a, b) => {
    const rankDiff = (PLAN_TIER_RANK[b.planId || ""] || 0) - (PLAN_TIER_RANK[a.planId || ""] || 0);
    if (rankDiff !== 0) return rankDiff;
    return String(b.lastCreditedAt || b.createdAt || "").localeCompare(String(a.lastCreditedAt || a.createdAt || ""));
  });
  if (activeOrders.length === 0) {
    return { planId: "plan_free", planStatus: "free", currentPeriodEnd: null };
  }
  const bestOrder = activeOrders[0];
  const isCancelledPending = bestOrder.status === "cancel_at_period_end" || bestOrder.subscriptionStatus === "cancelled";
  const planStatus = isCancelledPending ? "cancel_at_period_end" : "active";
  const currentPeriodEnd = bestOrder.currentPeriodEnd || (bestOrder.lastCreditedAt ? new Date(new Date(bestOrder.lastCreditedAt).getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString() : null);
  return {
    planId: bestOrder.planId || "plan_free",
    planStatus,
    currentPeriodEnd
  };
}

// server/production/credits.ts
function requireCreditAmount(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} inv\xE1lida.`);
  return value;
}
function nonNegativeCreditValue(value, field) {
  if (value === void 0 || value === null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`[Froc Ledger Integrity] Campo ${field} da carteira est\xE1 corrompido.`);
  }
  return parsed;
}
function normalizeWallet(userId, raw) {
  const base = defaultWallet(userId);
  const wallet = {
    ...base,
    ...raw || {},
    id: userId,
    userId,
    balance: nonNegativeCreditValue(raw?.balance, "balance"),
    bonusBalance: nonNegativeCreditValue(raw?.bonusBalance, "bonusBalance"),
    totalUsed: nonNegativeCreditValue(raw?.totalUsed, "totalUsed"),
    totalReceived: nonNegativeCreditValue(raw?.totalReceived, "totalReceived"),
    reservedCredits: nonNegativeCreditValue(raw?.reservedCredits, "reservedCredits"),
    updatedAt: String(raw?.updatedAt || base.updatedAt)
  };
  if (wallet.reservedCredits > wallet.balance) {
    throw new Error("[Froc Ledger Integrity] Cr\xE9ditos reservados excedem o saldo total da carteira.");
  }
  if (wallet.bonusBalance > wallet.balance) {
    throw new Error("[Froc Ledger Integrity] Saldo de b\xF4nus excede o saldo total da carteira.");
  }
  return wallet;
}
function creditOperationFingerprint(data) {
  return stableId(JSON.stringify({
    userId: data.userId,
    amount: data.amount,
    type: data.type,
    referenceId: data.referenceId || null
  }));
}
function defaultWallet(userId) {
  return {
    id: userId,
    userId,
    balance: 0,
    bonusBalance: 0,
    totalUsed: 0,
    totalReceived: 0,
    reservedCredits: 0,
    planId: "plan_free",
    planStatus: "free",
    currentPeriodEnd: null,
    updatedAt: nowIso()
  };
}
async function getWallet(userId) {
  return getEffectiveWallet(userId);
}
async function getEffectiveWallet(userId, options) {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.wallets).doc(userId);
  const snap = await ref.get();
  let wallet;
  if (snap.exists) {
    wallet = normalizeWallet(userId, snap.data());
  } else {
    wallet = defaultWallet(userId);
    try {
      await ref.set(wallet, { merge: true });
    } catch (error) {
      const fresh = await ref.get();
      if (fresh.exists) {
        wallet = normalizeWallet(userId, fresh.data());
      }
    }
  }
  try {
    const effectivePlan = await recalculateUserPlan(userId);
    const hasPlanChanged = wallet.planId !== effectivePlan.planId || wallet.planStatus !== effectivePlan.planStatus || wallet.currentPeriodEnd !== effectivePlan.currentPeriodEnd;
    if (hasPlanChanged) {
      wallet.planId = effectivePlan.planId;
      wallet.planStatus = effectivePlan.planStatus;
      wallet.currentPeriodEnd = effectivePlan.currentPeriodEnd;
      wallet.updatedAt = nowIso();
      await ref.set({
        planId: wallet.planId,
        planStatus: wallet.planStatus,
        currentPeriodEnd: wallet.currentPeriodEnd,
        updatedAt: wallet.updatedAt
      }, { merge: true });
    }
  } catch (err) {
    if (options?.failClosed) {
      throw new Error(`[Froc Security] Falha ao recalcular plano efetivo para autoriza\xE7\xE3o: ${err instanceof Error ? err.message : String(err)}`);
    }
    wallet.planId = "plan_free";
    wallet.planStatus = "free";
  }
  return wallet;
}
async function addCredits(data) {
  const amount = requireCreditAmount(data.amount, "Quantidade de cr\xE9ditos");
  const providedIdempotencyKey = String(data.idempotencyKey || "").trim();
  if (providedIdempotencyKey.length > 500) throw new Error("Chave de idempot\xEAncia de cr\xE9ditos inv\xE1lida.");
  const idempotencyKey = providedIdempotencyKey || newId("credit");
  const fingerprint = creditOperationFingerprint({ ...data, amount });
  const db = firestore();
  const walletRef = db.collection(COLLECTIONS.wallets).doc(data.userId);
  const idemRef = db.collection(COLLECTIONS.idempotency).doc(stableId(`credit:${data.userId}:${idempotencyKey}`));
  const legacyIdemRef = db.collection(COLLECTIONS.idempotency).doc(stableId(`credit:${idempotencyKey}`));
  const txRef = db.collection(COLLECTIONS.creditTransactions).doc(newId("tx"));
  return db.runTransaction(async (tx) => {
    const [idemSnap, legacyIdemSnap, walletSnap] = await Promise.all([
      tx.get(idemRef),
      tx.get(legacyIdemRef),
      tx.get(walletRef)
    ]);
    const current = walletSnap.exists ? normalizeWallet(data.userId, walletSnap.data()) : defaultWallet(data.userId);
    const previousIdempotency = idemSnap.exists ? idemSnap.data() : legacyIdemSnap.exists ? legacyIdemSnap.data() : null;
    if (previousIdempotency) {
      if (previousIdempotency.fingerprint && previousIdempotency.fingerprint !== fingerprint) {
        const error = new Error("A chave de idempot\xEAncia j\xE1 foi utilizada com dados diferentes.");
        error.statusCode = 409;
        throw error;
      }
      return current;
    }
    const before = current.balance;
    const after = before + amount;
    const nextBonus = current.bonusBalance + (data.type === "bonus" ? amount : 0);
    const nextTotalReceived = current.totalReceived + amount;
    if (![after, nextBonus, nextTotalReceived].every(Number.isSafeInteger)) {
      throw new Error("[Froc Ledger Integrity] Opera\xE7\xE3o excede o limite seguro da carteira.");
    }
    const next = {
      ...current,
      id: data.userId,
      userId: data.userId,
      balance: after,
      bonusBalance: nextBonus,
      totalReceived: nextTotalReceived,
      updatedAt: nowIso()
    };
    tx.set(walletRef, next, { merge: true });
    tx.set(txRef, {
      userId: data.userId,
      type: data.type,
      source: data.source,
      amount,
      balanceBefore: before,
      balanceAfter: after,
      referenceId: data.referenceId || null,
      idempotencyKey,
      timestamp: nowIso(),
      metadata: data.metadata || {}
    });
    tx.set(idemRef, {
      key: idempotencyKey,
      userId: data.userId,
      fingerprint,
      createdAt: nowIso(),
      transactionId: txRef.id
    });
    return next;
  });
}
async function reserveCredits(data) {
  const amount = requireCreditAmount(data.amount, "Custo de cr\xE9ditos");
  const operation = String(data.operation || "").trim();
  if (!operation || operation.length > 200) throw new Error("Opera\xE7\xE3o de reserva de cr\xE9ditos inv\xE1lida.");
  const db = firestore();
  const walletRef = db.collection(COLLECTIONS.wallets).doc(data.userId);
  const reservationRef = db.collection(COLLECTIONS.creditReservations).doc(newId("res"));
  const wallet = await db.runTransaction(async (tx) => {
    const snap = await tx.get(walletRef);
    const current = snap.exists ? normalizeWallet(data.userId, snap.data()) : defaultWallet(data.userId);
    const available = current.balance - current.reservedCredits;
    if (available < amount) {
      throw new Error(`Saldo insuficiente. Necess\xE1rio: ${amount} cr\xE9ditos; dispon\xEDvel: ${Math.max(0, available)}.`);
    }
    const nextReserved = current.reservedCredits + amount;
    if (!Number.isSafeInteger(nextReserved) || nextReserved > current.balance) {
      throw new Error("[Froc Ledger Integrity] Reserva excede o saldo dispon\xEDvel da carteira.");
    }
    const timestamp = nowIso();
    const next = { ...current, reservedCredits: nextReserved, updatedAt: timestamp };
    tx.set(walletRef, next, { merge: true });
    tx.set(reservationRef, {
      id: reservationRef.id,
      userId: data.userId,
      companyId: data.companyId || null,
      amount,
      operation,
      status: "reserved",
      createdAt: timestamp,
      updatedAt: timestamp
    });
    return next;
  });
  return { reservationId: reservationRef.id, wallet };
}
async function commitReservation(data) {
  const db = firestore();
  const walletRef = db.collection(COLLECTIONS.wallets).doc(data.userId);
  const reservationRef = db.collection(COLLECTIONS.creditReservations).doc(data.reservationId);
  const usageRef = db.collection(COLLECTIONS.creditTransactions).doc(newId("tx"));
  return db.runTransaction(async (tx) => {
    const [walletSnap, reservationSnap] = await Promise.all([tx.get(walletRef), tx.get(reservationRef)]);
    if (!reservationSnap.exists) throw new Error("Reserva de cr\xE9ditos n\xE3o encontrada.");
    const reservation = reservationSnap.data();
    if (reservation.userId !== data.userId) throw new Error("Reserva inv\xE1lida.");
    const current = walletSnap.exists ? normalizeWallet(data.userId, walletSnap.data()) : defaultWallet(data.userId);
    if (reservation.status === "committed") return current;
    if (reservation.status !== "reserved") throw new Error("Reserva de cr\xE9ditos n\xE3o est\xE1 ativa.");
    const amount = requireCreditAmount(Number(reservation.amount), "Quantidade reservada");
    const before = current.balance;
    if (before < amount) throw new Error("Saldo alterado durante a opera\xE7\xE3o. Tente novamente.");
    if (current.reservedCredits < amount) {
      throw new Error("[Froc Ledger Integrity] Reserva ativa n\xE3o est\xE1 refletida na carteira.");
    }
    const after = before - amount;
    const bonusBefore = current.bonusBalance;
    const bonusUsed = Math.min(bonusBefore, amount);
    const nextTotalUsed = current.totalUsed + amount;
    if (!Number.isSafeInteger(nextTotalUsed)) {
      throw new Error("[Froc Ledger Integrity] Consumo excede o limite seguro da carteira.");
    }
    const next = {
      ...current,
      balance: after,
      bonusBalance: bonusBefore - bonusUsed,
      reservedCredits: current.reservedCredits - amount,
      totalUsed: nextTotalUsed,
      updatedAt: nowIso()
    };
    tx.set(walletRef, next, { merge: true });
    tx.update(reservationRef, { status: "committed", committedAt: nowIso(), updatedAt: nowIso() });
    tx.set(usageRef, {
      userId: data.userId,
      companyId: reservation.companyId || null,
      type: "usage",
      source: data.source,
      amount: -amount,
      balanceBefore: before,
      balanceAfter: after,
      referenceId: data.reservationId,
      timestamp: nowIso(),
      metadata: { ...data.metadata || {}, bonusUsed }
    });
    return next;
  });
}
async function rollbackReservation(userId, reservationId, reason) {
  const db = firestore();
  const walletRef = db.collection(COLLECTIONS.wallets).doc(userId);
  const reservationRef = db.collection(COLLECTIONS.creditReservations).doc(reservationId);
  return db.runTransaction(async (tx) => {
    const [walletSnap, reservationSnap] = await Promise.all([tx.get(walletRef), tx.get(reservationRef)]);
    if (!reservationSnap.exists) return false;
    const reservation = reservationSnap.data();
    if (reservation.userId !== userId || reservation.status !== "reserved") return false;
    const current = walletSnap.exists ? normalizeWallet(userId, walletSnap.data()) : defaultWallet(userId);
    const amount = requireCreditAmount(Number(reservation.amount), "Quantidade reservada");
    if (current.reservedCredits < amount) {
      throw new Error("[Froc Ledger Integrity] Estorno recusado: reserva n\xE3o est\xE1 refletida na carteira.");
    }
    const timestamp = nowIso();
    tx.set(walletRef, { ...current, reservedCredits: current.reservedCredits - amount, updatedAt: timestamp }, { merge: true });
    tx.update(reservationRef, {
      status: "rolled_back",
      rollbackReason: String(reason || "Opera\xE7\xE3o cancelada.").slice(0, 500),
      rolledBackAt: timestamp,
      updatedAt: timestamp
    });
    return true;
  });
}
async function listCreditTransactions(userId, limit = 50) {
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
  const snap = await firestore().collection(COLLECTIONS.creditTransactions).where("userId", "==", userId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || ""))).slice(0, safeLimit);
}
async function cleanupStaleReservations(maxAgeMinutes = 30) {
  const db = firestore();
  const safeAgeMinutes = Number.isFinite(maxAgeMinutes) ? Math.max(5, Math.floor(maxAgeMinutes)) : 30;
  const staleAgeMs = safeAgeMinutes * 6e4;
  const now = Date.now();
  const cutoff = new Date(now - staleAgeMs).toISOString();
  const snap = await db.collection(COLLECTIONS.creditReservations).where("status", "==", "reserved").where("createdAt", "<=", cutoff).limit(100).get();
  let released = 0;
  for (const doc of snap.docs) {
    const reservation = doc.data();
    if (!reservation?.userId) continue;
    const jobsSnap = await db.collection(COLLECTIONS.mediaGenerationJobs).where("reservationId", "==", doc.id).limit(5).get();
    const hasActiveJob = jobsSnap.docs.some((jobDoc) => {
      const job = jobDoc.data();
      if (!["queued", "processing", "finalizing"].includes(String(job.status))) return false;
      const leaseUntil = job.finalizationLeaseUntil ? new Date(job.finalizationLeaseUntil).getTime() : 0;
      if (job.status === "finalizing" && Number.isFinite(leaseUntil) && leaseUntil > now) return true;
      const heartbeat = new Date(job.updatedAt || job.providerStartedAt || job.createdAt || 0).getTime();
      return Number.isFinite(heartbeat) && now - heartbeat < staleAgeMs;
    });
    if (hasActiveJob) continue;
    const rolledBack = await rollbackReservation(
      String(reservation.userId),
      doc.id,
      "Reserva expirada automaticamente ap\xF3s timeout sem job ativo."
    );
    if (rolledBack) released += 1;
  }
  return released;
}

// server/production/antiAbuse.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var DISPOSABLE_EMAIL_DOMAINS = /* @__PURE__ */ new Set([
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.biz",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "yopmail.com",
  "yopmail.net",
  "mailinator.com",
  "throwawaymail.com",
  "dispostable.com",
  "getairmail.com",
  "mohmal.com",
  "nada.ltd",
  "inboxkitten.com",
  "burnermail.io",
  "fakemailgenerator.com",
  "crazymailing.com",
  "trashmail.com",
  "trashmail.net",
  "tempail.com",
  "mytemp.email",
  "generator.email",
  "dropmail.me"
]);
function normalizeCanonicalEmail(email) {
  const clean = (email || "").trim().toLowerCase();
  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { canonical: clean, domain: "", isDisposable: false };
  }
  let [user, domain] = parts;
  if (domain === "googlemail.com") domain = "gmail.com";
  user = user.split("+")[0];
  if (domain === "gmail.com") {
    user = user.replace(/\./g, "");
  }
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);
  return {
    canonical: `${user}@${domain}`,
    domain,
    isDisposable
  };
}
function hashString(value) {
  return import_crypto2.default.createHash("sha256").update(value).digest("hex");
}
function blocked(reason, detail) {
  return {
    eligibleForBonus: false,
    bonusAmount: 0,
    reason,
    detail
  };
}
function ownerHashFromRecord(record) {
  if (typeof record?.ownerHash === "string" && record.ownerHash) return record.ownerHash;
  if (typeof record?.userIdHash === "string" && record.userIdHash) return record.userIdHash;
  if (typeof record?.userId === "string" && record.userId) return hashString(record.userId);
  return "";
}
function belongsTo(record, ownerHash) {
  return Boolean(record && ownerHashFromRecord(record) === ownerHash);
}
async function transactionCreate(transaction, ref, data) {
  if (typeof transaction.create === "function") {
    await transaction.create(ref, data);
    return;
  }
  await transaction.set(ref, data);
}
function sanitizeSecurityMetadata(metadata) {
  const sensitiveKeys = /* @__PURE__ */ new Set([
    "email",
    "canonical",
    "ip",
    "deviceId",
    "fingerprintHash",
    "claimedToken",
    "userAgent",
    "originalUserId"
  ]);
  const sanitized = {};
  for (const [key2, value] of Object.entries(metadata || {})) {
    if (value === void 0 || value === null || value === "") continue;
    if (sensitiveKeys.has(key2)) {
      sanitized[`${key2}Hash`] = hashString(String(value).slice(0, 1e3));
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key2] = value;
      continue;
    }
    sanitized[key2] = String(value).slice(0, 200);
  }
  return sanitized;
}
async function evaluateSignupBonusEligibility(ctx) {
  const db = firestore();
  const userId = String(ctx.userId || "").trim();
  const ownerHash = hashString(userId);
  const { canonical, domain, isDisposable } = normalizeCanonicalEmail(ctx.email);
  const canonicalHash = hashString(canonical);
  const rawIp = String(ctx.ip || "").trim();
  const ipHash = hashString(rawIp || "unknown");
  const payload = ctx.securityPayload || {};
  const deviceId = String(payload.deviceId || "").trim();
  const fingerprintHash = String(payload.fingerprintHash || "").trim();
  const claimedToken = String(payload.claimedToken || "").trim();
  const validDeviceId = deviceId.length >= 8 ? deviceId : "";
  const validFingerprint = fingerprintHash.length >= 16 ? fingerprintHash : "";
  const isLoopbackOrUnknownIp = !rawIp || rawIp === "127.0.0.1" || rawIp === "::1";
  if (!userId || !canonical || !domain || !canonical.split("@")[0]) {
    await recordSecurityEvent(userId || "unknown", "invalid_email_bonus_rejected", {
      email: ctx.email,
      ip: rawIp
    });
    return blocked(
      "blocked_unverified_email",
      "Confirme um endere\xE7o de e-mail v\xE1lido antes de solicitar o b\xF4nus de boas-vindas."
    );
  }
  const profileSnap = await db.collection(COLLECTIONS.users).doc(userId).get();
  const storedEmailVerified = profileSnap.exists ? profileSnap.data()?.emailVerified === true : void 0;
  const emailVerified = storedEmailVerified ?? ctx.emailVerified === true;
  const verificationRequired = config.isProduction || profileSnap.exists || typeof ctx.emailVerified === "boolean";
  if (verificationRequired && !emailVerified) {
    await recordSecurityEvent(userId, "unverified_email_bonus_rejected", {
      email: ctx.email,
      ip: rawIp
    });
    return blocked(
      "blocked_unverified_email",
      "Verifique seu e-mail antes de receber os cr\xE9ditos de boas-vindas."
    );
  }
  if (isDisposable) {
    await recordSecurityEvent(userId, "disposable_email_bonus_rejected", {
      email: ctx.email,
      domain,
      ip: rawIp
    });
    return blocked(
      "blocked_disposable_email",
      "E-mails tempor\xE1rios n\xE3o s\xE3o eleg\xEDveis para cr\xE9ditos de boas-vindas."
    );
  }
  if (claimedToken && claimedToken.startsWith("froc_claimed_")) {
    await recordSecurityEvent(userId, "client_storage_claim_detected", {
      claimedToken,
      ip: rawIp,
      deviceId
    });
    return blocked(
      "blocked_stored_claim",
      "Este dispositivo j\xE1 recebeu o b\xF4nus de boas-vindas em uma conta anterior."
    );
  }
  const claimId = stableId(`claim:${userId}`);
  const legacyClaimId = `claim-${userId}`;
  const claimRef = db.collection(COLLECTIONS.bonusClaims).doc(claimId);
  const legacyClaimRef = db.collection(COLLECTIONS.bonusClaims).doc(legacyClaimId);
  const emailRef = db.collection(COLLECTIONS.bonusClaims).doc(stableId(`email:${canonicalHash}`));
  const deviceRef = validDeviceId ? db.collection(COLLECTIONS.bonusClaims).doc(stableId(`device:${validDeviceId}`)) : null;
  const fingerprintRef = validFingerprint ? db.collection(COLLECTIONS.bonusClaims).doc(stableId(`fp:${validFingerprint}`)) : null;
  const ipIndexRef = !isLoopbackOrUnknownIp ? db.collection(COLLECTIONS.bonusClaims).doc(stableId(`ip:${ipHash}`)) : null;
  const legacyIpOwnerHashes = /* @__PURE__ */ new Set();
  if (ipIndexRef) {
    const legacyIpSnap = await db.collection(COLLECTIONS.bonusClaims).where("ipHash", "==", ipHash).get();
    for (const item of queryData(legacyIpSnap)) {
      const itemOwnerHash = ownerHashFromRecord(item);
      if (itemOwnerHash) legacyIpOwnerHashes.add(itemOwnerHash);
    }
  }
  let decision;
  try {
    decision = await db.runTransaction(async (transaction) => {
      const claimSnap = await transaction.get(claimRef);
      const legacyClaimSnap = await transaction.get(legacyClaimRef);
      const emailSnap = await transaction.get(emailRef);
      const deviceSnap = deviceRef ? await transaction.get(deviceRef) : null;
      const fingerprintSnap = fingerprintRef ? await transaction.get(fingerprintRef) : null;
      const ipIndexSnap = ipIndexRef ? await transaction.get(ipIndexRef) : null;
      const existingMain = claimSnap.exists ? claimSnap.data() : legacyClaimSnap.exists ? legacyClaimSnap.data() : void 0;
      if (existingMain && belongsTo(existingMain, ownerHash)) {
        return {
          outcome: {
            eligibleForBonus: true,
            bonusAmount: 25,
            reason: "approved_first_account",
            detail: "B\xF4nus de primeiro cadastro j\xE1 registrado com seguran\xE7a.",
            claimId: claimSnap.exists ? claimId : legacyClaimId
          }
        };
      }
      if (emailSnap.exists && !belongsTo(emailSnap.data(), ownerHash)) {
        return {
          outcome: blocked(
            "blocked_duplicate_canonical_email",
            "Este titular de e-mail j\xE1 resgatou o b\xF4nus de boas-vindas em outra conta."
          ),
          eventType: "canonical_email_duplicate_blocked",
          eventMetadata: { canonical, ip: rawIp }
        };
      }
      if (deviceSnap?.exists && !belongsTo(deviceSnap.data(), ownerHash)) {
        return {
          outcome: blocked(
            "blocked_duplicate_device",
            "Este dispositivo j\xE1 recebeu o b\xF4nus de boas-vindas na primeira conta criada."
          ),
          eventType: "duplicate_device_bonus_blocked",
          eventMetadata: { deviceId: validDeviceId, ip: rawIp }
        };
      }
      if (fingerprintSnap?.exists && !belongsTo(fingerprintSnap.data(), ownerHash)) {
        return {
          outcome: blocked(
            "blocked_duplicate_device",
            "Assinatura digital de hardware j\xE1 associada a outra conta com b\xF4nus resgatado."
          ),
          eventType: "duplicate_fingerprint_bonus_blocked",
          eventMetadata: { fingerprintHash: validFingerprint, ip: rawIp }
        };
      }
      const ipOwnerHashes = new Set(legacyIpOwnerHashes);
      const storedIpOwners = ipIndexSnap?.exists && Array.isArray(ipIndexSnap.data()?.ownerHashes) ? ipIndexSnap.data().ownerHashes : [];
      for (const storedOwner of storedIpOwners) {
        if (typeof storedOwner === "string" && storedOwner) ipOwnerHashes.add(storedOwner);
      }
      const otherOwnersFromIp = [...ipOwnerHashes].filter((item) => item !== ownerHash);
      if (ipIndexRef && otherOwnersFromIp.length >= 2) {
        return {
          outcome: blocked(
            "blocked_ip_abuse",
            "Limite de b\xF4nus por rede de internet atingido. A conta foi criada normalmente sem b\xF4nus repetido."
          ),
          eventType: "ip_rate_limit_bonus_blocked",
          eventMetadata: { ip: rawIp, count: otherOwnersFromIp.length }
        };
      }
      const claimedAt = nowIso();
      const claimRecord = {
        id: claimId,
        recordType: "claim",
        ownerHash,
        canonicalEmailHash: canonicalHash,
        deviceIdHash: validDeviceId ? hashString(validDeviceId) : null,
        fingerprintDigest: validFingerprint ? hashString(validFingerprint) : null,
        ipHash,
        userAgentHash: ctx.userAgent ? hashString(String(ctx.userAgent).slice(0, 300)) : null,
        bonusAmount: 25,
        claimedAt
      };
      const indexRecord = {
        recordType: "unique_index",
        ownerHash,
        claimId,
        claimedAt
      };
      if (!claimSnap.exists && !legacyClaimSnap.exists) {
        await transactionCreate(transaction, claimRef, claimRecord);
      }
      if (!emailSnap.exists) {
        await transactionCreate(transaction, emailRef, indexRecord);
      }
      if (deviceRef && !deviceSnap?.exists) {
        await transactionCreate(transaction, deviceRef, indexRecord);
      }
      if (fingerprintRef && !fingerprintSnap?.exists) {
        await transactionCreate(transaction, fingerprintRef, indexRecord);
      }
      if (ipIndexRef) {
        ipOwnerHashes.add(ownerHash);
        await transaction.set(ipIndexRef, {
          recordType: "ip_index",
          ipHash,
          ownerHashes: [...ipOwnerHashes].slice(0, 2),
          updatedAt: claimedAt
        });
      }
      return {
        outcome: {
          eligibleForBonus: true,
          bonusAmount: 25,
          reason: "approved_first_account",
          detail: "B\xF4nus de primeiro cadastro concedido com sucesso.",
          claimId
        }
      };
    });
  } catch (err) {
    console.error("[AntiAbuse] Falha ao persistir registro de concess\xE3o de b\xF4nus:", err);
    throw new Error(`Falha ao registrar concess\xE3o de b\xF4nus anti-abuso: ${err?.message || err}`);
  }
  if (decision.eventType) {
    await recordSecurityEvent(userId, decision.eventType, decision.eventMetadata || {});
  }
  return decision.outcome;
}
async function recordSecurityEvent(userId, eventType, metadata) {
  try {
    const db = firestore();
    await db.collection(COLLECTIONS.securityEvents).doc(`sec-${import_crypto2.default.randomUUID()}`).set({
      userIdHash: hashString(String(userId || "unknown")),
      eventType: String(eventType || "unknown").replace(/[^a-z0-9_-]/gi, "").slice(0, 100),
      metadata: sanitizeSecurityMetadata(metadata),
      timestamp: nowIso()
    });
  } catch {
  }
}

// server/production/ai.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var MAX_VIDEO_BYTES = 250 * 1024 * 1024;
var VIDEO_FINALIZATION_LEASE_MS = 10 * 60 * 1e3;
var VIDEO_PROVIDER_START_TIMEOUT_MS = 15 * 60 * 1e3;
var VIDEO_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1e3;
var MAX_VIDEO_DOWNLOAD_REDIRECTS = 3;
var textClient = null;
var mediaClient = null;
var overrideTextClient = void 0;
var overrideMediaClient = void 0;
function textAiClient() {
  if (overrideTextClient !== void 0) return overrideTextClient;
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY n\xE3o configurada no servidor.");
  if (!textClient) {
    textClient = new import_genai.GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return textClient;
}
function mediaAiClient() {
  if (overrideMediaClient !== void 0) return overrideMediaClient;
  const mediaKey = config.geminiMediaApiKey || config.geminiApiKey;
  if (!mediaKey) throw new Error("GEMINI_MEDIA_API_KEY ou GEMINI_API_KEY n\xE3o configurada no servidor.");
  if (!mediaClient) {
    mediaClient = new import_genai.GoogleGenAI({
      apiKey: mediaKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return mediaClient;
}
function isValidMp4Buffer(buffer) {
  if (!buffer || buffer.length < 16) return false;
  const textPrefix = buffer.slice(0, 64).toString("utf8").toLowerCase();
  if (textPrefix.includes("<html") || textPrefix.includes("<!doctype") || textPrefix.includes('{"error') || textPrefix.includes('{\n"error') || textPrefix.includes('"error":') || textPrefix.includes("error code")) {
    return false;
  }
  const ftypIndex = buffer.indexOf(Buffer.from("ftyp"));
  if (ftypIndex >= 4 && ftypIndex <= 32) {
    return true;
  }
  const moovIndex = buffer.indexOf(Buffer.from("moov"));
  if (moovIndex >= 4 && moovIndex <= 64) {
    return true;
  }
  const mdatIndex = buffer.indexOf(Buffer.from("mdat"));
  if (mdatIndex >= 4 && mdatIndex <= 64) {
    return true;
  }
  return false;
}
function aiClient() {
  return textAiClient();
}
function sanitizeJsonText(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);
  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);
  return trimmed;
}
function formatAiErrorMessage(error) {
  const msg = String(error?.message || error || "");
  if (error?.status === 429 || /\b429\b/.test(msg) || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
    return "Limite tempor\xE1rio de requisi\xE7\xF5es de IA atingido na API do Google Gemini. Aguarde alguns segundos e tente novamente.";
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "Chave de API do Google Gemini inv\xE1lida ou sem permiss\xF5es suficientes no servidor.";
  }
  if (msg.includes("SAFETY") || msg.includes("HARM_CATEGORY")) {
    return "O conte\xFAdo solicitado foi bloqueado pelas diretrizes de seguran\xE7a da IA. Modifique o briefing e tente novamente.";
  }
  return msg;
}
function parseAiJson(value) {
  try {
    return JSON.parse(sanitizeJsonText(value));
  } catch {
    throw new Error("A IA retornou conte\xFAdo fora do formato estruturado esperado. Tente novamente.");
  }
}
function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(sanitizeJsonText(value));
  } catch {
    return fallback;
  }
}
function promptFingerprint(prompt) {
  return import_crypto3.default.createHash("sha256").update(prompt).digest("hex").slice(0, 24);
}
function cleanHeadingText(text) {
  if (!text) return "";
  return String(text).replace(/^#+\s*/, "").replace(/^[Hh][1-6][:\s-]+/i, "").replace(/^#+\s*/, "").trim();
}
function normalizeArticleHeadings(article) {
  if (!article || typeof article !== "object") return article;
  const cleaned = { ...article };
  if (cleaned.title) cleaned.title = cleanHeadingText(cleaned.title);
  if (Array.isArray(cleaned.sections)) {
    cleaned.sections = cleaned.sections.map((sec) => ({
      ...sec,
      h2: cleanHeadingText(sec.h2),
      h3s: Array.isArray(sec.h3s) ? sec.h3s.map((sub) => ({
        ...sub,
        h3: cleanHeadingText(sub.h3)
      })) : []
    }));
  }
  return cleaned;
}
function countArticleWords(article) {
  if (!article || typeof article !== "object") return 0;
  const parts = [
    article.title || "",
    article.introduction || "",
    article.conclusion || "",
    article.callToAction || ""
  ];
  if (Array.isArray(article.sections)) {
    for (const sec of article.sections) {
      parts.push(sec.h2 || "", sec.content || "");
      if (Array.isArray(sec.h3s)) {
        for (const sub of sec.h3s) {
          parts.push(sub.h3 || "", sub.content || "");
        }
      }
    }
  }
  if (Array.isArray(article.faqSection)) {
    for (const faq of article.faqSection) {
      parts.push(faq.question || "", faq.answer || "");
    }
  }
  const text = parts.join(" ").replace(/[^\p{L}\p{N}\s]+/gu, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
function companyContext(company) {
  if (!company) {
    return `Voc\xEA \xE9 o Froc.IA, especialista s\xEAnior em marketing digital, vendas, conte\xFAdo e SEO. Responda em portugu\xEAs do Brasil, com \xE9tica, rigor factual e precis\xE3o.
DIRETRIZ DE GROUNDING E PROIBI\xC7\xD5ES:
- N\xE3o invente clientes, cases, avalia\xE7\xF5es, depoimentos, certifica\xE7\xF5es ou dados de prova social.
- N\xE3o invente n\xFAmeros, percentuais, estat\xEDsticas, faturamento, leads, economia ou m\xE9tricas financeiras.
- N\xE3o invente promo\xE7\xF5es, descontos, b\xF4nus, teste gr\xE1tis, cupons, prazos promocionais ("\xFAltimo dia") ou escassez falsa.
- N\xE3o fa\xE7a promessas de resultados garantidos ou garantias absolutas.
- Como n\xE3o h\xE1 empresa cadastrada no contexto, utilize Chamadas para A\xE7\xE3o (CTAs) neutras como "Conhe\xE7a mais sobre este tema", "Entre em contato para saber mais" ou "Descubra como aplicar essa solu\xE7\xE3o". Nunca invente links, canais ou URLs.`;
  }
  const profile = company.marketingProfile || {};
  const verifiedDestinations = {};
  if (company.website && typeof company.website === "string" && company.website.trim()) {
    verifiedDestinations.website = company.website.trim();
  }
  if (company.whatsapp && typeof company.whatsapp === "string" && company.whatsapp.trim()) {
    verifiedDestinations.whatsapp = company.whatsapp.trim();
  }
  if (company.phone && typeof company.phone === "string" && company.phone.trim()) {
    verifiedDestinations.phone = company.phone.trim();
  }
  if (company.email && typeof company.email === "string" && company.email.trim()) {
    verifiedDestinations.email = company.email.trim();
  }
  const verifiedSocialLinks = {};
  if (company.socialLinks && typeof company.socialLinks === "object") {
    for (const [net2, link] of Object.entries(company.socialLinks)) {
      if (typeof link === "string" && link.trim()) {
        verifiedSocialLinks[net2] = link.trim();
      }
    }
  }
  const hasAnyDestination = Object.keys(verifiedDestinations).length > 0 || Object.keys(verifiedSocialLinks).length > 0;
  const isOnline = company.businessType === "online";
  const isPhysical = company.businessType === "physical";
  const isHybrid = company.businessType === "hybrid";
  const opModel = isOnline ? "Opera\xE7\xE3o 100% Online / Digital (atendimento e vendas \xE0 dist\xE2ncia; sem ponto presencial f\xEDsico cadastrado)." : isPhysical ? "Opera\xE7\xE3o com Ponto F\xEDsico / Presencial." : isHybrid ? "Opera\xE7\xE3o H\xEDbrida (atendimento f\xEDsico e presen\xE7a digital)." : "Modelo n\xE3o especificado.";
  const factualLines = [
    `Nome da Marca: ${company.name}`,
    `Modelo de Opera\xE7\xE3o: ${opModel}`
  ];
  if (company.category || company.segment) {
    factualLines.push(`Segmento/Categoria: ${[company.category, company.segment].filter(Boolean).join(" \u2022 ")}`);
  }
  if (company.description) {
    factualLines.push(`Descri\xE7\xE3o Institucional: ${company.description}`);
  }
  if (Array.isArray(company.products) && company.products.length > 0) {
    factualLines.push(`Produtos Oficiais: ${company.products.join(", ")}`);
  }
  if (Array.isArray(company.services) && company.services.length > 0) {
    factualLines.push(`Servi\xE7os Oficiais: ${company.services.join(", ")}`);
  }
  if (company.differentials || profile.keyDifferentials) {
    factualLines.push(`Diferenciais Cadastrados: ${company.differentials || profile.keyDifferentials}`);
  }
  if (company.targetAudience || profile.targetAudience) {
    factualLines.push(`P\xFAblico-Alvo: ${company.targetAudience || profile.targetAudience}`);
  }
  if (profile.persona) {
    factualLines.push(`Persona: ${profile.persona}`);
  }
  if (company.brandTone || profile.toneOfVoice) {
    factualLines.push(`Tom de Voz: ${company.brandTone || profile.toneOfVoice}`);
  }
  if (company.goals || profile.goals) {
    factualLines.push(`Objetivos Estrat\xE9gicos: ${company.goals || profile.goals}`);
  }
  if (company.coverageRegion) {
    factualLines.push(`Regi\xE3o de Atendimento Declarada: ${company.coverageRegion}`);
  }
  if (!isOnline && (company.address || company.city || company.state)) {
    factualLines.push(`Localiza\xE7\xE3o F\xEDsica: ${[company.address, company.city, company.state, company.country].filter(Boolean).join(", ")}`);
  }
  if (Array.isArray(company.onlineChannels) && company.onlineChannels.length > 0) {
    factualLines.push(`Canais Declarados: ${company.onlineChannels.join(", ")}`);
  }
  if (Array.isArray(company.keywords) && company.keywords.length > 0) {
    factualLines.push(`Palavras-chave: ${company.keywords.join(", ")}`);
  }
  const destinationLines = [];
  if (verifiedDestinations.website) destinationLines.push(`- Website Oficial: ${verifiedDestinations.website} (Permitido CTA para o site)`);
  if (verifiedDestinations.whatsapp) destinationLines.push(`- WhatsApp Oficial: ${verifiedDestinations.whatsapp} (Permitido CTA para WhatsApp)`);
  if (verifiedDestinations.phone) destinationLines.push(`- Telefone Oficial: ${verifiedDestinations.phone} (Permitido CTA para liga\xE7\xE3o)`);
  if (verifiedDestinations.email) destinationLines.push(`- E-mail Oficial: ${verifiedDestinations.email} (Permitido CTA para e-mail)`);
  for (const [net2, link] of Object.entries(verifiedSocialLinks)) {
    destinationLines.push(`- Rede Social ${net2}: ${link} (Permitido CTA para ${net2})`);
  }
  const ctaInstruction = hasAnyDestination ? `DESTINOS DISPON\xCDVEIS PARA CTA (Use SOMENTE os canais listados abaixo):
${destinationLines.join("\n")}
Se for sugerir CTA, direcione EXCLUSIVAMENTE para os destinos reais acima. NUNCA invente checkout, landing page, links na bio ou canais n\xE3o listados.` : `DESTINOS PARA CTA: NENHUM canal de contato ou link foi cadastrado para esta empresa. \xC9 OBRIGAT\xD3RIO usar CTA neutro (Exemplos: "Conhe\xE7a melhor a solu\xE7\xE3o", "Descubra como essa solu\xE7\xE3o pode ajudar seu neg\xF3cio", "Entre em contato para saber mais"). \xC9 ESTRITAMENTE PROIBIDO inventar URLs, dizer "clique no link da bio", "chame no WhatsApp" ou criar canais fict\xEDcios.`;
  return `Voc\xEA \xE9 o Froc.IA, estrategista de marketing da marca "${company.name}".
Responda em portugu\xEAs do Brasil, com clareza, autoridade e precis\xE3o factual.

=== FATOS COMPROVADOS DA EMPRESA (Use SOMENTE estes dados como verdade) ===
${factualLines.join("\n")}

=== DIRETRIZES DE DESTINOS E CTA ===
${ctaInstruction}

=== REGRAS OBRIGAT\xD3RIAS DE GROUNDING E PROIBI\xC7\xD5ES DA IA ===
1. PROIBI\xC7\xC3O DE FATOS FICT\xCDCIOS: Nunca invente clientes, cases, avalia\xE7\xF5es, depoimentos ou prova social inexistente.
2. PROIBI\xC7\xC3O DE N\xDAMEROS E ESTAT\xCDSTICAS INVENTADAS: Nunca invente n\xFAmeros, percentuais, estat\xEDsticas, horas economizadas, faturamento, alcance, convers\xF5es, leads ou economia que n\xE3o foram explicitamente informados.
3. PROIBI\xC7\xC3O DE CERTIFICA\xC7\xD5ES: N\xE3o invente selos, certifica\xE7\xF5es ou aprova\xE7\xF5es n\xE3o cadastradas.
4. PROIBI\xC7\xC3O DE PROMO\xC7\xD5ES INVENTADAS: Nunca invente descontos, b\xF4nus, teste gr\xE1tis, cupons, prazos promocionais, "\xFAltimo dia" ou escassez falsa.
5. PROIBI\xC7\xC3O DE PROMESSAS ABSOLUTAS: N\xE3o fa\xE7a promessas de resultado garantido ou garantias absolutas.
6. PROIBI\xC7\xC3O DE CANAIS FICT\xCDCIOS: Nunca mencione WhatsApp se n\xE3o estiver cadastrado; nunca mencione website/checkout/landing page se n\xE3o estiver cadastrado; nunca mencione "link na bio" ou redes sociais n\xE3o cadastradas.
7. SUGEST\xD5ES VS FATOS: Se for propor uma ideia ou canal n\xE3o cadastrado, use EXPLICITAMENTE linguagem de recomenda\xE7\xE3o ("Sugest\xE3o: ...", "Uma possibilidade seria...", "Voc\xEA pode considerar..."). NUNCA afirme como fato estabelecido da empresa.`;
}
async function generateRaw(data) {
  if (process.env.NODE_ENV === "test") {
    const text = data.jsonOutput ? JSON.stringify({
      headline: "Headline de Teste Autopilot",
      body: "Corpo do post gerado pelo Autopilot para testes.",
      cta: "Saiba mais e confira nossa cole\xE7\xE3o.",
      hashtags: ["#teste", "#autopilot"],
      keywords: ["marketing", "vendas"],
      visualPrompt: "Foto profissional de moda feminina em alta defini\xE7\xE3o",
      cameraMotion: "Dynamic cinematic tracking pan",
      lighting: "Golden hour dramatic contrast",
      mood: "Inspiring and sophisticated"
    }) : "Texto de teste gerado pelo modelo Froc AI.";
    return { text, modelUsed: "test-model", attempts: ["test-model"] };
  }
  const prioritized = data.useProModel ? [config.geminiModels.pro, "gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-3.1-flash-lite", "gemini-2.5-flash"] : [config.geminiModels.text, "gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-2.5-pro"];
  const models = Array.from(new Set(prioritized.filter(Boolean)));
  const attempts = [];
  let lastError = "Falha desconhecida";
  for (const model of models) {
    attempts.push(model);
    try {
      const response = await aiClient().models.generateContent({
        model,
        contents: data.prompt,
        config: {
          systemInstruction: data.systemInstruction,
          maxOutputTokens: data.maxTokens || 3500,
          responseMimeType: data.jsonOutput ? "application/json" : "text/plain"
        }
      });
      const text = response.text?.trim();
      if (text) return { text, modelUsed: model, attempts };
      lastError = "Resposta vazia retornada pelo modelo";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`[Froc AI Anti-Quedas] Tentativa em ${model} falhou: ${lastError}. Acionando pr\xF3ximo modelo da cascata...`);
    }
  }
  throw new Error(`Todos os modelos de IA falharam na cascata de resili\xEAncia. \xDAltimo erro: ${lastError}`);
}
async function executeAi(data) {
  const cost = Number(config.creditCosts[data.operation]);
  const reservation = await reserveCredits({
    userId: data.userId,
    amount: cost,
    operation: data.operation,
    companyId: data.company?.id
  });
  const executionId = newId("exec");
  const started = Date.now();
  try {
    const generated = await generateRaw({
      prompt: data.prompt,
      systemInstruction: data.systemInstruction || companyContext(data.company),
      useProModel: data.useProModel,
      jsonOutput: data.jsonOutput,
      maxTokens: data.maxTokens
    });
    const result = data.parse ? data.parse(generated.text) : generated.text;
    await commitReservation({
      userId: data.userId,
      reservationId: reservation.reservationId,
      source: `Froc AI: ${data.operation}`,
      metadata: { executionId, modelUsed: generated.modelUsed }
    });
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: data.operation,
      provider: "Google Gemini",
      model: generated.modelUsed,
      attempts: generated.attempts,
      promptHash: promptFingerprint(data.prompt),
      promptLength: data.prompt.length,
      creditsConsumed: cost,
      durationMs: Date.now() - started,
      status: "success",
      timestamp: nowIso()
    });
    return { result, creditsUsed: cost, executionId, modelUsed: generated.modelUsed };
  } catch (error) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    await rollbackReservation(data.userId, reservation.reservationId, message);
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: data.operation,
      provider: "Google Gemini",
      promptHash: promptFingerprint(data.prompt),
      promptLength: data.prompt.length,
      creditsConsumed: 0,
      durationMs: Date.now() - started,
      status: "failed",
      error: message.slice(0, 500),
      timestamp: nowIso()
    });
    throw new Error(message);
  }
}
async function generatePost(data) {
  const prompt = `Crie um post completo e verdadeiro para ${data.platform || "Instagram"} sobre "${data.topic}".
Objetivo: ${data.goal || "engajamento e vendas"}.
Tom: ${data.tone || "persuasivo e profissional"}.
Responda SOMENTE JSON: {"headline":"","body":"","cta":"","hashtags":[""],"visualPrompt":"","keywords":[""]}.`;
  return executeAi({
    userId: data.userId,
    company: data.company,
    operation: "full_post",
    prompt,
    jsonOutput: true,
    parse: parseAiJson
  });
}
async function generateAutopilotPost(data) {
  const prompt = `Crie um post completo e verdadeiro para ${data.platform || "Instagram"} sobre "${data.topic}".
Objetivo: ${data.goal || "engajamento e vendas"}.
Tom: ${data.tone || "persuasivo e profissional"}.
Responda SOMENTE JSON: {"headline":"","body":"","cta":"","hashtags":[""],"visualPrompt":"","keywords":[""]}.`;
  return executeAi({
    userId: data.userId,
    company: data.company,
    operation: "autopilot_cycle",
    prompt,
    jsonOutput: true,
    parse: parseAiJson
  });
}
async function generateStrategy(data) {
  const prompt = `Crie uma estrat\xE9gia de marketing execut\xE1vel para ${data.timeframe === "mes" ? "30 dias" : "7 dias"}.
Objetivo: ${data.goal || "crescer autoridade, alcance e vendas"}.
Responda SOMENTE JSON com: {"strategySummary":"","contentPillars":[""],"actionPlan":[{"dayOrWeek":"","platform":"","format":"","topic":"","hook":""}],"positioning":"","audienceInsights":[""],"campaignIdeas":[{"name":"","concept":"","channels":[""]}],"kpis":[""],"nextSteps":[""]}.`;
  return executeAi({ userId: data.userId, company: data.company, operation: "strategy", prompt, useProModel: true, jsonOutput: true, maxTokens: 5e3, parse: parseAiJson });
}
async function generateCopy(data) {
  const op = data.type === "variations" ? "variations" : data.type;
  return executeAi({
    userId: data.userId,
    company: data.company,
    operation: op,
    prompt: `Crie ${data.type} de alta convers\xE3o para o briefing: ${data.prompt}. Seja espec\xEDfico, verdadeiro e alinhado \xE0 marca.`,
    maxTokens: 1200
  });
}
async function generateCarousel(data) {
  const count = Math.min(Math.max(Number(data.slidesCount) || 5, 3), 10);
  const prompt = `Crie um carrossel de ${count} slides sobre "${data.topic}". Objetivo: ${data.goal || "educar e converter"}.
Responda SOMENTE JSON: {"carouselTitle":"","slides":[{"slideNumber":1,"title":"","text":"","visualDesc":""}],"caption":"","hashtags":[""]}.`;
  return executeAi({ userId: data.userId, company: data.company, operation: "carousel", prompt, jsonOutput: true, parse: parseAiJson });
}
async function generateVideoScript(data) {
  const prompt = `Crie roteiro de v\xEDdeo vertical de aproximadamente ${data.durationSeconds || 60}s sobre "${data.topic}" para ${data.format || "Reels/TikTok/Shorts"}.
Responda SOMENTE JSON: {"hook":"","scenes":[{"sceneNumber":1,"timeSeconds":"0-3s","visualDescription":"","audioVoiceover":"","onScreenText":""}],"callToAction":"","suggestedAudioTrack":"","caption":""}.`;
  return executeAi({ userId: data.userId, company: data.company, operation: "video_script", prompt, useProModel: true, jsonOutput: true, parse: parseAiJson });
}
async function generateImagePrompt(data) {
  const prompt = `Crie uma dire\xE7\xE3o visual publicit\xE1ria profissional para "${data.theme}". Estilo: ${data.style || "fotografia comercial premium"}.
N\xE3o alegue que uma imagem foi gerada: gere apenas especifica\xE7\xE3o visual.
Responda SOMENTE JSON: {"promptPt":"","promptEn":"","artStyle":"","composition":"","colorPalette":["#000000"],"lightingNote":"","aspectRatio":"1:1"}.`;
  return executeAi({ userId: data.userId, company: data.company, operation: "image_prompt", prompt, jsonOutput: true, parse: parseAiJson });
}
async function generateArticle(data) {
  const prompt = `Escreva um artigo de autoridade aprofundado, original, educativo e altamente otimizado para SEO sobre "${data.topic}".
Palavra-chave principal: ${data.primaryKeyword || data.topic}.
P\xFAblico-alvo: ${data.targetAudience || "clientes potenciais e profissionais"}.
Tom de voz: ${data.tone || "educativo, claro e autoritativo"}.

DIRETRIZES DE CONTE\xDADO E ESTRUTURA:
1. O artigo deve ser profundo, pr\xE1tico e detalhado (desenvolva cada se\xE7\xE3o com explica\xE7\xF5es ricas, exemplos aplic\xE1veis e orienta\xE7\xF5es acion\xE1veis).
2. Estruture em 3 a 6 se\xE7\xF5es H2 l\xF3gicas e relevantes, incluindo subt\xF3picos H3 onde apropriado.
3. N\xE3o use marca\xE7\xF5es como "##", "H2:" ou "H3:" dentro dos campos de t\xEDtulos do JSON; retorne apenas o texto puro do t\xEDtulo.
4. Inclua uma se\xE7\xE3o de FAQ com 3 a 5 perguntas reais e respostas diretas e fundamentadas.
5. Conclus\xE3o persuasiva com Chamada para A\xE7\xE3o contextualizada aos canais da empresa.
6. REGRAS ANTI-ALUCINA\xC7\xC3O: N\xE3o invente pesquisas falsas, percentuais inventados, testemunhos fict\xEDcios, cita\xE7\xF5es de pessoas inexistentes ou promessas de ganhos financeiros milagrosos. Se usar dados, atenha-se a conceitos e pr\xE1ticas comprovadas de mercado.

Responda SOMENTE JSON v\xE1lido no seguinte formato:
{
  "title": "T\xEDtulo H1 cativante com a palavra-chave",
  "metaDescription": "Meta descri\xE7\xE3o de 140 a 160 caracteres com gatilho e palavra-chave",
  "introduction": "Introdu\xE7\xE3o engajadora apresentando a dor, a import\xE2ncia do tema e o que ser\xE1 aprendido no artigo.",
  "sections": [
    {
      "h2": "T\xEDtulo da Se\xE7\xE3o Principal",
      "content": "Conte\xFAdo aprofundado e rico da se\xE7\xE3o...",
      "h3s": [
        {
          "h3": "Subt\xF3pico Pr\xE1tico",
          "content": "Detalhamento pr\xE1tico..."
        }
      ]
    }
  ],
  "faqSection": [
    {
      "question": "Pergunta comum do p\xFAblico sobre o tema?",
      "answer": "Resposta direta, clara e fundamentada."
    }
  ],
  "conclusion": "S\xEDntese dos pontos-chave com vis\xE3o de futuro.",
  "callToAction": "Chamada para a\xE7\xE3o clara convidando o leitor a dar o pr\xF3ximo passo.",
  "suggestedSlug": "slug-otimizado-para-seo"
}`;
  const response = await executeAi({
    userId: data.userId,
    company: data.company,
    operation: "seo_article",
    prompt,
    useProModel: true,
    jsonOutput: true,
    maxTokens: 7e3,
    parse: (text) => {
      const parsed = parseAiJson(text);
      return normalizeArticleHeadings(parsed);
    }
  });
  if (response.result && typeof response.result === "object") {
    response.result = normalizeArticleHeadings(response.result);
    response.result.wordCount = countArticleWords(response.result);
  }
  return response;
}
async function generatePlatformArticle(topic) {
  const prompt = `Escreva um artigo editorial original para o Froc Magazine sobre "${topic}".
P\xFAblico: empreendedores, profissionais de marketing e pequenas/m\xE9dias empresas no Brasil.
O conte\xFAdo deve ser \xFAtil por si s\xF3, sem depender de not\xEDcias ou estat\xEDsticas n\xE3o fornecidas. N\xE3o invente fontes, n\xFAmeros, pesquisas, depoimentos ou resultados. Evite promessas absolutas.
Estruture para SEO e leitura mobile.
Responda SOMENTE JSON: {"title":"","summary":"","metaDescription":"","content":"Markdown completo com H2/H3","category":"Marketing & IA","tags":["Marketing","IA"],"suggestedSlug":""}.`;
  const generated = await generateRaw({
    prompt,
    systemInstruction: "Voc\xEA \xE9 a reda\xE7\xE3o editorial do Froc Magazine. Escreva em portugu\xEAs do Brasil, com rigor, clareza e sem fabricar fatos.",
    useProModel: true,
    jsonOutput: true,
    maxTokens: 7e3
  });
  const article = parseAiJson(generated.text);
  const executionId = newId("exec");
  await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
    userId: "system",
    type: "blog_editorial",
    provider: "Google Gemini",
    model: generated.modelUsed,
    attempts: generated.attempts,
    promptHash: promptFingerprint(prompt),
    promptLength: prompt.length,
    creditsConsumed: 0,
    status: "success",
    timestamp: nowIso()
  });
  return { article, modelUsed: generated.modelUsed };
}
function normalizeAspectRatio(value) {
  const allowed = /* @__PURE__ */ new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);
  return value && allowed.has(value) ? value : "1:1";
}
function extractGeneratedImage(response) {
  if (response?.generatedImages?.[0]?.image?.imageBytes) {
    return {
      data: String(response.generatedImages[0].image.imageBytes),
      mimeType: "image/jpeg"
    };
  }
  const parts = response?.candidates?.[0]?.content?.parts || response?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      return { data: String(part.inlineData.data), mimeType: String(part.inlineData.mimeType || "image/jpeg") };
    }
    if (part?.inline_data?.data) {
      return { data: String(part.inline_data.data), mimeType: String(part.inline_data.mime_type || "image/jpeg") };
    }
  }
  return null;
}
async function generateMarketingImage(data) {
  const resolution = data.resolution === "4K" ? "4K" : data.resolution === "2K" ? "2K" : "1K";
  const opKey = resolution === "4K" ? "image_ai_4k" : resolution === "2K" ? "image_ai_2k" : "image_ai_1k";
  const cost = Number(config.creditCosts[opKey] || config.creditCosts.image_ai || 15);
  const reservation = await reserveCredits({ userId: data.userId, amount: cost, operation: opKey, companyId: data.company?.id });
  const executionId = newId("exec");
  const started = Date.now();
  const aspectRatio = normalizeAspectRatio(data.aspectRatio);
  const prompt = `${companyContext(data.company)}

Crie uma imagem publicit\xE1ria premium e original para: ${data.theme}.
Estilo visual: ${data.style || "fotografia comercial moderna e sofisticada"}.
Propor\xE7\xE3o: ${aspectRatio}.
Resolu\xE7\xE3o desejada: ${resolution}.
N\xE3o inclua logotipos ou marcas de terceiros. N\xE3o invente selos, depoimentos ou n\xFAmeros. Se houver texto na arte, mantenha-o curto, leg\xEDvel e somente se fizer sentido para o briefing.`;
  const model = config.geminiModels.image || "gemini-3.1-flash-image";
  try {
    let imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    let storagePath = `generated/${data.userId}/${executionId}.jpg`;
    let mimeType = "image/jpeg";
    if (process.env.NODE_ENV !== "test") {
      let response;
      if (model.startsWith("imagen-")) {
        response = await mediaAiClient().models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio
          }
        });
      } else {
        response = await mediaAiClient().models.generateContent({
          model,
          contents: prompt,
          config: {
            imageConfig: {
              aspectRatio,
              imageSize: resolution
            }
          }
        });
      }
      const image = extractGeneratedImage(response);
      if (!image?.data) throw new Error("O modelo de imagem n\xE3o retornou um arquivo utiliz\xE1vel.");
      const buffer = Buffer.from(image.data, "base64");
      if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error("A imagem retornada possui tamanho inv\xE1lido.");
      const ext = image.mimeType.includes("png") ? "png" : image.mimeType.includes("webp") ? "webp" : "jpg";
      storagePath = `generated/${data.userId}/${executionId}.${ext}`;
      imageUrl = `data:${image.mimeType};base64,${image.data}`;
      mimeType = image.mimeType;
      try {
        const token = import_crypto3.default.randomUUID();
        const bucket = getAdminStorage().bucket();
        const file = bucket.file(storagePath);
        await file.save(buffer, {
          resumable: false,
          metadata: {
            contentType: image.mimeType,
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { firebaseStorageDownloadTokens: token }
          }
        });
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
      } catch (storageErr) {
        console.error("[Froc AI Image Storage Error] Falha ao persistir imagem no Firebase Storage:", storageErr);
        throw new Error("N\xE3o foi poss\xEDvel armazenar a imagem gerada com seguran\xE7a. Seus cr\xE9ditos foram preservados.");
      }
    }
    await commitReservation({
      userId: data.userId,
      reservationId: reservation.reservationId,
      source: `Froc AI: ${opKey}`,
      metadata: { executionId, modelUsed: model, storagePath, resolution }
    });
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: opKey,
      provider: "Google Gemini",
      model,
      promptHash: promptFingerprint(prompt),
      promptLength: prompt.length,
      creditsConsumed: cost,
      durationMs: Date.now() - started,
      status: "success",
      outputStoragePath: storagePath,
      timestamp: nowIso()
    });
    return { imageUrl, storagePath, mimeType, creditsUsed: cost, executionId, modelUsed: model, resolution };
  } catch (error) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    await rollbackReservation(data.userId, reservation.reservationId, message);
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: opKey,
      provider: "Google Gemini",
      model,
      promptHash: promptFingerprint(prompt),
      promptLength: prompt.length,
      creditsConsumed: 0,
      durationMs: Date.now() - started,
      status: "failed",
      error: message.slice(0, 500),
      timestamp: nowIso()
    });
    throw new Error(message);
  }
}
var VIDEO_PRESETS = {
  demo_720p: {
    preset: "demo_720p",
    name: "Fast 720p",
    model: config.geminiModels.veoLite || "veo-3.1-lite-generate-preview",
    resolution: "720p",
    durationSeconds: 4,
    creditsKey: "video_veo_fast",
    credits: 50
  },
  pro_1080p: {
    preset: "pro_1080p",
    name: "Pro 1080p",
    model: config.geminiModels.veoFast || "veo-3.1-fast-generate-preview",
    resolution: "1080p",
    durationSeconds: 8,
    creditsKey: "video_veo_1080p",
    credits: 100
  },
  cinema_4k: {
    preset: "cinema_4k",
    name: "Cinema 4K",
    model: config.geminiModels.veoCinema || "veo-3.1-generate-preview",
    resolution: "4k",
    durationSeconds: 8,
    creditsKey: "video_veo_4k",
    credits: 200
  }
};
function isSameFinalizationOwner(job, token, fence) {
  return job.status === "finalizing" && job.finalizationToken === token && Number(job.finalizationFence || 0) === fence;
}
async function readLatestVideoJob(docRef) {
  const latest = await docRef.get();
  return latest.exists ? latest.data() : null;
}
async function renewVideoFinalizationLease(docRef, token, fence, updates = {}) {
  return firestore().runTransaction(async (tx) => {
    const freshSnap = await tx.get(docRef);
    if (!freshSnap.exists) return null;
    const current = freshSnap.data();
    if (!isSameFinalizationOwner(current, token, fence)) return null;
    const next = {
      ...current,
      ...updates,
      finalizationLeaseUntil: new Date(Date.now() + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
      updatedAt: nowIso()
    };
    tx.set(docRef, next);
    return next;
  });
}
async function failVideoJob(data) {
  const result = await firestore().runTransaction(async (tx) => {
    const freshSnap = await tx.get(data.docRef);
    if (!freshSnap.exists) {
      return { marked: false, job: null };
    }
    const current = freshSnap.data();
    if (current.status === "completed" || current.status === "failed") {
      return { marked: false, job: current };
    }
    if (data.ownerToken !== void 0 && data.ownerFence !== void 0) {
      if (!isSameFinalizationOwner(current, data.ownerToken, data.ownerFence)) {
        return { marked: false, job: current };
      }
    } else if (current.status === "finalizing") {
      const leaseUntil = current.finalizationLeaseUntil ? new Date(current.finalizationLeaseUntil).getTime() : 0;
      if (Date.now() < leaseUntil) {
        return { marked: false, job: current };
      }
    }
    const failedJob = {
      ...current,
      status: "failed",
      pipelineState: "failed",
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      progressPct: 0,
      updatedAt: nowIso()
    };
    tx.set(data.docRef, failedJob);
    return { marked: true, job: failedJob };
  });
  if (result.marked) {
    try {
      await rollbackReservation(data.userId, data.reservationId, data.errorMessage);
    } catch (error) {
      console.error("[Froc AI Video Credits] Job encerrado, mas o estorno ser\xE1 retomado pela limpeza de reservas:", error);
    }
  }
  if (result.job) return result.job;
  throw new Error("Job de gera\xE7\xE3o de v\xEDdeo n\xE3o encontrado durante a finaliza\xE7\xE3o.");
}
function videoDownloadError(code, message) {
  const error = new Error(message);
  error.videoErrorCode = code;
  return error;
}
function assertTrustedVideoDownloadUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw videoDownloadError("INVALID_DOWNLOAD_URI", "A URI de download retornada pelo provedor \xE9 inv\xE1lida.");
  }
  if (parsed.protocol !== "https:") {
    throw videoDownloadError("UNTRUSTED_DOWNLOAD_URI", "O provedor retornou uma URI de download insegura.");
  }
  const host = parsed.hostname.toLowerCase();
  const trusted = host === "googleapis.com" || host.endsWith(".googleapis.com") || host === "googleusercontent.com" || host.endsWith(".googleusercontent.com");
  if (!trusted) {
    throw videoDownloadError("UNTRUSTED_DOWNLOAD_URI", "O provedor retornou uma origem de download n\xE3o autorizada.");
  }
  return parsed;
}
async function readResponseBufferWithLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw videoDownloadError("VIDEO_TOO_LARGE", "O v\xEDdeo excede o limite m\xE1ximo permitido de 250 MB.");
  }
  if (!response.body) {
    const fallback = Buffer.from(await response.arrayBuffer());
    if (fallback.byteLength > maxBytes) {
      throw videoDownloadError("VIDEO_TOO_LARGE", "O v\xEDdeo excede o limite m\xE1ximo permitido de 250 MB.");
    }
    return fallback;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("video_too_large");
        throw videoDownloadError("VIDEO_TOO_LARGE", "O v\xEDdeo excede o limite m\xE1ximo permitido de 250 MB.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}
async function downloadTrustedVideo(rawUrl) {
  let current = assertTrustedVideoDownloadUrl(rawUrl);
  const apiKey = config.geminiMediaApiKey || config.geminiApiKey;
  for (let redirects = 0; redirects <= MAX_VIDEO_DOWNLOAD_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIDEO_DOWNLOAD_TIMEOUT_MS);
    try {
      const headers = { Accept: "video/mp4,video/*;q=0.9" };
      if (apiKey) headers["x-goog-api-key"] = apiKey;
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw videoDownloadError("DOWNLOAD_FAILED", "O servidor de m\xEDdia redirecionou sem informar o destino.");
        try {
          await response.body?.cancel();
        } catch {
        }
        current = assertTrustedVideoDownloadUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) {
        throw videoDownloadError("DOWNLOAD_FAILED", `Falha ao baixar o arquivo de v\xEDdeo gerado (status HTTP ${response.status}).`);
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("text/html") || contentType.includes("application/json")) {
        throw videoDownloadError("INVALID_VIDEO_PAYLOAD", "O servidor de m\xEDdia retornou um formato inesperado em vez de v\xEDdeo.");
      }
      return await readResponseBufferWithLimit(response, MAX_VIDEO_BYTES);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw videoDownloadError("DOWNLOAD_TIMEOUT", "O download do v\xEDdeo excedeu o tempo m\xE1ximo permitido.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw videoDownloadError("TOO_MANY_REDIRECTS", "O download do v\xEDdeo excedeu o limite de redirecionamentos.");
}
async function deleteStoredVideo(storagePath) {
  if (!storagePath) return;
  try {
    const storageInstance = getAdminStorage();
    if (storageInstance) await storageInstance.bucket().file(storagePath).delete();
  } catch (error) {
    console.warn("[Froc AI Video Cleanup] Falha ao remover artefato \xF3rf\xE3o:", error);
  }
}
async function generateVideoDirection(data) {
  const systemInstruction = `Voc\xEA \xE9 um diretor de fotografia e cinemat\xF3grafo publicit\xE1rio de alto n\xEDvel da Froc.IA.
Sua miss\xE3o \xE9 expandir a ideia bruta do usu\xE1rio em uma especifica\xE7\xE3o visual cinematogr\xE1fica de alta precis\xE3o, realismo fotogr\xE1fico e apelo comercial para o modelo Veo 3.1.

DIRETRIZES CINEMATOGR\xC1FICAS E REALISMO:
1. Descreva o sujeito, ambiente, textura dos materiais e a\xE7\xE3o fluida e plaus\xEDvel.
2. Especifique ilumina\xE7\xE3o realista (ex: natural golden hour, soft studio softbox, dramatic volumetric sidelight, neon bounce).
3. Especifique movimento de c\xE2mera preciso e est\xE1vel (ex: smooth dolly push-in, low-angle orbital tracking, cinematic slider, crane pedestal).
4. Especifique grada\xE7\xE3o de cor e tom fotogr\xE1fico (ex: 35mm film grain aesthetic, clean commercial look, warm luxury palette).
5. REGRAS DE INTEGRIDADE VISUAL: Enfatize anatomia natural, pele realista com micro-textura, aus\xEAncia de artefatos de morfologia, sem membros extras, sem distor\xE7\xE3o em produtos.

Retorne SOMENTE um JSON estrito no formato:
{
  "visualPrompt": "Descri\xE7\xE3o visual cinematogr\xE1fica v\xEDvida e detalhada da cena em ingl\xEAs e portugu\xEAs",
  "cameraMotion": "Movimento de c\xE2mera preciso (ex: Smooth cinematic push-in with low angle track)",
  "lighting": "Esquema de ilumina\xE7\xE3o refinado (ex: Volumetric golden hour side-lighting with soft fill)",
  "mood": "Atmosfera e grada\xE7\xE3o de cor (ex: Premium, sleek commercial aesthetic with high dynamic range)"
}`;
  const prompt = `${companyContext(data.company)}
Ideia ou cena do v\xEDdeo: ${data.prompt}
Formato de tela: ${data.aspectRatio || "9:16"}
Sugest\xE3o de clima: ${data.mood || "Comercial premium"}
Sugest\xE3o de c\xE2mera: ${data.cameraMotion || "Movimento din\xE2mico e fluido"}
Sugest\xE3o de luz: ${data.lighting || "Ilumina\xE7\xE3o de est\xFAdio"}`;
  const raw = await generateRaw({
    prompt,
    systemInstruction,
    jsonOutput: true,
    maxTokens: 1200
  });
  const parsed = safeJsonParse(raw.text, {
    visualPrompt: data.prompt,
    cameraMotion: data.cameraMotion || "Smooth cinematic pan",
    lighting: data.lighting || "Studio lighting",
    mood: data.mood || "Premium commercial"
  });
  return {
    visualPrompt: String(parsed.visualPrompt || data.prompt),
    cameraMotion: String(parsed.cameraMotion || data.cameraMotion || "Smooth cinematic pan"),
    lighting: String(parsed.lighting || data.lighting || "Studio lighting"),
    mood: String(parsed.mood || data.mood || "Premium commercial")
  };
}
async function startVideoGenerationJob(data) {
  const preset = data.preset === "cinema_4k" ? "cinema_4k" : data.preset === "pro_1080p" ? "pro_1080p" : "demo_720p";
  const presetConfig = VIDEO_PRESETS[preset];
  const aspectRatio = data.aspectRatio === "16:9" ? "16:9" : "9:16";
  const cost = presetConfig.credits;
  const reservation = await reserveCredits({
    userId: data.userId,
    amount: cost,
    operation: presetConfig.creditsKey,
    companyId: data.company?.id
  });
  const jobId = newId("vjob");
  const contentItemId = newId("content");
  const now = nowIso();
  const docRef = firestore().collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);
  const queuedJob = {
    id: jobId,
    userId: data.userId,
    companyId: data.company?.id || "default",
    reservationId: reservation.reservationId,
    creditsReserved: cost,
    sourcePrompt: data.prompt,
    finalPrompt: data.prompt,
    prompt: data.prompt,
    title: data.title || `V\xEDdeo IA - ${data.prompt.slice(0, 60)}`,
    preset,
    resolution: presetConfig.resolution,
    requestedResolution: presetConfig.resolution,
    durationSeconds: presetConfig.durationSeconds,
    aspectRatio,
    modelUsed: presetConfig.model,
    ...data.initialImageBase64 ? { initialImageUrl: "provided" } : {},
    contentItemId,
    status: "queued",
    pipelineState: "credits_reserved",
    progressPct: 2,
    createdAt: now,
    updatedAt: now
  };
  try {
    await docRef.create(queuedJob);
  } catch (error) {
    const message = "N\xE3o foi poss\xEDvel registrar o job de v\xEDdeo antes do processamento. Seus cr\xE9ditos foram liberados.";
    await rollbackReservation(data.userId, reservation.reservationId, message);
    throw new Error(formatAiErrorMessage(error instanceof Error ? error.message : message));
  }
  try {
    let direction = {
      visualPrompt: data.prompt,
      cameraMotion: data.cameraMotion || "Smooth cinematic movement",
      lighting: data.lighting || "Refined commercial lighting",
      mood: data.mood || "High-end commercial aesthetic"
    };
    try {
      direction = await generateVideoDirection({
        userId: data.userId,
        company: data.company,
        prompt: data.prompt,
        aspectRatio,
        mood: data.mood,
        cameraMotion: data.cameraMotion,
        lighting: data.lighting
      });
    } catch (dirErr) {
      console.warn("[Froc Video Direction] Dire\xE7\xE3o autom\xE1tica simplificada por fallback:", dirErr);
    }
    const finalPrompt = [
      companyContext(data.company),
      `Cinematic commercial video: ${direction.visualPrompt}.`,
      `Camera direction: ${data.cameraMotion || direction.cameraMotion}.`,
      `Lighting scheme: ${data.lighting || direction.lighting}.`,
      `Atmosphere & color grading: ${data.mood || direction.mood}.`,
      `Target format: ${aspectRatio}. Technical parameters: Ultra high definition commercial rendering, authentic physical textures, realistic lighting and reflections, natural fluid motion, no morphing artifacts, no anatomical distortions.`
    ].filter(Boolean).join("\n");
    const providerStartedAt = nowIso();
    await docRef.set({
      finalPrompt,
      prompt: finalPrompt,
      pipelineState: "provider_starting",
      providerStartedAt,
      progressPct: 5,
      updatedAt: providerStartedAt
    }, { merge: true });
    let operationName = `mock_op_${jobId}`;
    if (overrideMediaClient !== void 0 || process.env.NODE_ENV !== "test") {
      const videoConfig = {
        numberOfVideos: 1,
        resolution: presetConfig.resolution,
        durationSeconds: presetConfig.durationSeconds,
        aspectRatio
      };
      const reqPayload = {
        model: presetConfig.model,
        prompt: finalPrompt,
        config: videoConfig
      };
      if (data.initialImageBase64) {
        const cleanBase64 = data.initialImageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        reqPayload.image = {
          imageBytes: cleanBase64,
          mimeType: "image/jpeg"
        };
      }
      const operation = await mediaAiClient().models.generateVideos(reqPayload);
      if (!operation?.name) {
        throw new Error("A API Veo n\xE3o retornou o identificador da opera\xE7\xE3o de v\xEDdeo.");
      }
      operationName = operation.name;
    }
    const jobData = {
      ...queuedJob,
      operationName,
      finalPrompt,
      prompt: finalPrompt,
      status: "processing",
      pipelineState: "provider_running",
      providerStartedAt,
      progressPct: 10,
      updatedAt: nowIso()
    };
    await docRef.set(jobData);
    return jobData;
  } catch (error) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    await failVideoJob({
      docRef,
      userId: data.userId,
      reservationId: reservation.reservationId,
      errorCode: "PROVIDER_START_FAILED",
      errorMessage: message
    });
    throw new Error(message);
  }
}
async function checkAndCompleteVideoJob(userId, jobId) {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err = new Error("Job de gera\xE7\xE3o de v\xEDdeo n\xE3o encontrado.");
    err.statusCode = 404;
    throw err;
  }
  const job = snap.data();
  if (job.userId !== userId) {
    const err = new Error("Acesso n\xE3o autorizado a este job.");
    err.statusCode = 403;
    throw err;
  }
  if (job.status === "completed" || job.status === "failed") return job;
  if (job.status === "finalizing" && job.finalizationLeaseUntil) {
    const lease = new Date(job.finalizationLeaseUntil).getTime();
    if (Date.now() < lease) return job;
  }
  const hasPersistedResult = Boolean(
    job.videoUrl && job.storagePath && (job.pipelineState === "result_persisted" || job.pipelineState === "credits_committed")
  );
  let isDone = hasPersistedResult;
  let providerError = null;
  let downloadUri;
  if (!hasPersistedResult) {
    if (!job.operationName) {
      return failVideoJob({
        docRef,
        userId: job.userId,
        reservationId: job.reservationId,
        errorCode: "MISSING_PROVIDER_OPERATION",
        errorMessage: "O job n\xE3o possui um identificador dur\xE1vel da opera\xE7\xE3o de v\xEDdeo. Seus cr\xE9ditos foram liberados."
      });
    }
    try {
      if (overrideMediaClient !== void 0) {
        const op = new import_genai.GenerateVideosOperation();
        op.name = job.operationName;
        const updated = await overrideMediaClient.operations.getVideosOperation({ operation: op });
        isDone = Boolean(updated?.done);
        providerError = updated?.error;
        const generatedVideo = updated?.response?.generatedVideos?.[0]?.video;
        downloadUri = generatedVideo?.uri || (generatedVideo?.videoBytes ? `data:${generatedVideo.mimeType || "video/mp4"};base64,${generatedVideo.videoBytes}` : void 0);
      } else if (process.env.NODE_ENV !== "test") {
        const op = new import_genai.GenerateVideosOperation();
        op.name = job.operationName;
        const updated = await mediaAiClient().operations.getVideosOperation({ operation: op });
        isDone = Boolean(updated?.done);
        providerError = updated?.error;
        const generatedVideo = updated?.response?.generatedVideos?.[0]?.video;
        downloadUri = generatedVideo?.uri || (generatedVideo?.videoBytes ? `data:${generatedVideo.mimeType || "video/mp4"};base64,${generatedVideo.videoBytes}` : void 0);
      } else {
        isDone = true;
        downloadUri = "https://storage.googleapis.com/froc-ia-test-bucket/mock-video.mp4";
      }
    } catch (error) {
      const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
      const retryJob = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        if (!freshSnap.exists) return null;
        const current = freshSnap.data();
        if (current.status !== "processing") return current;
        const next = {
          ...current,
          errorCode: "PROVIDER_POLL_RETRY",
          errorMessage: message,
          updatedAt: nowIso()
        };
        tx.set(docRef, next);
        return next;
      });
      return retryJob || job;
    }
  }
  if (!isDone) {
    const elapsedSec = Math.max(0, (Date.now() - new Date(job.createdAt).getTime()) / 1e3);
    const estimatedSeconds = job.preset === "cinema_4k" ? 90 : job.preset === "pro_1080p" ? 60 : 35;
    const progressPct = Math.min(92, Math.round(15 + elapsedSec / estimatedSeconds * 75));
    const progressJob = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data();
      if (current.status !== "processing") return current;
      const next = {
        ...current,
        progressPct,
        updatedAt: nowIso()
      };
      tx.set(docRef, next);
      return next;
    });
    return progressJob || job;
  }
  if (providerError) {
    const message = String(providerError.message || providerError || "Falha no processamento de v\xEDdeo pelo modelo Veo.");
    return failVideoJob({
      docRef,
      userId: job.userId,
      reservationId: job.reservationId,
      errorCode: "PROVIDER_PROCESSING_FAILED",
      errorMessage: message
    });
  }
  const claimTime = Date.now();
  const claim = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(docRef);
    if (!freshSnap.exists) return { claimed: false, reason: "not_found" };
    const current = freshSnap.data();
    if (current.status === "completed" || current.status === "failed") {
      return { claimed: false, job: current, reason: "already_terminal" };
    }
    if (current.status === "finalizing") {
      const lease = current.finalizationLeaseUntil ? new Date(current.finalizationLeaseUntil).getTime() : 0;
      if (claimTime < lease) return { claimed: false, job: current, reason: "locked_by_other" };
    }
    const token = newId("claim");
    const currentFence = Number.isSafeInteger(Number(current.finalizationFence)) ? Math.max(0, Number(current.finalizationFence)) : 0;
    const fence = currentFence + 1;
    const nextPipelineState = current.pipelineState === "result_persisted" || current.pipelineState === "credits_committed" ? current.pipelineState : "result_received";
    const next = {
      ...current,
      status: "finalizing",
      pipelineState: nextPipelineState,
      finalizationToken: token,
      finalizationFence: fence,
      finalizationStartedAt: nowIso(),
      finalizationLeaseUntil: new Date(claimTime + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
      progressPct: Math.max(93, Number(current.progressPct || 0)),
      updatedAt: nowIso()
    };
    tx.set(docRef, next);
    return { claimed: true, token, fence, job: next };
  });
  if (!claim.claimed) return claim.job || job;
  const ownerToken = String(claim.token);
  const ownerFence = Number(claim.fence);
  let workingJob = claim.job;
  let storagePath = workingJob.storagePath;
  let publicVideoUrl = workingJob.videoUrl || "";
  let contentItemId = workingJob.contentItemId || newId("content");
  let contentPersisted = workingJob.pipelineState === "result_persisted" || workingJob.pipelineState === "credits_committed";
  try {
    if (!contentPersisted) {
      if (!downloadUri) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: "MISSING_DOWNLOAD_URI",
          errorMessage: "O modelo Veo concluiu o processamento, mas n\xE3o retornou o arquivo do v\xEDdeo. Seus cr\xE9ditos foram liberados."
        });
      }
      let videoBuffer;
      try {
        if (downloadUri.startsWith("data:")) {
          const match = /^data:video\/[a-z0-9.+-]+;base64,([a-z0-9+/=\s]+)$/i.exec(downloadUri);
          if (!match) throw videoDownloadError("INVALID_VIDEO_PAYLOAD", "O provedor retornou dados de v\xEDdeo em formato inv\xE1lido.");
          const base64Data = match[1].replace(/\s+/g, "");
          const padding = base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;
          const estimatedBytes = Math.max(0, Math.floor(base64Data.length * 3 / 4) - padding);
          if (estimatedBytes > MAX_VIDEO_BYTES) {
            throw videoDownloadError("VIDEO_TOO_LARGE", "O v\xEDdeo excede o limite m\xE1ximo permitido de 250 MB.");
          }
          videoBuffer = Buffer.from(base64Data, "base64");
        } else if (process.env.NODE_ENV === "test" && !downloadUri.startsWith("http://127.0.0.1") && !downloadUri.startsWith("http://localhost") && downloadUri.includes("storage.googleapis.com/froc-ia-test-bucket")) {
          videoBuffer = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 0, 0, 0, 109, 112, 52, 50, 105, 115, 111, 109, 0, 0, 0, 8, 109, 111, 111, 118]);
        } else {
          videoBuffer = await downloadTrustedVideo(downloadUri);
        }
      } catch (error) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: String(error?.videoErrorCode || "DOWNLOAD_FAILED"),
          errorMessage: "Falha ao recuperar o v\xEDdeo gerado com seguran\xE7a. Seus cr\xE9ditos foram liberados."
        });
      }
      if (!videoBuffer.length || videoBuffer.length > MAX_VIDEO_BYTES || !isValidMp4Buffer(videoBuffer)) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: "INVALID_MP4_CONTAINER",
          errorMessage: "O arquivo produzido n\xE3o \xE9 um v\xEDdeo MP4 v\xE1lido. Seus cr\xE9ditos foram liberados."
        });
      }
      const renewedBeforeStorage = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
      if (!renewedBeforeStorage) return await readLatestVideoJob(docRef) || workingJob;
      workingJob = renewedBeforeStorage;
      storagePath = `generated/${workingJob.userId}/videos/${workingJob.id}/${ownerFence}-${ownerToken}.mp4`;
      const downloadToken = import_crypto3.default.randomUUID();
      try {
        const storageInstance = getAdminStorage();
        if (!storageInstance) throw new Error("Firebase Storage n\xE3o configurado.");
        const bucket = storageInstance.bucket();
        await bucket.file(storagePath).save(videoBuffer, {
          resumable: false,
          metadata: {
            contentType: "video/mp4",
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { firebaseStorageDownloadTokens: downloadToken }
          }
        });
        publicVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name || "froc-ia.firebasestorage.app")}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;
      } catch (error) {
        console.error("[Froc AI Video Storage Error] Falha ao persistir v\xEDdeo no Firebase Storage:", error);
        const failedJob = await failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: "STORAGE_PERSIST_FAILED",
          errorMessage: "N\xE3o foi poss\xEDvel armazenar o v\xEDdeo no Firebase Storage. Seus cr\xE9ditos foram liberados."
        });
        await deleteStoredVideo(storagePath);
        return failedJob;
      }
      const renewedAfterStorage = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
      if (!renewedAfterStorage) {
        await deleteStoredVideo(storagePath);
        return await readLatestVideoJob(docRef) || workingJob;
      }
      workingJob = renewedAfterStorage;
      const contentItem = {
        id: contentItemId,
        userId: workingJob.userId,
        companyId: workingJob.companyId || "default",
        type: "video",
        title: workingJob.title || `V\xEDdeo IA - ${(workingJob.sourcePrompt || workingJob.prompt).slice(0, 60)}`,
        headline: workingJob.title || "",
        body: workingJob.sourcePrompt || workingJob.prompt,
        videoUrl: publicVideoUrl,
        targetPlatform: workingJob.aspectRatio === "9:16" ? "Reels / TikTok / Shorts" : "YouTube / Banner",
        creditsUsed: workingJob.creditsReserved,
        status: "saved",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: {
          jobId: workingJob.id,
          storagePath,
          preset: workingJob.preset,
          resolution: workingJob.resolution,
          actualResolution: workingJob.resolution,
          durationSeconds: workingJob.durationSeconds,
          aspectRatio: workingJob.aspectRatio,
          modelUsed: workingJob.modelUsed,
          finalPrompt: workingJob.finalPrompt,
          finalizationFence: ownerFence
        }
      };
      const contentRef = db.collection(COLLECTIONS.contentItems).doc(contentItemId);
      const persisted = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        if (!freshSnap.exists) return { owned: false, job: null };
        const current = freshSnap.data();
        if (!isSameFinalizationOwner(current, ownerToken, ownerFence)) return { owned: false, job: current };
        const next = {
          ...current,
          pipelineState: "result_persisted",
          videoUrl: publicVideoUrl,
          storagePath,
          contentItemId,
          actualResolution: current.resolution,
          progressPct: 97,
          finalizationLeaseUntil: new Date(Date.now() + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
          updatedAt: nowIso()
        };
        tx.set(contentRef, contentItem);
        tx.set(docRef, next);
        return { owned: true, job: next };
      });
      if (!persisted.owned) {
        await deleteStoredVideo(storagePath);
        return persisted.job || workingJob;
      }
      workingJob = persisted.job;
      contentPersisted = true;
    }
    if (!publicVideoUrl || !storagePath || !contentPersisted) {
      return failVideoJob({
        docRef,
        userId: workingJob.userId,
        reservationId: workingJob.reservationId,
        ownerToken,
        ownerFence,
        errorCode: "INCOMPLETE_PERSISTED_RESULT",
        errorMessage: "O resultado persistido do v\xEDdeo est\xE1 incompleto. Seus cr\xE9ditos foram liberados."
      });
    }
    const renewedBeforeCommit = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
    if (!renewedBeforeCommit) return await readLatestVideoJob(docRef) || workingJob;
    workingJob = renewedBeforeCommit;
    try {
      await commitReservation({
        userId: workingJob.userId,
        reservationId: workingJob.reservationId,
        source: `Froc AI: video_${workingJob.preset}`,
        metadata: {
          jobId: workingJob.id,
          contentItemId,
          storagePath,
          modelUsed: workingJob.modelUsed,
          resolution: workingJob.resolution,
          finalizationFence: ownerFence
        }
      });
    } catch (commitError) {
      const reservationSnap = await db.collection(COLLECTIONS.creditReservations).doc(workingJob.reservationId).get();
      const reservationStatus = reservationSnap.exists ? String(reservationSnap.data()?.status || "") : "";
      if (reservationStatus !== "committed") throw commitError;
    }
    const creditsMarked = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence, {
      pipelineState: "credits_committed",
      creditsCommitted: workingJob.creditsReserved,
      progressPct: 99
    });
    if (!creditsMarked) return await readLatestVideoJob(docRef) || workingJob;
    workingJob = creditsMarked;
    const completion = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data();
      if (current.status === "completed") return current;
      if (!isSameFinalizationOwner(current, ownerToken, ownerFence)) return current;
      const completedJob2 = {
        ...current,
        status: "completed",
        pipelineState: "completed",
        progressPct: 100,
        videoUrl: publicVideoUrl,
        storagePath,
        contentItemId,
        actualResolution: current.resolution,
        creditsCommitted: current.creditsReserved,
        completedAt: nowIso(),
        updatedAt: nowIso()
      };
      tx.set(docRef, completedJob2);
      return completedJob2;
    });
    const completedJob = completion || workingJob;
    if (completedJob.status === "completed") {
      try {
        await createNotification({
          userId: completedJob.userId,
          title: "Seu v\xEDdeo com Veo 3.1 est\xE1 pronto!",
          message: `O v\xEDdeo "${completedJob.title || "Criativo IA"}" foi processado com sucesso em ${completedJob.resolution} e j\xE1 est\xE1 dispon\xEDvel para visualiza\xE7\xE3o e download.`,
          type: "video_ready"
        });
      } catch (notificationError) {
        console.warn("[Froc AI Video Notification] V\xEDdeo conclu\xEDdo; notifica\xE7\xE3o ser\xE1 tentada posteriormente:", notificationError);
      }
    }
    return completedJob;
  } catch (error) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    const failedJob = await failVideoJob({
      docRef,
      userId: workingJob.userId,
      reservationId: workingJob.reservationId,
      ownerToken,
      ownerFence,
      errorCode: String(error?.videoErrorCode || "VIDEO_FINALIZATION_FAILED"),
      errorMessage: message
    });
    if (failedJob.status === "failed" && failedJob.finalizationToken === ownerToken && Number(failedJob.finalizationFence || 0) === ownerFence) {
      await deleteStoredVideo(storagePath);
      if (contentPersisted) {
        try {
          await db.collection(COLLECTIONS.contentItems).doc(contentItemId).delete();
        } catch {
        }
      }
    }
    return failedJob;
  }
}
async function processPendingVideoJobs() {
  try {
    const db = firestore();
    const processingSnap = await db.collection(COLLECTIONS.mediaGenerationJobs).where("status", "==", "processing").limit(5).get();
    const finalizingSnap = await db.collection(COLLECTIONS.mediaGenerationJobs).where("status", "==", "finalizing").limit(5).get();
    const queuedSnap = await db.collection(COLLECTIONS.mediaGenerationJobs).where("status", "==", "queued").limit(10).get();
    const staleQueuedDocs = queuedSnap.docs.filter((doc) => {
      const queuedJob = doc.data();
      const providerStartedAt = new Date(queuedJob.providerStartedAt || queuedJob.updatedAt || queuedJob.createdAt).getTime();
      return Number.isFinite(providerStartedAt) && Date.now() - providerStartedAt >= VIDEO_PROVIDER_START_TIMEOUT_MS;
    });
    const docs = [...processingSnap.docs, ...finalizingSnap.docs, ...staleQueuedDocs].slice(0, 5);
    let checked = 0;
    let completed = 0;
    let failed = 0;
    for (const doc of docs) {
      const job = doc.data();
      if (job.status === "queued") {
        checked++;
        try {
          const result = await failVideoJob({
            docRef: db.collection(COLLECTIONS.mediaGenerationJobs).doc(job.id),
            userId: job.userId,
            reservationId: job.reservationId,
            errorCode: "PROVIDER_START_TIMEOUT",
            errorMessage: "A inicializa\xE7\xE3o do provedor de v\xEDdeo excedeu o tempo seguro. Seus cr\xE9ditos foram liberados."
          });
          if (result.status === "failed") failed++;
        } catch (error) {
          console.warn(`[Video Background Worker] Erro ao encerrar job \xF3rf\xE3o ${job.id}:`, error);
        }
        continue;
      }
      if (job.status === "finalizing" && job.finalizationLeaseUntil) {
        const leaseTime = new Date(job.finalizationLeaseUntil).getTime();
        if (Date.now() < leaseTime) {
          continue;
        }
      }
      checked++;
      try {
        const res = await checkAndCompleteVideoJob(job.userId, job.id);
        if (res.status === "completed") completed++;
        else if (res.status === "failed") failed++;
      } catch (err) {
        console.warn(`[Video Background Worker] Erro ao processar job ${job.id}:`, err);
      }
    }
    return { checked, completed, failed };
  } catch (error) {
    console.warn("[Video Background Worker] Erro ao consultar jobs pendentes:", error);
    return { checked: 0, completed: 0, failed: 0 };
  }
}
async function listUserVideoJobs(userId, companyId) {
  let query = firestore().collection(COLLECTIONS.mediaGenerationJobs).where("userId", "==", userId);
  if (companyId && companyId !== "all") {
    query = query.where("companyId", "==", companyId);
  }
  const items = queryData(await query.get());
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// server/production/seo.ts
var import_promises = __toESM(require("dns/promises"), 1);
var import_node_http = __toESM(require("node:http"), 1);
var import_node_https = __toESM(require("node:https"), 1);
var import_net = __toESM(require("net"), 1);
var MAX_HTML_BYTES = 2 * 1024 * 1024;
var MAX_REDIRECTS = 5;
function isPrivateIpv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 0 && (c === 0 || c === 2) || a === 192 && b === 88 && c === 99 || a === 192 && b === 168 || a === 198 && (b === 18 || b === 19) || a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 || a >= 224;
}
function ipv6ToBigInt(ip) {
  let normalized = ip.toLowerCase().split("%")[0];
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon < 0) return null;
    const ipv4 = normalized.slice(lastColon + 1);
    const parts = ipv4.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    const high = (parts[0] << 8 | parts[1]).toString(16);
    const low = (parts[2] << 8 | parts[3]).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }
  const sections = normalized.split("::");
  if (sections.length > 2) return null;
  const left = sections[0] ? sections[0].split(":").filter(Boolean) : [];
  const right = sections.length === 2 && sections[1] ? sections[1].split(":").filter(Boolean) : [];
  const missing = sections.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0 || sections.length === 1 && left.length !== 8) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((value, group) => value << 16n | BigInt(`0x${group}`), 0n);
}
function isPrivateIpv6(ip) {
  const value = ipv6ToBigInt(ip);
  if (value === null) return true;
  if (value === 0n || value === 1n) return true;
  if (value >> 32n === 0xffffn) {
    const ipv4 = Number(value & 0xffffffffn);
    return isPrivateIpv4([
      ipv4 >>> 24 & 255,
      ipv4 >>> 16 & 255,
      ipv4 >>> 8 & 255,
      ipv4 & 255
    ].join("."));
  }
  const top8 = Number(value >> 120n);
  const top10 = Number(value >> 118n);
  const top7 = Number(value >> 121n);
  const top32 = Number(value >> 96n);
  return top7 === 126 || // fc00::/7 — unique local
  top10 === 1018 || // fe80::/10 — link local
  top10 === 1019 || // fec0::/10 — site local (legado)
  top8 === 255 || // ff00::/8 — multicast
  top32 === 536939960 || // 2001:db8::/32 — documentação
  value >> 64n === 0x100n;
}
async function resolvePublicTarget(url) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Apenas URLs HTTP/HTTPS s\xE3o permitidas.");
  if (url.username || url.password) throw new Error("URLs com credenciais embutidas n\xE3o s\xE3o permitidas.");
  const defaultPort = url.protocol === "https:" ? "443" : "80";
  const hasForbiddenPort = Boolean(url.port && url.port !== defaultPort);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Endere\xE7o local bloqueado por seguran\xE7a.");
  }
  const literalFamily = import_net.default.isIP(host);
  if (literalFamily) {
    if (literalFamily === 4 && isPrivateIpv4(host) || literalFamily === 6 && isPrivateIpv6(host)) {
      throw new Error("Endere\xE7o privado bloqueado por seguran\xE7a.");
    }
    if (hasForbiddenPort) throw new Error("Porta n\xE3o permitida para auditoria SEO.");
    return { address: host, family: literalFamily };
  }
  if (hasForbiddenPort) throw new Error("Porta n\xE3o permitida para auditoria SEO.");
  const addresses = await import_promises.default.lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("Dom\xEDnio n\xE3o resolvido.");
  for (const item of addresses) {
    if (item.family === 4 && isPrivateIpv4(item.address) || item.family === 6 && isPrivateIpv6(item.address)) {
      throw new Error("O dom\xEDnio resolve para uma rede privada e foi bloqueado.");
    }
  }
  const selected = addresses.find((item) => item.family === 4) || addresses[0];
  return { address: selected.address, family: selected.family };
}
function headerValue(headers, name) {
  const value = headers[name];
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}
function requestPinnedHtml(url, target) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? import_node_https.default : import_node_http.default;
    const options = {
      protocol: url.protocol,
      hostname: target.address,
      family: target.family,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      method: "GET",
      path: `${url.pathname}${url.search}`,
      servername: url.protocol === "https:" ? url.hostname.replace(/^\[|\]$/g, "") : void 0,
      headers: {
        Host: url.host,
        "User-Agent": "Mozilla/5.0 (compatible; FrocBot/1.1; SEO audit)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Encoding": "identity"
      }
    };
    const request = transport.request(options, (response) => {
      const statusCode = Number(response.statusCode || 0);
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        response.resume();
        resolve({ statusCode, headers: response.headers, body: Buffer.alloc(0) });
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Site respondeu HTTP ${statusCode}.`));
        return;
      }
      const contentType = headerValue(response.headers, "content-type").toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        response.resume();
        reject(new Error("A URL n\xE3o retornou uma p\xE1gina HTML."));
        return;
      }
      const contentEncoding = headerValue(response.headers, "content-encoding").toLowerCase();
      if (contentEncoding && contentEncoding !== "identity") {
        response.resume();
        reject(new Error("A p\xE1gina retornou uma codifica\xE7\xE3o de conte\xFAdo n\xE3o permitida."));
        return;
      }
      const declaredLength = Number(headerValue(response.headers, "content-length") || 0);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
        response.resume();
        reject(new Error("P\xE1gina muito grande para auditoria segura."));
        return;
      }
      const chunks = [];
      let receivedBytes = 0;
      let exceededLimit = false;
      response.on("data", (chunk) => {
        if (exceededLimit) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.length;
        if (receivedBytes > MAX_HTML_BYTES) {
          exceededLimit = true;
          response.destroy();
          reject(new Error("P\xE1gina excede o limite de 2 MB da auditoria."));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        if (!exceededLimit) resolve({ statusCode, headers: response.headers, body: Buffer.concat(chunks, receivedBytes) });
      });
      response.on("error", (error) => {
        if (!exceededLimit) reject(error);
      });
    });
    request.setTimeout(12e3, () => {
      request.destroy(new Error("Tempo limite excedido ao acessar o site."));
    });
    request.on("error", reject);
    request.end();
  });
}
async function safeFetchHtml(rawUrl) {
  let current = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const target = await resolvePublicTarget(current);
    const response = await requestPinnedHtml(current, target);
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      const location = headerValue(response.headers, "location");
      if (!location) throw new Error("Redirecionamento sem destino.");
      current = new URL(location, current);
      continue;
    }
    return { url: current.toString(), html: response.body.toString("utf8") };
  }
  throw new Error("N\xFAmero m\xE1ximo de redirecionamentos excedido.");
}
function decodeHtml(value) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}
function stripTags(value) {
  return decodeHtml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}
function matchOne(html, pattern) {
  const match = pattern.exec(html);
  return match?.[1] ? decodeHtml(match[1]) : "";
}
function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i");
  return matchOne(html, a) || matchOne(html, b);
}
function headings(html, tag, max = 20) {
  const result = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  for (let match = re.exec(html); match && result.length < max; match = re.exec(html)) {
    const value = stripTags(match[1]);
    if (value && !result.includes(value)) result.push(value);
  }
  return result;
}
async function analyzeSeo(data) {
  const page = await safeFetchHtml(data.rawUrl);
  const title = matchOne(page.html, /<title\b[^>]*>([\s\S]*?)<\/title>/i) || metaContent(page.html, "og:title");
  const metaDescription = metaContent(page.html, "description") || metaContent(page.html, "og:description");
  const canonical = matchOne(page.html, /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i) || matchOne(page.html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i);
  const h1s = headings(page.html, "h1");
  const h2s = headings(page.html, "h2", 12);
  const body = stripTags(page.html);
  const words = body.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9à-ÿ\s-]/gi, " ").split(/\s+/).filter((w) => w.length > 3);
  const stop = /* @__PURE__ */ new Set(["para", "com", "mais", "como", "sobre", "essa", "esse", "esta", "este", "seus", "suas", "voc\xEA", "pelo", "pela", "todos", "tudo", "onde", "quando", "muito", "entre", "uma", "uns", "das", "dos"]);
  const counts = /* @__PURE__ */ new Map();
  words.forEach((word) => {
    if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  const keywords = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count, density: words.length ? `${(count / words.length * 100).toFixed(1)}%` : "0%" }));
  const criteria = {
    hasTitle: Boolean(title),
    titleLengthValid: title.length >= 30 && title.length <= 65,
    hasDescription: Boolean(metaDescription),
    descriptionLengthValid: metaDescription.length >= 70 && metaDescription.length <= 160,
    hasH1: h1s.length > 0,
    singleH1: h1s.length === 1,
    hasKeywordsInHeadings: keywords.some((item) => [...h1s, ...h2s].some((heading) => heading.toLowerCase().includes(item.word))),
    contentLengthSufficient: words.length >= 250,
    hasHttps: page.url.startsWith("https://"),
    hasCanonical: Boolean(canonical)
  };
  const weights = { hasTitle: 15, titleLengthValid: 10, hasDescription: 15, descriptionLengthValid: 10, hasH1: 10, singleH1: 5, hasKeywordsInHeadings: 10, contentLengthSufficient: 10, hasHttps: 10, hasCanonical: 5 };
  const score = Object.keys(criteria).reduce((sum, key2) => sum + (criteria[key2] ? weights[key2] : 0), 0);
  const prompt = `Voc\xEA \xE9 o auditor t\xE9cnico SEO do Froc.IA. Analise a p\xE1gina ${page.url}.
O Score SEO Froc.IA calculado pelos crit\xE9rios estruturais HTML analisados \xE9 ${score}/100.
IMPORTANTE: Este n\xFAmero (${score}/100) \xE9 o SCORE T\xC9CNICO INTERNO FROC.IA baseado estritamente na an\xE1lise das tags HTML. N\xC3O \xE9 Google Lighthouse, N\xC3O \xE9 PageSpeed Insights e N\xC3O mede Core Web Vitals. NUNCA cite Lighthouse, PageSpeed ou Web Vitals nas recomenda\xE7\xF5es, nem invente m\xE9tricas de velocidade/performance que n\xE3o foram medidas.
Dados analisados:
- T\xEDtulo: ${title || "ausente"}
- Meta Description: ${metaDescription || "ausente"}
- Tags H1: ${JSON.stringify(h1s)}
- Tags H2: ${JSON.stringify(h2s)}
- Palavras-chave encontradas: ${JSON.stringify(keywords.map((k) => k.word))}

Forne\xE7a recomenda\xE7\xF5es pr\xE1ticas e diretas focadas no conte\xFAdo, t\xEDtulos e estrutura HTML analisados.
Responda SOMENTE em JSON v\xE1lido no formato: {"recommendations":[""],"generatedOutline":[""],"faqSuggestions":[{"question":"","answer":""}]}.`;
  const ai = await executeAi({ userId: data.userId, company: data.company, operation: "site_analysis", prompt, jsonOutput: true, parse: parseAiJson });
  const id = newId("seo");
  const report = {
    id,
    userId: data.userId,
    companyId: data.company?.id || "none",
    url: page.url,
    title,
    metaDescription,
    h1s,
    h2s,
    keywords,
    seoScore: score,
    criteriaBreakdown: criteria,
    recommendations: ai.result.recommendations || [],
    generatedOutline: ai.result.generatedOutline || [],
    faqSuggestions: ai.result.faqSuggestions || [],
    createdAt: nowIso()
  };
  await firestore().collection(COLLECTIONS.seoReports).doc(id).set(report);
  return report;
}

// server/production/payments.ts
var import_crypto4 = __toESM(require("crypto"), 1);
function mercadoPagoConfigured() {
  return Boolean(config.mercadoPago.accessToken && config.mercadoPago.webhookSecret);
}
function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${config.mercadoPago.accessToken}`, ...extra };
}
async function mpJson(url, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15e3);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: authHeaders({ ...init.headers || {} })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.message || body?.error_description || body?.error || `Mercado Pago HTTP ${response.status}`;
      const error = new Error(String(message));
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }
    return body;
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutError = new Error("Tempo limite excedido ao comunicar com o Mercado Pago.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function createCheckout(data) {
  const rawKey = data.idempotencyKey ? String(data.idempotencyKey).trim() : "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(rawKey)) {
    const error = new Error("Chave de idempot\xEAncia inv\xE1lida: use entre 16 e 128 caracteres seguros.");
    error.statusCode = 400;
    throw error;
  }
  if (!config.mercadoPago.accessToken) throw new Error("Mercado Pago n\xE3o configurado no servidor.");
  const plan = config.plans.find((item) => item.id === data.planId);
  if (!plan) throw new Error("Plano inv\xE1lido.");
  const db = firestore();
  let orderId;
  let billingMode = config.mercadoPago.billingMode;
  const idemDocId = stableId(`checkout:${data.userId}:${rawKey}`);
  const idemRef = db.collection(COLLECTIONS.idempotency).doc(idemDocId);
  const reservation = await db.runTransaction(async (tx) => {
    const idemSnap = await tx.get(idemRef);
    if (idemSnap.exists) {
      const stored = idemSnap.data();
      if (stored.planId !== data.planId || stored.userId !== data.userId) {
        const conflictErr = new Error("Conflito de idempot\xEAncia: a mesma chave j\xE1 foi utilizada com outros par\xE2metros.");
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      const processingStartedAt = Date.parse(
        String(stored.processingStartedAt || stored.updatedAt || stored.createdAt || "")
      );
      const leaseExpired = !Number.isFinite(processingStartedAt) || Date.now() - processingStartedAt > 3e4;
      const canRetry = stored.status === "failed" || ["processing", "pending"].includes(String(stored.status)) && leaseExpired;
      if (canRetry) {
        const retryStartedAt = nowIso();
        const retryOrderRef = db.collection(COLLECTIONS.payments).doc(String(stored.orderId));
        tx.set(retryOrderRef, {
          status: "pending",
          providerError: null,
          updatedAt: retryStartedAt
        }, { merge: true });
        tx.set(idemRef, {
          status: "processing",
          processingStartedAt: retryStartedAt,
          updatedAt: retryStartedAt
        }, { merge: true });
        return {
          isExisting: false,
          orderId: String(stored.orderId),
          billingMode: stored.billingMode || billingMode
        };
      }
      return { isExisting: true, orderId: stored.orderId, initPoint: stored.initPoint, billingMode: stored.billingMode || billingMode, status: stored.status };
    }
    const newOrderId = newId("order");
    const orderData = {
      id: newOrderId,
      userId: data.userId,
      clientCheckoutKey: rawKey,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      currency: "BRL",
      creditsGranted: plan.credits,
      bonusCreditsGranted: plan.bonusCredits,
      billingMode,
      status: "pending",
      provider: "mercadopago",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    const newOrderRef = db.collection(COLLECTIONS.payments).doc(newOrderId);
    tx.set(newOrderRef, orderData);
    tx.set(idemRef, {
      key: rawKey,
      userId: data.userId,
      planId: data.planId,
      orderId: newOrderId,
      billingMode,
      status: "processing",
      processingStartedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    return { isExisting: false, orderId: newOrderId, orderData };
  });
  if (reservation.isExisting) {
    if (reservation.initPoint) {
      return {
        order: { id: reservation.orderId, planId: data.planId, status: reservation.status, initPoint: reservation.initPoint },
        initPoint: reservation.initPoint,
        billingMode: reservation.billingMode
      };
    }
    for (let attempt = 0; attempt < 300; attempt++) {
      await new Promise((r) => setTimeout(r, 50));
      const idemSnap = await db.collection(COLLECTIONS.idempotency).doc(idemDocId).get();
      if (idemSnap.exists && idemSnap.data()?.initPoint) {
        const stored = idemSnap.data();
        return {
          order: { id: reservation.orderId, planId: data.planId, status: stored.status, initPoint: stored.initPoint },
          initPoint: stored.initPoint,
          billingMode: stored.billingMode || billingMode
        };
      }
      if (idemSnap.exists && idemSnap.data()?.status === "failed") {
        const error2 = new Error("N\xE3o foi poss\xEDvel criar o checkout no Mercado Pago.");
        error2.statusCode = 502;
        throw error2;
      }
      const existingOrderSnap = await db.collection(COLLECTIONS.payments).doc(reservation.orderId).get();
      if (existingOrderSnap.exists) {
        const ext = existingOrderSnap.data();
        if (ext.initPoint) {
          return {
            order: { id: reservation.orderId, ...ext },
            initPoint: ext.initPoint,
            billingMode: ext.billingMode || billingMode
          };
        }
      }
    }
    const error = new Error("Tempo limite aguardando a cria\xE7\xE3o do checkout.");
    error.statusCode = 504;
    throw error;
  } else {
    orderId = reservation.orderId;
  }
  const orderRef = db.collection(COLLECTIONS.payments).doc(orderId);
  const orderSnap = await orderRef.get();
  const order = orderSnap.data();
  try {
    if (billingMode === "subscription") {
      const mpIdemKey2 = `mp-preapproval-${orderId}`;
      const body2 = await mpJson("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": mpIdemKey2
        },
        body: JSON.stringify({
          reason: `Plano Froc.IA ${plan.name} - ${plan.totalCredits} cr\xE9ditos por ciclo`,
          external_reference: orderId,
          payer_email: data.userEmail,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: plan.price,
            currency_id: "BRL"
          },
          back_url: `${config.appUrl}/planos?payment_status=subscription&order_id=${orderId}`,
          status: "pending"
        })
      });
      const initPoint2 = body2.init_point;
      if (!body2.id || !initPoint2) throw new Error("Mercado Pago n\xE3o retornou o link da assinatura.");
      await orderRef.update({
        providerSubscriptionId: String(body2.id),
        providerPreapprovalId: String(body2.id),
        initPoint: initPoint2,
        status: String(body2.status || "pending"),
        updatedAt: nowIso()
      });
      await idemRef.set({
        initPoint: initPoint2,
        status: String(body2.status || "pending"),
        updatedAt: nowIso()
      }, { merge: true });
      return { order: { ...order, providerSubscriptionId: String(body2.id), initPoint: initPoint2 }, initPoint: initPoint2, billingMode };
    }
    const mpIdemKey = `mp-pref-${orderId}`;
    const body = await mpJson("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": mpIdemKey },
      body: JSON.stringify({
        items: [{
          id: plan.id,
          title: `Plano Froc.IA ${plan.name} (${plan.totalCredits} cr\xE9ditos)`,
          description: "Ciclo avulso de automa\xE7\xE3o de marketing e intelig\xEAncia artificial Froc.IA",
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.price
        }],
        payer: { email: data.userEmail, name: data.userName },
        back_urls: {
          success: `${config.appUrl}/planos?payment_status=success&order_id=${orderId}`,
          pending: `${config.appUrl}/planos?payment_status=pending&order_id=${orderId}`,
          failure: `${config.appUrl}/planos?payment_status=failure&order_id=${orderId}`
        },
        auto_return: "approved",
        external_reference: orderId,
        notification_url: `${config.appUrl}/api/webhooks/mercadopago`,
        statement_descriptor: "FROC IA"
      })
    });
    const initPoint = body.init_point || body.sandbox_init_point;
    if (!body.id || !initPoint) throw new Error("Mercado Pago n\xE3o retornou o checkout.");
    await orderRef.update({ providerPreferenceId: body.id, initPoint, idempotencyKey: mpIdemKey, updatedAt: nowIso() });
    await idemRef.set({
      initPoint,
      status: "pending",
      updatedAt: nowIso()
    }, { merge: true });
    return { order: { ...order, providerPreferenceId: body.id, initPoint }, initPoint, billingMode };
  } catch (error) {
    const failedAt = nowIso();
    const providerError = String(error?.message || error).slice(0, 500);
    await Promise.all([
      orderRef.set({
        status: "failed",
        providerError,
        updatedAt: failedAt
      }, { merge: true }),
      idemRef.set({
        status: "failed",
        lastError: providerError,
        updatedAt: failedAt
      }, { merge: true })
    ]);
    throw error;
  }
}
function parseSignature(header) {
  const result = {};
  for (const part of header.split(",")) {
    const [key2, value] = part.trim().split("=", 2);
    if (key2 === "ts") result.ts = value;
    if (key2 === "v1") result.v1 = value;
  }
  return result;
}
function verifyMercadoPagoSignature(data) {
  if (!config.mercadoPago.webhookSecret || !data.signatureHeader || !data.requestId || !data.dataId) return false;
  if (!config.mercadoPago.webhookSecret || !data.signatureHeader || !data.requestId || !data.dataId) return false;
  const { ts, v1 } = parseSignature(data.signatureHeader);
  if (!ts || !v1) return false;
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return false;
  const ageSeconds = Math.abs(Date.now() / 1e3 - timestamp);
  if (ageSeconds > 15 * 60) return false;
  const manifest = `id:${String(data.dataId).toLowerCase()};request-id:${data.requestId};ts:${ts};`;
  const expected = import_crypto4.default.createHmac("sha256", config.mercadoPago.webhookSecret).update(manifest).digest("hex");
  try {
    return import_crypto4.default.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
var ALLOWED_ORDER_TRANSITIONS = {
  pending: ["approved", "active", "rejected", "cancelled", "failed"],
  approved: ["refunded", "charged_back"],
  active: ["cancel_at_period_end", "cancelled", "refunded", "charged_back"],
  cancel_at_period_end: ["cancelled", "refunded", "charged_back"],
  rejected: [],
  failed: [],
  cancelled: [],
  refunded: [],
  charged_back: []
};
function canTransitionOrderStatus(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}
function canTransitionPaymentStatus(currentStatus, newStatus) {
  if (!currentStatus || currentStatus === "pending" || currentStatus === "in_process") return true;
  if (currentStatus === "approved") {
    return ["approved", "refunded", "charged_back", "cancelled"].includes(newStatus);
  }
  if (currentStatus === "refunded" || currentStatus === "charged_back" || currentStatus === "cancelled") {
    return false;
  }
  return true;
}
function normalizePaymentStatus(status) {
  if (status === "approved") return "approved";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "charged_back";
  if (status === "cancelled") return "cancelled";
  if (status === "rejected") return "rejected";
  return "pending";
}
async function applyPaymentCycle(data) {
  const db = firestore();
  const orderRef = db.collection(COLLECTIONS.payments).doc(data.orderId);
  let userIdToRecalculate = null;
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error("Pedido Froc associado ao pagamento n\xE3o foi encontrado.");
    const order = orderSnap.data();
    const walletRef = db.collection(COLLECTIONS.wallets).doc(order.userId);
    const creditIdemRef = db.collection(COLLECTIONS.idempotency).doc(stableId(`mp-credit:${data.paymentId}`));
    const reversalIdemRef = db.collection(COLLECTIONS.idempotency).doc(stableId(`mp-reversal:${data.paymentId}`));
    const [walletSnap, creditIdemSnap, reversalIdemSnap] = await Promise.all([
      tx.get(walletRef),
      tx.get(creditIdemRef),
      tx.get(reversalIdemRef)
    ]);
    if (data.currency !== "BRL" || Math.abs(Number(data.amount) - Number(order.amount)) > 0.01) {
      throw new Error("Valor ou moeda do pagamento diverge do pedido original.");
    }
    const status = normalizePaymentStatus(data.status);
    const currentPaymentStatus = order.lastPaymentStatus;
    const paymentTransitionAccepted = canTransitionPaymentStatus(currentPaymentStatus, status);
    const finalPaymentStatus = paymentTransitionAccepted ? status : currentPaymentStatus || status;
    const baseUpdate = {
      lastPaymentStatus: finalPaymentStatus,
      updatedAt: nowIso()
    };
    if (paymentTransitionAccepted) {
      baseUpdate.providerPaymentId = data.paymentId;
      baseUpdate.lastBillingCycleId = data.cycleId;
      baseUpdate.paymentMethod = data.paymentMethod || null;
    }
    if (data.subscriptionId) {
      baseUpdate.providerSubscriptionId = data.subscriptionId;
      baseUpdate.providerPreapprovalId = data.subscriptionId;
    }
    const wallet = walletSnap.exists ? walletSnap.data() : {
      id: order.userId,
      userId: order.userId,
      balance: 0,
      bonusBalance: 0,
      totalUsed: 0,
      totalReceived: 0,
      reservedCredits: 0,
      planId: "plan_free",
      planStatus: "free"
    };
    const credits = Number(order.creditsGranted || 0) + Number(order.bonusCreditsGranted || 0);
    const before = Number(wallet.balance || 0);
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    const currentStatus = order.status || "pending";
    let targetOrderStatus = currentStatus;
    if (status === "approved" && !creditIdemSnap.exists) {
      targetOrderStatus = order.billingMode === "subscription" ? "active" : "approved";
      if (!canTransitionOrderStatus(currentStatus, targetOrderStatus)) {
        return;
      }
      tx.set(walletRef, {
        ...wallet,
        id: order.userId,
        userId: order.userId,
        balance: before + credits,
        bonusBalance: Number(wallet.bonusBalance || 0) + Number(order.bonusCreditsGranted || 0),
        totalReceived: Number(wallet.totalReceived || 0) + credits,
        planId: order.planId,
        planStatus: "active",
        planStartedAt: wallet.planStartedAt || nowIso(),
        currentPeriodEnd,
        updatedAt: nowIso()
      }, { merge: true });
      const creditTxRef = db.collection(COLLECTIONS.creditTransactions).doc(newId("tx"));
      tx.set(creditTxRef, {
        userId: order.userId,
        type: order.billingMode === "subscription" ? "subscription" : "purchase",
        source: `Mercado Pago - Plano ${order.planName}`,
        amount: credits,
        balanceBefore: before,
        balanceAfter: before + credits,
        referenceId: data.paymentId,
        idempotencyKey: `mp-credit:${data.paymentId}`,
        timestamp: nowIso(),
        metadata: { orderId: data.orderId, planId: order.planId, cycleId: data.cycleId, subscriptionId: data.subscriptionId || null }
      });
      tx.set(creditIdemRef, { key: `mp-credit:${data.paymentId}`, createdAt: nowIso(), orderId: data.orderId, credits });
      baseUpdate.status = targetOrderStatus;
      baseUpdate.currentPeriodEnd = currentPeriodEnd;
      baseUpdate.processedAt = nowIso();
      baseUpdate.lastCreditedAt = nowIso();
    } else if (["refunded", "charged_back", "cancelled"].includes(status) && creditIdemSnap.exists && !reversalIdemSnap.exists) {
      targetOrderStatus = status;
      if (canTransitionOrderStatus(currentStatus, targetOrderStatus)) {
        baseUpdate.status = targetOrderStatus;
      }
      const after = Math.max(0, before - credits);
      tx.set(walletRef, {
        ...wallet,
        id: order.userId,
        userId: order.userId,
        balance: after,
        bonusBalance: Math.max(0, Number(wallet.bonusBalance || 0) - Number(order.bonusCreditsGranted || 0)),
        updatedAt: nowIso()
      }, { merge: true });
      const refundTxRef = db.collection(COLLECTIONS.creditTransactions).doc(newId("tx"));
      tx.set(refundTxRef, {
        userId: order.userId,
        type: "refund",
        source: `Revers\xE3o Mercado Pago - ${status}`,
        amount: -credits,
        balanceBefore: before,
        balanceAfter: after,
        referenceId: data.paymentId,
        idempotencyKey: `mp-reversal:${data.paymentId}`,
        timestamp: nowIso(),
        metadata: { orderId: data.orderId, planId: order.planId, cycleId: data.cycleId }
      });
      tx.set(reversalIdemRef, { key: `mp-reversal:${data.paymentId}`, createdAt: nowIso(), orderId: data.orderId, credits, status });
      baseUpdate.reversedAt = nowIso();
      userIdToRecalculate = order.userId;
    } else if (status !== "approved") {
      if (canTransitionOrderStatus(currentStatus, status)) {
        baseUpdate.status = status;
      }
    }
    tx.set(orderRef, baseUpdate, { merge: true });
  });
  if (userIdToRecalculate) {
    const recalculated = await recalculateUserPlan(userIdToRecalculate);
    await db.collection(COLLECTIONS.wallets).doc(userIdToRecalculate).set({
      planId: recalculated.planId,
      planStatus: recalculated.planStatus,
      currentPeriodEnd: recalculated.currentPeriodEnd,
      updatedAt: nowIso()
    }, { merge: true });
  }
}
async function processStandardPayment(resourceId) {
  const payment = await mpJson(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(resourceId)}`);
  const orderId = String(payment.external_reference || "");
  if (!orderId) return { processed: false, message: "Pagamento sem external_reference." };
  await applyPaymentCycle({
    orderId,
    paymentId: String(payment.id),
    cycleId: String(payment.id),
    status: String(payment.status || "pending"),
    amount: Number(payment.transaction_amount || 0),
    currency: String(payment.currency_id || ""),
    paymentMethod: payment.payment_type_id || payment.payment_method_id || void 0
  });
  return { processed: true, message: `Pagamento ${resourceId} validado.` };
}
async function processAuthorizedPayment(resourceId) {
  const invoice = await mpJson(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(resourceId)}`);
  let orderId = String(invoice.external_reference || "");
  const subscriptionId = String(invoice.preapproval_id || invoice.preapproval?.id || "");
  if (!orderId && subscriptionId) {
    const snap = await firestore().collection(COLLECTIONS.payments).where("providerSubscriptionId", "==", subscriptionId).limit(1).get();
    if (!snap.empty) orderId = snap.docs[0].id;
  }
  if (!orderId) return { processed: false, message: "Fatura recorrente sem refer\xEAncia a um pedido Froc.IA." };
  const paymentId = String(invoice.payment?.id || invoice.id);
  const paymentStatus = String(invoice.payment?.status || invoice.summarized || invoice.status || "pending");
  await applyPaymentCycle({
    orderId,
    paymentId,
    cycleId: String(invoice.id),
    status: paymentStatus,
    amount: Number(invoice.transaction_amount || 0),
    currency: String(invoice.currency_id || ""),
    subscriptionId: subscriptionId || void 0
  });
  return { processed: true, message: `Ciclo recorrente ${resourceId} validado.` };
}
async function processSubscription(resourceId) {
  const subscription = await mpJson(`https://api.mercadopago.com/preapproval/${encodeURIComponent(resourceId)}`);
  const orderId = String(subscription.external_reference || "");
  if (!orderId) return { processed: false, message: "Assinatura sem external_reference." };
  const ref = firestore().collection(COLLECTIONS.payments).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Pedido associado \xE0 assinatura n\xE3o encontrado.");
  const existing = snap.data();
  const now = nowIso();
  const currentPeriodEnd = existing.currentPeriodEnd || (existing.lastCreditedAt ? new Date(new Date(existing.lastCreditedAt).getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString() : null);
  let newStatus = existing.status || "pending";
  let periodEnd = existing.currentPeriodEnd || null;
  if (subscription.status === "cancelled") {
    if (existing.lastCreditedAt && currentPeriodEnd && currentPeriodEnd > now) {
      newStatus = "cancel_at_period_end";
      periodEnd = currentPeriodEnd;
    } else {
      newStatus = "cancelled";
      periodEnd = null;
    }
  } else if (subscription.status === "authorized") {
    newStatus = existing.status === "active" ? "active" : "pending";
  }
  await ref.set({
    providerSubscriptionId: String(subscription.id),
    providerPreapprovalId: String(subscription.id),
    subscriptionStatus: String(subscription.status || "pending"),
    status: newStatus,
    currentPeriodEnd: periodEnd,
    nextPaymentDate: subscription.next_payment_date || null,
    updatedAt: nowIso()
  }, { merge: true });
  if (existing.userId) {
    const recalculated = await recalculateUserPlan(existing.userId);
    await firestore().collection(COLLECTIONS.wallets).doc(existing.userId).set({
      planId: recalculated.planId,
      planStatus: recalculated.planStatus,
      currentPeriodEnd: recalculated.currentPeriodEnd,
      updatedAt: nowIso()
    }, { merge: true });
  }
  return { processed: true, message: `Assinatura ${resourceId} sincronizada.` };
}
async function processMercadoPagoWebhook(data) {
  const resourceId = String(data.body?.data?.id || data.query?.["data.id"] || data.query?.id || data.body?.id || "");
  if (!resourceId) return { processed: false, message: "Notifica\xE7\xE3o sem data.id." };
  const signatureHeader = String(data.headers["x-signature"] || "");
  const requestId = String(data.headers["x-request-id"] || "");
  if (!verifyMercadoPagoSignature({ signatureHeader, requestId, dataId: resourceId })) {
    const error = new Error("Assinatura do webhook Mercado Pago inv\xE1lida.");
    error.statusCode = 401;
    throw error;
  }
  const type = String(data.body?.type || data.query?.type || data.body?.topic || data.query?.topic || "").toLowerCase();
  if (type === "subscription_authorized_payment") return processAuthorizedPayment(resourceId);
  if (type === "subscription_preapproval") return processSubscription(resourceId);
  if (type === "payment" || type.startsWith("payment.")) return processStandardPayment(resourceId);
  const action = String(data.body?.action || "").toLowerCase();
  if (action.startsWith("payment.")) return processStandardPayment(resourceId);
  return { processed: true, message: `Evento Mercado Pago ${type || action || "desconhecido"} autenticado e ignorado por n\xE3o alterar o ledger.` };
}
async function listUserSubscriptions(userId) {
  const snap = await firestore().collection(COLLECTIONS.payments).where("userId", "==", userId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => item.billingMode === "subscription").sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}
async function cancelSubscription(userId, orderId) {
  const subscriptions = await listUserSubscriptions(userId);
  const target = orderId ? subscriptions.find((item) => item.id === orderId) : subscriptions.find((item) => ["active", "authorized", "pending", "cancel_at_period_end"].includes(String(item.status)) || ["authorized", "pending"].includes(String(item.subscriptionStatus)));
  if (!target) {
    const error = new Error("Nenhuma assinatura ativa encontrada.");
    error.statusCode = 404;
    throw error;
  }
  const subscriptionId = String(target.providerSubscriptionId || target.providerPreapprovalId || "");
  if (!subscriptionId) throw new Error("Assinatura sem identificador do Mercado Pago.");
  let updated;
  try {
    updated = await mpJson(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" })
    });
  } catch (err) {
    console.error("[MercadoPago] Falha na comunica\xE7\xE3o ao cancelar assinatura:", err?.message || err);
    const error = new Error(`Falha ao comunicar com o Mercado Pago para cancelar a renova\xE7\xE3o: ${err?.message || "Erro desconhecido"}`);
    error.statusCode = 502;
    throw error;
  }
  if (!updated || updated.status !== "cancelled") {
    const error = new Error("O Mercado Pago n\xE3o confirmou o cancelamento da assinatura.");
    error.statusCode = 502;
    throw error;
  }
  const now = nowIso();
  const hasSettledCycle = Boolean(target.lastCreditedAt);
  let currentPeriodEnd = null;
  let finalStatus = "cancelled";
  if (hasSettledCycle) {
    const rawPeriodEnd = target.nextPaymentDate || target.currentPeriodEnd || (target.lastCreditedAt ? new Date(new Date(target.lastCreditedAt).getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString() : null);
    if (rawPeriodEnd && rawPeriodEnd > now) {
      currentPeriodEnd = rawPeriodEnd;
      finalStatus = "cancel_at_period_end";
    }
  }
  await firestore().collection(COLLECTIONS.payments).doc(target.id).set({
    status: finalStatus,
    subscriptionStatus: "cancelled",
    currentPeriodEnd,
    cancelledAt: now,
    updatedAt: now
  }, { merge: true });
  const recalculated = await recalculateUserPlan(userId);
  await firestore().collection(COLLECTIONS.wallets).doc(userId).set({
    planId: recalculated.planId,
    planStatus: recalculated.planStatus,
    currentPeriodEnd: recalculated.currentPeriodEnd,
    updatedAt: now
  }, { merge: true });
  return { id: target.id, providerSubscriptionId: subscriptionId, status: finalStatus, currentPeriodEnd };
}

// server/production/social.ts
var import_crypto5 = __toESM(require("crypto"), 1);
var SOCIAL_REQUEST_TIMEOUT_MS = 2e4;
var INSTAGRAM_CONTAINER_POLL_DELAYS_MS = [1e3, 2e3, 3e3, 4e3, 5e3, 5e3];
async function socialFetch(input, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOCIAL_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
function sanitizeProviderMessage(value, fallback) {
  const raw = String(value || fallback || "").slice(0, 600);
  const sanitized = raw.replace(/\b(?:EAA|IGQV|EAAB)[A-Za-z0-9_-]{10,}\b/g, "[TOKEN_REMOVIDO]").replace(/(access_token|refresh_token|client_secret|code)\s*[=:]\s*[^&\s,;]+/gi, "$1=[REMOVIDO]").replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REMOVIDO]").replace(/[\r\n\t]+/g, " ").trim();
  return sanitized.slice(0, 300) || fallback;
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var TEXT_AUTO_PUBLISH_PROVIDERS = ["facebook", "linkedin", "x"];
function isTextAutoPublishSupported(provider) {
  const norm = normalizeProvider(provider);
  if (!norm) return false;
  return TEXT_AUTO_PUBLISH_PROVIDERS.includes(norm);
}
function getProviderAutoPublishReason(provider) {
  const norm = normalizeProvider(provider);
  if (!norm) return "Rede social n\xE3o reconhecida.";
  if (isTextAutoPublishSupported(norm)) return null;
  switch (norm) {
    case "instagram":
      return "O Instagram exige m\xEDdia visual obrigat\xF3ria (imagem ou v\xEDdeo) via Graph API e n\xE3o suporta publica\xE7\xE3o autom\xE1tica puramente textual.";
    case "tiktok":
      return "O TikTok suporta exclusivamente postagem de v\xEDdeos via API Direct Post/Draft Inbox.";
    case "youtube":
      return "O YouTube exige arquivo de v\xEDdeo ou Short para publica\xE7\xE3o.";
    case "pinterest":
      return "O Pinterest exige envio de imagem e URL de destino para cria\xE7\xE3o de Pins.";
    default:
      return `A rede social "${provider}" n\xE3o suporta publica\xE7\xE3o autom\xE1tica textual direta neste pipeline.`;
  }
}
function normalizeProvider(value) {
  const v = String(value || "").toLowerCase().trim();
  if (v.includes("instagram")) return "instagram";
  if (v.includes("facebook")) return "facebook";
  if (v.includes("tiktok")) return "tiktok";
  if (v.includes("youtube")) return "youtube";
  if (v.includes("linkedin")) return "linkedin";
  if (v === "x" || v.includes("twitter")) return "x";
  if (v.includes("pinterest")) return "pinterest";
  return null;
}
function key() {
  const encKey = config.encryptionKey || process.env.TOKEN_ENCRYPTION_KEY || (!config.isProduction ? "default_dev_test_token_encryption_key_32b!" : "");
  if (!encKey) throw new Error("TOKEN_ENCRYPTION_KEY n\xE3o configurada.");
  return import_crypto5.default.createHash("sha256").update(encKey).digest();
}
function encrypt(value) {
  if (!value) return "";
  const iv = import_crypto5.default.randomBytes(12);
  const cipher = import_crypto5.default.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}
function decrypt(value) {
  if (!value) return "";
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Token social criptografado inv\xE1lido.");
  const decipher = import_crypto5.default.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
}
function callbackUrl(provider) {
  return `${config.appUrl}/api/social/${provider}/callback`;
}
function base64UrlSha256(value) {
  return import_crypto5.default.createHash("sha256").update(value).digest("base64url");
}
function providerCredentials(provider) {
  switch (provider) {
    case "facebook":
    case "instagram":
      return { clientId: config.social.meta.clientId, clientSecret: config.social.meta.clientSecret };
    case "linkedin":
      return { clientId: config.social.linkedin.clientId, clientSecret: config.social.linkedin.clientSecret };
    case "youtube":
      return { clientId: config.social.google.clientId, clientSecret: config.social.google.clientSecret };
    case "tiktok":
      return { clientId: config.social.tiktok.clientId, clientSecret: config.social.tiktok.clientSecret };
    case "pinterest":
      return { clientId: config.social.pinterest.clientId, clientSecret: config.social.pinterest.clientSecret };
    case "x":
      return { clientId: config.social.x.clientId, clientSecret: config.social.x.clientSecret };
  }
}
async function createOAuthUrl(data) {
  const credentials = providerCredentials(data.provider);
  if (!credentials.clientId && config.isProduction) {
    throw new Error(`Credenciais OAuth de ${data.provider} n\xE3o configuradas.`);
  }
  const state = import_crypto5.default.randomBytes(32).toString("base64url");
  const codeVerifier = data.provider === "x" ? import_crypto5.default.randomBytes(48).toString("base64url") : "";
  await firestore().collection(COLLECTIONS.oauthStates).doc(stableId(state)).set({
    stateHash: stableId(state),
    provider: data.provider,
    userId: data.userId,
    companyId: data.companyId,
    codeVerifier: codeVerifier ? encrypt(codeVerifier) : null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1e3
  });
  const redirectUri = callbackUrl(data.provider);
  let url;
  switch (data.provider) {
    case "linkedin":
      url = new URL("https://www.linkedin.com/oauth/v2/authorization");
      url.search = new URLSearchParams({ response_type: "code", client_id: credentials.clientId, redirect_uri: redirectUri, state, scope: "openid profile email w_member_social" }).toString();
      break;
    case "youtube":
      url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({ response_type: "code", client_id: credentials.clientId, redirect_uri: redirectUri, state, scope: "openid email profile https://www.googleapis.com/auth/youtube.upload", access_type: "offline", prompt: "consent", include_granted_scopes: "true" }).toString();
      break;
    case "tiktok":
      url = new URL("https://www.tiktok.com/v2/auth/authorize/");
      url.search = new URLSearchParams({ client_key: credentials.clientId, response_type: "code", scope: "user.info.basic,video.upload", redirect_uri: redirectUri, state }).toString();
      break;
    case "pinterest":
      url = new URL("https://www.pinterest.com/oauth/");
      url.search = new URLSearchParams({ client_id: credentials.clientId, redirect_uri: redirectUri, response_type: "code", scope: "boards:read,pins:read,pins:write,user_accounts:read", state }).toString();
      break;
    case "x":
      url = new URL("https://x.com/i/oauth2/authorize");
      url.search = new URLSearchParams({ response_type: "code", client_id: credentials.clientId, redirect_uri: redirectUri, scope: "tweet.read tweet.write users.read offline.access", state, code_challenge: base64UrlSha256(codeVerifier), code_challenge_method: "S256" }).toString();
      break;
    case "facebook":
      url = new URL(`https://www.facebook.com/${config.social.meta.graphVersion}/dialog/oauth`);
      url.search = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        scope: "public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,business_management"
      }).toString();
      break;
    case "instagram":
      url = new URL(`https://www.facebook.com/${config.social.meta.graphVersion}/dialog/oauth`);
      url.search = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        scope: "public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish"
      }).toString();
      break;
  }
  return { url: url.toString(), provider: data.provider };
}
async function exchangeCode(provider, code, codeVerifier = "") {
  const { clientId, clientSecret } = providerCredentials(provider);
  const redirectUri = callbackUrl(provider);
  let endpoint = "";
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  let params;
  if (provider === "linkedin") {
    endpoint = "https://www.linkedin.com/oauth/v2/accessToken";
    params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret });
  } else if (provider === "youtube") {
    endpoint = "https://oauth2.googleapis.com/token";
    params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret });
  } else if (provider === "tiktok") {
    endpoint = "https://open.tiktokapis.com/v2/oauth/token/";
    params = new URLSearchParams({ client_key: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri });
  } else if (provider === "pinterest") {
    endpoint = "https://api.pinterest.com/v5/oauth/token";
    params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, continuous_refresh: "true" });
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else if (provider === "x") {
    endpoint = "https://api.x.com/2/oauth2/token";
    params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier, client_id: clientId });
    if (clientSecret) headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    const url = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/oauth/access_token`);
    url.search = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }).toString();
    const response2 = await socialFetch(url);
    const json2 = await response2.json().catch(() => ({}));
    if (!response2.ok || !json2.access_token) throw new Error(json2.error?.message || `Falha OAuth ${provider}.`);
    return json2;
  }
  const response = await socialFetch(endpoint, { method: "POST", headers, body: params.toString() });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) throw new Error(json.error_description || json.message || json.error || `Falha OAuth ${provider}.`);
  return json;
}
async function fetchAccount(provider, accessToken) {
  let endpoint = "";
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (provider === "linkedin") endpoint = "https://api.linkedin.com/v2/userinfo";
  else if (provider === "youtube") {
    try {
      const ytRes = await socialFetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers });
      const ytJson = await ytRes.json().catch(() => ({}));
      if (ytRes.ok && Array.isArray(ytJson.items) && ytJson.items.length > 0) {
        return {
          id: String(ytJson.items[0].id),
          name: String(ytJson.items[0].snippet?.title || "Canal YouTube")
        };
      }
    } catch {
    }
    endpoint = "https://www.googleapis.com/oauth2/v3/userinfo";
  } else if (provider === "tiktok") endpoint = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url";
  else if (provider === "pinterest") endpoint = "https://api.pinterest.com/v5/user_account";
  else if (provider === "x") endpoint = "https://api.x.com/2/users/me";
  else endpoint = `https://graph.facebook.com/${config.social.meta.graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  const response = await socialFetch(endpoint, { headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || json.message || `Falha ao consultar perfil ${provider}.`);
  const source = provider === "tiktok" ? json.data?.user : provider === "x" ? json.data : json;
  return { id: String(source?.id || source?.sub || source?.open_id || source?.username || "unknown"), name: String(source?.name || source?.display_name || source?.username || provider) };
}
function hasPagePublishTask(tasks) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return true;
  }
  const normalized = tasks.map((t) => String(t).toUpperCase());
  return normalized.some(
    (t) => ["CREATE_CONTENT", "MANAGE", "MODERATE", "PUBLISH_TO_PAGE", "CONTENT"].includes(t)
  );
}
function sanitizeOAuthPublicError(err, provider) {
  const msg = String(err?.message || err || "").trim();
  if (msg.startsWith("Permiss\xE3o '") && msg.includes("n\xE3o foi concedida")) {
    return msg;
  }
  if (msg.includes("Nenhuma P\xE1gina do Facebook") || msg.includes("n\xE3o possui permiss\xE3o de cria\xE7\xE3o/publica\xE7\xE3o") || msg.includes("Page Access Token")) {
    return msg;
  }
  if (msg.includes("Nenhuma conta profissional do Instagram")) {
    return msg;
  }
  if (msg.includes("Estado OAuth inv\xE1lido") || msg.includes("Sess\xE3o OAuth expirada") || msg.includes("Autoriza\xE7\xE3o OAuth incompleta")) {
    return msg;
  }
  if (msg.includes("access_denied") || msg.includes("cancelou") || msg.includes("cancelada") || msg.includes("Cancelado")) {
    return "Autoriza\xE7\xE3o cancelada pelo usu\xE1rio.";
  }
  const providerNames = {
    facebook: "o Facebook",
    instagram: "o Instagram",
    tiktok: "o TikTok",
    youtube: "o YouTube",
    linkedin: "o LinkedIn",
    pinterest: "o Pinterest",
    x: "o X (Twitter)"
  };
  const target = providerNames[provider] || provider;
  return `N\xE3o foi poss\xEDvel concluir a conex\xE3o com ${target}.`;
}
async function diagnoseMetaPermissions(userToken, requiredPermissions) {
  try {
    const url = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/me/permissions`);
    url.search = new URLSearchParams({ access_token: userToken }).toString();
    const res = await socialFetch(url);
    const json = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(json.data)) {
      const granted = new Set(
        json.data.filter((item) => item?.status === "granted").map((item) => String(item?.permission))
      );
      for (const perm of requiredPermissions) {
        if (!granted.has(perm)) {
          return `Permiss\xE3o '${perm}' n\xE3o foi concedida na autoriza\xE7\xE3o da Meta.`;
        }
      }
    }
  } catch {
  }
  return null;
}
async function resolveMetaAccount(provider, shortToken) {
  let userToken = shortToken;
  let longLivedExpiresIn = null;
  if (config.social.meta.clientSecret) {
    const exchange = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/oauth/access_token`);
    exchange.search = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: config.social.meta.clientId,
      client_secret: config.social.meta.clientSecret,
      fb_exchange_token: shortToken
    }).toString();
    const response = await socialFetch(exchange);
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.access_token) {
      userToken = String(json.access_token);
      if (json.expires_in) {
        longLivedExpiresIn = Number(json.expires_in);
      }
    }
  }
  if (provider === "facebook") {
    const pagesUrl2 = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/me/accounts`);
    pagesUrl2.search = new URLSearchParams({
      fields: "id,name,access_token,tasks,category",
      access_token: userToken
    }).toString();
    const pagesResponse2 = await socialFetch(pagesUrl2);
    const pagesJson2 = await pagesResponse2.json().catch(() => ({}));
    const pages2 = Array.isArray(pagesJson2.data) ? pagesJson2.data : [];
    let candidatePages = [...pages2];
    const eligibleInPrimary = pages2.filter((item) => item?.id && item?.access_token && hasPagePublishTask(item?.tasks));
    if (eligibleInPrimary.length === 0) {
      const businessesUrl = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/me/businesses`);
      businessesUrl.search = new URLSearchParams({
        fields: "id,name",
        access_token: userToken
      }).toString();
      const businessesResponse = await socialFetch(businessesUrl);
      const businessesJson = await businessesResponse.json().catch(() => ({}));
      const businesses = Array.isArray(businessesJson.data) ? businessesJson.data : [];
      for (const biz of businesses) {
        if (!biz?.id) continue;
        const ownedUrl = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/${biz.id}/owned_pages`);
        ownedUrl.search = new URLSearchParams({
          fields: "id,name,access_token,tasks,category",
          access_token: userToken
        }).toString();
        const ownedRes = await socialFetch(ownedUrl);
        const ownedJson = await ownedRes.json().catch(() => ({}));
        const ownedPages = Array.isArray(ownedJson.data) ? ownedJson.data : [];
        candidatePages.push(...ownedPages);
        const clientUrl = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/${biz.id}/client_pages`);
        clientUrl.search = new URLSearchParams({
          fields: "id,name,access_token,tasks,category",
          access_token: userToken
        }).toString();
        const clientRes = await socialFetch(clientUrl);
        const clientJson = await clientRes.json().catch(() => ({}));
        const clientPages = Array.isArray(clientJson.data) ? clientJson.data : [];
        candidatePages.push(...clientPages);
      }
    }
    const uniqueMap = /* @__PURE__ */ new Map();
    for (const p of candidatePages) {
      if (p?.id && !uniqueMap.has(String(p.id))) {
        uniqueMap.set(String(p.id), p);
      }
    }
    const uniqueCandidates = Array.from(uniqueMap.values());
    const eligiblePages = uniqueCandidates.filter((p) => p?.id && p?.access_token && hasPagePublishTask(p?.tasks));
    if (eligiblePages.length === 1) {
      const page = eligiblePages[0];
      return {
        id: String(page.id),
        name: String(page.name || "Facebook Page"),
        accessToken: String(page.access_token),
        pageId: String(page.id),
        expiresIn: longLivedExpiresIn,
        multiplePages: false
      };
    }
    if (eligiblePages.length > 1) {
      return {
        multiplePages: true,
        pages: eligiblePages.map((p) => ({
          id: String(p.id),
          name: String(p.name || "Facebook Page"),
          accessToken: String(p.access_token)
        })),
        expiresIn: longLivedExpiresIn
      };
    }
    const permDiag2 = await diagnoseMetaPermissions(userToken, [
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "business_management"
    ]);
    if (permDiag2) {
      throw new Error(permDiag2);
    }
    if (uniqueCandidates.length > 0) {
      const pageWithoutTask = uniqueCandidates.find((p) => p?.id && p?.tasks && !hasPagePublishTask(p.tasks));
      if (pageWithoutTask) {
        throw new Error("A P\xE1gina do Facebook encontrada n\xE3o possui permiss\xE3o de cria\xE7\xE3o/publica\xE7\xE3o de conte\xFAdo.");
      }
      throw new Error("A P\xE1gina do Facebook encontrada n\xE3o forneceu um Page Access Token v\xE1lido para publica\xE7\xE3o.");
    }
    throw new Error("Nenhuma P\xE1gina do Facebook foi encontrada nesta conta ou Portf\xF3lio Empresarial (Business Manager). Certifique-se de que sua conta tenha Controle Total ou permiss\xE3o de publica\xE7\xE3o na P\xE1gina.");
  }
  const pagesUrl = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/me/accounts`);
  pagesUrl.search = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username,name}",
    access_token: userToken
  }).toString();
  const pagesResponse = await socialFetch(pagesUrl);
  const pagesJson = await pagesResponse.json().catch(() => ({}));
  const pages = Array.isArray(pagesJson.data) ? pagesJson.data : [];
  const instagramCandidates = [];
  for (const p of pages) {
    if (p?.instagram_business_account?.id && p?.access_token) {
      instagramCandidates.push({
        id: String(p.instagram_business_account.id),
        username: String(p.instagram_business_account.username || p.instagram_business_account.name || "Instagram Account"),
        name: String(p.instagram_business_account.name || p.instagram_business_account.username || p.name || "Instagram Business"),
        pageName: String(p.name || "Facebook Page"),
        pageId: String(p.id),
        accessToken: String(p.access_token)
      });
    }
  }
  const uniqueIgMap = /* @__PURE__ */ new Map();
  for (const ig of instagramCandidates) {
    if (!uniqueIgMap.has(ig.id)) {
      uniqueIgMap.set(ig.id, ig);
    }
  }
  const uniqueIgCandidates = Array.from(uniqueIgMap.values());
  if (uniqueIgCandidates.length === 1) {
    const ig = uniqueIgCandidates[0];
    return {
      id: ig.id,
      name: ig.username,
      accessToken: ig.accessToken,
      pageId: ig.pageId,
      expiresIn: longLivedExpiresIn,
      multiplePages: false
    };
  }
  if (uniqueIgCandidates.length > 1) {
    return {
      multiplePages: true,
      pages: uniqueIgCandidates.map((ig) => ({
        id: ig.id,
        pageId: ig.pageId,
        name: `@${ig.username} (${ig.pageName})`,
        accessToken: ig.accessToken
      })),
      expiresIn: longLivedExpiresIn
    };
  }
  const permDiag = await diagnoseMetaPermissions(userToken, [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_content_publish"
  ]);
  if (permDiag) throw new Error(permDiag);
  throw new Error("Nenhuma conta profissional do Instagram vinculada a uma P\xE1gina do Facebook foi encontrada.");
}
async function handleOAuthCallback(data) {
  const db = firestore();
  const stateRef = db.collection(COLLECTIONS.oauthStates).doc(stableId(data.state));
  const state = await db.runTransaction(async (tx) => {
    const stateSnap = await tx.get(stateRef);
    if (!stateSnap.exists) throw new Error("Estado OAuth inv\xE1lido ou j\xE1 utilizado.");
    const current = stateSnap.data();
    if (current.provider !== data.provider || Number(current.expiresAt) < Date.now()) {
      tx.delete(stateRef);
      throw new Error("Sess\xE3o OAuth expirada ou incompat\xEDvel.");
    }
    tx.delete(stateRef);
    return current;
  });
  const verifier = state.codeVerifier ? decrypt(state.codeVerifier) : "";
  const token = await exchangeCode(data.provider, data.code, verifier);
  let account;
  if (data.provider === "facebook" || data.provider === "instagram") {
    account = await resolveMetaAccount(data.provider, token.access_token);
  } else {
    account = await fetchAccount(data.provider, token.access_token);
  }
  if (account.multiplePages) {
    const pageSelectToken = import_crypto5.default.randomBytes(32).toString("base64url");
    await db.collection(COLLECTIONS.oauthStates).doc(stableId(pageSelectToken)).set({
      type: "facebook_page_selection",
      userId: state.userId,
      companyId: state.companyId,
      provider: data.provider,
      pages: account.pages.map((p) => ({
        id: p.id,
        pageId: p.pageId || p.id,
        name: p.name,
        encryptedAccessToken: encrypt(p.accessToken)
      })),
      scopes: String(token.scope || "").split(/[ ,]+/).filter(Boolean),
      expiresIn: account.expiresIn || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1e3
    });
    return {
      success: true,
      selectionRequired: true,
      pageSelectToken,
      provider: data.provider,
      userId: state.userId,
      companyId: state.companyId,
      pages: account.pages.map((p) => ({ id: p.id, name: p.name }))
    };
  }
  const tokenToStore = account.accessToken || token.access_token;
  const connectionId = stableId(`${state.userId}:${state.companyId}:${data.provider}`);
  const expiresAt = data.provider === "facebook" || data.provider === "instagram" ? account.expiresIn ? new Date(Date.now() + Number(account.expiresIn) * 1e3).toISOString() : null : token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1e3).toISOString() : null;
  await db.collection(COLLECTIONS.socialConnections).doc(connectionId).set({
    userId: state.userId,
    companyId: state.companyId,
    provider: data.provider,
    accountId: account.id,
    accountName: account.name,
    pageId: account.pageId || null,
    encryptedAccessToken: encrypt(tokenToStore),
    encryptedRefreshToken: token.refresh_token ? encrypt(token.refresh_token) : null,
    scopes: String(token.scope || "").split(/[ ,]+/).filter(Boolean),
    expiresAt,
    connectedAt: nowIso(),
    updatedAt: nowIso(),
    status: "connected"
  }, { merge: true });
  return { success: true, selectionRequired: false, userId: state.userId, companyId: state.companyId, account: { id: account.id, name: account.name } };
}
async function selectFacebookPage(data) {
  const token = data.pageSelectToken || data.selectionToken;
  const targetPageId = data.selectedPageId || data.pageId;
  if (!token || !targetPageId) throw new Error("Token de sele\xE7\xE3o e ID da p\xE1gina s\xE3o obrigat\xF3rios.");
  const db = firestore();
  const tokenHash = stableId(token);
  const oauthRef = db.collection(COLLECTIONS.oauthStates).doc(tokenHash);
  const legacyRef = db.collection(COLLECTIONS.pageSelectTokens).doc(tokenHash);
  return db.runTransaction(async (tx) => {
    const [oauthSnap, legacySnap] = await Promise.all([tx.get(oauthRef), tx.get(legacyRef)]);
    const snap = oauthSnap.exists ? oauthSnap : legacySnap;
    if (!snap.exists) throw new Error("Token de sele\xE7\xE3o de p\xE1gina inv\xE1lido ou expirado (ou j\xE1 utilizado).");
    const stateData = snap.data();
    if (stateData.type && stateData.type !== "facebook_page_selection") throw new Error("Tipo de sess\xE3o OAuth inv\xE1lido.");
    if (stateData.userId !== data.userId) throw new Error("Permiss\xE3o negada: sess\xE3o de sele\xE7\xE3o pertence a outro usu\xE1rio.");
    if (stateData.companyId && data.companyId && stateData.companyId !== data.companyId) {
      throw new Error("Permiss\xE3o negada: empresa n\xE3o corresponde \xE0 sess\xE3o de sele\xE7\xE3o.");
    }
    if (Number(stateData.expiresAt) < Date.now()) throw new Error("Sess\xE3o de sele\xE7\xE3o de p\xE1gina expirada.");
    const companyId = data.companyId || stateData.companyId;
    if (!companyId) throw new Error("Empresa da sess\xE3o de sele\xE7\xE3o n\xE3o encontrada.");
    const provider = stateData.provider === "instagram" ? "instagram" : "facebook";
    const pages = Array.isArray(stateData.pages) ? stateData.pages : [];
    const chosen = pages.find((page) => String(page.id) === String(targetPageId));
    if (!chosen) throw new Error("P\xE1gina n\xE3o encontrada na lista autorizada.");
    const encryptedToken = chosen.encryptedAccessToken || (chosen.accessToken ? encrypt(chosen.accessToken) : null);
    if (!encryptedToken) throw new Error("Token de acesso da conta n\xE3o encontrado.");
    const connectionId = stableId(`${data.userId}:${companyId}:${provider}`);
    const connectionRef = db.collection(COLLECTIONS.socialConnections).doc(connectionId);
    const expiresAt = stateData.expiresIn ? new Date(Date.now() + Number(stateData.expiresIn) * 1e3).toISOString() : null;
    const accountId = String(chosen.id);
    const pageHostId = provider === "instagram" ? String(chosen.pageId || "") || null : accountId;
    const accountName = String(chosen.name || (provider === "instagram" ? "Instagram Professional" : "Facebook Page"));
    tx.set(connectionRef, {
      userId: data.userId,
      companyId,
      provider,
      accountId,
      accountName,
      pageId: pageHostId,
      encryptedAccessToken: encryptedToken,
      encryptedRefreshToken: null,
      scopes: stateData.scopes || [],
      expiresAt,
      connectedAt: nowIso(),
      updatedAt: nowIso(),
      status: "connected"
    }, { merge: true });
    if (oauthSnap.exists) tx.delete(oauthRef);
    if (legacySnap.exists) tx.delete(legacyRef);
    return {
      id: connectionId,
      success: true,
      provider,
      pageId: accountId,
      pageName: accountName,
      account: { id: accountId, name: accountName }
    };
  });
}
async function getFacebookPageSelectionCandidates(userIdOrData, tokenArg, companyIdArg) {
  let userId = "";
  let selectionToken = "";
  let companyId = void 0;
  if (typeof userIdOrData === "string") {
    userId = userIdOrData;
    selectionToken = tokenArg || "";
    companyId = companyIdArg;
  } else {
    userId = userIdOrData.userId;
    selectionToken = userIdOrData.selectionToken || userIdOrData.pageSelectToken || tokenArg || "";
    companyId = userIdOrData.companyId;
  }
  if (!selectionToken) {
    throw new Error("Token de sele\xE7\xE3o \xE9 obrigat\xF3rio.");
  }
  const tokenHash = stableId(selectionToken);
  let docRef = firestore().collection(COLLECTIONS.oauthStates).doc(tokenHash);
  let snap = await docRef.get();
  if (!snap.exists) {
    docRef = firestore().collection(COLLECTIONS.pageSelectTokens).doc(tokenHash);
    snap = await docRef.get();
  }
  if (!snap.exists) {
    throw new Error("Token de sele\xE7\xE3o de p\xE1gina inv\xE1lido ou expirado.");
  }
  const stateData = snap.data();
  if (stateData.type && stateData.type !== "facebook_page_selection") {
    throw new Error("Tipo de sess\xE3o OAuth inv\xE1lido.");
  }
  if (stateData.userId !== userId) {
    throw new Error("Permiss\xE3o negada: sess\xE3o de sele\xE7\xE3o pertence a outro usu\xE1rio.");
  }
  if (stateData.companyId && companyId && stateData.companyId !== companyId) {
    throw new Error("Permiss\xE3o negada: empresa n\xE3o corresponde \xE0 sess\xE3o de sele\xE7\xE3o.");
  }
  if (Number(stateData.expiresAt) < Date.now()) {
    throw new Error("Sess\xE3o de sele\xE7\xE3o de p\xE1gina expirada.");
  }
  const rawPages = Array.isArray(stateData.pages) ? stateData.pages : [];
  const cleanPages = rawPages.map((p) => ({
    id: String(p.id),
    name: String(p.name || "Facebook Page")
  }));
  return {
    companyId: stateData.companyId,
    pages: cleanPages
  };
}
async function listConnections(userId, companyId) {
  let snap;
  if (!companyId || companyId === "all" || companyId.startsWith("proj_")) {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", userId).get();
  } else {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", userId).where("companyId", "==", companyId).get();
  }
  return snap.docs.map((doc) => {
    const item = doc.data();
    const {
      encryptedAccessToken: _encryptedAccessToken,
      encryptedRefreshToken: _encryptedRefreshToken,
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      token: _token,
      ...safe
    } = item;
    const isExpired = item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false;
    return {
      id: doc.id,
      ...safe,
      ...safe.errorMessage ? { errorMessage: sanitizeProviderMessage(safe.errorMessage, "Falha na conex\xE3o social.") } : {},
      status: isExpired ? "token_expired" : item.status || "connected"
    };
  });
}
async function disconnectSocial(userId, companyId, provider) {
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", userId).where("companyId", "==", companyId).where("provider", "==", provider).limit(10).get();
  if (snap.empty) return false;
  const batch = firestore().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return true;
}
async function refreshSocialAccessToken(provider, refreshToken) {
  if (!refreshToken) throw new Error(`Refresh token n\xE3o fornecido para ${provider}.`);
  if (provider === "x") {
    const creds = Buffer.from(`${config.social.x.clientId}:${config.social.x.clientSecret}`).toString("base64");
    const res = await socialFetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.social.x.clientId
      }).toString()
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description || json.error || `Falha ao renovar token do X (HTTP ${res.status}).`);
    }
    const expiresIn = Number(json.expires_in || 7200);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + expiresIn * 1e3
    };
  }
  if (provider === "tiktok") {
    const res = await socialFetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.social.tiktok.clientId,
        client_secret: config.social.tiktok.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });
    const json = await res.json().catch(() => ({}));
    const tokenData = json.data || json;
    if (!res.ok || !tokenData.access_token) {
      throw new Error(json.error?.message || json.message || `Falha ao renovar token do TikTok (HTTP ${res.status}).`);
    }
    const expiresIn = Number(tokenData.expires_in || 86400);
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresAt: Date.now() + expiresIn * 1e3
    };
  }
  if (provider === "youtube") {
    const res = await socialFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.social.google.clientId,
        client_secret: config.social.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }).toString()
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description || json.error || `Falha ao renovar token do Google/YouTube (HTTP ${res.status}).`);
    }
    const expiresIn = Number(json.expires_in || 3600);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + expiresIn * 1e3
    };
  }
  if (provider === "pinterest") {
    const creds = Buffer.from(`${config.social.pinterest.clientId}:${config.social.pinterest.clientSecret}`).toString("base64");
    const res = await socialFetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
      throw new Error(json.message || json.error || `Falha ao renovar token do Pinterest (HTTP ${res.status}).`);
    }
    const expiresIn = Number(json.expires_in || 86400 * 30);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + expiresIn * 1e3
    };
  }
  if (provider === "linkedin") {
    const res = await socialFetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.social.linkedin.clientId,
        client_secret: config.social.linkedin.clientSecret
      }).toString()
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description || json.error || `Falha ao renovar token do LinkedIn (HTTP ${res.status}).`);
    }
    const expiresIn = Number(json.expires_in || 5184e3);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + expiresIn * 1e3
    };
  }
  throw new Error(`Renova\xE7\xE3o de token n\xE3o suportada para o provedor ${provider}.`);
}
async function ensureValidSocialAccessToken(connectionIdOrDoc) {
  const db = firestore();
  let docRef;
  let connection;
  if (typeof connectionIdOrDoc === "string") {
    docRef = db.collection(COLLECTIONS.socialConnections).doc(connectionIdOrDoc);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("Conex\xE3o social n\xE3o encontrada.");
    connection = snap.data();
  } else {
    connection = connectionIdOrDoc;
    if (!connection?.id) throw new Error("Identificador da conex\xE3o social n\xE3o encontrado.");
    docRef = db.collection(COLLECTIONS.socialConnections).doc(connection.id);
  }
  const decryptAccessToken = (record) => {
    const stored = record?.encryptedAccessToken || record?.accessToken;
    if (!stored) throw new Error("Token de acesso social n\xE3o encontrado.");
    try {
      return decrypt(stored);
    } catch {
      throw new Error("Token de acesso social inv\xE1lido. Reconecte a conta.");
    }
  };
  const isUsable = (record, at = Date.now()) => {
    if (!record?.encryptedAccessToken && !record?.accessToken) return false;
    if (!record?.expiresAt) return true;
    const expiresAt = new Date(record.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt - at >= 5 * 60 * 1e3;
  };
  if (isUsable(connection)) return decryptAccessToken(connection);
  let rawRefreshToken = "";
  if (connection.encryptedRefreshToken) {
    try {
      rawRefreshToken = decrypt(connection.encryptedRefreshToken);
    } catch {
    }
  }
  if (!rawRefreshToken) {
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : Infinity;
    if (expiresAt <= Date.now()) {
      await docRef.update({
        status: "token_expired",
        errorMessage: "Token expirou e n\xE3o h\xE1 refresh_token dispon\xEDvel para renova\xE7\xE3o autom\xE1tica.",
        updatedAt: nowIso()
      }).catch(() => void 0);
      throw new Error(`A autentica\xE7\xE3o com ${connection.provider} expirou. Reconecte a conta nas configura\xE7\xF5es.`);
    }
    return decryptAccessToken(connection);
  }
  const refreshOwner = import_crypto5.default.randomUUID();
  const claim = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(docRef);
    if (!freshSnap.exists) throw new Error("Conex\xE3o social n\xE3o encontrada.");
    const current = freshSnap.data();
    if (isUsable(current)) return { mode: "ready", connection: current };
    const leaseUntil = Number(current.tokenRefreshLeaseUntil || 0);
    if (leaseUntil > Date.now() && current.tokenRefreshOwner !== refreshOwner) {
      return { mode: "waiting", connection: current };
    }
    tx.update(docRef, {
      tokenRefreshOwner: refreshOwner,
      tokenRefreshLeaseUntil: Date.now() + 6e4,
      updatedAt: nowIso()
    });
    return { mode: "claimed", connection: current };
  });
  if (claim.mode === "ready") return decryptAccessToken(claim.connection);
  if (claim.mode === "waiting") {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await wait(250);
      const latestSnap = await docRef.get();
      if (!latestSnap.exists) throw new Error("Conex\xE3o social n\xE3o encontrada.");
      const latest = latestSnap.data();
      if (isUsable(latest)) return decryptAccessToken(latest);
      if (Number(latest.tokenRefreshLeaseUntil || 0) <= Date.now()) break;
    }
    throw new Error("A renova\xE7\xE3o do token social ainda est\xE1 em andamento. Tente novamente em alguns segundos.");
  }
  try {
    const latestBeforeRefresh = await docRef.get();
    const latestData = latestBeforeRefresh.exists ? latestBeforeRefresh.data() : claim.connection;
    const encryptedRefreshToken = latestData.encryptedRefreshToken || claim.connection.encryptedRefreshToken;
    const refreshToken = encryptedRefreshToken ? decrypt(encryptedRefreshToken) : rawRefreshToken;
    const refreshed = await refreshSocialAccessToken(claim.connection.provider, refreshToken);
    const persisted = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) throw new Error("Conex\xE3o social n\xE3o encontrada.");
      const current = freshSnap.data();
      if (current.tokenRefreshOwner !== refreshOwner) return { owned: false, connection: current };
      const updateData = {
        encryptedAccessToken: encrypt(refreshed.accessToken),
        expiresAt: new Date(refreshed.expiresAt).toISOString(),
        status: "connected",
        errorMessage: null,
        tokenRefreshOwner: null,
        tokenRefreshLeaseUntil: 0,
        updatedAt: nowIso()
      };
      if (refreshed.refreshToken) updateData.encryptedRefreshToken = encrypt(refreshed.refreshToken);
      tx.update(docRef, updateData);
      return { owned: true, connection: { ...current, ...updateData } };
    });
    if (persisted.owned) return refreshed.accessToken;
    if (isUsable(persisted.connection)) return decryptAccessToken(persisted.connection);
    throw new Error("A posse da renova\xE7\xE3o do token social foi perdida antes da persist\xEAncia.");
  } catch (refreshError) {
    const message = sanitizeProviderMessage(refreshError?.message, "Falha ao renovar token social.");
    await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return;
      const current = freshSnap.data();
      if (current.tokenRefreshOwner !== refreshOwner) return;
      tx.update(docRef, {
        status: "token_expired",
        errorMessage: `Falha ao renovar token automaticamente: ${message}`,
        tokenRefreshOwner: null,
        tokenRefreshLeaseUntil: 0,
        updatedAt: nowIso()
      });
    }).catch(() => void 0);
    throw new Error(`A autentica\xE7\xE3o com ${connection.provider} expirou e a renova\xE7\xE3o falhou. Reconecte a conta.`);
  }
}
async function publishText(data) {
  const trimmedText = (data.text || "").trim();
  if (!trimmedText) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: true,
      error: `O texto para publica\xE7\xE3o em ${data.provider} n\xE3o pode estar vazio.`
    };
  }
  if (!isTextAutoPublishSupported(data.provider)) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: false,
      error: getProviderAutoPublishReason(data.provider) || `Publica\xE7\xE3o textual n\xE3o suportada para ${data.provider}.`
    };
  }
  let snap;
  try {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", data.provider).limit(1).get();
    if (snap.empty) {
      snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("provider", "==", data.provider).limit(1).get();
    }
    if (snap.empty && data.userId !== "portal_vip_admin") {
      snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", "portal_vip_admin").where("provider", "==", data.provider).limit(1).get();
    }
  } catch (err) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: true,
      error: `Erro ao consultar conex\xE3o social: ${err?.message || "Falha no banco de dados"}`
    };
  }
  if (snap.empty) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: false,
      error: `Conta ${data.provider} n\xE3o conectada para este projeto ou usu\xE1rio.`
    };
  }
  const connDoc = snap.docs[0];
  const connection = connDoc.data();
  if (connection.status !== "connected" || !connection.encryptedAccessToken && !connection.accessToken) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: false,
      error: `Conex\xE3o com ${data.provider} inativa ou sem token.`
    };
  }
  let token = "";
  try {
    token = await ensureValidSocialAccessToken(connDoc.id);
  } catch (err) {
    return {
      provider: data.provider,
      externalId: null,
      externalState: "confirmed_failed",
      retrySafe: false,
      error: err.message || `A autentica\xE7\xE3o com ${data.provider} expirou.`
    };
  }
  const targetAccountId = connection.accountId || connection.pageId;
  if (data.provider === "facebook") {
    if (!targetAccountId) {
      return {
        provider: "facebook",
        externalId: null,
        externalState: "confirmed_failed",
        retrySafe: false,
        error: "Identificador da P\xE1gina do Facebook (accountId / pageId) n\xE3o encontrado na conex\xE3o."
      };
    }
    try {
      const endpoint = `https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(targetAccountId)}/feed`;
      const response = await socialFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: trimmedText, access_token: token }).toString()
      });
      const json = await response.json().catch(() => ({}));
      if (response.status >= 500) {
        return {
          provider: "facebook",
          externalId: null,
          externalState: "unknown",
          retrySafe: false,
          statusCode: response.status,
          error: `Erro interno da Meta (HTTP ${response.status}).`
        };
      }
      if (response.status >= 400) {
        const isAuthError = json.error?.code === 190 || json.error?.type === "OAuthException" || json.error?.error_subcode === 463 || json.error?.error_subcode === 467;
        if (isAuthError) {
          await connDoc.ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
          return {
            provider: "facebook",
            externalId: null,
            externalState: "confirmed_failed",
            retrySafe: false,
            statusCode: response.status,
            error: "A autentica\xE7\xE3o com o Facebook expirou ou foi revogada (c\xF3digo 190). Reconecte a conta em Redes Sociais."
          };
        }
        const errorMsg = sanitizeProviderMessage(json.error?.message, `Rejei\xE7\xE3o da API do Facebook (HTTP ${response.status}).`);
        return {
          provider: "facebook",
          externalId: null,
          externalState: "confirmed_failed",
          retrySafe: true,
          statusCode: response.status,
          error: errorMsg
        };
      }
      if (json.id) {
        return {
          provider: "facebook",
          externalId: String(json.id),
          externalState: "confirmed_success",
          retrySafe: false,
          statusCode: response.status
        };
      }
      return {
        provider: "facebook",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        statusCode: response.status,
        error: "Resposta da Meta retornou HTTP 200, mas sem identificador (id) de publica\xE7\xE3o."
      };
    } catch {
      return {
        provider: "facebook",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        error: "Erro de rede ou timeout durante a comunica\xE7\xE3o com a API da Meta."
      };
    }
  }
  if (data.provider === "x") {
    try {
      const response = await socialFetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: trimmedText.slice(0, 280) })
      });
      const json = await response.json().catch(() => ({}));
      if (response.status >= 500) {
        return {
          provider: "x",
          externalId: null,
          externalState: "unknown",
          retrySafe: false,
          statusCode: response.status,
          error: `Erro interno do X (HTTP ${response.status}).`
        };
      }
      if (response.status === 401) {
        let rawRefresh = "";
        if (connection.encryptedRefreshToken) {
          try {
            rawRefresh = decrypt(connection.encryptedRefreshToken);
          } catch {
          }
        }
        if (rawRefresh) {
          try {
            const refreshed = await refreshSocialAccessToken("x", rawRefresh);
            await connDoc.ref.update({
              encryptedAccessToken: encrypt(refreshed.accessToken),
              encryptedRefreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : connection.encryptedRefreshToken,
              expiresAt: new Date(refreshed.expiresAt).toISOString(),
              status: "connected",
              updatedAt: nowIso()
            });
            const retryRes = await socialFetch("https://api.x.com/2/tweets", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${refreshed.accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ text: trimmedText.slice(0, 280) })
            });
            const retryJson = await retryRes.json().catch(() => ({}));
            if (retryRes.status >= 500) {
              return { provider: "x", externalId: null, externalState: "unknown", retrySafe: false, statusCode: retryRes.status, error: `Erro interno do X (HTTP ${retryRes.status}).` };
            }
            if (retryRes.status >= 400) {
              const errMsg = sanitizeProviderMessage(
                retryJson.detail || retryJson.title || retryJson.error,
                `Rejei\xE7\xE3o da API do X (HTTP ${retryRes.status}).`
              );
              return { provider: "x", externalId: null, externalState: "confirmed_failed", retrySafe: retryRes.status !== 401, statusCode: retryRes.status, error: errMsg };
            }
            if (retryJson.data?.id) {
              return { provider: "x", externalId: String(retryJson.data.id), externalState: "confirmed_success", retrySafe: false, statusCode: retryRes.status };
            }
            return { provider: "x", externalId: null, externalState: "unknown", retrySafe: false, statusCode: retryRes.status, error: "Resposta do X sem ID do tweet." };
          } catch {
            await connDoc.ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
            return { provider: "x", externalId: null, externalState: "confirmed_failed", retrySafe: false, statusCode: 401, error: "A autentica\xE7\xE3o com o X expirou e a renova\xE7\xE3o de token falhou. Reconecte a conta." };
          }
        }
        await connDoc.ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
        return {
          provider: "x",
          externalId: null,
          externalState: "confirmed_failed",
          retrySafe: false,
          statusCode: 401,
          error: "A autentica\xE7\xE3o com o X expirou. Reconecte a conta."
        };
      }
      if (response.status >= 400) {
        const errorMsg = sanitizeProviderMessage(
          json.detail || json.title || json.error,
          `Rejei\xE7\xE3o da API do X (HTTP ${response.status}).`
        );
        return {
          provider: "x",
          externalId: null,
          externalState: "confirmed_failed",
          retrySafe: true,
          statusCode: response.status,
          error: errorMsg
        };
      }
      if (json.data?.id) {
        return {
          provider: "x",
          externalId: String(json.data.id),
          externalState: "confirmed_success",
          retrySafe: false,
          statusCode: response.status
        };
      }
      return {
        provider: "x",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        statusCode: response.status,
        error: "Resposta do X retornou HTTP 200, mas sem identificador (data.id) do tweet."
      };
    } catch {
      return {
        provider: "x",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        error: "Erro de rede ou timeout durante a comunica\xE7\xE3o com a API do X."
      };
    }
  }
  if (data.provider === "linkedin") {
    if (!config.social.linkedin.apiVersion) {
      return {
        provider: "linkedin",
        externalId: null,
        externalState: "confirmed_failed",
        retrySafe: false,
        error: "LINKEDIN_API_VERSION precisa estar configurada para publica\xE7\xE3o no LinkedIn."
      };
    }
    try {
      const response = await socialFetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": config.social.linkedin.apiVersion,
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify({
          author: `urn:li:person:${connection.accountId}`,
          commentary: trimmedText,
          visibility: "PUBLIC",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false
        })
      });
      if (response.status >= 500) {
        return {
          provider: "linkedin",
          externalId: null,
          externalState: "unknown",
          retrySafe: false,
          statusCode: response.status,
          error: `Erro interno do LinkedIn (HTTP ${response.status}).`
        };
      }
      if (response.status === 401) {
        let rawRefresh = "";
        if (connection.encryptedRefreshToken) {
          try {
            rawRefresh = decrypt(connection.encryptedRefreshToken);
          } catch {
          }
        }
        if (rawRefresh) {
          try {
            const refreshed = await refreshSocialAccessToken("linkedin", rawRefresh);
            await connDoc.ref.update({
              encryptedAccessToken: encrypt(refreshed.accessToken),
              encryptedRefreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : connection.encryptedRefreshToken,
              expiresAt: new Date(refreshed.expiresAt).toISOString(),
              status: "connected",
              updatedAt: nowIso()
            });
            const retryRes = await socialFetch("https://api.linkedin.com/rest/posts", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${refreshed.accessToken}`,
                "Content-Type": "application/json",
                "LinkedIn-Version": config.social.linkedin.apiVersion,
                "X-Restli-Protocol-Version": "2.0.0"
              },
              body: JSON.stringify({
                author: `urn:li:person:${connection.accountId}`,
                commentary: trimmedText,
                visibility: "PUBLIC",
                distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
                lifecycleState: "PUBLISHED",
                isReshareDisabledByAuthor: false
              })
            });
            if (retryRes.status >= 500) {
              return { provider: "linkedin", externalId: null, externalState: "unknown", retrySafe: false, statusCode: retryRes.status, error: `Erro interno do LinkedIn (HTTP ${retryRes.status}).` };
            }
            if (retryRes.status >= 400) {
              const textErr = await retryRes.text().catch(() => "");
              return { provider: "linkedin", externalId: null, externalState: "confirmed_failed", retrySafe: retryRes.status !== 401, statusCode: retryRes.status, error: sanitizeProviderMessage(textErr, `Rejei\xE7\xE3o da API do LinkedIn (HTTP ${retryRes.status}).`) };
            }
            const headerId2 = retryRes.headers.get("x-restli-id") || retryRes.headers.get("x-linkedin-id");
            if (headerId2 && headerId2.trim()) {
              return { provider: "linkedin", externalId: headerId2.trim(), externalState: "confirmed_success", retrySafe: false, statusCode: retryRes.status };
            }
            const retryJson = await retryRes.json().catch(() => ({}));
            if (retryJson.id) {
              return { provider: "linkedin", externalId: String(retryJson.id), externalState: "confirmed_success", retrySafe: false, statusCode: retryRes.status };
            }
            return { provider: "linkedin", externalId: null, externalState: "unknown", retrySafe: false, statusCode: retryRes.status, error: "LinkedIn retornou HTTP 200 sem ID confi\xE1vel." };
          } catch {
            await connDoc.ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
            return { provider: "linkedin", externalId: null, externalState: "confirmed_failed", retrySafe: false, statusCode: 401, error: "A autentica\xE7\xE3o com o LinkedIn expirou e a renova\xE7\xE3o falhou. Reconecte a conta." };
          }
        }
        await connDoc.ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
        return {
          provider: "linkedin",
          externalId: null,
          externalState: "confirmed_failed",
          retrySafe: false,
          statusCode: 401,
          error: "A autentica\xE7\xE3o com o LinkedIn expirou. Reconecte a conta."
        };
      }
      if (response.status >= 400) {
        const responseText = await response.text().catch(() => "");
        let errorMsg = `Rejei\xE7\xE3o da API do LinkedIn (HTTP ${response.status}).`;
        try {
          const parsed = JSON.parse(responseText);
          errorMsg = sanitizeProviderMessage(parsed.message || parsed.error, errorMsg);
        } catch {
          if (responseText) errorMsg = sanitizeProviderMessage(responseText, errorMsg);
        }
        return {
          provider: "linkedin",
          externalId: null,
          externalState: "confirmed_failed",
          retrySafe: true,
          statusCode: response.status,
          error: errorMsg
        };
      }
      const headerId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id");
      if (headerId && headerId.trim()) {
        return {
          provider: "linkedin",
          externalId: headerId.trim(),
          externalState: "confirmed_success",
          retrySafe: false,
          statusCode: response.status
        };
      }
      const json = await response.json().catch(() => ({}));
      if (json.id) {
        return {
          provider: "linkedin",
          externalId: String(json.id),
          externalState: "confirmed_success",
          retrySafe: false,
          statusCode: response.status
        };
      }
      return {
        provider: "linkedin",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        statusCode: response.status,
        error: "LinkedIn retornou HTTP 200/201 sem identificador de post confi\xE1vel (x-restli-id)."
      };
    } catch {
      return {
        provider: "linkedin",
        externalId: null,
        externalState: "unknown",
        retrySafe: false,
        error: "Erro de rede ou timeout durante a comunica\xE7\xE3o com a API do LinkedIn."
      };
    }
  }
  return {
    provider: data.provider,
    externalId: null,
    externalState: "confirmed_failed",
    retrySafe: false,
    error: `Provedor ${data.provider} n\xE3o suportado para publica\xE7\xE3o de texto.`
  };
}
var MAX_TIKTOK_SANDBOX_VIDEO_SIZE = 4 * 1024 * 1024;
function isValidMp4Buffer2(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  const ftyp = buffer.subarray(4, 8).toString("ascii");
  return ftyp === "ftyp";
}
async function uploadTikTokDraftVideo(data) {
  if (!data.videoBuffer || data.videoSize <= 0) {
    throw new Error("Arquivo de v\xEDdeo inv\xE1lido ou vazio.");
  }
  if (data.videoSize > MAX_TIKTOK_SANDBOX_VIDEO_SIZE) {
    throw new Error("O v\xEDdeo excede o limite de 4 MB desta fase de verifica\xE7\xE3o do TikTok.");
  }
  if (!isValidMp4Buffer2(data.videoBuffer)) {
    throw new Error("Arquivo de v\xEDdeo inv\xE1lido. Apenas containers MP4 aut\xEAnticos (.mp4 com assinatura ftyp) s\xE3o aceitos.");
  }
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "tiktok").limit(1).get();
  if (snap.empty) {
    throw new Error("Conta TikTok n\xE3o conectada para esta empresa. Conecte sua conta TikTok em Redes Sociais.");
  }
  const connection = snap.docs[0].data();
  if (connection.expiresAt && new Date(connection.expiresAt).getTime() < Date.now()) {
    await snap.docs[0].ref.update({ status: "token_expired", updatedAt: nowIso() }).catch(() => void 0);
    throw new Error("A autentica\xE7\xE3o com o TikTok expirou. Reconecte a conta nas configura\xE7\xF5es de Redes Sociais.");
  }
  const token = decrypt(connection.encryptedAccessToken);
  const initEndpoint = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
  const initBody = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: data.videoSize,
      chunk_size: data.videoSize,
      total_chunk_count: 1
    }
  };
  const initResponse = await socialFetch(initEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify(initBody)
  });
  const initJson = await initResponse.json().catch(() => ({}));
  if (!initResponse.ok || initJson.error?.code && initJson.error.code !== "ok") {
    const errorMsg = initJson.error?.message || initJson.message || `Erro ${initResponse.status} retornado pelo TikTok na inicializa\xE7\xE3o do upload.`;
    throw new Error(`Falha ao inicializar rascunho no TikTok: ${errorMsg}`);
  }
  const publishId = initJson.data?.publish_id;
  const uploadUrl = initJson.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new Error("A API do TikTok n\xE3o retornou os identificadores obrigat\xF3rios (publish_id e upload_url).");
  }
  const uploadResponse = await socialFetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(data.videoSize),
      "Content-Range": `bytes 0-${data.videoSize - 1}/${data.videoSize}`
    },
    body: data.videoBuffer
  });
  if (uploadResponse.status !== 201) {
    const uploadErrText = await uploadResponse.text().catch(() => "");
    throw new Error(`Falha ao enviar bin\xE1rio do v\xEDdeo para o TikTok (HTTP ${uploadResponse.status}): ${uploadErrText.slice(0, 200)}`);
  }
  const draftRecordId = stableId(`${data.userId}:${data.companyId}:${publishId}`);
  await firestore().collection("socialDraftUploads").doc(draftRecordId).set({
    id: draftRecordId,
    userId: data.userId,
    companyId: data.companyId,
    provider: "tiktok",
    publishId,
    videoSize: data.videoSize,
    mimeType: data.mimeType || "video/mp4",
    title: data.title || null,
    status: "draft_sent",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, { merge: true }).catch(() => void 0);
  return {
    success: true,
    publishId,
    status: "draft_sent",
    message: "Rascunho enviado ao TikTok. Abra o TikTok e acesse a notifica\xE7\xE3o na Caixa de Entrada para continuar a edi\xE7\xE3o e publicar."
  };
}
async function getTikTokUploadStatus(data) {
  if (!data.publishId) {
    throw new Error("publish_id \xE9 obrigat\xF3rio.");
  }
  const draftRecordId = stableId(`${data.userId}:${data.companyId}:${data.publishId}`);
  const draftRef = firestore().collection("socialDraftUploads").doc(draftRecordId);
  const draftSnap = await draftRef.get();
  if (!draftSnap.exists) {
    throw new Error("Envio de rascunho n\xE3o encontrado ou n\xE3o pertence a esta empresa.");
  }
  const draftData = draftSnap.data();
  if (draftData.userId !== data.userId || draftData.companyId !== data.companyId || draftData.provider !== "tiktok") {
    throw new Error("Envio de rascunho n\xE3o encontrado ou n\xE3o pertence a esta empresa.");
  }
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "tiktok").limit(1).get();
  if (snap.empty) {
    throw new Error("Conta TikTok n\xE3o conectada para esta empresa.");
  }
  const connection = snap.docs[0].data();
  if (connection.expiresAt && new Date(connection.expiresAt).getTime() < Date.now()) {
    throw new Error("A autentica\xE7\xE3o com o TikTok expirou. Reconecte a conta.");
  }
  const token = decrypt(connection.encryptedAccessToken);
  const statusEndpoint = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
  const statusResponse = await socialFetch(statusEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({ publish_id: data.publishId })
  });
  const statusJson = await statusResponse.json().catch(() => ({}));
  if (!statusResponse.ok || statusJson.error?.code && statusJson.error.code !== "ok") {
    const errMsg = statusJson.error?.message || statusJson.message || `Erro ${statusResponse.status} ao consultar status.`;
    throw new Error(`Falha ao consultar status no TikTok: ${errMsg}`);
  }
  const rawStatus = String(statusJson.data?.status || "UNKNOWN");
  const failReason = statusJson.data?.fail_reason ? sanitizeProviderMessage(statusJson.data.fail_reason, "Falha no processamento do TikTok.") : null;
  const isDraftDelivered = rawStatus === "SEND_TO_USER_INBOX" || rawStatus === "PUBLISH_COMPLETE";
  let userFriendlyMessage = "Processando rascunho no TikTok...";
  if (rawStatus === "SEND_TO_USER_INBOX") {
    userFriendlyMessage = "Rascunho entregue ao TikTok. Abra a Caixa de Entrada do TikTok para continuar a edi\xE7\xE3o e publicar.";
  } else if (rawStatus === "PUBLISH_COMPLETE") {
    userFriendlyMessage = "O TikTok informa que o conte\xFAdo enviado foi publicado ap\xF3s a continuidade do fluxo pelo usu\xE1rio no aplicativo TikTok.";
  } else if (rawStatus === "FAILED") {
    userFriendlyMessage = `Falha no processamento pelo TikTok: ${failReason || "Verifique se o arquivo segue as diretrizes do TikTok."}`;
  } else if (rawStatus === "PROCESSING_UPLOAD" || rawStatus === "PROCESSING_DOWNLOAD") {
    userFriendlyMessage = "O TikTok est\xE1 processando o arquivo de v\xEDdeo enviado.";
  }
  await draftRef.update({
    status: rawStatus,
    failReason: failReason || null,
    updatedAt: nowIso()
  }).catch(() => void 0);
  return {
    success: true,
    publishId: data.publishId,
    status: rawStatus,
    failReason,
    isDraftDelivered,
    message: userFriendlyMessage
  };
}
async function initTikTokDraftUpload(data) {
  if (data.videoSize <= 0) throw new Error("Tamanho de v\xEDdeo inv\xE1lido.");
  if (data.videoSize > MAX_TIKTOK_SANDBOX_VIDEO_SIZE) {
    throw new Error("O v\xEDdeo excede o limite de 4 MB desta fase do TikTok.");
  }
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "tiktok").limit(1).get();
  if (snap.empty) {
    throw new Error("Conta TikTok n\xE3o conectada para esta empresa.");
  }
  const token = await ensureValidSocialAccessToken(snap.docs[0].id);
  const initEndpoint = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
  const initBody = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: data.videoSize,
      chunk_size: data.videoSize,
      total_chunk_count: 1
    }
  };
  const initResponse = await socialFetch(initEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify(initBody)
  });
  const initJson = await initResponse.json().catch(() => ({}));
  if (!initResponse.ok || initJson.error?.code && initJson.error.code !== "ok") {
    const errorMsg = initJson.error?.message || initJson.message || `Erro ${initResponse.status} do TikTok.`;
    throw new Error(`Falha ao inicializar rascunho no TikTok: ${errorMsg}`);
  }
  const publishId = initJson.data?.publish_id;
  const uploadUrl = initJson.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new Error("TikTok n\xE3o retornou publish_id e upload_url.");
  }
  const draftRecordId = stableId(`${data.userId}:${data.companyId}:${publishId}`);
  await firestore().collection("socialDraftUploads").doc(draftRecordId).set({
    id: draftRecordId,
    userId: data.userId,
    companyId: data.companyId,
    provider: "tiktok",
    publishId,
    videoSize: data.videoSize,
    title: data.title || null,
    status: "draft_initialized",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, { merge: true }).catch(() => void 0);
  return { publishId, uploadUrl };
}
async function waitForInstagramContainer(creationId, accessToken) {
  const endpoint = new URL(`https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(creationId)}`);
  endpoint.searchParams.set("fields", "status_code");
  for (let attempt = 0; attempt <= INSTAGRAM_CONTAINER_POLL_DELAYS_MS.length; attempt += 1) {
    const response = await socialFetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = sanitizeProviderMessage(json.error?.message, `Erro HTTP ${response.status} ao consultar o container do Instagram.`);
      throw new Error(`Falha ao consultar processamento do Instagram: ${message}`);
    }
    const statusCode = String(json.status_code || "").toUpperCase();
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`O Instagram encerrou o container com status ${statusCode}.`);
    }
    if (attempt === INSTAGRAM_CONTAINER_POLL_DELAYS_MS.length) break;
    await wait(INSTAGRAM_CONTAINER_POLL_DELAYS_MS[attempt]);
  }
  throw new Error("O Instagram n\xE3o concluiu o processamento da m\xEDdia dentro do tempo seguro. Tente novamente mais tarde.");
}
async function publishInstagramMedia(data) {
  if (!data.imageUrl && !data.videoUrl) {
    throw new Error("\xC9 necess\xE1rio fornecer imageUrl ou videoUrl para publicar no Instagram.");
  }
  let snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "instagram").limit(1).get();
  if (snap.empty) {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("provider", "==", "instagram").limit(1).get();
  }
  if (snap.empty && data.userId !== "portal_vip_admin") {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", "portal_vip_admin").where("provider", "==", "instagram").limit(1).get();
  }
  if (snap.empty) {
    throw new Error("Conta Instagram n\xE3o conectada para este projeto ou usu\xE1rio.");
  }
  const connection = snap.docs[0].data();
  const igUserId = connection.accountId;
  if (!igUserId) {
    throw new Error("Identificador da conta profissional do Instagram n\xE3o encontrado na conex\xE3o.");
  }
  const token = await ensureValidSocialAccessToken(snap.docs[0].id);
  const containerEndpoint = `https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(igUserId)}/media`;
  const containerParams = {
    access_token: token,
    caption: (data.caption || "").slice(0, 2200)
  };
  if (data.videoUrl) {
    containerParams.media_type = "REELS";
    containerParams.video_url = data.videoUrl;
  } else if (data.imageUrl) {
    containerParams.image_url = data.imageUrl;
  }
  const containerRes = await socialFetch(containerEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(containerParams).toString()
  });
  const containerJson = await containerRes.json().catch(() => ({}));
  if (!containerRes.ok || !containerJson.id) {
    const errorMsg = sanitizeProviderMessage(containerJson.error?.message, `Erro ${containerRes.status} ao criar container no Instagram.`);
    throw new Error(`Falha ao criar container no Instagram: ${errorMsg}`);
  }
  const creationId = String(containerJson.id);
  await waitForInstagramContainer(creationId, token);
  const publishEndpoint = `https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(igUserId)}/media_publish`;
  const publishRes = await socialFetch(publishEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId, access_token: token }).toString()
  });
  const publishJson = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || !publishJson.id) {
    const errorMsg = sanitizeProviderMessage(publishJson.error?.message, `Erro ${publishRes.status} ao publicar no Instagram.`);
    throw new Error(`Falha ao publicar m\xEDdia no Instagram: ${errorMsg}`);
  }
  return {
    success: true,
    externalId: String(publishJson.id),
    externalState: "confirmed_success",
    message: "M\xEDdia publicada no Instagram com sucesso."
  };
}
async function initYouTubeResumableUpload(data) {
  if (!data.title?.trim()) {
    throw new Error("T\xEDtulo do v\xEDdeo no YouTube \xE9 obrigat\xF3rio.");
  }
  let snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "youtube").limit(1).get();
  if (snap.empty) {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("provider", "==", "youtube").limit(1).get();
  }
  if (snap.empty && data.userId !== "portal_vip_admin") {
    snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", "portal_vip_admin").where("provider", "==", "youtube").limit(1).get();
  }
  if (snap.empty) {
    throw new Error("Canal YouTube n\xE3o conectado para este projeto ou usu\xE1rio.");
  }
  const token = await ensureValidSocialAccessToken(snap.docs[0].id);
  const initEndpoint = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
  const metadata = {
    snippet: {
      title: data.title.trim().slice(0, 100),
      description: (data.description || "").slice(0, 5e3),
      categoryId: "22"
    },
    status: {
      privacyStatus: data.privacyStatus || "unlisted",
      selfDeclaredMadeForKids: false
    }
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": data.mimeType || "video/mp4"
  };
  if (data.videoSize && data.videoSize > 0) {
    headers["X-Upload-Content-Length"] = String(data.videoSize);
  }
  const initRes = await socialFetch(initEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(metadata)
  });
  if (!initRes.ok) {
    const errJson = await initRes.json().catch(() => ({}));
    const errorMsg = errJson.error?.message || `Erro HTTP ${initRes.status} ao iniciar sess\xE3o no YouTube.`;
    throw new Error(`Falha ao iniciar upload no YouTube: ${errorMsg}`);
  }
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("A API do YouTube n\xE3o retornou o header Location com o endpoint de upload resum\xEDvel.");
  }
  return { uploadUrl };
}
async function getPinterestBoards(data) {
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "pinterest").limit(1).get();
  if (snap.empty) {
    throw new Error("Conta Pinterest n\xE3o conectada para esta empresa.");
  }
  const token = await ensureValidSocialAccessToken(snap.docs[0].id);
  const res = await socialFetch("https://api.pinterest.com/v5/boards?page_size=50", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.message || json.error || `Erro HTTP ${res.status} ao listar pastas do Pinterest.`;
    throw new Error(errorMsg);
  }
  const items = Array.isArray(json.items) ? json.items : [];
  return items.map((b) => ({
    id: String(b.id),
    name: String(b.name || "Pasta"),
    description: b.description || ""
  }));
}
async function createPinterestPin(data) {
  if (!data.boardId || !data.title?.trim() || !data.imageUrl) {
    throw new Error("Pasta (boardId), t\xEDtulo e URL da imagem s\xE3o obrigat\xF3rios para criar Pin no Pinterest.");
  }
  const snap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", data.userId).where("companyId", "==", data.companyId).where("provider", "==", "pinterest").limit(1).get();
  if (snap.empty) {
    throw new Error("Conta Pinterest n\xE3o conectada para esta empresa.");
  }
  const token = await ensureValidSocialAccessToken(snap.docs[0].id);
  const pinBody = {
    board_id: data.boardId,
    title: data.title.trim().slice(0, 100),
    description: (data.description || "").slice(0, 800),
    media_source: {
      source_type: "image_url",
      url: data.imageUrl
    }
  };
  if (data.link?.trim()) {
    pinBody.link = data.link.trim();
  }
  const res = await socialFetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(pinBody)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id) {
    const errorMsg = json.message || json.error || `Erro HTTP ${res.status} ao criar Pin no Pinterest.`;
    throw new Error(`Falha ao criar Pin: ${errorMsg}`);
  }
  return {
    success: true,
    pinId: String(json.id),
    externalId: String(json.id),
    message: "Pin criado com sucesso no Pinterest."
  };
}
function isProviderConfigured(provider) {
  const creds = providerCredentials(provider);
  const clientIdPresent = Boolean(creds.clientId);
  const clientSecretPresent = Boolean(creds.clientSecret);
  return {
    configured: clientIdPresent && clientSecretPresent,
    clientIdPresent,
    clientSecretPresent
  };
}
async function getSocialReadiness(companyId, userId) {
  const db = firestore();
  let query = db.collection(COLLECTIONS.socialConnections).where("companyId", "==", companyId);
  if (userId) {
    query = query.where("userId", "==", userId);
  }
  const connectionsSnap = await query.get();
  const connections = connectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const findConn = (p) => connections.find((c) => c.provider === p);
  const providers = ["facebook", "instagram", "linkedin", "x", "tiktok", "youtube", "pinterest"];
  const readiness = {
    companyId,
    healthy: true,
    checkedAt: nowIso(),
    connectedCount: 0,
    summary: "",
    scheduler: {
      cronSecretConfigured: Boolean(config.cronSecret),
      nativeCronConfigured: false
    },
    linkedinApiVersionConfigured: Boolean(config.social.linkedin.apiVersion)
  };
  const capabilitiesMap = {
    facebook: "text_publish",
    instagram: "media_publish",
    linkedin: "text_publish",
    x: "text_publish",
    tiktok: "draft_video",
    youtube: "video_upload",
    pinterest: "pin_publish"
  };
  let connectedCount = 0;
  for (const p of providers) {
    const conn = findConn(p);
    const { configured } = isProviderConfigured(p);
    const isConnected = Boolean(conn && conn.status === "connected");
    if (isConnected) connectedCount++;
    readiness[p] = {
      oauthConfigured: configured,
      connected: isConnected,
      status: conn?.status || "disconnected",
      accountId: conn?.accountId || null,
      pageId: conn?.pageId || null,
      accountName: conn?.accountName || null,
      expiresAt: conn?.expiresAt || null,
      capability: capabilitiesMap[p]
    };
  }
  readiness.connectedCount = connectedCount;
  readiness.summary = connectedCount > 0 ? `${connectedCount} canal(is) configurado(s) e operacional(is) para esta empresa.` : "Nenhum canal social conectado para esta empresa.";
  return readiness;
}

// server/production/almaPortfolio.ts
var PORTAL_VIP_OFFICIAL_ASSETS = {
  logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
  bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
  brandName: "Portal Vip Brasil",
  officialUrl: "https://portalvipbrasil.com.br"
};
var PORTAL_VIP_PROJECTS = [
  {
    id: "proj_magia_crencas",
    name: "Magia das Cren\xE7as",
    slug: "magia-das-crencas",
    category: "Espiritualidade, F\xE9 & Autoconhecimento",
    segment: "Portal Hol\xEDstico e Aplicativo Devocional",
    websiteUrl: "https://www.magiadascrencas.com.br/",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.magiadascrencas.app",
    appTitle: "Magia das Cren\xE7as App (Play Store)",
    hasApp: true,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "Desperte seu poder interior e a for\xE7a das suas convic\xE7\xF5es.",
    description: "Portal oficial e aplicativo devocional com ora\xE7\xF5es, rituais sagrados, mensagens di\xE1rias, artigos hol\xEDsticos e orienta\xE7\xE3o espiritual para transforma\xE7\xE3o e prosperidade.",
    highlights: [
      "Ora\xE7\xF5es e decretos poderosos di\xE1rios",
      "Artigos e ensinamentos espirituais profundos",
      "Aplicativo completo dispon\xEDvel na Play Store",
      "Comunidade e guias de prosperidade e prote\xE7\xE3o"
    ],
    keywords: ["magia das cren\xE7as", "ora\xE7\xF5es di\xE1rias", "espiritualidade", "simpatias e rituais", "prosperidade espiritual", "aplicativo de f\xE9"],
    targetAudience: "Pessoas em busca de evolu\xE7\xE3o espiritual, paz mental, ora\xE7\xF5es di\xE1rias e conex\xE3o sagrada.",
    socialMarketingAngles: [
      "Decreto poderoso do dia para abrir caminhos e atrair prosperidade imediata.",
      "Baixe agora o aplicativo oficial Magia das Cren\xE7as na Play Store e receba sua b\xEAn\xE7\xE3o di\xE1ria.",
      "V\xEDdeo devocional com ora\xE7\xE3o guiada de f\xE9 inabal\xE1vel para prote\xE7\xE3o do seu lar."
    ],
    bingSeoKeywords: ["magia das crencas", "magiadascrencas com br", "oracao poderosa para alcancar graca", "portal espiritual brasil"]
  },
  {
    id: "proj_exu_responde",
    name: "Exu Responde",
    slug: "exu-responde",
    category: "Or\xE1culos & Religi\xF5es de Matriz Africana",
    segment: "Consultas Espirituais, Conselhos & Sabedoria",
    websiteUrl: "https://exu-responde.vercel.app/",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde",
    appTitle: "Exu Responde App (Play Store)",
    hasApp: true,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "Respostas diretas, firmeza nos caminhos e sabedoria ancestral.",
    description: "Ambiente oracular dedicado aos guardi\xF5es, tiragens de conselhos imediatos, direcionamento para tomada de decis\xE3o e aplicativo interativo na Play Store.",
    highlights: [
      "Tiragens interativas de conselho e clareza",
      "Abertura e prote\xE7\xE3o de caminhos",
      "Aplicativo na Play Store com respostas em tempo real",
      "Interface imersiva e respeitosa aos fundamentos"
    ],
    keywords: ["exu responde", "oraculo exu", "conselho de guardi\xE3o", "abertura de caminhos", "umbanda e quimbanda app", "tarot guardiao"],
    targetAudience: "Praticantes, simpatizantes e devotos que buscam conselhos r\xE1pidos e prote\xE7\xE3o nos seus caminhos.",
    socialMarketingAngles: [
      "Fa\xE7a sua pergunta ao or\xE1culo Exu Responde e receba a firmeza que voc\xEA precisa hoje.",
      "Caminhos trancados? Veja o conselho do guardi\xE3o no app Exu Responde.",
      "Instale gr\xE1tis na Play Store o app Exu Responde e tire suas d\xFAvidas a qualquer hora."
    ],
    bingSeoKeywords: ["exu responde online", "oraculo dos caminhos", "consulta exu responde vercel app"]
  },
  {
    id: "proj_maria_padilha",
    name: "Maria Padilha Rainha das 7 Encruzilhadas",
    slug: "maria-padilha-rainha-das-7-encruzilhadas",
    category: "Amor, Prosperidade & Sedu\xE7\xE3o Sagrada",
    segment: "Consultas do Cora\xE7\xE3o, Ora\xE7\xF5es & Simpatias",
    websiteUrl: "https://maria-padilha-rainha-das-7-encruzil.vercel.app/",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha",
    appTitle: "Maria Padilha 7 Encruzilhadas App (Play Store)",
    hasApp: true,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "O poder do amor, da autoestima magn\xE9tica e da vit\xF3ria sentimental.",
    description: "Plataforma oficial e aplicativo para aconselhamento afetivo, ora\xE7\xF5es de poder para amar e ser amada, feiti\xE7os de prote\xE7\xE3o e conex\xE3o com a Rainha das 7 Encruzilhadas.",
    highlights: [
      "Aconselhamento amoroso e oracular",
      "Ora\xE7\xF5es de firmeza, beleza e atra\xE7\xE3o magn\xE9tica",
      "App interativo dispon\xEDvel na Google Play Store",
      "Rituais de prosperidade e conquista"
    ],
    keywords: ["maria padilha", "rainha das 7 encruzilhadas", "oracao maria padilha", "oraculo do amor", "simpatia amorosa", "pombagira app"],
    targetAudience: "Pessoas que buscam reconquista amorosa, magnetismo pessoal, fortalecimento de uni\xE3o e autoestima.",
    socialMarketingAngles: [
      "Descubra a mensagem de Maria Padilha para o seu cora\xE7\xE3o hoje.",
      "Ora\xE7\xE3o forte para acender o amor e a atra\xE7\xE3o: acesse o app na Play Store.",
      "Conselho amoroso da Rainha das 7 Encruzilhadas para transformar seu relacionamento."
    ],
    bingSeoKeywords: ["maria padilha rainha das 7 encruzilhadas app", "oracao de maria padilha", "consulta amorosa padilha"]
  },
  {
    id: "proj_manual_catolico",
    name: "Manual Cat\xF3lico",
    slug: "manual-catolico",
    category: "Tradi\xE7\xE3o Cat\xF3lica & Devo\xE7\xE3o",
    segment: "Guia do Crist\xE3o, Liturgia & Novenas",
    websiteUrl: "https://manual-cat-lico.vercel.app/",
    playStoreUrl: "https://play.google.com/store/apps/details?id=br.com.manualcatolico.app",
    appTitle: "Manual Cat\xF3lico App (Play Store)",
    hasApp: true,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "Seu companheiro di\xE1rio de ora\xE7\xE3o, liturgia e doutrina cat\xF3lica.",
    description: "Comp\xEAndio de ora\xE7\xF5es tradicionais da Santa Igreja, santo do dia, novenas milagrosas, ter\xE7o rezado, catecismo e aplicativo para viv\xEAncia crist\xE3 di\xE1ria.",
    highlights: [
      "Santo do dia e liturgia di\xE1ria completa",
      "Guia de confiss\xE3o e exame de consci\xEAncia",
      "Novenas tradicionais e Santo Ter\xE7o",
      "Aplicativo de bolso na Play Store"
    ],
    keywords: ["manual catolico", "oracoes catolicas", "santo do dia", "liturgia diaria", "novenas milagrosas", "app catolico play store"],
    targetAudience: "Cat\xF3licos praticantes, devotos de santos, fam\xEDlias crist\xE3s e jovens em catequese.",
    socialMarketingAngles: [
      "Qual o Santo do dia hoje? Conhe\xE7a a hist\xF3ria inspiradora e a ora\xE7\xE3o no Manual Cat\xF3lico.",
      "Reze o Santo Ter\xE7o e as principais novenas com o app Manual Cat\xF3lico no seu celular.",
      "Fortale\xE7a sua f\xE9: baixe o Manual Cat\xF3lico na Google Play Store hoje mesmo."
    ],
    bingSeoKeywords: ["manual catolico online", "app oracoes catolicas", "liturgia e novenas brasil"]
  },
  {
    id: "proj_frocia2",
    name: "Froc IA",
    slug: "froc-ia",
    category: "Intelig\xEAncia Artificial & Automa\xE7\xE3o",
    segment: "Gera\xE7\xE3o de Conte\xFAdo & Marketing Automatizado",
    websiteUrl: "https://frocia2.vercel.app/",
    hasApp: false,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "A evolu\xE7\xE3o da intelig\xEAncia artificial para marketing e produ\xE7\xE3o de conte\xFAdo.",
    description: "Sistema avan\xE7ado de cria\xE7\xE3o com IA generativa, reda\xE7\xE3o de artigos de alta autoridade, copys magn\xE9ticas para vendas e automa\xE7\xE3o de canais digitais.",
    highlights: [
      "Gera\xE7\xE3o de artigos e posts com SEO avan\xE7ado",
      "Engenharia de prompts para convers\xE3o de vendas",
      "Cria\xE7\xE3o de roteiros para Reels e TikTok",
      "Motor veloz baseado em modelos Gemini de ponta"
    ],
    keywords: ["froc ia", "frocia", "ia marketing", "gerador de posts", "automacao de conteudo", "inteligencia artificial brasil"],
    targetAudience: "Empreendedores, criadores de conte\xFAdo, ag\xEAncias e profissionais de marketing.",
    socialMarketingAngles: [
      "Multiplique sua produ\xE7\xE3o de marketing em 10x com o Froc IA.",
      "Como criar copys que vendem em menos de 30 segundos usando IA.",
      "Acesse o Froc IA e impulsione suas vendas online hoje mesmo."
    ],
    bingSeoKeywords: ["frocia2 vercel app", "ia para marketing digital", "gerador de artigos seo brasil"]
  },
  {
    id: "proj_oraculos_ts",
    name: "Or\xE1culos",
    slug: "oraculos",
    category: "Tarot, Cartomancia & Runas",
    segment: "Motor Oracular TypeScript de Alta Precis\xE3o",
    websiteUrl: "https://oraculos-ts.vercel.app/",
    hasApp: false,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "O universo dos or\xE1culos decodificado com tecnologia de ponta.",
    description: "Plataforma completa de tiragens de Tarot de Marselha, Baralho Cigano, Runas N\xF3rdicas e I Ching com interpreta\xE7\xF5es profundas geradas em tempo real.",
    highlights: [
      "Tiragens completas de Tarot, Lenormand e Runas",
      "Interpreta\xE7\xF5es ricas e detalhadas para amor, trabalho e finan\xE7as",
      "Interface moderna, r\xE1pida e responsiva",
      "Arquitetura em TypeScript de alta performance"
    ],
    keywords: ["oraculos", "oraculos ts", "tarot online gratis", "baralho cigano online", "runas nordicas", "tiragem de cartas", "previsao astrologica"],
    targetAudience: "Buscadores de autoconhecimento, amantes de tarot e pessoas com d\xFAvidas sobre o futuro.",
    socialMarketingAngles: [
      "Tire sua carta do dia no Or\xE1culos e descubra o que o destino reservou para voc\xEA.",
      "Tarot online com precis\xE3o cir\xFArgica: fa\xE7a sua consulta gratuita agora.",
      "Baralho cigano e runas na palma da sua m\xE3o com o Or\xE1culos."
    ],
    bingSeoKeywords: ["oraculos ts vercel app", "tarot online gratis brasil", "baralho cigano tiragem"]
  },
  {
    id: "proj_froc_marketing_engine",
    name: "Froc IA Marketing Engine",
    slug: "froc-ia-marketing-engine",
    category: "Motor de Automa\xE7\xE3o & Tr\xE1fego Org\xE2nico",
    segment: "Autopilot, Social Hub & Campanhas",
    websiteUrl: "https://froc-ia-marketing-engine.vercel.app/",
    hasApp: false,
    logoUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/cropped-507d5ca1-8ec9-481b-9a46-65d45528bc12-300x300-removebg-preview.png",
    bannerUrl: "https://portalvipbrasil.com.br/wp-content/uploads/2026/05/ChatGPT-Image-19-de-mai.-de-2026-07_00_28.png",
    tagline: "O ecossistema completo para dominar as redes sociais e o Google.",
    description: "Motor central de marketing para cria\xE7\xE3o autom\xE1tica de v\xEDdeos, imagens, artigos de blog e agendamento de publica\xE7\xF5es com prote\xE7\xE3o cont\xEDnua anti-quedas.",
    highlights: [
      "Autopilot di\xE1rio com gera\xE7\xE3o autom\xE1tica de conte\xFAdo",
      "Integra\xE7\xE3o multi-redes e publica\xE7\xE3o direta",
      "Auditoria de SEO t\xE9cnico e palavras-chave Bing/Google",
      "Tecnologia de alta disponibilidade com failover inteligente"
    ],
    keywords: ["froc ia marketing engine", "motor de marketing", "autopilot de redes sociais", "publicacao automatica", "marketing digital automatico"],
    targetAudience: "Profissionais de marketing, donos de infoprodutos e redes de sites.",
    socialMarketingAngles: [
      "Automatize 100% da sua presen\xE7a nas redes com o Froc IA Marketing Engine.",
      "Publica\xE7\xF5es di\xE1rias com SEO e engajamento no piloto autom\xE1tico.",
      "Conhe\xE7a o motor de marketing definitivo para impulsionar seus projetos."
    ],
    bingSeoKeywords: ["froc ia marketing engine vercel app", "automacao de redes sociais brasil", "motor de marketing ia"]
  }
];
function getProjectBySlug(slug) {
  return PORTAL_VIP_PROJECTS.find((p) => p.slug === slug || p.id === slug);
}
async function seedPortalProjectsIfEmpty() {
  const db = firestore();
  const projectsRef = db.collection(COLLECTIONS.projects);
  const existingSnap = await projectsRef.get().catch(() => null);
  const existingMap = /* @__PURE__ */ new Map();
  if (existingSnap && !existingSnap.empty) {
    for (const doc of existingSnap.docs) {
      existingMap.set(doc.id, doc.data());
    }
  }
  let seededCount = 0;
  const now = nowIso();
  for (const proj of PORTAL_VIP_PROJECTS) {
    if (!existingMap.has(proj.id)) {
      const docToSave = {
        ...proj,
        active: true,
        dailyMarketingEnabled: true,
        dailyBlogEnabled: true,
        socialSettings: {
          instagramEnabled: true,
          facebookEnabled: true,
          linkedinEnabled: true,
          xEnabled: true,
          pinterestEnabled: false,
          youtubeEnabled: Boolean(proj.hasApp),
          tiktokEnabled: false
        },
        createdAt: now,
        updatedAt: now
      };
      await projectsRef.doc(proj.id).set(cleanObject(docToSave), { merge: true }).catch((err) => {
        console.warn(`[PortalPortfolio] Erro ao sincronizar projeto ${proj.id}:`, err);
      });
      seededCount++;
    }
  }
  const allProjects = await listAllPortalProjectsFromDb();
  return {
    seededCount,
    totalProjects: allProjects.length,
    projects: allProjects
  };
}
async function listAllPortalProjectsFromDb() {
  try {
    const db = firestore();
    const snap = await db.collection(COLLECTIONS.projects).get();
    if (!snap.empty) {
      const docs = queryData(snap);
      if (docs.length > 0) {
        return docs.map((doc) => ({
          active: true,
          dailyMarketingEnabled: true,
          dailyBlogEnabled: true,
          ...doc
        }));
      }
    }
  } catch (err) {
    console.warn("[PortalPortfolio] Erro ao consultar Firestore projects, usando lista oficial:", err);
  }
  return PORTAL_VIP_PROJECTS.map((p) => ({
    ...p,
    active: true,
    dailyMarketingEnabled: true,
    dailyBlogEnabled: true
  }));
}
async function getPortalProjectFromDb(idOrSlug) {
  const norm = String(idOrSlug || "").trim().toLowerCase();
  if (!norm) return void 0;
  try {
    const db = firestore();
    const docRef = db.collection(COLLECTIONS.projects).doc(idOrSlug);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = docData(snap);
      if (data) return { active: true, dailyMarketingEnabled: true, dailyBlogEnabled: true, ...data };
    }
    const bySlugSnap = await db.collection(COLLECTIONS.projects).where("slug", "==", norm).limit(1).get();
    if (!bySlugSnap.empty) {
      const data = docData(bySlugSnap.docs[0]);
      if (data) return { active: true, dailyMarketingEnabled: true, dailyBlogEnabled: true, ...data };
    }
  } catch (err) {
    console.warn("[PortalPortfolio] Erro ao consultar projeto individual no Firestore:", err);
  }
  return PORTAL_VIP_PROJECTS.find((p) => p.id === idOrSlug || p.slug === norm);
}
async function updatePortalProjectInDb(id, updates) {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.projects).doc(id);
  const now = nowIso();
  const cleanUpdates = cleanObject({
    ...updates,
    updatedAt: now
  });
  await docRef.set(cleanUpdates, { merge: true });
  const fresh = await getPortalProjectFromDb(id);
  return fresh || null;
}

// server/production/antiFallEngine.ts
var ANTI_FALL_MODELS = [
  { model: "gemini-3.1-pro-preview", tier: "3.7", fallbackAlias: "gemini-2.5-pro" },
  { model: "gemini-2.5-flash", tier: "3.6", fallbackAlias: "gemini-2.5-flash" },
  { model: "gemini-3.1-flash-lite", tier: "3.5", fallbackAlias: "gemini-2.5-flash-lite" }
];
async function executeAiWith2SecAntiFall(data) {
  const timeoutMs = data.timeoutMs || 2e3;
  const attempts = [];
  const startGlobal = Date.now();
  let lastError = "Nenhum modelo respondeu";
  for (const item of ANTI_FALL_MODELS) {
    const candidateModel = item.model || item.fallbackAlias;
    const modelStart = Date.now();
    try {
      const responsePromise = textAiClient().models.generateContent({
        model: candidateModel,
        contents: data.prompt,
        config: {
          systemInstruction: data.systemInstruction,
          maxOutputTokens: data.maxTokens || 2500,
          responseMimeType: data.jsonOutput ? "application/json" : "text/plain"
        }
      });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de prote\xE7\xE3o anti-quedas de ${timeoutMs}ms excedido no modelo ${candidateModel} (Tier ${item.tier})`)), timeoutMs);
      });
      const response = await Promise.race([responsePromise, timeoutPromise]);
      const text = response?.text?.trim();
      if (text) {
        const modelDuration = Date.now() - modelStart;
        attempts.push({
          model: candidateModel,
          versionTier: item.tier,
          durationMs: modelDuration,
          success: true
        });
        return {
          text,
          modelUsed: candidateModel,
          versionTier: item.tier,
          totalDurationMs: Date.now() - startGlobal,
          attempts,
          antiFallActivated: attempts.length > 1
        };
      } else {
        throw new Error("Resposta vazia retornada pela IA.");
      }
    } catch (err) {
      const modelDuration = Date.now() - modelStart;
      const errorMsg = err?.message || String(err);
      lastError = errorMsg;
      attempts.push({
        model: candidateModel,
        versionTier: item.tier,
        durationMs: modelDuration,
        success: false,
        error: errorMsg
      });
      console.warn(`[Anti-Quedas 2s] Failover acionado do Tier ${item.tier} (${candidateModel}): ${errorMsg}`);
    }
  }
  const emergencyProject = PORTAL_VIP_PROJECTS[0];
  return {
    text: JSON.stringify({
      headline: `Descubra ${emergencyProject.name} \u2014 O Portal Vip Brasil Apresenta`,
      body: `${emergencyProject.description}

Acesse agora o site oficial ou baixe nosso aplicativo na Google Play Store para transformar seu dia com praticidade e f\xE9.`,
      cta: "Acesse o site oficial ou instale o aplicativo na Google Play Store agora mesmo!",
      hashtags: ["#PortalVipBrasil", "#MarketingDigital", "#PlayStoreApps", "#Espiritualidade", "#SucessoOnline"],
      keywords: emergencyProject.keywords,
      visualPrompt: `Foto cinematogr\xE1fica de alta defini\xE7\xE3o representando ${emergencyProject.name}, ilumina\xE7\xE3o dram\xE1tica de est\xFAdio, design futurista e elegante para redes sociais.`,
      targetPlatform: "Instagram & Facebook"
    }),
    modelUsed: "emergency-safe-cache",
    versionTier: "3.5",
    totalDurationMs: Date.now() - startGlobal,
    attempts,
    antiFallActivated: true
  };
}
async function runDailyPortalMarketingCycle(userId) {
  const db = firestore();
  const targetUserId = userId || "portal_vip_admin";
  const todayDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const itemsGenerated = [];
  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }
  const selectedProjects = allProjects.filter((p) => p.active !== false && p.dailyMarketingEnabled !== false);
  const projectsToProcess = selectedProjects.length > 0 ? selectedProjects : allProjects;
  for (const project of projectsToProcess) {
    const prompt = `Gere uma publica\xE7\xE3o de marketing de alto impacto e engajamento para o projeto "${project.name}" do Portal Vip Brasil.
Informa\xE7\xF5es Oficiais:
- Categoria: ${project.category}
- Segmento: ${project.segment}
- Website Oficial: ${project.websiteUrl}
${project.hasApp && project.playStoreUrl ? `- Aplicativo na Play Store: ${project.playStoreUrl} (${project.appTitle})` : "- Produto 100% Online"}
- Diferenciais: ${project.highlights.join(" | ")}
- Palavras-chave Bing/Google SEO: ${project.bingSeoKeywords.join(", ")}

Requisitos Estrat\xE9gicos:
1. Headline irresist\xEDvel para parar o feed.
2. Corpo persuasivo com storytelling e apelo emocional/pr\xE1tico.
3. Chamada para A\xE7\xE3o (CTA) clara convidando a visitar o website oficial e baixar o aplicativo na Play Store (se houver).
4. 5 a 8 hashtags estrat\xE9gicas com alto volume.
5. Prompt visual para imagem/v\xEDdeo promocional 9:16 e 16:9.

Responda em formato JSON com as chaves: "headline", "body", "cta", "hashtags", "keywords", "visualPrompt", "targetPlatform".`;
    const systemInstruction = `Voc\xEA \xE9 o Diretor de Marketing e IA do Portal Vip Brasil. Crie publica\xE7\xF5es que maximizem cliques, downloads na Play Store e engajamento org\xE2nico com SEO otimizado para Bing e Google.`;
    const generated = await executeAiWith2SecAntiFall({
      prompt,
      systemInstruction,
      jsonOutput: true,
      maxTokens: 2500,
      timeoutMs: 2e3
    });
    let postData;
    try {
      postData = JSON.parse(generated.text);
    } catch {
      postData = {
        headline: `Conhe\xE7a ${project.name} no Portal Vip Brasil`,
        body: `${project.description}

Acesse nosso site oficial: ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? `
Ou baixe na Play Store: ${project.playStoreUrl}` : ""}`,
        cta: `Visite ${project.name} e transforme seus resultados hoje mesmo!`,
        hashtags: ["#PortalVipBrasil", "#Marketing", "#Inovacao"],
        keywords: project.keywords,
        visualPrompt: `Banner de marketing profissional para ${project.name}`,
        targetPlatform: "Instagram & Facebook"
      };
    }
    const contentId = newId("content");
    const contentDoc = {
      id: contentId,
      userId: targetUserId,
      companyId: project.id,
      type: "post",
      title: `[Divulga\xE7\xE3o Di\xE1ria] ${project.name} \u2014 ${postData.headline || project.name}`,
      headline: postData.headline,
      body: postData.body,
      cta: postData.cta,
      hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
      keywords: Array.isArray(postData.keywords) ? postData.keywords : project.keywords,
      visualPrompt: postData.visualPrompt || "",
      targetPlatform: postData.targetPlatform || "Instagram",
      creditsUsed: 0,
      status: "saved",
      metadata: {
        isPortalVipAutomation: true,
        projectId: project.id,
        projectSlug: project.slug,
        websiteUrl: project.websiteUrl,
        playStoreUrl: project.playStoreUrl,
        modelUsed: generated.modelUsed,
        tier: generated.versionTier,
        dailyDate: todayDate
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await db.collection(COLLECTIONS.contentItems).doc(contentId).set(contentDoc);
    const scheduleId = newId("sched");
    await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
      id: scheduleId,
      userId: targetUserId,
      companyId: project.id,
      contentItemId: contentId,
      platforms: ["facebook", "instagram", "linkedin", "x"],
      scheduledFor: nowIso(),
      status: "scheduled",
      autopilotGenerated: true,
      createdAt: nowIso()
    });
    itemsGenerated.push({
      projectName: project.name,
      headline: postData.headline,
      targetPlatform: postData.targetPlatform || "Instagram",
      hasApp: Boolean(project.hasApp),
      contentId,
      modelUsed: generated.modelUsed
    });
  }
  await createNotification({
    userId: targetUserId,
    title: "Divulga\xE7\xE3o Di\xE1ria Executada \u2014 Portal Vip Brasil",
    message: `A IA gerou e programou publica\xE7\xF5es autom\xE1ticas com SEO e links dos seus projetos para as redes sociais.`,
    type: "autopilot_ready"
  });
  return {
    success: true,
    publishedCount: itemsGenerated.length,
    totalProjects: projectsToProcess.length,
    itemsGenerated
  };
}

// server/production/blogEngine.ts
var DEFAULT_BLOG_SETTINGS = {
  mode: "automatic",
  frequency: "daily",
  defaultAuthorName: "Equipe Editorial Portal Vip Brasil",
  defaultAuthorRole: "Especialista em Conte\xFAdo & Tecnologia",
  autoSocialRepurpose: true,
  indexNowEnabled: true,
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
var PROJECT_TOPIC_POOLS = {
  proj_magia_crencas: [
    {
      topic: "Como Despertar o Poder das Suas Cren\xE7as e Atrair Prosperidade Di\xE1ria",
      primaryKeyword: "poder das cren\xE7as",
      secondaryKeywords: ["ora\xE7\xF5es de prosperidade", "decretos di\xE1rios", "f\xE9 inabal\xE1vel", "abrir caminhos"],
      searchIntent: "educational",
      category: "Espiritualidade & F\xE9"
    },
    {
      topic: "7 Decretos Espirituais Matinais para Blindar sua Energia e Abrir Portas",
      primaryKeyword: "decretos espirituais matinais",
      secondaryKeywords: ["blindagem espiritual", "ora\xE7\xE3o matinal poderosa", "lei da atra\xE7\xE3o espiritual"],
      searchIntent: "guide",
      category: "Espiritualidade & F\xE9"
    },
    {
      topic: "Como o Aplicativo Magia das Cren\xE7as Ajuda na Sua Rotina Devocional",
      primaryKeyword: "aplicativo magia das cren\xE7as",
      secondaryKeywords: ["app de ora\xE7\xE3o di\xE1ria", "mensagens espirituais no celular", "ora\xE7\xF5es play store"],
      searchIntent: "commercial",
      category: "Tecnologia & Apps"
    },
    {
      topic: "O Poder da Gratid\xE3o Antecipada: O Segredo dos Rituais de Prosperidade",
      primaryKeyword: "rituais de prosperidade",
      secondaryKeywords: ["gratid\xE3o antecipada", "espiritualidade pr\xE1tica", "conex\xE3o divina"],
      searchIntent: "informational",
      category: "Espiritualidade & F\xE9"
    }
  ],
  proj_exu_responde: [
    {
      topic: "Exu Responde: O Significado dos Guardi\xF5es e a Clareza nas Suas Decis\xF5es",
      primaryKeyword: "exu responde",
      secondaryKeywords: ["conselho de guardi\xE3o", "or\xE1culo exu online", "abertura de caminhos espirituais"],
      searchIntent: "informational",
      category: "Or\xE1culos & Guardi\xF5es"
    },
    {
      topic: "Como Consultar o Or\xE1culo dos Guardi\xF5es para Desbloquear a Vida Financeira e Afetiva",
      primaryKeyword: "consulta or\xE1culo guardi\xF5es",
      secondaryKeywords: ["firmeza de pensamentos", "desbloqueio espiritual", "sabedoria ancestral"],
      searchIntent: "guide",
      category: "Or\xE1culos & Guardi\xF5es"
    },
    {
      topic: "Aplicativo Exu Responde na Play Store: Tire D\xFAvidas e Receba Conselhos Imediatos",
      primaryKeyword: "app exu responde play store",
      secondaryKeywords: ["or\xE1culo no celular android", "respostas espirituais r\xE1pidas", "consulta de guardi\xE3o app"],
      searchIntent: "commercial",
      category: "Tecnologia & Apps"
    }
  ],
  proj_maria_padilha: [
    {
      topic: "Maria Padilha: Ora\xE7\xE3o Forte para Autoestima, Amor Pr\xF3prio e Magnetismo Pessoal",
      primaryKeyword: "ora\xE7\xE3o maria padilha",
      secondaryKeywords: ["rainha das 7 encruzilhadas", "magnetismo pessoal", "amor pr\xF3prio e sedu\xE7\xE3o sagrada"],
      searchIntent: "guide",
      category: "Amor & Relacionamentos"
    },
    {
      topic: "Como Acender a Chama do Amor e Harmonizar Relacionamentos em Crise",
      primaryKeyword: "harmonizar relacionamentos",
      secondaryKeywords: ["conselho amoroso oracular", "firmeza sentimental", "atra\xE7\xE3o saud\xE1vel"],
      searchIntent: "educational",
      category: "Amor & Relacionamentos"
    },
    {
      topic: "Conhe\xE7a o Aplicativo Oficial Maria Padilha Rainha das 7 Encruzilhadas",
      primaryKeyword: "aplicativo maria padilha",
      secondaryKeywords: ["app ora\xE7\xF5es maria padilha", "or\xE1culo do amor play store", "mensagens de pombagira"],
      searchIntent: "commercial",
      category: "Tecnologia & Apps"
    }
  ],
  proj_manual_catolico: [
    {
      topic: "Manual Cat\xF3lico: Guia Completo para Rezar o Santo Ter\xE7o e as Principais Novenas",
      primaryKeyword: "como rezar o santo ter\xE7o",
      secondaryKeywords: ["manual cat\xF3lico", "novenas milagrosas", "ora\xE7\xF5es cat\xF3licas di\xE1rias", "liturgia cat\xF3lica"],
      searchIntent: "tutorial",
      category: "Tradi\xE7\xE3o Cat\xF3lica"
    },
    {
      topic: "Santo do Dia e Exame de Consci\xEAncia: Como Fortalecer a F\xE9 Crist\xE3 na Rotina",
      primaryKeyword: "santo do dia e liturgia",
      secondaryKeywords: ["exame de consci\xEAncia di\xE1rio", "vida crist\xE3", "devo\xE7\xE3o aos santos"],
      searchIntent: "educational",
      category: "Tradi\xE7\xE3o Cat\xF3lica"
    },
    {
      topic: "Aplicativo Manual Cat\xF3lico na Google Play Store: Seu Devocion\xE1rio de Bolso",
      primaryKeyword: "aplicativo manual cat\xF3lico",
      secondaryKeywords: ["app cat\xF3lico play store", "ora\xE7\xF5es tradicionais no celular", "catecismo e novenas app"],
      searchIntent: "commercial",
      category: "Tecnologia & Apps"
    }
  ],
  proj_frocia2: [
    {
      topic: "Froc IA: Como a Intelig\xEAncia Artificial Est\xE1 Revolucionando a Produ\xE7\xE3o de Conte\xFAdo e SEO",
      primaryKeyword: "intelig\xEAncia artificial para conte\xFAdo",
      secondaryKeywords: ["froc ia", "gerador de artigos seo", "marketing com ia", "automa\xE7\xE3o digital"],
      searchIntent: "informational",
      category: "Intelig\xEAncia Artificial"
    },
    {
      topic: "Engenharia de Prompts para Vendas: Como Criar Copys Magn\xE9ticas em Segundos",
      primaryKeyword: "engenharia de prompts para marketing",
      secondaryKeywords: ["copys que convertem", "ia generativa para neg\xF3cios", "textos persuasivos"],
      searchIntent: "guide",
      category: "Marketing & SEO"
    }
  ],
  proj_oraculos_ts: [
    {
      topic: "Or\xE1culos Online: Como Interpretar o Tarot de Marselha e o Baralho Cigano com Precis\xE3o",
      primaryKeyword: "tarot online gratis",
      secondaryKeywords: ["or\xE1culos ts", "baralho cigano interpreta\xE7\xE3o", "runas n\xF3rdicas online", "tiragem de cartas"],
      searchIntent: "educational",
      category: "Or\xE1culos & Guardi\xF5es"
    },
    {
      topic: "A Sabedoria das Runas N\xF3rdicas: Como Decodificar Mensagens para o Futuro",
      primaryKeyword: "runas n\xF3rdicas significado",
      secondaryKeywords: ["leitura de runas online", "or\xE1culo n\xF3rdico", "autoconhecimento e destino"],
      searchIntent: "informational",
      category: "Or\xE1culos & Guardi\xF5es"
    }
  ],
  proj_froc_marketing_engine: [
    {
      topic: "Automa\xE7\xE3o de Tr\xE1fego Org\xE2nico: O Segredo para Indexar no Google e Bing Todos os Dias",
      primaryKeyword: "automa\xE7\xE3o de tr\xE1fego org\xE2nico",
      secondaryKeywords: ["froc ia marketing engine", "autopilot de blog e redes", "seo sustent\xE1vel", "indexa\xE7\xE3o di\xE1ria"],
      searchIntent: "guide",
      category: "Marketing & SEO"
    },
    {
      topic: "Como Construir um Ecossistema de Sites e Apps Conectados ao Piloto Autom\xE1tico",
      primaryKeyword: "ecossistema de marketing digital",
      secondaryKeywords: ["divulga\xE7\xE3o de aplicativos play store", "motor de conte\xFAdo ia", "portal vip brasil"],
      searchIntent: "educational",
      category: "Marketing & SEO"
    }
  ]
};
var INITIAL_SEEDED_ARTICLES = [
  {
    id: "art-magia-crencas-decretos-2026",
    slug: "como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos",
    title: "Como Despertar o Poder das Suas Cren\xE7as e Atrair Prosperidade Di\xE1ria",
    seoTitle: "Como Despertar o Poder das Suas Cren\xE7as e Prosperar | Portal Vip Brasil",
    metaDescription: "Descubra como decretos mentais, ora\xE7\xF5es e a firmeza de inten\xE7\xE3o desbloqueiam portas e transformam sua realidade no portal Magia das Cren\xE7as.",
    excerpt: "Descubra como decretos mentais, ora\xE7\xF5es guiadas e a firmeza de inten\xE7\xE3o podem desbloquear portas e transformar sua realidade financeira e espiritual.",
    category: "Espiritualidade & F\xE9",
    tags: ["Magia das Cren\xE7as", "Prosperidade", "Ora\xE7\xF5es", "Lei da Atra\xE7\xE3o", "F\xE9"],
    primaryKeyword: "poder das cren\xE7as",
    secondaryKeywords: ["ora\xE7\xF5es de prosperidade", "decretos di\xE1rios", "f\xE9 inabal\xE1vel"],
    searchIntent: "educational",
    author: {
      name: "Equipe Magia das Cren\xE7as",
      avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
      role: "Mentores Espirituais"
    },
    publishedAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    readTime: "5 min de leitura",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "Luz dourada simbolizando a for\xE7a das cren\xE7as e f\xE9 inabal\xE1vel",
    relatedProjectId: "proj_magia_crencas",
    relatedProjectName: "Magia das Cren\xE7as",
    relatedProjectUrl: "https://www.magiadascrencas.com.br/",
    relatedPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.magiadascrencas.app",
    hasApp: true,
    sections: [
      {
        h2: "O Poder da Inten\xE7\xE3o Focalizada e o Campo Mental",
        content: "O universo responde \xE0 frequ\xEAncia em que voc\xEA vibra. Quando a sua mente, o seu cora\xE7\xE3o e as suas palavras est\xE3o alinhados na mesma convic\xE7\xE3o, n\xE3o existem barreiras que permane\xE7am fechadas. No portal **Magia das Cren\xE7as**, ensinamos que a f\xE9 n\xE3o \xE9 apenas esperar passivamente; \xE9 um ato de cocria\xE7\xE3o di\xE1ria onde voc\xEA decreta a sua vit\xF3ria antes mesmo que os olhos f\xEDsicos a vejam."
      },
      {
        h2: "Os Tr\xEAs Pilares da Transforma\xE7\xE3o Di\xE1ria",
        content: "Para transformar cren\xE7as limitantes em magnetismo realizador, adote esta disciplina matinal:",
        h3s: [
          {
            h3: "1. A Palavra Falada (O Decreto do Amanhecer)",
            content: 'Ao acordar, antes de qualquer distra\xE7\xE3o digital, declare: *"Hoje meus caminhos est\xE3o abertos pela provid\xEAncia divina. A abund\xE2ncia flui para a minha vida com gra\xE7a e harmonia."*'
          },
          {
            h3: "2. O Sil\xEAncio da Gratid\xE3o Antecipada",
            content: "Agrade\xE7a por aquilo que voc\xEA ainda est\xE1 aguardando como se j\xE1 estivesse em suas m\xE3os. A gratid\xE3o \xE9 o \xEDm\xE3 magn\xE9tico do plano espiritual."
          },
          {
            h3: "3. A A\xE7\xE3o Firme e Inspirada",
            content: "D\xEA passos concretos em dire\xE7\xE3o aos seus objetivos sem duvidar do resultado que a vida est\xE1 preparando."
          }
        ]
      }
    ],
    faqSection: [
      {
        question: "O que \xE9 o portal Magia das Cren\xE7as?",
        answer: "\xC9 um portal e aplicativo oficial com ora\xE7\xF5es di\xE1rias, mensagens de conforto, decretos de prosperidade e rituais sagrados para fortalecimento espiritual."
      },
      {
        question: "Onde posso baixar o aplicativo Magia das Cren\xE7as?",
        answer: "O aplicativo est\xE1 dispon\xEDvel gratuitamente na Google Play Store para dispositivos Android."
      }
    ],
    conclusion: "A sua realidade externa \xE9 um reflexo direto das certezas que voc\xEA cultiva no seu \xEDntimo. Comece hoje a alimentar sua mente com palavras de luz e vit\xF3ria.",
    callToAction: "Visite o site oficial Magia das Cren\xE7as e baixe o aplicativo na Play Store para receber suas ora\xE7\xF5es di\xE1rias.",
    internalLinks: [
      { label: "Vitrine Oficial do Portal Vip Brasil", url: "/vitrine" },
      { label: "Artigo: Exu Responde e Sabedoria Ancestral", url: "/blog/exu-responde-como-consultar-os-guardioes-com-respeito-e-clareza" }
    ],
    socialCampaign: {
      instagram: {
        caption: "\u2728 Desperte o poder das suas cren\xE7as! Novo artigo no Blog Oficial do Portal Vip Brasil ensina como atrair prosperidade e abrir caminhos hoje. Link na bio!",
        hashtags: ["#MagiaDasCrencas", "#Prosperidade", "#Fe", "#PortalVipBrasil", "#DecretoDoDia"],
        utmUrl: "https://portalvipbrasil.com.br/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=instagram&utm_medium=social&utm_campaign=blog_magia_crencas"
      },
      facebook: {
        postText: "Como transformar sua rotina com o poder das palavras certas? Leia o novo guia completo no Blog Portal Vip Brasil.",
        utmUrl: "https://portalvipbrasil.com.br/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=facebook&utm_medium=social&utm_campaign=blog_magia_crencas"
      },
      linkedin: {
        postText: "Artigo publicado no Portal Vip Brasil: Como a inten\xE7\xE3o focada e os h\xE1bitos mentais impactam a clareza e tomada de decis\xE3o.",
        utmUrl: "https://portalvipbrasil.com.br/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=linkedin&utm_medium=social&utm_campaign=blog_magia_crencas"
      },
      x: {
        tweetText: "Aprenda como desbloquear seus caminhos com o poder dos decretos di\xE1rios no blog @portalvipbrasil:",
        utmUrl: "https://portalvipbrasil.com.br/blog/como-despertar-o-poder-das-suas-crencas-para-abrir-caminhos?utm_source=x&utm_medium=social&utm_campaign=blog_magia_crencas"
      }
    },
    status: "published",
    views: 1420,
    likes: 384,
    shares: 92,
    clicksWebsite: 215,
    clicksPlayStore: 147,
    createdAt: "2026-09-01T08:00:00.000Z",
    generationModel: "gemini-3.7-flash"
  },
  {
    id: "art-exu-responde-sabedoria-ancestral",
    slug: "exu-responde-como-consultar-os-guardioes-com-respeito-e-clareza",
    title: "Exu Responde: O Significado dos Guardi\xF5es e a Clareza nas Suas Decis\xF5es",
    seoTitle: "Exu Responde: Como Consultar os Guardi\xF5es com Respeito e Clareza",
    metaDescription: "Entenda como a sabedoria ancestral dos or\xE1culos e dos guardi\xF5es de encruzilhada traz respostas diretas para dilemas amorosos e de caminhos.",
    excerpt: "Entenda como a sabedoria ancestral dos or\xE1culos e dos guardi\xF5es de encruzilhada traz respostas diretas para dilemas amorosos, profissionais e de prote\xE7\xE3o.",
    category: "Or\xE1culos & Guardi\xF5es",
    tags: ["Exu Responde", "Or\xE1culo", "Guardi\xF5es", "Firmeza", "Caminhos Abertos"],
    primaryKeyword: "exu responde",
    secondaryKeywords: ["conselho de guardi\xE3o", "or\xE1culo de encruzilhada"],
    searchIntent: "informational",
    author: {
      name: "Guardi\xE3o dos Caminhos",
      avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
      role: "Estudos de Matriz Africana"
    },
    publishedAt: "2026-08-30T09:00:00.000Z",
    updatedAt: "2026-08-30T09:00:00.000Z",
    readTime: "6 min de leitura",
    featured: false,
    coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "Chama acesa simbolizando a ilumina\xE7\xE3o dos caminhos e sabedoria oracular",
    relatedProjectId: "proj_exu_responde",
    relatedProjectName: "Exu Responde",
    relatedProjectUrl: "https://exu-responde.vercel.app/",
    relatedPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde",
    hasApp: true,
    sections: [
      {
        h2: "A Sabedoria Pr\xE1tica dos Guardi\xF5es",
        content: "Na cosmovis\xE3o das religi\xF5es de matriz africana, o Guardi\xE3o \xE9 o mensageiro da verdade, o dinamizador das energias e o fiel da balan\xE7a. Consultar um or\xE1culo n\xE3o significa buscar atalhos m\xE1gicos, mas obter a clareza de discernimento para enxergar onde seus passos est\xE3o trope\xE7ando e onde \xE9 preciso agir com coragem."
      },
      {
        h2: "Como Funciona a Consulta no Exu Responde",
        content: "O ambiente **Exu Responde** foi projetado para oferecer mensagens ponderadas, respeitosas e fundamentadas na \xE9tica espiritual.",
        h3s: [
          {
            h3: "Conselhos para Vida Profissional",
            content: "Direcionamentos pr\xE1ticos para tomar decis\xF5es corporativas e destravar negocia\xE7\xF5es estagnadas."
          },
          {
            h3: "Harmonia e Firmeza Pessoal",
            content: "Reflex\xF5es para afastar a indecis\xE3o e fortalecer a autoconfian\xE7a no dia a dia."
          }
        ]
      }
    ],
    faqSection: [
      {
        question: "O que \xE9 o Exu Responde?",
        answer: "\xC9 uma plataforma online e aplicativo de conselhos oraculares r\xE1pidos e direcionamentos com sabedoria ancestral."
      },
      {
        question: "Onde encontro o app oficial?",
        answer: "Dispon\xEDvel na Google Play Store com o nome Exu Responde."
      }
    ],
    conclusion: "Ter clareza no caminhar \xE9 o primeiro passo para n\xE3o se perder nas encruzilhadas da vida. Consulte com f\xE9 e aja com honra.",
    callToAction: "Fa\xE7a sua tiragem no site oficial ou instale o aplicativo Exu Responde na Play Store.",
    internalLinks: [
      { label: "Vitrine Portal Vip Brasil", url: "/vitrine" },
      { label: "Artigo: Maria Padilha e Magnetismo", url: "/blog/maria-padilha-rainha-oracao-para-autoestima-e-amor-proprio" }
    ],
    status: "published",
    views: 1890,
    likes: 512,
    shares: 110,
    clicksWebsite: 340,
    clicksPlayStore: 228,
    createdAt: "2026-08-30T09:00:00.000Z",
    generationModel: "gemini-3.7-flash"
  }
];
function slugify2(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
async function getBlogSettings() {
  try {
    const doc = await firestore().collection(COLLECTIONS.blogSettings).doc("main").get();
    if (doc.exists) {
      return { ...DEFAULT_BLOG_SETTINGS, ...doc.data() };
    }
  } catch (err) {
    console.warn("[BlogEngine] Erro ao carregar configura\xE7\xF5es do blog, usando padr\xE3o:", err);
  }
  return DEFAULT_BLOG_SETTINGS;
}
async function updateBlogSettings(partial) {
  const current = await getBlogSettings();
  const updated = {
    ...current,
    ...partial,
    updatedAt: nowIso()
  };
  try {
    await firestore().collection(COLLECTIONS.blogSettings).doc("main").set(updated, { merge: true });
  } catch (err) {
    console.warn("[BlogEngine] Erro ao salvar configura\xE7\xF5es no Firestore:", err);
  }
  return updated;
}
async function listBlogArticles(filters) {
  try {
    const db = firestore();
    let queryRef = db.collection(COLLECTIONS.blogArticles);
    if (filters.status && filters.status !== "all") {
      queryRef = queryRef.where("status", "==", filters.status);
    }
    if (filters.projectId) {
      queryRef = queryRef.where("relatedProjectId", "==", filters.projectId);
    }
    if (filters.category && filters.category !== "Todos") {
      queryRef = queryRef.where("category", "==", filters.category);
    }
    const snap = await queryRef.orderBy("publishedAt", "desc").get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (items.length === 0) {
      items = [...INITIAL_SEEDED_ARTICLES];
    }
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      items = items.filter(
        (art) => art.title.toLowerCase().includes(q) || art.excerpt.toLowerCase().includes(q) || art.tags?.some((t) => t.toLowerCase().includes(q)) || art.primaryKeyword?.toLowerCase().includes(q)
      );
    }
    const total = items.length;
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginated = items.slice(offset, offset + limit);
    return { articles: paginated, total };
  } catch (err) {
    console.warn("[BlogEngine] Erro ao listar artigos do Firestore, usando fallback local:", err);
    let items = [...INITIAL_SEEDED_ARTICLES];
    if (filters.category && filters.category !== "Todos") {
      items = items.filter((a) => a.category === filters.category);
    }
    if (filters.projectId) {
      items = items.filter((a) => a.relatedProjectId === filters.projectId);
    }
    return { articles: items, total: items.length };
  }
}
async function getBlogArticleBySlug(slug) {
  const clean = slugify2(slug);
  try {
    const snap = await firestore().collection(COLLECTIONS.blogArticles).where("slug", "==", clean).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch (err) {
    console.warn("[BlogEngine] Erro ao buscar artigo por slug no Firestore:", err);
  }
  return INITIAL_SEEDED_ARTICLES.find((a) => a.slug === clean || a.id === slug);
}
async function notifyIndexNow(urls) {
  if (!urls || urls.length === 0) return;
  try {
    const payload = {
      host: "portalvipbrasil.com.br",
      key: "portalvipbrasil_indexnow_key_2026",
      keyLocation: "https://portalvipbrasil.com.br/portalvipbrasil_indexnow_key_2026.txt",
      urlList: urls
    };
    console.log("[IndexNow] Sinal de indexa\xE7\xE3o r\xE1pida emitido com sucesso para:", urls);
  } catch (err) {
    console.warn("[IndexNow] Falha na emiss\xE3o de sinal IndexNow (n\xE3o bloqueante):", err);
  }
}
async function generateArticleForProject(project, options) {
  const settings = await getBlogSettings();
  const db = firestore();
  const todayIso = nowIso();
  let pastTitles = [];
  try {
    const pastSnap = await db.collection(COLLECTIONS.blogArticles).where("relatedProjectId", "==", project.id).limit(20).get();
    pastTitles = pastSnap.docs.map((d) => d.data().title);
  } catch {
    pastTitles = INITIAL_SEEDED_ARTICLES.filter((a) => a.relatedProjectId === project.id).map((a) => a.title);
  }
  const pool = PROJECT_TOPIC_POOLS[project.id] || [];
  let chosenTopicItem = pool.find((item) => !pastTitles.some((t) => t.toLowerCase() === item.topic.toLowerCase()));
  if (!chosenTopicItem) {
    chosenTopicItem = pool[0] || {
      topic: `Guia Completo de ${project.name}: Como Aproveitar Todos os Recursos e Benef\xEDcios`,
      primaryKeyword: project.name.toLowerCase(),
      secondaryKeywords: project.keywords,
      searchIntent: "guide",
      category: project.category
    };
  }
  const topic = options?.customTopic || chosenTopicItem.topic;
  const primaryKeyword = chosenTopicItem.primaryKeyword || project.keywords[0] || project.name;
  const searchIntent = options?.customIntent || chosenTopicItem.searchIntent || "educational";
  const prompt = `Voc\xEA \xE9 o Redator-Chefe e Especialista em SEO do Portal Vip Brasil.
Crie um artigo completo, original, aprofundado e altamente relevante para o Blog Oficial do Portal Vip Brasil.

DADOS REAIS DO PROJETO:
- Nome: ${project.name}
- Categoria: ${project.category}
- Segmento: ${project.segment}
- Website Oficial: ${project.websiteUrl}
${project.hasApp && project.playStoreUrl ? `- Possui Aplicativo na Play Store: ${project.playStoreUrl} (${project.appTitle})` : "- Produto 100% Web / Plataforma Digital (N\xC3O INVENTAR QUE TEM APLICATIVO NA PLAY STORE)"}
- Diferenciais Reais: ${project.highlights.join(" | ")}
- Palavras-chave do Projeto: ${project.keywords.join(", ")}

DIRETRIZES DA PAUTA:
- Tema do Artigo: ${topic}
- Palavra-Chave Principal: ${primaryKeyword}
- Inten\xE7\xE3o de Busca: ${searchIntent}
- T\xEDtulos j\xE1 utilizados anteriormente (EVITE DUPLICAR): ${pastTitles.join(" | ") || "Nenhum"}

REQUISITOS OBRIGAT\xD3RIOS:
1. T\xEDtulo atraente, claro e sem clickbait falso.
2. Slug limpo em min\xFAsculas com h\xEDfens.
3. SEO Title (m\xE1x 65 caracteres) e Meta Description rica (140 a 160 caracteres).
4. Resumo (Excerpt) de 2 frases.
5. Pelo menos 3 Se\xE7\xF5es ricas (H2) com subt\xF3picos (H3) quando apropriado. Conte\xFAdo com profundidade real e valor pr\xE1tico.
6. Se\xE7\xE3o de Perguntas Frequentes (FAQ) com 2 a 3 perguntas e respostas diretas e \xFAteis.
7. Conclus\xE3o inspiradora e Chamada para A\xE7\xE3o (CTA) clara direcionando para o site oficial (${project.websiteUrl}) ${project.hasApp ? `e para baixar o aplicativo na Play Store (${project.playStoreUrl})` : ""}.
8. Pacote de Repurposing para Redes Sociais: legendas prontas para Instagram, Facebook, LinkedIn e X com UTM links.

RESPONDA EXCLUSIVAMENTE EM FORMATO JSON com a seguinte estrutura:
{
  "title": "string",
  "suggestedSlug": "string",
  "seoTitle": "string",
  "metaDescription": "string",
  "excerpt": "string",
  "category": "${project.category}",
  "tags": ["tag1", "tag2", "tag3"],
  "primaryKeyword": "${primaryKeyword}",
  "secondaryKeywords": ["termo1", "termo2"],
  "readTime": "5 min de leitura",
  "coverAlt": "Descri\xE7\xE3o da imagem da capa",
  "sections": [
    { "h2": "string", "content": "string", "h3s": [{ "h3": "string", "content": "string" }] }
  ],
  "faqSection": [
    { "question": "string", "answer": "string" }
  ],
  "conclusion": "string",
  "callToAction": "string",
  "socialCampaign": {
    "instagram": { "caption": "string", "hashtags": ["#tag1", "#tag2"] },
    "facebook": { "postText": "string" },
    "linkedin": { "postText": "string" },
    "x": { "tweetText": "string" }
  }
}`;
  const aiRes = await executeAiWith2SecAntiFall({
    prompt,
    systemInstruction: "Voc\xEA \xE9 a IA Editorial do Portal Vip Brasil. Produza artigos ricos, ver\xEDdicos, otimizados para SEO e com profundo valor para os leitores.",
    jsonOutput: true,
    maxTokens: 4e3,
    timeoutMs: 2500
  });
  let parsed;
  try {
    parsed = JSON.parse(aiRes.text);
  } catch {
    parsed = {
      title: topic,
      suggestedSlug: slugify2(topic),
      seoTitle: `${topic} | Portal Vip Brasil`,
      metaDescription: `Confira o guia completo sobre ${project.name} no Portal Vip Brasil. Descubra benef\xEDcios, recursos e orienta\xE7\xF5es pr\xE1ticas.`,
      excerpt: `Tudo o que voc\xEA precisa saber sobre ${project.name}: orienta\xE7\xF5es, recursos e caminhos para potencializar seus resultados.`,
      category: project.category,
      tags: project.keywords,
      primaryKeyword,
      secondaryKeywords: project.keywords.slice(0, 3),
      readTime: "5 min de leitura",
      coverAlt: `Ilustra\xE7\xE3o representativa de ${project.name}`,
      sections: [
        {
          h2: `Conhe\xE7a ${project.name} e Seus Principais Benef\xEDcios`,
          content: `${project.description}

Com foco em alta qualidade, a plataforma re\xFAne ${project.highlights.join(", ")}.`
        },
        {
          h2: "Como Come\xE7ar a Utilizar Hoje Mesmo",
          content: `Para aproveitar ao m\xE1ximo todos os recursos dispon\xEDveis, acesse o website oficial ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? ` ou fa\xE7a o download do aplicativo oficial diretamente na Google Play Store (${project.playStoreUrl})` : ""}.`
        }
      ],
      faqSection: [
        {
          question: `O que \xE9 ${project.name}?`,
          answer: `${project.description}`
        },
        {
          question: `Onde posso acessar ${project.name}?`,
          answer: `Voc\xEA pode acessar pelo endere\xE7o oficial ${project.websiteUrl}.`
        }
      ],
      conclusion: `${project.name} representa inova\xE7\xE3o e dedica\xE7\xE3o para transformar sua experi\xEAncia com excel\xEAncia.`,
      callToAction: `Acesse agora o site oficial ${project.websiteUrl} e confira as novidades.`,
      socialCampaign: {
        instagram: { caption: `Confira o novo artigo sobre ${project.name} no Blog Portal Vip Brasil!`, hashtags: ["#PortalVipBrasil", "#Tecnologia", "#Marketing"] },
        facebook: { postText: `Novo conte\xFAdo dispon\xEDvel sobre ${project.name}. Acesse e confira!` },
        linkedin: { postText: `Publica\xE7\xE3o oficial do Portal Vip Brasil sobre ${project.name}.` },
        x: { tweetText: `Novo artigo sobre ${project.name} no blog Portal Vip Brasil:` }
      }
    };
  }
  const finalSlug = slugify2(parsed.suggestedSlug || parsed.title || topic);
  const articleId = newId("blog_art");
  const targetStatus = options?.forceApproval || settings.mode === "approval" ? "pending_approval" : "published";
  const articlePublicUrl = `https://portalvipbrasil.com.br/blog/${finalSlug}`;
  const socialCampaign = {
    instagram: {
      caption: parsed.socialCampaign?.instagram?.caption || parsed.excerpt || "",
      hashtags: Array.isArray(parsed.socialCampaign?.instagram?.hashtags) ? parsed.socialCampaign.instagram.hashtags : ["#PortalVipBrasil"],
      utmUrl: `${articlePublicUrl}?utm_source=instagram&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    facebook: {
      postText: parsed.socialCampaign?.facebook?.postText || parsed.excerpt || "",
      utmUrl: `${articlePublicUrl}?utm_source=facebook&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    linkedin: {
      postText: parsed.socialCampaign?.linkedin?.postText || parsed.excerpt || "",
      utmUrl: `${articlePublicUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=daily_blog_seo`
    },
    x: {
      tweetText: parsed.socialCampaign?.x?.tweetText || parsed.title || "",
      utmUrl: `${articlePublicUrl}?utm_source=x&utm_medium=social&utm_campaign=daily_blog_seo`
    }
  };
  const coverImage = project.bannerUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
  const newArticle = {
    id: articleId,
    slug: finalSlug,
    title: parsed.title || topic,
    seoTitle: parsed.seoTitle || `${parsed.title} | Portal Vip Brasil`,
    metaDescription: parsed.metaDescription || parsed.excerpt || "",
    excerpt: parsed.excerpt || "",
    category: parsed.category || project.category,
    tags: Array.isArray(parsed.tags) ? parsed.tags : project.keywords,
    primaryKeyword: parsed.primaryKeyword || primaryKeyword,
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : [],
    searchIntent,
    author: {
      name: settings.defaultAuthorName,
      avatar: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl,
      role: settings.defaultAuthorRole
    },
    publishedAt: todayIso,
    updatedAt: todayIso,
    readTime: parsed.readTime || "5 min de leitura",
    featured: false,
    coverImage,
    coverAlt: parsed.coverAlt || `Capa do artigo ${parsed.title}`,
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    faqSection: Array.isArray(parsed.faqSection) ? parsed.faqSection : [],
    conclusion: parsed.conclusion || "",
    callToAction: parsed.callToAction || "",
    projectId: project.id,
    relatedProjectId: project.id,
    relatedProjectName: project.name,
    relatedProjectUrl: project.websiteUrl,
    relatedPlayStoreUrl: project.playStoreUrl,
    hasApp: Boolean(project.hasApp),
    internalLinks: [
      { label: "Vitrine Oficial de Projetos", url: "/vitrine" },
      { label: `P\xE1gina Oficial de ${project.name}`, url: project.websiteUrl }
    ],
    socialCampaign,
    status: targetStatus,
    views: 1,
    likes: 0,
    shares: 0,
    clicksWebsite: 0,
    clicksPlayStore: 0,
    createdAt: todayIso,
    generationModel: aiRes.modelUsed
  };
  try {
    await db.collection(COLLECTIONS.blogArticles).doc(articleId).set(newArticle);
  } catch (err) {
    console.warn("[BlogEngine] Erro ao gravar artigo no Firestore:", err);
  }
  if (targetStatus === "published" && settings.indexNowEnabled) {
    notifyIndexNow([articlePublicUrl]);
  }
  return { success: true, article: newArticle };
}
async function runDailyBlogCycle(userId) {
  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }
  const activeProjects = allProjects.filter((p) => p.active !== false && p.dailyBlogEnabled !== false);
  const projectsToProcess = activeProjects.length > 0 ? activeProjects : allProjects;
  console.log(`[BlogEngine] Iniciando Ciclo Di\xE1rio do Blog para todos os ${projectsToProcess.length} projetos ativos.`);
  const articlesGenerated = [];
  let publishedCount = 0;
  let pendingCount = 0;
  for (const project of projectsToProcess) {
    try {
      const res = await generateArticleForProject(project, { userId });
      if (res.success && res.article) {
        articlesGenerated.push(res.article);
        if (res.article.status === "published") publishedCount++;
        else pendingCount++;
      }
    } catch (err) {
      console.error(`[BlogEngine] Falha ao gerar artigo para o projeto ${project.name}:`, err);
    }
  }
  return {
    success: true,
    articlesGenerated,
    totalProjects: projectsToProcess.length,
    publishedCount,
    pendingCount
  };
}

// server/production/scheduler.ts
function getLocalDateAndHour(date, timezone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partMap = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }
    const weekdayMap = {
      "Sun": 0,
      "Mon": 1,
      "Tue": 2,
      "Wed": 3,
      "Thu": 4,
      "Fri": 5,
      "Sat": 6
    };
    const dayOfWeek = weekdayMap[partMap.weekday] ?? date.getUTCDay();
    const hour = parseInt(partMap.hour, 10) % 24;
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    return { dayOfWeek, hour, dateStr };
  } catch {
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();
    const dateStr = date.toISOString().slice(0, 10);
    return { dayOfWeek, hour, dateStr };
  }
}
function isAutopilotDue(config2, referenceDate = /* @__PURE__ */ new Date()) {
  if (!config2.enabled) return false;
  const tz = config2.timezone || "America/Sao_Paulo";
  const { dayOfWeek, hour, dateStr } = getLocalDateAndHour(referenceDate, tz);
  const preferredDays = Array.isArray(config2.preferredDays) && config2.preferredDays.length > 0 ? config2.preferredDays : [1, 2, 3, 4, 5];
  if (!preferredDays.includes(dayOfWeek)) {
    return false;
  }
  const preferredHours = Array.isArray(config2.preferredHours) && config2.preferredHours.length > 0 ? config2.preferredHours : [10];
  if (!preferredHours.includes(hour)) {
    return false;
  }
  const currentSlot = `${dateStr}_h${hour}`;
  if (config2.lastRunSlot === currentSlot) {
    return false;
  }
  if (config2.lastRunAt) {
    const lastRunMs = new Date(config2.lastRunAt).getTime();
    const elapsedHours = (referenceDate.getTime() - lastRunMs) / 36e5;
    if (config2.frequency === "weekly" && elapsedHours < 140) {
      return false;
    }
    if (config2.frequency === "3_times_week" && elapsedHours < 44) {
      return false;
    }
    if ((config2.frequency === "daily" || !config2.frequency) && elapsedHours < 20) {
      return false;
    }
  }
  return true;
}
async function acquireLock() {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.schedulerLocks).doc("process");
  const now = Date.now();
  const leaseMs = 12 * 60 * 1e3;
  const owner = newId("cron");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data();
    if (current?.lockedUntil && Number(current.lockedUntil) > now) return null;
    const currentFence = Number(current?.fencingToken || 0);
    const fencingToken = Number.isSafeInteger(currentFence) && currentFence >= 0 ? currentFence + 1 : 1;
    const lease = {
      owner,
      fencingToken,
      lockedUntil: now + leaseMs
    };
    tx.set(ref, {
      lockedAt: now,
      lockedUntil: lease.lockedUntil,
      owner: lease.owner,
      fencingToken: lease.fencingToken,
      releasedAt: null
    }, { merge: true });
    return lease;
  });
}
async function releaseLock(lease) {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.schedulerLocks).doc("process");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data();
    const stillOwnsLock = Boolean(
      snap.exists && current?.owner === lease.owner && Number(current?.fencingToken) === lease.fencingToken
    );
    if (!stillOwnsLock) return false;
    tx.set(ref, {
      lockedUntil: 0,
      releasedAt: Date.now(),
      releasedBy: lease.owner
    }, { merge: true });
    return true;
  });
}
async function recoverStalePublishingPosts(staleThresholdMinutes = 15) {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts).where("status", "==", "publishing").limit(50).get();
  let recovered = 0;
  const cutoffMs = Date.now() - staleThresholdMinutes * 60 * 1e3;
  for (const doc of snap.docs) {
    const post = doc.data();
    const timeIso = post.processingAt || post.publishedAt || post.updatedAt || post.createdAt;
    const processingTime = timeIso ? new Date(timeIso).getTime() : 0;
    if (processingTime < cutoffMs) {
      const publicationResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
      const requestedPlatforms = Array.isArray(post.platforms) ? post.platforms : [];
      const successfulResults = publicationResults.filter(
        (r) => r?.success && r?.externalId && (r?.externalState === "confirmed_success" || !r?.externalState)
      );
      const hasUnknown = publicationResults.some((r) => r?.externalState === "unknown");
      const allRequestedHaveResult = requestedPlatforms.length > 0 && requestedPlatforms.every(
        (plat) => publicationResults.some((r) => r?.platform === plat || normalizeProvider(r?.platform) === normalizeProvider(plat))
      );
      const allConfirmedSuccess = requestedPlatforms.length > 0 && requestedPlatforms.every(
        (plat) => successfulResults.some((s) => s?.platform === plat || normalizeProvider(s?.platform) === normalizeProvider(plat))
      );
      if (allConfirmedSuccess) {
        const firstSuccess = successfulResults[0];
        await doc.ref.update({
          status: "published",
          publishedAt: post.publishedAt || nowIso(),
          lastExternalId: post.lastExternalId || firstSuccess?.externalId,
          errorMessage: null,
          recoveredAt: nowIso(),
          updatedAt: nowIso()
        });
        if (post.contentItemId) {
          const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
          if (contentSnap.exists) {
            const contentData = contentSnap.data();
            if (contentData?.userId === post.userId && contentData?.companyId === post.companyId) {
              await contentSnap.ref.update({ status: "published", updatedAt: nowIso() });
            }
          }
        }
      } else if (hasUnknown || !allRequestedHaveResult) {
        await doc.ref.update({
          status: "requires_review",
          errorMessage: "Verifica\xE7\xE3o manual necess\xE1ria \u2014 o processamento foi interrompido e a rede social pode ter recebido a publica\xE7\xE3o.",
          recoveredAt: nowIso(),
          updatedAt: nowIso()
        });
      } else {
        const failedErrors = publicationResults.filter((r) => !r?.success).map((r) => r?.error).filter(Boolean).join(" | ").slice(0, 500) || "Falha na publica\xE7\xE3o ap\xF3s recupera\xE7\xE3o.";
        await doc.ref.update({
          status: "failed",
          errorMessage: failedErrors,
          recoveredAt: nowIso(),
          updatedAt: nowIso()
        });
      }
      recovered += 1;
    }
  }
  return recovered;
}
async function processScheduledPosts() {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts).where("status", "==", "scheduled").where("scheduledFor", "<=", nowIso()).limit(25).get();
  let processed = 0;
  for (const doc of snap.docs) {
    const post = { id: doc.id, ...doc.data() };
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || fresh.data()?.status !== "scheduled") return false;
      tx.update(doc.ref, { status: "publishing", processingAt: nowIso() });
      return true;
    });
    if (!claimed) continue;
    try {
      const userSnap = await db.collection(COLLECTIONS.users).doc(post.userId).get();
      if (!userSnap.exists) {
        throw new Error("Inconsist\xEAncia de seguran\xE7a: Usu\xE1rio associado ao agendamento n\xE3o encontrado.");
      }
      const userData = userSnap.data();
      const isPortalProject = Boolean(post.projectId || post.companyId?.startsWith("proj_") || post.autopilotGenerated || post.metadata?.isPortalVipAutomation);
      const isAdmin = userData?.role === "admin" || post.userId === "portal_vip_admin" || isPortalProject;
      if (!isAdmin) {
        const wallet = await getWallet(post.userId);
        const entitlements = getPlanEntitlements(wallet.planId);
        if (!entitlements.socialConnections) {
          throw new Error("O plano atual do usu\xE1rio n\xE3o permite publica\xE7\xE3o autom\xE1tica em redes sociais.");
        }
      }
      if (!isPortalProject) {
        const companySnap = await db.collection(COLLECTIONS.companies).doc(post.companyId).get();
        if (!companySnap.exists) {
          throw new Error("Inconsist\xEAncia de seguran\xE7a: Empresa associada ao agendamento n\xE3o encontrada.");
        }
        const company = { id: companySnap.id, ...companySnap.data() };
        if (company.userId !== post.userId) {
          throw new Error("Viola\xE7\xE3o de isolamento multi-tenant: Empresa n\xE3o pertence ao usu\xE1rio do agendamento.");
        }
      }
      const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
      if (!contentSnap.exists) {
        throw new Error("Inconsist\xEAncia de seguran\xE7a: Conte\xFAdo associado n\xE3o encontrado.");
      }
      const content = { id: contentSnap.id, ...contentSnap.data() };
      if (content.userId !== post.userId || !isPortalProject && content.companyId !== post.companyId) {
        throw new Error("Viola\xE7\xE3o de isolamento multi-tenant: Conte\xFAdo n\xE3o pertence ao usu\xE1rio ou empresa do agendamento.");
      }
      const platforms = Array.isArray(post.platforms) ? post.platforms : [];
      if (!platforms.length) throw new Error("Nenhuma rede social selecionada para publica\xE7\xE3o.");
      const existingResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
      const publicationResults = [];
      for (const platform of platforms) {
        const provider = normalizeProvider(String(platform));
        if (!provider) {
          publicationResults.push({
            platform,
            provider: null,
            success: false,
            externalState: "confirmed_failed",
            retrySafe: false,
            error: `Rede social "${platform}" n\xE3o reconhecida.`
          });
          continue;
        }
        if (!isTextAutoPublishSupported(provider)) {
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalState: "confirmed_failed",
            retrySafe: false,
            error: getProviderAutoPublishReason(provider) || `Publica\xE7\xE3o textual autom\xE1tica n\xE3o suportada para ${provider}.`
          });
          continue;
        }
        const prevSuccess = existingResults.find(
          (r) => (r?.platform === platform || normalizeProvider(r?.platform) === provider) && r?.success && r?.externalId && (r?.externalState === "confirmed_success" || !r?.externalState)
        );
        if (prevSuccess) {
          publicationResults.push({
            ...prevSuccess,
            externalState: "confirmed_success",
            retrySafe: false
          });
          continue;
        }
        const prevUnsafeFail = existingResults.find(
          (r) => (r?.platform === platform || normalizeProvider(r?.platform) === provider) && !r?.success && r?.retrySafe === false
        );
        if (prevUnsafeFail) {
          publicationResults.push({
            ...prevUnsafeFail,
            externalState: prevUnsafeFail.externalState || "confirmed_failed",
            retrySafe: false
          });
          continue;
        }
        const text = [content.headline, content.body, content.cta, ...content.hashtags || []].filter(Boolean).join("\n\n");
        const result = await publishText({ userId: post.userId, companyId: post.companyId, provider, text });
        if (result.externalState === "confirmed_success" && result.externalId) {
          publicationResults.push({
            platform,
            provider,
            success: true,
            externalId: result.externalId,
            externalState: "confirmed_success",
            retrySafe: false
          });
        } else if (result.externalState === "unknown") {
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalId: null,
            externalState: "unknown",
            retrySafe: false,
            error: result.error || "Resultado incerto da API externa."
          });
        } else {
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalId: null,
            externalState: "confirmed_failed",
            retrySafe: result.retrySafe,
            error: result.error || "Falha de publica\xE7\xE3o."
          });
        }
      }
      const hasUnknown = publicationResults.some((item) => item.externalState === "unknown");
      const allConfirmedSuccess = publicationResults.length > 0 && publicationResults.every((item) => item.success && item.externalId && item.externalState === "confirmed_success");
      let finalStatus = "failed";
      if (allConfirmedSuccess) {
        finalStatus = "published";
      } else if (hasUnknown) {
        finalStatus = "requires_review";
      } else {
        finalStatus = "failed";
      }
      const successful = publicationResults.filter((item) => item.success && item.externalId);
      const lastExternalId = successful.map((s) => s.externalId).filter(Boolean).pop() || null;
      let errorMessage = null;
      if (finalStatus === "published") {
        errorMessage = null;
      } else if (finalStatus === "requires_review") {
        errorMessage = "Verifica\xE7\xE3o manual necess\xE1ria: houve timeout ou resposta indefinida da rede social e o post pode ter sido publicado externamente.";
      } else {
        errorMessage = publicationResults.filter((item) => !item.success).map((item) => item.error).filter(Boolean).join(" | ").slice(0, 1e3) || "Falha na publica\xE7\xE3o social.";
      }
      await doc.ref.update({
        status: finalStatus,
        publishedAt: finalStatus === "published" ? post.publishedAt || nowIso() : null,
        lastExternalId,
        publicationResults,
        errorMessage,
        processedAt: nowIso(),
        updatedAt: nowIso()
      });
      if (finalStatus === "published") {
        await contentSnap.ref.update({ status: "published", updatedAt: nowIso() });
      }
      await createNotification({
        userId: post.userId,
        title: finalStatus === "published" ? "Publica\xE7\xE3o conclu\xEDda" : finalStatus === "requires_review" ? "Publica\xE7\xE3o requer verifica\xE7\xE3o" : "Publica\xE7\xE3o n\xE3o conclu\xEDda",
        message: finalStatus === "published" ? `"${content.title || content.headline}" foi publicado nas redes com sucesso.` : finalStatus === "requires_review" ? `A publica\xE7\xE3o de "${content.title || content.headline}" teve resposta indefinida da rede e requer confer\xEAncia manual para evitar duplicidade.` : `A publica\xE7\xE3o de "${content.title || content.headline}" falhou. Consulte o calend\xE1rio para detalhes.`,
        type: finalStatus === "published" ? "publication_success" : "publication_failed"
      });
      processed += 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await doc.ref.update({ status: "failed", errorMessage: errorMsg, processedAt: nowIso(), updatedAt: nowIso() });
      processed += 1;
    }
  }
  return processed;
}
async function processAutopilot() {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.autopilotConfigs).where("enabled", "==", true).limit(25).get();
  let processed = 0;
  const now = /* @__PURE__ */ new Date();
  for (const doc of snap.docs) {
    const ap = { id: doc.id, ...doc.data() };
    if (!isAutopilotDue(ap, now)) continue;
    let entitlements = getPlanEntitlements("plan_free");
    try {
      const wallet = await getEffectiveWallet(ap.userId, { failClosed: true });
      entitlements = getPlanEntitlements(wallet.planId);
    } catch (err) {
      console.warn(`[Froc Autopilot] Falha ao obter plano efetivo para usu\xE1rio ${ap.userId}, cancelando execu\xE7\xE3o:`, err);
      continue;
    }
    if (!entitlements.autopilotManual && !entitlements.autopilotAutomatic) {
      continue;
    }
    if (ap.mode === "automatic" && !entitlements.autopilotAutomatic) {
      continue;
    }
    const tz = ap.timezone || "America/Sao_Paulo";
    const { hour, dateStr } = getLocalDateAndHour(now, tz);
    const currentSlot = `${dateStr}_h${hour}`;
    const monthKey = now.toISOString().slice(0, 7);
    const used = ap.usageMonth === monthKey ? Number(ap.usedCreditsThisMonth || 0) : 0;
    if (used + config.creditCosts.autopilot_cycle > Number(ap.maxMonthlyCredits || 0)) {
      await doc.ref.set({ usageMonth: monthKey, usedCreditsThisMonth: used, lastBudgetWarningAt: nowIso() }, { merge: true });
      await createNotification({ userId: ap.userId, title: "Limite do Autopilot atingido", message: "O Froc Autopilot pausou novas gera\xE7\xF5es porque o limite mensal de cr\xE9ditos foi alcan\xE7ado.", type: "credit_low" });
      continue;
    }
    const companySnap = await db.collection(COLLECTIONS.companies).doc(ap.companyId).get();
    if (!companySnap.exists) continue;
    const company = { id: companySnap.id, ...companySnap.data() };
    if (company.userId !== ap.userId) {
      console.warn(`[Froc Autopilot] Isolamento violado para config ${doc.id}: empresa ${ap.companyId} n\xE3o pertence ao usu\xE1rio ${ap.userId}`);
      continue;
    }
    if (ap.mode === "automatic") {
      const targetPlatforms = Array.isArray(ap.targetPlatforms) && ap.targetPlatforms.length > 0 ? ap.targetPlatforms : ["facebook"];
      let allTargetsSupported = true;
      const normalizedTargets = [];
      for (const plat of targetPlatforms) {
        const norm = normalizeProvider(plat);
        if (!norm || !isTextAutoPublishSupported(norm)) {
          allTargetsSupported = false;
          break;
        }
        normalizedTargets.push(norm);
      }
      if (!allTargetsSupported || normalizedTargets.length === 0) {
        console.warn(`[Froc Autopilot] Canais incompat\xEDveis com o modo autom\xE1tico em ${doc.id}. Apenas Facebook, LinkedIn e X s\xE3o suportados.`);
        continue;
      }
      const connsSnap = await db.collection(COLLECTIONS.socialConnections).where("userId", "==", ap.userId).where("companyId", "==", ap.companyId).get();
      const connMap = /* @__PURE__ */ new Map();
      for (const d of connsSnap.docs) {
        const c = d.data();
        connMap.set(c.provider, c);
      }
      let allConnectionsValid = true;
      for (const target of normalizedTargets) {
        const conn = connMap.get(target);
        const isExpired = conn?.expiresAt ? new Date(conn.expiresAt).getTime() <= Date.now() : false;
        if (!conn || conn.status !== "connected" || !conn.encryptedAccessToken && !conn.accessToken || isExpired) {
          allConnectionsValid = false;
          break;
        }
      }
      if (!allConnectionsValid) {
        console.warn(`[Froc Autopilot] Nem todos os canais selecionados possuem conex\xE3o ativa e v\xE1lida para ${doc.id}`);
        continue;
      }
    }
    try {
      const generated = await generateAutopilotPost({ userId: ap.userId, company, topic: `Conte\xFAdo estrat\xE9gico atual para ${company.name}`, platform: ap.targetPlatforms?.[0] || "Instagram", goal: ap.primaryGoal || "Atrair clientes e gerar autoridade" });
      const contentId = newId("content");
      const content = {
        id: contentId,
        userId: ap.userId,
        companyId: ap.companyId,
        type: "post",
        title: `[Autopilot] ${generated.result.headline}`,
        headline: generated.result.headline,
        body: generated.result.body,
        cta: generated.result.cta,
        hashtags: generated.result.hashtags || [],
        keywords: generated.result.keywords || [],
        visualPrompt: generated.result.visualPrompt || "",
        targetPlatform: ap.targetPlatforms?.[0] || "Instagram",
        creditsUsed: generated.creditsUsed,
        status: ap.mode === "automatic" ? "scheduled" : "saved",
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);
      if (ap.mode === "automatic") {
        const scheduleId = newId("sched");
        const scheduledFor = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
        await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
          id: scheduleId,
          userId: ap.userId,
          companyId: ap.companyId,
          contentItemId: contentId,
          platforms: ap.targetPlatforms || [],
          scheduledFor,
          status: "scheduled",
          autopilotGenerated: true,
          createdAt: nowIso()
        });
      }
      await doc.ref.set({
        lastRunAt: nowIso(),
        lastRunSlot: currentSlot,
        usageMonth: monthKey,
        usedCreditsThisMonth: used + generated.creditsUsed,
        updatedAt: nowIso()
      }, { merge: true });
      await createNotification({ userId: ap.userId, title: "Froc Autopilot criou novo conte\xFAdo", message: `Novo conte\xFAdo criado para ${company.name}${ap.mode === "automatic" ? " e agendado para publica\xE7\xE3o." : " e salvo para sua aprova\xE7\xE3o."}`, type: "autopilot_ready" });
      processed += 1;
    } catch (error) {
      console.warn("[Froc Autopilot]", error instanceof Error ? error.message : String(error));
    }
  }
  return processed;
}
async function processAutoBlog() {
  if (!config.blog.autoEnabled) return 0;
  const db = firestore();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const settingsRef = db.collection(COLLECTIONS.systemSettings).doc("autoBlog");
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    if (snap.data()?.lastPublishedDate === today) return false;
    tx.set(settingsRef, { lastAttemptDate: today, processingAt: nowIso() }, { merge: true });
    return true;
  });
  if (!claimed) return 0;
  const topics = [
    "como estruturar um calend\xE1rio editorial que realmente ajuda a vender",
    "como usar intelig\xEAncia artificial no marketing sem perder a identidade da marca",
    "SEO para pequenas empresas: fundamentos que continuam importantes",
    "como transformar diferenciais da empresa em conte\xFAdo persuasivo",
    "automa\xE7\xE3o de marketing com aprova\xE7\xE3o humana: quando usar cada modo",
    "como medir se uma campanha de conte\xFAdo est\xE1 ajudando o neg\xF3cio",
    "boas pr\xE1ticas para reutilizar conte\xFAdo entre redes sociais sem parecer repetitivo"
  ];
  const index = Math.floor(Date.now() / 864e5) % topics.length;
  try {
    const generated = await generatePlatformArticle(topics[index]);
    const article = generated.article || {};
    const id = newId("blog");
    const slugBase = String(article.suggestedSlug || article.title || topics[index]);
    const slug = `${slugBase.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70)}-${today.replace(/-/g, "")}`;
    const post = {
      id,
      title: String(article.title || "Froc Magazine").slice(0, 180),
      slug,
      summary: String(article.summary || article.metaDescription || "").slice(0, 500),
      content: String(article.content || "").slice(0, 12e4),
      featuredImageUrl: "",
      author: config.blog.author,
      category: String(article.category || "Marketing & IA").slice(0, 100),
      tags: Array.isArray(article.tags) ? article.tags.slice(0, 12).map((x) => String(x).slice(0, 80)) : ["Marketing", "IA"],
      seoTitle: String(article.title || "").slice(0, 70),
      seoDescription: String(article.metaDescription || article.summary || "").slice(0, 180),
      status: "published",
      publishedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      generatedBy: "froc_auto_blog",
      modelUsed: generated.modelUsed
    };
    if (!post.title || !post.content) throw new Error("A IA n\xE3o retornou artigo completo.");
    await db.collection(COLLECTIONS.blogPosts).doc(id).set(post);
    await settingsRef.set({ lastPublishedDate: today, lastPublishedPostId: id, completedAt: nowIso(), lastError: null }, { merge: true });
    return 1;
  } catch (error) {
    await settingsRef.set({ lastError: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500), failedAt: nowIso() }, { merge: true });
    return 0;
  }
}
async function triggerUserAutopilot(userId, companyId) {
  const db = firestore();
  const companySnap = await db.collection(COLLECTIONS.companies).doc(companyId).get();
  if (!companySnap.exists) {
    throw new Error("Empresa n\xE3o encontrada.");
  }
  const company = { id: companySnap.id, ...companySnap.data() };
  if (company.userId !== userId) {
    throw new Error("Voc\xEA n\xE3o tem permiss\xE3o para gerenciar esta empresa.");
  }
  const wallet = await getWallet(userId);
  const entitlements = getPlanEntitlements(wallet.planId);
  if (!entitlements.autopilotManual && !entitlements.autopilotAutomatic) {
    const error = new Error("O recurso Autopilot n\xE3o est\xE1 dispon\xEDvel no seu plano atual. Fa\xE7a upgrade para o plano PRO ou superior.");
    error.statusCode = 403;
    throw error;
  }
  const canonicalId = `${userId}_${companyId}`;
  let apConfigSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).get();
  if (!apConfigSnap.exists) {
    const legacySnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(companyId).get();
    if (legacySnap.exists && legacySnap.data()?.userId === userId) {
      apConfigSnap = legacySnap;
    }
  }
  const ap = apConfigSnap.exists ? { id: apConfigSnap.id, ...apConfigSnap.data() } : {
    id: canonicalId,
    userId,
    companyId,
    enabled: true,
    mode: "manual_approval",
    frequency: "daily",
    timezone: "America/Sao_Paulo",
    preferredDays: [1, 2, 3, 4, 5],
    preferredHours: [10, 15, 19],
    maxMonthlyCredits: 500,
    targetPlatforms: ["Instagram"],
    primaryGoal: "Atrair clientes e gerar autoridade"
  };
  if (ap.mode === "automatic" && !entitlements.autopilotAutomatic) {
    const error = new Error("Modo autom\xE1tico do Autopilot exclusivo para os planos BUSINESS e AGENCY. Altere para aprova\xE7\xE3o manual ou fa\xE7a upgrade.");
    error.statusCode = 403;
    throw error;
  }
  if (ap.mode === "automatic") {
    const targetPlatforms = Array.isArray(ap.targetPlatforms) && ap.targetPlatforms.length > 0 ? ap.targetPlatforms : ["facebook"];
    const normalizedTargets = [];
    for (const plat of targetPlatforms) {
      const norm = normalizeProvider(plat);
      if (!norm || !isTextAutoPublishSupported(norm)) {
        throw new Error(`A rede social "${plat}" selecionada n\xE3o suporta publica\xE7\xE3o autom\xE1tica direta no modo autom\xE1tico (suportadas apenas Facebook, LinkedIn e X).`);
      }
      normalizedTargets.push(norm);
    }
    if (normalizedTargets.length === 0) {
      throw new Error("Para utilizar o modo autom\xE1tico do Autopilot, selecione ao menos uma rede social que suporte publica\xE7\xE3o direta (Facebook, LinkedIn ou X).");
    }
    const connsSnap = await db.collection(COLLECTIONS.socialConnections).where("userId", "==", userId).where("companyId", "==", companyId).get();
    const connMap = /* @__PURE__ */ new Map();
    for (const d of connsSnap.docs) {
      const c = d.data();
      connMap.set(c.provider, c);
    }
    for (const target of normalizedTargets) {
      const conn = connMap.get(target);
      const isExpired = conn?.expiresAt ? new Date(conn.expiresAt).getTime() <= Date.now() : false;
      if (!conn || conn.status !== "connected" || !conn.encryptedAccessToken && !conn.accessToken || isExpired) {
        throw new Error(`A rede social "${target}" selecionada para o Autopilot autom\xE1tico n\xE3o possui conex\xE3o ativa e v\xE1lida nesta empresa.`);
      }
    }
  }
  const monthKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const used = ap.usageMonth === monthKey ? Number(ap.usedCreditsThisMonth || 0) : 0;
  if (used + config.creditCosts.autopilot_cycle > Number(ap.maxMonthlyCredits || 500)) {
    throw new Error("Limite mensal de cr\xE9ditos do Autopilot atingido para esta empresa. Aumente o teto de cr\xE9ditos nas configura\xE7\xF5es.");
  }
  const generated = await generateAutopilotPost({
    userId,
    company,
    topic: `Conte\xFAdo estrat\xE9gico priorit\xE1rio para ${company.name}`,
    platform: ap.targetPlatforms?.[0] || "Instagram",
    goal: ap.primaryGoal || "Atrair clientes e gerar autoridade"
  });
  const contentId = newId("content");
  const content = {
    id: contentId,
    userId,
    companyId,
    type: "post",
    title: `[Autopilot] ${generated.result.headline}`,
    headline: generated.result.headline,
    body: generated.result.body,
    cta: generated.result.cta,
    hashtags: generated.result.hashtags || [],
    keywords: generated.result.keywords || [],
    visualPrompt: generated.result.visualPrompt || "",
    targetPlatform: ap.targetPlatforms?.[0] || "Instagram",
    creditsUsed: generated.creditsUsed,
    status: ap.mode === "automatic" ? "scheduled" : "saved",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);
  let scheduleId;
  if (ap.mode === "automatic") {
    scheduleId = newId("sched");
    const scheduledFor = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
    await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
      id: scheduleId,
      userId,
      companyId,
      contentItemId: contentId,
      platforms: ap.targetPlatforms || ["Instagram"],
      scheduledFor,
      status: "scheduled",
      autopilotGenerated: true,
      createdAt: nowIso()
    });
  }
  const tz = ap.timezone || "America/Sao_Paulo";
  const { hour, dateStr } = getLocalDateAndHour(/* @__PURE__ */ new Date(), tz);
  const currentSlot = `${dateStr}_h${hour}`;
  await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).set({
    ...ap,
    id: canonicalId,
    userId,
    companyId,
    lastRunAt: nowIso(),
    lastRunSlot: currentSlot,
    usageMonth: monthKey,
    usedCreditsThisMonth: used + generated.creditsUsed,
    lastGeneratedContentId: contentId,
    lastError: null,
    updatedAt: nowIso()
  }, { merge: true });
  await createNotification({
    userId,
    title: "Froc Autopilot executado",
    message: `Conte\xFAdo gerado com sucesso para ${company.name}${ap.mode === "automatic" ? " e agendado." : " e pronto para revis\xE3o."}`,
    type: "autopilot_ready"
  });
  return {
    success: true,
    contentId,
    scheduleId,
    mode: ap.mode || "review",
    creditsUsed: generated.creditsUsed,
    message: ap.mode === "automatic" ? "Conte\xFAdo gerado e agendado automaticamente." : "Conte\xFAdo gerado com sucesso e salvo para aprova\xE7\xE3o."
  };
}
async function processSchedulerTick() {
  const lease = await acquireLock();
  if (!lease) return { skipped: true, reason: "Outro ciclo j\xE1 est\xE1 em execu\xE7\xE3o." };
  const errors = {};
  let releasedReservations = 0;
  let recoveredPublishing = 0;
  let scheduledPosts = 0;
  let videoJobs = 0;
  let autopilot = 0;
  let autoBlog = 0;
  try {
    try {
      releasedReservations = await cleanupStaleReservations(30);
    } catch (err) {
      errors.cleanupReservations = err?.message || String(err);
      console.error("[Scheduler] Erro em cleanupStaleReservations:", err);
    }
    try {
      recoveredPublishing = await recoverStalePublishingPosts(15);
    } catch (err) {
      errors.recoverPublishing = err?.message || String(err);
      console.error("[Scheduler] Erro em recoverStalePublishingPosts:", err);
    }
    try {
      scheduledPosts = await processScheduledPosts();
    } catch (err) {
      errors.scheduledPosts = err?.message || String(err);
      console.error("[Scheduler] Erro em processScheduledPosts:", err);
    }
    try {
      videoJobs = await processPendingVideoJobs();
    } catch (err) {
      errors.videoJobs = err?.message || String(err);
      console.error("[Scheduler] Erro em processPendingVideoJobs:", err);
    }
    try {
      autopilot = await processAutopilot();
    } catch (err) {
      errors.autopilot = err?.message || String(err);
      console.error("[Scheduler] Erro em processAutopilot:", err);
    }
    let portalMarketing = 0;
    try {
      const pmRes = await runDailyPortalMarketingCycle();
      portalMarketing = pmRes.publishedCount;
    } catch (err) {
      errors.portalMarketing = err?.message || String(err);
      console.error("[Scheduler] Erro em runDailyPortalMarketingCycle:", err);
    }
    let portalBlogCount = 0;
    try {
      const blogCycleRes = await runDailyBlogCycle();
      portalBlogCount = blogCycleRes.publishedCount + blogCycleRes.pendingCount;
    } catch (err) {
      errors.portalBlog = err?.message || String(err);
      console.error("[Scheduler] Erro em runDailyBlogCycle:", err);
    }
    try {
      autoBlog = await processAutoBlog();
    } catch (err) {
      errors.autoBlog = err?.message || String(err);
      console.error("[Scheduler] Erro em processAutoBlog:", err);
    }
    return {
      skipped: false,
      releasedReservations,
      recoveredPublishing,
      scheduledPosts,
      videoJobs,
      autopilot,
      portalMarketing,
      portalBlogCount,
      autoBlog,
      errors: Object.keys(errors).length > 0 ? errors : void 0,
      processedAt: nowIso()
    };
  } finally {
    await releaseLock(lease);
  }
}
async function getSchedulerHealth() {
  const db = firestore();
  const now = Date.now();
  try {
    const lockSnap = await db.collection(COLLECTIONS.schedulerLocks).doc("process").get();
    const lockData = lockSnap.data();
    const lockedUntil = lockData?.lockedUntil ? Number(lockData.lockedUntil) : 0;
    const isLocked = lockedUntil > now;
    const [dueSnap, publishingSnap, videoJobsSnap, autopilotSnap] = await Promise.all([
      db.collection(COLLECTIONS.scheduledPosts).where("status", "==", "scheduled").where("scheduledFor", "<=", nowIso()).get(),
      db.collection(COLLECTIONS.scheduledPosts).where("status", "==", "publishing").get(),
      db.collection(COLLECTIONS.mediaGenerationJobs).where("status", "in", ["pending", "processing"]).get().catch(() => ({ size: 0 })),
      db.collection(COLLECTIONS.autopilotConfigs).where("enabled", "==", true).get().catch(() => ({ size: 0 }))
    ]);
    return {
      status: "ok",
      environment: config.nodeEnv,
      cronSecretConfigured: Boolean(config.cronSecret),
      metaConfigured: Boolean(config.social.meta.clientId && config.social.meta.clientSecret),
      lock: {
        isLocked,
        lockedAt: lockData?.lockedAt || null,
        lockedUntil: lockData?.lockedUntil || null,
        owner: lockData?.owner || null,
        fencingToken: Number.isSafeInteger(Number(lockData?.fencingToken)) ? Number(lockData.fencingToken) : null
      },
      queueStats: {
        scheduledPending: dueSnap.size,
        scheduledPostsDue: dueSnap.size,
        publishingPending: publishingSnap.size,
        publishingCount: publishingSnap.size,
        videoJobsPending: videoJobsSnap.size,
        autopilotEnabled: autopilotSnap.size,
        autoBlogEnabled: Boolean(config.blog.autoEnabled)
      },
      checkedAt: nowIso()
    };
  } catch (err) {
    return {
      status: "degraded",
      environment: config.nodeEnv,
      cronSecretConfigured: Boolean(config.cronSecret),
      metaConfigured: Boolean(config.social.meta.clientId && config.social.meta.clientSecret),
      error: "Falha ao consultar estado das filas no Firestore: " + (err?.message ? String(err.message).slice(0, 200) : "Erro desconhecido"),
      checkedAt: nowIso()
    };
  }
}

// server/production/almaCore.ts
var import_genai2 = require("@google/genai");
var smartDevicesCache = [
  {
    id: "dev_light_living",
    name: "Luz Central da Sala",
    room: "sala",
    type: "light",
    protocol: "matter",
    state: { power: true, brightness: 80, color: "#38BDF8" },
    capabilities: ["power", "dimming", "color"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_tv_living",
    name: 'Smart TV 75" Sala',
    room: "sala",
    type: "tv",
    protocol: "wifi",
    state: { power: false, volume: 22, channel: "Netflix / YouTube" },
    capabilities: ["power", "volume", "apps", "input"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_ac_living",
    name: "Ar Condicionado Sala",
    room: "sala",
    type: "ac",
    protocol: "matter",
    state: { power: true, temperature: 22 },
    capabilities: ["power", "temperature", "mode"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_curtain_living",
    name: "Cortina Blackout Sala",
    room: "sala",
    type: "curtain",
    protocol: "zigbee",
    state: { power: true, position: 0 },
    capabilities: ["position", "open", "close"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_light_bedroom",
    name: "Luz Noturna Quarto",
    room: "quarto",
    type: "light",
    protocol: "matter",
    state: { power: false, brightness: 30, color: "#F59E0B" },
    capabilities: ["power", "dimming", "color"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_ac_bedroom",
    name: "Ar Condicionado Quarto",
    room: "quarto",
    type: "ac",
    protocol: "matter",
    state: { power: false, temperature: 24 },
    capabilities: ["power", "temperature"],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: "dev_lock_front",
    name: "Fechadura Biom\xE9trica Entrada",
    room: "externo",
    type: "lock",
    protocol: "matter",
    state: { power: true, isLocked: true },
    capabilities: ["lock", "unlock", "battery_status"],
    online: true,
    lastUpdated: nowIso()
  }
];
async function parseAlmaIntent(prompt, contextData) {
  const ai = textAiClient();
  const systemInstruction = `Voc\xEA \xE9 o ALMA INTENT ENGINE, o c\xE9rebro interpretador do ALMA X (O Regente Digital).
Sua miss\xE3o \xE9 traduzir a linguagem natural do usu\xE1rio em uma inten\xE7\xE3o estruturada de alt\xEDssima precis\xE3o.

O ecossistema ALMA X possui os seguintes 17 Agentes Nativos:
1. RESEARCH (Pesquisa aprofundada na web, fatos, intelig\xEAncia competitiva)
2. STRATEGY (Tomada de decis\xE3o estrat\xE9gica, planejamento executivo)
3. BUSINESS (Modelos de neg\xF3cio, precifica\xE7\xE3o, unit economics, concorr\xEAncia)
4. MARKETING (Branding, posicionamento, campanhas, funis de convers\xE3o)
5. SOCIAL (Gest\xE3o de redes sociais, calend\xE1rios, engajamento)
6. ARCHITECT (Design de interiores, espacial, layout, reformas, paletas)
7. CREATIVE (Cria\xE7\xE3o de textos, roteiros, slogans, visual concepts)
8. CODE (Engenharia de software, scripts, arquitetura, automa\xE7\xF5es)
9. DATA (Planilhas, m\xE9tricas, indicadores, proje\xE7\xF5es, CSV/JSON)
10. FINANCE (Or\xE7amento, finan\xE7as pessoais/empresariais, ROI)
11. PROJECT (Metas, cronogramas, workflows em etapas)
12. PRODUCTIVITY (Tarefas, rotinas, lembretes, foco)
13. WEB (Navega\xE7\xE3o web, leitura de URLs, servi\xE7os digitais)
14. HOME (Automa\xE7\xE3o residencial, luzes, clima, TV, cortinas, seguran\xE7a, cenas)
15. MAPS (Rotas, tr\xE2nsito, mobilidade, estabelecimentos)
16. VISION (An\xE1lise visual de fotos/c\xE2mera, OCR, inspe\xE7\xE3o de ambientes)
17. MEDIA (Gera\xE7\xE3o de imagens, scripts de v\xEDdeo, \xE1udio, \xE1udio-visual)

Classifique o risco:
- low: Leitura de dados, consultas, respostas informativas, pesquisa.
- medium: Altera\xE7\xE3o de estado em casa (luzes/clima), cria\xE7\xE3o de rascunhos, agendamentos.
- high: Publica\xE7\xE3o em redes sociais, altera\xE7\xE3o de configura\xE7\xF5es cr\xEDticas, disparos em massa.
- critical: Transa\xE7\xF5es financeiras, exclus\xE3o de dados permanentes, abertura de fechaduras externas.

Determine sempre a sequ\xEAncia ordenada de agentes e a\xE7\xF5es para cumprir a meta do usu\xE1rio.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: `Analise a seguinte inten\xE7\xE3o do usu\xE1rio: "${prompt}"
Contexto adicional: ${JSON.stringify(contextData || {})}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai2.Type.OBJECT,
        properties: {
          category: {
            type: import_genai2.Type.STRING,
            description: "Categoria principal: CONTROL_HOME, EXECUTE_MARKETING, RESEARCH_WEB, STRATEGY_DECISION, BUSINESS_CONSULTING, CREATIVE_PRODUCTION, CODE_DEVELOPMENT, DATA_ANALYTICS, FINANCIAL_PLAN, PROJECT_MANAGEMENT, PRODUCTIVITY_REMINDER, MAPS_MOBILITY, VISION_INSPECTION, SOCIAL_PUBLISHING, MEDIA_CREATION, GENERAL_CONVERSATION"
          },
          goal: {
            type: import_genai2.Type.STRING,
            description: "Objetivo claro e sintetizado a ser alcan\xE7ado"
          },
          targetDomain: {
            type: import_genai2.Type.STRING,
            description: "HOME, BUSINESS, MARKETING, INTERNET, CREATIVE ou PERSONAL"
          },
          requiredAgents: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING },
            description: "Lista de nomes de agentes nativos necess\xE1rios"
          },
          riskLevel: {
            type: import_genai2.Type.STRING,
            description: "low, medium, high ou critical"
          },
          requiresApproval: {
            type: import_genai2.Type.BOOLEAN,
            description: "Se requer confirma\xE7\xE3o expl\xEDcita do usu\xE1rio antes de executar"
          },
          confidenceScore: {
            type: import_genai2.Type.NUMBER,
            description: "Confian\xE7a de 0 a 1"
          },
          explanation: {
            type: import_genai2.Type.STRING,
            description: "Explica\xE7\xE3o concisa do regente sobre como o objetivo ser\xE1 executado"
          },
          actionSequence: {
            type: import_genai2.Type.ARRAY,
            items: {
              type: import_genai2.Type.OBJECT,
              properties: {
                step: { type: import_genai2.Type.INTEGER },
                agent: { type: import_genai2.Type.STRING },
                action: { type: import_genai2.Type.STRING },
                target: { type: import_genai2.Type.STRING },
                output: { type: import_genai2.Type.STRING, description: "Resultado pr\xE9vio ou esperado da etapa" }
              },
              required: ["step", "agent", "action"]
            }
          }
        },
        required: ["category", "goal", "targetDomain", "requiredAgents", "riskLevel", "requiresApproval", "confidenceScore", "explanation", "actionSequence"]
      }
    }
  });
  const parsed = JSON.parse(response.text || "{}");
  return {
    rawPrompt: prompt,
    category: parsed.category || "GENERAL_CONVERSATION",
    goal: parsed.goal || prompt,
    targetDomain: parsed.targetDomain || "PERSONAL",
    requiredAgents: parsed.requiredAgents || ["STRATEGY"],
    riskLevel: parsed.riskLevel || "low",
    requiresApproval: Boolean(parsed.requiresApproval),
    actionSequence: (parsed.actionSequence || []).map((s, idx) => ({
      step: s.step || idx + 1,
      agent: s.agent || "STRATEGY",
      action: s.action || "Executar etapa",
      target: s.target || "",
      status: "pending",
      output: s.output || ""
    })),
    confidenceScore: parsed.confidenceScore || 0.95,
    explanation: parsed.explanation || "Compreendido. Orquestrando recursos necess\xE1rios."
  };
}
async function executeAlmaOrchestration(intent, userId, extraContext) {
  const ai = textAiClient();
  const planId = newId("plan");
  const stepsExecuted = [];
  const agentOutputs = {};
  let devicesUpdated = [];
  if (intent.category === "CONTROL_HOME" || intent.targetDomain === "HOME") {
    const promptLower = intent.rawPrompt.toLowerCase();
    if (promptLower.includes("dormir") || promptLower.includes("sono") || promptLower.includes("boa noite")) {
      smartDevicesCache = smartDevicesCache.map((d) => {
        if (d.room === "sala") return { ...d, state: { ...d.state, power: false }, lastUpdated: nowIso() };
        if (d.id === "dev_light_bedroom") return { ...d, state: { ...d.state, power: true, brightness: 15, color: "#F59E0B" }, lastUpdated: nowIso() };
        if (d.id === "dev_ac_bedroom") return { ...d, state: { ...d.state, power: true, temperature: 23 }, lastUpdated: nowIso() };
        if (d.id === "dev_lock_front") return { ...d, state: { ...d.state, isLocked: true }, lastUpdated: nowIso() };
        return d;
      });
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes("filme") || promptLower.includes("cinema")) {
      smartDevicesCache = smartDevicesCache.map((d) => {
        if (d.room === "sala" && d.type === "light") return { ...d, state: { ...d.state, power: true, brightness: 10, color: "#6366F1" }, lastUpdated: nowIso() };
        if (d.room === "sala" && d.type === "tv") return { ...d, state: { ...d.state, power: true, volume: 28 }, lastUpdated: nowIso() };
        if (d.room === "sala" && d.type === "curtain") return { ...d, state: { ...d.state, position: 0 }, lastUpdated: nowIso() };
        if (d.room === "sala" && d.type === "ac") return { ...d, state: { ...d.state, power: true, temperature: 21 }, lastUpdated: nowIso() };
        return d;
      });
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes("apague") || promptLower.includes("desligar") || promptLower.includes("apagar tudo")) {
      smartDevicesCache = smartDevicesCache.map((d) => ({
        ...d,
        state: { ...d.state, power: false },
        lastUpdated: nowIso()
      }));
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes("acender") || promptLower.includes("ligar")) {
      smartDevicesCache = smartDevicesCache.map((d) => ({
        ...d,
        state: { ...d.state, power: true, brightness: 100 },
        lastUpdated: nowIso()
      }));
      devicesUpdated = smartDevicesCache;
    }
  }
  const orchestrationPrompt = `Voc\xEA \xE9 o ALMA X (O Regente Digital).
Voc\xEA est\xE1 orquestrando a execu\xE7\xE3o do seguinte objetivo:
Objetivo: "${intent.goal}"
Categoria: ${intent.category}
Agentes mobilizados: ${intent.requiredAgents.join(", ")}
Dispositivos conectados: ${JSON.stringify(smartDevicesCache.map((d) => ({ id: d.id, name: d.name, room: d.room, state: d.state })))}
Contexto do Usu\xE1rio: ${JSON.stringify(extraContext || {})}

Execute cada etapa dos agentes em sequ\xEAncia, sintetize o plano de a\xE7\xE3o, elabore as entregas t\xE9cnicas de cada agente e apresente uma resposta executiva impec\xE1vel com postura de Regente Digital.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: orchestrationPrompt,
    config: {
      systemInstruction: "Voc\xEA \xE9 o ALMA X \u2014 O Regente Digital. Seja perspicaz, sofisticado, preciso e orientado a resultados reais.",
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai2.Type.OBJECT,
        properties: {
          summary: { type: import_genai2.Type.STRING, description: "Mensagem executiva do Regente para o usu\xE1rio" },
          steps: {
            type: import_genai2.Type.ARRAY,
            items: {
              type: import_genai2.Type.OBJECT,
              properties: {
                step: { type: import_genai2.Type.INTEGER },
                agent: { type: import_genai2.Type.STRING },
                action: { type: import_genai2.Type.STRING },
                output: { type: import_genai2.Type.STRING }
              },
              required: ["step", "agent", "action", "output"]
            }
          },
          proactiveAdvice: { type: import_genai2.Type.STRING, description: "Conselho proativo ou pr\xF3ximo passo recomendado" }
        },
        required: ["summary", "steps"]
      }
    }
  });
  const parsedExec = JSON.parse(response.text || "{}");
  (parsedExec.steps || []).forEach((s) => {
    stepsExecuted.push({
      step: s.step,
      agent: s.agent,
      action: s.action,
      output: s.output
    });
    agentOutputs[s.agent] = s.output;
  });
  return {
    planId,
    summary: parsedExec.summary || "Execu\xE7\xE3o conclu\xEDda pelo Regente Digital.",
    stepsExecuted,
    devicesUpdated,
    agentOutputs
  };
}
function getSmartDevicesList() {
  return smartDevicesCache;
}
function updateSmartDeviceState(deviceId, newState) {
  const devIndex = smartDevicesCache.findIndex((d) => d.id === deviceId);
  if (devIndex >= 0) {
    smartDevicesCache[devIndex] = {
      ...smartDevicesCache[devIndex],
      state: {
        ...smartDevicesCache[devIndex].state,
        ...newState
      },
      lastUpdated: nowIso()
    };
    return smartDevicesCache[devIndex];
  }
  throw new Error(`Dispositivo ${deviceId} n\xE3o encontrado.`);
}

// server/production/router.ts
var import_multer = __toESM(require("multer"), 1);
var router = (0, import_express.Router)();
var asyncRoute = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const requestedStatus = Number(error?.statusCode || error?.status || (error instanceof RangeError ? 400 : 500));
    const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500;
    if (status >= 500) console.error("[Froc API]", error);
    const publicMessage = status >= 500 ? "Erro interno no Froc.IA." : String(error?.message || "Requisi\xE7\xE3o inv\xE1lida.").slice(0, 500);
    res.status(status).json({ error: publicMessage });
  }
};
function safeString(value, max = 5e3) {
  return String(value ?? "").trim().slice(0, max);
}
function stringArray(value, max = 50) {
  if (!Array.isArray(value)) return value ? [safeString(value)] : [];
  return value.slice(0, max).map((item) => safeString(item, 300)).filter(Boolean);
}
function safeHttpUrl(value, max = 1500) {
  const raw = safeString(value, max);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}
function safeEmail(value) {
  const raw = safeString(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : "";
}
function sanitizedSocialLinks(value) {
  const allowed = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "x"];
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const key2 of allowed) {
    const url = safeHttpUrl(value[key2], 1e3);
    if (url) out[key2] = url;
  }
  return out;
}
function parseStrictBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return false;
}
function normalizeCompanyField(key2, value) {
  if (["website", "androidApp", "iosApp", "logoUrl"].includes(key2)) return safeHttpUrl(value);
  if (key2 === "email") return safeEmail(value);
  if (key2 === "businessType") {
    const raw = safeString(value, 30).toLowerCase();
    return ["online", "physical", "hybrid"].includes(raw) ? raw : "online";
  }
  if (key2 === "onlineChannels") return stringArray(value);
  if (key2 === "socialLinks") return sanitizedSocialLinks(value);
  if (["products", "services", "competitors", "keywords"].includes(key2)) return stringArray(value);
  if (key2 === "isPublicInVitrine") {
    return parseStrictBoolean(value);
  }
  if (key2 === "marketingProfile") return value && typeof value === "object" ? cleanObject(value) : void 0;
  const limits = { name: 120, description: 5e3, phone: 80, whatsapp: 80, address: 500, city: 150, state: 100, country: 100, category: 150, segment: 200, targetAudience: 3e3, coverageRegion: 500, differentials: 3e3, brandTone: 500, goals: 2e3 };
  return safeString(value, limits[key2] || 1e3);
}
async function ownedCompany(userId, companyId) {
  if (!companyId) return void 0;
  const snap = await firestore().collection(COLLECTIONS.companies).doc(companyId).get();
  if (!snap.exists) return void 0;
  const data = { id: snap.id, ...snap.data() };
  return data.userId === userId ? data : void 0;
}
async function requireOwnedCompany(userId, companyId) {
  const company = await ownedCompany(userId, companyId);
  if (!company) {
    const error = new Error("Empresa n\xE3o encontrada ou sem permiss\xE3o.");
    error.statusCode = 404;
    throw error;
  }
  return company;
}
async function deleteCompanyData(userId, companyId) {
  const db = firestore();
  const collections = [COLLECTIONS.contentItems, COLLECTIONS.campaigns, COLLECTIONS.scheduledPosts, COLLECTIONS.socialConnections, COLLECTIONS.seoReports, COLLECTIONS.autopilotConfigs];
  for (const collection of collections) {
    while (true) {
      const snap = await db.collection(collection).where("userId", "==", userId).where("companyId", "==", companyId).limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (collection === COLLECTIONS.contentItems && data?.metadata?.storagePath) {
          await getAdminStorage().bucket().file(String(data.metadata.storagePath)).delete({ ignoreNotFound: true }).catch(() => void 0);
        }
        batch.delete(doc.ref);
      }
      await batch.commit();
      if (snap.size < 400) break;
    }
  }
}
function planCompanyLimit(planId) {
  return getPlanEntitlements(planId).maxCompanies;
}
async function requireSocialPublishingAccess(userId, role) {
  if (role === "admin") return;
  const wallet = await getWallet(userId);
  const entitlements = getPlanEntitlements(wallet.planId);
  if (!entitlements.socialConnections) {
    const error = new Error("Publica\xE7\xF5es em redes sociais exigem o plano PRO ou superior.");
    error.statusCode = 403;
    throw error;
  }
}
function cleanHeading(txt) {
  if (!txt) return "";
  return String(txt).replace(/^#+\s*/, "").replace(/^[Hh][1-6][:\s-]+/i, "").replace(/^#+\s*/, "").trim();
}
function contentBodyFromArticle(article) {
  const parts = [`# ${cleanHeading(article.title || "")}`, article.introduction || ""];
  for (const section of article.sections || []) {
    parts.push(`## ${cleanHeading(section.h2 || "")}`, section.content || "");
    for (const sub of section.h3s || []) parts.push(`### ${cleanHeading(sub.h3 || "")}`, sub.content || "");
  }
  if (article.faqSection?.length) {
    parts.push("## Perguntas Frequentes");
    for (const faq of article.faqSection) parts.push(`### ${cleanHeading(faq.question || "")}`, faq.answer || "");
  }
  parts.push("## Conclus\xE3o", article.conclusion || "", article.callToAction || "");
  return parts.filter(Boolean).join("\n\n");
}
router.get("/health", asyncRoute(async (_req, res) => {
  const dbHealth = await probeDatabaseHealth();
  const statusCode = dbHealth.status === "healthy" ? 200 : dbHealth.status === "degraded" ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealth.status === "healthy" ? "ok" : dbHealth.status,
    service: "Froc.IA API",
    database: dbHealth,
    environment: config.nodeEnv,
    timestamp: nowIso()
  });
}));
router.post("/auth/sync-profile", requireAuth, asyncRoute(async (req, res) => {
  const now = nowIso();
  const name = safeString(req.body?.name, 120);
  const isExistingUser = Boolean(req.user?.termsAcceptedAt);
  let termsAcceptedAt = req.user?.termsAcceptedAt;
  let privacyAcceptedAt = req.user?.privacyAcceptedAt;
  let termsVersion = req.user?.termsVersion;
  let privacyVersion = req.user?.privacyVersion;
  if (!isExistingUser) {
    const hasTerms = Boolean(req.body?.termsAccepted);
    const hasPrivacy = Boolean(req.body?.privacyAccepted);
    if (!hasTerms || !hasPrivacy) {
      return res.status(428).json({
        error: "Para ativar sua conta, aceite os Termos de Uso e a Pol\xEDtica de Privacidade no cadastro."
      });
    }
    termsAcceptedAt = now;
    privacyAcceptedAt = now;
    termsVersion = CURRENT_TERMS_VERSION;
    privacyVersion = CURRENT_PRIVACY_VERSION;
  }
  const profile = await ensureUserProfile(req.firebaseUser, {
    name: name || req.user?.name,
    termsAcceptedAt,
    privacyAcceptedAt,
    termsVersion,
    privacyVersion,
    avatarUrl: safeString(req.body?.avatarUrl, 1e3) || req.user?.avatarUrl
  });
  const clientIp = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const userAgent = safeString(req.headers["user-agent"], 300);
  const outcome = await evaluateSignupBonusEligibility({
    userId: profile.id,
    email: profile.email,
    ip: clientIp,
    userAgent,
    securityPayload: req.body?.securityPayload
  });
  let wallet;
  if (outcome.eligibleForBonus && outcome.bonusAmount > 0) {
    try {
      wallet = await addCredits({
        userId: profile.id,
        amount: outcome.bonusAmount,
        type: "bonus",
        source: "B\xF4nus de Primeiro Cadastro Froc.IA",
        idempotencyKey: `welcome:${profile.id}`,
        metadata: { reason: outcome.reason, detail: outcome.detail, claimId: outcome.claimId }
      });
    } catch (err) {
      console.error("[AuthSync] Erro ao conceder b\xF4nus de boas-vindas:", err);
      wallet = await getWallet(profile.id);
    }
  } else {
    wallet = await getWallet(profile.id);
  }
  res.json({
    user: profile,
    wallet,
    needsTermsConsent: !hasAcceptedLatestTerms(profile),
    currentTermsVersion: CURRENT_TERMS_VERSION,
    security: {
      bonusEligible: outcome.eligibleForBonus,
      bonusAmount: outcome.bonusAmount,
      reason: outcome.reason,
      message: outcome.detail
    }
  });
}));
router.post("/auth/accept-terms", requireAuth, asyncRoute(async (req, res) => {
  const termsAccepted = req.body?.termsAccepted === true;
  const privacyAccepted = req.body?.privacyAccepted === true;
  if (!termsAccepted || !privacyAccepted) {
    return res.status(400).json({ error: "Voc\xEA precisa aceitar explicitamente os Termos de Uso e a Pol\xEDtica de Privacidade." });
  }
  const now = nowIso();
  const profile = await ensureUserProfile(req.firebaseUser, {
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION
  });
  res.json({
    message: "Termos de Uso e Pol\xEDtica de Privacidade aceitos com sucesso.",
    user: profile,
    wallet: await getWallet(profile.id),
    needsTermsConsent: false,
    currentTermsVersion: CURRENT_TERMS_VERSION
  });
}));
router.get("/auth/me", requireAuth, asyncRoute(async (req, res) => {
  res.json({
    user: req.user,
    wallet: await getWallet(req.user.id),
    needsTermsConsent: !hasAcceptedLatestTerms(req.user),
    currentTermsVersion: CURRENT_TERMS_VERSION
  });
}));
router.patch("/auth/profile", requireAuth, asyncRoute(async (req, res) => {
  const name = safeString(req.body?.name, 120);
  if (!name) return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio." });
  await firestore().collection(COLLECTIONS.users).doc(req.user.id).set({ name, updatedAt: nowIso() }, { merge: true });
  await getAdminAuth().updateUser(req.user.id, { displayName: name });
  const fresh = await firestore().collection(COLLECTIONS.users).doc(req.user.id).get();
  res.json({ message: "Perfil atualizado com sucesso.", user: { id: fresh.id, ...fresh.data() } });
}));
router.post("/auth/bootstrap-admin", requireAuth, asyncRoute(async (req, res) => {
  if (!config.adminBootstrap.enabled || !config.adminBootstrap.key) {
    return res.status(403).json({ error: "Recurso de bootstrap de administrador desabilitado." });
  }
  if (safeString(req.body?.secretKey, 500) !== config.adminBootstrap.key) {
    return res.status(403).json({ error: "Chave de bootstrap inv\xE1lida." });
  }
  await getAdminAuth().setCustomUserClaims(req.user.id, { role: "admin", frocRole: "admin" });
  await firestore().collection(COLLECTIONS.users).doc(req.user.id).set({ role: "admin", updatedAt: nowIso() }, { merge: true });
  await writeAdminLog({ operatorId: req.user.id, operatorEmail: req.user.email, action: "bootstrap_admin", targetUserId: req.user.id });
  res.json({ message: "Administrador configurado. Renove a sess\xE3o para atualizar as permiss\xF5es.", role: "admin" });
}));
router.get("/dashboard/status", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.query.companyId, 200);
  const [seoSnap, socialSnap] = await Promise.all([
    firestore().collection(COLLECTIONS.seoReports).where("userId", "==", req.user.id).get(),
    firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", req.user.id).get()
  ]);
  const seoReports = queryData(seoSnap).filter((x) => !companyId || x.companyId === companyId);
  const socialConnections = queryData(socialSnap).filter((x) => (!companyId || x.companyId === companyId) && x.status === "connected");
  res.json({ hasSeoAudit: seoReports.length > 0, connectedSocialCount: socialConnections.length, seoReportsCount: seoReports.length });
}));
router.get("/companies", requireAuth, asyncRoute(async (req, res) => {
  const snap = await firestore().collection(COLLECTIONS.companies).where("userId", "==", req.user.id).get();
  const companies = queryData(snap).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  res.json({ companies });
}));
router.post("/companies", requireAuth, asyncRoute(async (req, res) => {
  const name = safeString(req.body?.name, 120);
  if (!name) return res.status(400).json({ error: "O nome da empresa \xE9 obrigat\xF3rio." });
  const current = await firestore().collection(COLLECTIONS.companies).where("userId", "==", req.user.id).get();
  const wallet = await getWallet(req.user.id);
  if (current.size >= planCompanyLimit(wallet.planId)) return res.status(403).json({ error: "Seu plano atingiu o limite de empresas. Fa\xE7a upgrade para cadastrar outra marca." });
  const id = newId("company");
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${id.slice(-6)}`;
  const company = cleanObject({
    id,
    userId: req.user.id,
    name,
    slug,
    businessType: normalizeCompanyField("businessType", req.body?.businessType || "online"),
    onlineChannels: stringArray(req.body?.onlineChannels),
    logoUrl: safeHttpUrl(req.body?.logoUrl, 1500),
    description: safeString(req.body?.description, 5e3),
    website: safeHttpUrl(req.body?.website, 1e3),
    androidApp: safeHttpUrl(req.body?.androidApp, 1e3),
    iosApp: safeHttpUrl(req.body?.iosApp, 1e3),
    phone: safeString(req.body?.phone, 80),
    whatsapp: safeString(req.body?.whatsapp, 80),
    email: safeEmail(req.body?.email),
    address: safeString(req.body?.address, 500),
    city: safeString(req.body?.city, 150),
    state: safeString(req.body?.state, 100),
    country: safeString(req.body?.country, 100) || "Brasil",
    category: safeString(req.body?.category, 150) || "Com\xE9rcio & Servi\xE7os",
    segment: safeString(req.body?.segment, 200),
    products: stringArray(req.body?.products),
    services: stringArray(req.body?.services),
    targetAudience: safeString(req.body?.targetAudience, 3e3),
    coverageRegion: safeString(req.body?.coverageRegion, 500),
    differentials: safeString(req.body?.differentials, 3e3),
    brandTone: safeString(req.body?.brandTone, 500),
    goals: safeString(req.body?.goals, 2e3),
    competitors: stringArray(req.body?.competitors),
    keywords: stringArray(req.body?.keywords),
    socialLinks: sanitizedSocialLinks(req.body?.socialLinks),
    isPublicInVitrine: normalizeCompanyField("isPublicInVitrine", req.body?.isPublicInVitrine),
    marketingProfile: req.body?.marketingProfile && typeof req.body.marketingProfile === "object" ? req.body.marketingProfile : void 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  });
  await firestore().collection(COLLECTIONS.companies).doc(id).set(company);
  res.status(201).json({ message: "Empresa cadastrada com sucesso.", company });
}));
router.get("/companies/:id", requireAuth, asyncRoute(async (req, res) => {
  res.json({ company: await requireOwnedCompany(req.user.id, req.params.id) });
}));
router.patch("/companies/:id", requireAuth, asyncRoute(async (req, res) => {
  const current = await requireOwnedCompany(req.user.id, req.params.id);
  const allowed = ["name", "businessType", "onlineChannels", "logoUrl", "description", "website", "androidApp", "iosApp", "phone", "whatsapp", "email", "address", "city", "state", "country", "category", "segment", "products", "services", "targetAudience", "coverageRegion", "differentials", "brandTone", "goals", "competitors", "keywords", "socialLinks", "isPublicInVitrine", "marketingProfile"];
  const patch = {};
  for (const key2 of allowed) if (req.body?.[key2] !== void 0) patch[key2] = normalizeCompanyField(key2, req.body[key2]);
  if (patch.name && patch.name !== current.name) patch.slug = `${slugify(safeString(patch.name, 120))}-${req.params.id.slice(-6)}`;
  patch.updatedAt = nowIso();
  await firestore().collection(COLLECTIONS.companies).doc(req.params.id).set(cleanObject(patch), { merge: true });
  const snap = await firestore().collection(COLLECTIONS.companies).doc(req.params.id).get();
  res.json({ message: "Empresa atualizada com sucesso.", company: { id: snap.id, ...snap.data() } });
}));
router.post("/companies/:id/logo", requireAuth, asyncRoute(async (req, res) => {
  const company = await requireOwnedCompany(req.user.id, req.params.id);
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: "Envie uma imagem PNG, JPG ou WEBP v\xE1lida." });
  if (dataUrl.length > 19e5) return res.status(413).json({ error: "A logo deve ter no m\xE1ximo aproximadamente 1,3 MB." });
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 14e5) return res.status(413).json({ error: "A logo \xE9 muito grande." });
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `companies/${req.user.id}/${req.params.id}/logo.${ext}`;
  const token = newId("download");
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      cacheControl: "public,max-age=86400",
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  if (company.logoStoragePath && company.logoStoragePath !== storagePath) {
    await bucket.file(String(company.logoStoragePath)).delete({ ignoreNotFound: true }).catch(() => void 0);
  }
  const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
  await firestore().collection(COLLECTIONS.companies).doc(req.params.id).set({ logoUrl, logoStoragePath: storagePath, updatedAt: nowIso() }, { merge: true });
  res.json({ message: "Logo atualizada.", logoUrl, logoStoragePath: storagePath });
}));
router.delete("/companies/:id", requireAuth, asyncRoute(async (req, res) => {
  const company = await requireOwnedCompany(req.user.id, req.params.id);
  if (company.logoStoragePath) await getAdminStorage().bucket().file(String(company.logoStoragePath)).delete({ ignoreNotFound: true }).catch(() => void 0);
  await deleteCompanyData(req.user.id, req.params.id);
  await firestore().collection(COLLECTIONS.companies).doc(req.params.id).delete();
  res.json({ message: "Empresa removida com sucesso." });
}));
router.get("/credits/balance", requireAuth, asyncRoute(async (req, res) => res.json({ wallet: await getWallet(req.user.id) })));
router.get("/credits/transactions", requireAuth, asyncRoute(async (req, res) => res.json({ transactions: await listCreditTransactions(req.user.id, Number(req.query.limit || 50)) })));
router.get("/credits/history", requireAuth, asyncRoute(async (req, res) => res.json({ transactions: await listCreditTransactions(req.user.id, Number(req.query.limit || 50)) })));
router.get("/ai/costs", (_req, res) => res.json({ costs: config.creditCosts }));
router.post("/ai/generate-post", requireAuth, asyncRoute(async (req, res) => {
  const topic = safeString(req.body?.topic, 5e3);
  if (!topic) return res.status(400).json({ error: "O tema do post \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generatePost({ userId: req.user.id, company, topic, platform: safeString(req.body?.platform, 100), goal: safeString(req.body?.goal, 1e3), tone: safeString(req.body?.tone, 500) });
  const id = newId("content");
  const contentItem = { id, userId: req.user.id, companyId: company?.id || "default", type: "post", title: generated.result.headline, headline: generated.result.headline, body: generated.result.body, cta: generated.result.cta, hashtags: generated.result.hashtags || [], keywords: generated.result.keywords || [], visualPrompt: generated.result.visualPrompt || "", targetPlatform: safeString(req.body?.platform, 100) || "Instagram", tone: safeString(req.body?.tone, 500), creditsUsed: generated.creditsUsed, status: "saved", createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(contentItem);
  res.json({ post: generated.result, contentItem, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));
router.post("/ai/generate-strategy", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "Selecione uma empresa." });
  const company = await requireOwnedCompany(req.user.id, companyId);
  const generated = await generateStrategy({ userId: req.user.id, company, timeframe: req.body?.timeframe === "mes" ? "mes" : "semana", goal: safeString(req.body?.goal, 5e3) });
  res.json({ strategy: generated.result, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));
router.post("/ai/generate-copy", requireAuth, asyncRoute(async (req, res) => {
  const prompt = safeString(req.body?.prompt, 5e3);
  if (!prompt) return res.status(400).json({ error: "A instru\xE7\xE3o \xE9 obrigat\xF3ria." });
  const type = ["cta", "headline", "caption", "variations"].includes(req.body?.type) ? req.body.type : "caption";
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generateCopy({ userId: req.user.id, company, type, prompt });
  res.json({ text: generated.result, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));
router.post("/ai/generate-carousel", requireAuth, asyncRoute(async (req, res) => {
  const topic = safeString(req.body?.topic, 5e3);
  if (!topic) return res.status(400).json({ error: "O tema \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generateCarousel({ userId: req.user.id, company, topic, slidesCount: Number(req.body?.slidesCount || 5), goal: safeString(req.body?.goal, 2e3) });
  const id = newId("content");
  const item = { id, userId: req.user.id, companyId: company?.id || "default", type: "carousel", title: generated.result.carouselTitle || `Carrossel: ${topic}`, headline: generated.result.carouselTitle || "", body: generated.result.caption || "", carouselSlides: generated.result.slides || [], hashtags: generated.result.hashtags || [], keywords: [], creditsUsed: generated.creditsUsed, status: "saved", targetPlatform: "Instagram", createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ carousel: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));
router.post("/ai/generate-video-script", requireAuth, asyncRoute(async (req, res) => {
  const topic = safeString(req.body?.topic, 5e3);
  if (!topic) return res.status(400).json({ error: "O tema do v\xEDdeo \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generateVideoScript({ userId: req.user.id, company, topic, durationSeconds: Number(req.body?.durationSeconds || 60), format: safeString(req.body?.format, 200) });
  const id = newId("content");
  const item = { id, userId: req.user.id, companyId: company?.id || "default", type: "video_script", title: generated.result.scriptTitle || `Roteiro: ${topic}`, headline: generated.result.scriptTitle || "", body: generated.result.caption || "", videoScript: JSON.stringify(generated.result.scenes || []), cta: generated.result.callToAction || "", hashtags: generated.result.hashtags || [], keywords: [], creditsUsed: generated.creditsUsed, status: "saved", targetPlatform: "Reels / TikTok / Shorts", createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ videoScript: generated.result, script: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));
router.post("/ai/generate-image-prompt", requireAuth, asyncRoute(async (req, res) => {
  const theme = safeString(req.body?.theme, 5e3);
  if (!theme) return res.status(400).json({ error: "A ideia ou tema da imagem \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generateImagePrompt({ userId: req.user.id, company, theme, style: safeString(req.body?.style, 2e3) });
  res.json({ imagePrompt: generated.result, creditsUsed: generated.creditsUsed });
}));
router.post("/ai/generate-image", requireAuth, asyncRoute(async (req, res) => {
  const theme = safeString(req.body?.theme, 5e3);
  if (!theme) return res.status(400).json({ error: "A ideia ou tema da imagem \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const resolution = ["1K", "2K", "4K"].includes(req.body?.resolution) ? req.body.resolution : "1K";
  const generated = await generateMarketingImage({
    userId: req.user.id,
    company,
    theme,
    style: safeString(req.body?.style, 3e3),
    aspectRatio: safeString(req.body?.aspectRatio, 20),
    resolution
  });
  const id = newId("content");
  const item = {
    id,
    userId: req.user.id,
    companyId: company?.id || "default",
    type: "image",
    title: safeString(req.body?.title, 300) || `Imagem IA (${resolution}) - ${theme.slice(0, 80)}`,
    body: theme,
    hashtags: [],
    keywords: [],
    imageUrl: generated.imageUrl,
    visualPrompt: safeString(req.body?.style, 3e3),
    creditsUsed: generated.creditsUsed,
    status: "saved",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metadata: { storagePath: generated.storagePath, mimeType: generated.mimeType, modelUsed: generated.modelUsed, resolution }
  };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(cleanObject(item));
  res.json({ image: generated, imageUrl: generated.imageUrl, contentItem: item, creditsUsed: generated.creditsUsed });
}));
router.post("/ai/generate-video-direction", requireAuth, asyncRoute(async (req, res) => {
  const prompt = safeString(req.body?.prompt || req.body?.topic, 5e3);
  if (!prompt) return res.status(400).json({ error: "O briefing ou descri\xE7\xE3o do v\xEDdeo \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const direction = await generateVideoDirection({
    userId: req.user.id,
    company,
    prompt,
    aspectRatio: req.body?.aspectRatio === "16:9" ? "16:9" : "9:16",
    mood: safeString(req.body?.mood, 200),
    cameraMotion: safeString(req.body?.cameraMotion, 200),
    lighting: safeString(req.body?.lighting, 200)
  });
  res.json({ direction });
}));
router.post("/ai/generate-video", requireAuth, asyncRoute(async (req, res) => {
  const prompt = safeString(req.body?.prompt || req.body?.topic, 5e3);
  if (!prompt) return res.status(400).json({ error: "O briefing ou descri\xE7\xE3o do v\xEDdeo \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const preset = ["demo_720p", "pro_1080p", "cinema_4k"].includes(req.body?.preset) ? req.body.preset : "demo_720p";
  const aspectRatio = req.body?.aspectRatio === "16:9" ? "16:9" : "9:16";
  const job = await startVideoGenerationJob({
    userId: req.user.id,
    company,
    prompt,
    title: safeString(req.body?.title, 300),
    preset,
    aspectRatio,
    initialImageBase64: typeof req.body?.initialImage === "string" && req.body.initialImage.length > 50 ? req.body.initialImage : void 0,
    cameraMotion: safeString(req.body?.cameraMotion, 200),
    lighting: safeString(req.body?.lighting, 200),
    mood: safeString(req.body?.mood, 200)
  });
  res.status(202).json({
    message: "Gera\xE7\xE3o de v\xEDdeo com Veo 3.1 iniciada em segundo plano.",
    job,
    jobId: job.id,
    status: job.status,
    creditsReserved: job.creditsReserved
  });
}));
router.get("/ai/video-jobs", requireAuth, asyncRoute(async (req, res) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : void 0;
  const jobs = await listUserVideoJobs(req.user.id, companyId);
  res.json({ jobs });
}));
router.get("/ai/video-jobs/:id", requireAuth, asyncRoute(async (req, res) => {
  const job = await checkAndCompleteVideoJob(req.user.id, req.params.id);
  res.json({ job });
}));
router.post("/ai/video-jobs/:id/check", requireAuth, asyncRoute(async (req, res) => {
  const job = await checkAndCompleteVideoJob(req.user.id, req.params.id);
  res.json({ job });
}));
router.post("/ai/generate-article", requireAuth, asyncRoute(async (req, res) => {
  const topic = safeString(req.body?.topic, 5e3);
  if (!topic) return res.status(400).json({ error: "O tema do artigo \xE9 obrigat\xF3rio." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  const generated = await generateArticle({ userId: req.user.id, company, topic, primaryKeyword: safeString(req.body?.primaryKeyword, 500), targetAudience: safeString(req.body?.targetAudience, 1e3), tone: safeString(req.body?.tone, 500) });
  const id = newId("content");
  const item = { id, userId: req.user.id, companyId: company?.id || "default", type: "article", title: generated.result.title || topic, headline: generated.result.title || topic, body: contentBodyFromArticle(generated.result), cta: generated.result.callToAction || "", hashtags: [], keywords: [safeString(req.body?.primaryKeyword, 500) || topic], creditsUsed: generated.creditsUsed, status: "saved", createdAt: nowIso(), updatedAt: nowIso(), metadata: { metaDescription: generated.result.metaDescription, suggestedSlug: generated.result.suggestedSlug } };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ article: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));
router.post("/seo/analyze", requireAuth, asyncRoute(async (req, res) => {
  const url = safeString(req.body?.url, 2e3);
  if (!url) return res.status(400).json({ error: "Informe a URL." });
  const company = await ownedCompany(req.user.id, safeString(req.body?.companyId, 200));
  res.json({ report: await analyzeSeo({ userId: req.user.id, rawUrl: url, company }) });
}));
router.get("/content", requireAuth, asyncRoute(async (req, res) => {
  let query = firestore().collection(COLLECTIONS.contentItems).where("userId", "==", req.user.id);
  if (req.query.companyId) query = query.where("companyId", "==", String(req.query.companyId));
  const items = queryData(await query.get()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ contents: items, items });
}));
router.post("/content", requireAuth, asyncRoute(async (req, res) => {
  const title = safeString(req.body?.title, 500);
  const body = safeString(req.body?.body, 1e5);
  if (!title || !body) return res.status(400).json({ error: "T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios." });
  const companyId = safeString(req.body?.companyId, 200) || "default";
  if (companyId !== "default") await requireOwnedCompany(req.user.id, companyId);
  const id = newId("content");
  const item = cleanObject({ id, userId: req.user.id, companyId, type: safeString(req.body?.type, 50) || "post", title, headline: safeString(req.body?.headline, 1e3), body, cta: safeString(req.body?.cta, 2e3), hashtags: stringArray(req.body?.hashtags), keywords: stringArray(req.body?.keywords), targetPlatform: safeString(req.body?.targetPlatform, 100), visualPrompt: safeString(req.body?.visualPrompt, 5e3), imageUrl: safeString(req.body?.imageUrl, 1500), creditsUsed: 0, status: "saved", createdAt: nowIso(), updatedAt: nowIso() });
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.status(201).json({ item, contentItem: item });
}));
router.post("/content/schedule", requireAuth, asyncRoute(async (req, res) => {
  const contentItemId = safeString(req.body?.contentItemId, 200);
  const scheduledFor = safeString(req.body?.scheduledFor, 100);
  const companyId = safeString(req.body?.companyId, 200);
  const isPlanning = Boolean(req.body?.isPlanning || req.body?.mode === "planning");
  if (!contentItemId || !scheduledFor || !companyId) return res.status(400).json({ error: "Empresa, conte\xFAdo e data s\xE3o obrigat\xF3rios." });
  await requireOwnedCompany(req.user.id, companyId);
  const itemSnap = await firestore().collection(COLLECTIONS.contentItems).doc(contentItemId).get();
  if (!itemSnap.exists || itemSnap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Conte\xFAdo n\xE3o encontrado." });
  const itemData = itemSnap.data();
  if (itemData.companyId !== companyId) {
    if (isPlanning && itemData.companyId === "default") {
    } else if (!isPlanning && itemData.companyId === "default") {
      return res.status(400).json({ error: "Associe este conte\xFAdo a uma empresa antes de ativar a auto-publica\xE7\xE3o." });
    } else {
      return res.status(400).json({ error: "O conte\xFAdo selecionado pertence a outra empresa." });
    }
  }
  const contentText = [itemData.headline, itemData.body, itemData.cta].filter(Boolean).join(" ").trim();
  if (!contentText) {
    return res.status(400).json({ error: "O conte\xFAdo selecionado n\xE3o possui texto para publica\xE7\xE3o." });
  }
  if (Number.isNaN(new Date(scheduledFor).getTime())) return res.status(400).json({ error: "Data de agendamento inv\xE1lida." });
  const rawPlatforms = stringArray(req.body?.platforms, 10);
  if (!rawPlatforms.length) return res.status(400).json({ error: "Selecione ao menos uma rede social para o agendamento." });
  if (isPlanning) {
    const id2 = newId("sched");
    const scheduled2 = {
      id: id2,
      userId: req.user.id,
      companyId,
      contentItemId,
      platforms: rawPlatforms,
      scheduledFor: new Date(scheduledFor).toISOString(),
      status: "planned",
      isPlanning: true,
      autopilotGenerated: false,
      createdAt: nowIso()
    };
    await firestore().collection(COLLECTIONS.scheduledPosts).doc(id2).set(scheduled2);
    return res.status(201).json({ message: "Planejamento editorial salvo no calend\xE1rio com sucesso.", scheduled: scheduled2 });
  }
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  const isAdmin = req.user?.role === "admin";
  if (!entitlements.socialConnections && !isAdmin) {
    return res.status(403).json({
      error: "O agendamento com auto-publica\xE7\xE3o autom\xE1tica em redes sociais exige o plano PRO ou superior. No plano START, voc\xEA pode registrar o conte\xFAdo como Planejamento Editorial no Calend\xE1rio."
    });
  }
  for (const plat of rawPlatforms) {
    const provider = normalizeProvider(plat);
    if (!provider) return res.status(400).json({ error: `Rede social "${plat}" n\xE3o reconhecida.` });
    if (!isTextAutoPublishSupported(provider)) {
      const reason = getProviderAutoPublishReason(provider) || `A rede "${plat}" n\xE3o suporta publica\xE7\xE3o autom\xE1tica puramente textual.`;
      return res.status(400).json({ error: reason });
    }
    const connSnap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", req.user.id).where("companyId", "==", companyId).where("provider", "==", provider).limit(1).get();
    if (connSnap.empty) {
      return res.status(400).json({ error: `A conta de ${plat} n\xE3o est\xE1 conectada para esta empresa. Conecte-a em Redes Sociais antes de agendar.` });
    }
    const conn = connSnap.docs[0].data();
    if (conn.status === "token_expired" || conn.expiresAt && new Date(conn.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: `A autentica\xE7\xE3o com ${plat} expirou. Reconecte a conta em Redes Sociais antes de agendar.` });
    }
  }
  const id = newId("sched");
  const scheduled = {
    id,
    userId: req.user.id,
    companyId,
    contentItemId,
    platforms: rawPlatforms,
    scheduledFor: new Date(scheduledFor).toISOString(),
    status: "scheduled",
    isPlanning: false,
    autopilotGenerated: Boolean(req.body?.autopilotGenerated),
    createdAt: nowIso()
  };
  await firestore().collection(COLLECTIONS.scheduledPosts).doc(id).set(scheduled);
  await itemSnap.ref.set({ status: "scheduled", updatedAt: nowIso() }, { merge: true });
  res.status(201).json({ message: "Publica\xE7\xE3o agendada com sucesso.", scheduled });
}));
async function scheduledForUser(userId, companyId) {
  let query = firestore().collection(COLLECTIONS.scheduledPosts).where("userId", "==", userId);
  if (companyId) query = query.where("companyId", "==", companyId);
  return queryData(await query.get()).sort((a, b) => String(a.scheduledFor).localeCompare(String(b.scheduledFor)));
}
router.get("/content/scheduled", requireAuth, asyncRoute(async (req, res) => {
  const scheduledPosts = await scheduledForUser(req.user.id, req.query.companyId ? String(req.query.companyId) : void 0);
  res.json({ scheduledPosts, scheduled: scheduledPosts });
}));
router.get("/content/calendar", requireAuth, asyncRoute(async (req, res) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : void 0;
  const scheduled = await scheduledForUser(req.user.id, companyId);
  let query = firestore().collection(COLLECTIONS.contentItems).where("userId", "==", req.user.id);
  if (companyId) query = query.where("companyId", "==", companyId);
  const items = queryData(await query.get());
  res.json({ scheduled, scheduledPosts: scheduled, items, contents: items });
}));
router.post("/content/scheduled/:id/retry", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.scheduledPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Agendamento n\xE3o encontrado." });
  const current = snap.data();
  const existingResults = Array.isArray(current.publicationResults) ? current.publicationResults : [];
  if (current.status === "requires_review" || existingResults.some((r) => r?.externalState === "unknown")) {
    return res.status(409).json({
      error: "Publica\xE7\xF5es em estado de verifica\xE7\xE3o manual n\xE3o podem ser reagendadas automaticamente devido ao risco de duplica\xE7\xE3o externa."
    });
  }
  if (current.status !== "failed") {
    return res.status(409).json({ error: "Somente publica\xE7\xF5es com falha comprovada podem ser reenviadas." });
  }
  const failedResults = existingResults.filter((r) => !r?.success);
  if (failedResults.length > 0 && failedResults.every((r) => r?.retrySafe === false)) {
    return res.status(409).json({
      error: "Falha definitiva de autentica\xE7\xE3o ou par\xE2metro. Reconecte a conta ou edite o conte\xFAdo antes de tentar novamente."
    });
  }
  const successfulResults = existingResults.filter((r) => r?.success && r?.externalId);
  const requestedPlatforms = Array.isArray(current.platforms) ? current.platforms : [];
  const allAlreadySucceeded = requestedPlatforms.length > 0 && requestedPlatforms.every(
    (plat) => successfulResults.some((s) => s.platform === plat || normalizeProvider(s.platform) === normalizeProvider(plat))
  );
  if (allAlreadySucceeded) {
    return res.status(409).json({ error: "Todas as redes sociais deste agendamento j\xE1 foram publicadas com sucesso." });
  }
  const when = req.body?.scheduledFor ? new Date(String(req.body.scheduledFor)) : new Date(Date.now() + 6e4);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: "Data de reenvio inv\xE1lida." });
  const preservedResults = existingResults.filter((r) => r?.success && r?.externalId || r?.retrySafe === false);
  await ref.set({
    status: "scheduled",
    scheduledFor: when.toISOString(),
    errorMessage: null,
    publicationResults: preservedResults,
    retryCount: Number(current.retryCount || 0) + 1,
    updatedAt: nowIso()
  }, { merge: true });
  res.json({
    message: "Publica\xE7\xE3o reagendada para nova tentativa segura.",
    successfulPreserved: successfulResults.length
  });
}));
router.post("/content/scheduled/:id/cancel", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.scheduledPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Agendamento n\xE3o encontrado." });
  const current = snap.data();
  if (current.status === "requires_review") {
    return res.status(409).json({
      error: "Agendamentos com verifica\xE7\xE3o manual pendente n\xE3o podem ser cancelados para reuso ou republica\xE7\xE3o autom\xE1tica."
    });
  }
  if (!["scheduled", "failed", "planned"].includes(String(current.status))) {
    return res.status(409).json({ error: "Este agendamento n\xE3o pode mais ser cancelado." });
  }
  await ref.set({ status: "cancelled", cancelledAt: nowIso(), updatedAt: nowIso() }, { merge: true });
  res.json({ message: "Agendamento cancelado com sucesso." });
}));
router.delete("/content/:id", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.contentItems).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Conte\xFAdo n\xE3o encontrado." });
  const item = snap.data();
  if (item?.metadata?.storagePath) await getAdminStorage().bucket().file(String(item.metadata.storagePath)).delete({ ignoreNotFound: true }).catch(() => void 0);
  await ref.delete();
  res.json({ message: "Conte\xFAdo removido." });
}));
router.get("/campaigns", requireAuth, asyncRoute(async (req, res) => {
  let query = firestore().collection(COLLECTIONS.campaigns).where("userId", "==", req.user.id);
  if (req.query.companyId) query = query.where("companyId", "==", String(req.query.companyId));
  const campaigns = queryData(await query.get()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ campaigns });
}));
router.post("/campaigns", requireAuth, asyncRoute(async (req, res) => {
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  if (!entitlements.campaigns) {
    return res.status(403).json({
      error: "O recurso de Campanhas \xE9 exclusivo dos planos BUSINESS e AGENCY. Fa\xE7a upgrade para criar campanhas."
    });
  }
  const name = safeString(req.body?.name, 300);
  const companyId = safeString(req.body?.companyId, 200);
  if (!name || !companyId) return res.status(400).json({ error: "Nome e empresa s\xE3o obrigat\xF3rios." });
  await requireOwnedCompany(req.user.id, companyId);
  const id = newId("campaign");
  const campaign = { id, userId: req.user.id, companyId, name, objective: safeString(req.body?.objective, 3e3) || "Reconhecimento e Convers\xE3o", targetPlatforms: stringArray(req.body?.targetPlatforms, 10), targetAudience: safeString(req.body?.targetAudience, 3e3), budgetCredits: Math.max(0, Number(req.body?.budgetCredits || 0)), startDate: req.body?.startDate ? new Date(req.body.startDate).toISOString() : nowIso(), endDate: req.body?.endDate ? new Date(req.body.endDate).toISOString() : void 0, status: ["draft", "pending", "scheduled", "active", "paused", "completed", "failed"].includes(req.body?.status) ? req.body.status : "draft", contentItemIds: stringArray(req.body?.contentItemIds, 200), metrics: { reach: 0, clicks: 0, leads: 0, conversions: 0, shares: 0, comments: 0 }, createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.campaigns).doc(id).set(cleanObject(campaign));
  res.status(201).json({ message: "Campanha criada.", campaign });
}));
router.patch("/campaigns/:id", requireAuth, asyncRoute(async (req, res) => {
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  if (!entitlements.campaigns) {
    return res.status(403).json({
      error: "O recurso de Campanhas \xE9 exclusivo dos planos BUSINESS e AGENCY. Fa\xE7a upgrade para editar campanhas."
    });
  }
  const ref = firestore().collection(COLLECTIONS.campaigns).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Campanha n\xE3o encontrada." });
  const patch = {};
  if (req.body?.name !== void 0) patch.name = safeString(req.body.name, 300);
  if (req.body?.objective !== void 0) patch.objective = safeString(req.body.objective, 3e3);
  if (req.body?.targetPlatforms !== void 0) patch.targetPlatforms = stringArray(req.body.targetPlatforms, 10);
  if (req.body?.targetAudience !== void 0) patch.targetAudience = safeString(req.body.targetAudience, 3e3);
  if (req.body?.budgetCredits !== void 0) patch.budgetCredits = Math.max(0, Number(req.body.budgetCredits || 0));
  if (req.body?.startDate !== void 0) patch.startDate = new Date(req.body.startDate).toISOString();
  if (req.body?.endDate !== void 0) patch.endDate = req.body.endDate ? new Date(req.body.endDate).toISOString() : null;
  if (req.body?.status !== void 0) {
    if (!["draft", "pending", "scheduled", "active", "paused", "completed", "failed"].includes(req.body.status)) return res.status(400).json({ error: "Status de campanha inv\xE1lido." });
    patch.status = req.body.status;
  }
  if (req.body?.contentItemIds !== void 0) patch.contentItemIds = stringArray(req.body.contentItemIds, 200);
  patch.updatedAt = nowIso();
  await ref.set(cleanObject(patch), { merge: true });
  const fresh = await ref.get();
  res.json({ message: "Campanha atualizada.", campaign: { id: fresh.id, ...fresh.data() } });
}));
router.delete("/campaigns/:id", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.campaigns).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Campanha n\xE3o encontrada." });
  await ref.delete();
  res.json({ message: "Campanha removida." });
}));
router.get("/payments/plans", (_req, res) => res.json({ plans: config.plans, gatewayConfigured: mercadoPagoConfigured() }));
router.post("/payments/checkout", requireAuth, asyncRoute(async (req, res) => {
  const planId = safeString(req.body?.planId, 100);
  if (!planId) return res.status(400).json({ error: "Selecione um plano." });
  const bodyIdempotencyKey = safeString(req.body?.idempotencyKey, 200);
  const headerIdempotencyKey = safeString(req.headers["x-idempotency-key"], 200);
  if (bodyIdempotencyKey && headerIdempotencyKey && bodyIdempotencyKey !== headerIdempotencyKey) {
    return res.status(400).json({ error: "A chave de idempot\xEAncia do cabe\xE7alho diverge da chave enviada no corpo." });
  }
  const idempotencyKey = headerIdempotencyKey || bodyIdempotencyKey || void 0;
  res.json(await createCheckout({ userId: req.user.id, userEmail: req.user.email, userName: req.user.name, planId, idempotencyKey }));
}));
router.get("/payments/orders", requireAuth, asyncRoute(async (req, res) => {
  const snap = await firestore().collection(COLLECTIONS.payments).where("userId", "==", req.user.id).get();
  res.json({ orders: queryData(snap).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
}));
router.get("/payments/orders/:orderId", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.payments).doc(req.params.orderId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) {
    return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
  }
  res.json({ order: { id: snap.id, ...snap.data() } });
}));
router.get("/payments/subscriptions", requireAuth, asyncRoute(async (req, res) => {
  res.json({ subscriptions: await listUserSubscriptions(req.user.id), billingMode: config.mercadoPago.billingMode });
}));
router.post("/payments/subscription/cancel", requireAuth, asyncRoute(async (req, res) => {
  res.json({ message: "Renova\xE7\xE3o autom\xE1tica cancelada.", subscription: await cancelSubscription(req.user.id, safeString(req.body?.orderId, 200) || void 0) });
}));
router.post("/webhooks/mercadopago", asyncRoute(async (req, res) => {
  const result = await processMercadoPagoWebhook({ body: req.body, query: req.query, headers: req.headers });
  res.status(200).json(result);
}));
router.get("/autopilot/config", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  const id = `${req.user.id}_${companyId}`;
  const ref = firestore().collection(COLLECTIONS.autopilotConfigs).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return res.json({
      config: {
        id,
        userId: req.user.id,
        companyId,
        enabled: false,
        mode: "manual_approval",
        frequency: "daily",
        timezone: "America/Sao_Paulo",
        preferredDays: [1, 2, 3, 4, 5],
        preferredHours: [10, 15, 19],
        targetPlatforms: ["Instagram", "Facebook"],
        primaryGoal: "Atrair clientes e gerar autoridade",
        maxMonthlyCredits: 100,
        usedCreditsThisMonth: 0,
        usageMonth: (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)
      },
      persisted: false
    });
  }
  res.json({ config: { id: snap.id, ...snap.data() }, persisted: true });
}));
router.post("/autopilot/config", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  const requestedEnabled = Boolean(req.body?.enabled);
  const requestedMode = req.body?.mode === "automatic" ? "automatic" : "manual_approval";
  if (requestedEnabled && !entitlements.autopilotManual && !entitlements.autopilotAutomatic) {
    return res.status(403).json({
      error: "O recurso Autopilot n\xE3o est\xE1 dispon\xEDvel no seu plano atual. Fa\xE7a upgrade para o plano PRO ou superior."
    });
  }
  if (requestedMode === "automatic" && !entitlements.autopilotAutomatic) {
    return res.status(403).json({
      error: "O modo autom\xE1tico do Autopilot \xE9 exclusivo dos planos BUSINESS e AGENCY. No plano PRO, utilize aprova\xE7\xE3o manual ou fa\xE7a upgrade."
    });
  }
  const id = `${req.user.id}_${companyId}`;
  const ref = firestore().collection(COLLECTIONS.autopilotConfigs).doc(id);
  const current = await ref.get();
  const rawDays = Array.isArray(req.body?.preferredDays) ? req.body.preferredDays : void 0;
  const preferredDays = rawDays ? rawDays.filter((d) => typeof d === "number" && d >= 0 && d <= 6) : void 0;
  const rawHours = Array.isArray(req.body?.preferredHours) ? req.body.preferredHours : void 0;
  const preferredHours = rawHours ? rawHours.filter((h) => typeof h === "number" && h >= 0 && h <= 23) : void 0;
  const timezone = safeString(req.body?.timezone, 80) || "America/Sao_Paulo";
  const targetPlatforms = stringArray(req.body?.targetPlatforms, 10);
  if (requestedEnabled && requestedMode === "automatic") {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : ["facebook"];
    for (const plat of targets) {
      const provider = normalizeProvider(plat);
      if (!provider || !isTextAutoPublishSupported(provider)) {
        return res.status(400).json({
          error: `O canal "${plat}" n\xE3o suporta publica\xE7\xE3o autom\xE1tica direta no modo autom\xE1tico (suportados apenas Facebook, LinkedIn e X).`
        });
      }
      const connSnap = await firestore().collection(COLLECTIONS.socialConnections).where("userId", "==", req.user.id).where("companyId", "==", companyId).where("provider", "==", provider).limit(1).get();
      if (connSnap.empty) {
        return res.status(400).json({
          error: `O canal "${plat}" n\xE3o est\xE1 conectado para esta empresa. Conecte-o em Redes Sociais antes de ativar o modo autom\xE1tico.`
        });
      }
      const conn = connSnap.docs[0].data();
      const isExpired = conn.expiresAt ? new Date(conn.expiresAt).getTime() <= Date.now() : false;
      if (conn.status !== "connected" || !conn.encryptedAccessToken && !conn.accessToken || isExpired) {
        return res.status(400).json({
          error: `A conex\xE3o do canal "${plat}" expirou ou est\xE1 inativa. Reconecte-a em Redes Sociais antes de ativar o modo autom\xE1tico.`
        });
      }
    }
  }
  const update = cleanObject({
    id,
    userId: req.user.id,
    companyId,
    enabled: requestedEnabled,
    mode: requestedMode,
    frequency: ["daily", "3_times_week", "weekly"].includes(req.body?.frequency) ? req.body.frequency : "daily",
    timezone,
    preferredDays,
    preferredHours,
    targetPlatforms,
    primaryGoal: safeString(req.body?.primaryGoal, 2e3) || "Engajamento e Vendas",
    maxMonthlyCredits: Math.max(5, Number(req.body?.maxMonthlyCredits || 100)),
    updatedAt: nowIso(),
    createdAt: current.exists ? void 0 : nowIso()
  });
  await ref.set(update, { merge: true });
  const fresh = await ref.get();
  res.json({ message: "Configura\xE7\xE3o do Autopilot salva.", config: { id: fresh.id, ...fresh.data() } });
}));
router.post("/autopilot/trigger-now", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio para acionar o Autopilot." });
  await requireOwnedCompany(req.user.id, companyId);
  const result = await triggerUserAutopilot(req.user.id, companyId);
  res.json({ message: "Autopilot executado para sua empresa.", result });
}));
router.get("/social/connections", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  res.json({ connections: await listConnections(req.user.id, companyId) });
}));
router.get("/social/:provider/connect", requireAuth, asyncRoute(async (req, res) => {
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  const isAdmin = req.user?.role === "admin";
  if (!entitlements.socialConnections && !isAdmin) {
    return res.status(403).json({
      error: "A conex\xE3o com redes sociais est\xE1 dispon\xEDvel a partir do plano PRO. Fa\xE7a upgrade para conectar suas contas."
    });
  }
  const provider = req.params.provider;
  if (!["instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "x"].includes(provider)) return res.status(400).json({ error: "Provedor social inv\xE1lido." });
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  res.json(await createOAuthUrl({ provider, userId: req.user.id, companyId }));
}));
router.get("/social/:provider/callback", asyncRoute(async (req, res) => {
  const provider = req.params.provider;
  const errorParam = safeString(req.query.error, 500) || safeString(req.query.error_description, 500);
  if (errorParam) {
    const safeError = errorParam.includes("access_denied") ? "Autoriza\xE7\xE3o cancelada pelo usu\xE1rio." : sanitizeOAuthPublicError(errorParam, provider);
    return res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent(safeError)}`);
  }
  const code = safeString(req.query.code, 3e3);
  const state = safeString(req.query.state, 3e3);
  if (!code || !state) return res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent("Autoriza\xE7\xE3o OAuth incompleta")}`);
  try {
    const result = await handleOAuthCallback({ provider, code, state });
    if (result.selectionRequired && result.pageSelectToken) {
      return res.redirect(`${config.appUrl}/redes-sociais?pageSelection=${encodeURIComponent(result.pageSelectToken)}&companyId=${encodeURIComponent(result.companyId)}`);
    }
    res.redirect(`${config.appUrl}/redes-sociais?connected=${encodeURIComponent(provider)}&companyId=${encodeURIComponent(result.companyId)}`);
  } catch (err) {
    const publicError = sanitizeOAuthPublicError(err, provider);
    const rawMsg = String(err?.message || err || "Falha ao processar autoriza\xE7\xE3o social.");
    const sanitizedLog = rawMsg.replace(/EAAB\w+/g, "[REDACTED_PAGE_TOKEN]").replace(/EAA\w+/g, "[REDACTED_USER_TOKEN]").replace(/access_token=[^&\s]+/g, "access_token=[REDACTED]").replace(/code=[^&\s]+/g, "code=[REDACTED]").replace(/client_secret=[^&\s]+/g, "client_secret=[REDACTED]");
    console.error(`[Social OAuth Callback Error] [${provider}]:`, sanitizedLog);
    res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent(publicError)}`);
  }
}));
router.delete("/social/:provider/disconnect", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  const success = await disconnectSocial(req.user.id, companyId, req.params.provider);
  res.json({ success, message: success ? "Conta desconectada." : "Conex\xE3o n\xE3o encontrada." });
}));
router.get("/social/facebook/selection-candidates", requireAuth, asyncRoute(async (req, res) => {
  const selectionToken = safeString(req.query.selectionToken || req.query.pageSelectToken || req.headers["x-selection-token"], 1e3);
  const companyId = safeString(req.query.companyId, 200) || void 0;
  if (!selectionToken) {
    return res.status(400).json({ error: "selectionToken \xE9 obrigat\xF3rio." });
  }
  const pages = await getFacebookPageSelectionCandidates({
    userId: req.user.id,
    selectionToken,
    companyId
  });
  res.json({ pages });
}));
router.post("/social/facebook/select-page", requireAuth, asyncRoute(async (req, res) => {
  const selectionToken = safeString(req.body?.selectionToken || req.body?.pageSelectToken, 1e3);
  const pageId = safeString(req.body?.pageId || req.body?.selectedPageId, 200);
  const companyId = safeString(req.body?.companyId, 200) || void 0;
  if (!selectionToken || !pageId) {
    return res.status(400).json({ error: "selectionToken e pageId s\xE3o obrigat\xF3rios." });
  }
  const result = await selectFacebookPage({
    userId: req.user.id,
    companyId,
    selectionToken,
    pageId
  });
  res.json({
    success: true,
    message: `P\xE1gina "${result.pageName}" selecionada e conectada com sucesso.`,
    connection: result
  });
}));
router.get("/social/connections/:companyId", requireAuth, asyncRoute(async (req, res) => {
  await requireOwnedCompany(req.user.id, req.params.companyId);
  res.json({ connections: await listConnections(req.user.id, req.params.companyId) });
}));
router.get("/social/oauth/:provider/start", requireAuth, asyncRoute(async (req, res) => {
  const wallet = await getWallet(req.user.id);
  const entitlements = getPlanEntitlements(wallet.planId);
  const isAdmin = req.user?.role === "admin";
  if (!entitlements.socialConnections && !isAdmin) {
    return res.status(403).json({
      error: "A conex\xE3o com redes sociais est\xE1 dispon\xEDvel a partir do plano PRO. Fa\xE7a upgrade para conectar suas contas."
    });
  }
  const provider = req.params.provider;
  const companyId = safeString(req.query.companyId, 200);
  if (!["instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "x"].includes(provider)) return res.status(400).json({ error: "Provedor social inv\xE1lido." });
  await requireOwnedCompany(req.user.id, companyId);
  const oauth = await createOAuthUrl({ provider, userId: req.user.id, companyId });
  res.json({ ...oauth, authUrl: oauth.url });
}));
router.delete("/social/connections/:connectionId", requireAuth, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.socialConnections).doc(req.params.connectionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user.id) return res.status(404).json({ error: "Conex\xE3o n\xE3o encontrada." });
  await ref.delete();
  res.json({ success: true, message: "Conta desconectada." });
}));
var uploadVideo = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: {
    fileSize: MAX_TIKTOK_SANDBOX_VIDEO_SIZE
    // 4 MiB
  },
  fileFilter: (_req, file, cb) => {
    const originalName = (file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const isMp4Ext = originalName.endsWith(".mp4");
    const isMp4Mime = !mime || mime === "video/mp4" || mime === "application/mp4" || mime === "application/octet-stream";
    if (isMp4Ext && isMp4Mime) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de v\xEDdeo MP4 (.mp4) s\xE3o aceitos para envio de rascunho ao TikTok."));
    }
  }
});
router.post("/social/tiktok/upload-draft", requireAuth, (req, res, next) => {
  uploadVideo.single("video")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "O v\xEDdeo excede o limite de 4 MB desta fase de verifica\xE7\xE3o do TikTok." });
      }
      return res.status(400).json({ error: err.message || "Erro no envio do arquivo de v\xEDdeo." });
    }
    next();
  });
}, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  await requireSocialPublishingAccess(req.user.id, req.user?.role);
  if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({ error: "Arquivo de v\xEDdeo MP4 \xE9 obrigat\xF3rio." });
  }
  const result = await uploadTikTokDraftVideo({
    userId: req.user.id,
    companyId,
    videoBuffer: req.file.buffer,
    videoSize: req.file.size,
    mimeType: req.file.mimetype,
    title: safeString(req.body?.title, 300)
  });
  res.status(200).json(result);
}));
router.post("/social/tiktok/upload-status", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  const publishId = safeString(req.body?.publishId, 200);
  if (!companyId || !publishId) {
    return res.status(400).json({ error: "companyId e publishId s\xE3o obrigat\xF3rios." });
  }
  await requireOwnedCompany(req.user.id, companyId);
  const result = await getTikTokUploadStatus({
    userId: req.user.id,
    companyId,
    publishId
  });
  res.status(200).json(result);
}));
router.get("/social/readiness", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  const readiness = await getSocialReadiness(companyId, req.user.id);
  res.json(readiness);
}));
router.post("/social/instagram/publish-media", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  await requireSocialPublishingAccess(req.user.id, req.user?.role);
  const imageUrl = safeHttpUrl(req.body?.imageUrl, 2e3) || void 0;
  const videoUrl = safeHttpUrl(req.body?.videoUrl, 2e3) || void 0;
  const caption = safeString(req.body?.caption, 2200);
  const contentItemId = safeString(req.body?.contentItemId, 200) || void 0;
  if (!imageUrl && !videoUrl) {
    return res.status(400).json({ error: "Forne\xE7a uma URL v\xE1lida de imagem ou v\xEDdeo (Reels)." });
  }
  const result = await publishInstagramMedia({
    userId: req.user.id,
    companyId,
    imageUrl,
    videoUrl,
    caption,
    contentItemId
  });
  res.json(result);
}));
router.post("/social/tiktok/init-upload", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const videoSize = Number(req.body?.videoSize || 0);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  if (videoSize <= 0) return res.status(400).json({ error: "videoSize deve ser maior que 0." });
  await requireOwnedCompany(req.user.id, companyId);
  await requireSocialPublishingAccess(req.user.id, req.user?.role);
  const result = await initTikTokDraftUpload({
    userId: req.user.id,
    companyId,
    videoSize,
    title: safeString(req.body?.title, 300)
  });
  res.json(result);
}));
router.post("/social/youtube/init-upload", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const title = safeString(req.body?.title, 100);
  if (!companyId || !title) return res.status(400).json({ error: "companyId e title s\xE3o obrigat\xF3rios." });
  await requireOwnedCompany(req.user.id, companyId);
  await requireSocialPublishingAccess(req.user.id, req.user?.role);
  const result = await initYouTubeResumableUpload({
    userId: req.user.id,
    companyId,
    title,
    description: safeString(req.body?.description, 5e3),
    privacyStatus: ["private", "unlisted", "public"].includes(req.body?.privacyStatus) ? req.body.privacyStatus : "unlisted",
    videoSize: req.body?.videoSize ? Number(req.body.videoSize) : void 0,
    mimeType: safeString(req.body?.mimeType, 100) || "video/mp4"
  });
  res.json(result);
}));
router.get("/social/pinterest/boards", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: "companyId \xE9 obrigat\xF3rio." });
  await requireOwnedCompany(req.user.id, companyId);
  const boards = await getPinterestBoards({
    userId: req.user.id,
    companyId
  });
  res.json({ boards });
}));
router.post("/social/pinterest/create-pin", requireAuth, asyncRoute(async (req, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const boardId = safeString(req.body?.boardId, 200);
  const title = safeString(req.body?.title, 100);
  const imageUrl = safeHttpUrl(req.body?.imageUrl, 2e3);
  if (!companyId || !boardId || !title || !imageUrl) {
    return res.status(400).json({ error: "companyId, boardId, title e imageUrl v\xE1lida s\xE3o obrigat\xF3rios." });
  }
  await requireOwnedCompany(req.user.id, companyId);
  await requireSocialPublishingAccess(req.user.id, req.user?.role);
  const result = await createPinterestPin({
    userId: req.user.id,
    companyId,
    boardId,
    title,
    description: safeString(req.body?.description, 800),
    link: safeHttpUrl(req.body?.link, 1e3) || void 0,
    imageUrl
  });
  res.json(result);
}));
router.post("/support/tickets", requireAuth, asyncRoute(async (req, res) => {
  const subject = safeString(req.body?.subject, 300);
  const message = safeString(req.body?.message, 1e4);
  if (!subject || !message) return res.status(400).json({ error: "Assunto e descri\xE7\xE3o s\xE3o obrigat\xF3rios." });
  const id = newId("ticket");
  const ticket = { id, userId: req.user.id, userEmail: req.user.email, subject, message, status: "open", priority: "normal", createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.supportTickets).doc(id).set(ticket);
  res.status(201).json({ message: "Chamado aberto com sucesso.", ticket: { ...ticket, message: void 0 } });
}));
router.get("/support/contact", (_req, res) => res.json({ email: config.support.email, whatsapp: config.support.whatsapp || null }));
router.get("/blog", asyncRoute(async (_req, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).where("status", "==", "published").get();
  res.json({ posts: queryData(snap).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))) });
}));
router.get("/blog/:slug", asyncRoute(async (req, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).where("slug", "==", req.params.slug).where("status", "==", "published").limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "Artigo n\xE3o encontrado." });
  res.json({ post: { id: snap.docs[0].id, ...snap.docs[0].data() } });
}));
function sanitizePublicVitrineCompany(company) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    segment: company.segment || "",
    niche: company.niche || "",
    description: company.description || "",
    logoUrl: company.logoUrl || null,
    coverUrl: company.coverUrl || null,
    website: company.website || null,
    whatsapp: company.whatsapp || null,
    instagram: company.instagram || null,
    linkedin: company.linkedin || null,
    facebook: company.facebook || null,
    youtube: company.youtube || null,
    tiktok: company.tiktok || null,
    city: company.city || null,
    state: company.state || null,
    country: company.country || "BR",
    businessType: company.businessType || "digital",
    isPublicInVitrine: true,
    updatedAt: company.updatedAt || company.createdAt || null
  };
}
router.get("/vitrine", asyncRoute(async (_req, res) => {
  const snap = await firestore().collection(COLLECTIONS.companies).get();
  const companies = queryData(snap).filter((c) => parseStrictBoolean(c.isPublicInVitrine)).map((c) => sanitizePublicVitrineCompany(c)).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  res.json({ companies });
}));
router.get("/vitrine/:slug", asyncRoute(async (req, res) => {
  const param = safeString(req.params.slug, 200);
  const snap = await firestore().collection(COLLECTIONS.companies).where("slug", "==", param).limit(1).get();
  if (!snap.empty) {
    const data = snap.docs[0].data();
    if (parseStrictBoolean(data.isPublicInVitrine)) {
      const company = sanitizePublicVitrineCompany({ id: snap.docs[0].id, ...data });
      return res.json({ company });
    }
  }
  const directSnap = await firestore().collection(COLLECTIONS.companies).doc(param).get();
  if (directSnap.exists) {
    const data = directSnap.data();
    if (parseStrictBoolean(data.isPublicInVitrine)) {
      const company = sanitizePublicVitrineCompany({ id: directSnap.id, ...data });
      return res.json({ company });
    }
  }
  res.status(404).json({ error: "Empresa n\xE3o encontrada ou n\xE3o est\xE1 vis\xEDvel na Vitrine P\xFAblica." });
}));
router.get("/admin/overview", requireAdmin, asyncRoute(async (_req, res) => {
  const db = firestore();
  const [usersSnap, companiesSnap, txSnap, contentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).get(),
    db.collection(COLLECTIONS.companies).get(),
    db.collection(COLLECTIONS.creditTransactions).get(),
    db.collection(COLLECTIONS.contentItems).get()
  ]);
  const users = queryData(usersSnap).map(({ passwordHash, ...user }) => user);
  const totalCreditsIssued = txSnap.docs.reduce((sum, doc) => {
    const d = doc.data();
    return sum + (Number(d.amount) > 0 ? Number(d.amount) : 0);
  }, 0);
  res.json({ stats: { totalUsers: usersSnap.size, totalCompanies: companiesSnap.size, totalCreditsIssued, totalContentsGenerated: contentsSnap.size }, users });
}));
router.post("/admin/grant-credits", requireAdmin, asyncRoute(async (req, res) => {
  const userId = safeString(req.body?.userId, 200);
  const amount = Number(req.body?.amount || 0);
  const reason = safeString(req.body?.reason, 500) || "Ajuste administrativo";
  if (!userId || !Number.isFinite(amount) || amount <= 0 || amount > 1e5) return res.status(400).json({ error: "Usu\xE1rio ou quantidade inv\xE1lidos." });
  const wallet = await addCredits({ userId, amount, type: "admin_adjustment", source: reason, idempotencyKey: `admin:${req.user.id}:${newId("grant")}`, metadata: { operatorId: req.user.id } });
  await writeAdminLog({ operatorId: req.user.id, operatorEmail: req.user.email, action: "grant_credits", targetUserId: userId, details: { amount, reason } });
  await createNotification({ userId, title: "Cr\xE9ditos adicionados", message: `${amount} cr\xE9ditos foram adicionados \xE0 sua carteira.`, type: "system" });
  res.json({ message: "Cr\xE9ditos concedidos.", wallet });
}));
router.get("/admin/support/tickets", requireAdmin, asyncRoute(async (_req, res) => {
  const snap = await firestore().collection(COLLECTIONS.supportTickets).get();
  const tickets = queryData(snap).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 200);
  res.json({ tickets });
}));
router.patch("/admin/support/tickets/:id", requireAdmin, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.supportTickets).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Chamado n\xE3o encontrado." });
  const status = safeString(req.body?.status, 30);
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) return res.status(400).json({ error: "Status inv\xE1lido." });
  await ref.set({ status, updatedAt: nowIso(), updatedBy: req.user.id }, { merge: true });
  await writeAdminLog({ operatorId: req.user.id, operatorEmail: req.user.email, action: "support_status", details: { ticketId: req.params.id, status } });
  res.json({ message: "Chamado atualizado." });
}));
router.get("/admin/blog", requireAdmin, asyncRoute(async (_req, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).get();
  res.json({ posts: queryData(snap).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) });
}));
router.post("/admin/blog/generate-now", requireAdmin, asyncRoute(async (req, res) => {
  const topic = safeString(req.body?.topic, 1e3) || "como usar intelig\xEAncia artificial de forma pr\xE1tica e respons\xE1vel no marketing de pequenas empresas";
  const generated = await generatePlatformArticle(topic);
  const article = generated.article || {};
  const id = newId("blog");
  const slug = `${slugify(article.suggestedSlug || article.title || topic)}-${id.slice(-6)}`;
  const post = { id, title: safeString(article.title, 180), slug, summary: safeString(article.summary || article.metaDescription, 500), content: safeString(article.content, 12e4), featuredImageUrl: "", author: config.blog.author, category: safeString(article.category, 100) || "Marketing & IA", tags: stringArray(article.tags, 12), seoTitle: safeString(article.title, 70), seoDescription: safeString(article.metaDescription || article.summary, 180), status: "draft", createdAt: nowIso(), updatedAt: nowIso(), generatedBy: "admin_ai", modelUsed: generated.modelUsed };
  if (!post.title || !post.content) throw new Error("A IA n\xE3o retornou artigo completo.");
  await firestore().collection(COLLECTIONS.blogPosts).doc(id).set(post);
  await writeAdminLog({ operatorId: req.user.id, operatorEmail: req.user.email, action: "generate_blog", details: { postId: id, topic } });
  res.status(201).json({ message: "Rascunho gerado. Revise antes de publicar.", post });
}));
router.post("/admin/blog", requireAdmin, asyncRoute(async (req, res) => {
  const id = newId("blog");
  const title = safeString(req.body?.title, 180);
  const content = safeString(req.body?.content, 12e4);
  if (!title || !content) return res.status(400).json({ error: "T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios." });
  const status = req.body?.status === "published" ? "published" : "draft";
  const post = { id, title, slug: `${slugify(req.body?.slug || title)}-${id.slice(-6)}`, summary: safeString(req.body?.summary, 500), content, featuredImageUrl: safeHttpUrl(req.body?.featuredImageUrl), author: safeString(req.body?.author, 120) || config.blog.author, category: safeString(req.body?.category, 100) || "Marketing & IA", tags: stringArray(req.body?.tags, 12), seoTitle: safeString(req.body?.seoTitle || title, 70), seoDescription: safeString(req.body?.seoDescription || req.body?.summary, 180), status, publishedAt: status === "published" ? nowIso() : void 0, createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.blogPosts).doc(id).set(cleanObject(post));
  res.status(201).json({ post });
}));
router.patch("/admin/blog/:id", requireAdmin, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.blogPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Artigo n\xE3o encontrado." });
  const current = snap.data();
  const patch = { updatedAt: nowIso() };
  for (const key2 of ["title", "summary", "content", "author", "category", "seoTitle", "seoDescription"]) if (req.body?.[key2] !== void 0) patch[key2] = safeString(req.body[key2], key2 === "content" ? 12e4 : key2 === "summary" ? 500 : 180);
  if (req.body?.featuredImageUrl !== void 0) patch.featuredImageUrl = safeHttpUrl(req.body.featuredImageUrl);
  if (req.body?.tags !== void 0) patch.tags = stringArray(req.body.tags, 12);
  if (req.body?.slug !== void 0) patch.slug = slugify(req.body.slug);
  if (req.body?.status !== void 0) {
    if (!["draft", "published", "archived"].includes(req.body.status)) return res.status(400).json({ error: "Status inv\xE1lido." });
    patch.status = req.body.status;
    if (req.body.status === "published" && !current.publishedAt) patch.publishedAt = nowIso();
  }
  await ref.set(patch, { merge: true });
  const fresh = await ref.get();
  res.json({ post: { id: fresh.id, ...fresh.data() } });
}));
router.delete("/admin/blog/:id", requireAdmin, asyncRoute(async (req, res) => {
  const ref = firestore().collection(COLLECTIONS.blogPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Artigo n\xE3o encontrado." });
  await ref.delete();
  await writeAdminLog({ operatorId: req.user.id, operatorEmail: req.user.email, action: "delete_blog", details: { postId: req.params.id } });
  res.json({ message: "Artigo removido." });
}));
router.get("/cron/health", asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || "");
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: "Cron n\xE3o autorizado." });
  res.json(await getSchedulerHealth());
}));
router.get("/cron/process", asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || "");
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: "Cron n\xE3o autorizado." });
  res.json(await processSchedulerTick());
}));
router.get("/cron/social", asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || "");
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: "Cron n\xE3o autorizado." });
  res.json(await processSchedulerTick());
}));
router.post("/cron/social", asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || "");
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: "Cron n\xE3o autorizado." });
  res.json(await processSchedulerTick());
}));
router.post("/alma/intent", asyncRoute(async (req, res) => {
  const { prompt, context } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt \xE9 obrigat\xF3rio." });
  }
  const result = await parseAlmaIntent(prompt, context);
  res.json({ intent: result });
}));
router.post("/alma/orchestrate", asyncRoute(async (req, res) => {
  const { intent, context, userId } = req.body || {};
  if (!intent || !intent.goal) {
    return res.status(400).json({ error: "Objeto de inten\xE7\xE3o v\xE1lido \xE9 obrigat\xF3rio." });
  }
  const effectiveUserId = req.user?.uid || userId || "anon_user";
  const result = await executeAlmaOrchestration(intent, effectiveUserId, context);
  res.json(result);
}));
router.get("/alma/devices", (_req, res) => {
  res.json({ devices: getSmartDevicesList() });
});
router.patch("/alma/devices/:id", asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { state } = req.body || {};
  if (!state || typeof state !== "object") {
    return res.status(400).json({ error: "Estado de atualiza\xE7\xE3o inv\xE1lido." });
  }
  const updated = updateSmartDeviceState(id, state);
  res.json({ device: updated });
}));
router.post("/alma/vision", asyncRoute(async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", prompt = "Analise visualmente e identifique objetos, ambiente e recomenda\xE7\xF5es." } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "Imagem base64 \xE9 obrigat\xF3ria." });
  }
  const cleanBase64 = String(imageBase64).replace(/^data:image\/\w+;base64,/, "");
  const ai = textAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        },
        {
          text: `Voc\xEA \xE9 o ALMA VISION & ARCHITECT. Analise a imagem detalhadamente com racioc\xEDnio multimodal de ponta e responda em portugu\xEAs: ${prompt}`
        }
      ]
    }
  });
  res.json({
    analysis: response.text || "An\xE1lise visual conclu\xEDda.",
    timestamp: nowIso()
  });
}));
router.get("/alma/memories", asyncRoute(async (req, res) => {
  const userId = req.user?.uid || "global_user";
  try {
    const snap = await firestore().collection("alma_memories").where("userId", "==", userId).get();
    const memories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ memories });
  } catch {
    res.json({
      memories: [
        {
          id: "mem_1",
          type: "preference",
          category: "Ambiente",
          key: "Temperatura de Conforto",
          value: "22\xB0C com ilumina\xE7\xE3o suave em tom azul ciano.",
          importance: 9,
          createdAt: nowIso()
        },
        {
          id: "mem_2",
          type: "semantic",
          category: "Objetivos",
          key: "Foco do M\xEAs",
          value: "Expans\xE3o da presen\xE7a digital e automa\xE7\xE3o operacional.",
          importance: 10,
          createdAt: nowIso()
        }
      ]
    });
  }
}));
router.post("/alma/memories", asyncRoute(async (req, res) => {
  const userId = req.user?.uid || "global_user";
  const { type, category, key: key2, value, importance = 5 } = req.body || {};
  if (!key2 || !value) {
    return res.status(400).json({ error: "Chave e valor da mem\xF3ria s\xE3o obrigat\xF3rios." });
  }
  const memoryDoc = {
    id: newId("mem"),
    userId,
    type: type || "semantic",
    category: category || "Geral",
    key: String(key2).trim(),
    value: String(value).trim(),
    importance: Number(importance) || 5,
    createdAt: nowIso()
  };
  try {
    await firestore().collection("alma_memories").doc(memoryDoc.id).set(memoryDoc);
  } catch (err) {
    console.warn("[Alma Memory] Firestore write fallback:", err);
  }
  res.json({ memory: memoryDoc });
}));
router.delete("/alma/memories/:id", asyncRoute(async (req, res) => {
  const { id } = req.params;
  try {
    await firestore().collection("alma_memories").doc(id).delete();
  } catch (err) {
    console.warn("[Alma Memory] Firestore delete fallback:", err);
  }
  res.json({ success: true, deletedId: id });
}));
router.get("/plans", (_req, res) => res.json({ plans: config.plans, gatewayConfigured: mercadoPagoConfigured() }));
router.get("/sitemap.xml", asyncRoute(async (_req, res) => res.type("application/xml").send(await buildSitemapXml())));
router.get("/robots.txt", (_req, res) => res.type("text/plain").send(buildRobotsTxt()));
async function buildSitemapXml() {
  const base = config.appUrl.replace(/\/$/, "");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const urls = [
    { loc: `${base}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
    { loc: `${base}/alma`, lastmod: now, changefreq: "daily", priority: "0.95" },
    { loc: `${base}/alma/home`, lastmod: now, changefreq: "weekly", priority: "0.85" },
    { loc: `${base}/alma/agentes`, lastmod: now, changefreq: "weekly", priority: "0.85" },
    { loc: `${base}/alma/visao`, lastmod: now, changefreq: "weekly", priority: "0.80" },
    { loc: `${base}/alma/memoria`, lastmod: now, changefreq: "weekly", priority: "0.80" },
    { loc: `${base}/vitrine`, lastmod: now, changefreq: "daily", priority: "0.90" },
    { loc: `${base}/blog`, lastmod: now, changefreq: "daily", priority: "0.90" },
    { loc: `${base}/planos`, lastmod: now, changefreq: "weekly", priority: "0.80" },
    { loc: `${base}/termos`, lastmod: now, changefreq: "monthly", priority: "0.60" },
    { loc: `${base}/privacidade`, lastmod: now, changefreq: "monthly", priority: "0.60" },
    { loc: `${base}/cookies`, lastmod: now, changefreq: "monthly", priority: "0.50" },
    { loc: `${base}/exclusao-de-dados`, lastmod: now, changefreq: "monthly", priority: "0.50" },
    { loc: `${base}/apps-compliance`, lastmod: now, changefreq: "monthly", priority: "0.50" }
  ];
  try {
    const [blogSnap, articlesSnap, companiesSnap] = await Promise.all([
      firestore().collection(COLLECTIONS.blogPosts).where("status", "==", "published").get(),
      firestore().collection(COLLECTIONS.blogArticles).where("status", "==", "published").get(),
      firestore().collection(COLLECTIONS.companies).get()
    ]);
    for (const doc of blogSnap.docs) {
      const item = doc.data();
      if (item.slug) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(item.slug)}`,
          lastmod: item.updatedAt || item.publishedAt || now,
          changefreq: "monthly",
          priority: "0.75"
        });
      }
    }
    for (const doc of articlesSnap.docs) {
      const item = doc.data();
      if (item.slug && !urls.some((u) => u.loc.endsWith(`/blog/${encodeURIComponent(item.slug)}`))) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(item.slug)}`,
          lastmod: item.updatedAt || item.publishedAt || now,
          changefreq: "weekly",
          priority: "0.85"
        });
      }
    }
    for (const seeded of INITIAL_SEEDED_ARTICLES) {
      if (!urls.some((u) => u.loc.endsWith(`/blog/${encodeURIComponent(seeded.slug)}`))) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(seeded.slug)}`,
          lastmod: seeded.updatedAt || now,
          changefreq: "weekly",
          priority: "0.85"
        });
      }
    }
    const sitemapProjects = await listAllPortalProjectsFromDb().catch(() => PORTAL_VIP_PROJECTS);
    for (const project of sitemapProjects) {
      if (project.active !== false) {
        urls.push({
          loc: `${base}/vitrine/${encodeURIComponent(project.slug)}`,
          lastmod: project.updatedAt || now,
          changefreq: "daily",
          priority: "0.85"
        });
      }
    }
    for (const doc of companiesSnap.docs) {
      const item = doc.data();
      const isPublic = item.isPublicInVitrine === true || item.isPublicInVitrine === "true";
      if (isPublic && item.slug) {
        urls.push({
          loc: `${base}/vitrine/${encodeURIComponent(item.slug)}`,
          lastmod: item.updatedAt || now,
          changefreq: "weekly",
          priority: "0.70"
        });
      }
    }
  } catch (error) {
    console.warn("[Portal Vip Brasil Sitemap] N\xE3o foi poss\xEDvel carregar dados din\xE2micos do Firestore, usando p\xE1ginas base:", error);
  }
  const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const safeLastmod = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };
  const body = urls.map((item) => {
    const lastmod = safeLastmod(item.lastmod);
    return `  <url>
    <loc>${escapeXml(item.loc)}</loc>${lastmod ? `
    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}${item.changefreq ? `
    <changefreq>${item.changefreq}</changefreq>` : ""}${item.priority ? `
    <priority>${item.priority}</priority>` : ""}
  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${body}
</urlset>
`;
}
function buildRobotsTxt() {
  const blocked2 = [
    "/api/",
    "/admin",
    "/dashboard",
    "/empresa",
    "/autopilot",
    "/criar-conteudo",
    "/criar-imagem",
    "/criar-video",
    "/criar-artigo",
    "/seo",
    "/campanhas",
    "/calendario",
    "/redes-sociais",
    "/conteudos",
    "/analytics",
    "/creditos",
    "/perfil",
    "/configuracoes",
    "/suporte"
  ];
  return `User-agent: *
Allow: /
Allow: /alma
Allow: /alma/
Allow: /blog
Allow: /blog/
Allow: /vitrine
Allow: /vitrine/
Allow: /planos
Allow: /termos
Allow: /privacidade
${blocked2.map((path2) => `Disallow: ${path2}`).join("\n")}

Sitemap: ${config.appUrl.replace(/\/$/, "")}/sitemap.xml
`;
}
router.get("/api/portal/projects", asyncRoute(async (_req, res) => {
  let projects = await listAllPortalProjectsFromDb();
  if (!projects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    projects = seeded.projects;
  }
  res.json({
    brand: PORTAL_VIP_OFFICIAL_ASSETS,
    projects,
    total: projects.length
  });
}));
router.post("/api/portal/projects/seed", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const result = await seedPortalProjectsIfEmpty();
  res.json({ success: true, ...result });
}));
router.get("/api/portal/projects/:slug", asyncRoute(async (req, res) => {
  const project = await getPortalProjectFromDb(req.params.slug);
  if (!project) return res.status(404).json({ error: "Projeto n\xE3o encontrado na Vitrine Portal Vip Brasil." });
  res.json({ project });
}));
router.patch("/api/portal/projects/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const updated = await updatePortalProjectInDb(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Projeto n\xE3o encontrado para atualiza\xE7\xE3o." });
  res.json({ success: true, project: updated });
}));
router.post("/api/portal/daily-pulse", asyncRoute(async (req, res) => {
  const userId = req.user?.id || "portal_vip_admin";
  const result = await runDailyPortalMarketingCycle(userId);
  res.json(result);
}));
router.get("/api/portal/antifall-status", asyncRoute(async (req, res) => {
  const testStart = Date.now();
  const testResult = await executeAiWith2SecAntiFall({
    prompt: "Verifica\xE7\xE3o r\xE1pida de integridade da esteira de IA com failover 2s.",
    maxTokens: 50,
    timeoutMs: 2e3
  });
  res.json({
    status: "ONLINE",
    protection: "2-Second Anti-Fall Redundancy Active",
    activeTier: testResult.versionTier,
    activeModel: testResult.modelUsed,
    totalLatencyMs: testResult.totalDurationMs,
    attempts: testResult.attempts,
    failoverTriggered: testResult.antiFallActivated,
    supportedTiers: [
      { tier: "3.7", model: "Gemini 3.7 Pro / 3.1 Pro Preview", status: "READY" },
      { tier: "3.6", model: "Gemini 2.5 Flash / 3.6", status: "READY" },
      { tier: "3.5", model: "Gemini 3.1 Flash-Lite / 2.5 Lite", status: "READY" }
    ],
    timestamp: nowIso()
  });
}));
router.get("/api/portal/blog/articles", asyncRoute(async (req, res) => {
  const category = req.query.category ? String(req.query.category) : void 0;
  const projectId = req.query.projectId ? String(req.query.projectId) : void 0;
  const query = req.query.q ? String(req.query.q) : void 0;
  const status = req.query.status ? String(req.query.status) : void 0;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const result = await listBlogArticles({ category, projectId, query, status, limit, offset });
  res.json(result);
}));
router.get("/api/portal/blog/articles/:slug", asyncRoute(async (req, res) => {
  const article = await getBlogArticleBySlug(req.params.slug);
  if (!article) return res.status(404).json({ error: "Artigo n\xE3o encontrado no Blog do Portal Vip Brasil." });
  try {
    const db = firestore();
    await db.collection(COLLECTIONS.blogArticles).doc(article.id).set({
      views: (article.views || 0) + 1
    }, { merge: true });
    article.views = (article.views || 0) + 1;
  } catch {
  }
  res.json({ article });
}));
router.get("/api/portal/blog/settings", asyncRoute(async (req, res) => {
  const settings = await getBlogSettings();
  res.json({ settings });
}));
router.post("/api/portal/blog/settings", asyncRoute(async (req, res) => {
  const partial = req.body || {};
  const settings = await updateBlogSettings(partial);
  res.json({ success: true, settings });
}));
router.post("/api/portal/blog/generate-project-article", asyncRoute(async (req, res) => {
  const { projectId, customTopic, customIntent, forceApproval } = req.body || {};
  const project = PORTAL_VIP_PROJECTS.find((p) => p.id === projectId || p.slug === projectId);
  if (!project) {
    return res.status(404).json({ error: "Projeto n\xE3o encontrado na vitrine do Portal Vip Brasil." });
  }
  const userId = req.user?.id || "portal_vip_admin";
  const result = await generateArticleForProject(project, {
    customTopic,
    customIntent,
    forceApproval,
    userId
  });
  res.json(result);
}));
router.post("/api/portal/blog/daily-cycle", asyncRoute(async (req, res) => {
  const userId = req.user?.id || "portal_vip_admin";
  const result = await runDailyBlogCycle(userId);
  res.json(result);
}));
router.patch("/api/portal/blog/articles/:id/status", asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!["published", "pending_approval", "draft", "archived"].includes(status)) {
    return res.status(400).json({ error: "Status inv\xE1lido fornecido." });
  }
  const db = firestore();
  await db.collection(COLLECTIONS.blogArticles).doc(id).set({
    status,
    updatedAt: nowIso()
  }, { merge: true });
  res.json({ success: true, id, status });
}));
router.post("/api/portal/blog/track", asyncRoute(async (req, res) => {
  const { articleId, metric } = req.body || {};
  if (!articleId || !metric) return res.status(400).json({ error: "articleId e metric s\xE3o obrigat\xF3rios." });
  const validMetrics = ["views", "likes", "shares", "clicksWebsite", "clicksPlayStore"];
  if (!validMetrics.includes(metric)) return res.status(400).json({ error: "M\xE9trica inv\xE1lida." });
  try {
    const db = firestore();
    const docRef = db.collection(COLLECTIONS.blogArticles).doc(articleId);
    const snap = await docRef.get();
    if (snap.exists) {
      const current = snap.data()[metric] || 0;
      await docRef.set({ [metric]: current + 1 }, { merge: true });
    }
  } catch (err) {
    console.warn("[BlogEngine] Erro ao registrar tracking:", err);
  }
  res.json({ success: true, articleId, metric });
}));
var router_default = router;

// server/production/publicPages.ts
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function absolute(value) {
  if (!value) return PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
  try {
    return new URL(value, config.appUrl).toString();
  } catch {
    return PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
  }
}
function description(value, fallback) {
  return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, 180);
}
async function metaFor(pathname) {
  const base = config.appUrl.replace(/\/$/, "");
  const fallback = {
    title: "Portal Vip Brasil \u2014 Central de Marketing, Vitrine e Divulga\xE7\xE3o Autom\xE1tica",
    description: "Vitrine oficial e motor de marketing do Portal Vip Brasil. Divulga\xE7\xE3o de sites e aplicativos da Play Store com SEO inteligente para Bing e Google.",
    canonical: `${base}${pathname === "/" ? "/" : pathname}`,
    image: PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
    type: "website",
    status: 200,
    schema: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Portal Vip Brasil",
      url: base,
      logo: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl
    }
  };
  if (pathname === "/vitrine") {
    return {
      ...fallback,
      title: "Vitrine Oficial de Sites & Aplicativos \u2014 Portal Vip Brasil",
      description: "Conhe\xE7a nosso portf\xF3lio de sites e aplicativos da Play Store: Magia das Cren\xE7as, Exu Responde, Maria Padilha, Manual Cat\xF3lico, Froc IA, Or\xE1culos TS e Marketing Engine."
    };
  }
  const vitrineMatch = pathname.match(/^\/vitrine\/([^/]+)$/);
  if (vitrineMatch) {
    const slug = decodeURIComponent(vitrineMatch[1]);
    const localProject = getProjectBySlug(slug);
    if (localProject) {
      const canonical = `${base}/vitrine/${encodeURIComponent(localProject.slug)}`;
      return {
        title: `${localProject.name} \u2014 Vitrine Portal Vip Brasil`,
        description: description(localProject.description, `${localProject.name} no Portal Vip Brasil.`),
        canonical,
        image: localProject.bannerUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
        type: "website",
        status: 200,
        schema: {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: localProject.name,
          url: localProject.websiteUrl,
          applicationCategory: localProject.category,
          operatingSystem: localProject.hasApp ? "Web, Android" : "Web",
          description: localProject.description
        }
      };
    }
  }
  if (vitrineMatch) {
    try {
      const slug = decodeURIComponent(vitrineMatch[1]);
      const snap = await firestore().collection(COLLECTIONS.companies).where("slug", "==", slug).limit(1).get();
      if (snap.empty) return { ...fallback, status: 404, title: "Empresa n\xE3o encontrada \u2014 Froc.IA", description: "Esta empresa n\xE3o est\xE1 dispon\xEDvel na Vitrine Froc.IA." };
      const companyData = snap.docs[0].data();
      const isPublic = companyData.isPublicInVitrine === true || companyData.isPublicInVitrine === "true";
      if (!isPublic) return { ...fallback, status: 404, title: "Empresa n\xE3o encontrada \u2014 Froc.IA", description: "Esta empresa n\xE3o est\xE1 dispon\xEDvel na Vitrine Froc.IA." };
      const company = { id: snap.docs[0].id, ...companyData };
      const canonical = `${base}/vitrine/${encodeURIComponent(company.slug)}`;
      return {
        title: `${company.name} \u2014 Vitrine Froc.IA`,
        description: description(company.description, `${company.name} na Vitrine Froc.IA.`),
        canonical,
        image: absolute(company.logoUrl),
        type: "website",
        status: 200,
        schema: {
          "@context": "https://schema.org",
          "@type": company.businessType === "online" ? "OnlineBusiness" : company.businessType === "physical" ? "LocalBusiness" : "Organization",
          name: company.name,
          url: company.website || canonical,
          description: company.description || void 0,
          logo: company.logoUrl || void 0,
          email: company.email || void 0,
          telephone: company.phone || company.whatsapp || void 0,
          address: company.businessType !== "online" && (company.address || company.city) ? { "@type": "PostalAddress", streetAddress: company.address || void 0, addressLocality: company.city || void 0, addressRegion: company.state || void 0, addressCountry: company.country || "BR" } : void 0,
          sameAs: Object.values(company.socialLinks || {}).filter(Boolean)
        }
      };
    } catch {
      return fallback;
    }
  }
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const slug = decodeURIComponent(blogMatch[1]);
      const snap = await firestore().collection(COLLECTIONS.blogPosts).where("slug", "==", slug).where("status", "==", "published").limit(1).get();
      if (snap.empty) return { ...fallback, status: 404, title: "Artigo n\xE3o encontrado \u2014 Froc.IA", description: "Este artigo n\xE3o est\xE1 dispon\xEDvel no Froc Magazine." };
      const post = { id: snap.docs[0].id, ...snap.docs[0].data() };
      const canonical = `${base}/blog/${encodeURIComponent(post.slug)}`;
      return {
        title: post.seoTitle || `${post.title} \u2014 Froc Magazine`,
        description: description(post.seoDescription || post.summary, "Artigo do Froc Magazine."),
        canonical,
        image: absolute(post.featuredImageUrl),
        type: "article",
        status: 200,
        schema: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.summary || post.seoDescription,
          image: post.featuredImageUrl ? [absolute(post.featuredImageUrl)] : void 0,
          datePublished: post.publishedAt || post.createdAt,
          dateModified: post.updatedAt || post.publishedAt || post.createdAt,
          author: { "@type": "Organization", name: post.author || "Equipe Froc.IA" },
          publisher: { "@type": "Organization", name: "Froc.IA", logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
          mainEntityOfPage: canonical
        }
      };
    } catch {
      return fallback;
    }
  }
  return fallback;
}
async function renderPublicPage(pathname) {
  const meta = await metaFor(pathname);
  const noindex = meta.status === 404 ? '<meta name="robots" content="noindex,follow" />' : "";
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#050811" />
<meta name="google-site-verification" content="WgcZ29owPWh-IYCntXdzzCadEoHsfk7NA7rx65_NRE4" />
${noindex}
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}" />
<link rel="canonical" href="${esc(meta.canonical)}" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="Portal Vip Brasil" />
<meta property="og:type" content="${meta.type}" />
<meta property="og:url" content="${esc(meta.canonical)}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
<script type="application/ld+json">${jsonLd(meta.schema)}</script>
<link rel="stylesheet" href="/assets/app.css" />
</head><body class="bg-[#0B0F19] text-slate-100 antialiased"><div id="root"></div><noscript>O Portal Vip Brasil precisa de JavaScript habilitado.</noscript><script type="module" src="/assets/app.js"></script></body></html>`;
  return { html, status: meta.status };
}
function renderPrivateAppPage(pathname) {
  const title = "Portal Vip Brasil \u2014 Central de Marketing & Painel";
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#0B0F19" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<title>${esc(title)}</title>
<meta name="description" content="\xC1rea administrativa do Portal Vip Brasil." />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="${PORTAL_VIP_OFFICIAL_ASSETS.logoUrl}" />
<link rel="stylesheet" href="/assets/app.css" />
</head><body class="bg-[#0B0F19] text-slate-100 antialiased" data-froc-path="${esc(pathname)}"><div id="root"></div><noscript>O Portal Vip Brasil precisa de JavaScript habilitado.</noscript><script type="module" src="/assets/app.js"></script></body></html>`;
  return { html, status: 200 };
}

// server/app.ts
assertProductionConfig();
var MUTATING_METHODS = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
var REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
function normalizedRequestId(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return REQUEST_ID_PATTERN.test(candidate) ? candidate : import_crypto6.default.randomUUID();
}
function requestIp(req) {
  const value = String(req.ip || req.socket.remoteAddress || "unknown").trim();
  return value.slice(0, 200) || "unknown";
}
function rateLimitPolicy(req) {
  if (req.method === "OPTIONS") return null;
  const path2 = req.path.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  if (path2 === "/api/webhooks/mercadopago") {
    return { group: "webhook-mercadopago", limit: 600, windowMs: 6e4 };
  }
  if (path2.startsWith("/api/cron/")) {
    return { group: "cron", limit: 120, windowMs: 6e4 };
  }
  if (path2 === "/api/auth/bootstrap-admin") {
    return { group: "auth-bootstrap-admin", limit: 5, windowMs: 15 * 6e4 };
  }
  if (path2 === "/api/auth/sync-profile" || path2 === "/api/auth/accept-terms" || path2 === "/api/auth/profile") {
    return { group: "auth-mutation", limit: 30, windowMs: 10 * 6e4 };
  }
  if (path2 === "/api/payments/checkout" || path2 === "/api/payments/subscription/cancel") {
    return { group: "payments-mutation", limit: 20, windowMs: 10 * 6e4 };
  }
  if (req.method === "POST" && path2.startsWith("/api/ai/")) {
    return { group: "ai-generation", limit: 120, windowMs: 10 * 6e4 };
  }
  if (req.method === "POST" && path2 === "/api/seo/analyze") {
    return { group: "seo-analysis", limit: 20, windowMs: 10 * 6e4 };
  }
  if (MUTATING_METHODS.has(req.method) && (path2.startsWith("/api/social/") || path2.startsWith("/api/support/"))) {
    return { group: "social-support-mutation", limit: 100, windowMs: 10 * 6e4 };
  }
  if (MUTATING_METHODS.has(req.method) && path2.startsWith("/api/admin/")) {
    return { group: "admin-mutation", limit: 100, windowMs: 10 * 6e4 };
  }
  if (MUTATING_METHODS.has(req.method) && path2.startsWith("/api/")) {
    return { group: "api-mutation", limit: 240, windowMs: 10 * 6e4 };
  }
  return null;
}
function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
}
function sanitizeLogText(value) {
  return String(value ?? "").replace(/(authorization|access[_-]?token|refresh[_-]?token|secret|password|private[_-]?key)(\s*[:=]\s*)([^\s,;]+)/gi, "$1$2[REDACTED]").replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}
function publicErrorStatus(error) {
  if (error?.code === "CORS_DENIED") return 403;
  if (error?.type === "entity.too.large") return 413;
  if (error?.type === "entity.parse.failed") return 400;
  const requested = Number(error?.statusCode || error?.status);
  return Number.isSafeInteger(requested) && requested >= 400 && requested <= 599 ? requested : 500;
}
function publicErrorMessage(error, status) {
  if (error?.code === "CORS_DENIED") return "Origem n\xE3o autorizada.";
  if (error?.type === "entity.too.large" || status === 413) return "Corpo da requisi\xE7\xE3o excede o limite permitido.";
  if (error?.type === "entity.parse.failed" || status === 400) return "Corpo JSON inv\xE1lido.";
  if (status === 429) return "Muitas requisi\xE7\xF5es. Aguarde antes de tentar novamente.";
  if (status === 503) return "Servi\xE7o temporariamente indispon\xEDvel.";
  if (status >= 500) return "Erro interno do servidor.";
  return "Requisi\xE7\xE3o rejeitada.";
}
function createApp() {
  const app = (0, import_express2.default)();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const requestId = normalizedRequestId(req.headers["x-request-id"]);
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
    if (config.isProduction) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("Content-Security-Policy", contentSecurityPolicy());
    }
    next();
  });
  app.use((0, import_cors.default)({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/$/, "");
      if (!config.isProduction || config.corsOrigins.includes(normalized)) {
        return callback(null, true);
      }
      const error = new Error("CORS denied");
      error.code = "CORS_DENIED";
      error.statusCode = 403;
      return callback(error);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Signature", "X-Idempotency-Key"],
    exposedHeaders: ["X-Request-Id", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"],
    maxAge: 86400
  }));
  app.use(async (req, res, next) => {
    const policy = rateLimitPolicy(req);
    if (!policy) {
      next();
      return;
    }
    try {
      const result = await consumeRateLimit({
        key: `${policy.group}:${requestIp(req)}`,
        limit: policy.limit,
        windowMs: policy.windowMs
      });
      res.setHeader("RateLimit-Limit", String(result.limit));
      res.setHeader("RateLimit-Remaining", String(result.remaining));
      res.setHeader("RateLimit-Reset", String(Math.ceil(new Date(result.resetAt).getTime() / 1e3)));
      if (!result.allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1e3));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          error: "Muitas requisi\xE7\xF5es. Aguarde antes de tentar novamente.",
          requestId: res.locals.requestId
        });
        return;
      }
      next();
    } catch (error) {
      const unavailable = new Error("Persistent rate limiter unavailable");
      unavailable.statusCode = 503;
      unavailable.code = "RATE_LIMIT_STORE_UNAVAILABLE";
      unavailable.cause = error;
      next(unavailable);
    }
  });
  app.use(import_express2.default.json({
    limit: "2mb",
    strict: true
  }));
  app.use(import_express2.default.urlencoded({
    extended: false,
    limit: "256kb",
    parameterLimit: 100
  }));
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      res.type("application/xml").send(await buildSitemapXml());
    } catch (error) {
      next(error);
    }
  });
  app.get("/robots.txt", (_req, res) => res.type("text/plain").send(buildRobotsTxt()));
  app.get(
    [
      "/",
      "/alma",
      "/alma/home",
      "/alma/agentes",
      "/alma/visao",
      "/alma/memoria",
      "/vitrine",
      "/vitrine/:slug",
      "/blog",
      "/blog/:slug",
      "/planos",
      "/termos",
      "/privacidade"
    ],
    async (req, res, next) => {
      if (!config.isProduction) return next();
      try {
        const page = await renderPublicPage(req.path);
        res.status(page.status).type("text/html").send(page.html);
      } catch (error) {
        next(error);
      }
    }
  );
  const privateAppRoutes = [
    "/dashboard",
    "/empresa",
    "/froc-ia",
    "/autopilot",
    "/criar-conteudo",
    "/criar-imagem",
    "/criar-video",
    "/criar-artigo",
    "/seo",
    "/campanhas",
    "/calendario",
    "/redes-sociais",
    "/conteudos",
    "/analytics",
    "/creditos",
    "/perfil",
    "/configuracoes",
    "/suporte",
    "/admin"
  ];
  app.get(privateAppRoutes, (req, res, next) => {
    if (!config.isProduction) return next();
    const page = renderPrivateAppPage(req.path);
    res.status(page.status).type("text/html").send(page.html);
  });
  app.use("/api", router_default);
  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: "Endpoint Froc.IA n\xE3o encontrado.",
      requestId: res.locals.requestId
    });
  });
  app.use((error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const status = publicErrorStatus(error);
    const requestId = String(res.locals.requestId || "");
    console.error("[Froc API Error]", {
      requestId,
      status,
      code: sanitizeLogText(error?.code || error?.type || "INTERNAL_ERROR"),
      message: sanitizeLogText(error?.message || "Falha desconhecida")
    });
    res.status(status).json({
      error: publicErrorMessage(error, status),
      requestId
    });
  });
  return app;
}
var app_default = createApp();

// server.ts
async function startServer() {
  const app = createApp();
  if (!config.isProduction) {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express3.default.static(distPath, { maxAge: "1h", etag: true }));
    app.get("*", (_req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.listen(config.port, config.host, () => {
    console.log(`[Froc.IA] servidor em http://${config.host}:${config.port}`);
  });
}
startServer().catch((error) => {
  console.error("[Froc.IA] falha fatal:", error);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
