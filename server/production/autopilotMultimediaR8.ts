import { generateAutopilotPost, generateMarketingImage, startVideoGenerationJob } from './ai.js';
import { getPortalProjectFromDb, listAllPortalProjectsFromDb } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso } from './store.js';
import { normalizeProvider, type SocialProvider } from './social.js';
import { assertUniversalConnectionReady, checkUniversalConnectionReady, isUniversalAutoPublishSupported } from './socialMediaPublisher.js';

export type AutopilotJobStatus = 'pending' | 'processing' | 'video_processing' | 'completed' | 'failed';

export interface AutopilotJob {
  id: string;
  userId: string;
  companyId: string;
  projectName: string;
  slot: string;
  dateStr: string;
  hour: number;
  status: AutopilotJobStatus;
  mode: 'manual_approval' | 'automatic';
  contentId?: string | null;
  scheduleId?: string | null;
  videoJobId?: string | null;
  creditsUsed?: number;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutopilotRecord {
  id?: string;
  userId: string;
  companyId: string;
  enabled?: boolean;
  mode?: 'manual_approval' | 'automatic';
  frequency?: 'daily' | '3_times_week' | 'weekly';
  timezone?: string;
  preferredDays?: number[];
  preferredHours?: number[];
  targetPlatforms?: string[];
  primaryGoal?: string;
  lastRunAt?: string | null;
  lastRunSlot?: string | null;
  lastJobId?: string | null;
  lastJobStatus?: AutopilotJobStatus | null;
  lastGeneratedContentId?: string | null;
  lastVideoJobId?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  updatedAt?: string;
}

function projectContext(userId: string, project: any): any {
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
    portalProject: true,
    virtual: true
  };
}

export function formatImageHashDocId(companyId: string, imageHash: string): string {
  const cleanComp = String(companyId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanHash = String(imageHash || '').trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  return `${cleanComp}_${cleanHash}`.slice(0, 150);
}

export async function reserveImageHashTransaction(
  db: any,
  companyId: string,
  imageHash: string,
  contentItemId: string
): Promise<{ success: boolean; reason?: string }> {
  if (!imageHash || !companyId) return { success: false, reason: 'Identificadores inválidos para reserva de hash.' };
  const docId = formatImageHashDocId(companyId, imageHash);
  const ref = db.collection(COLLECTIONS.usedImageHashes).doc(docId);

  return await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      return {
        success: false,
        reason: 'Hash criptográfico idêntico já reservado no índice determinístico.'
      };
    }
    tx.set(ref, {
      id: docId,
      companyId,
      imageHash,
      contentItemId,
      reservedAt: nowIso(),
      createdAt: nowIso()
    });
    return { success: true };
  });
}

export function isLegacyUnsplashImage(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('images.unsplash.com') || url.includes('source.unsplash.com');
}

export async function isImageAlreadyUsed(companyId: string, imageInfo: {
  imageUrl?: string;
  storagePath?: string;
  imageHash?: string;
}): Promise<{ isDuplicate: boolean; reason?: string; matchField?: string }> {
  if (!imageInfo.imageUrl && !imageInfo.storagePath && !imageInfo.imageHash) {
    return { isDuplicate: false };
  }

  // 0. Bloqueio estrito de URLs estáticas/legadas do Unsplash
  if (imageInfo.imageUrl && isLegacyUnsplashImage(imageInfo.imageUrl)) {
    return {
      isDuplicate: true,
      reason: 'URL legada/estática do Unsplash detectada; reutilização bloqueada para proteger originalidade.',
      matchField: 'legacy_unsplash'
    };
  }

  const db = firestore();

  // 1. Verificação primária no índice determinístico O(1) por companyId + imageHash
  if (imageInfo.imageHash) {
    const hashDocId = formatImageHashDocId(companyId, imageInfo.imageHash);
    try {
      const hashSnap = await db.collection(COLLECTIONS.usedImageHashes).doc(hashDocId).get();
      if (hashSnap.exists) {
        return {
          isDuplicate: true,
          reason: 'Hash criptográfico idêntico registrado no índice determinístico.',
          matchField: 'hash'
        };
      }
    } catch {
      // Prossegue para busca indexada de segurança
    }

    // Busca indexada direta na coleção de conteúdos (limit 1, sem varredura em massa)
    try {
      const snap = await db.collection(COLLECTIONS.contentItems)
        .where('companyId', '==', companyId)
        .where('metadata.imageHash', '==', imageInfo.imageHash)
        .limit(1)
        .get();
      if (!snap.empty) {
        return {
          isDuplicate: true,
          reason: 'Hash criptográfico idêntico a imagem já utilizada.',
          matchField: 'hash'
        };
      }
    } catch {
      // continua
    }
  }

  // 2. Busca indexada por storagePath (limit 1)
  if (imageInfo.storagePath) {
    try {
      const snap = await db.collection(COLLECTIONS.contentItems)
        .where('companyId', '==', companyId)
        .where('metadata.imageStoragePath', '==', imageInfo.storagePath)
        .limit(1)
        .get();
      if (!snap.empty) {
        return {
          isDuplicate: true,
          reason: 'Caminho de armazenamento (storagePath) idêntico a imagem anterior.',
          matchField: 'storagePath'
        };
      }
    } catch {
      // continua
    }
  }

  // 3. Busca indexada por URL pública (limit 1)
  if (imageInfo.imageUrl) {
    try {
      const snap = await db.collection(COLLECTIONS.contentItems)
        .where('companyId', '==', companyId)
        .where('imageUrl', '==', imageInfo.imageUrl)
        .limit(1)
        .get();
      if (!snap.empty) {
        return {
          isDuplicate: true,
          reason: 'URL pública idêntica a publicação anterior.',
          matchField: 'imageUrl'
        };
      }
    } catch {
      // continua
    }
  }

  return { isDuplicate: false };
}

