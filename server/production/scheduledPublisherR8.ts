import { getPortalProjectFromDb } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, nowIso } from './store.js';
import { isManualPublishChannel, isRemovedSocialProvider, normalizeProvider, type SocialProvider } from './social.js';

/** Redes que o publicador automático atende (sem X/Pinterest retirados e sem o Kwai, que é manual). */
function automaticPlatforms(values: unknown): string[] {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || ''))
    .filter((value) => value && !isRemovedSocialProvider(value) && !isManualPublishChannel(value));
}
import { publishScheduledContent } from './socialMediaPublisher.js';


/**
 * Limite diário por rede. Todos os projetos usam a MESMA conta em cada rede, então 10+ projetos
 * postando no mesmo dia faziam o LinkedIn bloquear por limite de compartilhamento e o TikTok
 * marcar risco de spam. Acima do limite (ou quando a rede responde "limite/spam"), a rede é
 * adiada para o dia seguinte em horário espalhado; as redes já confirmadas nunca são reenviadas.
 */
export const DAILY_PROVIDER_CAPS: Partial<Record<SocialProvider, number>> = {
  linkedin: Number(process.env.SOCIAL_DAILY_CAP_LINKEDIN || 4),
  tiktok: Number(process.env.SOCIAL_DAILY_CAP_TIKTOK || 3),
  youtube: Number(process.env.SOCIAL_DAILY_CAP_YOUTUBE || 5)
};
const MAX_PROVIDER_DEFERRALS = 1;
const PROVIDER_LIMIT_PATTERN = /rate.?limit|too many|throttl|quota|exceed|limite|spam|429|daily.{0,20}limit|share.{0,20}limit|upload.{0,20}limit|uploadlimit/i;

export function isProviderLimitResult(result: any): boolean {
  if (!result || result.success) return false;
  if (result.externalState === 'unknown') return false;
  if (Number(result.statusCode) === 429) return true;
  const message = String(result.error || '');
  // Limite de TAMANHO/FORMATO de arquivo não é limite de frequência: adiar não resolveria.
  if (/\b\d+\s?(?:mb|gb|kb)\b|tamanho|file size|formato|format|dura[cç][aã]o|duration|resolu/i.test(message)) return false;
  return PROVIDER_LIMIT_PATTERN.test(message);
}

/** Data AAAA-MM-DD no horário de Brasília (sem horário de verão desde 2019). */
export function brDateKey(ms = Date.now()): string {
  return new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);
}

/** Próximo dia, entre 11h e 17h59 de Brasília, espalhado pelo id do post para não congestionar a rede. */
export function nextDaySpreadSlot(postId: string, nowMs = Date.now()): string {
  const tomorrow = brDateKey(nowMs + 86_400_000);
  let hash = 0;
  for (const ch of String(postId || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const minutes = 11 * 60 + (hash % (7 * 60));
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return new Date(`${tomorrow}T${hh}:${mm}:00-03:00`).toISOString();
}

async function providerDailyCount(db: any, provider: SocialProvider): Promise<number> {
  try {
    const snap = await db.collection(COLLECTIONS.systemSettings).doc(`social_daily_usage_${brDateKey()}`).get();
    return snap.exists ? Number((snap.data() as any)?.[provider] || 0) : 0;
  } catch {
    return 0;
  }
}

async function incrementProviderDaily(db: any, provider: SocialProvider): Promise<void> {
  const ref = db.collection(COLLECTIONS.systemSettings).doc(`social_daily_usage_${brDateKey()}`);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number((snap.data() as any)?.[provider] || 0) : 0;
    tx.set(ref, { [provider]: current + 1, updatedAt: nowIso() }, { merge: true });
  }).catch(() => undefined);
}

function isConfirmedPublishedResult(result: any): boolean {
  return Boolean(
    result?.success &&
    result?.externalId &&
    (result?.externalState === 'confirmed_success' || !result?.externalState) &&
    result?.requiresUserAction !== true &&
    result?.deliveryMode !== 'draft'
  );
}

function sameProvider(result: any, platform: string, provider?: SocialProvider | null): boolean {
  if (result?.platform === platform) return true;
  const resultProvider = normalizeProvider(String(result?.provider || result?.platform || ''));
  return Boolean(provider && resultProvider === provider);
}

