import { Router, type Request, type Response } from 'express';
import { getAdminAuth, getAdminStorage } from '../providers/firebaseAdmin.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest, CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION, ensureUserProfile, hasAcceptedLatestTerms, requireAdmin, requireAuth } from './auth.js';
import { generateArticle, generateCarousel, generateCopy, generateImagePrompt, generateMarketingImage, generatePlatformArticle, generatePost, generateStrategy, generateVideoDirection, generateVideoScript, startVideoGenerationJob, checkAndCompleteVideoJob, listUserVideoJobs, textAiClient } from './ai.js';
import { analyzeSeo } from './seo.js';
import { createOAuthUrl, createPinterestPin, disconnectSocial, ensureValidSocialAccessToken, getFacebookPageSelectionCandidates, getPinterestBoards, getProviderAutoPublishReason, getSocialReadiness, getTikTokUploadStatus, handleOAuthCallback, initTikTokDraftUpload, initYouTubeResumableUpload, isTextAutoPublishSupported, listConnections, MAX_TIKTOK_SANDBOX_VIDEO_SIZE, normalizeProvider, publishInstagramMedia, sanitizeOAuthPublicError, selectFacebookPage, TEXT_AUTO_PUBLISH_PROVIDERS, uploadTikTokDraftVideo, type SocialProvider } from './social.js';
import { getSchedulerDiagnostics, getSchedulerHealth, getSchedulerPublicRuntime, processSchedulerTick, triggerUserAutopilot } from './scheduler.js';
import { parseAlmaIntent, executeAlmaOrchestration, getSmartDevicesList, updateSmartDeviceState } from './almaCore.js';
import { PORTAL_VIP_PROJECTS, PORTAL_VIP_OFFICIAL_ASSETS, createPortalProjectInDb, deletePortalProjectInDb, getProjectBySlug, listAllPortalProjectsFromDb, getPortalProjectFromDb, seedPortalProjectsIfEmpty, updatePortalProjectInDb } from './almaPortfolio.js';
import { executeAiWith2SecAntiFall, runDailyPortalMarketingCycle } from './antiFallEngine.js';
import {
  listBlogArticles,
  getBlogArticleBySlug,
  generateArticleForProject,
  runDailyBlogCycle,
  getBlogSettings,
  updateBlogSettings,
  INITIAL_SEEDED_ARTICLES,
  notifyIndexNow,
  serializeBlogArticleForPublic
} from './blogEngine.js';
import multer from 'multer';

import { COLLECTIONS, cleanObject, createNotification, firestore, newId, nowIso, probeDatabaseHealth, queryData, slugify, writeAdminLog } from './store.js';

const router = Router();

type AsyncHandler = (req: any, res: Response) => Promise<any>;
const asyncRoute = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error: any) {
    const requestedStatus = Number(error?.statusCode || error?.status || (error instanceof RangeError ? 400 : 500));
    const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599
      ? requestedStatus
      : 500;
    if (status >= 500) console.error('[Portal Vip Brasil API]', error);
    const publicMessage = status >= 500
      ? 'Erro interno no Portal Vip Brasil.'
      : String(error?.message || 'Requisição inválida.').slice(0, 500);
    res.status(status).json({ error: publicMessage });
  }
};

function safeString(value: any, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

function stringArray(value: any, max = 50): string[] {
  if (!Array.isArray(value)) return value ? [safeString(value)] : [];
  return value.slice(0, max).map((item) => safeString(item, 300)).filter(Boolean);
}

function safeHttpUrl(value: any, max = 1500): string {
  const raw = safeString(value, max);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function safeEmail(value: any): string {
  const raw = safeString(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : '';
}

function sanitizedSocialLinks(value: any): Record<string, string> {
  const allowed = ['instagram','facebook','tiktok','youtube','linkedin','pinterest','x'];
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const url = safeHttpUrl(value[key], 1000);
    if (url) out[key] = url;
  }
  return out;
}

export function parseStrictBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
  }
  return false;
}

function normalizeCompanyField(key: string, value: any): any {
  if (['website','androidApp','iosApp','logoUrl'].includes(key)) return safeHttpUrl(value);
  if (key === 'email') return safeEmail(value);
  if (key === 'businessType') {
    const raw = safeString(value, 30).toLowerCase();
    return ['online', 'physical', 'hybrid'].includes(raw) ? raw : 'online';
  }
  if (key === 'onlineChannels') return stringArray(value);
  if (key === 'socialLinks') return sanitizedSocialLinks(value);
  if (['products','services','competitors','keywords'].includes(key)) return stringArray(value);
  if (key === 'isPublicInVitrine') {
    return parseStrictBoolean(value);
  }
  if (key === 'marketingProfile') return value && typeof value === 'object' ? cleanObject(value) : undefined;
  const limits: Record<string, number> = { name:120, description:5000, phone:80, whatsapp:80, address:500, city:150, state:100, country:100, category:150, segment:200, targetAudience:3000, coverageRegion:500, differentials:3000, brandTone:500, goals:2000 };
  return safeString(value, limits[key] || 1000);
}

function projectToCompanyContext(userId: string, project: any): any {
  return {
    id: project.id,
    userId,
    name: project.name,
    slug: project.slug,
    category: project.category,
    segment: project.segment,
    description: project.description,
    website: project.websiteUrl,
    websiteUrl: project.websiteUrl,
    androidApp: project.playStoreUrl,
    targetAudience: project.targetAudience,
    keywords: project.keywords || [],
    products: [],
    services: [],
    socialLinks: {},
    isPublicInVitrine: project.active !== false,
    virtual: true,
    portalProject: true,
    active: project.active !== false,
    dailyMarketingEnabled: project.dailyMarketingEnabled !== false,
    dailyBlogEnabled: project.dailyBlogEnabled !== false,
    isSeedProject: project.isSeedProject === true
  };
}

async function portalProjectContext(userId: string, projectId?: string): Promise<any | undefined> {
  if (!projectId) return undefined;
  if (projectId === 'portal_vip') {
    return {
      id: 'portal_vip', userId, name: 'Portal Vip Brasil', category: 'Marketing & Automação',
      description: 'Central privada de marketing e automação do Portal Vip Brasil.', products: [], services: [],
      keywords: [], isPublicInVitrine: false, virtual: true, portalProject: true, active: true
    };
  }
  const project = await getPortalProjectFromDb(projectId);
  return project ? projectToCompanyContext(userId, project) : undefined;
}

export async function ownedCompany(userId: string, companyId?: string): Promise<any | undefined> {
  return portalProjectContext(userId, companyId);
}

export async function requireOwnedCompany(userId: string, companyId: string): Promise<any> {
  const project = await ownedCompany(userId, companyId);
  if (!project) {
    const error: any = new Error('Projeto não encontrado ou não autorizado.');
    error.statusCode = 404;
    throw error;
  }
  return project;
}

async function requireSocialCompany(userId: string, companyId: string): Promise<any> {
  return requireOwnedCompany(userId, companyId);
}

async function requireSocialPublishingAccess(userId: string, role?: string): Promise<void> {
  void userId;
  void role;
}

function cleanHeading(txt: string): string {
  if (!txt) return '';
  return String(txt)
    .replace(/^#+\s*/, '')
    .replace(/^[Hh][1-6][:\s-]+/i, '')
    .replace(/^#+\s*/, '')
    .trim();
}

function contentBodyFromArticle(article: any): string {
  const parts = [`# ${cleanHeading(article.title || '')}`, article.introduction || ''];
  for (const section of article.sections || []) {
    parts.push(`## ${cleanHeading(section.h2 || '')}`, section.content || '');
    for (const sub of section.h3s || []) parts.push(`### ${cleanHeading(sub.h3 || '')}`, sub.content || '');
  }
  if (article.faqSection?.length) {
    parts.push('## Perguntas Frequentes');
    for (const faq of article.faqSection) parts.push(`### ${cleanHeading(faq.question || '')}`, faq.answer || '');
  }
  parts.push('## Conclusão', article.conclusion || '', article.callToAction || '');
  return parts.filter(Boolean).join('\n\n');
}

// Health
router.get('/health', asyncRoute(async (_req, res) => {
  const [dbHealth, schedulerRuntime] = await Promise.all([
    probeDatabaseHealth(),
    getSchedulerPublicRuntime()
  ]);
  const statusCode = dbHealth.status === 'healthy' ? 200 : dbHealth.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealth.status === 'healthy' ? 'ok' : dbHealth.status,
    service: 'Portal Vip Brasil API',
    database: dbHealth,
    environment: config.nodeEnv,
    appUrl: config.appUrl,
    deployment: {
      platform: process.env.VERCEL ? 'vercel' : 'node',
      release: 'portal-final-r5c-20260904'
    },
    automation: {
      cronSecretConfigured: Boolean(config.cronSecret),
      nativeCronConfigured: true,
      scheduleUtc: '0 13 * * *',
      timezone: 'America/Sao_Paulo',
      execution: schedulerRuntime
    },
    timestamp: nowIso()
  });
}));

// Authentication/profile. Password lifecycle remains in Firebase Auth client.
router.post('/auth/sync-profile', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const now = nowIso();
  const name = safeString(req.body?.name, 120);
  const isExistingUser = Boolean(req.user?.termsAcceptedAt);

  let termsAcceptedAt: string | undefined = req.user?.termsAcceptedAt;
  let privacyAcceptedAt: string | undefined = req.user?.privacyAcceptedAt;
  let termsVersion: string | undefined = req.user?.termsVersion;
  let privacyVersion: string | undefined = req.user?.privacyVersion;

  if (!isExistingUser) {
    const hasTerms = Boolean(req.body?.termsAccepted);
    const hasPrivacy = Boolean(req.body?.privacyAccepted);
    if (!hasTerms || !hasPrivacy) {
      return res.status(428).json({ error: 'Para ativar o acesso administrativo, aceite os Termos de Uso e a Política de Privacidade.' });
    }
    termsAcceptedAt = now;
    privacyAcceptedAt = now;
    termsVersion = CURRENT_TERMS_VERSION;
    privacyVersion = CURRENT_PRIVACY_VERSION;
  }

  const profile = await ensureUserProfile(req.firebaseUser!, {
    name: name || req.user?.name,
    termsAcceptedAt,
    privacyAcceptedAt,
    termsVersion,
    privacyVersion,
    avatarUrl: safeString(req.body?.avatarUrl, 1000) || req.user?.avatarUrl
  });

  res.json({
    user: profile,
    wallet: null,
    needsTermsConsent: !hasAcceptedLatestTerms(profile),
    currentTermsVersion: CURRENT_TERMS_VERSION,
    security: { privatePortal: true, reason: 'private_portal', message: 'Portal administrativo privado.' }
  });
}));

