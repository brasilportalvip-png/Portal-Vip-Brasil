import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Smartphone,
  Monitor,
  Sparkles,
  BookOpen,
  Hash,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface YoastAuditTarget {
  title: string;
  metaDescription: string;
  slug: string;
  focusKeyword: string;
  content: string;
  faqCount?: number;
  featuredImageUrl?: string;
}

interface CheckResult {
  id: string;
  category: 'seo' | 'readability';
  title: string;
  description: string;
  status: 'good' | 'warning' | 'bad';
  score: number;
}

// Lista rica de conectivos / palavras de transição em português para critério Yoast SEO
const PORTUGUESE_TRANSITION_WORDS = [
  'além disso', 'portanto', 'contudo', 'no entanto', 'todavia', 'entretanto',
  'por outro lado', 'em primeiro lugar', 'como resultado', 'por exemplo',
  'dessa forma', 'desse modo', 'assim sendo', 'consequentemente', 'em conclusão',
  'principalmente', 'especialmente', 'sobretudo', 'com efeito', 'de fato',
  'isto é', 'ou seja', 'em suma', 'por fim', 'finalmente', 'além do mais',
  'ao mesmo tempo', 'desde que', 'embora', 'mesmo que', 'ainda que',
  'por isso', 'visto que', 'já que', 'uma vez que', 'por conseguinte'
];

