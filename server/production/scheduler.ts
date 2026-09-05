import { config } from '../config/index.js';
import { generateAutopilotPost, generatePlatformArticle, generatePost, processPendingVideoJobs } from './ai.js';
import { runDailyPortalMarketingCycle } from './antiFallEngine.js';
import { runDailyBlogCycle } from './blogEngine.js';
import { getPortalProjectFromDb } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso } from './store.js';
import {
  getProviderAutoPublishReason,
  isTextAutoPublishSupported,
  normalizeProvider,
  publishText,
  ensureValidSocialAccessToken,
  type SocialProvider
} from './social.js';

import { recoverStalePublishingPostsR8, processScheduledPostsR8 } from './scheduledPublisherR8.js';
import { processAutopilotMultimediaR8, triggerUserAutopilotMultimediaR8 } from './autopilotMultimediaR8.js';

// Contrato de identidade preservado para logs, notificações e governança de produção.
export const PORTAL_VIP_AUTOMATION_IDENTITY = {
  logPrefix: '[Portal Vip Automação]',
  contentCreatedTitle: 'Automação do Portal Vip Brasil criou novo conteúdo',
  executedTitle: 'Automação do Portal Vip Brasil executada',
  magazineName: 'Portal Vip Brasil Magazine',
  generatedBy: 'portal_vip_auto_blog'
} as const;


async function schedulerProjectContext(userId: string, projectId: string): Promise<any | undefined> {
  const project = await getPortalProjectFromDb(projectId);
  if (!project || project.active === false) return undefined;
  return {
    id: project.id, userId, name: project.name, slug: project.slug, category: project.category,
    segment: project.segment, description: project.description, website: project.websiteUrl,
    websiteUrl: project.websiteUrl, androidApp: project.playStoreUrl, targetAudience: project.targetAudience,
    keywords: project.keywords || [], products: [], services: [], socialLinks: {}, portalProject: true, virtual: true
  };
}

export interface AutopilotScheduleConfig {
  enabled?: boolean;
  frequency?: 'daily' | '3_times_week' | 'weekly';
  timezone?: string;
  preferredDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  preferredHours?: number[]; // 0..23
  lastRunAt?: string | null;
  lastRunSlot?: string | null;
}

export function getLocalDateAndHour(date: Date, timezone: string): { dayOfWeek: number; hour: number; dateStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }
    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayOfWeek = weekdayMap[partMap.weekday] ?? date.getUTCDay();
    const hour = parseInt(partMap.hour, 10) % 24;
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    return { dayOfWeek, hour, dateStr };
  } catch {
    // Fallback seguro em caso de timezone não reconhecida
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();
    const dateStr = date.toISOString().slice(0, 10);
    return { dayOfWeek, hour, dateStr };
  }
}

export function isAutopilotDue(config: AutopilotScheduleConfig, referenceDate: Date = new Date()): boolean {
  if (!config.enabled) return false;

  const tz = config.timezone || 'America/Sao_Paulo';
  const { dayOfWeek, hour, dateStr } = getLocalDateAndHour(referenceDate, tz);

  // Validação de dias permitidos (default: Segunda a Sexta [1,2,3,4,5])
  const preferredDays = Array.isArray(config.preferredDays) && config.preferredDays.length > 0
    ? config.preferredDays
    : [1, 2, 3, 4, 5];
  if (!preferredDays.includes(dayOfWeek)) {
    return false;
  }

  // Validação de horários permitidos (default: 10h)
  const preferredHours = Array.isArray(config.preferredHours) && config.preferredHours.length > 0
    ? config.preferredHours
    : [10];
  if (!preferredHours.includes(hour)) {
    return false;
  }

  // Prevenção de execuções duplicadas no mesmo slot
  const currentSlot = `${dateStr}_h${hour}`;
  if (config.lastRunSlot === currentSlot) {
    return false;
  }

  // Verificação de intervalo mínimo por frequência
  if (config.lastRunAt) {
    const lastRunMs = new Date(config.lastRunAt).getTime();
    const elapsedHours = (referenceDate.getTime() - lastRunMs) / 3_600_000;

    if (config.frequency === 'weekly' && elapsedHours < 140) {
      return false; // ~6 dias
    }
    if (config.frequency === '3_times_week' && elapsedHours < 44) {
      return false; // ~2 dias
    }
    if ((config.frequency === 'daily' || !config.frequency) && elapsedHours < 20) {
      return false; // ~1 dia
    }
  }

  return true;
}