router.post('/auth/accept-terms', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const termsAccepted = req.body?.termsAccepted === true;
  const privacyAccepted = req.body?.privacyAccepted === true;
  if (!termsAccepted || !privacyAccepted) {
    return res.status(400).json({ error: 'Você precisa aceitar explicitamente os Termos de Uso e a Política de Privacidade.' });
  }

  // O backend é a fonte de verdade absoluta para as versões legais vigentes (ignora versões enviadas no payload do cliente)
  const now = nowIso();

  const profile = await ensureUserProfile(req.firebaseUser!, {
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION
  });

  res.json({
    message: 'Termos de Uso e Política de Privacidade aceitos com sucesso.',
    user: profile,
    wallet: null,
    needsTermsConsent: false,
    currentTermsVersion: CURRENT_TERMS_VERSION
  });
}));

router.get('/auth/me', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user,
    wallet: null,
    needsTermsConsent: !hasAcceptedLatestTerms(req.user),
    currentTermsVersion: CURRENT_TERMS_VERSION
  });
}));

router.patch('/auth/profile', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const name = safeString(req.body?.name, 120);
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
  await firestore().collection(COLLECTIONS.users).doc(req.user!.id).set({ name, updatedAt: nowIso() }, { merge: true });
  await getAdminAuth().updateUser(req.user!.id, { displayName: name });
  const fresh = await firestore().collection(COLLECTIONS.users).doc(req.user!.id).get();
  res.json({ message: 'Perfil atualizado com sucesso.', user: { id: fresh.id, ...fresh.data() } });
}));

router.post('/auth/bootstrap-admin', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  if (!config.adminBootstrap.enabled || !config.adminBootstrap.key) {
    return res.status(403).json({ error: 'Recurso de bootstrap de administrador desabilitado.' });
  }
  if (safeString(req.body?.secretKey, 500) !== config.adminBootstrap.key) {
    return res.status(403).json({ error: 'Chave de bootstrap inválida.' });
  }
  await getAdminAuth().setCustomUserClaims(req.user!.id, { role: 'admin', frocRole: 'admin' });
  await firestore().collection(COLLECTIONS.users).doc(req.user!.id).set({ role: 'admin', updatedAt: nowIso() }, { merge: true });
  await writeAdminLog({ operatorId: req.user!.id, operatorEmail: req.user!.email, action: 'bootstrap_admin', targetUserId: req.user!.id });
  res.json({ message: 'Administrador configurado. Renove a sessão para atualizar as permissões.', role: 'admin' });
}));

// Dashboard status
router.get('/dashboard/status', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId, 200);
  const db = firestore();

  const [seoSnap, socialSnap, autopilotSnap, contentSnap] = await Promise.all([
    db.collection(COLLECTIONS.seoReports).where('userId', '==', req.user!.id).get(),
    db.collection(COLLECTIONS.socialConnections).where('userId', '==', req.user!.id).get(),
    db.collection(COLLECTIONS.autopilotConfigs).where('userId', '==', req.user!.id).get(),
    db.collection(COLLECTIONS.contentItems).where('userId', '==', req.user!.id).get()
  ]);

  const matchesProject = (item: any) => !companyId || item.companyId === companyId;
  const now = Date.now();

  const seoReports = queryData<any>(seoSnap).filter(matchesProject);
  const socialConnections = queryData<any>(socialSnap).filter((item) => {
    if (!matchesProject(item) || item.status !== 'connected') return false;
    if (!item.expiresAt) return true;
    const expiresAt = new Date(item.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
  const autopilotConfigs = queryData<any>(autopilotSnap).filter(
    (item) => matchesProject(item) && item.enabled === true
  );
  const createdArticles = queryData<any>(contentSnap).filter(
    (item) => matchesProject(item) && item.type === 'article'
  );

  res.json({
    hasSeoAudit: seoReports.length > 0,
    connectedSocialCount: socialConnections.length,
    seoReportsCount: seoReports.length,
    autopilotEnabled: autopilotConfigs.length > 0,
    hasCreatedArticle: createdArticles.length > 0
  });
}));

// Compatibilidade interna: aliases antigos retornam os projetos ativos do cadastro dinâmico.
router.get('/companies', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const projects = (await listAllPortalProjectsFromDb())
    .filter((project) => project.active !== false)
    .map((project) => projectToCompanyContext(req.user!.id, project));
  res.json({ companies: projects, projects });
}));

router.get('/companies/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const project = await portalProjectContext(req.user!.id, safeString(req.params.id, 200));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ company: project, project });
}));

// AI
router.get('/ai/costs', (_req, res) => res.json({ costs: {} }));

router.post('/ai/generate-post', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const topic = safeString(req.body?.topic, 5000);
  if (!topic) return res.status(400).json({ error: 'O tema do post é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generatePost({ userId: req.user!.id, company, topic, platform: safeString(req.body?.platform, 100), goal: safeString(req.body?.goal, 1000), tone: safeString(req.body?.tone, 500) });
  const id = newId('content');
  const contentItem = { id, userId: req.user!.id, companyId: company?.id || 'default', type: 'post', title: generated.result.headline, headline: generated.result.headline, body: generated.result.body, cta: generated.result.cta, hashtags: generated.result.hashtags || [], keywords: generated.result.keywords || [], visualPrompt: generated.result.visualPrompt || '', targetPlatform: safeString(req.body?.platform, 100) || 'Instagram', tone: safeString(req.body?.tone, 500), creditsUsed: generated.creditsUsed, status: 'saved', createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(contentItem);
  res.json({ post: generated.result, contentItem, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));

router.post('/ai/generate-strategy', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'Selecione uma empresa.' });
  const company = await requireOwnedCompany(req.user!.id, companyId);
  const generated = await generateStrategy({ userId: req.user!.id, company, timeframe: req.body?.timeframe === 'mes' ? 'mes' : 'semana', goal: safeString(req.body?.goal, 5000) });
  res.json({ strategy: generated.result, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));

router.post('/ai/generate-copy', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const prompt = safeString(req.body?.prompt, 5000);
  if (!prompt) return res.status(400).json({ error: 'A instrução é obrigatória.' });
  const type = ['cta','headline','caption','variations'].includes(req.body?.type) ? req.body.type : 'caption';
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generateCopy({ userId: req.user!.id, company, type, prompt });
  res.json({ text: generated.result, creditsUsed: generated.creditsUsed, modelUsed: generated.modelUsed });
}));

router.post('/ai/generate-carousel', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const topic = safeString(req.body?.topic, 5000);
  if (!topic) return res.status(400).json({ error: 'O tema é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generateCarousel({ userId: req.user!.id, company, topic, slidesCount: Number(req.body?.slidesCount || 5), goal: safeString(req.body?.goal, 2000) });
  const id = newId('content');
  const item = { id, userId: req.user!.id, companyId: company?.id || 'default', type: 'carousel', title: generated.result.carouselTitle || `Carrossel: ${topic}`, headline: generated.result.carouselTitle || '', body: generated.result.caption || '', carouselSlides: generated.result.slides || [], hashtags: generated.result.hashtags || [], keywords: [], creditsUsed: generated.creditsUsed, status: 'saved', targetPlatform: 'Instagram', createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ carousel: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));

router.post('/ai/generate-video-script', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const topic = safeString(req.body?.topic, 5000);
  if (!topic) return res.status(400).json({ error: 'O tema do vídeo é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generateVideoScript({ userId: req.user!.id, company, topic, durationSeconds: Number(req.body?.durationSeconds || 60), format: safeString(req.body?.format, 200) });
  const id = newId('content');
  const item = { id, userId: req.user!.id, companyId: company?.id || 'default', type: 'video_script', title: generated.result.scriptTitle || `Roteiro: ${topic}`, headline: generated.result.scriptTitle || '', body: generated.result.caption || '', videoScript: JSON.stringify(generated.result.scenes || []), cta: generated.result.callToAction || '', hashtags: generated.result.hashtags || [], keywords: [], creditsUsed: generated.creditsUsed, status: 'saved', targetPlatform: 'Reels / TikTok / Shorts', createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ videoScript: generated.result, script: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));

router.post('/ai/generate-image-prompt', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const theme = safeString(req.body?.theme, 5000);
  if (!theme) return res.status(400).json({ error: 'A ideia ou tema da imagem é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generateImagePrompt({ userId: req.user!.id, company, theme, style: safeString(req.body?.style, 2000) });
  res.json({ imagePrompt: generated.result, creditsUsed: generated.creditsUsed });
}));

router.post('/ai/generate-image', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const theme = safeString(req.body?.theme, 5000);
  if (!theme) return res.status(400).json({ error: 'A ideia ou tema da imagem é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const resolution = ['1K', '2K', '4K'].includes(req.body?.resolution) ? req.body.resolution : '1K';
  const generated = await generateMarketingImage({
    userId: req.user!.id,
    company,
    theme,
    style: safeString(req.body?.style, 3000),
    aspectRatio: safeString(req.body?.aspectRatio, 20),
    resolution
  });
  const id = newId('content');
  const item = {
    id, userId: req.user!.id, companyId: company?.id || 'default', type: 'image',
    title: safeString(req.body?.title, 300) || `Imagem IA (${resolution}) - ${theme.slice(0, 80)}`,
    body: theme, hashtags: [], keywords: [], imageUrl: generated.imageUrl,
    visualPrompt: safeString(req.body?.style, 3000), creditsUsed: generated.creditsUsed,
    status: 'saved', createdAt: nowIso(), updatedAt: nowIso(),
    metadata: { storagePath: generated.storagePath, mimeType: generated.mimeType, modelUsed: generated.modelUsed, resolution }
  };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(cleanObject(item));
  res.json({ image: generated, imageUrl: generated.imageUrl, contentItem: item, creditsUsed: generated.creditsUsed });
}));

router.post('/ai/generate-video-direction', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const prompt = safeString(req.body?.prompt || req.body?.topic, 5000);
  if (!prompt) return res.status(400).json({ error: 'O briefing ou descrição do vídeo é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  
  const direction = await generateVideoDirection({
    userId: req.user!.id,
    company,
    prompt,
    aspectRatio: req.body?.aspectRatio === '16:9' ? '16:9' : '9:16',
    mood: safeString(req.body?.mood, 200),
    cameraMotion: safeString(req.body?.cameraMotion, 200),
    lighting: safeString(req.body?.lighting, 200)
  });

  res.json({ direction });
}));

router.post('/ai/generate-video', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const prompt = safeString(req.body?.prompt || req.body?.topic, 5000);
  if (!prompt) return res.status(400).json({ error: 'O briefing ou descrição do vídeo é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  
  const preset = ['demo_720p', 'pro_1080p', 'cinema_4k'].includes(req.body?.preset) ? req.body.preset : 'demo_720p';
  const aspectRatio = req.body?.aspectRatio === '16:9' ? '16:9' : '9:16';
  
  const job = await startVideoGenerationJob({
    userId: req.user!.id,
    company,
    prompt,
    title: safeString(req.body?.title, 300),
    preset,
    aspectRatio,
    initialImageBase64: typeof req.body?.initialImage === 'string' && req.body.initialImage.length > 50 ? req.body.initialImage : undefined,
    cameraMotion: safeString(req.body?.cameraMotion, 200),
    lighting: safeString(req.body?.lighting, 200),
    mood: safeString(req.body?.mood, 200)
  });

  res.status(202).json({
    message: 'Geração de vídeo com Veo 3.1 iniciada em segundo plano.',
    job,
    jobId: job.id,
    status: job.status,
    creditsReserved: job.creditsReserved
  });
}));

router.get('/ai/video-jobs', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
  const jobs = await listUserVideoJobs(req.user!.id, companyId);
  res.json({ jobs });
}));

router.get('/ai/video-jobs/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const job = await checkAndCompleteVideoJob(req.user!.id, req.params.id);
  res.json({ job });
}));

router.post('/ai/video-jobs/:id/check', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const job = await checkAndCompleteVideoJob(req.user!.id, req.params.id);
  res.json({ job });
}));