function localSlot(date: Date, timezone: string): { dayOfWeek: number; hour: number; dateStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hour12: false
    });
    const map: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) map[part.type] = part.value;
    const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      dayOfWeek: weekdays[map.weekday] ?? date.getUTCDay(),
      hour: parseInt(map.hour, 10) % 24,
      dateStr: `${map.year}-${map.month}-${map.day}`
    };
  } catch {
    return { dayOfWeek: date.getUTCDay(), hour: date.getUTCHours(), dateStr: date.toISOString().slice(0, 10) };
  }
}

export function isDue(ap: AutopilotRecord, referenceDate: Date): boolean {
  if (!ap.enabled) return false;
  const timezone = ap.timezone || 'America/Sao_Paulo';
  const current = localSlot(referenceDate, timezone);
  const configuredDays = Array.isArray(ap.preferredDays)
    ? ap.preferredDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const days = configuredDays.length
    ? configuredDays
    : (ap.frequency === 'daily' || !ap.frequency)
      ? [0, 1, 2, 3, 4, 5, 6]
      : ap.frequency === '3_times_week'
        ? [1, 3, 5]
        : [1];

  // Respeita preferredHours com fallback seguro para 10h
  const validHours = Array.isArray(ap.preferredHours) && ap.preferredHours.length > 0
    ? ap.preferredHours.filter((h) => typeof h === 'number' && h >= 0 && h <= 23)
    : [];
  const hours = validHours.length > 0 ? validHours : [10];

  if (!days.includes(current.dayOfWeek) || !hours.includes(current.hour)) return false;
  const slot = `${current.dateStr}_h${current.hour}`;
  if (ap.lastRunSlot === slot) return false;

  const lastRun = ap.lastRunAt ? new Date(ap.lastRunAt).getTime() : 0;
  if (!Number.isFinite(lastRun) || lastRun <= 0) return true;
  const elapsedDays = (referenceDate.getTime() - lastRun) / 86_400_000;
  if (ap.frequency === 'weekly') return elapsedDays >= 6;
  if (ap.frequency === '3_times_week') return elapsedDays >= 1;
  return true;
}

function normalizeTargets(values: unknown): Array<{ label: string; provider: SocialProvider }> {
  const raw = Array.isArray(values) && values.length ? values : ['Facebook'];
  const output: Array<{ label: string; provider: SocialProvider }> = [];
  const seen = new Set<SocialProvider>();
  for (const item of raw) {
    const label = String(item || '').trim();
    const provider = normalizeProvider(label);
    if (!provider || seen.has(provider)) continue;
    seen.add(provider);
    output.push({ label, provider });
  }
  return output;
}

async function assertTargetsReady(userId: string, companyId: string, targets: Array<{ label: string; provider: SocialProvider }>): Promise<void> {
  if (!targets.length) throw new Error('Selecione ao menos uma rede social para o Autopilot.');
  for (const target of targets) {
    if (!isUniversalAutoPublishSupported(target.provider)) throw new Error(`Rede social "${target.label}" não suportada.`);
    await assertUniversalConnectionReady(userId, companyId, target.provider);
  }
}

