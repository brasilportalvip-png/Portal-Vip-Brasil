import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Sparkles,
  TrendingUp,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Company, SeoReport } from '../types';
import { apiRequest } from '../lib/api';

interface SeoPageProps {
  selectedCompany: Company | null;
}

export const SeoPage: React.FC<SeoPageProps> = ({
  selectedCompany,
}) => {
  const [urlInput, setUrlInput] = useState(selectedCompany?.website || '');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SeoReport | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados do Motor de Ping & Sitemaps XML
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResults, setPingResults] = useState<Array<{ engine: string; url: string; success: boolean; statusCode?: number; message?: string; timestamp: string }> | null>(null);
  const [pingMessage, setPingMessage] = useState('');

  // Reset state when company changes to prevent multi-tenant data bleeding (E05)
  React.useEffect(() => {
    setUrlInput(selectedCompany?.website || '');
    setReport(null);
    setErrorMessage('');
  }, [selectedCompany?.id, selectedCompany?.website]);

  // Carrega status anterior de pings
  React.useEffect(() => {
    apiRequest<{ lastPings: any[] }>('/api/seo/ping-status')
      .then((data) => {
        if (Array.isArray(data.lastPings) && data.lastPings.length > 0) {
          setPingResults(data.lastPings);
        }
      })
      .catch(() => {});
  }, []);

  const handlePingAllEngines = async () => {
    setPingLoading(true);
    setPingMessage('');
    try {
      const data = await apiRequest<{
        message: string;
        sitemapUrl: string;
        results: Array<{ engine: string; url: string; success: boolean; statusCode?: number; message?: string; timestamp: string }>;
      }>('/api/seo/ping-all', {
        method: 'POST',
        body: { sitemapUrl: 'https://portal-vip-brasil.vercel.app/sitemap.xml' }
      });
      setPingResults(data.results);
      setPingMessage(data.message || 'Pings de indexação despachados com sucesso para todos os buscadores.');
    } catch (err: any) {
      setPingMessage(`Falha ao despachar pings: ${err.message}`);
    } finally {
      setPingLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage('Informe a URL do site a ser auditado.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const data = await apiRequest<{ report: SeoReport }>('/api/seo/analyze', {
        method: 'POST',
        body: {
          url: urlInput.trim(),
          companyId: selectedCompany?.id
        }
      });
      setReport(data.report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro durante a análise de SEO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="text-cyan-400" /> SEO Inteligente, Sitemaps XML & Pings · Portal Vip Brasil
        </h2>
        <p className="text-xs text-slate-400">
          Auditoria técnica real, indexação forçada em múltiplos buscadores (Google, Bing, IndexNow, Yandex) e verificação Yoast.
        </p>
      </div>

      {/* Central de Sitemaps XML & Ping em Múltiplos Buscadores */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1933] via-[#091122] to-[#060c18] p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
              <Globe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Central de Sitemaps XML & Ping de Indexação</h3>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  XML com Imagens Google
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Notifica imediatamente os robôs de busca sobre novos artigos, projetos e páginas com tag <code className="text-cyan-300">&lt;image:image&gt;</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            >
              Abrir sitemap.xml
            </a>
            <button
              type="button"
              onClick={handlePingAllEngines}
              disabled={pingLoading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-50"
            >
              <Sparkles size={14} className={pingLoading ? 'animate-spin' : ''} />
              {pingLoading ? 'Disparando Pings...' : 'Disparar Ping nos Buscadores'}
            </button>
          </div>
        </div>

        {pingMessage && (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-3 text-xs text-cyan-200">
            {pingMessage}
          </div>
        )}

        {/* Status dos Buscadores */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {[
            { name: 'Google Search Console', key: 'Google', endpoint: 'Ping Sitemap API & Indexing' },
            { name: 'Bing Webmaster', key: 'Bing', endpoint: 'Bing Ping API & Crawler Trigger' },
            { name: 'IndexNow Protocol', key: 'IndexNow', endpoint: 'api.indexnow.org (Bing, Yandex, Seznam)' },
            { name: 'Yandex Webmaster', key: 'Yandex', endpoint: 'Yandex Search Ping' }
          ].map((engine) => {
            const result = pingResults?.find((r) => r.engine.toLowerCase().includes(engine.key.toLowerCase()));
            const isOk = result?.success;
            return (
              <div key={engine.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{engine.name}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      result ? (isOk ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400') : 'bg-slate-600'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{engine.endpoint}</p>
                <div className="pt-1 text-[11px] font-semibold">
                  {result ? (
                    <span className={isOk ? 'text-emerald-300' : 'text-amber-300'}>
                      {isOk ? 'Notificado com sucesso' : `Código HTTP ${result.statusCode || 'alerta'}`}
                    </span>
                  ) : (
                    <span className="text-slate-500">Aguardando disparo</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-6 rounded-3xl bg-[#0F172A] border border-[#334155]">
        <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://seuprojeto.com.br"
              className="w-full bg-[#1E293B] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles size={15} /> Analisar Página
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <p className="text-xs text-rose-400 mt-3">⚠️ {errorMessage}</p>
        )}
      </div>

      {/* Report Display */}
      {report && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Score Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Score SEO Portal Vip Brasil</span>
              <h3 className="text-lg font-bold text-white truncate max-w-lg">{report.url}</h3>
              <p className="text-xs text-slate-300">
                Título detectado: &ldquo;{report.title || 'Nenhum título'}&rdquo;
              </p>
            </div>

            {/* Score Circle */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-2xl font-extrabold text-white">{report.seoScore}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold">de 100</span>
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">
                  {report.seoScore >= 80 ? 'Excelente Otimização 🟢' : report.seoScore >= 50 ? 'Oportunidades de Melhoria 🟡' : 'Crítico 🔴'}
                </span>
                <span className="text-[11px] text-slate-400">Score estrutural do Portal Vip Brasil (10 critérios HTML)</span>
              </div>
            </div>
          </div>

          {/* Criteria Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#0F172A] border border-[#334155] space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Checklist Técnico de Indexação
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Tag <title> Presente', pass: report.criteriaBreakdown.hasTitle },
                  { label: 'Comprimento Ideal do Título (30-65 chars)', pass: report.criteriaBreakdown.titleLengthValid },
                  { label: 'Meta Tag Description Presente', pass: report.criteriaBreakdown.hasDescription },
                  { label: 'Comprimento da Description (70-160 chars)', pass: report.criteriaBreakdown.descriptionLengthValid },
                  { label: 'Tag <h1> Principal Encontrada', pass: report.criteriaBreakdown.hasH1 },
                  { label: 'Estrutura de <h1> Único', pass: report.criteriaBreakdown.singleH1 },
                  { label: 'Segurança HTTPS Ativa', pass: report.criteriaBreakdown.hasHttps },
                  { label: 'Tag Canonical Configurada', pass: report.criteriaBreakdown.hasCanonical }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]">
                    <span className="text-slate-300">{item.label}</span>
                    {item.pass ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 size={13} /> Aprovado
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                        <XCircle size={13} /> Ausente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Frequency */}
            <div className="p-5 rounded-3xl bg-[#0F172A] border border-[#334155] space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Palavras-chave Mais Frequentes no Conteúdo
              </h4>
              <div className="space-y-2">
                {report.keywords.map((kw, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B] text-xs">
                    <span className="font-semibold text-white capitalize">{kw.word}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{kw.count}x ocorrências</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300">
                        {kw.density}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Actionable Recommendations */}
          <div className="p-6 rounded-3xl bg-[#0F172A] border border-cyan-500/30 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={15} className="text-cyan-400" /> Recomendações Práticas Geradas por IA
            </h4>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#1E293B] text-xs text-slate-200 flex items-start gap-2 border border-slate-700">
                  <ArrowRight size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Suggestions */}
          {report.faqSuggestions && report.faqSuggestions.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#0F172A] border border-[#334155] space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HelpCircle size={15} className="text-amber-400" /> Perguntas Frequentes (FAQ Schema) Sugeridas
              </h4>
              <div className="space-y-3">
                {report.faqSuggestions.map((faq, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#1E293B] border border-slate-700 space-y-1 text-xs">
                    <p className="font-bold text-cyan-300">Q: {faq.question}</p>
                    <p className="text-slate-300 text-[11px]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