router.post('/ai/generate-article', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const topic = safeString(req.body?.topic, 5000);
  if (!topic) return res.status(400).json({ error: 'O tema do artigo é obrigatório.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  const generated = await generateArticle({ userId: req.user!.id, company, topic, primaryKeyword: safeString(req.body?.primaryKeyword, 500), targetAudience: safeString(req.body?.targetAudience, 1000), tone: safeString(req.body?.tone, 500) });
  const id = newId('content');
  const item = { id, userId: req.user!.id, companyId: company?.id || 'default', type: 'article', title: generated.result.title || topic, headline: generated.result.title || topic, body: contentBodyFromArticle(generated.result), cta: generated.result.callToAction || '', hashtags: [], keywords: [safeString(req.body?.primaryKeyword, 500) || topic], creditsUsed: generated.creditsUsed, status: 'saved', createdAt: nowIso(), updatedAt: nowIso(), metadata: { metaDescription: generated.result.metaDescription, suggestedSlug: generated.result.suggestedSlug } };
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.json({ article: generated.result, contentItem: item, creditsUsed: generated.creditsUsed });
}));

// SEO
router.post('/seo/analyze', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const url = safeString(req.body?.url, 2000);
  if (!url) return res.status(400).json({ error: 'Informe a URL.' });
  const company = await ownedCompany(req.user!.id, safeString(req.body?.companyId, 200));
  res.json({ report: await analyzeSeo({ userId: req.user!.id, rawUrl: url, company }) });
}));

// Content library + calendar
router.get('/content', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  let query: any = firestore().collection(COLLECTIONS.contentItems).where('userId', '==', req.user!.id);
  if (req.query.companyId) query = query.where('companyId', '==', String(req.query.companyId));
  const items = queryData<any>(await query.get()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ contents: items, items });
}));

router.post('/content', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const title = safeString(req.body?.title, 500);
  const body = safeString(req.body?.body, 100_000);
  if (!title || !body) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
  const companyId = safeString(req.body?.companyId, 200) || 'default';
  if (companyId !== 'default') await requireOwnedCompany(req.user!.id, companyId);
  const id = newId('content');
  const item = cleanObject({ id, userId: req.user!.id, companyId, type: safeString(req.body?.type, 50) || 'post', title, headline: safeString(req.body?.headline, 1000), body, cta: safeString(req.body?.cta, 2000), hashtags: stringArray(req.body?.hashtags), keywords: stringArray(req.body?.keywords), targetPlatform: safeString(req.body?.targetPlatform, 100), visualPrompt: safeString(req.body?.visualPrompt, 5000), imageUrl: safeString(req.body?.imageUrl, 1500), creditsUsed: 0, status: 'saved', createdAt: nowIso(), updatedAt: nowIso() });
  await firestore().collection(COLLECTIONS.contentItems).doc(id).set(item);
  res.status(201).json({ item, contentItem: item });
}));

router.post('/content/schedule', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const contentItemId = safeString(req.body?.contentItemId, 200);
  const scheduledFor = safeString(req.body?.scheduledFor, 100);
  const companyId = safeString(req.body?.companyId, 200);
  const isPlanning = Boolean(req.body?.isPlanning || req.body?.mode === 'planning');
  if (!contentItemId || !scheduledFor || !companyId) return res.status(400).json({ error: 'Projeto, conteúdo e data são obrigatórios.' });

  // 1. Ownership da empresa
  await requireOwnedCompany(req.user!.id, companyId);

  // 2. Validação do conteúdo
  const itemSnap = await firestore().collection(COLLECTIONS.contentItems).doc(contentItemId).get();
  if (!itemSnap.exists || itemSnap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Conteúdo não encontrado.' });
  const itemData = itemSnap.data() as any;
  if (itemData.companyId !== companyId) {
    if (isPlanning && itemData.companyId === 'default') {
      // Aceita default apenas para planejamento editorial
    } else if (!isPlanning && itemData.companyId === 'default') {
      return res.status(400).json({ error: 'Associe este conteúdo a uma projeto antes de ativar a auto-publicação.' });
    } else {
      return res.status(400).json({ error: 'O conteúdo selecionado pertence a outro projeto.' });
    }
  }

  const contentText = [itemData.headline, itemData.body, itemData.cta].filter(Boolean).join(' ').trim();
  if (!contentText) {
    return res.status(400).json({ error: 'O conteúdo selecionado não possui texto para publicação.' });
  }

  // 3. Validação da data
  if (Number.isNaN(new Date(scheduledFor).getTime())) return res.status(400).json({ error: 'Data de agendamento inválida.' });

  // 4. Validação das plataformas
  const rawPlatforms = stringArray(req.body?.platforms, 10);
  if (!rawPlatforms.length) return res.status(400).json({ error: 'Selecione ao menos uma rede social para o agendamento.' });

  // 5. Diferenciação: Planejamento Editorial (Calendário) vs Auto-Publicação
  if (isPlanning) {
    const id = newId('sched');
    const scheduled = {
      id,
      userId: req.user!.id,
      companyId,
      contentItemId,
      platforms: rawPlatforms,
      scheduledFor: new Date(scheduledFor).toISOString(),
      status: 'planned',
      isPlanning: true,
      autopilotGenerated: false,
      createdAt: nowIso()
    };
    await firestore().collection(COLLECTIONS.scheduledPosts).doc(id).set(scheduled);
    return res.status(201).json({ message: 'Planejamento editorial salvo no calendário com sucesso.', scheduled });
  }


  // Validação estrita de suporte dos providers para texto direto
  for (const plat of rawPlatforms) {
    const provider = normalizeProvider(plat);
    if (!provider) return res.status(400).json({ error: `Rede social "${plat}" não reconhecida.` });

    if (!isTextAutoPublishSupported(provider)) {
      const reason = getProviderAutoPublishReason(provider) || `A rede "${plat}" não suporta publicação automática puramente textual.`;
      return res.status(400).json({ error: reason });
    }

    const connSnap = await firestore().collection(COLLECTIONS.socialConnections)
      .where('userId', '==', req.user!.id)
      .where('companyId', '==', companyId)
      .where('provider', '==', provider)
      .limit(1)
      .get();

    if (connSnap.empty) {
      return res.status(400).json({ error: `A conta de ${plat} não está conectada para este projeto. Conecte-a em Redes Sociais antes de agendar.` });
    }

    try {
      await ensureValidSocialAccessToken(connSnap.docs[0].id);
    } catch {
      return res.status(400).json({ error: `A autenticação com ${plat} expirou e não pôde ser renovada automaticamente. Reconecte a conta em Redes Sociais antes de agendar.` });
    }
  }

  const id = newId('sched');
  const scheduled = {
    id,
    userId: req.user!.id,
    companyId,
    contentItemId,
    platforms: rawPlatforms,
    scheduledFor: new Date(scheduledFor).toISOString(),
    status: 'scheduled',
    isPlanning: false,
    autopilotGenerated: Boolean(req.body?.autopilotGenerated),
    createdAt: nowIso()
  };
  await firestore().collection(COLLECTIONS.scheduledPosts).doc(id).set(scheduled);
  await itemSnap.ref.set({ status: 'scheduled', updatedAt: nowIso() }, { merge: true });
  res.status(201).json({ message: 'Publicação agendada com sucesso.', scheduled });
}));

async function scheduledForUser(userId: string, companyId?: string) {
  let query: any = firestore().collection(COLLECTIONS.scheduledPosts).where('userId', '==', userId);
  if (companyId) query = query.where('companyId', '==', companyId);
  return queryData<any>(await query.get()).sort((a, b) => String(a.scheduledFor).localeCompare(String(b.scheduledFor)));
}