export async function recoverStalePublishingPostsR8(
  staleThresholdMinutes = 15,
  signal?: AbortSignal
): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts)
    .where('status', '==', 'publishing')
    .limit(50)
    .get();

  let recovered = 0;
  const cutoffMs = Date.now() - staleThresholdMinutes * 60 * 1000;

  for (const doc of snap.docs) {
    if (signal?.aborted) break;
    const post = doc.data() as any;
    const timeIso = post.processingAt || post.publishedAt || post.updatedAt || post.createdAt;
    const processingTime = timeIso ? new Date(timeIso).getTime() : 0;
    if (Number.isFinite(processingTime) && processingTime >= cutoffMs) continue;

    const publicationResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
    const requestedPlatforms = automaticPlatforms(post.platforms);
    const hasUnknown = publicationResults.some((r: any) => r?.externalState === 'unknown');
    const hasUserAction = publicationResults.some((r: any) => r?.requiresUserAction === true || r?.deliveryMode === 'draft');

    const allRequestedHaveResult = requestedPlatforms.length > 0 && requestedPlatforms.every((platform: string) => {
      const provider = normalizeProvider(platform);
      return publicationResults.some((result: any) => sameProvider(result, platform, provider));
    });

    const allConfirmedPublished = requestedPlatforms.length > 0 && requestedPlatforms.every((platform: string) => {
      const provider = normalizeProvider(platform);
      return publicationResults.some((result: any) => sameProvider(result, platform, provider) && isConfirmedPublishedResult(result));
    });

    if (allConfirmedPublished) {
      const firstSuccess = publicationResults.find(isConfirmedPublishedResult);
      await doc.ref.update({
        status: 'published',
        publishedAt: post.publishedAt || nowIso(),
        lastExternalId: post.lastExternalId || firstSuccess?.externalId || null,
        errorMessage: null,
        recoveredAt: nowIso(),
        updatedAt: nowIso()
      });

      if (post.contentItemId) {
        const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
        if (contentSnap.exists) {
          const contentData = contentSnap.data() as any;
          if (contentData?.userId === post.userId && contentData?.companyId === post.companyId) {
            await contentSnap.ref.update({ status: 'published', updatedAt: nowIso() });
          }
        }
      }
    } else if (hasUnknown || hasUserAction || !allRequestedHaveResult) {
      const message = hasUserAction
        ? 'A publicação foi entregue como rascunho a uma rede que exige ação do usuário para concluir. Verifique o aplicativo da rede social.'
        : 'Verificação manual necessária — o processamento foi interrompido e a rede social pode ter recebido a publicação.';
      await doc.ref.update({
        status: 'requires_review',
        errorMessage: message,
        recoveredAt: nowIso(),
        updatedAt: nowIso()
      });
    } else {
      const failedErrors = publicationResults
        .filter((r: any) => !r?.success)
        .map((r: any) => r?.error)
        .filter(Boolean)
        .join(' | ')
        .slice(0, 1000) || 'Falha na publicação após recuperação.';
      await doc.ref.update({
        status: 'failed',
        errorMessage: failedErrors,
        recoveredAt: nowIso(),
        updatedAt: nowIso()
      });
    }
    recovered += 1;
  }

  return recovered;
}

async function isLeaseStillValid(db: any, lease?: { owner: string; fencingToken: number }): Promise<boolean> {
  if (!lease || !lease.owner || !lease.fencingToken) return true;
  try {
    const lockSnap = await db.collection(COLLECTIONS.schedulerLocks).doc('process').get();
    if (!lockSnap.exists) return false;
    const data = lockSnap.data() as any;
    return (
      data?.owner === lease.owner &&
      Number(data?.fencingToken) === lease.fencingToken &&
      Number(data?.lockedUntil) > Date.now()
    );
  } catch {
    return false;
  }
}