export type SchedulerTrigger = 'vercel_cron' | 'authorized_api' | 'social_tick' | 'internal';
export type SchedulerCycleStatus = 'running' | 'ok' | 'degraded' | 'failed';

interface SchedulerLease {
  owner: string;
  fencingToken: number;
  lockedUntil: number;
  trigger: SchedulerTrigger;
  startedAt: string;
}

export interface SchedulerPublicRuntime {
  executionObserved: boolean;
  totalCyclesRecorded: number;
  lastCycleStartedAt: string | null;
  lastCycleFinishedAt: string | null;
  lastCycleStatus: SchedulerCycleStatus | null;
  lastTrigger: SchedulerTrigger | null;
  vercelCronCyclesRecorded: number;
  lastCronStartedAt: string | null;
  lastCronFinishedAt: string | null;
  lastCronStatus: SchedulerCycleStatus | null;
  legacyLastLeaseStartedAt: string | null;
  legacyLastLeaseReleasedAt: string | null;
  lastErrorCount: number;
  lastErrorStages: string[];
  lastCronErrorCount: number;
  lastCronErrorStages: string[];
  checkedAt: string;
  error?: string;
}

const SCHEDULER_RUNTIME_DOC = 'schedulerRuntime';

function safeNonNegativeInteger(value: any): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function epochToIso(value: any): string | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function knownTrigger(value: any): SchedulerTrigger | null {
  return ['vercel_cron', 'authorized_api', 'social_tick', 'internal'].includes(String(value))
    ? value as SchedulerTrigger
    : null;
}

function knownCycleStatus(value: any): SchedulerCycleStatus | null {
  return ['running', 'ok', 'degraded', 'failed'].includes(String(value))
    ? value as SchedulerCycleStatus
    : null;
}

async function acquireLock(trigger: SchedulerTrigger = 'internal'): Promise<SchedulerLease | null> {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.schedulerLocks).doc('process');
  const runtimeRef = db.collection(COLLECTIONS.systemSettings).doc(SCHEDULER_RUNTIME_DOC);
  const now = Date.now();
  const leaseMs = 12 * 60 * 1000;
  const owner = newId('cron');

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    if (current?.lockedUntil && Number(current.lockedUntil) > now) return null;

    const runtimeSnap = await tx.get(runtimeRef);
    const runtime = runtimeSnap.data() as any;

    const currentFence = Number(current?.fencingToken || 0);
    const fencingToken = Number.isSafeInteger(currentFence) && currentFence >= 0
      ? currentFence + 1
      : 1;
    const startedAt = nowIso();
    const lease: SchedulerLease = {
      owner,
      fencingToken,
      lockedUntil: now + leaseMs,
      trigger,
      startedAt
    };

    tx.set(ref, {
      lockedAt: now,
      lockedUntil: lease.lockedUntil,
      owner: lease.owner,
      fencingToken: lease.fencingToken,
      releasedAt: null
    }, { merge: true });

    const runtimePatch: Record<string, any> = {
      totalCycles: safeNonNegativeInteger(runtime?.totalCycles) + 1,
      lastStartedAt: startedAt,
      lastStatus: 'running',
      lastErrorCount: 0,
      lastErrors: null,
      lastTrigger: trigger,
      lastCycleOwner: owner,
      updatedAt: startedAt
    };
    if (trigger === 'vercel_cron') {
      runtimePatch.vercelCronCycles = safeNonNegativeInteger(runtime?.vercelCronCycles) + 1;
      runtimePatch.lastCronStartedAt = startedAt;
      runtimePatch.lastCronStatus = 'running';
      runtimePatch.lastCronErrorCount = 0;
      runtimePatch.lastCronErrors = null;
    }
    tx.set(runtimeRef, runtimePatch, { merge: true });

    return lease;
  });
}

function sanitizeSchedulerErrors(errors: Record<string, string> | number): { count: number; details: Record<string, string> | null } {
  if (typeof errors === 'number') return { count: safeNonNegativeInteger(errors), details: null };
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors || {}).slice(0, 12)) {
    const safe = String(value || 'Falha sem mensagem')
      .replace(/EAA[A-Za-z0-9_-]{10,}/g, '[TOKEN_REMOVIDO]')
      .replace(/(access_token|refresh_token|client_secret|authorization|code)[=: ]+[^ ,;]+/gi, '$1=[REMOVIDO]')
      .replace(/Bearer +[A-Za-z0-9._~-]+/gi, 'Bearer [REMOVIDO]')
      .replace(/[\r\n\t]+/g, ' ')
      .slice(0, 500);
    details[String(key).slice(0, 80)] = safe;
  }
  return { count: Object.keys(details).length, details: Object.keys(details).length ? details : null };
}

