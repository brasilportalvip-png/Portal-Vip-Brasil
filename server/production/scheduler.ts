import { config } from '../config/index.js';
import { generateAutopilotPost, generatePlatformArticle, generatePost, processPendingVideoJobs } from './ai.js';
import { runDailyPortalMarketingCycle } from './antiFallEngine.js';
import { runDailyBlogCycle } from './blogEngine.js';
import { PORTAL_VIP_PROJECTS } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso } from './store.js';
import {
  getProviderAutoPublishReason,
  isTextAutoPublishSupported,
  normalizeProvider,
  publishText,
  type SocialProvider
} from './social.js';


function schedulerProjectContext(userId: string, projectId: string): any | undefined {
  const project = PORTAL_VIP_PROJECTS.find((item) => item.id === projectId);
  if (!project) return undefined;
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
    products: [], services: [], socialLinks: {}, portalProject: true, virtual: true
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
      lastTrigger: trigger,
      lastCycleOwner: owner,
      updatedAt: startedAt
    };
    if (trigger === 'vercel_cron') {
      runtimePatch.vercelCronCycles = safeNonNegativeInteger(runtime?.vercelCronCycles) + 1;
      runtimePatch.lastCronStartedAt = startedAt;
      runtimePatch.lastCronStatus = 'running';
    }
    tx.set(runtimeRef, runtimePatch, { merge: true });

    return lease;
  });
}

async function releaseLock(
  lease: SchedulerLease,
  status: Exclude<SchedulerCycleStatus, 'running'> = 'ok',
  errorCount = 0
): Promise<boolean> {
  const db = firestore();
  const ref = db.collection(COLLECTIONS.schedulerLocks).doc('process');
  const runtimeRef = db.collection(COLLECTIONS.systemSettings).doc(SCHEDULER_RUNTIME_DOC);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    const stillOwnsLock = Boolean(
      snap.exists &&
      current?.owner === lease.owner &&
      Number(current?.fencingToken) === lease.fencingToken
    );
    if (!stillOwnsLock) return false;

    const runtimeSnap = await tx.get(runtimeRef);
    const runtime = runtimeSnap.data() as any;
    const finishedAt = nowIso();

    tx.set(ref, {
      lockedUntil: 0,
      releasedAt: Date.now(),
      releasedBy: lease.owner
    }, { merge: true });

    if (!runtime?.lastCycleOwner || runtime.lastCycleOwner === lease.owner) {
      const runtimePatch: Record<string, any> = {
        lastFinishedAt: finishedAt,
        lastStatus: status,
        lastErrorCount: safeNonNegativeInteger(errorCount),
        updatedAt: finishedAt
      };
      if (lease.trigger === 'vercel_cron') {
        runtimePatch.lastCronFinishedAt = finishedAt;
        runtimePatch.lastCronStatus = status;
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
      legacyLastLeaseStartedAt: null,
      legacyLastLeaseReleasedAt: null,
      checkedAt: nowIso(),
      error: 'Falha ao consultar telemetria do scheduler: ' +
        (err?.message ? String(err.message).slice(0, 200) : 'Erro desconhecido')
    };
  }
}