router.get('/content/scheduled', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const scheduledPosts = await scheduledForUser(req.user!.id, req.query.companyId ? String(req.query.companyId) : undefined);
  res.json({ scheduledPosts, scheduled: scheduledPosts });
}));

router.get('/content/calendar', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
  const scheduled = await scheduledForUser(req.user!.id, companyId);
  let query: any = firestore().collection(COLLECTIONS.contentItems).where('userId', '==', req.user!.id);
  if (companyId) query = query.where('companyId', '==', companyId);
  const items = queryData<any>(await query.get());
  res.json({ scheduled, scheduledPosts: scheduled, items, contents: items });
}));

router.post('/content/scheduled/:id/retry', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.scheduledPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  const current = snap.data() as any;
  const existingResults = Array.isArray(current.publicationResults) ? current.publicationResults : [];

  if (current.status === 'requires_review' || existingResults.some((r: any) => r?.externalState === 'unknown')) {
    return res.status(409).json({
      error: 'Publicações em estado de verificação manual não podem ser reagendadas automaticamente devido ao risco de duplicação externa.'
    });
  }

  if (current.status !== 'failed') {
    return res.status(409).json({ error: 'Somente publicações com falha comprovada podem ser reenviadas.' });
  }

  const failedResults = existingResults.filter((r: any) => !r?.success);
  if (failedResults.length > 0 && failedResults.every((r: any) => r?.retrySafe === false)) {
    return res.status(409).json({
      error: 'Falha definitiva de autenticação ou parâmetro. Reconecte a conta ou edite o conteúdo antes de tentar novamente.'
    });
  }

  const successfulResults = existingResults.filter((r: any) => r?.success && r?.externalId);
  const requestedPlatforms = Array.isArray(current.platforms) ? current.platforms : [];

  // Se todas as plataformas solicitadas já possuem confirmação externa de sucesso, rejeita retry
  const allAlreadySucceeded = requestedPlatforms.length > 0 && requestedPlatforms.every((plat: string) =>
    successfulResults.some((s: any) => s.platform === plat || normalizeProvider(s.platform) === normalizeProvider(plat))
  );
  if (allAlreadySucceeded) {
    return res.status(409).json({ error: 'Todas as redes sociais deste agendamento já foram publicadas com sucesso.' });
  }

  const when = req.body?.scheduledFor ? new Date(String(req.body.scheduledFor)) : new Date(Date.now() + 60_000);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'Data de reenvio inválida.' });

  // Preserva estritamente resultados bem-sucedidos anteriores com seus externalIds e falhas sem retrySafe
  const preservedResults = existingResults.filter((r: any) => (r?.success && r?.externalId) || r?.retrySafe === false);

  await ref.set({
    status: 'scheduled',
    scheduledFor: when.toISOString(),
    errorMessage: null,
    publicationResults: preservedResults,
    retryCount: Number(current.retryCount || 0) + 1,
    updatedAt: nowIso()
  }, { merge: true });

  res.json({
    message: 'Publicação reagendada para nova tentativa segura.',
    successfulPreserved: successfulResults.length
  });
}));

router.post('/content/scheduled/:id/cancel', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.scheduledPosts).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  const current = snap.data() as any;

  if (current.status === 'requires_review') {
    return res.status(409).json({
      error: 'Agendamentos com verificação manual pendente não podem ser cancelados para reuso ou republicação automática.'
    });
  }

  if (!['scheduled', 'failed', 'planned'].includes(String(current.status))) {
    return res.status(409).json({ error: 'Este agendamento não pode mais ser cancelado.' });
  }

  await ref.set({ status: 'cancelled', cancelledAt: nowIso(), updatedAt: nowIso() }, { merge: true });
  res.json({ message: 'Agendamento cancelado com sucesso.' });
}));

router.delete('/content/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.contentItems).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Conteúdo não encontrado.' });
  const item = snap.data() as any;
  if (item?.metadata?.storagePath) await getAdminStorage().bucket().file(String(item.metadata.storagePath)).delete({ ignoreNotFound: true }).catch(() => undefined);
  await ref.delete();
  res.json({ message: 'Conteúdo removido.' });
}));

// Campaigns
router.get('/campaigns', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  let query: any = firestore().collection(COLLECTIONS.campaigns).where('userId', '==', req.user!.id);
  if (req.query.companyId) query = query.where('companyId', '==', String(req.query.companyId));
  const campaigns = queryData<any>(await query.get()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ campaigns });
}));

router.post('/campaigns', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const name = safeString(req.body?.name, 300);
  const companyId = safeString(req.body?.companyId, 200);
  if (!name || !companyId) return res.status(400).json({ error: 'Nome e projeto são obrigatórios.' });
  await requireOwnedCompany(req.user!.id, companyId);
  const id = newId('campaign');
  const campaign = { id, userId: req.user!.id, companyId, name, objective: safeString(req.body?.objective, 3000) || 'Reconhecimento e Conversão', targetPlatforms: stringArray(req.body?.targetPlatforms, 10), targetAudience: safeString(req.body?.targetAudience, 3000), startDate: req.body?.startDate ? new Date(req.body.startDate).toISOString() : nowIso(), endDate: req.body?.endDate ? new Date(req.body.endDate).toISOString() : undefined, status: ['draft','pending','scheduled','active','paused','completed','failed'].includes(req.body?.status) ? req.body.status : 'draft', contentItemIds: stringArray(req.body?.contentItemIds, 200), metrics: { reach: 0, clicks: 0, leads: 0, conversions: 0, shares: 0, comments: 0 }, createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.campaigns).doc(id).set(cleanObject(campaign));
  res.status(201).json({ message: 'Campanha criada.', campaign });
}));

router.patch('/campaigns/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.campaigns).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Campanha não encontrada.' });
  const patch: Record<string, any> = {};
  if (req.body?.name !== undefined) patch.name = safeString(req.body.name, 300);
  if (req.body?.objective !== undefined) patch.objective = safeString(req.body.objective, 3000);
  if (req.body?.targetPlatforms !== undefined) patch.targetPlatforms = stringArray(req.body.targetPlatforms, 10);
  if (req.body?.targetAudience !== undefined) patch.targetAudience = safeString(req.body.targetAudience, 3000);
  if (req.body?.startDate !== undefined) patch.startDate = new Date(req.body.startDate).toISOString();
  if (req.body?.endDate !== undefined) patch.endDate = req.body.endDate ? new Date(req.body.endDate).toISOString() : null;
  if (req.body?.status !== undefined) {
    if (!['draft','pending','scheduled','active','paused','completed','failed'].includes(req.body.status)) return res.status(400).json({ error: 'Status de campanha inválido.' });
    patch.status = req.body.status;
  }
  if (req.body?.contentItemIds !== undefined) patch.contentItemIds = stringArray(req.body.contentItemIds, 200);
  patch.updatedAt = nowIso();
  await ref.set(cleanObject(patch), { merge: true });
  const fresh = await ref.get();
  res.json({ message: 'Campanha atualizada.', campaign: { id: fresh.id, ...fresh.data() } });
}));

router.delete('/campaigns/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.campaigns).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== req.user!.id) return res.status(404).json({ error: 'Campanha não encontrada.' });
  await ref.delete();
  res.json({ message: 'Campanha removida.' });
}));

// Autopilot
router.get('/autopilot/config', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  const id = `${req.user!.id}_${companyId}`;
  const ref = firestore().collection(COLLECTIONS.autopilotConfigs).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return res.json({
      config: {
        id,
        userId: req.user!.id,
        companyId,
        enabled: false,
        mode: 'manual_approval',
        frequency: 'daily',
        timezone: 'America/Sao_Paulo',
        preferredDays: [1, 2, 3, 4, 5],
        preferredHours: [10, 15, 19],
        targetPlatforms: ['Instagram', 'Facebook'],
        primaryGoal: 'Atrair clientes e gerar autoridade',
      },
      persisted: false
    });
  }
  res.json({ config: { id: snap.id, ...snap.data() }, persisted: true });
}));

router.post('/autopilot/config', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);

  const requestedEnabled = Boolean(req.body?.enabled);
  const requestedMode = req.body?.mode === 'automatic' ? 'automatic' : 'manual_approval';

  const id = `${req.user!.id}_${companyId}`;
  const ref = firestore().collection(COLLECTIONS.autopilotConfigs).doc(id);
  const current = await ref.get();

  const rawDays = Array.isArray(req.body?.preferredDays) ? req.body.preferredDays : undefined;
  const preferredDays = rawDays ? rawDays.filter((d: any) => typeof d === 'number' && d >= 0 && d <= 6) : undefined;
  const rawHours = Array.isArray(req.body?.preferredHours) ? req.body.preferredHours : undefined;
  const preferredHours = rawHours ? rawHours.filter((h: any) => typeof h === 'number' && h >= 0 && h <= 23) : undefined;
  const timezone = safeString(req.body?.timezone, 80) || 'America/Sao_Paulo';
  const targetPlatforms = stringArray(req.body?.targetPlatforms, 10);

  if (requestedEnabled && requestedMode === 'automatic') {
    const targets = targetPlatforms.length > 0 ? targetPlatforms : ['facebook'];
    for (const plat of targets) {
      const provider = normalizeProvider(plat);
      if (!provider || !isTextAutoPublishSupported(provider)) {
        return res.status(400).json({
          error: `O canal "${plat}" não suporta publicação automática direta no modo automático (suportados apenas Facebook, LinkedIn e X).`
        });
      }
      const connSnap = await firestore().collection(COLLECTIONS.socialConnections)
        .where('userId', '==', req.user!.id)
        .where('companyId', '==', companyId)
        .where('provider', '==', provider)
        .limit(1)
        .get();

      if (connSnap.empty) {
        return res.status(400).json({
          error: `O canal "${plat}" não está conectado para este projeto. Conecte-o em Redes Sociais antes de ativar o modo automático.`
        });
      }
      try {
        await ensureValidSocialAccessToken(connSnap.docs[0].id);
      } catch {
        return res.status(400).json({
          error: `A conexão do canal "${plat}" expirou e não pôde ser renovada automaticamente. Reconecte-a em Redes Sociais antes de ativar o modo automático.`
        });
      }
    }
  }

  const update = cleanObject({
    id,
    userId: req.user!.id,
    companyId,
    enabled: requestedEnabled,
    mode: requestedMode,
    frequency: ['daily', '3_times_week', 'weekly'].includes(req.body?.frequency) ? req.body.frequency : 'daily',
    timezone,
    preferredDays,
    preferredHours,
    targetPlatforms,
    primaryGoal: safeString(req.body?.primaryGoal, 2000) || 'Engajamento e Vendas',
    updatedAt: nowIso(),
    createdAt: current.exists ? undefined : nowIso()
  });
  await ref.set(update, { merge: true });
  const fresh = await ref.get();
  res.json({ message: 'Configuração do Autopilot salva.', config: { id: fresh.id, ...fresh.data() } });
}));
router.post('/autopilot/trigger-now', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório para acionar o Autopilot.' });
  await requireOwnedCompany(req.user!.id, companyId);
  const result = await triggerUserAutopilot(req.user!.id, companyId);
  res.json({ message: 'Autopilot executado para seu projeto.', result });
}));