export async function processScheduledPostsR8(options?: {
  signal?: AbortSignal;
  lease?: { owner: string; fencingToken: number };
  deadlineAt?: number;
  onClaimed?: () => void;
  onFinalized?: (status: 'published' | 'requires_review' | 'failed' | 'deferred') => void;
}): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.scheduledPosts)
    .where('status', '==', 'scheduled')
    .where('scheduledFor', '<=', nowIso())
    .limit(25)
    .get();

  let processed = 0;
  const deadlineReached = () => Boolean(
    options?.signal?.aborted ||
    (options?.deadlineAt && Date.now() >= options.deadlineAt)
  );

  for (const doc of snap.docs) {
    if (deadlineReached()) break;
    if (options?.lease && !(await isLeaseStillValid(db, options.lease))) {
      console.warn('[Scheduler] Lease expirou ou foi substituído; cancelando publicações remanescentes.');
      break;
    }

    const post = { id: doc.id, ...doc.data() } as any;
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || fresh.data()?.status !== 'scheduled') return false;
      tx.update(doc.ref, { status: 'publishing', processingAt: nowIso(), updatedAt: nowIso() });
      return true;
    });
    if (!claimed) continue;
    options?.onClaimed?.();
    let verifiedContentRef: any = null;

    try {
      if (deadlineReached()) {
        await doc.ref.update({ status: 'scheduled', processingAt: null, updatedAt: nowIso() });
        options?.onFinalized?.('deferred');
        break;
      }
      const userSnap = await db.collection(COLLECTIONS.users).doc(post.userId).get();
      if (!userSnap.exists) throw new Error('Inconsistência de segurança: Usuário associado ao agendamento não encontrado.');

      const projectId = String(post.projectId || post.companyId || '');
      const scheduledProject = await getPortalProjectFromDb(projectId);
      if (!scheduledProject || scheduledProject.active === false) {
        throw new Error('Inconsistência de segurança: projeto do agendamento não reconhecido ou pausado.');
      }

      const contentSnap = await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).get();
      if (!contentSnap.exists) throw new Error('Inconsistência de segurança: Conteúdo associado não encontrado.');
      const content = { id: contentSnap.id, ...contentSnap.data() } as any;
      if (content.userId !== post.userId || content.companyId !== post.companyId) {
        throw new Error('Violação de isolamento multi-tenant: Conteúdo não pertence ao usuário ou empresa do agendamento.');
      }
      verifiedContentRef = contentSnap.ref;

      const platforms = automaticPlatforms(post.platforms);
      if (!platforms.length) {
        throw new Error(Array.isArray(post.platforms) && post.platforms.length
          ? 'As redes deste agendamento foram retiradas do Portal (X/Pinterest) ou são de postagem manual (Kwai).'
          : 'Nenhuma rede social selecionada para publicação.');
      }

      const existingResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
      const publicationResults: any[] = [];
      const deferredProviders: Array<{ platform: string; reason: string }> = [];
      const deferCount = Number(post.providerDeferCount || 0);

      for (const platform of platforms) {
        if (deadlineReached()) break;
        const provider = normalizeProvider(String(platform));
        if (!provider) {
          publicationResults.push({
            platform,
            provider: null,
            success: false,
            externalId: null,
            externalState: 'confirmed_failed',
            retrySafe: false,
            error: `Rede social "${platform}" não reconhecida.`
          });
          continue;
        }

        const previousTerminal = existingResults.find((result: any) => {
          if (!sameProvider(result, platform, provider)) return false;
          if (isConfirmedPublishedResult(result)) return true;
          if (result?.requiresUserAction === true || result?.deliveryMode === 'draft') return true;
          return !result?.success && result?.retrySafe === false;
        });
        if (previousTerminal) {
          publicationResults.push(previousTerminal);
          continue;
        }

        if (deadlineReached()) break;
        if (options?.lease && !(await isLeaseStillValid(db, options.lease))) {
          console.warn('[Scheduler] Lease expirou antes do envio à rede social; cancelando.');
          break;
        }

        const cap = DAILY_PROVIDER_CAPS[provider];
        if (cap && cap > 0 && (await providerDailyCount(db, provider)) >= cap) {
          if (deferCount < MAX_PROVIDER_DEFERRALS) {
            deferredProviders.push({ platform, reason: `limite diário do Portal para ${platform} (${cap}/dia) atingido` });
          } else {
            // Já foi adiado uma vez: não insiste (evita bloqueio da conta e post velho saindo dias depois).
            publicationResults.push({
              platform,
              provider,
              success: false,
              externalId: null,
              externalState: 'confirmed_failed',
              retrySafe: false,
              error: `Não publicado em ${platform}: limite diário de ${cap} publicações por conta atingido (protege a conta contra bloqueio por excesso).`
            });
          }
          continue;
        }

        const result = await publishScheduledContent({
          userId: post.userId,
          companyId: post.companyId,
          provider,
          content,
          providerOptions: post.providerOptions || {},
          link: /^https?:\/\//i.test(String(content.cta || ''))
            ? String(content.cta)
            : String(scheduledProject.websiteUrl || '') || undefined
        });

        if (isProviderLimitResult(result) && deferCount < MAX_PROVIDER_DEFERRALS) {
          deferredProviders.push({ platform, reason: `${platform} recusou por limite da rede: ${String(result.error || '').slice(0, 160)}` });
          continue;
        }
        if (result.success && result.externalId) await incrementProviderDaily(db, provider);

        publicationResults.push({
          platform,
          provider,
          success: result.success,
          externalId: result.externalId,
          externalState: result.externalState,
          retrySafe: result.retrySafe,
          ...(result.error ? { error: result.error } : {}),
          ...(result.statusCode ? { statusCode: result.statusCode } : {}),
          ...(result.requiresUserAction ? { requiresUserAction: true } : {}),
          ...(result.deliveryMode ? { deliveryMode: result.deliveryMode } : {})
        });

        // Persiste cada resposta confirmada antes de avançar para a próxima rede.
        // Assim, um timeout posterior não apaga a evidência nem permite republicação duplicada.
        await doc.ref.update({
          publicationResults,
          processingHeartbeatAt: nowIso(),
          updatedAt: nowIso()
        });
      }

      // Redes adiadas por limite: o agendamento volta para a fila amanhã, só com as redes pendentes
      // (as confirmadas ficam gravadas em publicationResults e não são reenviadas).
      const hasUnknownNow = publicationResults.some((item) => item.externalState === 'unknown');
      if (deferredProviders.length && !hasUnknownNow && !deadlineReached()) {
        const nextSlot = nextDaySpreadSlot(post.id);
        await doc.ref.update({
          status: 'scheduled',
          scheduledFor: nextSlot,
          publicationResults,
          processingAt: null,
          providerDeferCount: deferCount + 1,
          errorMessage: `Adiado para amanhã: ${deferredProviders.map((item) => item.reason).join(' | ')}`.slice(0, 1000),
          updatedAt: nowIso()
        });
        options?.onFinalized?.('deferred');
        continue;
      }

      const allRequestedHaveResult = platforms.every((platform: string) => {
        const provider = normalizeProvider(String(platform));
        return publicationResults.some((result: any) => sameProvider(result, platform, provider));
      });

      if (deadlineReached() && !allRequestedHaveResult) {
        const requiresReview = publicationResults.some((item) =>
          item.externalState === 'unknown' || item.requiresUserAction === true || item.deliveryMode === 'draft'
        );
        const deferredStatus = requiresReview ? 'requires_review' : 'scheduled';
        await doc.ref.update({
          status: deferredStatus,
          publicationResults,
          processingAt: null,
          errorMessage: requiresReview
            ? 'A execução terminou após uma resposta indefinida; confira a rede antes de tentar novamente.'
            : 'Publicação adiada com segurança para o próximo ciclo; redes já confirmadas não serão reenviadas.',
          updatedAt: nowIso()
        });
        if (post.contentItemId && requiresReview) {
          await db.collection(COLLECTIONS.contentItems).doc(post.contentItemId).set({
            status: 'requires_review',
            updatedAt: nowIso()
          }, { merge: true });
        }
        options?.onFinalized?.(requiresReview ? 'requires_review' : 'deferred');
        console.warn('[Scheduler] Item interrompido no limite seguro e persistido sem risco de reenvio confirmado.');
        break;
      }
      if (options?.lease && !(await isLeaseStillValid(db, options.lease))) {
        console.warn('[Scheduler] Lease expirou durante publicação social; cancelando gravação de resultados.');
        break;
      }

      const hasUnknown = publicationResults.some((item) => item.externalState === 'unknown');
      const hasUserAction = publicationResults.some((item) => item.requiresUserAction === true || item.deliveryMode === 'draft');
      const allConfirmedPublished = publicationResults.length > 0 && publicationResults.every(isConfirmedPublishedResult);

      let finalStatus: 'published' | 'requires_review' | 'failed' = 'failed';
      if (allConfirmedPublished) finalStatus = 'published';
      else if (hasUnknown || hasUserAction) finalStatus = 'requires_review';

      const successful = publicationResults.filter((item) => item.success && item.externalId);
      const lastExternalId = successful.map((item: any) => item.externalId).filter(Boolean).pop() || null;
      let errorMessage: string | null = null;

      if (finalStatus === 'requires_review') {
        errorMessage = hasUserAction
          ? 'Uma ou mais redes receberam o conteúdo como rascunho e exigem confirmação no aplicativo antes da publicação final.'
          : 'Verificação manual necessária: houve timeout ou resposta indefinida da rede social e o post pode ter sido publicado externamente.';
      } else if (finalStatus === 'failed') {
        errorMessage = publicationResults
          .filter((item) => !item.success)
          .map((item) => item.error)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 1000) || 'Falha na publicação social.';
      }

      const youtubeResult = publicationResults.find((item) => item.provider === 'youtube' && item.success && item.externalId);
      const youtubeMetadata = youtubeResult ? {
        youtubeVideoId: youtubeResult.externalId,
        youtubeUrl: youtubeResult.videoUrl || `https://www.youtube.com/watch?v=${youtubeResult.externalId}`,
        youtubeStatus: post.providerOptions?.youtubePrivacyStatus || 'unlisted',
        youtubeSanitizedResponse: youtubeResult.rawResponse || {
          id: youtubeResult.externalId,
          url: youtubeResult.videoUrl || `https://www.youtube.com/watch?v=${youtubeResult.externalId}`,
          status: post.providerOptions?.youtubePrivacyStatus || 'unlisted',
          publishedAt: nowIso()
        }
      } : {};

      await doc.ref.update({
        status: finalStatus,
        publishedAt: finalStatus === 'published' ? (post.publishedAt || nowIso()) : null,
        lastExternalId,
        publicationResults,
        errorMessage,
        ...youtubeMetadata,
        processedAt: nowIso(),
        updatedAt: nowIso()
      });

      if (!options?.signal?.aborted) {
        await contentSnap.ref.update({
          status: finalStatus,
          ...youtubeMetadata,
          updatedAt: nowIso()
        });
      }

      if (!options?.signal?.aborted) {
        await createNotification({
          userId: post.userId,
          title: finalStatus === 'published' ? 'Publicação concluída' : finalStatus === 'requires_review' ? 'Publicação requer verificação' : 'Publicação não concluída',
          message: finalStatus === 'published'
            ? `"${content.title || content.headline}" foi publicado nas redes com sucesso.`
            : finalStatus === 'requires_review'
            ? hasUserAction
              ? `"${content.title || content.headline}" foi entregue como rascunho em uma rede que exige sua confirmação no aplicativo.`
              : `A publicação de "${content.title || content.headline}" teve resposta indefinida e requer conferência manual.`
            : `A publicação de "${content.title || content.headline}" falhou. Consulte o calendário para detalhes.`,
          type: finalStatus === 'published' ? 'publication_success' : 'publication_failed'
        });
      }

      processed += 1;
      options?.onFinalized?.(finalStatus);
    } catch (error) {
      if (deadlineReached()) {
        await doc.ref.update({
          status: 'scheduled',
          processingAt: null,
          errorMessage: 'Publicação adiada com segurança após o limite de execução.',
          updatedAt: nowIso()
        }).catch(() => undefined);
        options?.onFinalized?.('deferred');
        console.warn('[Scheduler] Processamento adiado cooperativamente pelo limite de execução.');
        break;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      await doc.ref.update({ status: 'failed', errorMessage: errorMsg.slice(0, 1000), processedAt: nowIso(), updatedAt: nowIso() });
      if (verifiedContentRef) {
        await verifiedContentRef.set({ status: 'failed', updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
      }
      processed += 1;
      options?.onFinalized?.('failed');
    }
  }

  return processed;
}
