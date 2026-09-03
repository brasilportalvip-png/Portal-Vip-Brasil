import React, { useEffect, useMemo, useState } from 'react';
import {
  FileCheck2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Cookie,
  UserCheck,
  Smartphone,
  Copy,
  Check,
  Printer,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Server,
  Cpu,
  Database,
  Globe,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { BRAND } from '../lib/brand';

const SUPPORT_EMAIL = 'brasilportalvip@gmail.com';
const PORTAL_CANONICAL_URL = 'https://portalvipbrasil.com.br';
const LAST_UPDATED = '03 de Setembro de 2026';

export type LegalTabType = 'privacidade' | 'termos' | 'cookies' | 'lgpd' | 'apps-compliance';

interface LegalPageProps {
  initialSection?: string;
  onNavigate?: (tab: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ initialSection, onNavigate }) => {
  const detectTabFromLocation = (): LegalTabType => {
    const path = (typeof window !== 'undefined' ? window.location.pathname : '').toLowerCase();
    if (path.includes('privacidade') || path.includes('privacy')) return 'privacidade';
    if (path.includes('cookie')) return 'cookies';
    if (path.includes('exclusao') || path.includes('lgpd') || path.includes('deletion')) return 'lgpd';
    if (path.includes('app') || path.includes('play')) return 'apps-compliance';
    if (path.includes('termo') || path.includes('terms')) return 'termos';
    if (initialSection) {
      if (initialSection.includes('privacidade')) return 'privacidade';
      if (initialSection.includes('cookie')) return 'cookies';
      if (initialSection.includes('lgpd') || initialSection.includes('exclusao')) return 'lgpd';
      if (initialSection.includes('app')) return 'apps-compliance';
    }
    return 'privacidade';
  };

  const [activeTab, setActiveTab] = useState<LegalTabType>(detectTabFromLocation);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Sync state with URL if browser back/forward is used
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(detectTabFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchTab = (tab: LegalTabType) => {
    setActiveTab(tab);
    const targetPath =
      tab === 'privacidade'
        ? '/privacidade'
        : tab === 'termos'
        ? '/termos'
        : tab === 'cookies'
        ? '/cookies'
        : tab === 'lgpd'
        ? '/exclusao-de-dados'
        : '/apps-compliance';

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyCurrentPageUrl = () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const copyDeletionTemplate = () => {
    const template = `Assunto: Solicitação de Exclusão de Dados Pessoais - LGPD (Portal Vip Brasil)

À atenção do Encarregado de Proteção de Dados (DPO) - Portal Vip Brasil:
E-mail do DPO: ${SUPPORT_EMAIL}

Eu, [SEU NOME COMPLETO], titular da conta associada ao e-mail [SEU E-MAIL CADASTRADO], venho por meio desta solicitar a confirmação, eliminação definitiva dos meus dados pessoais cadastrados e encerramento da conta, nos termos do Art. 18, inciso VI da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).

Aplicativos / Serviços utilizados (marcar se aplicável):
[ ] Portal Vip Brasil (Web / Plataforma)
[ ] Magia das Crenças (Site / App Google Play)
[ ] Exu Responde (Site / App Google Play)
[ ] Maria Padilha Rainha (Site / App Google Play)
[ ] Manual Católico (Site / App Google Play)
[ ] Frocia / Oráculos / Froc IA Marketing Engine

Data da solicitação: ${new Date().toLocaleDateString('pt-BR')}
Assinatura / Nome do Titular: ____________________________________`;

    navigator.clipboard?.writeText(template);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fadeIn pb-16 px-3 sm:px-6">
      {/* Header Institucional */}
      <header className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 md:p-10 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Transparência Jurídica & LGPD • {BRAND.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Portal Jurídico, Privacidade & Termos Oficiais
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Diretrizes de proteção de dados, termos de uso, conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), políticas para aplicativos Google Play Store e diretrizes de inteligência artificial.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>📅 Última revisão: <strong className="text-slate-200">{LAST_UPDATED}</strong></span>
              <span>•</span>
              <span>🔒 Comunicação protegida por HTTPS/TLS</span>
            </div>
          </div>

          {/* Action Buttons: Copiar Link & Imprimir */}
          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              onClick={copyCurrentPageUrl}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all shadow-sm"
              title="Copiar URL para vincular ao Google Play Console ou redes sociais"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'URL Copiada!' : 'Copiar Link Desta Página'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Switcher Navigation */}
      <div className="sticky top-16 z-30 bg-[#070B14]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
        <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
          <button
            onClick={() => switchTab('privacidade')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'privacidade'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LockKeyhole className="w-4 h-4" />
            <span>Política de Privacidade (LGPD)</span>
          </button>

          <button
            onClick={() => switchTab('termos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'termos'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>

          <button
            onClick={() => switchTab('cookies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'cookies'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Cookies & Armazenamento</span>
          </button>

          <button
            onClick={() => switchTab('lgpd')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'lgpd'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Direitos LGPD & Exclusão de Dados</span>
          </button>

          <button
            onClick={() => switchTab('apps-compliance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'apps-compliance'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Conformidade Google Play Store</span>
          </button>
        </nav>
      </div>

      {/* Conteúdo Principal por Aba */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-slate-300 space-y-8 leading-relaxed text-sm">
        
        {/* =========================================================================
            ABA 1: POLÍTICA DE PRIVACIDADE (LGPD)
           ========================================================================= */}
        {activeTab === 'privacidade' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <LockKeyhole className="w-4 h-4" />
                <span>Documento Oficial de Privacidade</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Política de Privacidade e Proteção de Dados Pessoais
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Em total consonância com a Lei nº 13.709/2018 (LGPD), Marco Civil da Internet (Lei nº 12.965/2014) e Diretrizes de Privacidade para Aplicativos Google Play.
              </p>
            </div>

            {/* Sumário Executivo */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Resumo da Privacidade no Portal Vip Brasil</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-300 list-disc list-inside">
                <li><strong className="text-white">Não vendemos seus dados:</strong> Suas informações nunca são comercializadas para terceiros, anunciantes ou corretores de dados.</li>
                <li><strong className="text-white">Processamento de IA:</strong> O Portal envia ao provedor configurado apenas os dados necessários à geração solicitada e não cria, a partir desses prompts, uma base pública própria de treinamento.</li>
                <li><strong className="text-white">Segurança em Nuvem:</strong> Acesso por HTTPS/TLS, autenticação e controles de acesso no backend e no banco de dados.</li>
                <li><strong className="text-white">Canal LGPD:</strong> Solicitações de acesso, correção ou exclusão podem ser encaminhadas ao canal oficial do Encarregado de Dados.</li>
              </ul>
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
                <span>Controlador de Dados e Informações Institucionais</span>
              </h3>
              <p>
                O <strong>Portal Vip Brasil</strong> (referido como "Nós", "Nosso" ou "Plataforma") atua como <strong>Controlador de Dados</strong> no que tange às informações de cadastro dos usuários de seus serviços, websites e aplicativos móveis oficiais disponíveis na Google Play Store.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300">
                <p><strong>Entidade:</strong> Portal Vip Brasil — Ecossistema Digital de Sites, Apps & Marketing</p>
                <p><strong>Canal do Encarregado de Dados (DPO):</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-400 font-semibold hover:underline">{SUPPORT_EMAIL}</a></p>
                <p><strong>Endereço Canônico:</strong> <a href={PORTAL_CANONICAL_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{PORTAL_CANONICAL_URL}</a></p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">2</span>
                <span>Escopo de Aplicação e Ecossistema Coberto</span>
              </h3>
              <p>
                Esta Política aplica-se integralmente a todos os serviços, websites, ferramentas e aplicativos móveis mantidos pelo Portal Vip Brasil, incluindo expressamente:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Magia das Crenças</div>
                  <p className="text-slate-400 mt-1">Portal & App Google Play Store (com.magiadascrencas.app)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Exu Responde</div>
                  <p className="text-slate-400 mt-1">Portal & App Google Play Store (com.portalvipbrasil.exuresponde)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Maria Padilha Rainha</div>
                  <p className="text-slate-400 mt-1">Portal & App Google Play Store (com.portalvipbrasil.mariapadilharainha)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Manual Católico</div>
                  <p className="text-slate-400 mt-1">Portal & App Google Play Store (br.com.manualcatolico.app)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Frocia & Oráculos</div>
                  <p className="text-slate-400 mt-1">Portais Web de IA e Sabedoria Ancestral</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Froc IA Marketing Engine</div>
                  <p className="text-slate-400 mt-1">Central de Inteligência de Marketing & Autopilot</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">3</span>
                <span>Dados Pessoais Coletados e Tratados</span>
              </h3>
              <p>
                Coletamos apenas os dados estritamente necessários para a prestação dos serviços solicitados pelo usuário:
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-cyan-300 block mb-1">A. Dados de Cadastro e Identificação (Firebase Authentication):</strong>
                  Nome completo, endereço de e-mail e identificador único de autenticação (UID). Senhas são gerenciadas criptograficamente pelo Google Firebase e <em>nunca</em> são armazenadas em texto plano nem visualizadas por nossa equipe.
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-cyan-300 block mb-1">B. Dados de Uso e Registros Técnicos (Marco Civil da Internet, Art. 15):</strong>
                  Endereço IP, data e hora de conexão, identificador de dispositivo, navegador, sistema operacional e páginas acessadas para fins de cumprimento de dever legal e segurança contra fraudes.
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-cyan-300 block mb-1">C. Briefings, Parâmetros e Conteúdos Criados:</strong>
                  Informações de projetos, títulos de artigos, textos gerados e histórico de campanhas solicitadas ativamente pelo usuário.
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-cyan-300 block mb-1">D. Tokens de Conexão com Redes Sociais (OAuth 2.0):</strong>
                  Tokens de acesso autorizados expressamente pelo usuário para publicação em Meta (Facebook/Instagram), Google/YouTube, LinkedIn, TikTok ou X. Estes tokens são criptografados no servidor com chave simétrica em repouso e jamais expostos ao navegador.
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">4</span>
                <span>Tratamento de Dados por Inteligência Artificial (Google Gemini)</span>
              </h3>
              <p>
                As funcionalidades de criação de artigos, sugestão de títulos, hashtags e estratégias de SEO utilizam a API do <strong>Google Gemini</strong>. O processamento é pontual e efetuado exclusivamente no momento da requisição do usuário. Não realizamos treinamento de modelos com dados confidenciais de usuários.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">5</span>
                <span>Bases Legais de Tratamento (LGPD - Art. 7º)</span>
              </h3>
              <p>O tratamento de seus dados é fundamentado nas seguintes hipóteses legais:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li><strong>Execução de Contrato (Art. 7º, V):</strong> Para fornecer acesso ao painel, gerar conteúdos e manter a vitrine ativa.</li>
                <li><strong>Cumprimento de Obrigação Legal (Art. 7º, II):</strong> Para manutenção de registros de conexão conforme o Marco Civil da Internet.</li>
                <li><strong>Consentimento do Titular (Art. 7º, I):</strong> Para conexões voluntárias de redes sociais via OAuth e cookies não essenciais.</li>
                <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para auditoria de segurança, prevenção a ataques cibernéticos e estabilidade técnica.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">6</span>
                <span>Segurança da Informação e Criptografia</span>
              </h3>
              <p>
                Adotamos medidas técnicas e organizacionais avançadas, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li>Comunicação protegida por HTTPS/TLS nas conexões servidas em produção.</li>
                <li>Controles de acesso e isolamento por projeto no backend e nas integrações sociais.</li>
                <li>Proteção contra ataques SSRF, injeção de código e limitação de taxa (Rate Limiting).</li>
                <li>Armazenamento de segredos e credenciais administrativas isolados no servidor.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">7</span>
                <span>Direitos dos Titulares de Dados (LGPD - Art. 18)</span>
              </h3>
              <p>
                O titular pode, a qualquer momento e de forma gratuita, solicitar: confirmação de tratamento, acesso aos dados, correção de dados incompletos, eliminação de dados pessoais, portabilidade e revogação de consentimento. Para exercer seus direitos, utilize a aba <strong>Direitos LGPD & Exclusão de Dados</strong> ou envie e-mail diretamente para <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-400 font-semibold hover:underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>
          </div>
        )}

        {/* =========================================================================
            ABA 2: TERMOS DE USO
           ========================================================================= */}
        {activeTab === 'termos' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <FileCheck2 className="w-4 h-4" />
                <span>Contrato de Licença & Condições Gerais</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Termos de Uso e Condições Gerais do Portal Vip Brasil
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Regras de utilização da plataforma web, vitrine de aplicativos, central de marketing, geração de conteúdo e serviços agregados.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
                <span>Objeto e Aceitação dos Termos</span>
              </h3>
              <p>
                Ao acessar, navegar ou utilizar o <strong>Portal Vip Brasil</strong>, websites associados ou aplicativos móveis do ecossistema, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição aqui presente, solicitamos que não utilize a plataforma.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">2</span>
                <span>Descrição dos Serviços Oferecidos</span>
              </h3>
              <p>
                O Portal Vip Brasil é uma plataforma unificada que compreende:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li>Vitrine pública para apresentação, descoberta e links diretos para websites e aplicativos na Google Play Store.</li>
                <li>Blog com publicações informativas, orações, espiritualidade, sabedoria ancestral, tecnologia e automação.</li>
                <li>Central de marketing e geração de conteúdos e artigos com inteligência artificial.</li>
                <li>Agendador e publicador multicanal para redes sociais autorizadas.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">3</span>
                <span>Acesso Administrativo, Senhas e Segurança da Conta</span>
              </h3>
              <p>
                A central administrativa do Portal Vip Brasil é privada e não oferece cadastro público. O acesso é reservado ao proprietário e a administradores previamente autorizados. Cada pessoa autorizada é responsável pela guarda e confidencialidade de sua credencial.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">4</span>
                <span>Uso de Inteligência Artificial e Responsabilidade Editorial</span>
              </h3>
              <p>
                Os materiais publicitários, textos e artigos gerados com auxílio de modelos de IA (Google Gemini) são ferramentas de produtividade. É de responsabilidade do usuário revisar todo conteúdo antes de veiculação pública ou aplicação comercial. O Portal Vip Brasil emprega diretrizes anti-alucinação, mas não oferece garantias de infalibilidade criativa ou precisão absoluta sem intervenção humana.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">5</span>
                <span>Condutas Proibidas e Uso Aceitável</span>
              </h3>
              <p>É terminantemente proibido utilizar o Portal Vip Brasil para:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li>Prática de spam, envio em massa de mensagens não solicitadas ou fraudes.</li>
                <li>Tentativas de invasão, exploração de vulnerabilidades, engenharia reversa ou ataques de negação de serviço (DDoS).</li>
                <li>Veiculação de conteúdo ilícito, difamatório, discriminatório ou que viole direitos de propriedade intelectual de terceiros.</li>
                <li>Tentativas de contornar limites de segurança ou falsificar tokens de redes sociais.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">6</span>
                <span>Propriedade Intelectual</span>
              </h3>
              <p>
                Todas as marcas, nomes de projetos, logotipos, códigos-fonte, estruturas de banco de dados e design pertencem exclusivamente ao <strong>Portal Vip Brasil</strong> e seus fundadores, estando protegidos pelas leis brasileiras de direitos autorais e propriedade industrial.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">7</span>
                <span>Legislação e Foro Competente</span>
              </h3>
              <p>
                Estes Termos são regidos exclusivamente pelas leis da República Federativa do Brasil. Fica eleito o Foro da Comarca de domicílio do responsável legal pelo Portal Vip Brasil para dirimir quaisquer controvérsias oriundas deste instrumento.
              </p>
            </section>
          </div>
        )}

        {/* =========================================================================
            ABA 3: POLÍTICA DE COOKIES & ARMAZENAMENTO LOCAL
           ========================================================================= */}
        {activeTab === 'cookies' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Cookie className="w-4 h-4" />
                <span>Cookies, LocalStorage & Cache</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Política de Cookies e Tecnologias de Armazenamento Local
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Explicação transparente de como o Portal Vip Brasil armazena dados de sessão para assegurar velocidade, segurança e usabilidade.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
                <span>O que são Cookies e Tecnologias Semelhantes?</span>
              </h3>
              <p>
                Cookies e recursos de armazenamento local (<code className="text-cyan-300 text-xs">localStorage</code> e <code className="text-cyan-300 text-xs">sessionStorage</code>) são pequenos arquivos ou chaves de dados guardados em seu navegador quando você visita uma página web. Eles servem para lembrar suas preferências, manter sua sessão segura e acelerar o carregamento de telas.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">2</span>
                <span>Categorias de Cookies Utilizados</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Cookies e Armazenamento Estritamente Necessários (Essenciais)</span>
                  </div>
                  <p className="text-slate-300">
                    Indispensáveis para a autenticação segura do Firebase, retenção do token de login do usuário, integridade das requisições e persistência das preferências de visualização (ex.: aba selecionada, filtros de busca). Não podem ser desativados sem comprometer o funcionamento da plataforma.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Cookies Analíticos e de Desempenho (Anônimos)</span>
                  </div>
                  <p className="text-slate-300">
                    Utilizados para mensurar métricas de tráfego, contagem anônima de leituras no blog e identificação de erros de renderização. Não cruzamos dados analíticos com identidades pessoais para perfis comportamentais invasivos.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">3</span>
                <span>Ausência de Rastreamento Invasivo de Terceiros</span>
              </h3>
              <p>
                O Portal Vip Brasil <strong>não utiliza cookies de rastreamento cruzado (cross-site tracking)</strong> para vender anúncios personalizados de terceiros. Sua privacidade e seu foco na navegação são rigorosamente respeitados.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">4</span>
                <span>Como Gerenciar ou Desativar Cookies no Navegador</span>
              </h3>
              <p>
                Você pode a qualquer momento limpar ou bloquear cookies nas configurações de privacidade do seu navegador:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li><strong>Google Chrome:</strong> Configurações &gt; Privacidade e Segurança &gt; Cookies de terceiros.</li>
                <li><strong>Mozilla Firefox:</strong> Opções &gt; Privacidade & Segurança &gt; Cookies e Dados de Sites.</li>
                <li><strong>Microsoft Edge:</strong> Configurações &gt; Cookies e Permissões de Site.</li>
                <li><strong>Apple Safari:</strong> Preferências &gt; Privacidade &gt; Bloquear todos os cookies.</li>
              </ul>
            </section>
          </div>
        )}

        {/* =========================================================================
            ABA 4: DIREITOS LGPD & EXCLUSÃO DE DADOS
           ========================================================================= */}
        {activeTab === 'lgpd' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <UserCheck className="w-4 h-4" />
                <span>Direitos do Titular & Exclusão</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Exercício de Direitos LGPD e Solicitação de Exclusão de Dados
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Canal simplificado e transparente para solicitação de cópia, correção, anonimização ou exclusão definitiva de seus dados cadastrados.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Seus Direitos Garantidos pelo Artigo 18 da Lei nº 13.709/2018 (LGPD)</span>
              </h4>
              <p className="text-xs text-slate-300">
                Como titular de dados pessoais, você tem o direito de obter do Portal Vip Brasil, a qualquer momento e mediante requisição:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Confirmação da existência de tratamento</div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Acesso integral aos seus dados</div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Correção de dados incompletos ou inexatos</div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Eliminação de dados pessoais tratados com consentimento</div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Portabilidade de dados</div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">✓ Revogação do consentimento a qualquer momento</div>
              </div>
            </div>

            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white">Como Solicitar a Exclusão Definitiva dos Seus Dados</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você pode solicitar a exclusão de sua conta e a eliminação de todos os seus dados operacionais por duas vias rápidas e gratuitas:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Via 1: No próprio Painel */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">1</span>
                    <span>Solicitação pelo Canal Oficial LGPD</span>
                  </div>
                  <p className="text-slate-400">
                    A central administrativa privada não oferece exclusão automática da conta do proprietário pelo Perfil. Solicitações de titulares relacionadas aos serviços e aplicativos do ecossistema devem ser encaminhadas ao Encarregado de Dados pelo e-mail oficial abaixo.
                  </p>
                </div>

                {/* Via 2: Via E-mail DPO */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
                    <span>Contato Direto com o Encarregado (DPO)</span>
                  </div>
                  <p className="text-slate-400">
                    Envie um e-mail formal ao nosso Encarregado de Dados. A solicitação será tratada e respondida conforme os prazos e obrigações aplicáveis da LGPD e da regulamentação vigente.
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Solicitacao%20de%20Exclusao%20de%20Dados%20LGPD%20-%20Portal%20Vip%20Brasil`}
                    className="mt-2 inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold text-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{SUPPORT_EMAIL}</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Template de Solicitação Copiável */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Modelo de Solicitação Formal (Copiar e Enviar por E-mail)</span>
                </div>
                <button
                  onClick={copyDeletionTemplate}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 flex items-center gap-1.5 transition-all"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTemplate ? 'Modelo Copiado!' : 'Copiar Modelo'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#070B14] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`Assunto: Solicitação de Exclusão de Dados Pessoais - LGPD (Portal Vip Brasil)

À atenção do Encarregado de Proteção de Dados (DPO) - Portal Vip Brasil:
E-mail do DPO: ${SUPPORT_EMAIL}

Eu, [SEU NOME COMPLETO], titular da conta associada ao e-mail [SEU E-MAIL CADASTRADO], venho por meio desta solicitar a confirmação, eliminação definitiva dos meus dados pessoais cadastrados e encerramento da conta, nos termos do Art. 18, inciso VI da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).

Data da solicitação: ${new Date().toLocaleDateString('pt-BR')}`}
              </pre>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: CONFORMIDADE GOOGLE PLAY STORE & APPS ANDROID
           ========================================================================= */}
        {activeTab === 'apps-compliance' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Google Play Developer Data Safety</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Declaração de Conformidade e Segurança para Aplicativos Google Play Store
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Informações exigidas pela seção de Segurança dos Dados (Data Safety Section) da Google Play Console para os aplicativos móveis oficiais do Portal Vip Brasil.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
                <span>Aplicativos Móveis Oficiais Cobertos</span>
              </h3>
              <p>Esta declaração de conformidade aplica-se especificamente aos seguintes pacotes Android distribuídos na Google Play Store:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Magia das Crenças</strong>
                    <span className="font-mono text-cyan-400 text-[11px]">com.magiadascrencas.app</span>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.magiadascrencas.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Exu Responde</strong>
                    <span className="font-mono text-cyan-400 text-[11px]">com.portalvipbrasil.exuresponde</span>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Maria Padilha Rainha</strong>
                    <span className="font-mono text-cyan-400 text-[11px]">com.portalvipbrasil.mariapadilharainha</span>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Manual Católico</strong>
                    <span className="font-mono text-cyan-400 text-[11px]">br.com.manualcatolico.app</span>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=br.com.manualcatolico.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">2</span>
                <span>Tabela de Segurança dos Dados (Data Safety Table)</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-white font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Tipo de Dado</th>
                      <th className="p-3">Coleta</th>
                      <th className="p-3">Compartilhamento</th>
                      <th className="p-3">Finalidade Principal</th>
                      <th className="p-3">Criptografia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    <tr>
                      <td className="p-3 font-semibold text-white">E-mail e Nome</td>
                      <td className="p-3 text-cyan-400">Sim (opcional)</td>
                      <td className="p-3 text-slate-400">Não compartilhado</td>
                      <td className="p-3">Autenticação e sincronização de conta</td>
                      <td className="p-3 text-emerald-400">Sim (TLS/HTTPS)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Localização Geográfica</td>
                      <td className="p-3 text-rose-400">Não coletado</td>
                      <td className="p-3 text-slate-400">Não compartilhado</td>
                      <td className="p-3">Nenhuma</td>
                      <td className="p-3 text-slate-400">N/A</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Fotos e Arquivos</td>
                      <td className="p-3 text-cyan-400">Apenas se enviado</td>
                      <td className="p-3 text-slate-400">Não compartilhado</td>
                      <td className="p-3">Upload de foto de perfil (voluntário)</td>
                      <td className="p-3 text-emerald-400">Sim (TLS/HTTPS)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Contatos e SMS</td>
                      <td className="p-3 text-rose-400">Não coletado</td>
                      <td className="p-3 text-slate-400">Não compartilhado</td>
                      <td className="p-3">Nenhuma</td>
                      <td className="p-3 text-slate-400">N/A</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Identificadores (Crashlytics)</td>
                      <td className="p-3 text-cyan-400">Sim (anônimo)</td>
                      <td className="p-3 text-slate-400">Apenas Firebase</td>
                      <td className="p-3">Diagnóstico de falhas e bugs técnicos</td>
                      <td className="p-3 text-emerald-400">Sim (TLS/HTTPS)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono">3</span>
                <span>Mecanismo de Desinstalação e Limpeza Local</span>
              </h3>
              <p>
                Os aplicativos móveis não deixam resíduos de rastreamento no dispositivo. Ao desinstalar o aplicativo através da Google Play Store ou das configurações do Android, todos os dados armazenados em cache local são imediatamente apagados pelo sistema operacional.
              </p>
            </section>
          </div>
        )}
      </div>

      {/* Footer de Atendimento & Suporte com DPO */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">Encarregado de Proteção de Dados (DPO)</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Canal oficial de governança, dúvidas jurídicas, atendimento à ANPD e solicitações de titulares.
            </p>
          </div>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Atendimento%20LGPD%20-%20Portal%20Vip%20Brasil`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <Mail className="w-4 h-4" />
          <span>Falar com o DPO ({SUPPORT_EMAIL})</span>
        </a>
      </div>
    </div>
  );
};

export default LegalPage;
