import { generateAutopilotPost, generateMarketingImage, startVideoGenerationJob } from './ai.js';
import { getPortalProjectFromDb } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso } from './store.js';
import { normalizeProvider, type SocialProvider } from './social.js';
import { assertUniversalConnectionReady, isUniversalAutoPublishSupported } from './socialMediaPublisher.js';

interface AutopilotRecord {
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

function isDue(ap: AutopilotRecord, referenceDate: Date): boolean {
  if (!ap.enabled) return false;
  const timezone = ap.timezone || 'America/Sao_Paulo';
  const current = localSlot(referenceDate, timezone);
  const days = (ap.frequency === 'daily' || !ap.frequency)
    ? [0, 1, 2, 3, 4, 5, 6]
    : Array.isArray(ap.preferredDays) && ap.preferredDays.length
      ? ap.preferredDays
      : ap.frequency === '3_times_week'
        ? [1, 3, 5]
        : [1];
  const hours = [10];
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

async function executeCycle(ap: AutopilotRecord, force = false): Promise<{
  success: boolean;
  contentId?: string;
  scheduleId?: string;
  videoJobId?: string;
  mode: string;
  creditsUsed: number;
  message: string;
}> {
  const db = firestore();
  const project = await getPortalProjectFromDb(ap.companyId);
  if (!project || project.active === false) {
    const error: any = new Error('Projeto oficial não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const company = projectContext(ap.userId, project);
  const mode = ap.mode === 'automatic' ? 'automatic' : 'manual_approval';
  const targets = normalizeTargets(ap.targetPlatforms);
  if (!targets.length) throw new Error('Nenhuma rede social válida foi selecionada.');

  if (mode === 'automatic') await assertTargetsReady(ap.userId, ap.companyId, targets);

  const generated = await generateAutopilotPost({
    userId: ap.userId,
    company,
    topic: `Conteúdo estratégico atual para ${company.name}`,
    platform: targets.map((item) => item.label).join(', '),
    goal: ap.primaryGoal || 'Atrair clientes e gerar autoridade'
  });

  const videoTargets = targets.filter((target) => target.provider === 'youtube' || target.provider === 'tiktok');
  const youtubeSelected = videoTargets.some((target) => target.provider === 'youtube');
  const tiktokSelected = videoTargets.some((target) => target.provider === 'tiktok');
  const imageTargets = targets.filter((target) => target.provider !== 'youtube' && target.provider !== 'tiktok');
  let contentId: string | undefined;
  let scheduleId: string | undefined;
  let videoJobId: string | undefined;
  let imageCredits = 0;

  if (imageTargets.length > 0 || mode !== 'automatic') {
    const visualTheme = String(generated.result.visualPrompt || generated.result.headline || generated.result.body || `Criativo para ${company.name}`);
    const image = await generateMarketingImage({
      userId: ap.userId,
      company,
      theme: visualTheme,
      style: 'Fotografia comercial premium, realista e moderna para redes sociais',
      aspectRatio: '1:1',
      resolution: '1K'
    });
    imageCredits = Number(image.creditsUsed || 0);
    contentId = newId('content');
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
      imageUrl: image.imageUrl,
      targetPlatform: targets.map((item) => item.label).join(', '),
      creditsUsed: Number(generated.creditsUsed || 0) + imageCredits,
      status: mode === 'automatic' && imageTargets.length > 0 ? 'scheduled' : 'saved',
      metadata: {
        generatedBy: 'autopilot_multimedia_r8',
        imageStoragePath: image.storagePath,
        imageModelUsed: image.modelUsed,
        imageResolution: image.resolution
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await db.collection(COLLECTIONS.contentItems).doc(contentId).set(content);

    if (mode === 'automatic' && imageTargets.length > 0) {
      scheduleId = newId('sched');
      await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
        id: scheduleId,
        userId: ap.userId,
        companyId: ap.companyId,
        contentItemId: contentId,
        platforms: imageTargets.map((item) => item.label),
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

  if (videoTargets.length > 0) {
    const videoPrompt = [
      generated.result.visualPrompt,
      generated.result.headline,
      generated.result.body,
      generated.result.cta
    ].filter(Boolean).join('. ');
    const videoJob = await startVideoGenerationJob({
      userId: ap.userId,
      company,
      prompt: videoPrompt || `Vídeo publicitário para ${company.name}`,
      title: String(generated.result.headline || `Conteúdo ${company.name}`).slice(0, 100),
      preset: 'pro_1080p',
      aspectRatio: '9:16',
      autoPublishPlatforms: mode === 'automatic' ? videoTargets.map((item) => item.label) : [],
      autoPublishProviderOptions: { youtubePrivacyStatus: 'unlisted' }
    });
    videoJobId = videoJob.id;
  }

  const timezone = ap.timezone || 'America/Sao_Paulo';
  const slotData = localSlot(new Date(), timezone);
  const lastRunSlot = `${slotData.dateStr}_h${slotData.hour}`;
  const canonicalId = `${ap.userId}_${ap.companyId}`;
  await db.collection(COLLECTIONS.autopilotConfigs).doc(canonicalId).set({
    ...ap,
    id: canonicalId,
    userId: ap.userId,
    companyId: ap.companyId,
    lastRunAt: nowIso(),
    lastRunSlot,
    lastGeneratedContentId: contentId || null,
    lastVideoJobId: videoJobId || null,
    lastError: null,
    updatedAt: nowIso()
  }, { merge: true });

  await createNotification({
    userId: ap.userId,
    title: 'Automação multimídia do Portal Vip Brasil executada',
    message: mode === 'automatic'
      ? videoTargets.length > 0
        ? `Conteúdo de ${company.name} foi preparado para as redes; o vídeo para ${[youtubeSelected ? 'YouTube' : '', tiktokSelected ? 'TikTok' : ''].filter(Boolean).join(' e ')} entrou na fila Veo e seguirá para publicação/rascunho quando estiver concluído.`
        : `Conteúdo multimídia de ${company.name} foi criado e agendado para publicação.`
      : `Conteúdo multimídia de ${company.name} foi criado e salvo para sua revisão.`,
    type: 'autopilot_ready'
  });

  const creditsUsed = Number(generated.creditsUsed || 0) + imageCredits;
  return {
    success: true,
    contentId,
    scheduleId,
    videoJobId,
    mode,
    creditsUsed,
    message: mode === 'automatic'
      ? videoTargets.length > 0
        ? 'Conteúdo multimídia agendado; vídeo em geração para YouTube/TikTok e processamento automático quando concluído.'
        : 'Conteúdo multimídia criado e agendado automaticamente.'
      : 'Conteúdo multimídia criado com sucesso e salvo para aprovação.'
  };
}

export async function processAutopilotMultimediaR8(): Promise<number> {
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.autopilotConfigs).where('enabled', '==', true).limit(25).get();
  const now = new Date();
  let processed = 0;

  for (const doc of snap.docs) {
    const ap = { id: doc.id, ...doc.data() } as AutopilotRecord;
    if (!isDue(ap, now)) continue;
    try {
      await executeCycle(ap);
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await doc.ref.set({ lastError: message.slice(0, 500), lastErrorAt: nowIso(), updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
      console.warn('[Portal Vip Autopilot Multimídia R8]', message);
    }
  }

  return processed;
}

export async function triggerUserAutopilotMultimediaR8(userId: string, companyId: string): Promise<{
  success: boolean;
  contentId?: string;
  scheduleId?: string;
  videoJobId?: string;
  mode?: string;
  creditsUsed: number;
  message: string;
}> {
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
        preferredDays: [1, 2, 3, 4, 5],
        preferredHours: [10],
        targetPlatforms: ['Instagram', 'Facebook'],
        primaryGoal: 'Atrair clientes e gerar autoridade'
      };

  return executeCycle(ap, true);
}
