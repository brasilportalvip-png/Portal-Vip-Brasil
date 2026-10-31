import { firestore, COLLECTIONS, nowIso, newId } from './store.js';
import { isGlobalAutomationEnabled } from './automationGate.js';
import {
  auditSingleArticle,
  backupArticleVersion,
  verifyArticleQualityGate,
  normalizeTextForDeduplication,
  NICHE_PROHIBITED_TERMS
} from './articleAuditor.js';
import { resolveThematicCoverForProject } from './blogEngine.js';
import { getPortalProjectFromDb, PORTAL_VIP_PROJECTS } from './almaPortfolio.js';

export interface ArticleRecoveryItemProgress {
  articleId: string;
  sourceCollection: string;
  slug: string;
  title: string;
  projectId: string;
  actionTaken: 'HEALED_SUPERFICIAL' | 'REWRITTEN_SUBSTANTIAL' | 'SKIPPED_ALREADY_HIGH_QUALITY' | 'FAILED_GATE';
  originalScore: number;
  newScore: number;
  backupVersionId: string;
  beforeSnippet: string;
  afterSnippet: string;
  qualityGateApproved: boolean;
  rejectionReasons?: string[];
  healedAt: string;
}

export interface ArticleRecoveryBatchResult {
  success: boolean;
  batchSize: number;
  processedCount: number;
  healedCount: number;
  rewrittenCount: number;
  skippedCount: number;
  failedCount: number;
  items: ArticleRecoveryItemProgress[];
  nextCursor?: string | null;
  hasMore: boolean;
  error?: string;
  timestamp: string;
}

export interface ArticleInventoryStats {
  totalArticlesFound: number;
  blogArticlesCount: number;
  blogPostsCount: number;
  needsHealCount: number;
  needsRewriteCount: number;
  alreadyHighQualityCount: number;
  inventoriedAt: string;
}

/**
 * Inventaria 100% dos artigos no Firestore com paginação real por cursor sem limite arbitrário.
 * Fail-Closed: se houver falha de leitura em qualquer lote, LANÇA EXCEÇÃO e interrompe o inventário.
 * Nunca converte erro de leitura em lista vazia.
 */
export async function inventoryAllArticlesFailClosed(): Promise<{
  allArticles: any[];
  stats: ArticleInventoryStats;
}> {
  const db = firestore();

  const fetchCollectionPaging = async (collectionName: string): Promise<any[]> => {
    const list: any[] = [];
    const BATCH_SIZE = 500;
    let lastDoc: any = null;
    let hasMore = true;

    while (hasMore) {
      let q = db.collection(collectionName).limit(BATCH_SIZE);
      if (lastDoc && typeof q.startAfter === 'function') {
        q = q.startAfter(lastDoc);
      }

      // FAIL-CLOSED: Qualquer erro no get() interrompe imediatamente o inventário
      const snap = await q.get();
      if (!snap || !snap.docs || snap.docs.length === 0) {
        hasMore = false;
        break;
      }

      for (const d of snap.docs) {
        list.push({ id: d.id, sourceCollection: collectionName, ...d.data() });
      }

      if (snap.docs.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        lastDoc = snap.docs[snap.docs.length - 1];
      }
    }

    return list;
  };

  // Executa leituras das coleções oficiais com fail-closed
  const [blogArticles, blogPosts] = await Promise.all([
    fetchCollectionPaging(COLLECTIONS.blogArticles),
    fetchCollectionPaging(COLLECTIONS.blogPosts)
  ]);

  const allArticles = [...blogArticles, ...blogPosts];

  let needsHealCount = 0;
  let needsRewriteCount = 0;
  let alreadyHighQualityCount = 0;

  for (const art of allArticles) {
    const audit = await auditSingleArticle(art, { sourceCollection: art.sourceCollection });
    if (audit.classification === 'MANTER' || audit.status === 'APPROVED_HIGH_QUALITY') {
      alreadyHighQualityCount++;
    } else if (audit.classification === 'MELHORAR') {
      needsHealCount++;
    } else {
      needsRewriteCount++;
    }
  }

  return {
    allArticles,
    stats: {
      totalArticlesFound: allArticles.length,
      blogArticlesCount: blogArticles.length,
      blogPostsCount: blogPosts.length,
      needsHealCount,
      needsRewriteCount,
      alreadyHighQualityCount,
      inventoriedAt: nowIso()
    }
  };
}

/**
 * Executa lote controlado de recuperação de artigos antigos.
 * Respeita o Master ON/OFF: se estiver OFF, bloqueia imediatamente com status 423.
 * Grava backup recuperável antes de qualquer alteração no documento.
 * Valida a nova versão no Quality Gate de 8 pilares antes de persistir.
 */
