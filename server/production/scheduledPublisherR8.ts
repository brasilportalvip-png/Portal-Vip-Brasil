import { getPortalProjectFromDb } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, nowIso } from './store.js';
import { normalizeProvider, type SocialProvider } from './social.js';
import { publishScheduledContent } from './socialMediaPublisher.js';

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

export async function recoverStalePublishingPostsR8(staleThresholdMinutes = 15): Promise<number> {
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
    if (Number.isFinite(processingTime) && processingTime >= cutoffMs) continue;

    const publicationResults = Array.isArray(post.publicationResults) ? post.publicationResults : [];
    const requestedPlatforms = Array.isArray(post.platforms) ? post.platforms : [];
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

export async function processScheduledPostsR8(): Promise<number> {
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
      tx.update(doc.ref, { status: 'publishing', processingAt: nowIso(), updatedAt: nowIso() });
      return true;
    });
    if (!claimed) continue;

    try {
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
        message: finalStatus === 'published'
          ? `"${content.title || content.headline}" foi publicado nas redes com sucesso.`
          : finalStatus === 'requires_review'
          ? hasUserAction
            ? `"${content.title || content.headline}" foi entregue como rascunho em uma rede que exige sua confirmação no aplicativo.`
            : `A publicação de "${content.title || content.headline}" teve resposta indefinida e requer conferência manual.`
          : `A publicação de "${content.title || content.headline}" falhou. Consulte o calendário para detalhes.`,
        type: finalStatus === 'published' ? 'publication_success' : 'publication_failed'
      });

      processed += 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await doc.ref.update({ status: 'failed', errorMessage: errorMsg.slice(0, 1000), processedAt: nowIso(), updatedAt: nowIso() });
      processed += 1;
    }
  }

  return processed;
}