// Social OAuth
router.get('/social/connections', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  res.json({ connections: await listConnections(req.user!.id, companyId) });
}));
router.get('/social/:provider/connect', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const provider = req.params.provider as SocialProvider;
  if (!['instagram','facebook','tiktok','youtube','linkedin','pinterest','x'].includes(provider)) return res.status(400).json({ error: 'Provedor social inválido.' });
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireSocialCompany(req.user!.id, companyId);
  res.json(await createOAuthUrl({ provider, userId: req.user!.id, companyId }));
}));
router.get('/social/:provider/callback', asyncRoute(async (req, res) => {
  const provider = req.params.provider as SocialProvider;
  const errorParam = safeString(req.query.error, 500) || safeString(req.query.error_description, 500);
  if (errorParam) {
    const safeError = errorParam.includes('access_denied')
      ? 'Autorização cancelada pelo usuário.'
      : sanitizeOAuthPublicError(errorParam, provider);
    return res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent(safeError)}`);
  }
  const code = safeString(req.query.code, 3000);
  const state = safeString(req.query.state, 3000);
  if (!code || !state) return res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent('Autorização OAuth incompleta')}`);
  try {
    const result = await handleOAuthCallback({ provider, code, state });
    if (result.selectionRequired && result.pageSelectToken) {
      return res.redirect(`${config.appUrl}/redes-sociais?pageSelection=${encodeURIComponent(result.pageSelectToken)}&companyId=${encodeURIComponent(result.companyId)}`);
    }
    res.redirect(`${config.appUrl}/redes-sociais?connected=${encodeURIComponent(provider)}&companyId=${encodeURIComponent(result.companyId)}`);
  } catch (err: any) {
    const publicError = sanitizeOAuthPublicError(err, provider);
    const rawMsg = String(err?.message || err || 'Falha ao processar autorização social.');
    // Sanitização de logs: mascarar tokens, códigos e secrets
    const sanitizedLog = rawMsg
      .replace(/EAAB\w+/g, '[REDACTED_PAGE_TOKEN]')
      .replace(/EAA\w+/g, '[REDACTED_USER_TOKEN]')
      .replace(/access_token=[^&\s]+/g, 'access_token=[REDACTED]')
      .replace(/code=[^&\s]+/g, 'code=[REDACTED]')
      .replace(/client_secret=[^&\s]+/g, 'client_secret=[REDACTED]');
    console.error(`[Social OAuth Callback Error] [${provider}]:`, sanitizedLog);
    res.redirect(`${config.appUrl}/redes-sociais?error=${encodeURIComponent(publicError)}`);
  }
}));
router.delete('/social/:provider/disconnect', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  const success = await disconnectSocial(req.user!.id, companyId, req.params.provider);
  res.json({ success, message: success ? 'Conta desconectada.' : 'Conexão não encontrada.' });
}));

router.get('/social/facebook/selection-candidates', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const selectionToken = safeString(req.query.selectionToken || req.query.pageSelectToken || req.headers['x-selection-token'], 1000);
  const companyId = safeString(req.query.companyId, 200) || undefined;
  if (!selectionToken) {
    return res.status(400).json({ error: 'selectionToken é obrigatório.' });
  }
  const pages = await getFacebookPageSelectionCandidates({
    userId: req.user!.id,
    selectionToken,
    companyId
  });
  res.json({ pages });
}));

router.post('/social/facebook/select-page', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const selectionToken = safeString(req.body?.selectionToken || req.body?.pageSelectToken, 1000);
  const pageId = safeString(req.body?.pageId || req.body?.selectedPageId, 200);
  const companyId = safeString(req.body?.companyId, 200) || undefined;
  if (!selectionToken || !pageId) {
    return res.status(400).json({ error: 'selectionToken e pageId são obrigatórios.' });
  }
  const result = await selectFacebookPage({
    userId: req.user!.id,
    companyId,
    selectionToken,
    pageId
  });
  res.json({
    success: true,
    message: `Página "${result.pageName}" selecionada e conectada com sucesso.`,
    connection: result
  });
}));

router.get('/social/connections/:companyId', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  await requireSocialCompany(req.user!.id, req.params.companyId);
  res.json({ connections: await listConnections(req.user!.id, req.params.companyId) });
}));
router.get('/social/oauth/:provider/start', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const provider = req.params.provider as SocialProvider;
  const companyId = safeString(req.query.companyId, 200);
  if (!['instagram','facebook','tiktok','youtube','linkedin','pinterest','x'].includes(provider)) return res.status(400).json({ error: 'Provedor social inválido.' });
  await requireSocialCompany(req.user!.id, companyId);
  const oauth = await createOAuthUrl({ provider, userId: req.user!.id, companyId });
  res.json({ ...oauth, authUrl: oauth.url });
}));
router.delete('/social/connections/:connectionId', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId || req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  const ref = firestore().collection(COLLECTIONS.socialConnections).doc(req.params.connectionId);
  const snap = await ref.get();
  const connection = snap.data() as any;
  if (!snap.exists || connection?.userId !== req.user!.id || connection?.companyId !== companyId) {
    return res.status(404).json({ error: 'Conexão não encontrada para este projeto.' });
  }
  await ref.delete();
  res.json({ success: true, message: 'Conta desconectada deste projeto.' });
}));

// TikTok Content Posting API (Draft Video / Inbox Upload)
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_TIKTOK_SANDBOX_VIDEO_SIZE // 4 MiB
  },
  fileFilter: (_req, file, cb) => {
    const originalName = (file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const isMp4Ext = originalName.endsWith('.mp4');
    const isMp4Mime = !mime || mime === 'video/mp4' || mime === 'application/mp4' || mime === 'application/octet-stream';
    if (isMp4Ext && isMp4Mime) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo MP4 (.mp4) são aceitos para envio de rascunho ao TikTok.'));
    }
  }
});

router.post('/social/tiktok/upload-draft', requireAuth, (req, res, next) => {
  uploadVideo.single('video')(req as any, res as any, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'O vídeo excede o limite de 4 MB desta fase de verificação do TikTok.' });
      }
      return res.status(400).json({ error: err.message || 'Erro no envio do arquivo de vídeo.' });
    }
    next();
  });
}, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  await requireSocialPublishingAccess(req.user!.id, req.user?.role);

  if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({ error: 'Arquivo de vídeo MP4 é obrigatório.' });
  }

  const result = await uploadTikTokDraftVideo({
    userId: req.user!.id,
    companyId,
    videoBuffer: req.file.buffer,
    videoSize: req.file.size,
    mimeType: req.file.mimetype,
    title: safeString(req.body?.title, 300)
  });

  res.status(200).json(result);
}));

router.post('/social/tiktok/upload-status', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200) || safeString(req.query?.companyId, 200);
  const publishId = safeString(req.body?.publishId, 200);
  if (!companyId || !publishId) {
    return res.status(400).json({ error: 'companyId e publishId são obrigatórios.' });
  }
  await requireOwnedCompany(req.user!.id, companyId);

  const result = await getTikTokUploadStatus({
    userId: req.user!.id,
    companyId,
    publishId
  });

  res.status(200).json(result);
}));

router.get('/social/readiness', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireSocialCompany(req.user!.id, companyId);
  const readiness = await getSocialReadiness(companyId, req.user!.id);
  res.json(readiness);
}));

router.post('/social/instagram/publish-media', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);
  await requireSocialPublishingAccess(req.user!.id, req.user?.role);

  const imageUrl = safeHttpUrl(req.body?.imageUrl, 2000) || undefined;
  const videoUrl = safeHttpUrl(req.body?.videoUrl, 2000) || undefined;
  const caption = safeString(req.body?.caption, 2200);
  const contentItemId = safeString(req.body?.contentItemId, 200) || undefined;

  if (!imageUrl && !videoUrl) {
    return res.status(400).json({ error: 'Forneça uma URL válida de imagem ou vídeo (Reels).' });
  }

  const result = await publishInstagramMedia({
    userId: req.user!.id,
    companyId,
    imageUrl,
    videoUrl,
    caption,
    contentItemId
  });

  res.json(result);
}));

router.post('/social/tiktok/init-upload', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const videoSize = Number(req.body?.videoSize || 0);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  if (videoSize <= 0) return res.status(400).json({ error: 'videoSize deve ser maior que 0.' });
  await requireOwnedCompany(req.user!.id, companyId);
  await requireSocialPublishingAccess(req.user!.id, req.user?.role);

  const result = await initTikTokDraftUpload({
    userId: req.user!.id,
    companyId,
    videoSize,
    title: safeString(req.body?.title, 300)
  });

  res.json(result);
}));