export const YoastSeoAuditor: React.FC<{ target: YoastAuditTarget; siteDomain?: string }> = ({
  target,
  siteDomain = 'https://portal-vip-brasil.vercel.app'
}) => {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'seo' | 'readability'>('seo');
  const [showDetails, setShowDetails] = useState(true);

  const cleanKeyword = (target.focusKeyword || '').trim().toLowerCase();
  const title = (target.title || '').trim();
  const metaDesc = (target.metaDescription || '').trim();
  const slug = (target.slug || '').trim().toLowerCase();
  const content = (target.content || '').trim();

  const audit = useMemo(() => {
    const checks: CheckResult[] = [];
    const words = content ? content.split(/\s+/).filter(Boolean) : [];
    const totalWords = words.length;

    // === SEO CHECKS ===
    // 1. Palavra-chave foco definida
    if (!cleanKeyword) {
      checks.push({
        id: 'no-keyword',
        category: 'seo',
        title: 'Palavra-chave foco definida',
        description: 'Defina uma palavra-chave foco para habilitar a auditoria completa no padrão Yoast SEO.',
        status: 'bad',
        score: 0
      });
    } else {
      // 2. Palavra-chave no Título H1
      const titleLower = title.toLowerCase();
      if (titleLower.includes(cleanKeyword)) {
        const isNearStart = titleLower.indexOf(cleanKeyword) < 30;
        checks.push({
          id: 'kw-title',
          category: 'seo',
          title: 'Palavra-chave no Título SEO (H1)',
          description: isNearStart
            ? 'Excelente! A palavra-chave foco está no início do título.'
            : 'A palavra-chave foco está no título, mas tente posicioná-la mais no início.',
          status: isNearStart ? 'good' : 'warning',
          score: isNearStart ? 10 : 7
        });
      } else {
        checks.push({
          id: 'kw-title',
          category: 'seo',
          title: 'Palavra-chave no Título SEO (H1)',
          description: `A palavra-chave foco "${target.focusKeyword}" não foi encontrada no título principal.`,
          status: 'bad',
          score: 0
        });
      }

      // 3. Comprimento do Título
      const titleLen = title.length;
      if (titleLen >= 40 && titleLen <= 65) {
        checks.push({
          id: 'title-length',
          category: 'seo',
          title: 'Comprimento do Título SEO',
          description: `Comprimento ideal (${titleLen} caracteres). Não será truncado nos snippets do Google.`,
          status: 'good',
          score: 10
        });
      } else if (titleLen > 65) {
        checks.push({
          id: 'title-length',
          category: 'seo',
          title: 'Comprimento do Título SEO',
          description: `Título muito longo (${titleLen} caracteres). O Google trunca títulos acima de 65 caracteres.`,
          status: 'warning',
          score: 5
        });
      } else {
        checks.push({
          id: 'title-length',
          category: 'seo',
          title: 'Comprimento do Título SEO',
          description: `Título muito curto (${titleLen} caracteres). Use entre 45 e 65 caracteres para melhor CTR.`,
          status: 'warning',
          score: 5
        });
      }

      // 4. Palavra-chave no primeiro parágrafo
      const first100Words = words.slice(0, 100).join(' ').toLowerCase();
      if (first100Words.includes(cleanKeyword)) {
        checks.push({
          id: 'kw-intro',
          category: 'seo',
          title: 'Palavra-chave na Introdução',
          description: 'A palavra-chave aparece nas primeiras 100 palavras do conteúdo.',
          status: 'good',
          score: 10
        });
      } else {
        checks.push({
          id: 'kw-intro',
          category: 'seo',
          title: 'Palavra-chave na Introdução',
          description: 'A palavra-chave foco não aparece no primeiro parágrafo. Adicione-a na introdução.',
          status: 'bad',
          score: 0
        });
      }

      // 5. Palavra-chave no Slug / URL
      const slugNormalized = slug.replace(/-/g, ' ');
      if (slugNormalized.includes(cleanKeyword) || slug.includes(cleanKeyword.replace(/\s+/g, '-'))) {
        checks.push({
          id: 'kw-slug',
          category: 'seo',
          title: 'Palavra-chave no Slug amigável',
          description: 'O slug da URL contém a palavra-chave de forma limpa e otimizada.',
          status: 'good',
          score: 10
        });
      } else {
        checks.push({
          id: 'kw-slug',
          category: 'seo',
          title: 'Palavra-chave no Slug amigável',
          description: `O slug da URL (${slug || 'indefinido'}) não contém a palavra-chave foco.`,
          status: 'warning',
          score: 5
        });
      }

      // 6. Meta Description e Palavra-chave
      const metaLower = metaDesc.toLowerCase();
      const metaLen = metaDesc.length;
      if (!metaDesc) {
        checks.push({
          id: 'meta-desc',
          category: 'seo',
          title: 'Meta Descrição',
          description: 'Nenhuma meta descrição informada. O Google escolherá um trecho aleatório.',
          status: 'bad',
          score: 0
        });
      } else {
        const hasKwInMeta = metaLower.includes(cleanKeyword);
        const isIdealLength = metaLen >= 120 && metaLen <= 160;
        if (hasKwInMeta && isIdealLength) {
          checks.push({
            id: 'meta-desc',
            category: 'seo',
            title: 'Meta Descrição Otimizada',
            description: `Excelente (${metaLen} caracteres) com palavra-chave foco incluída.`,
            status: 'good',
            score: 10
          });
        } else if (hasKwInMeta) {
          checks.push({
            id: 'meta-desc',
            category: 'seo',
            title: 'Meta Descrição com Palavra-Chave',
            description: `Contém a palavra-chave, mas tamanho (${metaLen} carac.) foge do ideal (120-160).`,
            status: 'warning',
            score: 7
          });
        } else {
          checks.push({
            id: 'meta-desc',
            category: 'seo',
            title: 'Palavra-chave na Meta Descrição',
            description: 'A meta descrição não contém a palavra-chave foco.',
            status: 'warning',
            score: 5
          });
        }
      }

      // 7. Densidade da palavra-chave
      if (totalWords > 50) {
        const regex = new RegExp(cleanKeyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        const matches = (content.match(regex) || []).length;
        const density = (matches / Math.max(1, totalWords)) * 100;
        const formattedDensity = density.toFixed(1);

        if (density >= 1.0 && density <= 2.8) {
          checks.push({
            id: 'kw-density',
            category: 'seo',
            title: 'Densidade da Palavra-chave',
            description: `Densidade perfeita de ${formattedDensity}% (${matches} ocorrências). Dentro da faixa recomendada pelo Yoast (1.0% a 2.8%).`,
            status: 'good',
            score: 10
          });
        } else if (density < 1.0) {
          checks.push({
            id: 'kw-density',
            category: 'seo',
            title: 'Densidade da Palavra-chave',
            description: `Densidade baixa de ${formattedDensity}% (${matches} ocorrências). Aumente a frequência da palavra no texto para alcançar ao menos 1.0%.`,
            status: 'warning',
            score: 5
          });
        } else {
          checks.push({
            id: 'kw-density',
            category: 'seo',
            title: 'Densidade da Palavra-chave',
            description: `Densidade excessiva de ${formattedDensity}% (${matches} ocorrências). Risco de penalidade por keyword stuffing (limite Yoast 2.8%).`,
            status: 'bad',
            score: 2
          });
        }
      }

      // 8. Tamanho total do artigo
      if (totalWords >= 800) {
        checks.push({
          id: 'word-count',
          category: 'seo',
          title: 'Volume e Profundidade do Conteúdo',
          description: `Excelente volume (${totalWords} palavras). Ideal para classificação na primeira página do Google e Bing.`,
          status: 'good',
          score: 10
        });
      } else if (totalWords >= 400) {
        checks.push({
          id: 'word-count',
          category: 'seo',
          title: 'Volume do Conteúdo',
          description: `Bom volume (${totalWords} palavras). Artigos com mais de 800 palavras têm 3.5x mais links e retenção.`,
          status: 'warning',
          score: 7
        });
      } else {
        checks.push({
          id: 'word-count',
          category: 'seo',
          title: 'Volume do Conteúdo (Thin Content)',
          description: `Conteúdo muito curto (${totalWords} palavras). O mínimo recomendado é de 400 palavras.`,
          status: 'bad',
          score: 2
        });
      }

      // 9. Imagem de destaque e Alt tag
      if (target.featuredImageUrl) {
        checks.push({
          id: 'featured-image',
          category: 'seo',
          title: 'Imagem de Destaque com Alt Tag',
          description: 'Capa temática hiper-relevante configurada para Google Imagens e OpenGraph.',
          status: 'good',
          score: 10
        });
      } else {
        checks.push({
          id: 'featured-image',
          category: 'seo',
          title: 'Imagem de Destaque',
          description: 'Nenhuma imagem configurada. Posts com imagens têm 94% mais visualizações.',
          status: 'warning',
          score: 4
        });
      }
    }

    // === READABILITY CHECKS (LEGIBILIDADE YOAST) ===
    // 1. Distribuição de Subtítulos H2/H3
    const h2Matches = (content.match(/#{2,3}\s+[^\n]+/g) || []).length;
    if (h2Matches >= 3) {
      checks.push({
        id: 'headings-distribution',
        category: 'readability',
        title: 'Distribuição de Subtítulos',
        description: `Excelente estruturação com ${h2Matches} subtítulos (H2/H3), facilitando o escaneamento do leitor.`,
        status: 'good',
        score: 10
      });
    } else if (h2Matches >= 1) {
      checks.push({
        id: 'headings-distribution',
        category: 'readability',
        title: 'Distribuição de Subtítulos',
        description: `Poucos subtítulos (${h2Matches}). Divida o texto em mais seções para melhor leitura.`,
        status: 'warning',
        score: 6
      });
    } else {
      checks.push({
        id: 'headings-distribution',
        category: 'readability',
        title: 'Distribuição de Subtítulos',
        description: 'Texto sem subtítulos H2/H3. Crie seções para quebrar paredes de texto.',
        status: 'bad',
        score: 1
      });
    }

    // 2. Palavras de transição (Yoast standard: > 30% das frases)
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    let transitionCount = 0;
    if (sentences.length > 0) {
      sentences.forEach((sentence) => {
        const lowerSent = sentence.toLowerCase();
        if (PORTUGUESE_TRANSITION_WORDS.some((word) => lowerSent.includes(word))) {
          transitionCount += 1;
        }
      });
      const transitionRate = (transitionCount / sentences.length) * 100;
      if (transitionRate >= 28) {
        checks.push({
          id: 'transitions',
          category: 'readability',
          title: 'Palavras de Transição',
          description: `Excelente ritmo! ${transitionRate.toFixed(0)}% das frases contêm conectivos (padrão Yoast > 30%).`,
          status: 'good',
          score: 10
        });
      } else if (transitionRate >= 15) {
        checks.push({
          id: 'transitions',
          category: 'readability',
          title: 'Palavras de Transição',
          description: `${transitionRate.toFixed(0)}% das frases têm conectivos. Use conectivos como "além disso", "portanto", "desse modo".`,
          status: 'warning',
          score: 6
        });
      } else {
        checks.push({
          id: 'transitions',
          category: 'readability',
          title: 'Palavras de Transição',
          description: `Apenas ${transitionRate.toFixed(0)}% das frases possuem palavras de transição. Texto pode soar truncado.`,
          status: 'bad',
          score: 2
        });
      }
    }

    // 3. Tamanho dos Parágrafos
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 20);
    const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 120);
    if (longParagraphs.length === 0 && paragraphs.length > 0) {
      checks.push({
        id: 'paragraph-length',
        category: 'readability',
        title: 'Tamanho dos Parágrafos',
        description: 'Nenhum parágrafo ultrapassa 120 palavras. Leitura leve e fluida em telas mobile.',
        status: 'good',
        score: 10
      });
    } else if (longParagraphs.length <= 2) {
      checks.push({
        id: 'paragraph-length',
        category: 'readability',
        title: 'Tamanho dos Parágrafos',
        description: `${longParagraphs.length} parágrafo(s) contêm mais de 120 palavras. Quebre-os em blocos menores.`,
        status: 'warning',
        score: 6
      });
    } else {
      checks.push({
        id: 'paragraph-length',
        category: 'readability',
        title: 'Tamanho dos Parágrafos',
        description: 'Vários parágrafos são excessivamente longos. Prejudica a leitura em smartphones.',
        status: 'bad',
        score: 2
      });
    }

    // 4. Schema FAQ incluído
    if ((target.faqCount || 0) >= 2) {
      checks.push({
        id: 'faq-schema',
        category: 'seo',
        title: 'Marcação Rich Snippet FAQPage',
        description: `Artigo possui ${target.faqCount} perguntas frequentes prontas para ganhar Rich Snippets expansíveis no Google.`,
        status: 'good',
        score: 10
      });
    }

    // Calcular pontuação final
    const seoChecks = checks.filter((c) => c.category === 'seo');
    const readabilityChecks = checks.filter((c) => c.category === 'readability');

    const totalPossibleSeo = Math.max(1, seoChecks.length * 10);
    const totalSeoEarned = seoChecks.reduce((acc, c) => acc + c.score, 0);
    const seoScore = Math.min(100, Math.round((totalSeoEarned / totalPossibleSeo) * 100));

    const totalPossibleRead = Math.max(1, readabilityChecks.length * 10);
    const totalReadEarned = readabilityChecks.reduce((acc, c) => acc + c.score, 0);
    const readabilityScore = Math.min(100, Math.round((totalReadEarned / totalPossibleRead) * 100));

    return {
      checks,
      seoScore,
      readabilityScore,
      totalWords,
      seoChecks,
      readabilityChecks
    };
  }, [cleanKeyword, title, metaDesc, slug, content, target.focusKeyword, target.featuredImageUrl, target.faqCount]);

  const getScoreTrafficLight = (score: number) => {
    if (score >= 80) return { color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40', label: 'Excelente (Verde)' };
    if (score >= 55) return { color: 'text-amber-400 bg-amber-500/20 border-amber-500/40', label: 'Bom com Melhorias (Laranja)' };
    return { color: 'text-rose-400 bg-rose-500/20 border-rose-500/40', label: 'Atenção Necessária (Vermelho)' };
  };

  const seoTraffic = getScoreTrafficLight(audit.seoScore);
  const readTraffic = getScoreTrafficLight(audit.readabilityScore);

  return (
    <div className="rounded-3xl border border-cyan-500/25 bg-[#0a1122] p-5 md:p-7 shadow-2xl space-y-6">
      {/* Cabeçalho do Auditor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">Auditoria SEO & Legibilidade</h3>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                Padrão Yoast / RankMath
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Análise técnica em tempo real com farol de pontuação, densidade e prévia de SERP Google.
            </p>
          </div>
        </div>

        {/* Faróis de Pontuação (Semáforo Yoast) */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 ${seoTraffic.color}`}>
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${audit.seoScore >= 80 ? 'bg-emerald-400' : audit.seoScore >= 55 ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${audit.seoScore >= 80 ? 'bg-emerald-500' : audit.seoScore >= 55 ? 'bg-amber-500' : 'bg-rose-500'}`} />
            </span>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Score SEO</div>
              <div className="text-sm font-black">{audit.seoScore}/100</div>
            </div>
          </div>

          <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 ${readTraffic.color}`}>
            <span className="relative flex h-3 w-3">
              <span className={`relative inline-flex rounded-full h-3 w-3 ${audit.readabilityScore >= 80 ? 'bg-emerald-500' : audit.readabilityScore >= 55 ? 'bg-amber-500' : 'bg-rose-500'}`} />
            </span>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Legibilidade</div>
              <div className="text-sm font-black">{audit.readabilityScore}/100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prévia Google SERP Snippet */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Eye size={15} className="text-cyan-400" /> Prévia do Snippet no Google
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                previewDevice === 'mobile' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={13} /> Mobile
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                previewDevice === 'desktop' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={13} /> Desktop
            </button>
          </div>
        </div>

        {/* Visual do Snippet */}
        <div className={`rounded-xl border border-slate-800 bg-[#1e222d] p-4 font-sans ${previewDevice === 'mobile' ? 'max-w-md mx-auto shadow-lg' : ''}`}>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-300">P</span>
            <span className="truncate">{siteDomain.replace('https://', '')} › blog › {slug || 'artigo'}</span>
          </div>
          <h4 className="text-base font-medium text-[#8ab4f8] hover:underline cursor-pointer leading-snug line-clamp-2">
            {title || 'Título do Artigo Otimizado para SEO'}
          </h4>
          <p className="text-xs text-[#bdc1c6] mt-1.5 leading-relaxed line-clamp-3">
            {metaDesc || 'Adicione uma meta descrição persuasiva contendo a palavra-chave foco para atrair cliques orgânicos qualificados na busca.'}
          </p>
        </div>
      </div>

      {/* Alternador de Auditorias: SEO vs Legibilidade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'seo'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Critérios de SEO ({audit.seoChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('readability')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'readability'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Legibilidade & Ritmo ({audit.readabilityChecks.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
        >
          {showDetails ? 'Recolher' : 'Expandir'} checklist {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Lista de Verificações com Semáforo Yoast */}
      {showDetails && (
        <div className="space-y-2.5">
          {(activeTab === 'seo' ? audit.seoChecks : audit.readabilityChecks).map((chk) => (
            <div
              key={chk.id}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                chk.status === 'good'
                  ? 'border-emerald-500/25 bg-emerald-950/20 text-slate-200'
                  : chk.status === 'warning'
                  ? 'border-amber-500/25 bg-amber-950/20 text-slate-200'
                  : 'border-rose-500/25 bg-rose-950/20 text-slate-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {chk.status === 'good' && <CheckCircle2 size={17} className="text-emerald-400" />}
                {chk.status === 'warning' && <AlertTriangle size={17} className="text-amber-400" />}
                {chk.status === 'bad' && <XCircle size={17} className="text-rose-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{chk.title}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      chk.status === 'good'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : chk.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {chk.status === 'good' ? 'Aprovado' : chk.status === 'warning' ? 'Melhorar' : 'Crítico'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{chk.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