export function makeAutopilotJobId(userId: string, companyId: string, slot: string): string {
  const cleanUser = String(userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanCompany = String(companyId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanSlot = String(slot || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return `autopilot_${cleanUser}_${cleanCompany}_${cleanSlot}`;
}

async function reserveAutopilotJob(
  ap: AutopilotRecord,
  projectName: string,
  slot: string,
  slotData: { dateStr: string; hour: number },
  force = false
): Promise<{ job: AutopilotJob; shouldRun: boolean }> {
  const db = firestore();
  const jobId = force
    ? `autopilot_${ap.userId}_${ap.companyId}_${slotData.dateStr}_manual_${Date.now()}`
    : makeAutopilotJobId(ap.userId, ap.companyId, slot);

  const jobRef = db.collection(COLLECTIONS.autopilotJobs).doc(jobId);

  if (!force) {
    const existing = await jobRef.get();
    if (existing.exists) {
      const data = existing.data() as AutopilotJob;
      if (['completed', 'video_processing'].includes(data.status)) {
        return { job: data, shouldRun: false };
      }
      if (data.status === 'processing' && data.startedAt) {
        const elapsed = Date.now() - new Date(data.startedAt).getTime();
        if (elapsed < 240_000) {
          return { job: data, shouldRun: false };
        }
      }
    }
  }

  const job: AutopilotJob = {
    id: jobId,
    userId: ap.userId,
    companyId: ap.companyId,
    projectName: projectName || ap.companyId,
    slot,
    dateStr: slotData.dateStr,
    hour: slotData.hour,
    status: 'pending',
    mode: ap.mode === 'automatic' ? 'automatic' : 'manual_approval',
    contentId: null,
    scheduleId: null,
    videoJobId: null,
    creditsUsed: 0,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await jobRef.set(job, { merge: true });
  return { job, shouldRun: true };
}

export async function executeAutopilotJob(
  job: AutopilotJob,
  ap: AutopilotRecord,
  options?: { signal?: AbortSignal; lease?: any }
): Promise<AutopilotJob> {
  const db = firestore();
  const jobRef = db.collection(COLLECTIONS.autopilotJobs).doc(job.id);

  if (options?.signal?.aborted) {
    throw new Error('[Abort] Execução do Autopilot cancelada antes de iniciar.');
  }

  job.status = 'processing';
  job.startedAt = nowIso();
  job.updatedAt = nowIso();
  await jobRef.set(job, { merge: true });

  try {
    const project = await getPortalProjectFromDb(ap.companyId);
    if (!project || project.active === false) {
      throw new Error(`Projeto ${ap.companyId} não encontrado ou está inativo no cadastro.`);
    }

    const company = projectContext(ap.userId, project);
    const mode = ap.mode === 'automatic' ? 'automatic' : 'manual_approval';
    const rawTargets = normalizeTargets(ap.targetPlatforms);
    const targets = rawTargets.length > 0 ? rawTargets : [{ label: 'Instagram', provider: 'instagram' as SocialProvider }];

    // Verificação resiliente de conexões prontas para publicação automática
    const readyTargets: typeof targets = [];
    const pendingTargets: typeof targets = [];

    if (mode === 'automatic') {
      for (const t of targets) {
        const isReady = await checkUniversalConnectionReady(ap.userId, ap.companyId, t.provider);
        if (isReady) {
          readyTargets.push(t);
        } else {
          pendingTargets.push(t);
        }
      }
    }

    // Se o modo for automático mas nenhuma rede estiver conectada com OAuth ainda:
    // Não falha o Autopilot! A IA gera o post, a arte visual e o vídeo e salva com segurança em Aprovação Manual!
    const effectiveMode = (mode === 'automatic' && readyTargets.length > 0) ? 'automatic' : 'manual_approval';
    const activeScheduledTargets = effectiveMode === 'automatic' ? readyTargets : [];

    // 1. Gera texto estratégico do post
    const generated = await generateAutopilotPost({
      userId: ap.userId,
      company,
      topic: `Conteúdo estratégico atual para ${company.name}`,
      platform: targets.map((item) => item.label).join(', '),
      goal: ap.primaryGoal || 'Atrair clientes e gerar autoridade'
    });

    // O MP4 vertical é reaproveitado nas redes adequadas para vídeo curto.
    // LinkedIn e X permanecem no criativo editorial próprio para evitar
    // cross-post indiscriminado e custos/limites adicionais de upload.
    const videoProviders = new Set<SocialProvider>(['youtube', 'tiktok', 'facebook', 'instagram', 'pinterest']);
    const videoTargets = targets.filter((target) => videoProviders.has(target.provider));
    const youtubeSelected = videoTargets.some((target) => target.provider === 'youtube');
    const pinterestVideoSelected = videoTargets.some((target) => target.provider === 'pinterest');
    const imageTargets = targets.filter((target) => !videoProviders.has(target.provider));
    let contentId: string | undefined;
    let scheduleId: string | undefined;
    let videoJobId: string | undefined;
    let videoCoverImageUrl: string | undefined;
    let imageCredits = 0;

    // 2. Imagem gerada se houver canais de imagem ou para revisão
    if (imageTargets.length > 0 || pinterestVideoSelected || mode !== 'automatic') {
      const visualTheme = String(generated.result.visualPrompt || generated.result.headline || generated.result.body || `Criativo para ${company.name}`);
      const executionId = newId('exec');
      const dateIso = nowIso().slice(0, 10);
      let image: any = null;
      let imageGenerationFailed = false;
      let imageErrorMessage = '';

      try {
        image = await generateMarketingImage({
          userId: ap.userId,
          company,
          title: generated.result.headline,
          theme: visualTheme,
          dateIso,
          executionId,
          style: 'Fotografia comercial premium, realista e moderna para redes sociais',
          aspectRatio: '1:1',
          resolution: '1K'
        });
      } catch (imgErr: any) {
        imageGenerationFailed = true;
        imageErrorMessage = imgErr?.message || String(imgErr);
        console.warn(`[Autopilot Multimídia] Falha ao gerar arte de IA para ${company.name}: ${imageErrorMessage}. Post será preservado para revisão sem agendamento automático.`);
      }

      imageCredits = Number(image?.creditsUsed || 0);
      contentId = newId('content');

      const readyImageTargets = imageTargets.filter((target) => readyTargets.some((rt) => rt.provider === target.provider));

      // Detectar repetição por URL, storage path e hash via índice determinístico
      let duplicateCheck: { isDuplicate: boolean; reason?: string; matchField?: string } = { isDuplicate: false };
      if (image && !imageGenerationFailed) {
        videoCoverImageUrl = String(image.imageUrl || '').trim() || undefined;
        duplicateCheck = await isImageAlreadyUsed(ap.companyId, {
          imageUrl: image.imageUrl,
          storagePath: image.storagePath,
          imageHash: image.imageHash
        });
      }

      let isImageReused = duplicateCheck.isDuplicate;

      // Reserva atômica no índice determinístico para blindar concorrência antes de agendar
      if (!isImageReused && image?.imageHash && !imageGenerationFailed) {
        const reserveRes = await reserveImageHashTransaction(db, ap.companyId, image.imageHash, contentId);
        if (!reserveRes.success) {
          isImageReused = true;
          duplicateCheck = {
            isDuplicate: true,
            reason: reserveRes.reason || 'Concorrência detectada: hash já reservado simultaneamente.',
            matchField: 'hash'
          };
        }
      }

      if (options?.signal?.aborted) {
        throw new Error('[Abort] Execução do Autopilot cancelada antes de persistir conteúdo.');
      }

      // Impedir publicação automática com imagem já utilizada ou quando não houver imagem nova
      const shouldAutoSchedule = Boolean(
        effectiveMode === 'automatic' &&
        readyImageTargets.length > 0 &&
        !imageGenerationFailed &&
        !isImageReused &&
        image?.imageUrl
      );

      const content = {
        id: contentId,
        userId: ap.userId,
        companyId: ap.companyId,
        type: 'post',
        title: `[Autopilot Multimídia] ${generated.result.headline}`,
        headline: generated.result.headline,
        body: generated.result.body,
        cta: generated.result.cta,
        hashtags: generated.result.hashtags || [],
        keywords: generated.result.keywords || [],
        visualPrompt: generated.result.visualPrompt || '',
        imageUrl: image?.imageUrl || '',
        targetPlatform: targets.map((item) => item.label).join(', '),
        creditsUsed: Number(generated.creditsUsed || 0) + imageCredits,
        status: shouldAutoSchedule ? 'scheduled' : 'saved',
        metadata: {
          generatedBy: 'autopilot_multimedia_r8',
          jobId: job.id,
          imageStoragePath: image?.storagePath || null,
          imageModelUsed: image?.modelUsed || null,
          imageResolution: image?.resolution || null,
          imageHash: image?.imageHash || null,
          imageGenerationFailed,
          imageErrorMessage: imageErrorMessage || null,
          imageDuplicateDetected: isImageReused,
          imageDuplicateReason: duplicateCheck.reason || null,
          savedForReview: !shouldAutoSchedule,
          reviewReason: imageGenerationFailed
            ? 'Falha ao gerar imagem nova; salvo para revisão manual sem publicação automática'
            : isImageReused
              ? `Imagem repetida detectada (${duplicateCheck.matchField}); publicação automática cancelada e conteúdo salvo para revisão`
              : (effectiveMode !== 'automatic' ? 'Aprovação manual necessária' : null),
          readySocialPlatforms: readyTargets.map((t) => t.label),
          pendingSocialPlatforms: pendingTargets.map((t) => t.label)
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);

      if (shouldAutoSchedule) {
        if (options?.signal?.aborted) {
          throw new Error('[Abort] Execução do Autopilot cancelada antes do agendamento.');
        }

        scheduleId = newId('sched');
        await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
          id: scheduleId,
          userId: ap.userId,
          companyId: ap.companyId,
          contentItemId: contentId,
          platforms: readyImageTargets.map((item) => item.label),
          scheduledFor: nowIso(),
          status: 'scheduled',
          isPlanning: false,
          autopilotGenerated: true,
          providerOptions: { youtubePrivacyStatus: 'unlisted' },
          createdAt: nowIso(),
          updatedAt: nowIso()
        });
      }
    }

    // 3. Vídeo Veo assíncrono (não aguarda renderização)
    if (videoTargets.length > 0 && !options?.signal?.aborted) {
      try {
        const videoPrompt = [
          generated.result.visualPrompt,
          generated.result.headline,
          generated.result.body,
          generated.result.cta
        ].filter(Boolean).join('. ');
        const readyVideoTargets = videoTargets.filter((target) => {
          if (!readyTargets.some((rt) => rt.provider === target.provider)) return false;
          // A API de vídeo do Pinterest exige capa; sem uma imagem válida,
          // preserva o job para as outras redes sem criar uma falha conjunta.
          return target.provider !== 'pinterest' || Boolean(videoCoverImageUrl);
        });
        const videoJob = await startVideoGenerationJob({
          userId: ap.userId,
          company,
          prompt: videoPrompt || `Vídeo publicitário para ${company.name}`,
          title: String(generated.result.headline || `Conteúdo ${company.name}`).slice(0, 100),
          preset: 'pro_1080p',
          aspectRatio: '9:16',
          coverImageUrl: videoCoverImageUrl,
          autoPublishPlatforms: effectiveMode === 'automatic' ? readyVideoTargets.map((item) => item.label) : [],
          autoPublishProviderOptions: { youtubePrivacyStatus: 'unlisted' }
        });

        // Confirmação obrigatória de persistência real do videoJob no Firestore
        const jobCheck = await db.collection(COLLECTIONS.mediaGenerationJobs).doc(videoJob.id).get();
        if (!jobCheck.exists) {
          throw new Error(`Inconsistência de persistência: videoJob ${videoJob.id} não foi gravado no banco de dados.`);
        }

        videoJobId = videoJob.id;
        if (!contentId && videoJob.contentItemId) {
          contentId = videoJob.contentItemId;
        }
      } catch (vidErr: any) {
        // Se o YouTube foi selecionado ou se não há canais de imagem para este projeto, a falha ao registrar o job de vídeo é fatal
        if (youtubeSelected || imageTargets.length === 0) {
          throw new Error(`Falha ao iniciar processamento de vídeo para ${youtubeSelected ? 'YouTube' : 'vídeo'}: ${vidErr?.message || vidErr}`);
        }
        console.warn(`[Autopilot Multimídia] Pipeline de vídeo Veo temporariamente indisponível (${vidErr?.message || vidErr}). Prosseguindo com conteúdo multimídia...`);
      }
    }

    if (options?.signal?.aborted) {
      throw new Error('[Abort] Execução do Autopilot cancelada antes de finalizar o registro do job.');
    }

    // Validação estrita de persistência: O Autopilot não pode concluir com sucesso sem pelo menos um artefato persistido
    const hasArtifact = Boolean(contentId || videoJobId || scheduleId);
    if (!hasArtifact) {
      throw new Error('Nenhum artefato persistido (contentId, videoJobId ou scheduleId) foi gerado neste ciclo.');
    }

    const finalStatus: AutopilotJobStatus = videoJobId ? 'video_processing' : 'completed';
    const creditsUsed = Number(generated.creditsUsed || 0) + imageCredits;

    job.status = finalStatus;
    job.contentId = contentId || null;
    job.scheduleId = scheduleId || null;
    job.videoJobId = videoJobId || null;
    job.creditsUsed = creditsUsed;
    job.error = null;
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    await jobRef.set(job, { merge: true });

    const canonicalConfigId = `${ap.userId}_${ap.companyId}`;
    await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalConfigId).set({
      ...ap,
      id: canonicalConfigId,
      userId: ap.userId,
      companyId: ap.companyId,
      lastRunAt: nowIso(),
      lastRunSlot: job.slot,
      lastJobId: job.id,
      lastJobStatus: finalStatus,
      lastGeneratedContentId: contentId || null,
      lastVideoJobId: videoJobId || null,
      lastError: null,
      lastErrorAt: null,
      updatedAt: nowIso()
    }, { merge: true });

    await createNotification({
      userId: ap.userId,
      title: `Autopilot Multimídia: ${company.name}`,
      message: mode === 'automatic'
        ? videoTargets.length > 0
          ? `Conteúdo de ${company.name} preparado; vídeo enviado para a fila Veo (${videoTargets.map((target) => target.label).join(', ')}) de forma assíncrona.`
          : `Conteúdo multimídia de ${company.name} criado e agendado com sucesso.`
        : `Conteúdo multimídia de ${company.name} criado e salvo para revisão.`,
      type: 'autopilot_ready'
    });

    return job;
  } catch (error: any) {
    if (options?.signal?.aborted) {
      console.warn(`[Autopilot Multimídia] Tarefa cancelada cooperativamente por timeout/abort para ${job.id}.`);
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.error = errorMsg.slice(0, 1000);
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    await jobRef.set(job, { merge: true }).catch(() => undefined);

    // Registra o erro SOMENTE no projeto que falhou
    const canonicalConfigId = `${ap.userId}_${ap.companyId}`;
    await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalConfigId).set({
      lastError: errorMsg.slice(0, 500),
      lastErrorAt: nowIso(),
      lastJobId: job.id,
      lastJobStatus: 'failed',
      updatedAt: nowIso()
    }, { merge: true }).catch(() => undefined);

    console.warn(`[Autopilot Multimídia R8] Falha no projeto ${ap.companyId}:`, errorMsg);
    return job;
  }
}

export async function processAutopilotMultimediaR8(options?: {
  signal?: AbortSignal;
  lease?: any;
}): Promise<{
  processed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  jobs: AutopilotJob[];
}> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.autopilotConfigs).where('enabled', '==', true).get();
  const now = new Date();

  const allProjects: any[] = await listAllPortalProjectsFromDb().catch(() => []);
  const projectMap = new Map<string, any>(allProjects.map((p: any) => [String(p.id), p] as [string, any]));

  const eligibleItems: Array<{
    ap: AutopilotRecord;
    project: any;
    slot: string;
    slotData: { dateStr: string; hour: number };
  }> = [];

  for (const doc of snap.docs) {
    if (options?.signal?.aborted) break;
    const ap = { id: doc.id, ...doc.data() } as AutopilotRecord;
    const project: any = projectMap.get(ap.companyId);
    if (!project || project.active === false) continue;
    if (!isDue(ap, now)) continue;

    const timezone = ap.timezone || 'America/Sao_Paulo';
    const current = localSlot(now, timezone);
    const slot = `${current.dateStr}_h${current.hour}`;

    eligibleItems.push({ ap, project, slot, slotData: current });
  }

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const jobs: AutopilotJob[] = [];

  const jobsToRun: Array<{ job: AutopilotJob; ap: AutopilotRecord }> = [];
  for (const item of eligibleItems) {
    if (options?.signal?.aborted) break;
    const reservation = await reserveAutopilotJob(
      item.ap,
      item.project.name,
      item.slot,
      item.slotData,
      false
    );
    if (!reservation.shouldRun) {
      skippedCount += 1;
      jobs.push(reservation.job);
      continue;
    }
    jobsToRun.push({ job: reservation.job, ap: item.ap });
  }

  // Executa os jobs em lotes pequenos e com isolamento total
  // Falhas em um projeto jamais bloqueiam os demais
  const BATCH_SIZE = 3;
  for (let i = 0; i < jobsToRun.length; i += BATCH_SIZE) {
    if (options?.signal?.aborted) break;
    const slice = jobsToRun.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      slice.map(async ({ job, ap }, idx) => {
        if (options?.signal?.aborted) {
          throw new Error('[Abort] Execução cancelada antes do processamento do lote.');
        }
        if (idx > 0) {
          await new Promise((resolve) => setTimeout(resolve, idx * 1200));
        }
        return executeAutopilotJob(job, ap, options);
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        const finishedJob = res.value;
        jobs.push(finishedJob);
        if (finishedJob.status === 'failed') {
          failedCount += 1;
        } else {
          successCount += 1;
        }
      } else {
        failedCount += 1;
      }
    }

    if (i + BATCH_SIZE < jobsToRun.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return {
    processed: successCount + failedCount,
    successCount,
    failedCount,
    skippedCount,
    jobs
  };
}

const activeAutopilotRuns = new Map<string, number>();

export interface AutopilotExecutionResult {
  success: boolean;
  jobId: string | null;
  contentId: string | null;
  videoJobId: string | null;
  scheduleId: string | null;
  stage: string;
  status: string;
  videoJobStatus?: string;
  attemptCount?: number;
  maxAttempts?: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  lastErrorCategory?: string | null;
  mode?: string;
  creditsUsed: number;
  message: string;
  persisted: boolean;
  publicationConfirmed: boolean;
  error?: string;
}

export async function triggerUserAutopilotMultimediaR8(userId: string, companyId: string): Promise<AutopilotExecutionResult> {
  const lockKey = `${userId}_${companyId}`;
  const now = Date.now();
  const lastRun = activeAutopilotRuns.get(lockKey);
  if (lastRun && (now - lastRun) < 240_000) {
    return {
      success: false,
      jobId: null,
      contentId: null,
      videoJobId: null,
      scheduleId: null,
      stage: 'in_progress',
      status: 'in_progress',
      creditsUsed: 0,
      message: 'Uma execução do Autopilot já está em processamento para este projeto. Por favor, aguarde a conclusão.',
      persisted: false,
      publicationConfirmed: false,
      error: 'Execução concorrente em andamento.'
    };
  }

  activeAutopilotRuns.set(lockKey, now);
  try {
    const db = firestore();
    const canonicalId = `${userId}_${companyId}`;
    let snap = await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).get();
    if (!snap.exists) {
      const legacy = await db.collection(COLLECTIONS.autopilotConfigs).doc(companyId).get();
      if (legacy.exists && legacy.data()?.userId === userId) snap = legacy;
    }

    const ap: AutopilotRecord = snap.exists
      ? ({ id: snap.id, ...snap.data(), userId, companyId } as AutopilotRecord)
      : {
          id: canonicalId,
          userId,
          companyId,
          enabled: true,
          mode: 'manual_approval',
          frequency: 'daily',
          timezone: 'America/Sao_Paulo',
          preferredDays: [0, 1, 2, 3, 4, 5, 6],
          preferredHours: [10],
          targetPlatforms: ['Instagram', 'Facebook'],
          primaryGoal: 'Atrair clientes e gerar autoridade'
        };

    const project = await getPortalProjectFromDb(companyId);
    if (!project || project.active === false) {
      throw new Error('Projeto oficial não encontrado ou inativo no cadastro.');
    }

    const timezone = ap.timezone || 'America/Sao_Paulo';
    const current = localSlot(new Date(), timezone);
    const slot = `${current.dateStr}_h${current.hour}`;

    const reservation = await reserveAutopilotJob(ap, project.name, slot, current, true);
    const finishedJob = await executeAutopilotJob(reservation.job, ap);

    // Verificação estrita de persistência real no Firestore antes de qualquer confirmação
    let contentExists = false;
    let videoJobExists = false;
    let scheduleExists = false;
    let vSnap: any = null;

    if (finishedJob.contentId) {
      const cSnap = await db.collection(COLLECTIONS.contentItems).doc(finishedJob.contentId).get().catch(() => null);
      contentExists = Boolean(cSnap?.exists);
    }
    if (finishedJob.videoJobId) {
      vSnap = await db.collection(COLLECTIONS.mediaGenerationJobs).doc(finishedJob.videoJobId).get().catch(() => null);
      videoJobExists = Boolean(vSnap?.exists);
    }
    if (finishedJob.scheduleId) {
      const sSnap = await db.collection(COLLECTIONS.scheduledPosts).doc(finishedJob.scheduleId).get().catch(() => null);
      scheduleExists = Boolean(sSnap?.exists);
    }

    const confirmedContentId = (finishedJob.contentId && contentExists) ? finishedJob.contentId : null;
    const confirmedVideoJobId = (finishedJob.videoJobId && videoJobExists) ? finishedJob.videoJobId : null;
    const confirmedScheduleId = (finishedJob.scheduleId && scheduleExists) ? finishedJob.scheduleId : null;

    const videoJobData: any = (confirmedVideoJobId && vSnap?.exists) ? vSnap.data() : null;
    const isRetryScheduled = videoJobData?.status === 'retry_scheduled';
    const isVideoProcessing = finishedJob.status === 'video_processing' || Boolean(confirmedVideoJobId);
    const persisted = Boolean(confirmedContentId || confirmedVideoJobId || confirmedScheduleId);
    const isFailed = finishedJob.status === 'failed' || !persisted;

    if (isFailed) {
      const failReason = finishedJob.error || (!persisted ? 'Nenhum artefato comprovadamente persistido no banco de dados.' : 'Falha na execução do Autopilot.');
      return {
        success: false,
        jobId: finishedJob.id || null,
        contentId: confirmedContentId,
        videoJobId: confirmedVideoJobId,
        scheduleId: confirmedScheduleId,
        stage: 'failed',
        status: 'failed',
        mode: finishedJob.mode,
        creditsUsed: 0,
        message: `Falha na execução do Autopilot: ${failReason}`,
        persisted: false,
        publicationConfirmed: false,
        error: failReason
      };
    }

    const stage = isVideoProcessing
      ? (isRetryScheduled ? 'retry_scheduled' : 'video_processing')
      : confirmedScheduleId
        ? 'scheduled'
        : 'saved_for_review';

    const status = isRetryScheduled
      ? 'retry_scheduled'
      : isVideoProcessing
        ? 'video_processing'
        : finishedJob.status;

    let message: string;
    if (isRetryScheduled) {
      const retryTimeStr = videoJobData?.nextAttemptAt ? ` Próxima tentativa automática prevista para ${new Date(videoJobData.nextAttemptAt).toLocaleTimeString('pt-BR')}.` : '';
      message = `Solicitação de vídeo salva na fila (job: ${confirmedVideoJobId}). A API do Google Gemini atingiu um limite temporário de requisições.${retryTimeStr} A publicação no YouTube ocorrerá após a geração bem-sucedida do vídeo.`;
    } else if (isVideoProcessing) {
      message = `Vídeo em processamento pelo pipeline Veo (job: ${confirmedVideoJobId}); agendamento no YouTube será realizado após a disponibilização do arquivo.`;
    } else if (finishedJob.mode === 'automatic' && confirmedScheduleId) {
      message = 'Conteúdo multimídia criado e agendado automaticamente.';
    } else {
      message = 'Conteúdo multimídia gerado com sucesso e salvo para revisão.';
    }

    return {
      success: true,
      jobId: finishedJob.id || null,
      contentId: confirmedContentId,
      videoJobId: confirmedVideoJobId,
      scheduleId: confirmedScheduleId,
      stage,
      status,
      videoJobStatus: videoJobData?.status || (isVideoProcessing ? 'processing' : 'completed'),
      attemptCount: videoJobData?.attemptCount || (isVideoProcessing ? 1 : 0),
      maxAttempts: videoJobData?.maxAttempts || 5,
      nextAttemptAt: videoJobData?.nextAttemptAt || null,
      lastError: videoJobData?.lastErrorMessage || null,
      lastErrorCategory: videoJobData?.lastErrorCategory || null,
      mode: finishedJob.mode,
      creditsUsed: finishedJob.creditsUsed || 0,
      message,
      persisted: true,
      publicationConfirmed: false
    };
  } finally {
    activeAutopilotRuns.delete(lockKey);
  }
}

export async function triggerAllActiveAutopilotMultimediaR8(userId: string): Promise<{
  totalEligible: number;
  successCount: number;
  failedCount: number;
  jobs: AutopilotJob[];
  message: string;
}> {
  const db = firestore();
  const allProjects: any[] = await listAllPortalProjectsFromDb().catch(() => []);
  const activeProjects = allProjects.filter((p: any) => p.active !== false);
  const now = new Date();

  const configsSnap = await db.collection(COLLECTIONS.autopilotConfigs).where('userId', '==', userId).get();
  const configsMap = new Map<string, AutopilotRecord>(
    configsSnap.docs.map((doc) => [
      String(doc.data()?.companyId || doc.id.split('_')[1] || ''),
      { id: doc.id, ...doc.data() } as AutopilotRecord
    ] as [string, AutopilotRecord])
  );

  const jobsToRun: Array<{ job: AutopilotJob; ap: AutopilotRecord }> = [];

  for (const project of activeProjects) {
    const ap: AutopilotRecord = configsMap.get(project.id) || ({
      id: `${userId}_${project.id}`,
      userId,
      companyId: project.id,
      enabled: false,
      mode: 'manual_approval',
      frequency: 'daily',
      timezone: 'America/Sao_Paulo',
      preferredDays: [0, 1, 2, 3, 4, 5, 6],
      preferredHours: [10],
      targetPlatforms: ['Instagram', 'Facebook'],
      primaryGoal: 'Atrair clientes e gerar autoridade'
    } as AutopilotRecord);

    // Só processa projetos onde o Autopilot multimídia estiver explicitamente habilitado (enabled === true)
    if (!ap.enabled) continue;

    const timezone = ap.timezone || 'America/Sao_Paulo';
    const current = localSlot(now, timezone);
    const slot = `${current.dateStr}_h${current.hour}`;

    const reservation = await reserveAutopilotJob(ap, project.name, slot, current, true);
    jobsToRun.push({ job: reservation.job, ap });
  }

  if (jobsToRun.length === 0) {
    return {
      totalEligible: 0,
      successCount: 0,
      failedCount: 0,
      jobs: [],
      message: 'Nenhum projeto ativo está com o Autopilot Multimídia habilitado (enabled = true).'
    };
  }

  let successCount = 0;
  let failedCount = 0;
  const finishedJobs: AutopilotJob[] = [];

  const BATCH_SIZE = 3;
  for (let i = 0; i < jobsToRun.length; i += BATCH_SIZE) {
    const slice = jobsToRun.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      slice.map(async ({ job, ap }, idx) => {
        if (idx > 0) {
          await new Promise((resolve) => setTimeout(resolve, idx * 1200));
        }
        return executeAutopilotJob(job, ap);
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        const finished = res.value;
        finishedJobs.push(finished);
        if (finished.status === 'failed') failedCount += 1;
        else successCount += 1;
      } else {
        failedCount += 1;
      }
    }

    if (i + BATCH_SIZE < jobsToRun.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return {
    totalEligible: jobsToRun.length,
    successCount,
    failedCount,
    jobs: finishedJobs,
    message: `Ciclo concluído: ${successCount} sucesso(s) e ${failedCount} falha(s) em ${jobsToRun.length} projeto(s) elegível(is).`
  };
}

export async function getAutopilotProjectsOverview(userId: string): Promise<Array<{
  project: {
    id: string;
    name: string;
    slug: string;
    category: string;
    segment: string;
    websiteUrl: string;
    hasApp: boolean;
    playStoreUrl?: string;
    active: boolean;
    dailyMarketingEnabled: boolean;
    dailyBlogEnabled: boolean;
  };
  autopilot: {
    enabled: boolean;
    mode: 'manual_approval' | 'automatic';
    frequency: string;
    preferredHours: number[];
    preferredDays: number[];
    targetPlatforms: string[];
    primaryGoal: string;
    lastRunAt: string | null;
    lastRunSlot: string | null;
    lastJobId: string | null;
    lastJobStatus: AutopilotJobStatus | null;
    lastError: string | null;
    lastErrorAt: string | null;
  };
  latestJob: AutopilotJob | null;
}>> {
  const db = firestore();
  const allProjects = await listAllPortalProjectsFromDb().catch(() => []);
  const activeProjects = allProjects.filter((p) => p.active !== false);

  const configsSnap = await db.collection(COLLECTIONS.autopilotConfigs).where('userId', '==', userId).get();
  const configsMap = new Map<string, AutopilotRecord>();
  for (const doc of configsSnap.docs) {
    const data = doc.data() as AutopilotRecord;
    const cid = String(data.companyId || doc.id.split('_')[1] || doc.id);
    configsMap.set(cid, { id: doc.id, ...data });
  }

  // Busca os jobs mais recentes do usuário
  const jobsSnap = await db.collection(COLLECTIONS.autopilotJobs)
    .where('userId', '==', userId)
    .limit(100)
    .get()
    .catch(() => ({ docs: [] } as any));

  const latestJobByCompany = new Map<string, AutopilotJob>();
  for (const doc of jobsSnap.docs) {
    const job = { id: doc.id, ...doc.data() } as AutopilotJob;
    const cid = job.companyId;
    const prev = latestJobByCompany.get(cid);
    if (!prev || (new Date(job.updatedAt || job.createdAt).getTime() > new Date(prev.updatedAt || prev.createdAt).getTime())) {
      latestJobByCompany.set(cid, job);
    }
  }

  return activeProjects.map((p) => {
    const ap = configsMap.get(p.id) || {
      userId,
      companyId: p.id,
      enabled: false,
      mode: 'manual_approval',
      frequency: 'daily',
      timezone: 'America/Sao_Paulo',
      preferredDays: [0, 1, 2, 3, 4, 5, 6],
      preferredHours: [10],
      targetPlatforms: ['Instagram', 'Facebook'],
      primaryGoal: 'Atrair clientes e gerar autoridade',
      lastRunAt: null,
      lastRunSlot: null,
      lastJobId: null,
      lastJobStatus: null,
      lastError: null,
      lastErrorAt: null
    };

    const latestJob = latestJobByCompany.get(p.id) || null;
    const effectiveLatestJob = (latestJob && latestJob.status === 'failed' && !latestJob.error && !ap.lastError)
      ? { ...latestJob, status: 'completed' as const }
      : latestJob;

    return {
      project: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        segment: p.segment,
        websiteUrl: p.websiteUrl,
        hasApp: Boolean(p.hasApp),
        playStoreUrl: p.playStoreUrl,
        active: p.active !== false,
        dailyMarketingEnabled: p.dailyMarketingEnabled !== false,
        dailyBlogEnabled: p.dailyBlogEnabled !== false
      },
      autopilot: {
        enabled: Boolean(ap.enabled),
        mode: ap.mode === 'automatic' ? 'automatic' : 'manual_approval',
        frequency: ap.frequency || 'daily',
        preferredHours: Array.isArray(ap.preferredHours) && ap.preferredHours.length > 0 ? ap.preferredHours : [10],
        preferredDays: Array.isArray(ap.preferredDays) && ap.preferredDays.length > 0 ? ap.preferredDays : [0, 1, 2, 3, 4, 5, 6],
        targetPlatforms: Array.isArray(ap.targetPlatforms) ? ap.targetPlatforms : ['Instagram', 'Facebook'],
        primaryGoal: ap.primaryGoal || 'Atrair clientes e gerar autoridade',
        lastRunAt: ap.lastRunAt || null,
        lastRunSlot: ap.lastRunSlot || null,
        lastJobId: ap.lastJobId || null,
        lastJobStatus: ap.lastJobStatus || null,
        lastError: ap.lastError || null,
        lastErrorAt: ap.lastErrorAt || null
      },
      latestJob: effectiveLatestJob
    };
  });
}

export async function clearAutopilotErrors(userId: string, companyId?: string): Promise<{ clearedCount: number }> {
  const db = firestore();
  let clearedCount = 0;

  if (companyId) {
    const configId = `${userId}_${companyId}`;
    await db.collection(COLLECTIONS.autopilotConfigs).doc(configId).set({
      lastError: null,
      lastErrorAt: null,
      lastJobStatus: 'completed',
      updatedAt: nowIso()
    }, { merge: true }).catch(() => undefined);
    clearedCount++;
  } else {
    const snap = await db.collection(COLLECTIONS.autopilotConfigs).where('userId', '==', userId).get();
    for (const doc of snap.docs) {
      await doc.ref.set({
        lastError: null,
        lastErrorAt: null,
        lastJobStatus: 'completed',
        updatedAt: nowIso()
      }, { merge: true }).catch(() => undefined);
      clearedCount++;
    }
  }

  const jobsSnap = await db.collection(COLLECTIONS.autopilotJobs)
    .where('userId', '==', userId)
    .where('status', '==', 'failed')
    .limit(50)
    .get()
    .catch(() => ({ docs: [] } as any));

  for (const doc of jobsSnap.docs) {
    const data = doc.data();
    if (!companyId || data.companyId === companyId) {
      await doc.ref.set({
        status: 'completed',
        error: null,
        updatedAt: nowIso()
      }, { merge: true }).catch(() => undefined);
    }
  }

  return { clearedCount };
}