export async function recoverStalePublishingPosts(staleThresholdMinutes = 15): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts)
    .where('status', '==', 'publishing')
    .limit(50)
    .get();

  let recovered = 0;
  const cutoffMs = Date.now() - staleThresholdMinutes * 60 * 1000;

  for (const doc of snap.docs) {
    const post = doc.data() as any;
    const timeIso = post.processingAt || post.publishedAt || post.updatedAt || post.createdAt;
    const processingTime = timeIso ? new Date(timeIso).getTime() : 0;

    if (processingTime < cutoffMs) {
      const publicationResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
      const requestedPlatforms = Array.isArray(post.platforms) ? post.platforms : [];

      const successfulResults = publicationResults.filter((r: any) =>
        r?.success && r?.externalId && (r?.externalState === 'confirmed_success' || !r?.externalState)
      );

      const hasUnknown = publicationResults.some((r: any) => r?.externalState === 'unknown');

      // Verifica se todos os provedores solicitados possuem resultado registrado
      const allRequestedHaveResult = requestedPlatforms.length > 0 && requestedPlatforms.every((plat: string) =>
        publicationResults.some((r: any) => r?.platform === plat || normalizeProvider(r?.platform) === normalizeProvider(plat))
      );

      const allConfirmedSuccess = requestedPlatforms.length > 0 && requestedPlatforms.every((plat: string) =>
        successfulResults.some((s: any) => s?.platform === plat || normalizeProvider(s?.platform) === normalizeProvider(plat))
      );

      if (allConfirmedSuccess) {
        const firstSuccess = successfulResults[0];
        await doc.ref.update({
          status: 'published',
          publishedAt: post.publishedAt || nowIso(),
          lastExternalId: post.lastExternalId || firstSuccess?.externalId,
          errorMessage: null,
          recoveredAt: nowIso(),
          updatedAt: nowIso()
        });

        // Atualização segura do contentItem com validação de tenant
        if (post.contentItemId) {
          const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
          if (contentSnap.exists) {
            const contentData = contentSnap.data() as any;
            if (contentData?.userId === post.userId && contentData?.companyId === post.companyId) {
              await contentSnap.ref.update({ status: 'published', updatedAt: nowIso() });
            }
          }
        }
      } else if (hasUnknown || !allRequestedHaveResult) {
        await doc.ref.update({
          status: 'requires_review',
          errorMessage: 'Verificação manual necessária — o processamento foi interrompido e a rede social pode ter recebido a publicação.',
          recoveredAt: nowIso(),
          updatedAt: nowIso()
        });
      } else {
        // Todos os targets solicitados foram processados, nenhum é unknown, mas há falha confirmada
        const failedErrors = publicationResults
          .filter((r: any) => !r?.success)
          .map((r: any) => r?.error)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 500) || 'Falha na publicação após recuperação.';

        await doc.ref.update({
          status: 'failed',
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

export async function processScheduledPosts(): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts)
    .where('status', '==', 'scheduled')
    .where('scheduledFor', '<=', nowIso())
    .limit(25)
    .get();
  let processed = 0;

  for (const doc of snap.docs) {
    const post = { id: doc.id, ...doc.data() } as any;
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || fresh.data()?.status !== 'scheduled') return false;
      tx.update(doc.ref, { status: 'publishing', processingAt: nowIso() });
      return true;
    });
    if (!claimed) continue;

    try {
      // 1. Revalidação de usuário
      const userSnap = await db.collection(COLLECTIONS.users).doc(post.userId).get();
      if (!userSnap.exists) {
        throw new Error('Inconsistência de segurança: Usuário associado ao agendamento não encontrado.');
      }
      const userData = userSnap.data() as any;

      // 2. Revalidação estrita do projeto oficial.
      const projectId = String(post.projectId || post.companyId || '');
      if (!PORTAL_VIP_PROJECTS.some((project) => project.id === projectId)) {
        throw new Error('Inconsistência de segurança: projeto oficial do agendamento não reconhecido.');
      }

      // 4. Revalidação de conteúdo e titularidade
      const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
      if (!contentSnap.exists) {
        throw new Error('Inconsistência de segurança: Conteúdo associado não encontrado.');
      }
      const content = { id: contentSnap.id, ...contentSnap.data() } as any;
      if (content.userId !== post.userId || content.companyId !== post.companyId) {
        throw new Error('Violação de isolamento multi-tenant: Conteúdo não pertence ao usuário ou empresa do agendamento.');
      }

      const platforms = Array.isArray(post.platforms) ? post.platforms : [];
      if (!platforms.length) throw new Error('Nenhuma rede social selecionada para publicação.');

      const existingResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
      const publicationResults: any[] = [];

      for (const platform of platforms) {
        const provider = normalizeProvider(String(platform));
        if (!provider) {
          publicationResults.push({
            platform,
            provider: null,
            success: false,
            externalState: 'confirmed_failed',
            retrySafe: false,
            error: `Rede social "${platform}" não reconhecida.`
          });
          continue;
        }

        // Bloqueio antes de chamar API se provider textual não for suportado
        if (!isTextAutoPublishSupported(provider)) {
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalState: 'confirmed_failed',
            retrySafe: false,
            error: getProviderAutoPublishReason(provider) || `Publicação textual automática não suportada para ${provider}.`
          });
          continue;
        }

        // Idempotência: Se já foi publicado com sucesso nesta plataforma anteriormente (ex: retry parcial), reaproveita o resultado
        const prevSuccess = existingResults.find(
          (r: any) =>
            (r?.platform === platform || normalizeProvider(r?.platform) === provider) &&
            r?.success &&
            r?.externalId &&
            (r?.externalState === 'confirmed_success' || !r?.externalState)
        );
        if (prevSuccess) {
          publicationResults.push({
            ...prevSuccess,
            externalState: 'confirmed_success',
            retrySafe: false
          });
          continue;
        }

        // Se uma falha anterior não for retrySafe (ex: erro definitivo de auth/escopo já registrado), reaproveita a falha sem re-chamar a API
        const prevUnsafeFail = existingResults.find(
          (r: any) =>
            (r?.platform === platform || normalizeProvider(r?.platform) === provider) &&
            !r?.success &&
            r?.retrySafe === false
        );
        if (prevUnsafeFail) {
          publicationResults.push({
            ...prevUnsafeFail,
            externalState: prevUnsafeFail.externalState || 'confirmed_failed',
            retrySafe: false
          });
          continue;
        }

        const text = [content.headline, content.body, content.cta, ...(content.hashtags || [])].filter(Boolean).join('\n\n');
        const result = await publishText({ userId: post.userId, companyId: post.companyId, provider, text });

        if (result.externalState === 'confirmed_success' && result.externalId) {
          publicationResults.push({
            platform,
            provider,
            success: true,
            externalId: result.externalId,
            externalState: 'confirmed_success',
            retrySafe: false
          });
        } else if (result.externalState === 'unknown') {
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalId: null,
            externalState: 'unknown',
            retrySafe: false,
            error: result.error || 'Resultado incerto da API externa.'
          });
        } else {
          // confirmed_failed
          publicationResults.push({
            platform,
            provider,
            success: false,
            externalId: null,
            externalState: 'confirmed_failed',
            retrySafe: result.retrySafe,
            error: result.error || 'Falha de publicação.'
          });
        }
      }

      const hasUnknown = publicationResults.some((item) => item.externalState === 'unknown');
      const allConfirmedSuccess =
        publicationResults.length > 0 &&
        publicationResults.every((item) => item.success && item.externalId && item.externalState === 'confirmed_success');

      let finalStatus: 'published' | 'requires_review' | 'failed' = 'failed';
      if (allConfirmedSuccess) {
        finalStatus = 'published';
      } else if (hasUnknown) {
        finalStatus = 'requires_review';
      } else {
        finalStatus = 'failed';
      }

      const successful = publicationResults.filter((item) => item.success && item.externalId);
      const lastExternalId = successful.map((s: any) => s.externalId).filter(Boolean).pop() || null;
      let errorMessage: string | null = null;

      if (finalStatus === 'published') {
        errorMessage = null;
      } else if (finalStatus === 'requires_review') {
        errorMessage = 'Verificação manual necessária: houve timeout ou resposta indefinida da rede social e o post pode ter sido publicado externamente.';
      } else {
        errorMessage = publicationResults
          .filter((item) => !item.success)
          .map((item) => item.error)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 1000) || 'Falha na publicação social.';
      }

      await doc.ref.update({
        status: finalStatus,
        publishedAt: finalStatus === 'published' ? (post.publishedAt || nowIso()) : null,
        lastExternalId,
        publicationResults,
        errorMessage,
        processedAt: nowIso(),
        updatedAt: nowIso()
      });

      if (finalStatus === 'published') {
        await contentSnap.ref.update({ status: 'published', updatedAt: nowIso() });
      }

      await createNotification({
        userId: post.userId,
        title: finalStatus === 'published' ? 'Publicação concluída' : finalStatus === 'requires_review' ? 'Publicação requer verificação' : 'Publicação não concluída',
        message:
          finalStatus === 'published'
            ? `"${content.title || content.headline}" foi publicado nas redes com sucesso.`
            : finalStatus === 'requires_review'
            ? `A publicação de "${content.title || content.headline}" teve resposta indefinida da rede e requer conferência manual para evitar duplicidade.`
            : `A publicação de "${content.title || content.headline}" falhou. Consulte o calendário para detalhes.`,
        type: finalStatus === 'published' ? 'publication_success' : 'publication_failed'
      });
      processed += 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await doc.ref.update({ status: 'failed', errorMessage: errorMsg, processedAt: nowIso(), updatedAt: nowIso() });
      processed += 1;
    }
  }
  return processed;
}