router.post('/social/youtube/init-upload', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const title = safeString(req.body?.title, 100);
  if (!companyId || !title) return res.status(400).json({ error: 'companyId e title são obrigatórios.' });
  await requireOwnedCompany(req.user!.id, companyId);
  await requireSocialPublishingAccess(req.user!.id, req.user?.role);

  const result = await initYouTubeResumableUpload({
    userId: req.user!.id,
    companyId,
    title,
    description: safeString(req.body?.description, 5000),
    privacyStatus: ['private', 'unlisted', 'public'].includes(req.body?.privacyStatus) ? req.body.privacyStatus : 'unlisted',
    videoSize: req.body?.videoSize ? Number(req.body.videoSize) : undefined,
    mimeType: safeString(req.body?.mimeType, 100) || 'video/mp4'
  });

  res.json(result);
}));

router.get('/social/pinterest/boards', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.query.companyId, 200);
  if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório.' });
  await requireOwnedCompany(req.user!.id, companyId);

  const boards = await getPinterestBoards({
    userId: req.user!.id,
    companyId
  });

  res.json({ boards });
}));

router.post('/social/pinterest/create-pin', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const companyId = safeString(req.body?.companyId, 200);
  const boardId = safeString(req.body?.boardId, 200);
  const title = safeString(req.body?.title, 100);
  const imageUrl = safeHttpUrl(req.body?.imageUrl, 2000);

  if (!companyId || !boardId || !title || !imageUrl) {
    return res.status(400).json({ error: 'companyId, boardId, title e imageUrl válida são obrigatórios.' });
  }
  await requireOwnedCompany(req.user!.id, companyId);
  await requireSocialPublishingAccess(req.user!.id, req.user?.role);

  const result = await createPinterestPin({
    userId: req.user!.id,
    companyId,
    boardId,
    title,
    description: safeString(req.body?.description, 800),
    link: safeHttpUrl(req.body?.link, 1000) || undefined,
    imageUrl
  });

  res.json(result);
}));

// Support
router.post('/support/tickets', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const subject = safeString(req.body?.subject, 300);
  const message = safeString(req.body?.message, 10_000);
  if (!subject || !message) return res.status(400).json({ error: 'Assunto e descrição são obrigatórios.' });
  const id = newId('ticket');
  const ticket = { id, userId: req.user!.id, userEmail: req.user!.email, subject, message, status: 'open', priority: 'normal', createdAt: nowIso(), updatedAt: nowIso() };
  await firestore().collection(COLLECTIONS.supportTickets).doc(id).set(ticket);
  res.status(201).json({ message: 'Chamado aberto com sucesso.', ticket: { ...ticket, message: undefined } });
}));
router.get('/support/contact', (_req, res) => res.json({ email: config.support.email, whatsapp: config.support.whatsapp || null }));

// Blog + showcase public
router.get('/blog', asyncRoute(async (_req, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).where('status', '==', 'published').get();
  res.json({ posts: queryData<any>(snap).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))) });
}));
router.get('/blog/:slug', asyncRoute(async (req, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).where('slug', '==', req.params.slug).where('status', '==', 'published').limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'Artigo não encontrado.' });
  res.json({ post: { id: snap.docs[0].id, ...snap.docs[0].data() } });
}));
function sanitizePublicVitrineProject(project: any) {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    segment: project.segment || '',
    niche: project.category || '',
    category: project.category || '',
    description: project.description || '',
    logoUrl: project.logoUrl || null,
    coverUrl: project.bannerUrl || null,
    website: project.websiteUrl || null,
    playStoreUrl: project.playStoreUrl || null,
    tagline: project.tagline || '',
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    keywords: Array.isArray(project.keywords) ? project.keywords : [],
    targetAudience: project.targetAudience || '',
    country: 'BR',
    businessType: 'digital',
    isPublicInVitrine: true
  };
}

router.get('/vitrine', asyncRoute(async (_req, res) => {
  const projects = (await listAllPortalProjectsFromDb())
    .filter((project) => project.active !== false)
    .map((project) => sanitizePublicVitrineProject(project))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  res.json({ projects, companies: projects });
}));

router.get('/vitrine/:slug', asyncRoute(async (req, res) => {
  const project = await getPortalProjectFromDb(safeString(req.params.slug, 200));
  if (!project || project.active === false) return res.status(404).json({ error: 'Projeto não encontrado na Vitrine Pública.' });
  const publicProject = sanitizePublicVitrineProject(project);
  res.json({ project: publicProject, company: publicProject });
}));

// Admin
router.get('/admin/overview', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const db = firestore();
  const projects = await listAllPortalProjectsFromDb();
  const projectIds = new Set(projects.map((project) => project.id));
  const [contentsSnap, connections, blogSnap, blogArticlesSnap, scheduledSnap, autopilotSnap] = await Promise.all([
    db.collection(COLLECTIONS.contentItems).where('userId', '==', req.user!.id).get(),
    listConnections(req.user!.id, 'all').catch(() => []),
    db.collection(COLLECTIONS.blogPosts).get(),
    db.collection(COLLECTIONS.blogArticles).get().catch(() => ({ docs: [] } as any)),
    db.collection(COLLECTIONS.scheduledPosts).where('userId', '==', req.user!.id).get(),
    db.collection(COLLECTIONS.autopilotConfigs).where('userId', '==', req.user!.id).get().catch(() => ({ docs: [] } as any))
  ]);

  const projectContents = contentsSnap.docs.filter((doc) => projectIds.has(String((doc.data() as any).companyId || '')));
  const validConnections = (connections as any[]).filter((item) => projectIds.has(String(item.companyId || '')) && item.status === 'connected');
  const projectScheduled = scheduledSnap.docs.filter((doc) => projectIds.has(String((doc.data() as any).companyId || '')));
  const pendingOrFailed = projectScheduled.filter((doc) => ['scheduled', 'publishing', 'failed', 'requires_review'].includes(String((doc.data() as any).status || ''))).length;
  const publishedLegacy = blogSnap.docs.filter((doc) => (doc.data() as any).status === 'published').length;
  const publishedDynamic = (blogArticlesSnap as any).docs.filter((doc: any) => (doc.data() as any).status === 'published').length;
  const enabledAutopilot = (autopilotSnap as any).docs.filter((doc: any) => {
    const item = doc.data() as any;
    return item.enabled === true && projectIds.has(String(item.companyId || ''));
  }).length;

  res.json({
    stats: {
      totalProjects: projects.filter((project) => project.active !== false).length,
      totalContentsGenerated: projectContents.length,
      totalSocialConnections: validConnections.length,
      totalPublishedArticles: publishedLegacy + publishedDynamic,
      pendingOrFailed,
      enabledAutopilot
    },
    users: []
  });
}));

router.get('/admin/projects', requireAdmin, asyncRoute(async (_req: AuthenticatedRequest, res) => {
  const projects = await listAllPortalProjectsFromDb();
  res.json({ projects, total: projects.length });
}));

router.get('/admin/scheduler/diagnostics', requireAdmin, asyncRoute(async (_req: AuthenticatedRequest, res) => {
  res.json({ diagnostics: await getSchedulerDiagnostics() });
}));

router.post('/admin/scheduler/run-now', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const result = await processSchedulerTick({ trigger: 'authorized_api' });
  await writeAdminLog({
    operatorId: req.user!.id,
    operatorEmail: req.user!.email,
    action: 'run_scheduler_now',
    details: { skipped: Boolean((result as any)?.skipped), errors: Object.keys((result as any)?.errors || {}) }
  });
  res.json({ success: Object.keys((result as any)?.errors || {}).length === 0, result });
}));

router.post('/admin/projects', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const project = await createPortalProjectInDb(req.body || {});
  await writeAdminLog({ operatorId:req.user!.id, operatorEmail:req.user!.email, action:'create_project', details:{ projectId:project.id, name:project.name } });
  res.status(201).json({ success:true, project, message:'Projeto cadastrado e incluído automaticamente nos próximos ciclos.' });
}));

router.patch('/admin/projects/:id', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const project = await updatePortalProjectInDb(req.params.id, req.body || {});
  if (!project) return res.status(404).json({ error:'Projeto não encontrado.' });
  await writeAdminLog({ operatorId:req.user!.id, operatorEmail:req.user!.email, action:'update_project', details:{ projectId:project.id } });
  res.json({ success:true, project });
}));

router.delete('/admin/projects/:id', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const projectId = safeString(req.params.id, 200);
  const result = await deletePortalProjectInDb(projectId);
  if (result.protected) return res.status(409).json({ error:'Os 7 projetos iniciais são protegidos. Use Pausar em vez de excluir.' });
  if (!result.deleted) return res.status(404).json({ error:'Projeto não encontrado.' });

  const db = firestore();
  const [connectionsSnap, scheduledSnap] = await Promise.all([
    db.collection(COLLECTIONS.socialConnections).where('userId', '==', req.user!.id).where('companyId', '==', projectId).limit(200).get(),
    db.collection(COLLECTIONS.scheduledPosts).where('userId', '==', req.user!.id).where('companyId', '==', projectId).limit(200).get()
  ]);
  const batch = db.batch();
  for (const doc of connectionsSnap.docs) batch.delete(doc.ref);
  let cancelledSchedules = 0;
  for (const doc of scheduledSnap.docs) {
    const status = String((doc.data() as any)?.status || '');
    if (['scheduled','planned','failed'].includes(status)) {
      batch.set(doc.ref, { status:'cancelled', cancelledAt:nowIso(), updatedAt:nowIso(), cancelReason:'project_deleted' }, { merge:true });
      cancelledSchedules += 1;
    }
  }
  batch.set(db.collection(COLLECTIONS.autopilotConfigs).doc(req.user!.id + '_' + projectId), {
    enabled:false, disabledReason:'project_deleted', updatedAt:nowIso()
  }, { merge:true });
  await batch.commit();

  await writeAdminLog({
    operatorId:req.user!.id,
    operatorEmail:req.user!.email,
    action:'delete_project',
    details:{ projectId, socialConnectionsRemoved:connectionsSnap.size, scheduledPostsCancelled:cancelledSchedules }
  });
  res.json({
    success:true,
    message:'Projeto removido do cadastro. Conteúdos históricos foram preservados; agendamentos futuros foram cancelados e conexões sociais removidas.',
    cleanup:{ socialConnectionsRemoved:connectionsSnap.size, scheduledPostsCancelled:cancelledSchedules }
  });
}));