async function releaseLock(
  lease: SchedulerLease,
  status: Exclude<SchedulerCycleStatus, 'running'> = 'ok',
  errors: Record<string, string> | number = 0
): Promise<boolean> {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.schedulerLocks).doc('process');
  const runtimeRef = db.collection(COLLECTIONS.systemSettings).doc(SCHEDULER_RUNTIME_DOC);
  const errorSummary = sanitizeSchedulerErrors(errors);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    const stillOwnsLock = Boolean(snap.exists && current?.owner === lease.owner && Number(current?.fencingToken) === lease.fencingToken);
    if (!stillOwnsLock) return false;
    const runtimeSnap = await tx.get(runtimeRef);
    const runtime = runtimeSnap.data() as any;
    const finishedAt = nowIso();
    tx.set(ref, { lockedUntil: 0, releasedAt: Date.now(), releasedBy: lease.owner }, { merge: true });
    if (!runtime?.lastCycleOwner || runtime.lastCycleOwner === lease.owner) {
      const runtimePatch: Record<string, any> = {
        lastFinishedAt: finishedAt,
        lastStatus: status,
        lastErrorCount: errorSummary.count,
        lastErrors: errorSummary.details,
        updatedAt: finishedAt
      };
      if (lease.trigger === 'vercel_cron') {
        runtimePatch.lastCronFinishedAt = finishedAt;
        runtimePatch.lastCronStatus = status;
        runtimePatch.lastCronErrorCount = errorSummary.count;
        runtimePatch.lastCronErrors = errorSummary.details;
      }
      tx.set(runtimeRef, runtimePatch, { merge: true });
    }
    return true;
  });
}

export async function getSchedulerPublicRuntime(): Promise<SchedulerPublicRuntime> {
  const db = firestore();
  try {
    const [runtimeSnap, lockSnap] = await Promise.all([
      db.collection(COLLECTIONS.systemSettings).doc(SCHEDULER_RUNTIME_DOC).get(),
      db.collection(COLLECTIONS.schedulerLocks).doc('process').get()
    ]);
    const runtime = runtimeSnap.data() as any;
    const lock = lockSnap.data() as any;

    const totalCyclesRecorded = safeNonNegativeInteger(runtime?.totalCycles);
    const vercelCronCyclesRecorded = safeNonNegativeInteger(runtime?.vercelCronCycles);
    const legacyLastLeaseStartedAt = epochToIso(lock?.lockedAt);
    const legacyLastLeaseReleasedAt = epochToIso(lock?.releasedAt);

    return {
      executionObserved: Boolean(
        totalCyclesRecorded > 0 ||
        vercelCronCyclesRecorded > 0 ||
        legacyLastLeaseStartedAt ||
        legacyLastLeaseReleasedAt
      ),
      totalCyclesRecorded,
      lastCycleStartedAt: runtime?.lastStartedAt || null,
      lastCycleFinishedAt: runtime?.lastFinishedAt || null,
      lastCycleStatus: knownCycleStatus(runtime?.lastStatus),
      lastTrigger: knownTrigger(runtime?.lastTrigger),
      vercelCronCyclesRecorded,
      lastCronStartedAt: runtime?.lastCronStartedAt || null,
      lastCronFinishedAt: runtime?.lastCronFinishedAt || null,
      lastCronStatus: knownCycleStatus(runtime?.lastCronStatus),
      lastErrorCount: safeNonNegativeInteger(runtime?.lastErrorCount),
      lastErrorStages: runtime?.lastErrors && typeof runtime.lastErrors === 'object' ? Object.keys(runtime.lastErrors).slice(0, 12) : [],
      lastCronErrorCount: safeNonNegativeInteger(runtime?.lastCronErrorCount),
      lastCronErrorStages: runtime?.lastCronErrors && typeof runtime.lastCronErrors === 'object' ? Object.keys(runtime.lastCronErrors).slice(0, 12) : [],
      legacyLastLeaseStartedAt,
      legacyLastLeaseReleasedAt,
      checkedAt: nowIso()
    };
  } catch (err: any) {
    return {
      executionObserved: false,
      totalCyclesRecorded: 0,
      lastCycleStartedAt: null,
      lastCycleFinishedAt: null,
      lastCycleStatus: null,
      lastTrigger: null,
      vercelCronCyclesRecorded: 0,
      lastCronStartedAt: null,
      lastCronFinishedAt: null,
      lastCronStatus: null,
      lastErrorCount: 0,
      lastErrorStages: [],
      lastCronErrorCount: 0,
      lastCronErrorStages: [],
      legacyLastLeaseStartedAt: null,
      legacyLastLeaseReleasedAt: null,
      checkedAt: nowIso(),
      error: 'Falha ao consultar telemetria do scheduler.'
    };
  }
}

