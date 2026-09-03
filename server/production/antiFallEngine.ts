import { config } from '../config/index.js';
import { getAdminAuth } from '../providers/firebaseAdmin.js';
import { textAiClient } from './ai.js';
import { type PortalProjectItem, listAllPortalProjectsFromDb, seedPortalProjectsIfEmpty } from './almaPortfolio.js';
import { isTextAutoPublishSupported, normalizeProvider, type SocialProvider } from './social.js';
import { COLLECTIONS, createNotification, firestore, nowIso, stableId } from './store.js';

export interface AntiFallModelAttempt {
  model: string;
  versionTier: '3.7' | '3.6' | '3.5';
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface AntiFallResult {
  text: string;
  modelUsed: string;
  versionTier: '3.7' | '3.6' | '3.5';
  totalDurationMs: number;
  attempts: AntiFallModelAttempt[];
  antiFallActivated: boolean;
}

const ANTI_FALL_MODELS = [
  { model: 'gemini-3.1-pro-preview', tier: '3.7' as const, fallbackAlias: 'gemini-2.5-pro' },
  { model: 'gemini-2.5-flash', tier: '3.6' as const, fallbackAlias: 'gemini-2.5-flash' },
  { model: 'gemini-3.1-flash-lite', tier: '3.5' as const, fallbackAlias: 'gemini-2.5-flash-lite' }
];

export async function executeAiWith2SecAntiFall(data: {
  prompt: string;
  systemInstruction?: string;
  jsonOutput?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  fallbackProject?: PortalProjectItem;
}): Promise<AntiFallResult> {
  const timeoutMs = data.timeoutMs || 2000;
  const attempts: AntiFallModelAttempt[] = [];
  const startGlobal = Date.now();

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
          responseMimeType: data.jsonOutput ? 'application/json' : 'text/plain'
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de proteção anti-quedas de ${timeoutMs}ms excedido no modelo ${candidateModel} (Tier ${item.tier})`)), timeoutMs);
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const text = response?.text?.trim();

      if (!text) throw new Error('Resposta vazia retornada pela IA.');

      attempts.push({
        model: candidateModel,
        versionTier: item.tier,
        durationMs: Date.now() - modelStart,
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
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      attempts.push({
        model: candidateModel,
        versionTier: item.tier,
        durationMs: Date.now() - modelStart,
        success: false,
        error: errorMsg
      });
      console.warn(`[Anti-Quedas 2s] Failover acionado do Tier ${item.tier} (${candidateModel}): ${errorMsg}`);
    }
  }

  const project = data.fallbackProject;
  const headline = project
    ? `Conheça ${project.name} no Portal Vip Brasil`
    : 'Portal Vip Brasil — conteúdo em modo de contingência';
  const body = project
    ? `${project.description}\n\nAcesse o endereço oficial: ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? `\nAplicativo oficial: ${project.playStoreUrl}` : ''}`
    : 'A geração por IA ficou temporariamente indisponível. O conteúdo deve ser revisado antes de qualquer publicação.';

  return {
    text: JSON.stringify({
      headline,
      body,
      cta: project ? `Acesse ${project.name} pelo endereço oficial.` : 'Revise o conteúdo antes de publicar.',
      hashtags: ['#PortalVipBrasil'],
      keywords: project?.keywords || ['portal vip brasil'],
      visualPrompt: project ? `Peça visual institucional para ${project.name}, fiel à identidade do projeto.` : 'Peça institucional Portal Vip Brasil.',
      targetPlatform: 'Revisão manual'
    }),
    modelUsed: 'emergency-safe-cache',
    versionTier: '3.5',
    totalDurationMs: Date.now() - startGlobal,
    attempts,
    antiFallActivated: true
  };
}

function normalizeUserId(value: unknown): string {
  const id = String(value || '').trim();
  return id && id.length <= 128 && !id.includes('/') ? id : '';
}

async function resolvePortalOwnerUserId(explicitUserId?: string): Promise<string> {
  const explicit = normalizeUserId(explicitUserId);
  if (explicit) return explicit;

  const ownerEmail = config.privateAdminEmails[0];
  const adminAuth = getAdminAuth();
  if (!ownerEmail || !adminAuth) {
    throw new Error('Proprietário administrativo não pôde ser resolvido para a automação agendada.');
  }

  const record = await adminAuth.getUserByEmail(ownerEmail);
  const uid = normalizeUserId(record?.uid);
  if (!uid) throw new Error('UID do proprietário administrativo é inválido.');
  return uid;
}

async function acquireDailyMarketingClaim(db: any, userId: string, projectId: string, date: string): Promise<any | null> {
  const id = stableId(`portal-daily-marketing:${userId}:${projectId}:${date}`);
  const ref = db.collection(COLLECTIONS.idempotency).doc(id);
  const now = Date.now();
  const lockedUntil = now + 20 * 60 * 1000;

  const acquired = await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const current = snap.data() as any;
    if (current?.status === 'completed') return false;
    if (current?.status === 'processing' && Number(current?.lockedUntil || 0) > now) return false;
    tx.set(ref, {
      id,
      kind: 'portal_daily_marketing',
      userId,
      projectId,
      date,
      status: 'processing',
      lockedUntil,
      startedAt: nowIso(),
      updatedAt: nowIso()
    }, { merge: true });
    return true;
  });

  return acquired ? ref : null;
}

function projectAllowsProvider(project: PortalProjectItem, provider: SocialProvider): boolean {
  const settings = project.socialSettings || {};
  if (provider === 'facebook') return settings.facebookEnabled !== false;
  if (provider === 'linkedin') return settings.linkedinEnabled !== false;
  if (provider === 'x') return settings.xEnabled !== false;
  return false;
}

async function validDirectTargets(db: any, userId: string, project: PortalProjectItem): Promise<SocialProvider[]> {
  const snap = await db.collection(COLLECTIONS.socialConnections)
    .where('userId', '==', userId)
    .where('companyId', '==', project.id)
    .get();
  const now = Date.now();
  const targets = new Set<SocialProvider>();

  for (const doc of snap.docs) {
    const conn = doc.data() as any;
    const provider = normalizeProvider(conn?.provider);
    if (!provider || !isTextAutoPublishSupported(provider) || !projectAllowsProvider(project, provider)) continue;
    const expired = conn?.expiresAt ? new Date(conn.expiresAt).getTime() <= now : false;
    if (conn?.status !== 'connected' || expired || (!conn?.encryptedAccessToken && !conn?.accessToken)) continue;
    targets.add(provider);
  }

  return [...targets];
}

/**
 * Gera o conteúdo diário de cada projeto. Só cria agendamento social quando a
 * conexão pertence ao projeto e suporta publicação textual direta.
 */
export async function runDailyPortalMarketingCycle(userId?: string): Promise<{
  success: boolean;
  publishedCount: number;
  generatedCount: number;
  scheduledCount: number;
  skippedCount: number;
  totalProjects: number;
  itemsGenerated: Array<{
    projectName: string;
    headline: string;
    targetPlatform: string;
    hasApp: boolean;
    contentId: string;
    scheduleId?: string;
    scheduledPlatforms: string[];
    modelUsed: string;
  }>;
  errors?: Array<{ projectId: string; message: string }>;
}> {
  const db = firestore();
  const targetUserId = await resolvePortalOwnerUserId(userId);
  const todayDate = new Date().toISOString().slice(0, 10);
  const itemsGenerated: any[] = [];
  const errors: Array<{ projectId: string; message: string }> = [];
  let scheduledCount = 0;
  let skippedCount = 0;

  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }

  const selectedProjects = allProjects.filter((p) => p.active !== false && p.dailyMarketingEnabled !== false);
  const projectsToProcess = selectedProjects.length > 0 ? selectedProjects : allProjects;

  for (const project of projectsToProcess) {
    const claimRef = await acquireDailyMarketingClaim(db, targetUserId, project.id, todayDate);
    if (!claimRef) {
      skippedCount += 1;
      continue;
    }

    try {
      const prompt = `Gere uma publicação de marketing de alto impacto e engajamento para o projeto "${project.name}" do Portal Vip Brasil.
Informações Oficiais:
- Categoria: ${project.category}
- Segmento: ${project.segment}
- Website Oficial: ${project.websiteUrl}
${project.hasApp && project.playStoreUrl ? `- Aplicativo na Play Store: ${project.playStoreUrl} (${project.appTitle})` : '- Produto 100% Online'}
- Diferenciais: ${project.highlights.join(' | ')}
- Palavras-chave Bing/Google SEO: ${project.bingSeoKeywords.join(', ')}

Requisitos Estratégicos:
1. Headline clara e fiel ao projeto.
2. Corpo persuasivo sem inventar recursos.
3. CTA para os endereços oficiais.
4. 5 a 8 hashtags relevantes.
5. Prompt visual coerente com o projeto.

Responda em JSON com: "headline", "body", "cta", "hashtags", "keywords", "visualPrompt", "targetPlatform".`;

      const generated = await executeAiWith2SecAntiFall({
        prompt,
        systemInstruction: 'Você é o Diretor de Marketing do Portal Vip Brasil. Nunca misture identidade, links, aplicativos ou características entre projetos.',
        jsonOutput: true,
        maxTokens: 2500,
        timeoutMs: 2000,
        fallbackProject: project
      });

      let postData: any;
      try {
        postData = JSON.parse(generated.text);
      } catch {
        postData = {
          headline: `Conheça ${project.name} no Portal Vip Brasil`,
          body: `${project.description}\n\nAcesse: ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? `\nAplicativo: ${project.playStoreUrl}` : ''}`,
          cta: `Acesse ${project.name} pelo endereço oficial.`,
          hashtags: ['#PortalVipBrasil'],
          keywords: project.keywords,
          visualPrompt: `Banner institucional de ${project.name}`,
          targetPlatform: 'Revisão manual'
        };
      }

      const scheduledPlatforms = await validDirectTargets(db, targetUserId, project);
      const contentId = `daily-content-${stableId(`${targetUserId}:${todayDate}:${project.id}`).slice(0, 48)}`;
      const contentDoc = {
        id: contentId,
        userId: targetUserId,
        companyId: project.id,
        type: 'post',
        title: `[Divulgação Diária] ${project.name} — ${postData.headline || project.name}`,
        headline: postData.headline || project.name,
        body: postData.body || project.description,
        cta: postData.cta || `Acesse ${project.websiteUrl}`,
        hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
        keywords: Array.isArray(postData.keywords) ? postData.keywords : project.keywords,
        visualPrompt: postData.visualPrompt || '',
        targetPlatform: scheduledPlatforms[0] || postData.targetPlatform || 'Revisão manual',
        creditsUsed: 0,
        status: scheduledPlatforms.length > 0 ? 'scheduled' : 'saved',
        metadata: {
          isPortalVipAutomation: true,
          projectId: project.id,
          projectSlug: project.slug,
          websiteUrl: project.websiteUrl,
          playStoreUrl: project.playStoreUrl,
          modelUsed: generated.modelUsed,
          tier: generated.versionTier,
          dailyDate: todayDate,
          scheduledPlatforms
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      await db.collection(COLLECTIONS.contentItems).doc(contentId).set(contentDoc, { merge: true });

      let scheduleId: string | undefined;
      if (scheduledPlatforms.length > 0) {
        scheduleId = `daily-sched-${stableId(`${targetUserId}:${todayDate}:${project.id}:social`).slice(0, 48)}`;
        await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
          id: scheduleId,
          userId: targetUserId,
          companyId: project.id,
          contentItemId: contentId,
          platforms: scheduledPlatforms,
          scheduledFor: nowIso(),
          status: 'scheduled',
          autopilotGenerated: true,
          portalDailyMarketing: true,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }, { merge: true });
        scheduledCount += 1;
      }

      await claimRef.set({
        status: 'completed',
        lockedUntil: 0,
        contentId,
        scheduleId: scheduleId || null,
        completedAt: nowIso(),
        updatedAt: nowIso()
      }, { merge: true });

      itemsGenerated.push({
        projectName: project.name,
        headline: postData.headline || project.name,
        targetPlatform: scheduledPlatforms[0] || postData.targetPlatform || 'Revisão manual',
        hasApp: Boolean(project.hasApp),
        contentId,
        scheduleId,
        scheduledPlatforms,
        modelUsed: generated.modelUsed
      });
    } catch (error: any) {
      const message = error?.message ? String(error.message).slice(0, 500) : String(error).slice(0, 500);
      errors.push({ projectId: project.id, message });
      await claimRef.set({ status: 'failed', lockedUntil: 0, lastError: message, failedAt: nowIso(), updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
      console.error(`[Portal Vip Divulgação Diária] Falha em ${project.id}:`, message);
    }
  }

  if (itemsGenerated.length > 0) {
    await createNotification({
      userId: targetUserId,
      title: 'Ciclo diário do Portal Vip Brasil concluído',
      message: `${itemsGenerated.length} conteúdo(s) gerado(s); ${scheduledCount} projeto(s) com publicação direta agendada em conexão válida.`,
      type: 'autopilot_ready'
    });
  }

  return {
    success: errors.length === 0,
    publishedCount: 0,
    generatedCount: itemsGenerated.length,
    scheduledCount,
    skippedCount,
    totalProjects: projectsToProcess.length,
    itemsGenerated,
    errors: errors.length ? errors : undefined
  };
}