export async function recoverArticleBatch(options: {
  batchSize?: number;
  userId?: string;
  startCursor?: string;
  onlyNeedsAction?: boolean;
} = {}): Promise<ArticleRecoveryBatchResult> {
  const isMasterOn = await isGlobalAutomationEnabled(options.userId);
  if (!isMasterOn) {
    return {
      success: false,
      batchSize: 0,
      processedCount: 0,
      healedCount: 0,
      rewrittenCount: 0,
      skippedCount: 0,
      failedCount: 0,
      items: [],
      hasMore: false,
      error: 'Automação bloqueada pelo interruptor Mestre (Master OFF - Custo Zero Ativo). Nenhuma recuperação paga permitida.',
      timestamp: nowIso()
    };
  }

  const { allArticles } = await inventoryAllArticlesFailClosed();
  const limit = Math.max(1, Math.min(25, Number(options.batchSize) || 5));

  let startIndex = 0;
  if (options.startCursor) {
    const foundIdx = allArticles.findIndex((a) => a.id === options.startCursor);
    if (foundIdx >= 0) startIndex = foundIdx + 1;
  }

  const slice = allArticles.slice(startIndex, startIndex + limit);
  const items: ArticleRecoveryItemProgress[] = [];
  let healedCount = 0;
  let rewrittenCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const db = firestore();

  for (const art of slice) {
    const targetCol = art.sourceCollection || COLLECTIONS.blogArticles;
    const initialAudit = await auditSingleArticle(art, { sourceCollection: targetCol });

    // Se já estiver com qualidade aprovada e sem contaminações, preserva
    if (initialAudit.classification === 'MANTER' && initialAudit.status === 'APPROVED_HIGH_QUALITY' && options.onlyNeedsAction !== false) {
      skippedCount++;
      items.push({
        articleId: art.id,
        sourceCollection: targetCol,
        slug: art.slug || '',
        title: art.title || '',
        projectId: art.projectId || art.relatedProjectId || '',
        actionTaken: 'SKIPPED_ALREADY_HIGH_QUALITY',
        originalScore: initialAudit.score,
        newScore: initialAudit.score,
        backupVersionId: '',
        beforeSnippet: String(art.content || art.excerpt || '').slice(0, 150),
        afterSnippet: String(art.content || art.excerpt || '').slice(0, 150),
        qualityGateApproved: true,
        healedAt: nowIso()
      });
      continue;
    }

    // 1. Grava snapshot recuperável em articleVersions ANTES de alterar
    const backupVersionId = await backupArticleVersion(
      art.id,
      targetCol,
      art,
      `batch_recovery_pre_heal_${initialAudit.classification}`
    );

    const foundProject = await getPortalProjectFromDb(art.projectId || art.relatedProjectId || 'proj_portal_vip_magazine')
      .catch(() => null);
    const project = foundProject || PORTAL_VIP_PROJECTS.find((p) => p.id === (art.projectId || art.relatedProjectId)) || PORTAL_VIP_PROJECTS[0];
    const projectName = project?.name || 'Portal Vip Brasil';
    const projectSegment = project?.segment || 'Comunicação e Conteúdo';
    const projectId = project?.id || 'proj_portal_vip_magazine';

    const thematic = resolveThematicCoverForProject(
      projectId,
      art.title,
      art.slug,
      art.id,
      art.category
    );

    // 2. Prepara versão candidata
    const candidateArticle = {
      ...art,
      updatedAt: nowIso(),
      lastHealedAt: nowIso(),
      healedVersionId: backupVersionId
    };

    // Ajusta capa se for genérica ou inexistente
    if (initialAudit.visualIntegrity.isGenericLogo || !candidateArticle.coverImage) {
      candidateArticle.coverImage = thematic.url;
      candidateArticle.coverAlt = thematic.alt;
    }

    // Higieniza termos proibidos de nicho
    const prohibitedTerms = NICHE_PROHIBITED_TERMS[projectId] || [];
    for (const term of prohibitedTerms) {
      const reg = new RegExp(`\\b${term}\\b`, 'gi');
      candidateArticle.title = (candidateArticle.title || '').replace(reg, projectName);
      candidateArticle.excerpt = (candidateArticle.excerpt || '').replace(reg, projectName);
      if (typeof candidateArticle.content === 'string') {
        candidateArticle.content = candidateArticle.content.replace(reg, projectName);
      }
    }

    // Meta description derivada do próprio conteúdo (nunca um texto padrão repetido em todos os artigos)
    if (!candidateArticle.metaDescription || candidateArticle.metaDescription.length < 60) {
      const source = [candidateArticle.excerpt, candidateArticle.introduction, ...(Array.isArray(candidateArticle.sections) ? candidateArticle.sections.map((s: any) => s?.content) : []), typeof candidateArticle.content === 'string' ? candidateArticle.content : '']
        .filter(Boolean).join(' ').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim();
      if (source.length >= 60) candidateArticle.metaDescription = source.slice(0, 157).replace(/\s+\S*$/, '') + '…';
    }

    // Não injetamos seções/CTA genéricos: texto padrão repetido em centenas de páginas é
    // conteúdo duplicado para o Google. Artigos rasos são reprovados no gate e ficam para reescrita real.

    // 3. Validação no Quality Gate Obrigatório (8 Pilares)
    const gateEval = await verifyArticleQualityGate(candidateArticle, {
      projectId: project.id,
      failClosedOnGateError: true
    });

    const beforeSnippet = String(art.content || art.excerpt || '').slice(0, 160);
    const afterSnippet = String(candidateArticle.content || candidateArticle.sections?.[0]?.content || '').slice(0, 160);

    if (gateEval.approved) {
      // Quality Gate Aprovou: grava no Firestore com segurança e preserva ID e slug
      candidateArticle.qualityGateScore = gateEval.score;
      candidateArticle.qualityGateStatus = 'APPROVED_HIGH_QUALITY';
      candidateArticle.lastGateEvaluatedAt = nowIso();

      await db.collection(targetCol).doc(art.id).set(candidateArticle, { merge: true });

      const isSubstantial = initialAudit.classification === 'REESCREVER';
      if (isSubstantial) rewrittenCount++;
      else healedCount++;

      items.push({
        articleId: art.id,
        sourceCollection: targetCol,
        slug: art.slug || '',
        title: candidateArticle.title || '',
        projectId: project.id,
        actionTaken: isSubstantial ? 'REWRITTEN_SUBSTANTIAL' : 'HEALED_SUPERFICIAL',
        originalScore: initialAudit.score,
        newScore: gateEval.score,
        backupVersionId,
        beforeSnippet,
        afterSnippet,
        qualityGateApproved: true,
        healedAt: nowIso()
      });
    } else {
      // Quality Gate Reprovou: preserva o TEXTO original (sem enchimento) e aplica somente correções seguras
      // de metadados/capa, marcando o artigo para reescrita editorial real. Nunca despublica.
      const safeFixes: Record<string, any> = {
        lastHealedAt: nowIso(),
        healedVersionId: backupVersionId,
        needsEditorialRewrite: true,
        editorialRewriteReasons: gateEval.rejectionReasons.slice(0, 10),
        updatedAt: nowIso()
      };
      if (candidateArticle.coverImage && candidateArticle.coverImage !== art.coverImage) {
        safeFixes.coverImage = candidateArticle.coverImage;
        safeFixes.coverAlt = candidateArticle.coverAlt;
      }
      if (candidateArticle.metaDescription && candidateArticle.metaDescription !== art.metaDescription) {
        safeFixes.metaDescription = candidateArticle.metaDescription;
      }
      await db.collection(targetCol).doc(art.id).set(safeFixes, { merge: true });
      failedCount++;
      items.push({
        articleId: art.id,
        sourceCollection: targetCol,
        slug: art.slug || '',
        title: art.title || '',
        projectId: project.id,
        actionTaken: 'FAILED_GATE',
        originalScore: initialAudit.score,
        newScore: gateEval.score,
        backupVersionId,
        beforeSnippet,
        afterSnippet: 'Texto preservado (sem enchimento); capa/metadados corrigidos e artigo marcado para reescrita editorial.',
        qualityGateApproved: false,
        rejectionReasons: gateEval.rejectionReasons,
        healedAt: nowIso()
      });
    }
  }

  // Persiste checkpoint inequívoco no Firestore para retomada segura
  const lastProcessedItem = items[items.length - 1];
  const nextCursor = (slice.length === limit && lastProcessedItem) ? lastProcessedItem.articleId : null;
  const hasMore = Boolean(nextCursor && (startIndex + limit < allArticles.length));

  try {
    if (lastProcessedItem) {
      await db.collection(COLLECTIONS.systemSettings).doc('article_recovery_checkpoint').set({
        lastArticleId: lastProcessedItem.articleId,
        lastCollection: lastProcessedItem.sourceCollection,
        totalProcessed: (startIndex + items.length),
        healedCount,
        rewrittenCount,
        failedCount,
        updatedAt: nowIso()
      }, { merge: true });
    }
  } catch (chkErr) {
    console.warn('[ArticleRecovery] Aviso ao salvar checkpoint no Firestore:', chkErr);
  }

  return {
    success: true,
    batchSize: limit,
    processedCount: items.length,
    healedCount,
    rewrittenCount,
    skippedCount,
    failedCount,
    items,
    nextCursor,
    hasMore,
    timestamp: nowIso()
  };
}
