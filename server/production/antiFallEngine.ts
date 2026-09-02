import { config } from '../config/index.js';
import { textAiClient } from './ai.js';
import { PORTAL_VIP_PROJECTS, PortalProjectItem, listAllPortalProjectsFromDb, seedPortalProjectsIfEmpty } from './almaPortfolio.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso } from './store.js';

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
}): Promise<AntiFallResult> {
  const timeoutMs = data.timeoutMs || 2000;
  const attempts: AntiFallModelAttempt[] = [];
  const startGlobal = Date.now();
  let lastError = 'Nenhum modelo respondeu';

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
        throw new Error('Resposta vazia retornada pela IA.');
      }
    } catch (err: any) {
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

  // Fallback de emergência garantido se todos atingirem timeout
  const emergencyProject = PORTAL_VIP_PROJECTS[0];
  return {
    text: JSON.stringify({
      headline: `Descubra ${emergencyProject.name} — O Portal Vip Brasil Apresenta`,
      body: `${emergencyProject.description}\n\nAcesse agora o site oficial ou baixe nosso aplicativo na Google Play Store para transformar seu dia com praticidade e fé.`,
      cta: 'Acesse o site oficial ou instale o aplicativo na Google Play Store agora mesmo!',
      hashtags: ['#PortalVipBrasil', '#MarketingDigital', '#PlayStoreApps', '#Espiritualidade', '#SucessoOnline'],
      keywords: emergencyProject.keywords,
      visualPrompt: `Foto cinematográfica de alta definição representando ${emergencyProject.name}, iluminação dramática de estúdio, design futurista e elegante para redes sociais.`,
      targetPlatform: 'Instagram & Facebook'
    }),
    modelUsed: 'emergency-safe-cache',
    versionTier: '3.5',
    totalDurationMs: Date.now() - startGlobal,
    attempts,
    antiFallActivated: true
  };
}

/**
 * Publicação e Divulgação Automática Diária de Cada Site/App do Portal Vip Brasil
 */
export async function runDailyPortalMarketingCycle(userId?: string): Promise<{
  success: boolean;
  publishedCount: number;
  totalProjects: number;
  itemsGenerated: Array<{
    projectName: string;
    headline: string;
    targetPlatform: string;
    hasApp: boolean;
    contentId: string;
    modelUsed: string;
  }>;
}> {
  const db = firestore();
  const targetUserId = userId || 'portal_vip_admin';
  const todayDate = new Date().toISOString().slice(0, 10);
  const itemsGenerated: any[] = [];

  // Carrega todos os projetos do Firestore (com auto-seeding idempotente caso a coleção esteja vazia)
  let allProjects = await listAllPortalProjectsFromDb();
  if (!allProjects.length) {
    const seeded = await seedPortalProjectsIfEmpty();
    allProjects = seeded.projects;
  }

  // Todos os projetos com dailyMarketingEnabled ativo participam integralmente do ciclo diário
  const selectedProjects = allProjects.filter((p) => p.active !== false && p.dailyMarketingEnabled !== false);
  const projectsToProcess = selectedProjects.length > 0 ? selectedProjects : allProjects;

  for (const project of projectsToProcess) {
    const prompt = `Gere uma publicação de marketing de alto impacto e engajamento para o projeto "${project.name}" do Portal Vip Brasil.
Informações Oficiais:
- Categoria: ${project.category}
- Segmento: ${project.segment}
- Website Oficial: ${project.websiteUrl}
${project.hasApp && project.playStoreUrl ? `- Aplicativo na Play Store: ${project.playStoreUrl} (${project.appTitle})` : '- Produto 100% Online'}
- Diferenciais: ${project.highlights.join(' | ')}
- Palavras-chave Bing/Google SEO: ${project.bingSeoKeywords.join(', ')}

Requisitos Estratégicos:
1. Headline irresistível para parar o feed.
2. Corpo persuasivo com storytelling e apelo emocional/prático.
3. Chamada para Ação (CTA) clara convidando a visitar o website oficial e baixar o aplicativo na Play Store (se houver).
4. 5 a 8 hashtags estratégicas com alto volume.
5. Prompt visual para imagem/vídeo promocional 9:16 e 16:9.

Responda em formato JSON com as chaves: "headline", "body", "cta", "hashtags", "keywords", "visualPrompt", "targetPlatform".`;

    const systemInstruction = `Você é o Diretor de Marketing e IA do Portal Vip Brasil. Crie publicações que maximizem cliques, downloads na Play Store e engajamento orgânico com SEO otimizado para Bing e Google.`;

    const generated = await executeAiWith2SecAntiFall({
      prompt,
      systemInstruction,
      jsonOutput: true,
      maxTokens: 2500,
      timeoutMs: 2000
    });

    let postData: any;
    try {
      postData = JSON.parse(generated.text);
    } catch {
      postData = {
        headline: `Conheça ${project.name} no Portal Vip Brasil`,
        body: `${project.description}\n\nAcesse nosso site oficial: ${project.websiteUrl}${project.hasApp && project.playStoreUrl ? `\nOu baixe na Play Store: ${project.playStoreUrl}` : ''}`,
        cta: `Visite ${project.name} e transforme seus resultados hoje mesmo!`,
        hashtags: ['#PortalVipBrasil', '#Marketing', '#Inovacao'],
        keywords: project.keywords,
        visualPrompt: `Banner de marketing profissional para ${project.name}`,
        targetPlatform: 'Instagram & Facebook'
      };
    }

    const contentId = newId('content');
    const contentDoc = {
      id: contentId,
      userId: targetUserId,
      companyId: project.id,
      type: 'post',
      title: `[Divulgação Diária] ${project.name} — ${postData.headline || project.name}`,
      headline: postData.headline,
      body: postData.body,
      cta: postData.cta,
      hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
      keywords: Array.isArray(postData.keywords) ? postData.keywords : project.keywords,
      visualPrompt: postData.visualPrompt || '',
      targetPlatform: postData.targetPlatform || 'Instagram',
      creditsUsed: 0,
      status: 'saved',
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

    // Agenda publicação automática nas redes sociais
    const scheduleId = newId('sched');
    await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
      id: scheduleId,
      userId: targetUserId,
      companyId: project.id,
      contentItemId: contentId,
      platforms: ['facebook', 'instagram', 'linkedin', 'x'],
      scheduledFor: nowIso(),
      status: 'scheduled',
      autopilotGenerated: true,
      createdAt: nowIso()
    });

    itemsGenerated.push({
      projectName: project.name,
      headline: postData.headline,
      targetPlatform: postData.targetPlatform || 'Instagram',
      hasApp: Boolean(project.hasApp),
      contentId,
      modelUsed: generated.modelUsed
    });
  }

  await createNotification({
    userId: targetUserId,
    title: 'Divulgação Diária Executada — Portal Vip Brasil',
    message: `A IA gerou e programou publicações automáticas com SEO e links dos seus projetos para as redes sociais.`,
    type: 'autopilot_ready'
  });

  return {
    success: true,
    publishedCount: itemsGenerated.length,
    totalProjects: projectsToProcess.length,
    itemsGenerated
  };
}