router.get('/admin/support/tickets', requireAdmin, asyncRoute(async (_req: AuthenticatedRequest, res) => {
  const snap = await firestore().collection(COLLECTIONS.supportTickets).get();
  const tickets = queryData<any>(snap).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,200);
  res.json({ tickets });
}));
router.patch('/admin/support/tickets/:id', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.supportTickets).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Chamado não encontrado.' });
  const status = safeString(req.body?.status, 30);
  if (!['open','in_progress','resolved','closed'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  await ref.set({ status, updatedAt: nowIso(), updatedBy: req.user!.id }, { merge: true });
  await writeAdminLog({ operatorId:req.user!.id, operatorEmail:req.user!.email, action:'support_status', details:{ ticketId:req.params.id, status } });
  res.json({ message: 'Chamado atualizado.' });
}));

router.get('/admin/blog', requireAdmin, asyncRoute(async (_req: AuthenticatedRequest, res) => {
  const snap = await firestore().collection(COLLECTIONS.blogPosts).get();
  res.json({ posts: queryData<any>(snap).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))) });
}));
router.post('/admin/blog/generate-now', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const topic = safeString(req.body?.topic, 1000) || 'como usar inteligência artificial de forma prática e responsável no marketing de pequenas empresas';
  const generated = await generatePlatformArticle(topic);
  const article = generated.article || {};
  const id = newId('blog');
  const slug = `${slugify(article.suggestedSlug || article.title || topic)}-${id.slice(-6)}`;
  const post = { id, title:safeString(article.title,180), slug, summary:safeString(article.summary || article.metaDescription,500), content:safeString(article.content,120000), featuredImageUrl:'', author:config.blog.author, category:safeString(article.category,100)||'Marketing & IA', tags:stringArray(article.tags,12), seoTitle:safeString(article.title,70), seoDescription:safeString(article.metaDescription || article.summary,180), status:'draft', createdAt:nowIso(), updatedAt:nowIso(), generatedBy:'admin_ai', modelUsed:generated.modelUsed };
  if (!post.title || !post.content) throw new Error('A IA não retornou artigo completo.');
  await firestore().collection(COLLECTIONS.blogPosts).doc(id).set(post);
  await writeAdminLog({ operatorId:req.user!.id, operatorEmail:req.user!.email, action:'generate_blog', details:{ postId:id, topic } });
  res.status(201).json({ message:'Rascunho gerado. Revise antes de publicar.', post });
}));
router.post('/admin/blog', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const id = newId('blog');
  const title = safeString(req.body?.title,180); const content = safeString(req.body?.content,120000);
  if (!title || !content) return res.status(400).json({ error:'Título e conteúdo são obrigatórios.' });
  const status = req.body?.status === 'published' ? 'published' : 'draft';
  const post = { id, title, slug:`${slugify(req.body?.slug || title)}-${id.slice(-6)}`, summary:safeString(req.body?.summary,500), content, featuredImageUrl:safeHttpUrl(req.body?.featuredImageUrl), author:safeString(req.body?.author,120)||config.blog.author, category:safeString(req.body?.category,100)||'Marketing & IA', tags:stringArray(req.body?.tags,12), seoTitle:safeString(req.body?.seoTitle || title,70), seoDescription:safeString(req.body?.seoDescription || req.body?.summary,180), status, publishedAt:status==='published'?nowIso():undefined, createdAt:nowIso(), updatedAt:nowIso() };
  await firestore().collection(COLLECTIONS.blogPosts).doc(id).set(cleanObject(post));
  res.status(201).json({ post });
}));
router.patch('/admin/blog/:id', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref = firestore().collection(COLLECTIONS.blogPosts).doc(req.params.id); const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error:'Artigo não encontrado.' });
  const current = snap.data() as any; const patch:any = { updatedAt:nowIso() };
  for (const key of ['title','summary','content','author','category','seoTitle','seoDescription']) if (req.body?.[key] !== undefined) patch[key]=safeString(req.body[key], key==='content'?120000:key==='summary'?500:180);
  if (req.body?.featuredImageUrl !== undefined) patch.featuredImageUrl=safeHttpUrl(req.body.featuredImageUrl);
  if (req.body?.tags !== undefined) patch.tags=stringArray(req.body.tags,12);
  if (req.body?.slug !== undefined) patch.slug=slugify(req.body.slug);
  if (req.body?.status !== undefined) { if (!['draft','published','archived'].includes(req.body.status)) return res.status(400).json({ error:'Status inválido.' }); patch.status=req.body.status; if (req.body.status==='published'&&!current.publishedAt) patch.publishedAt=nowIso(); }
  await ref.set(patch,{merge:true}); const fresh=await ref.get(); res.json({ post:{id:fresh.id,...fresh.data()} });
}));
router.delete('/admin/blog/:id', requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const ref=firestore().collection(COLLECTIONS.blogPosts).doc(req.params.id); const snap=await ref.get(); if(!snap.exists)return res.status(404).json({error:'Artigo não encontrado.'}); await ref.delete(); await writeAdminLog({operatorId:req.user!.id,operatorEmail:req.user!.email,action:'delete_blog',details:{postId:req.params.id}}); res.json({message:'Artigo removido.'});
}));

// Scheduler.
router.get('/cron/health', asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || '');
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: 'Cron não autorizado.' });
  res.json(await getSchedulerHealth());
}));

router.get('/cron/process', asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || '');
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: 'Cron não autorizado.' });

  const userAgent = String(req.headers['user-agent'] || '');
  const trigger = /vercel-cron\/1\.0/i.test(userAgent)
    ? 'vercel_cron'
    : 'authorized_api';
  res.json(await processSchedulerTick({ trigger }));
}));

// Compatibilidade com integrações antigas: ambas as rotas usam o mesmo coordenador e o mesmo lock.
router.get('/cron/social', asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || '');
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: 'Cron não autorizado.' });
  res.json(await processSchedulerTick());
}));

router.post('/cron/social', asyncRoute(async (req, res) => {
  const auth = String(req.headers.authorization || '');
  const isAuthorized = Boolean(config.cronSecret && auth === `Bearer ${config.cronSecret}`);
  if (!isAuthorized) return res.status(401).json({ error: 'Cron não autorizado.' });
  res.json(await processSchedulerTick());
}));

// ==========================================
// ALMA X - REGENTE DIGITAL API ENDPOINTS
// ==========================================

// Parse intent using Alma Intent Engine
router.post('/alma/intent', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, context } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }
  const result = await parseAlmaIntent(prompt, context);
  res.json({ intent: result });
}));

// Execute multi-agent orchestration
router.post('/alma/orchestrate', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { intent, context } = req.body || {};
  if (!intent || !intent.goal) {
    return res.status(400).json({ error: 'Objeto de intenção válido é obrigatório.' });
  }
  const result = await executeAlmaOrchestration(intent, req.user!.id, context);
  res.json(result);
}));

// Smart Home: List connected devices
router.get('/alma/devices', requireAuth, (_req: Request, res: Response) => {
  res.json({ devices: getSmartDevicesList() });
});

// Smart Home: Mutate device state
router.patch('/alma/devices/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { state } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Estado de atualização inválido.' });
  }
  const updated = updateSmartDeviceState(id, state);
  res.json({ device: updated });
}));

// Alma Multimodal Vision Inspection
router.post('/alma/vision', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { imageBase64, mimeType = 'image/jpeg', prompt = 'Analise visualmente e identifique objetos, ambiente e recomendações.' } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'Imagem base64 é obrigatória.' });
  }
  const cleanBase64 = String(imageBase64).replace(/^data:image\/\w+;base64,/, '');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(mimeType))) {
    return res.status(400).json({ error: 'Formato de imagem não suportado.' });
  }
  if (cleanBase64.length > 2_700_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    return res.status(413).json({ error: 'Imagem inválida ou maior que 2 MB.' });
  }
  const ai = textAiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        {
          text: `Você é o ALMA VISION & ARCHITECT. Analise a imagem detalhadamente com raciocínio multimodal de ponta e responda em português: ${prompt}`
        }
      ]
    }
  });

  res.json({
    analysis: response.text || 'Análise visual concluída.',
    timestamp: nowIso()
  });
}));

// Alma Memories: List, Create & Delete
router.get('/alma/memories', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const snap = await firestore().collection('alma_memories').where('userId', '==', userId).get();
    const memories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ memories });
  } catch {
    // Fallback com memórias iniciais
    res.json({
      memories: [
        {
          id: 'mem_1',
          type: 'preference',
          category: 'Ambiente',
          key: 'Temperatura de Conforto',
          value: '22°C com iluminação suave em tom azul ciano.',
          importance: 9,
          createdAt: nowIso()
        },
        {
          id: 'mem_2',
          type: 'semantic',
          category: 'Objetivos',
          key: 'Foco do Mês',
          value: 'Expansão da presença digital e automação operacional.',
          importance: 10,
          createdAt: nowIso()
        }
      ]
    });
  }
}));

router.post('/alma/memories', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, category, key, value, importance = 5 } = req.body || {};
  if (!key || !value) {
    return res.status(400).json({ error: 'Chave e valor da memória são obrigatórios.' });
  }
  const memoryDoc = {
    id: newId('mem'),
    userId,
    type: type || 'semantic',
    category: category || 'Geral',
    key: String(key).trim(),
    value: String(value).trim(),
    importance: Number(importance) || 5,
    createdAt: nowIso()
  };
  try {
    await firestore().collection('alma_memories').doc(memoryDoc.id).set(memoryDoc);
  } catch (err) {
    console.warn('[Alma Memory] Firestore write fallback:', err);
  }
  res.json({ memory: memoryDoc });
}));

router.delete('/alma/memories/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ref = firestore().collection('alma_memories').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Memória não encontrada.' });
    }
    await ref.delete();
  } catch (err) {
    console.warn('[Alma Memory] Firestore delete fallback:', err);
  }
  res.json({ success: true, deletedId: id });
}));

// Technical SEO endpoints
router.get('/sitemap.xml', asyncRoute(async (_req, res) => res.type('application/xml').send(await buildSitemapXml())));
router.get('/robots.txt', (_req, res) => res.type('text/plain').send(buildRobotsTxt()));

