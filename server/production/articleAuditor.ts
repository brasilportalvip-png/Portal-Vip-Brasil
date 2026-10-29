/**
 * ARTICLE AUDITOR ENGINE — PORTAL VIP BRASIL
 * 
 * Auditoria integral não-destrutiva de acervos de artigos (450+ artigos).
 * Analisa profundidade de conteúdo, SEO padrão Yoast, conformidade temática,
 * integridade visual, detecção de duplicatas e ausência de contaminação cruzada.
 * 
 * DIRETRIZ SEO REALISTA:
 * O Google não possui algoritmo de contagem fixa de palavras nem aplica
 * 'penalização automática por ter menos de 350 palavras'. O foco do Google
 * Helpful Content e EEAT é a utilidade e resposta completa à intenção de busca.
 * 
 * NUNCA deleta artigos de forma destrutiva. Gera diagnósticos acionáveis,
 * backups de versão e propostas de consolidação 301.
 */

import { COLLECTIONS, firestore, nowIso, newId } from './store.js';

export type ArticleAuditStatus = 
  | 'APPROVED_HIGH_QUALITY'
  | 'ACTIONABLE_REVISION_NEEDED'
  | 'SUBSTANCE_REVISION_NEEDED'
  | 'CROSS_NICHE_VIOLATION';

export type ArticleActionClassification =
  | 'MANTER'
  | 'MELHORAR'
  | 'REESCREVER'
  | 'CONSOLIDAR'
  | 'AVALIAR_DESINDEXACAO';

export interface ArticleDuplicateFlags {
  isDuplicateTitle: boolean;
  isDuplicateSlug: boolean;
  isDuplicateCoverImage: boolean;
  duplicateCoverCount: number;
}

export interface CanonicalProposal {
  canonicalUrl: string;
  redirect301Proposed: boolean;
  reason: string;
}

export interface ArticleAuditResult {
  articleId: string;
  sourceCollection: 'blogArticles' | 'blogPosts' | 'initialSeed';
  slug: string;
  title: string;
  projectId?: string;
  relatedProjectName?: string;
  wordCount: number;
  score: number; // 0 a 100
  status: ArticleAuditStatus;
  classification: ArticleActionClassification;
  canonicalProposal?: CanonicalProposal;
  yoastSeoChecks: {
    hasTitleKeyword: boolean;
    hasMetaDescription: boolean;
    metaDescriptionLengthOk: boolean;
    hasProperHeadings: boolean;
    hasFaqSection: boolean;
    hasCallToAction: boolean;
  };
  visualIntegrity: {
    hasCoverImage: boolean;
    isGenericLogo: boolean;
    isThematicMatch: boolean;
    coverUrl: string;
    warning?: string;
  };
  crossNicheContamination: {
    detected: boolean;
    violatingTerms: string[];
    explanation?: string;
  };
  duplicateFlags: ArticleDuplicateFlags;
  actionableSuggestions: string[];
  auditedAt: string;
}

export interface GlobalArticlesAuditSummary {
  totalAudited: number;
  blogArticlesCount: number;
  blogPostsCount: number;
  initialSeedCount: number;
  approvedCount: number;
  revisionNeededCount: number;
  substanceNeededCount: number;
  crossNicheViolationCount: number;
  duplicateTitlesCount: number;
  duplicateCoversCount: number;
  averageWordCount: number;
  averageScore: number;
  genericCoverImageCount: number;
  classificationBreakdown: {
    manter: number;
    melhorar: number;
    reescrever: number;
    consolidar: number;
    avaliarDesindexacao: number;
  };
  auditedAt: string;
  items: ArticleAuditResult[];
}

/**
 * Termos que configuram contaminação grave quando aparecem fora de seu nicho litúrgico.
 */
export const NICHE_PROHIBITED_TERMS: Record<string, string[]> = {
  proj_manual_catolico: [
    'tarot', 'baralho cigano', 'runa', 'futhark', 'exu', 'pombagira',
    'amarração amorosa', 'feitiço', 'magia negra', 'ocultismo'
  ],
  proj_exu_responde: [
    'diabo', 'demônio', 'satã', 'satanás', 'lucifer', 'amarração destrutiva',
    'santo terço', 'evangelho do dia'
  ],
  proj_maria_padilha: [
    'trago seu amor em 24h', 'amarração definitiva', 'magia negra destruidora',
    'diabo', 'demônio', 'satã'
  ],
  proj_oraculos: [
    'manual católico', 'santo terço', 'santa missa', 'cnbb', 'diabo bíblico'
  ],
  proj_froc_ia: [
    'amarração', 'feitiço', 'orixá', 'santo padroeiro', 'terço'
  ],
  proj_froc_marketing_engine: [
    'amarração', 'feitiço', 'orixá', 'rezar terço'
  ]
};