export async function processAutopilot(): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.autopilotConfigs).where('enabled', '==', true).limit(25).get();
  let processed = 0;
  const now = new Date();

  for (const doc of snap.docs) {
    const ap = { id: doc.id, ...doc.data() } as any;
    if (!isAutopilotDue(ap, now)) continue;


    const tz = ap.timezone || 'America/Sao_Paulo';
    const { hour, dateStr } = getLocalDateAndHour(now, tz);
    const currentSlot = `${dateStr}_h${hour}`;


    const company = schedulerProjectContext(ap.userId, ap.companyId);
    if (!company) continue;

    // Pre-flight check para modo automático: verificar se TODOS os canais suportam publicação direta e possuem conexão ativa e válida
    if (ap.mode === 'automatic') {
      const targetPlatforms = Array.isArray(ap.targetPlatforms) && ap.targetPlatforms.length > 0
        ? ap.targetPlatforms
        : ['facebook'];

      // 1. Todos os canais devem normalizar e suportar publicação automática textual direta (facebook, linkedin, x)
      let allTargetsSupported = true;
      const normalizedTargets: SocialProvider[] = [];
      for (const plat of targetPlatforms) {
        const norm = normalizeProvider(plat);
        if (!norm || !isTextAutoPublishSupported(norm)) {
          allTargetsSupported = false;
          break;
        }
        normalizedTargets.push(norm);
      }

      if (!allTargetsSupported || normalizedTargets.length === 0) {
        console.warn(`[Portal Vip Automação] Canais incompatíveis com o modo automático em ${doc.id}. Apenas Facebook, LinkedIn e X são suportados.`);
        continue;
      }

      // 2. Buscar conexões da empresa e validar se CADA UM dos alvos possui conexão própria ativa com token válido
      const connsSnap = await db.collection(COLLECTIONS.socialConnections)
        .where('userId', '==', ap.userId)
        .where('companyId', '==', ap.companyId)
        .get();

      const connMap = new Map<string, any>();
      for (const d of connsSnap.docs) {
        const c = d.data() as any;
        connMap.set(c.provider, c);
      }

      let allConnectionsValid = true;
      for (const target of normalizedTargets) {
        const conn = connMap.get(target);
        const isExpired = conn?.expiresAt ? new Date(conn.expiresAt).getTime() <= Date.now() : false;
        if (!conn || conn.status !== 'connected' || (!conn.encryptedAccessToken && !conn.accessToken) || isExpired) {
          allConnectionsValid = false;
          break;
        }
      }

      if (!allConnectionsValid) {
        console.warn(`[Portal Vip Automação] Nem todos os canais selecionados possuem conexão ativa e válida para ${doc.id}`);
        continue;
      }
    }

    try {
      const generated = await generateAutopilotPost({ userId: ap.userId, company, topic: `Conteúdo estratégico atual para ${company.name}`, platform: ap.targetPlatforms?.[0] || 'Instagram', goal: ap.primaryGoal || 'Atrair clientes e gerar autoridade' });
      const contentId = newId('content');
      const content = {
        id: contentId,
        userId: ap.userId,
        companyId: ap.companyId,
        type: 'post',
        title: `[Autopilot] ${generated.result.headline}`,
        headline: generated.result.headline,
        body: generated.result.body,
        cta: generated.result.cta,
        hashtags: generated.result.hashtags || [],
        keywords: generated.result.keywords || [],
        visualPrompt: generated.result.visualPrompt || '',
        targetPlatform: ap.targetPlatforms?.[0] || 'Instagram',
        creditsUsed: generated.creditsUsed,
        status: ap.mode === 'automatic' ? 'scheduled' : 'saved',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);
      if (ap.mode === 'automatic') {
        const scheduleId = newId('sched');
        const scheduledFor = nowIso();
        await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
          id: scheduleId,
          userId: ap.userId,
          companyId: ap.companyId,
          contentItemId: contentId,
          platforms: ap.targetPlatforms || [],
          scheduledFor,
          status: 'scheduled',
          autopilotGenerated: true,
          createdAt: nowIso()
        });
      }
      await doc.ref.set({
        lastRunAt: nowIso(),
        lastRunSlot: currentSlot,
        updatedAt: nowIso()
      }, { merge: true });
      await createNotification({ userId: ap.userId, title: 'Automação do Portal Vip Brasil criou novo conteúdo', message: `Novo conteúdo criado para ${company.name}${ap.mode === 'automatic' ? ' e agendado para publicação.' : ' e salvo para sua aprovação.'}`, type: 'autopilot_ready' });
      processed += 1;
    } catch (error) {
      console.warn('[Portal Vip Automação]', error instanceof Error ? error.message : String(error));
    }
  }
  return processed;
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
  mode?: string;
  creditsUsed: number;
  message: string;
}> {
  const db = firestore();
  const company = schedulerProjectContext(userId, companyId);
  if (!company) {
    const error: any = new Error('Projeto oficial não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  // Obter ou criar configuração de Autopilot para o projeto usando ID padronizado ${userId}_${companyId}
  const canonicalId = `${userId}_${companyId}`;
  let apConfigSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).get();
  if (!apConfigSnap.exists) {
    // Tenta carregar fallback legado por companyId se existir
    const legacySnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(companyId).get();
    if (legacySnap.exists && legacySnap.data()?.userId === userId) {
      apConfigSnap = legacySnap;
    }
  }

  const ap = apConfigSnap.exists ? ({ id: apConfigSnap.id, ...apConfigSnap.data() } as any) : {
    id: canonicalId,
    userId,
    companyId,
    enabled: true,
    mode: 'manual_approval',
    frequency: 'daily',
    timezone: 'America/Sao_Paulo',
    preferredDays: [1, 2, 3, 4, 5],
    preferredHours: [10, 15, 19],
    targetPlatforms: ['Instagram'],
    primaryGoal: 'Atrair clientes e gerar autoridade'
  };


  // Pre-flight check para modo automático: verificar se TODOS os canais suportam publicação direta e possuem conexão ativa e válida
  if (ap.mode === 'automatic') {
    const targetPlatforms = Array.isArray(ap.targetPlatforms) && ap.targetPlatforms.length > 0
      ? ap.targetPlatforms
      : ['facebook'];

    const normalizedTargets: SocialProvider[] = [];
    for (const plat of targetPlatforms) {
      const norm = normalizeProvider(plat);
      if (!norm || !isTextAutoPublishSupported(norm)) {
        throw new Error(`A rede social "${plat}" selecionada não suporta publicação automática direta no modo automático (suportadas apenas Facebook, LinkedIn e X).`);
      }
      normalizedTargets.push(norm);
    }

    if (normalizedTargets.length === 0) {
      throw new Error('Para utilizar o modo automático do Autopilot, selecione ao menos uma rede social que suporte publicação direta (Facebook, LinkedIn ou X).');
    }

    const connsSnap = await db.collection(COLLECTIONS.socialConnections)
      .where('userId', '==', userId)
      .where('companyId', '==', companyId)
      .get();

    const connMap = new Map<string, any>();
    for (const d of connsSnap.docs) {
      const c = d.data() as any;
      connMap.set(c.provider, c);
    }

    for (const target of normalizedTargets) {
      const conn = connMap.get(target);
      const isExpired = conn?.expiresAt ? new Date(conn.expiresAt).getTime() <= Date.now() : false;
      if (!conn || conn.status !== 'connected' || (!conn.encryptedAccessToken && !conn.accessToken) || isExpired) {
        throw new Error(`A rede social "${target}" selecionada para o Autopilot automático não possui conexão ativa e válida neste projeto.`);
      }
    }
  }


  const generated = await generateAutopilotPost({
    userId,
    company,
    topic: `Conteúdo estratégico prioritário para ${company.name}`,
    platform: ap.targetPlatforms?.[0] || 'Instagram',
    goal: ap.primaryGoal || 'Atrair clientes e gerar autoridade'
  });

  const contentId = newId('content');
  const content = {
    id: contentId,
    userId,
    companyId,
    type: 'post',
    title: `[Autopilot] ${generated.result.headline}`,
    headline: generated.result.headline,
    body: generated.result.body,
    cta: generated.result.cta,
    hashtags: generated.result.hashtags || [],
    keywords: generated.result.keywords || [],
    visualPrompt: generated.result.visualPrompt || '',
    targetPlatform: ap.targetPlatforms?.[0] || 'Instagram',
    creditsUsed: generated.creditsUsed,
    status: ap.mode === 'automatic' ? 'scheduled' : 'saved',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);

  let scheduleId: string | undefined;
  if (ap.mode === 'automatic') {
    scheduleId = newId('sched');
    const scheduledFor = nowIso();
    await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
      id: scheduleId,
      userId,
      companyId,
      contentItemId: contentId,
      platforms: ap.targetPlatforms || ['Instagram'],
      scheduledFor,
      status: 'scheduled',
      autopilotGenerated: true,
      createdAt: nowIso()
    });
  }

  const tz = ap.timezone || 'America/Sao_Paulo';
  const { hour, dateStr } = getLocalDateAndHour(new Date(), tz);
  const currentSlot = `${dateStr}_h${hour}`;

  await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).set({
    ...ap,
    id: canonicalId,
    userId,
    companyId,
    lastRunAt: nowIso(),
    lastRunSlot: currentSlot,
    lastGeneratedContentId: contentId,
    lastError: null,
    updatedAt: nowIso()
  }, { merge: true });

  await createNotification({
    userId,
    title: 'Automação do Portal Vip Brasil executada',
    message: `Conteúdo gerado com sucesso para ${company.name}${ap.mode === 'automatic' ? ' e agendado.' : ' e pronto para revisão.'}`,
    type: 'autopilot_ready'
  });

  return {
    success: true,
    contentId,
    scheduleId,
    mode: ap.mode || 'review',
    creditsUsed: generated.creditsUsed,
    message: ap.mode === 'automatic' ? 'Conteúdo gerado e agendado automaticamente.' : 'Conteúdo gerado com sucesso e salvo para aprovação.'
  };
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

    // Step 5.2: Process Daily Portal Vip Blog Engine (1 Artigo por dia para cada projeto ativo)
    let portalBlogCount = 0;
    try {
      const blogCycleRes = await runDailyBlogCycle();
      portalBlogCount = blogCycleRes.publishedCount + blogCycleRes.pendingCount;
    } catch (err: any) {
      errors.portalBlog = err?.message || String(err);
      console.error('[Scheduler] Erro em runDailyBlogCycle:', err);
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
  } catch (error) {
    finalStatus = 'failed';
    throw error;
  } finally {
    await releaseLock(lease, finalStatus, Object.keys(errors).length);
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
    return {
      skipped: false,
      recoveredPublishing: 0,
      scheduledPosts: 0,
      error: err instanceof Error ? err.message : String(err),
      processedAt: nowIso()
    };
  } finally {
    await releaseLock(lease, socialStatus, socialStatus === 'ok' ? 0 : 1);
  }
}