export async function buildSitemapXml(): Promise<string> {
  const base = config.appUrl.replace(/\/$/, '');
  const now = new Date().toISOString();

  interface SitemapUrlEntry {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: string;
  }

  const urls: SitemapUrlEntry[] = [
    { loc: `${base}/`, lastmod: now, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/vitrine`, lastmod: now, changefreq: 'daily', priority: '0.90' },
    { loc: `${base}/blog`, lastmod: now, changefreq: 'daily', priority: '0.90' },
    { loc: `${base}/termos`, lastmod: now, changefreq: 'monthly', priority: '0.60' },
    { loc: `${base}/privacidade`, lastmod: now, changefreq: 'monthly', priority: '0.60' },
    { loc: `${base}/cookies`, lastmod: now, changefreq: 'monthly', priority: '0.50' },
    { loc: `${base}/exclusao-de-dados`, lastmod: now, changefreq: 'monthly', priority: '0.50' },
    { loc: `${base}/apps-compliance`, lastmod: now, changefreq: 'monthly', priority: '0.50' }
  ];

  try {
    const [blogSnap, articlesSnap] = await Promise.race([
      Promise.all([
        firestore().collection(COLLECTIONS.blogPosts).where('status', '==', 'published').get(),
        firestore().collection(COLLECTIONS.blogArticles).where('status', '==', 'published').get()
      ]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Sitemap Firestore timeout')), 4_000))
    ]);

    for (const doc of blogSnap.docs) {
      const item = doc.data() as any;
      if (item.slug) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(item.slug)}`,
          lastmod: item.updatedAt || item.publishedAt || now,
          changefreq: 'monthly',
          priority: '0.75'
        });
      }
    }

    for (const doc of articlesSnap.docs) {
      const item = doc.data() as any;
      if (item.slug && !urls.some((entry) => entry.loc.endsWith(`/blog/${encodeURIComponent(item.slug)}`))) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(item.slug)}`,
          lastmod: item.updatedAt || item.publishedAt || now,
          changefreq: 'weekly',
          priority: '0.85'
        });
      }
    }

    for (const seeded of INITIAL_SEEDED_ARTICLES) {
      if (!urls.some((entry) => entry.loc.endsWith(`/blog/${encodeURIComponent(seeded.slug)}`))) {
        urls.push({
          loc: `${base}/blog/${encodeURIComponent(seeded.slug)}`,
          lastmod: seeded.updatedAt || now,
          changefreq: 'weekly',
          priority: '0.85'
        });
      }
    }

    const projects = await listAllPortalProjectsFromDb().catch(() => PORTAL_VIP_PROJECTS);
    for (const project of projects) {
      if (project.active !== false && project.slug) {
        urls.push({
          loc: `${base}/vitrine/${encodeURIComponent(project.slug)}`,
          lastmod: project.updatedAt || now,
          changefreq: 'daily',
          priority: '0.85'
        });
      }
    }
  } catch (error) {
    console.warn('[Portal Vip Brasil Sitemap] Falha ao carregar conteúdo dinâmico; mantendo rotas públicas base:', error);
  }

  const escapeXml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const safeLastmod = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  };

  const body = urls
    .filter((item, index, list) => list.findIndex((candidate) => candidate.loc === item.loc) === index)
    .map((item) => {
      const lastmod = safeLastmod(item.lastmod);
      return `  <url>
    <loc>${escapeXml(item.loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}${item.changefreq ? `\n    <changefreq>${item.changefreq}</changefreq>` : ''}${item.priority ? `\n    <priority>${item.priority}</priority>` : ''}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${body}
</urlset>
`;
}

export function buildRobotsTxt(): string {
  const blocked = [
    '/api/',
    '/admin',
    '/dashboard',
    '/projetos',
    '/autopilot',
    '/criar-conteudo',
    '/criar-imagem',
    '/criar-video',
    '/criar-artigo',
    '/seo',
    '/campanhas',
    '/calendario',
    '/redes-sociais',
    '/conteudos',
    '/analytics',
    '/perfil',
    '/configuracoes',
    '/suporte'
  ];
  return `User-agent: *
Allow: /
Allow: /blog
Allow: /blog/
Allow: /vitrine
Allow: /vitrine/
Allow: /termos
Allow: /privacidade
Allow: /cookies
Allow: /exclusao-de-dados
Allow: /apps-compliance
${blocked.map((path) => `Disallow: ${path}`).join('\n')}

Sitemap: ${config.appUrl.replace(/\/$/, '')}/sitemap.xml
`;
}

// ==========================================
// PORTAL VIP BRASIL — ROTAS OFICIAIS & MARKETING ENGINE
// ==========================================

router.get('/portal/projects', asyncRoute(async (_req: Request, res: Response) => {
  let projects = await listAllPortalProjectsFromDb();
  if (!projects.length) projects = (await seedPortalProjectsIfEmpty()).projects;
  projects = projects.filter((project) => project.active !== false);
  res.json({ brand: PORTAL_VIP_OFFICIAL_ASSETS, projects, total: projects.length });
}));

router.post('/portal/projects/seed', requireAuth, requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  const result = await seedPortalProjectsIfEmpty();
  res.json({ success: true, ...result });
}));

router.get('/portal/projects/:slug', asyncRoute(async (req: Request, res: Response) => {
  const project = await getPortalProjectFromDb(req.params.slug);
  if (!project || project.active === false) return res.status(404).json({ error: 'Projeto não encontrado na Vitrine Portal Vip Brasil.' });
  res.json({ project });
}));

router.patch('/portal/projects/:id', requireAuth, requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const updated = await updatePortalProjectInDb(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Projeto não encontrado para atualização.' });
  res.json({ success: true, project: updated });
}));

router.post('/portal/daily-pulse', requireAuth, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await runDailyPortalMarketingCycle(userId);
  res.json(result);
}));

router.get('/portal/antifall-status', requireAuth, requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  const testStart = Date.now();
  const testResult = await executeAiWith2SecAntiFall({
    prompt: 'Verificação rápida de integridade da esteira de IA com failover 2s.',
    maxTokens: 50,
    timeoutMs: 2000
  });

  res.json({
    status: 'ONLINE',
    protection: '2-Second Anti-Fall Redundancy Active',
    activeTier: testResult.versionTier,
    activeModel: testResult.modelUsed,
    totalLatencyMs: testResult.totalDurationMs,
    attempts: testResult.attempts,
    failoverTriggered: testResult.antiFallActivated,
    supportedTiers: [
      { tier: '3.7', model: 'Gemini 3.7 Pro / 3.1 Pro Preview', status: 'READY' },
      { tier: '3.6', model: 'Gemini 2.5 Flash / 3.6', status: 'READY' },
      { tier: '3.5', model: 'Gemini 3.1 Flash-Lite / 2.5 Lite', status: 'READY' }
    ],
    timestamp: nowIso()
  });
}));

// ==========================================
// BLOG AUTOMÁTICO & TRÁFEGO ORGÂNICO ENDPOINTS
// ==========================================

router.get('/portal/blog/articles', asyncRoute(async (req: Request, res: Response) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const query = req.query.q ? String(req.query.q) : undefined;
  const status = 'published';
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = await listBlogArticles({ category, projectId, query, status, limit, offset });
  const projectMap = new Map((await listAllPortalProjectsFromDb()).map((project) => [project.id, project]));
  const articles = result.articles.map((article) => serializeBlogArticleForPublic(article, projectMap.get(article.relatedProjectId)));
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.json({ ...result, articles });
}));

router.get('/portal/blog/articles/:slug', asyncRoute(async (req: Request, res: Response) => {
  const article = await getBlogArticleBySlug(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Artigo não encontrado no Blog do Portal Vip Brasil.' });
  const project = await getPortalProjectFromDb(article.relatedProjectId);

  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  res.json({ article: serializeBlogArticleForPublic(article, project) });
}));

router.get('/portal/blog/settings', requireAuth, requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  const settings = await getBlogSettings();
  res.json({ settings });
}));

router.post('/portal/blog/settings', requireAuth, requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const partial = req.body || {};
  const settings = await updateBlogSettings(partial);
  res.json({ success: true, settings });
}));

router.post('/portal/blog/generate-project-article', requireAuth, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, customTopic, customIntent, forceApproval } = req.body || {};
  const project = await getPortalProjectFromDb(String(projectId || ''));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado no Portal Vip Brasil.' });
  const result = await generateArticleForProject(project, { customTopic, customIntent, forceApproval, userId: req.user!.id });
  res.json({ ...result, article: serializeBlogArticleForPublic(result.article, project) });
}));

router.post('/portal/blog/daily-cycle', requireAuth, requireAdmin, asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await runDailyBlogCycle(userId);
  const projectMap = new Map((await listAllPortalProjectsFromDb()).map((project) => [project.id, project]));
  res.json({
    ...result,
    articlesGenerated: result.articlesGenerated.map((article) => serializeBlogArticleForPublic(article, projectMap.get(article.relatedProjectId)))
  });
}));

router.patch('/portal/blog/articles/:id/status', requireAuth, requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['published', 'pending_approval', 'draft', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido fornecido.' });
  }

  const db = firestore();
  await db.collection(COLLECTIONS.blogArticles).doc(id).set({
    status,
    updatedAt: nowIso()
  }, { merge: true });

  res.json({ success: true, id, status });
}));

router.post('/portal/blog/track', asyncRoute(async (req: Request, res: Response) => {
  const { articleId, metric } = req.body || {};
  if (!articleId || !metric) return res.status(400).json({ error: 'articleId e metric são obrigatórios.' });

  const validMetrics = ['views', 'likes', 'shares', 'clicksWebsite', 'clicksPlayStore'];
  if (!validMetrics.includes(metric)) return res.status(400).json({ error: 'Métrica inválida.' });

  // Métricas públicas permanecem best-effort no cliente. Persistir cada acesso
  // no Firestore permitia que bots consumissem toda a cota diária de gravações.
  res.status(202).json({ success: true, persisted: false, articleId, metric });
}));

export { router };
export default router;
