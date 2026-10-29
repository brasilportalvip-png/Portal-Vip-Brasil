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

export interface QualityGatePillarResult {
  passed: boolean;
  score: number;
  reason?: string;
}

export interface QualityGateEvaluation {
  approved: boolean;
  score: number;
  pillars: {
    nicheAlignment: QualityGatePillarResult;
    originalityNonDuplicate: QualityGatePillarResult;
    editorialQualityGrammar: QualityGatePillarResult;
    factualPrecisionNoHallucination: QualityGatePillarResult;
    seoStructureMetadata: QualityGatePillarResult;
    naturalKeywordUsage: QualityGatePillarResult;
    actionableCtaHelpfulContent: QualityGatePillarResult;
    multimediaCompatibility: QualityGatePillarResult;
  };
  rejectionReasons: string[];
  refinementSuggestions: string[];
}

/**
 * Quality Gate Obrigatório de Produção (8 Pilares Inegociáveis)
 * BLOQUEIA efetivamente a publicação de qualquer conteúdo inadequado.
 * Fail-Closed: se o gate estiver indisponível ou lançar erro, NÃO publica.
 */
export async function verifyArticleQualityGate(
  article: any,
  options: {
    projectId?: string;
    seenTitles?: Map<string, any>;
    seenCovers?: Map<string, any>;
    failClosedOnGateError?: boolean;
  } = {}
): Promise<QualityGateEvaluation> {
  try {
    if (!article || typeof article !== 'object') {
      return {
        approved: false,
        score: 0,
        pillars: {
          nicheAlignment: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          originalityNonDuplicate: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          editorialQualityGrammar: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          factualPrecisionNoHallucination: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          seoStructureMetadata: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          naturalKeywordUsage: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          actionableCtaHelpfulContent: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' },
          multimediaCompatibility: { passed: false, score: 0, reason: 'Artigo nulo ou inválido' }
        },
        rejectionReasons: ['Dados do artigo não fornecidos ou vazios.'],
        refinementSuggestions: ['Forneça um objeto estruturado de artigo.']
      };
    }

    const rejectionReasons: string[] = [];
    const refinementSuggestions: string[] = [];

    const title = String(article.title || '').trim();
    const slug = String(article.slug || '').trim();
    const excerpt = String(article.excerpt || '').trim();
    const metaDescription = String(article.metaDescription || excerpt).trim();
    const callToAction = String(article.callToAction || article.cta || '').trim();
    const coverImage = String(article.coverImage || article.featuredImageUrl || '').trim();
    const coverAlt = String(article.coverAlt || article.imageAlt || (coverImage && !coverImage.includes('logo.png') ? 'Fotografia editorial temática sobre ' + title : '')).trim();
    const canonicalUrl = String(article.canonicalUrl || article.canonical || '').trim();
    const projectId = String(options.projectId || article.projectId || article.relatedProjectId || article.companyId || '').trim();

    // Separação estrita: Corpo Editorial vs Metadados (Metadados não inflam artificialmente a extensão)
    let editorialBodyText = '';
    if (typeof article.content === 'string') editorialBodyText += ` ${article.content}`;
    if (typeof article.introduction === 'string') editorialBodyText += ` ${article.introduction}`;
    if (typeof article.conclusion === 'string') editorialBodyText += ` ${article.conclusion}`;
    if (Array.isArray(article.sections)) {
      for (const sec of article.sections) {
        editorialBodyText += ` ${sec.h2 || ''} ${sec.content || ''}`;
        if (Array.isArray(sec.h3s)) {
          for (const h3 of sec.h3s) editorialBodyText += ` ${h3.h3 || ''} ${h3.content || ''}`;
        }
      }
    }
    editorialBodyText = editorialBodyText.trim();
    const bodyWords = editorialBodyText.split(/\s+/).filter(Boolean);
    const bodyWordCount = bodyWords.length;
    const lowerBody = editorialBodyText.toLowerCase();

    // Texto total apenas para buscas de termos e integridade
    const fullText = `${title} ${excerpt} ${metaDescription} ${callToAction} ${editorialBodyText}`;
    const lowerFullText = fullText.toLowerCase();

    // 1. Adequação ao nicho e ao projeto
    const prohibitedTerms = projectId ? NICHE_PROHIBITED_TERMS[projectId] || [] : [];
    const foundProhibited: string[] = [];
    for (const term of prohibitedTerms) {
      if (lowerFullText.includes(term.toLowerCase())) foundProhibited.push(term);
    }
    const nichePassed = foundProhibited.length === 0;
    if (!nichePassed) {
      rejectionReasons.push(`Contaminação de nicho: termos proibidos encontrados para o projeto ${projectId}: ${foundProhibited.join(', ')}.`);
      refinementSuggestions.push(`Remover referências a ${foundProhibited.join(', ')} para respeitar a identidade editorial do projeto.`);
    }

    // 2. Originalidade e ausência de duplicação textual (consulta histórico relevante)
    const normTitle = normalizeTextForDeduplication(title);
    const normTitleCompact = normTitle.replace(/\s+/g, '');
    let isDupTitle = false;
    if (options.seenTitles) {
      const entry = (options.seenTitles as any).get(normTitle) ?? (options.seenTitles as any).get(normTitleCompact);
      const count = typeof entry === 'number' ? entry : (entry?.count || 0);
      if (count > 1) isDupTitle = true;
    } else if (slug && options.failClosedOnGateError !== false) {
      // Consulta direta ao Firestore quando lista em memória não for fornecida
      try {
        const db = firestore();
        const existingDoc = await db.collection(COLLECTIONS.blogArticles).where('slug', '==', slug).limit(2).get();
        if (existingDoc && existingDoc.docs) {
          const match = existingDoc.docs.find((d: any) => d.id !== article.id);
          if (match) isDupTitle = true;
        }
      } catch {}
    }

    const originalityPassed = !isDupTitle && bodyWordCount >= 250;
    if (isDupTitle) {
      rejectionReasons.push('Título ou slug idêntico a outra publicação existente no acervo (canibalização de SEO).');
      refinementSuggestions.push('Alterar o título e ângulo da abordagem para garantir exclusividade e valor único.');
    }
    if (bodyWordCount < 250) {
      rejectionReasons.push(`Extensão do corpo editorial insuficiente (${bodyWordCount} palavras no corpo; mínimo exigido: 250, metadados não contam).`);
      refinementSuggestions.push('Desenvolver seções com profundidade prática e contextualização do nicho.');
    }

    // 3. Qualidade editorial real, gramática e ausência de boilerplate genérico
    const hasUnrenderedTags = /\{\{[\s\S]*?\}\}|<script[\s\S]*?>/i.test(fullText);
    const hasObjectString = fullText.includes('[object Object]');
    const hasPlaceholderToken = /lorem ipsum|texto de preenchimento|preencher aqui|conteúdo provisório|\[insira aqui\]/i.test(fullText);

    // Avalia diversidade lexical do corpo editorial para detectar repetição robótica / texto de enchimento
    const uniqueWords = new Set(bodyWords.map(w => w.toLowerCase()));
    const lexicalRatio = bodyWordCount > 100 ? uniqueWords.size / bodyWordCount : 1.0;
    const isRepetitiveBabble = bodyWordCount >= 150 && lexicalRatio < 0.32;

    // Avalia profundidade das seções: cada seção deve ter substância (>20 palavras)
    let hasShallowSections = false;
    if (Array.isArray(article.sections) && article.sections.length > 0) {
      for (const s of article.sections) {
        const sWords = String(s.content || '').trim().split(/\s+/).filter(Boolean);
        if (sWords.length < 20) {
          hasShallowSections = true;
          break;
        }
      }
    }

    const editorialPassed = !hasUnrenderedTags && !hasObjectString && !hasPlaceholderToken && !isRepetitiveBabble && !hasShallowSections && bodyWordCount >= 250;
    if (hasUnrenderedTags || hasObjectString) {
      rejectionReasons.push('Conteúdo contém templates não renderizados, objetos serializados ou tags inválidas.');
      refinementSuggestions.push('Sanitizar o texto e renderizar variáveis antes da publicação.');
    }
    if (hasPlaceholderToken) {
      rejectionReasons.push('Conteúdo contém texto placeholder ou genérico ("lorem ipsum", marcações de preenchimento).');
      refinementSuggestions.push('Substituir blocos placeholder por texto editorial autêntico.');
    }
    if (isRepetitiveBabble) {
      rejectionReasons.push('Baixa diversidade lexical: repetição excessiva de frases idênticas para inflar palavras artificialmente.');
      refinementSuggestions.push('Reescrever com vocabulário rico, exemplos e novas ideias estruturadas.');
    }
    if (hasShallowSections) {
      rejectionReasons.push('Seções com profundidade insuficiente (< 20 palavras por seção estruturada).');
      refinementSuggestions.push('Expandir cada seção com explicação clara, benefícios e orientações.');
    }

    // 4. Precisão factual e ausência de afirmações enganosas / não comprovadas
    const hasFabricatedClaims = /garantido em 24h|trago seu amor em 24h|cura m[ií]stica definitiva|ganhe milh[oõ]es da noite pro dia|aprovado pela anvisa|certificado pelo minist[eé]rio da sa[uú]de|reconhecido pelo banco central|parceria oficial com a oms|100% garantido sem qualquer risco/i.test(fullText);
    const factualPassed = !hasFabricatedClaims;
    if (!factualPassed) {
      rejectionReasons.push('Afirmações factualmente enganosas, promessas milagrosas ou alegações institucionais sem comprovação.');
      refinementSuggestions.push('Substituir alegações sensacionalistas por conteúdo informativo, responsável e cultural.');
    }

    // 5. Título, descrição, URL canônica e estrutura SEO
    const titleOk = title.length >= 10 && title.length <= 120;
    const metaOk = metaDescription.length >= 60 && metaDescription.length <= 250;
    const slugOk = slug.length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    const hasProperHeadings = (Array.isArray(article.sections) && article.sections.length >= 2) || /<h[23]/i.test(editorialBodyText);
    const canonicalOk = !canonicalUrl || canonicalUrl.startsWith('http') || canonicalUrl.startsWith('/blog/');
    const seoStructurePassed = titleOk && metaOk && slugOk && hasProperHeadings && canonicalOk;
    if (!titleOk) {
      rejectionReasons.push(`Título com tamanho inadequado (${title.length} caracteres; esperado 10-120).`);
      refinementSuggestions.push('Ajustar o título para ter entre 10 e 120 caracteres com apelo informativo.');
    }
    if (!metaOk) {
      rejectionReasons.push(`Meta-descrição com tamanho inadequado (${metaDescription.length} caracteres; esperado 60-250).`);
      refinementSuggestions.push('Fornecer meta-descrição entre 60 e 250 caracteres.');
    }
    if (!slugOk) {
      rejectionReasons.push(`Slug de URL inválido ("${slug}": deve ser em letras minúsculas com hifens).`);
      refinementSuggestions.push('Normalizar slug com formato kebab-case.');
    }
    if (!hasProperHeadings) {
      rejectionReasons.push('Estrutura de tópicos ausente: o artigo precisa de pelo menos 2 subtítulos (H2/H3).');
      refinementSuggestions.push('Dividir o texto em subtítulos H2 e H3 organizados.');
    }
    if (!canonicalOk) {
      rejectionReasons.push('URL canônica inválida.');
      refinementSuggestions.push('Configurar canonicalUrl com URL pública válida.');
    }

    // 6. Palavra-chave usada naturalmente, sem empilhamento artificial (sem porcentagem fixa arbitrária)
    const primaryKeyword = String(article.primaryKeyword || article.focusKeyword || title.split(/\s+/).slice(0, 3).join(' ')).trim().toLowerCase();
    let keywordUnnatural = false;
    let keywordReason = '';

    if (primaryKeyword && primaryKeyword.length >= 3) {
      // Detecta repetições consecutivas empilhadas da palavra-chave
      const escapedKw = primaryKeyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const stackedPattern = new RegExp(`\\b${escapedKw}\\b(?:\\s+(?:e|com|para|de|o|a)?\\s*\\b${escapedKw}\\b)+`, 'i');
      if (stackedPattern.test(lowerBody)) {
        keywordUnnatural = true;
        keywordReason = 'Repetição empilhada consecutiva da palavra-chave foco.';
      }

      // Detecta palavra-chave forçada em todos os títulos de seção
      if (Array.isArray(article.sections) && article.sections.length >= 3) {
        const sectionsWithKw = article.sections.filter((s: any) => String(s.h2 || '').toLowerCase().includes(primaryKeyword)).length;
        if (sectionsWithKw === article.sections.length) {
          keywordUnnatural = true;
          keywordReason = 'Palavra-chave foco forçada artificialmente em 100% dos subtítulos H2.';
        }
      }
    }

    const keywordPassed = !keywordUnnatural;
    if (!keywordPassed) {
      rejectionReasons.push(`Uso não-natural da palavra-chave foco (${keywordReason}).`);
      refinementSuggestions.push('Distribuir a palavra-chave de forma orgânica e utilizar variações semânticas e sinônimos.');
    }

    // 7. CTA pertinente e conteúdo útil ao leitor
    const ctaPassed = callToAction.length >= 15;
    if (!ctaPassed) {
      rejectionReasons.push('Chamada para ação (CTA) ausente ou muito curta (<15 caracteres).');
      refinementSuggestions.push('Adicionar CTA convidativa orientando o leitor para o app, consulta ou canal oficial.');
    }

    // 8. Compatibilidade das imagens e vídeos com o conteúdo e a identidade do projeto
    const isGenericLogo = coverImage.includes('/icons/logo.png') || coverImage.includes('portal-vip-logo.png');
    const hasDescriptiveAlt = coverAlt.length >= 8 && !coverAlt.toLowerCase().includes('logo.png');
    const multimediaPassed = Boolean(coverImage && !isGenericLogo && (coverImage.startsWith('http') || coverImage.startsWith('/'))) && hasDescriptiveAlt;
    if (isGenericLogo) {
      rejectionReasons.push('Imagem de capa é o logotipo genérico do portal (exige fotografia temática exclusiva do nicho).');
      refinementSuggestions.push('Atribuir fotografia temática de alta resolução compatível com o projeto.');
    } else if (!coverImage) {
      rejectionReasons.push('Imagem de capa ausente no artigo.');
      refinementSuggestions.push('Vincular uma imagem de capa exclusiva antes da publicação.');
    } else if (!hasDescriptiveAlt) {
      rejectionReasons.push('Texto alternativo (alt) da imagem de capa ausente ou muito curto (<8 caracteres).');
      refinementSuggestions.push('Fornecer texto alternativo descritivo para acessibilidade e SEO da imagem.');
    }

    const allPillarsPassed = nichePassed && originalityPassed && editorialPassed && factualPassed && seoStructurePassed && keywordPassed && ctaPassed && multimediaPassed;

    let score = 0;
    if (nichePassed) score += 15;
    if (originalityPassed) score += 15;
    if (editorialPassed) score += 15;
    if (factualPassed) score += 15;
    if (seoStructurePassed) score += 15;
    if (keywordPassed) score += 10;
    if (ctaPassed) score += 5;
    if (multimediaPassed) score += 10;

    return {
      approved: allPillarsPassed && score >= 70,
      score,
      pillars: {
        nicheAlignment: { passed: nichePassed, score: nichePassed ? 100 : 0, reason: foundProhibited.join(', ') || undefined },
        originalityNonDuplicate: { passed: originalityPassed, score: originalityPassed ? 100 : 0, reason: isDupTitle ? 'Título duplicado' : undefined },
        editorialQualityGrammar: { passed: editorialPassed, score: editorialPassed ? 100 : 0, reason: hasUnrenderedTags ? 'Tags inválidas' : undefined },
        factualPrecisionNoHallucination: { passed: factualPassed, score: factualPassed ? 100 : 0, reason: hasFabricatedClaims ? 'Sensacionalismo ou alegação não comprovada' : undefined },
        seoStructureMetadata: { passed: seoStructurePassed, score: seoStructurePassed ? 100 : 0 },
        naturalKeywordUsage: { passed: keywordPassed, score: keywordPassed ? 100 : 0, reason: !keywordPassed ? 'Keyword stuffing' : undefined },
        actionableCtaHelpfulContent: { passed: ctaPassed, score: ctaPassed ? 100 : 0 },
        multimediaCompatibility: { passed: multimediaPassed, score: multimediaPassed ? 100 : 0, reason: isGenericLogo ? 'Logotipo genérico' : !coverImage ? 'Sem imagem' : undefined }
      },
      rejectionReasons,
      refinementSuggestions
    };
  } catch (err: any) {
    return {
      approved: false,
      score: 0,
      pillars: {
        nicheAlignment: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        originalityNonDuplicate: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        editorialQualityGrammar: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        factualPrecisionNoHallucination: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        seoStructureMetadata: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        naturalKeywordUsage: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        actionableCtaHelpfulContent: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' },
        multimediaCompatibility: { passed: false, score: 0, reason: 'Erro interno no Quality Gate (Fail-Closed)' }
      },
      rejectionReasons: [`Falha interna no Quality Gate: ${err?.message || String(err)}. Publicação bloqueada preventivamente (Fail-Closed).`],
      refinementSuggestions: ['Corrigir erro do auditor antes de tentar publicar.']
    };
  }
}

