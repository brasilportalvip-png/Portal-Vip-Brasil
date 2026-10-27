/**
 * ARTICLE AUDITOR ENGINE — PORTAL VIP BRASIL
 * 
 * Auditoria integral não-destrutiva de acervos de artigos (450+ artigos).
 * Analisa profundidade de conteúdo, SEO padrão Yoast, conformidade temática,
 * integridade visual e ausência de contaminação cruzada entre nichos.
 * 
 * NUNCA deleta artigos de forma destrutiva. Gera diagnósticos acionáveis
 * e marcações no banco para revisão humana ou regeneração orientada.
 */

import { COLLECTIONS, firestore, nowIso, queryData } from './store.js';
import { getMasterBrandDossier, CANONICAL_BRAND_DOSSIERS } from './brandDossiers.js';

export type ArticleAuditStatus = 
  | 'APPROVED_HIGH_QUALITY'
  | 'ACTIONABLE_REVISION_NEEDED'
  | 'THIN_CONTENT_REWRITE'
  | 'CROSS_NICHE_VIOLATION';

export interface ArticleAuditResult {
  articleId: string;
  slug: string;
  title: string;
  projectId?: string;
  relatedProjectName?: string;
  wordCount: number;
  score: number; // 0 a 100
  status: ArticleAuditStatus;
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
  actionableSuggestions: string[];
  auditedAt: string;
}

export interface GlobalArticlesAuditSummary {
  totalAudited: number;
  approvedCount: number;
  revisionNeededCount: number;
  thinContentCount: number;
  crossNicheViolationCount: number;
  averageWordCount: number;
  averageScore: number;
  genericCoverImageCount: number;
  auditedAt: string;
  items: ArticleAuditResult[];
}

/**
 * Palavras e termos que configuram contaminação grave quando aparecem em nichos divergentes.
 */