/**
 * Normaliza texto para comparação semântica e deduplicação no idioma português.
 */
export function normalizeTextForDeduplication(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Audita um artigo individual com base em critérios técnicos reais de SEO,
 * sem mitos de contagem arbitrária de palavras.
 */
export async function auditSingleArticle(
  article: any,
  context?: {
    sourceCollection?: 'blogArticles' | 'blogPosts' | 'initialSeed';
    seenTitles?: Map<string, { count: number; primaryArticleId: string; slug: string }>;
    seenSlugs?: Map<string, number>;
    seenCovers?: Map<string, number>;
    baseUrl?: string;
  }
): Promise<ArticleAuditResult> {
  const articleId = String(article.id || article.slug || 'unknown');
  const sourceCollection = context?.sourceCollection || article.sourceCollection || 'blogArticles';
  const title = String(article.title || '').trim();
  const slug = String(article.slug || '').trim();
  const projectId = String(article.projectId || article.relatedProjectId || '');
  const primaryKeyword = String(article.primaryKeyword || '').toLowerCase().trim();
  const metaDescription = String(article.metaDescription || article.summary || '').trim();
  const coverImage = String(article.coverImage || article.featuredImageUrl || '').trim();
  const baseUrl = context?.baseUrl || 'https://portal-vip-brasil.vercel.app';

  // 1. Extração de texto e contagem
  let fullText = `${title} ${metaDescription} ${article.excerpt || ''} ${article.introduction || ''} ${article.conclusion || ''} ${article.callToAction || ''}`;
  
  if (Array.isArray(article.sections)) {
    for (const sec of article.sections) {
      fullText += ` ${sec.h2 || ''} ${sec.content || ''}`;
      if (Array.isArray(sec.h3s)) {
        for (const h3 of sec.h3s) {
          fullText += ` ${h3.h3 || ''} ${h3.content || ''}`;
        }
      }
    }
  }

  if (article.content && typeof article.content === 'string') {
    fullText += ` ${article.content}`;
  }

  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 2. Yoast SEO Checks
  const normalizedTitle = title.toLowerCase();
  const normalizedKeyword = primaryKeyword || normalizedTitle.split(' ').slice(0, 3).join(' ');
  const hasTitleKeyword = normalizedTitle.includes(normalizedKeyword);
  const hasMetaDescription = metaDescription.length > 0;
  const metaDescriptionLengthOk = metaDescription.length >= 100 && metaDescription.length <= 180;
  const hasProperHeadings = (Array.isArray(article.sections) && article.sections.length >= 2) || /<h[23]/i.test(article.content || '');
  const hasFaqSection = Array.isArray(article.faqSection) && article.faqSection.length > 0;
  const hasCallToAction = Boolean(article.callToAction && String(article.callToAction).length > 15);

  // 3. Integridade Visual
  const hasCoverImage = Boolean(coverImage && (coverImage.startsWith('http') || coverImage.startsWith('/')));
  const isGenericLogo = coverImage.includes('/icons/logo.png') || coverImage.includes('portal-vip-logo.png');
  const isThematicMatch = hasCoverImage && !isGenericLogo;
  let visualWarning: string | undefined;
  if (!hasCoverImage) visualWarning = 'Artigo sem imagem de capa definida.';
  else if (isGenericLogo) visualWarning = 'Artigo utilizando logotipo genérico do portal como imagem de capa.';

  // 4. Verificação de Contaminação Cruzada
  const lowerFullText = fullText.toLowerCase();
  const prohibitedList = projectId ? NICHE_PROHIBITED_TERMS[projectId] || [] : [];
  const violatingTerms: string[] = [];

  for (const term of prohibitedList) {
    if (lowerFullText.includes(term.toLowerCase())) {
      violatingTerms.push(term);
    }
  }

  const crossNicheDetected = violatingTerms.length > 0;

  // 5. Verificação de Duplicatas
  const normTitle = normalizeTextForDeduplication(title);
  const normTitleCompact = normTitle.replace(/\s+/g, '');
  const normSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

  const rawTitleVal = (context?.seenTitles as any)?.get(normTitle) ?? (context?.seenTitles as any)?.get(normTitleCompact);
  const titleOccurrences = typeof rawTitleVal === 'number'
    ? rawTitleVal
    : (rawTitleVal?.count || 1);

  const rawSlugVal = (context?.seenSlugs as any)?.get(normSlug);
  const slugOccurrences = typeof rawSlugVal === 'number'
    ? rawSlugVal
    : (rawSlugVal?.count || 1);

  const rawCoverVal = coverImage ? (context?.seenCovers as any)?.get(coverImage) : 1;
  const coverOccurrences = typeof rawCoverVal === 'number'
    ? rawCoverVal
    : (rawCoverVal?.count || 1);

  const duplicateFlags: ArticleDuplicateFlags = {
    isDuplicateTitle: titleOccurrences > 1,
    isDuplicateSlug: slugOccurrences > 1,
    isDuplicateCoverImage: coverOccurrences > 1 && !isGenericLogo,
    duplicateCoverCount: coverOccurrences
  };

  // 6. Pontuação Ponderada (0 a 100) — Foco em Qualidade Real
  let score = 0;
  if (wordCount >= 1000) score += 30;
  else if (wordCount >= 600) score += 25;
  else if (wordCount >= 300) score += 20;
  else score += 10;

  if (hasTitleKeyword) score += 15;
  if (hasMetaDescription && metaDescriptionLengthOk) score += 15;
  else if (hasMetaDescription) score += 8;
  if (hasProperHeadings) score += 15;
  if (hasFaqSection) score += 15;
  if (hasCallToAction) score += 10;

  if (isGenericLogo) score = Math.max(0, score - 20);
  if (crossNicheDetected) score = Math.max(0, score - 40);
  if (duplicateFlags.isDuplicateTitle) score = Math.max(0, score - 20);
  if (duplicateFlags.isDuplicateCoverImage) score = Math.max(0, score - 15);

  // 7. Determinação de Status e Classificação Editorial Obrigatória
  let status: ArticleAuditStatus = 'APPROVED_HIGH_QUALITY';
  let classification: ArticleActionClassification = 'MANTER';
  const actionableSuggestions: string[] = [];
  let canonicalProposal: CanonicalProposal | undefined;

  if (crossNicheDetected) {
    status = 'CROSS_NICHE_VIOLATION';
    classification = 'REESCREVER';
    actionableSuggestions.push(`Remover termos indevidos do nicho (${violatingTerms.join(', ')}) para manter a pureza temática e o respeito cultural.`);
  } else if (duplicateFlags.isDuplicateTitle && rawTitleVal && typeof rawTitleVal === 'object' && rawTitleVal.primaryArticleId && rawTitleVal.primaryArticleId !== articleId) {
    classification = 'CONSOLIDAR';
    canonicalProposal = {
      canonicalUrl: `${baseUrl}/blog/${rawTitleVal.slug || slug}`,
      redirect301Proposed: true,
      reason: `Duplicata exata de pauta/título. Consolidar na URL canônica /blog/${rawTitleVal.slug || slug} via 301.`
    };
    actionableSuggestions.push(`Canibalização de SEO com artigo idêntico (${rawTitleVal.primaryArticleId}). Proposta consolidação canônica para ${canonicalProposal.canonicalUrl}.`);
  } else if (wordCount < 150 && !hasProperHeadings) {
    status = 'SUBSTANCE_REVISION_NEEDED';
    classification = 'AVALIAR_DESINDEXACAO';
    actionableSuggestions.push('Conteúdo com profundidade insuficiente (<150 palavras) e sem subtítulos. Avaliar desindexação ou reescrita profunda.');
  } else if (wordCount < 300) {
    status = 'SUBSTANCE_REVISION_NEEDED';
    classification = 'REESCREVER';
    actionableSuggestions.push('Expandir a profundidade do artigo com seções temáticas para responder plenamente à intenção de busca do leitor (Helpful Content).');
  } else if (score < 70 || isGenericLogo || !metaDescriptionLengthOk || duplicateFlags.isDuplicateTitle) {
    status = 'ACTIONABLE_REVISION_NEEDED';
    classification = 'MELHORAR';
  } else {
    classification = 'MANTER';
  }

  if (isGenericLogo) {
    actionableSuggestions.push('Substituir o logotipo genérico por uma imagem temática exclusiva do nicho em alta definição.');
  }
  if (duplicateFlags.isDuplicateTitle && classification !== 'CONSOLIDAR') {
    actionableSuggestions.push('Título idêntico a outro artigo existente. Diferencie o título para evitar canibalização de palavras-chave.');
  }
  if (duplicateFlags.isDuplicateCoverImage) {
    actionableSuggestions.push(`Imagem de capa repetida em ${coverOccurrences} artigos. Utilize fotografia ou arte exclusiva do nicho.`);
  }
  if (!metaDescriptionLengthOk) {
    actionableSuggestions.push('Ajustar a meta-descrição para o padrão Yoast de 120 a 160 caracteres com a palavra-chave foco.');
  }
  if (!hasProperHeadings) {
    actionableSuggestions.push('Estruturar o artigo com subtítulos H2 e H3 claros para melhorar a legibilidade e escaneabilidade.');
  }
  if (!hasFaqSection) {
    actionableSuggestions.push('Adicionar seção de Perguntas Frequentes (FAQ) com marcação Schema.org para elegibilidade a rich snippets no Google.');
  }
  if (!hasCallToAction) {
    actionableSuggestions.push('Incluir Chamada para Ação (CTA) clara direcionando para o site ou app oficial do projeto.');
  }

  return {
    articleId,
    sourceCollection,
    slug,
    title,
    projectId,
    relatedProjectName: article.relatedProjectName || article.category,
    wordCount,
    score,
    status,
    classification,
    canonicalProposal,
    yoastSeoChecks: {
      hasTitleKeyword,
      hasMetaDescription,
      metaDescriptionLengthOk,
      hasProperHeadings,
      hasFaqSection,
      hasCallToAction
    },
    visualIntegrity: {
      hasCoverImage,
      isGenericLogo,
      isThematicMatch,
      coverUrl: coverImage,
      warning: visualWarning
    },
    crossNicheContamination: {
      detected: crossNicheDetected,
      violatingTerms,
      explanation: crossNicheDetected ? `Artigo do projeto "${projectId}" contém termos proibidos: ${violatingTerms.join(', ')}` : undefined
    },
    duplicateFlags,
    actionableSuggestions,
    auditedAt: nowIso()
  };
}

/**
 * Gate de Qualidade Editorial Obrigatório.
 * Bloqueia a publicação de artigos com contaminação de nicho ou imagem genérica.
 */
export async function verifyArticleQualityGate(article: any): Promise<ArticleAuditResult> {
  const audit = await auditSingleArticle(article);
  if (audit.status === 'CROSS_NICHE_VIOLATION') {
    const error: any = new Error(`Qualidade Editorial Reprovada: Contaminação de nicho detectada (${audit.crossNicheContamination.violatingTerms.join(', ')}). Conteúdo bloqueado.`);
    error.statusCode = 422;
    error.audit = audit;
    throw error;
  }
  if (audit.visualIntegrity.isGenericLogo) {
    const error: any = new Error('Qualidade Editorial Reprovada: O artigo não pode utilizar o logotipo genérico do portal como imagem de capa. Utilize imagem exclusiva do nicho.');
    error.statusCode = 422;
    error.audit = audit;
    throw error;
  }
  return audit;
}

/**
 * Cria snapshot de backup e histórico de versão de um artigo antes de qualquer alteração.
 */
export async function backupArticleVersion(
  articleId: string,
  collection: string,
  articleData: any,
  reason = 'manual_or_automated_audit_edit'
): Promise<string> {
  const db = firestore();
  const versionId = newId('ver');
  const now = nowIso();

  await db.collection(COLLECTIONS.articleVersions).doc(versionId).set({
    versionId,
    articleId,
    collection,
    snapshot: articleData,
    reason,
    createdAt: now
  });

  return versionId;
}

/**
 * Varre todo o acervo no Firestore e gera relatório consolidado sem deletar nada.
 * Inventaria 100% dos documentos com paginação real e sem limite arbitrário de 500.
 */
export async function auditAllStoredArticles(options: {
  persistDiagnostics?: boolean;
  createBackupBeforePersist?: boolean;
} = {}): Promise<GlobalArticlesAuditSummary> {
  const db = firestore();

  // 1. Busca integral paginada em lotes para suportar acervos de 450+ a milhares de artigos
  const fetchAllFromCollection = async (colName: string): Promise<any[]> => {
    const docs: any[] = [];
    const BATCH_SIZE = 500;
    let lastDoc: any = null;
    let hasMore = true;

    while (hasMore) {
      let q = db.collection(colName).limit(BATCH_SIZE);
      if (lastDoc && typeof q.startAfter === 'function') {
        q = q.startAfter(lastDoc);
      }
      const snap = await q.get().catch(() => ({ docs: [] } as any));
      if (!snap || !snap.docs || snap.docs.length === 0) {
        hasMore = false;
        break;
      }
      for (const d of snap.docs) {
        docs.push({ id: d.id, sourceCollection: colName, ...d.data() });
      }
      if (snap.docs.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        lastDoc = snap.docs[snap.docs.length - 1];
      }
    }
    return docs;
  };

  const [blogArticlesList, blogPostsList] = await Promise.all([
    fetchAllFromCollection(COLLECTIONS.blogArticles),
    fetchAllFromCollection(COLLECTIONS.blogPosts)
  ]);

  // Inventaria integralmente cada registro por coleção e ID
  const allArticles: any[] = [...blogArticlesList, ...blogPostsList];

  // Mapa de duplicatas globais com registro de ID primário para proposta canônica 301
  const seenTitles = new Map<string, { count: number; primaryArticleId: string; slug: string }>();
  const seenSlugs = new Map<string, number>();
  const seenCovers = new Map<string, number>();

  for (const art of allArticles) {
    const t = normalizeTextForDeduplication(art.title);
    const s = String(art.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const c = String(art.coverImage || art.featuredImageUrl || '').trim();

    if (t) {
      const existing = seenTitles.get(t);
      if (!existing) {
        seenTitles.set(t, { count: 1, primaryArticleId: art.id, slug: art.slug || '' });
      } else {
        existing.count += 1;
      }
    }
    if (s) seenSlugs.set(s, (seenSlugs.get(s) || 0) + 1);
    if (c) seenCovers.set(c, (seenCovers.get(c) || 0) + 1);
  }

  const results: ArticleAuditResult[] = [];
  let approvedCount = 0;
  let revisionNeededCount = 0;
  let substanceNeededCount = 0;
  let crossNicheViolationCount = 0;
  let genericCoverCount = 0;
  let duplicateTitlesCount = 0;
  let duplicateCoversCount = 0;
  let totalWords = 0;
  let totalScore = 0;

  const classificationBreakdown = {
    manter: 0,
    melhorar: 0,
    reescrever: 0,
    consolidar: 0,
    avaliarDesindexacao: 0
  };

  for (const art of allArticles) {
    const audit = await auditSingleArticle(art, {
      sourceCollection: art.sourceCollection,
      seenTitles,
      seenSlugs,
      seenCovers
    });
    results.push(audit);

    if (audit.status === 'APPROVED_HIGH_QUALITY') approvedCount++;
    else if (audit.status === 'ACTIONABLE_REVISION_NEEDED') revisionNeededCount++;
    else if (audit.status === 'SUBSTANCE_REVISION_NEEDED') substanceNeededCount++;
    else if (audit.status === 'CROSS_NICHE_VIOLATION') crossNicheViolationCount++;

    if (audit.classification === 'MANTER') classificationBreakdown.manter++;
    else if (audit.classification === 'MELHORAR') classificationBreakdown.melhorar++;
    else if (audit.classification === 'REESCREVER') classificationBreakdown.reescrever++;
    else if (audit.classification === 'CONSOLIDAR') classificationBreakdown.consolidar++;
    else if (audit.classification === 'AVALIAR_DESINDEXACAO') classificationBreakdown.avaliarDesindexacao++;

    if (audit.visualIntegrity.isGenericLogo) genericCoverCount++;
    if (audit.duplicateFlags.isDuplicateTitle) duplicateTitlesCount++;
    if (audit.duplicateFlags.isDuplicateCoverImage) duplicateCoversCount++;

    totalWords += audit.wordCount;
    totalScore += audit.score;

    if (options.persistDiagnostics && art.id) {
      const targetCol = art.sourceCollection === COLLECTIONS.blogPosts
        ? COLLECTIONS.blogPosts
        : COLLECTIONS.blogArticles;

      if (options.createBackupBeforePersist) {
        await backupArticleVersion(art.id, targetCol, art, 'audit_diagnostics_persist').catch(() => undefined);
      }

      await db.collection(targetCol).doc(art.id).set({
        auditScore: audit.score,
        auditStatus: audit.status,
        auditClassification: audit.classification,
        canonicalProposal: audit.canonicalProposal || null,
        auditSuggestions: audit.actionableSuggestions,
        lastAuditedAt: audit.auditedAt,
        isGenericCoverFlagged: audit.visualIntegrity.isGenericLogo,
        crossNicheFlagged: audit.crossNicheContamination.detected,
        isDuplicateTitleFlagged: audit.duplicateFlags.isDuplicateTitle
      }, { merge: true }).catch(() => undefined);
    }
  }

  const count = results.length || 1;
  return {
    totalAudited: results.length,
    blogArticlesCount: blogArticlesList.length,
    blogPostsCount: blogPostsList.length,
    initialSeedCount: 0,
    approvedCount,
    revisionNeededCount,
    substanceNeededCount,
    crossNicheViolationCount,
    duplicateTitlesCount,
    duplicateCoversCount,
    genericCoverImageCount: genericCoverCount,
    averageWordCount: Math.round(totalWords / count),
    averageScore: Math.round(totalScore / count),
    classificationBreakdown,
    auditedAt: nowIso(),
    items: results
  };
}