export async function getSchedulerDiagnostics(): Promise<{
  lastErrorCount: number;
  lastErrors: Record<string, string> | null;
  lastCronErrorCount: number;
  lastCronErrors: Record<string, string> | null;
  updatedAt: string | null;
}> {
  const snap = await firestore().collection(COLLECTIONS.systemSettings).doc(SCHEDULER_RUNTIME_DOC).get();
  const runtime = snap.data() as any;
  return {
    lastErrorCount: safeNonNegativeInteger(runtime?.lastErrorCount),
    lastErrors: runtime?.lastErrors && typeof runtime.lastErrors === 'object' ? runtime.lastErrors : null,
    lastCronErrorCount: safeNonNegativeInteger(runtime?.lastCronErrorCount),
    lastCronErrors: runtime?.lastCronErrors && typeof runtime.lastCronErrors === 'object' ? runtime.lastCronErrors : null,
    updatedAt: runtime?.updatedAt || null
  };
}

export async function recoverStalePublishingPosts(staleThresholdMinutes = 15): Promise<number> {
  return recoverStalePublishingPostsR8(staleThresholdMinutes);
}

export async function processScheduledPosts(): Promise<number> {
  return processScheduledPostsR8();
}

export async function processAutopilot(): Promise<number> {
  return processAutopilotMultimediaR8();
}

async function processAutoBlog(): Promise<number> {
  if (!config.blog.autoEnabled) return 0;
  const db = firestore();
  const today = new Date().toISOString().slice(0, 10);
  const settingsRef = db.collection(COLLECTIONS.systemSettings).doc('autoBlog');
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    if (snap.data()?.lastPublishedDate === today) return false;
    tx.set(settingsRef, { lastAttemptDate: today, processingAt: nowIso() }, { merge: true });
    return true;
  });
  if (!claimed) return 0;

  const topics = [
    'como estruturar um calendário editorial que realmente ajuda a vender',
    'como usar inteligência artificial no marketing sem perder a identidade da marca',
    'SEO para pequenas empresas: fundamentos que continuam importantes',
    'como transformar diferenciais da empresa em conteúdo persuasivo',
    'automação de marketing com aprovação humana: quando usar cada modo',
    'como medir se uma campanha de conteúdo está ajudando o negócio',
    'boas práticas para reutilizar conteúdo entre redes sociais sem parecer repetitivo'
  ];
  const index = Math.floor(Date.now() / 86_400_000) % topics.length;
  try {
    const generated = await generatePlatformArticle(topics[index]);
    const article = generated.article || {};
    const id = newId('blog');
    const slugBase = String(article.suggestedSlug || article.title || topics[index]);
    const slug = `${slugBase.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)}-${today.replace(/-/g,'')}`;
    const post = {
      id, title: String(article.title || 'Portal Vip Brasil Magazine').slice(0, 180), slug,
      summary: String(article.summary || article.metaDescription || '').slice(0, 500),
      content: String(article.content || '').slice(0, 120_000), featuredImageUrl: '', author: config.blog.author,
      category: String(article.category || 'Marketing & IA').slice(0, 100),
      tags: Array.isArray(article.tags) ? article.tags.slice(0, 12).map((x:any)=>String(x).slice(0,80)) : ['Marketing','IA'],
      seoTitle: String(article.title || '').slice(0, 70), seoDescription: String(article.metaDescription || article.summary || '').slice(0, 180),
      status: 'published', publishedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso(), generatedBy: 'portal_vip_auto_blog', modelUsed: generated.modelUsed
    };
    if (!post.title || !post.content) throw new Error('A IA não retornou artigo completo.');
    await db.collection(COLLECTIONS.blogPosts).doc(id).set(post);
    await settingsRef.set({ lastPublishedDate: today, lastPublishedPostId: id, completedAt: nowIso(), lastError: null }, { merge: true });
    return 1;
  } catch (error) {
    await settingsRef.set({ lastError: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500), failedAt: nowIso() }, { merge: true });
    return 0;
  }
}