const NICHE_PROHIBITED_TERMS: Record<string, string[]> = {
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
 * Audita um artigo individual com base nas melhores práticas do Yoast SEO,
 * densidade textual e limites éticos e visuais de nicho.
 */
export async function auditSingleArticle(article: any): Promise<ArticleAuditResult> {
  const articleId = String(article.id || article.slug || 'unknown');
  const title = String(article.title || '').trim();
  const slug = String(article.slug || '').trim();
  const projectId = String(article.projectId || article.relatedProjectId || '');
  const primaryKeyword = String(article.primaryKeyword || '').toLowerCase().trim();
  const metaDescription = String(article.metaDescription || article.summary || '').trim();
  const coverImage = String(article.coverImage || article.featuredImageUrl || '').trim();

  // 1. Cálculo de densidade textual e contagem de palavras
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

  // 3. Verificação de Integridade Visual
  const hasCoverImage = Boolean(coverImage && coverImage.startsWith('http') || coverImage.startsWith('/'));
  const isGenericLogo = coverImage.includes('/icons/logo.png') || coverImage.includes('portal-vip-logo.png');
  const isThematicMatch = hasCoverImage && !isGenericLogo;
  let visualWarning: string | undefined;
  if (!hasCoverImage) visualWarning = 'Artigo sem imagem de capa definida.';
  else if (isGenericLogo) visualWarning = 'Artigo utilizando logotipo genérico do portal como capa.';

  // 4. Verificação de Contaminação Cruzada de Nicho
  const lowerFullText = fullText.toLowerCase();
  const prohibitedList = projectId ? NICHE_PROHIBITED_TERMS[projectId] || [] : [];
  const violatingTerms: string[] = [];

  for (const term of prohibitedList) {
    if (lowerFullText.includes(term.toLowerCase())) {
      violatingTerms.push(term);
    }
  }

  const crossNicheDetected = violatingTerms.length > 0;

  // 5. Pontuação Ponderada (0 a 100)
  let score = 0;
  if (wordCount >= 1000) score += 35;
  else if (wordCount >= 600) score += 25;
  else if (wordCount >= 300) score += 15;
  else score += 5;

  if (hasTitleKeyword) score += 15;
  if (hasMetaDescription && metaDescriptionLengthOk) score += 15;
  else if (hasMetaDescription) score += 8;
  if (hasProperHeadings) score += 15;
  if (hasFaqSection) score += 10;
  if (hasCallToAction) score += 10;

  if (isGenericLogo) score = Math.max(0, score - 20);
  if (crossNicheDetected) score = Math.max(0, score - 35);

  // 6. Determinação de Status
  let status: ArticleAuditStatus = 'APPROVED_HIGH_QUALITY';
  const actionableSuggestions: string[] = [];

  if (crossNicheDetected) {
    status = 'CROSS_NICHE_VIOLATION';
    actionableSuggestions.push(`Remover termos indevidos do nicho (${violatingTerms.join(', ')}) para manter a pureza temática.`);
  } else if (wordCount < 350) {
    status = 'THIN_CONTENT_REWRITE';
    actionableSuggestions.push(`Expandir o conteúdo (atualmente com ${wordCount} palavras). Artigos com menos de 350 palavras são penalizados pelo Google Helpful Content.`);
  } else if (score < 70 || isGenericLogo || !metaDescriptionLengthOk) {
    status = 'ACTIONABLE_REVISION_NEEDED';
  }

  if (isGenericLogo) {
    actionableSuggestions.push('Substituir o logotipo genérico por uma imagem temática exclusiva do nicho em alta definição.');
  }
  if (!metaDescriptionLengthOk) {
    actionableSuggestions.push('Ajustar a meta-descrição para o padrão Yoast de 120 a 160 caracteres.');
  }
  if (!hasProperHeadings) {
    actionableSuggestions.push('Estruturar o artigo com subtítulos H2 e H3 claros para melhorar a legibilidade e escaneabilidade.');
  }
  if (!hasFaqSection) {
    actionableSuggestions.push('Adicionar uma seção de Perguntas Frequentes (FAQ) com marcação estruturada Schema.org.');
  }
  if (!hasCallToAction) {
    actionableSuggestions.push('Incluir uma Chamada para Ação (CTA) clara direcionando para o site ou app oficial do projeto.');
  }

  return {
    articleId,
    slug,
    title,
    projectId,
    relatedProjectName: article.relatedProjectName || article.category,
    wordCount,
    score,
    status,
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
    actionableSuggestions,
    auditedAt: nowIso()
  };
}

/**
 * Varre todo o acervo de artigos no Firestore e gera relatório consolidado.
 * Permite persistir os diagnósticos nos documentos dos artigos sem deletar nada.
 */
export async function auditAllStoredArticles(options: { persistDiagnostics?: boolean } = {}): Promise<GlobalArticlesAuditSummary> {
  const db = firestore();
  
  // Consulta de artigos armazenados em ambas as coleções históricas
  const [blogArticlesSnap, blogPostsSnap] = await Promise.all([
    db.collection(COLLECTIONS.blogArticles).get().catch(() => ({ docs: [] } as any)),
    db.collection(COLLECTIONS.blogPosts).get().catch(() => ({ docs: [] } as any))
  ]);

  const allArticles: any[] = [];
  const seenIds = new Set<string>();

  for (const doc of [...blogArticlesSnap.docs, ...blogPostsSnap.docs]) {
    if (!seenIds.has(doc.id)) {
      seenIds.add(doc.id);
      allArticles.push({ id: doc.id, ...doc.data() });
    }
  }

  const results: ArticleAuditResult[] = [];
  let approvedCount = 0;
  let revisionNeededCount = 0;
  let thinContentCount = 0;
  let crossNicheViolationCount = 0;
  let genericCoverCount = 0;
  let totalWords = 0;
  let totalScore = 0;

  for (const art of allArticles) {
    const audit = await auditSingleArticle(art);
    results.push(audit);

    if (audit.status === 'APPROVED_HIGH_QUALITY') approvedCount++;
    else if (audit.status === 'ACTIONABLE_REVISION_NEEDED') revisionNeededCount++;
    else if (audit.status === 'THIN_CONTENT_REWRITE') thinContentCount++;
    else if (audit.status === 'CROSS_NICHE_VIOLATION') crossNicheViolationCount++;

    if (audit.visualIntegrity.isGenericLogo) genericCoverCount++;
    totalWords += audit.wordCount;
    totalScore += audit.score;

    // Se solicitado, grava os metadados de auditoria no documento do Firestore
    if (options.persistDiagnostics && art.id) {
      const targetCol = blogArticlesSnap.docs.some((d: any) => d.id === art.id)
        ? COLLECTIONS.blogArticles
        : COLLECTIONS.blogPosts;

      await db.collection(targetCol).doc(art.id).set({
        auditScore: audit.score,
        auditStatus: audit.status,
        auditSuggestions: audit.actionableSuggestions,
        lastAuditedAt: audit.auditedAt,
        isGenericCoverFlagged: audit.visualIntegrity.isGenericLogo,
        crossNicheFlagged: audit.crossNicheContamination.detected
      }, { merge: true }).catch(() => undefined);
    }
  }

  const count = results.length || 1;
  return {
    totalAudited: results.length,
    approvedCount,
    revisionNeededCount,
    thinContentCount,
    crossNicheViolationCount,
    genericCoverImageCount: genericCoverCount,
    averageWordCount: Math.round(totalWords / count),
    averageScore: Math.round(totalScore / count),
    auditedAt: nowIso(),
    items: results
  };
}