export async function triggerUserAutopilot(userId: string, companyId: string): Promise<{
  success: boolean;
  contentId?: string;
  scheduleId?: string;
  videoJobId?: string;
  mode?: string;
  creditsUsed: number;
  message: string;
}> {
  return triggerUserAutopilotMultimediaR8(userId, companyId);
}

export async function processSchedulerTick(options: { trigger?: SchedulerTrigger } = {}) {
  const lease = await acquireLock(options.trigger || 'internal');
  if (!lease) return { skipped: true, reason: 'Outro ciclo já está em execução.' };

  const errors: Record<string, string> = {};
  let finalStatus: Exclude<SchedulerCycleStatus, 'running'> = 'ok';
  let recoveredPublishing = 0;
  let scheduledPosts = 0;
  let videoJobs: { checked: number; completed: number; failed: number } | number = 0;
  let autopilot = 0;

  try {
    // Step 1: Recover stale publishing posts

    // Step 2: Recover stale publishing posts (prioritizes unblocking social publications)
    try {
      recoveredPublishing = await recoverStalePublishingPosts(15);
    } catch (err: any) {
      errors.recoverPublishing = err?.message || String(err);
      console.error('[Scheduler] Erro em recoverStalePublishingPosts:', err);
    }

    // Step 3: Process scheduled social posts (high priority - execute before heavy background tasks)
    try {
      scheduledPosts = await processScheduledPosts();
    } catch (err: any) {
      errors.scheduledPosts = err?.message || String(err);
      console.error('[Scheduler] Erro em processScheduledPosts:', err);
    }

    // Step 3.5: SEO orgânico primeiro: cria os artigos antes das tarefas pesadas de vídeo/marketing.
    let portalBlogCount = 0;
    try {
      const blogCycleRes = await runDailyBlogCycle();
      portalBlogCount = blogCycleRes.publishedCount + blogCycleRes.pendingCount;
      if (!blogCycleRes.success) {
        errors.portalBlog = 'Ciclo do Blog teve ' + blogCycleRes.failedCount + ' falha(s), ' + blogCycleRes.skippedCount + ' item(ns) já processado(s), em ' + blogCycleRes.totalProjects + ' projeto(s).';
      }
    } catch (err: any) {
      errors.portalBlog = err?.message || String(err);
      console.error('[Scheduler] Erro em runDailyBlogCycle:', err);
    }

    // Step 4: Process pending video jobs (async AI/Veo processing)
    try {
      videoJobs = await processPendingVideoJobs();
    } catch (err: any) {
      errors.videoJobs = err?.message || String(err);
      console.error('[Scheduler] Erro em processPendingVideoJobs:', err);
    }

    // Step 5: Process autopilot
    try {
      autopilot = await processAutopilot();
    } catch (err: any) {
      errors.autopilot = err?.message || String(err);
      console.error('[Scheduler] Erro em processAutopilot:', err);
    }

    // Step 5.1: Process Daily Portal Vip Marketing Engine (1x/dia para cada site/app da vitrine)
    let portalMarketing = 0;
    try {
      const pmRes = await runDailyPortalMarketingCycle();
      portalMarketing = pmRes.generatedCount;
      if (!pmRes.success) {
        errors.portalMarketing = (pmRes.errors || []).map((item) => `${item.projectId}: ${item.message}`).join(' | ').slice(0, 1000) || 'Ciclo diário concluído com falhas.';
      }
    } catch (err: any) {
      errors.portalMarketing = err?.message || String(err);
      console.error('[Scheduler] Erro em runDailyPortalMarketingCycle:', err);
    }

    // Step 5.15: processa também os agendamentos criados neste mesmo ciclo.
    let scheduledPostsAfterGeneration = 0;
    try {
      scheduledPostsAfterGeneration = await processScheduledPosts();
      scheduledPosts += scheduledPostsAfterGeneration;
    } catch (err: any) {
      errors.scheduledPostsAfterGeneration = err?.message || String(err);
      console.error('[Scheduler] Erro em processScheduledPosts após geração:', err);
    }

    // O pipeline legado processAutoBlog não é executado: runDailyBlogCycle é a única automação diária do Blog.

    finalStatus = Object.keys(errors).length > 0 ? 'degraded' : 'ok';
    return {
      skipped: false,
      recoveredPublishing,
      scheduledPosts,
      videoJobs,
      autopilot,
      portalMarketing,
      portalBlogCount,
      scheduledPostsAfterGeneration,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      processedAt: nowIso()
    };
  } catch (error: any) {
    finalStatus = 'failed';
    errors.scheduler = error?.message || String(error);
    throw error;
  } finally {
    await releaseLock(lease, finalStatus, errors);
  }
}

export async function getSchedulerHealth(): Promise<{
  status: 'ok' | 'degraded';
  environment: string;
  cronSecretConfigured: boolean;
  metaConfigured: boolean;
  lock?: { isLocked: boolean; lockedAt: number | null; lockedUntil: number | null; owner: string | null; fencingToken: number | null };
  queueStats?: {
    scheduledPending: number;
    scheduledPostsDue: number;
    publishingPending: number;
    publishingCount: number;
    videoJobsPending: number;
    autopilotEnabled: number;
    autoBlogEnabled: boolean;
  };
  error?: string;
  checkedAt: string;
}> {
  const db = firestore();
  const now = Date.now();

  try {
    const lockSnap = await db.collection(COLLECTIONS.schedulerLocks).doc('process').get();
    const lockData = lockSnap.data() as any;
    const lockedUntil = lockData?.lockedUntil ? Number(lockData.lockedUntil) : 0;
    const isLocked = lockedUntil > now;

    const [dueSnap, publishingSnap, videoJobsSnap, autopilotSnap] = await Promise.all([
      db.collection(COLLECTIONS.scheduledPosts)
        .where('status', '==', 'scheduled')
        .where('scheduledFor', '<=', nowIso())
        .get(),
      db.collection(COLLECTIONS.scheduledPosts)
        .where('status', '==', 'publishing')
        .get(),
      db.collection(COLLECTIONS.mediaGenerationJobs)
        .where('status', 'in', ['pending', 'processing'])
        .get().catch(() => ({ size: 0 })),
      db.collection(COLLECTIONS.autopilotConfigs)
        .where('enabled', '==', true)
        .get().catch(() => ({ size: 0 }))
    ]);

    return {
      status: 'ok',
      environment: config.nodeEnv,
      cronSecretConfigured: Boolean(config.cronSecret),
      metaConfigured: Boolean(config.social.meta.clientId && config.social.meta.clientSecret),
      lock: {
        isLocked,
        lockedAt: lockData?.lockedAt || null,
        lockedUntil: lockData?.lockedUntil || null,
        owner: lockData?.owner || null,
        fencingToken: Number.isSafeInteger(Number(lockData?.fencingToken))
          ? Number(lockData.fencingToken)
          : null
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
  } catch (err: any) {
    return {
      status: 'degraded',
      environment: config.nodeEnv,
      cronSecretConfigured: Boolean(config.cronSecret),
      metaConfigured: Boolean(config.social.meta.clientId && config.social.meta.clientSecret),
      error: 'Falha ao consultar estado das filas no Firestore: ' + (err?.message ? String(err.message).slice(0, 200) : 'Erro desconhecido'),
      checkedAt: nowIso()
    };
  }
}

export async function processSocialTick(): Promise<{
  skipped?: boolean;
  reason?: string;
  recoveredPublishing: number;
  scheduledPosts: number;
  error?: string;
  processedAt: string;
}> {
  const lease = await acquireLock('social_tick');
  if (!lease) {
    return {
      skipped: true,
      reason: 'scheduler_busy',
      recoveredPublishing: 0,
      scheduledPosts: 0,
      processedAt: nowIso()
    };
  }

  let socialStatus: Exclude<SchedulerCycleStatus, 'running'> = 'ok';
  let socialError: string | null = null;
  try {
    const recoveredPublishing = await recoverStalePublishingPosts(15);
    const scheduledPosts = await processScheduledPosts();
    return {
      skipped: false,
      recoveredPublishing,
      scheduledPosts,
      processedAt: nowIso()
    };
  } catch (err: any) {
    socialStatus = 'degraded';
    socialError = err instanceof Error ? err.message : String(err);
    return {
      skipped: false,
      recoveredPublishing: 0,
      scheduledPosts: 0,
      error: socialError || 'Falha no ciclo social.',
      processedAt: nowIso()
    };
  } finally {
    await releaseLock(lease, socialStatus, socialError ? { socialTick: socialError } : 0);
  }
}
