import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Send,
  Copy,
  Check,
  Bot,
  Zap,
  Layers,
  Globe,
  Film,
  FileText,
  DollarSign,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Target,
  Flame,
  Star,
  Compass,
  ArrowRight,
  Filter
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { USER_PORTFOLIO_PROJECTS } from '../data/portalProjects';

export interface AgentDefinition {
  id: string;
  name: string;
  category: 'tech' | 'seo' | 'copywriting' | 'ads' | 'multimedia' | 'strategy' | 'niches';
  role: string;
  description: string;
  icon: any;
  color: string;
  promptChips: string[];
}

export const THIRTY_AGENTS: AgentDefinition[] = [
  // 1. Engenharia & Tecnologia (4)
  {
    id: 'TECH_LEAD_CORE',
    name: 'Tech Lead Core',
    category: 'tech',
    role: 'Engenheiro Chefe Full-Stack & Arquitetura',
    description: 'Especialista em React, TypeScript, Vite, Node 22, APIs REST e resiliência de microsserviços.',
    icon: Cpu,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    promptChips: [
      'Como otimizar a latência das chamadas para a API?',
      'Proponha uma arquitetura de cache para páginas estáticas.',
      'Analise a resiliência do dev server com Node 22.'
    ]
  },
  {
    id: 'AI_SYSTEMS_ARCHITECT',
    name: 'AI Systems Architect',
    category: 'tech',
    role: 'Engenheiro de LLMs, Gemini 2.5 & Tokens',
    description: 'Orquestração de modelos @google/genai, context window, function calling e streaming.',
    icon: Bot,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    promptChips: [
      'Qual a melhor temperatura e topP para redação criativa?',
      'Como estruturar o prompt para evitar alucinações na geração de artigos?',
      'Como implementar fallback automático entre Gemini Flash e Pro?'
    ]
  },
  {
    id: 'DEV_OPS_CLOUD',
    name: 'DevOps & Cloud Engineer',
    category: 'tech',
    role: 'Infraestrutura Cloud & Deploy Contínuo',
    description: 'Gestão de Vercel, Firebase Firestore, Docker, GitHub Actions e Edge Caching.',
    icon: Layers,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    promptChips: [
      'Como configurar o pipeline de CI/CD para deploy sem downtime?',
      'Quais índices compostos do Firestore devo criar para consultas velozes?',
      'Como monitorar falhas nas tarefas agendadas de cron?'
    ]
  },
  {
    id: 'SECURITY_CYBER_GUARD',
    name: 'Cyber Guard & LGPD',
    category: 'tech',
    role: 'Auditor de Segurança & Fail-Closed',
    description: 'Auditoria de chaves, criptografia AES-256, cookies SameSite, CSP e conformidade com a LGPD.',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    promptChips: [
      'Audite os cabeçalhos de Content-Security-Policy do Portal.',
      'Como garantir a conformidade com a LGPD para armazenamento de dados?',
      'Como prevenir ataques de rate limit e injeção em formulários?'
    ]
  },

  // 2. SEO, Sitemaps XML & Buscadores (4)
  {
    id: 'YOAST_SEO_SPECIALIST',
    name: 'Yoast SEO Specialist',
    category: 'seo',
    role: 'Auditor de SEO On-Page Padrão Yoast',
    description: 'Especialista em densidade de palavra-chave (1.0 a 2.5%), Flesch score, meta tags e H1/H2.',
    icon: Search,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    promptChips: [
      'Audite este título e slug para o nicho de Tarot e Runas.',
      'Como alcançar mais de 30% de palavras de transição no artigo?',
      'Qual a densidade ideal para a palavra-chave "tarot do amor grátis"?'
    ]
  },
  {
    id: 'XML_SITEMAP_ARCHITECT',
    name: 'XML Sitemap & Schema Master',
    category: 'seo',
    role: 'Arquiteto de Sitemaps & Rich Snippets',
    description: 'Garante sitemaps XML válidos com suporte a Google Images, News, FAQPage e Breadcrumbs.',
    icon: Globe,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    promptChips: [
      'Como incluir tags <image:image> no sitemap XML para o Google Imagens?',
      'Gere a estrutura JSON-LD FAQPage para o projeto de Runas.',
      'Como validar o arquivo robots.txt para liberar todos os bots benéficos?'
    ]
  },
  {
    id: 'SEARCH_ENGINE_PING_MASTER',
    name: 'Search Engine Ping Master',
    category: 'seo',
    role: 'Operador de Pings & IndexNow',
    description: 'Dispara notificações instantâneas para Google, Bing, IndexNow e Yandex ao publicar novos posts.',
    icon: Zap,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    promptChips: [
      'Como funciona o protocolo IndexNow para indexação em minutos no Bing?',
      'Qual a frequência recomendada de pings para não ser penalizado por spam?',
      'Como verificar se as URLs foram recebidas pelos rastreadores?'
    ]
  },
  {
    id: 'ASO_GOOGLE_PLAY',
    name: 'ASO Google Play Master',
    category: 'seo',
    role: 'Otimizador de Apps na Play Store (ASO)',
    description: 'Palavras-chave em títulos de apps, screenshots persuasivos e estratégias de conversão de downloads.',
    icon: Star,
    color: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
    promptChips: [
      'Quais as melhores palavras-chave ASO para um app de Tarot e Baralho Cigano?',
      'Como redigir a descrição curta e longa para a Play Store maximizando conversão?',
      'Que testes A/B devo rodar no ícone do aplicativo?'
    ]
  },

  // 3. Redação em Língua Portuguesa & Copywriting (4)
  {
    id: 'PORTUGUESE_COPYWRITER',
    name: 'Mestre da Língua Portuguesa',
    category: 'copywriting',
    role: 'Redator Sênior & Gramático pt-BR',
    description: 'Textos com ortografia impecável, fluidez lírica, ritmo sonoro e persuasão profunda em português.',
    icon: FileText,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    promptChips: [
      'Revise este texto eliminando repetições e aprimorando a concordância.',
      'Crie 5 variações poéticas e magnéticas de introdução para o blog.',
      'Como substituir jargões técnicos por metáforas acessíveis?'
    ]
  },
  {
    id: 'STORYTELLING_HOOKS',
    name: 'Viral Storytelling & Hooks',
    category: 'copywriting',
    role: 'Engenheiro de Ganchos Virais para Vídeos',
    description: 'Prende a atenção nos primeiros 3 segundos em Reels, Shorts e TikTok com quebra de padrão.',
    icon: Flame,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    promptChips: [
      'Gere 7 ganchos virais irresistíveis para vídeo de Maria Padilha.',
      'Como prender a atenção nos primeiros 3 segundos em um vídeo sobre Runas?',
      'Crie um roteiro em 3 atos para um Reel de 45 segundos sobre prosperidade.'
    ]
  },
  {
    id: 'EDITORIAL_BLOG_CHIEF',
    name: 'Editor-Chefe do Blog',
    category: 'copywriting',
    role: 'Arquiteto de Artigos Pilares (1.200+ palavras)',
    description: 'Estruturação completa com Introdução com Gancho, H2s temáticos, H3s, FAQ e Chamada para Ação.',
    icon: Compass,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    promptChips: [
      'Estruture um artigo pilar completo sobre Baralho Cigano para iniciantes.',
      'Como criar perguntas frequentes que geram cliques nos resultados de busca?',
      'Escreva uma conclusão memorável que motive o leitor a compartilhar o post.'
    ]
  },
  {
    id: 'EMAIL_RETENTION_COPY',
    name: 'Copywriter de E-mails & Leads',
    category: 'copywriting',
    role: 'Especialista em Nutrição & Conversão',
    description: 'E-mails de alta abertura (40%+), títulos curiosos e CTAs diretas para fidelização de audiência.',
    icon: Target,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    promptChips: [
      'Crie uma sequência de boas-vindas de 3 e-mails para novos inscritos do portal.',
      'Quais as 10 linhas de assunto com maior taxa de abertura comprovada?',
      'Como reengajar leads inativos sem parecer invasivo?'
    ]
  },

  // 4. Tráfego Pago & Gestão de Ads (6)
  {
    id: 'META_ADS_PRO',
    name: 'Meta Ads Pro (Insta & Face)',
    category: 'ads',
    role: 'Gestor de Tráfego Pago Meta Ads',
    description: 'Campanhas de conversão, criativos dinâmicos, públicos personalizados e otimização de CPA.',
    icon: DollarSign,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    promptChips: [
      'Qual a estrutura recomendada de CBO para produtos com ticket de R$ 97?',
      'Como testar criativos de imagem vs vídeo para o público esotérico?',
      'Quais interesses no Meta Ads performam melhor para autoconhecimento?'
    ]
  },
  {
    id: 'GOOGLE_SEARCH_ADS_PRO',
    name: 'Google Ads Search & PMax',
    category: 'ads',
    role: 'Especialista em Google Ads & Performance Max',
    description: 'Palavras de alta intenção comercial, negativas, índice de qualidade 10/10 e anúncios responsivos.',
    icon: Search,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    promptChips: [
      'Gere uma lista de 30 palavras-chave com alta intenção de busca para Tarot.',
      'Quais palavras-chave negativas devo adicionar para evitar cliques inúteis?',
      'Como estruturar uma campanha Performance Max para o Portal Vip Brasil?'
    ]
  },
  {
    id: 'TIKTOK_ADS_GROWTH',
    name: 'TikTok Ads & Spark Ads',
    category: 'ads',
    role: 'Especialista em Anúncios Nativos no TikTok',
    description: 'UGC autêntico, tendências musicais, Spark Ads para impulsionar vídeos orgânicos com baixo CPM.',
    icon: Zap,
    color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
    promptChips: [
      'Como transformar um vídeo de TikTok com bom alcance orgânico em Spark Ad?',
      'Qual o formato ideal de roteiro UGC de 15 segundos para gerar downloads?',
      'Como otimizar lances para maximizar conclusões de vídeo no TikTok?'
    ]
  },
  {
    id: 'PINTEREST_ADS_EXPERT',
    name: 'Pinterest Ads Expert',
    category: 'ads',
    role: 'Gestor de Campanhas no Pinterest',
    description: 'Pins verticais 2:3 de alto CTR, tráfego contínuo e público qualificado de compras e espiritualidade.',
    icon: Star,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    promptChips: [
      'Como criar Pins de alta conversão para o nicho de Runas e Cristais?',
      'Quais as dimensões e proporções que recebem maior prioridade no algoritmo?',
      'Como usar palavras-chave nos títulos de Pins para tráfego perpétuo?'
    ]
  },
  {
    id: 'LINKEDIN_B2B_ADS',
    name: 'LinkedIn B2B Ads Strategist',
    category: 'ads',
    role: 'Gestor de Tráfego Corporativo B2B',
    description: 'Campanhas de liderança de pensamento, parcerias de negócios e atração de anunciantes para o portal.',
    icon: TrendingUp,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    promptChips: [
      'Como atrair anunciantes e parceiros de negócio para o Portal Vip Brasil?',
      'Qual o formato mais econômico no LinkedIn para autoridade de marca?',
      'Como prospectar empresas interessadas em vitrines digitais?'
    ]
  },
  {
    id: 'YOUTUBE_SHORTS_ADS',
    name: 'YouTube Shorts & In-Stream Ads',
    category: 'ads',
    role: 'Especialista em Anúncios em Vídeo no YouTube',
    description: 'Anúncios puláveis em 5 segundos, Shorts patrocinados e crescimento acelerado de inscritos no canal.',
    icon: Film,
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
    promptChips: [
      'Como estruturar o gancho dos primeiros 5 segundos para evitar que o usuário pule o anúncio?',
      'Qual a métrica chave para avaliar o sucesso de um anúncio em Shorts?',
      'Como direcionar o tráfego do YouTube para as páginas de vitrine do portal?'
    ]
  },

  // 5. Criação Multimídia, Imagens & Veo Prompts (4)
  {
    id: 'VEO_VIDEO_PROMPT_DIRECTOR',
    name: 'Diretor de Prompts Veo 3.1',
    category: 'multimedia',
    role: 'Cineasta de IA & Diretor de Câmera',
    description: 'Comandos cinemáticos de altíssima precisão: lentes 35mm/85mm, iluminação Rembrandt, volumetric fog.',
    icon: Film,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    promptChips: [
      'Crie um prompt cinemático para Veo 3.1 mostrando um altar com cartas de Tarot iluminadas por velas.',
      'Como descrever movimentos de câmera lentos (slow dolly forward) sem tremores de IA?',
      'Gere um prompt hiper-realista para um vídeo vertical sobre Runas Nórdicas em uma floresta nórdica.'
    ]
  },
  {
    id: 'ANTI_REPETITION_ART_DIRECTOR',
    name: 'Diretor de Arte Anti-Repetição',
    category: 'multimedia',
    role: 'Curador de Imagens & Anti-Colisão',
    description: 'Garante zero fotos repetidas nos 8 nichos sagrados com iluminação e composições variadas.',
    icon: Sparkles,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    promptChips: [
      'Como garantir que cada artigo de Maria Padilha tenha uma composição visual exclusiva?',
      'Quais elementos estéticos usar para o nicho de Devoção Católica sem cair em clichês?',
      'Quais palavras negativas colocar no prompt para eliminar rostos genéricos e logos corporativos?'
    ]
  },
  {
    id: 'CAROUSEL_DESIGN_MASTER',
    name: 'Mestre dos Carrosséis Sociais',
    category: 'multimedia',
    role: 'Roteirizador de Carrosséis Educativos',
    description: 'Carrosséis de 6 a 10 lâminas que geram salvamentos e compartilhamentos em massa no Instagram.',
    icon: Layers,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    promptChips: [
      'Roteirize um carrossel de 7 slides: "Os 5 Símbolos Rúnicos de Proteção que você deve conhecer".',
      'Como estruturar o slide final de um carrossel para forçar o salvamento?',
      'Qual a proporção de texto e espaço em branco ideal para leitura rápida?'
    ]
  },
  {
    id: 'THUMBNAIL_CTR_ENGINEER',
    name: 'Engenheiro de Thumbnails (CTR)',
    category: 'multimedia',
    role: 'Otimizador de Capas de Alto Clique',
    description: 'Composições com alto contraste, leitura em 50px mobile, gatilhos de curiosidade e hierarquia.',
    icon: Star,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    promptChips: [
      'Quais elementos visuais garantem CTR acima de 10% no YouTube para o nicho espiritual?',
      'Como posicionar o elemento de foco na thumbnail para não conflitar com a duração do vídeo?',
      'Analise como melhorar a capa de artigos do blog para visualização no Google Discover.'
    ]
  },

  // 6. Estratégia de Marketing, CRO & Inteligência (4)
  {
    id: 'MARKETING_GROWTH_LEAD',
    name: 'Growth Lead & Estrategista',
    category: 'strategy',
    role: 'Arquiteto de Crescimento Orgânico & Funis',
    description: 'Orquestra o tráfego orgânico cruzado entre o portal, os apps da Play Store e as redes sociais.',
    icon: TrendingUp,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    promptChips: [
      'Como conectar o tráfego do blog do Portal diretamente para download dos aplicativos?',
      'Qual a melhor estratégia para reter visitantes e torná-los leitores diários?',
      'Como estruturar um funil de lançamento para novos serviços na vitrine do portal?'
    ]
  },
  {
    id: 'CRO_CONVERSION_RATE',
    name: 'Especialista em CRO',
    category: 'strategy',
    role: 'Otimizador de Taxa de Conversão de Páginas',
    description: 'Testes de botões CTA, hierarquia visual, redução de fricção e prova social que multiplicam vendas.',
    icon: Target,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    promptChips: [
      'Como melhorar o botão de CTA da página de vitrine para aumentar os cliques de contato?',
      'Quais gatilhos mentais mais funcionam para fechar consultas e serviços digitais?',
      'Como posicionar depoimentos de clientes para gerar autoridade imediata?'
    ]
  },
  {
    id: 'ANALYTICS_ROI_TRACKER',
    name: 'Analista de Dados & ROI',
    category: 'strategy',
    role: 'Guardião de Métricas & Retorno Financeiro',
    description: 'Rastreamento de CAC, LTV, taxa de cliques (CTR), custo por lead e retorno sobre investimento em IA.',
    icon: DollarSign,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    promptChips: [
      'Como calcular o retorno financeiro (ROI) de cada artigo publicado no blog?',
      'Quais as 3 métricas essenciais para monitorar no Google Search Console semanalmente?',
      'Como definir o orçamento seguro de testes para novas campanhas de anúncios?'
    ]
  },
  {
    id: 'COMPETITOR_INTELLIGENCE',
    name: 'Inteligência Competitiva & Trends',
    category: 'strategy',
    role: 'Radar de Tendências & Análise de Concorrência',
    description: 'Monitora os temas em alta no Google Trends, brechas de conteúdo da concorrência e formatos emergentes.',
    icon: Compass,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    promptChips: [
      'Quais os tópicos de busca que mais cresceram este mês no nicho de espiritualidade e bem-estar?',
      'Como identificar lacunas de conteúdo que os maiores portais concorrentes esqueceram?',
      'Que formatos de vídeo curto estão gerando mais retenção no momento?'
    ]
  },

  // 7. Especialistas em Nichos Sagrados do Portal (4)
  {
    id: 'RUNIC_NORDIC_EXPERT',
    name: 'Mestre em Runas & Mitologia Viking',
    category: 'niches',
    role: 'Autoridade Ancestral Nórdica',
    description: 'Significados profundos das 24 runas do Futhark Antigo, poemas rúnicos, tiragens e sabedoria de Odin.',
    icon: Star,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    promptChips: [
      'Explique o significado completo da runa Fehu para riqueza material e espiritual.',
      'Como fazer uma tiragem rúnica de 3 runas para decisão profissional?',
      'Quais os ensinamentos do Hávamál que mais se aplicam aos desafios da vida moderna?'
    ]
  },
  {
    id: 'TAROT_ORACLES_MASTER',
    name: 'Mestre em Tarot & Baralho Cigano',
    category: 'niches',
    role: 'Especialista em Cartomancia & Arcanos',
    description: 'Leituras dos 78 arcanos, mesa real do Baralho Cigano de Santa Sara Kali, arquétipos e sincronicidade.',
    icon: Sparkles,
    color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
    promptChips: [
      'Como interpretar a combinação da carta O Louco com A Torre em uma leitura?',
      'Explique o significado da carta do Trevo e das Alianças no Baralho Cigano.',
      'Como formular perguntas poderosas para o Tarot obter respostas claras e iluminadas?'
    ]
  },
  {
    id: 'LOVE_PADILHA_SPECIALIST',
    name: 'Mentor de Maria Padilha & Magnetismo',
    category: 'niches',
    role: 'Especialista em Autoestima, Sedução & Força Afetiva',
    description: 'Firmezas éticas, empoderamento feminino, quebra de bloqueios afetivos e orações à Rainha das Encruzilhadas.',
    icon: Flame,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    promptChips: [
      'Como fortalecer a autoestima e o magnetismo pessoal com respeito à espiritualidade?',
      'Qual a oração autêntica de Maria Padilha para clarear os caminhos amorosos?',
      'Quais elementos de firmeza (rosas vermelhas, perfumes) simbolizam o poder da Rainha?'
    ]
  },
  {
    id: 'AFRO_DEFENDER_GUARDIAN',
    name: 'Guardião de Exu & Caminhos',
    category: 'niches',
    role: 'Fundamentos de Proteção Espiritual & Umbanda',
    description: 'Desbloqueio de prosperidade, limpeza energética, quebra de demandas e sabedoria dos guardiões das 7 encruzilhadas.',
    icon: ShieldCheck,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    promptChips: [
      'Como funcionam as firmezas para abertura de caminhos financeiros nos dias difíceis?',
      'Explique o verdadeiro papel de Exu como mensageiro de luz e desbravador na Umbanda.',
      'Quais banhos de ervas de proteção e descarrego são indicados para o fim de semana?'
    ]
  }
];

export const AlmaAgentsPage: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('YOAST_SEO_SPECIALIST');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(USER_PORTFOLIO_PROJECTS[0]?.id || '');
  const [promptInput, setPromptInput] = useState('');
  const [conversationOutput, setConversationOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeAgent = THIRTY_AGENTS.find((a) => a.id === selectedAgentId) || THIRTY_AGENTS[0];

  const filteredAgents = THIRTY_AGENTS.filter((agent) => {
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendToAgent = async (overridePrompt?: string) => {
    const messageToSend = (overridePrompt || promptInput).trim();
    if (!messageToSend) return;

    setLoading(true);
    setConversationOutput('');

    try {
      const data = await apiRequest<{ response?: string; reply?: string; agentId: string }>('/api/ai/agent-chat', {
        method: 'POST',
        body: {
          agentId: activeAgent.id,
          userMessage: messageToSend,
          prompt: messageToSend,
          projectId: selectedProjectId,
          companyId: selectedProjectId
        }
      });

      setConversationOutput(data.response || data.reply || 'Resposta recebida com sucesso.');
    } catch (err: any) {
      setConversationOutput(`⚠️ Erro ao consultar o agente: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOutput = () => {
    if (!conversationOutput) return;
    navigator.clipboard.writeText(conversationOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    { id: 'all', label: 'Todos os 30 Agentes' },
    { id: 'seo', label: 'SEO & Sitemaps XML' },
    { id: 'copywriting', label: 'Língua Portuguesa' },
    { id: 'ads', label: 'Gestão de Ads' },
    { id: 'multimedia', label: 'Vídeos & Imagens' },
    { id: 'tech', label: 'Tecnologia & IA' },
    { id: 'strategy', label: 'Estratégia & ROI' },
    { id: 'niches', label: 'Nichos Sagrados' }
  ];

  const AgentIcon = activeAgent.icon;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* Header Principal */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0c1836] via-[#091527] to-[#070b14] border border-cyan-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-lg shadow-cyan-500/20">
              <Bot size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Central dos 30 Agentes Nativos
                </h2>
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                  PRODUÇÃO ATIVA
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
                Suíte completa com 30 especialistas em Tecnologia, SEO Padrão Yoast, Sitemaps XML, Pings nos Buscadores, Todos os Ads, Língua Portuguesa e Nichos do Portal Vip Brasil.
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="mt-6 flex flex-col md:flex-row gap-3 pt-5 border-t border-slate-800">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, habilidade ou palavra-chave..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout Principal: Lista de Agentes à Esquerda e Chat Interativo à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna 1: Grade com os Agentes Filtrados (5 colunas) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {filteredAgents.length} Especialistas Disponíveis
            </span>
          </div>

          {filteredAgents.map((agent) => {
            const Icon = agent.icon;
            const isSelected = agent.id === activeAgent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setConversationOutput('');
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-cyan-400/60 bg-gradient-to-r from-blue-950/60 to-cyan-950/40 shadow-lg shadow-cyan-950/40'
                    : 'border-slate-800/80 bg-[#090e1a]/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className={`p-2.5 rounded-xl border shrink-0 ${agent.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-extrabold text-white truncate">{agent.name}</h4>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-cyan-300 truncate mt-0.5">{agent.role}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{agent.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Coluna 2: Terminal Interativo do Agente Selecionado (7 colunas) */}
        <div className="lg:col-span-7 rounded-3xl border border-cyan-500/25 bg-[#070d18] p-5 md:p-7 shadow-2xl space-y-5">
          {/* Cabeçalho do Agente Ativo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl border ${activeAgent.color}`}>
                <AgentIcon size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{activeAgent.name}</h3>
                <p className="text-xs font-semibold text-cyan-300">{activeAgent.role}</p>
                <p className="text-[11px] text-slate-400 max-w-md mt-0.5">{activeAgent.description}</p>
              </div>
            </div>

            {/* Seletor de Contexto de Projeto */}
            <div className="shrink-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Contexto do Projeto
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 max-w-[200px]"
              >
                <option value="">Geral (Portal Vip Brasil)</option>
                {USER_PORTFOLIO_PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chips de Ação Rápida */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Sugestões de Comandos Estratégicos
            </span>
            <div className="flex flex-wrap gap-2">
              {activeAgent.promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptInput(chip);
                    handleSendToAgent(chip);
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all text-left"
                >
                  💡 {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Área de Resposta do Agente */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 min-h-[260px] max-h-[380px] overflow-y-auto space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Bot size={13} /> Resposta do Especialista
              </span>
              {conversationOutput && (
                <button
                  onClick={handleCopyOutput}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-7 w-7 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400 animate-pulse font-medium">
                  {activeAgent.name} está analisando o contexto e gerando a estratégia...
                </p>
              </div>
            ) : conversationOutput ? (
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                {conversationOutput}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Sparkles size={28} className="mx-auto text-slate-600 mb-2" />
                <p>Nenhuma consulta enviada ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Digite sua dúvida abaixo ou clique em uma das sugestões para acionar {activeAgent.name}.
                </p>
              </div>
            )}
          </div>

          {/* Caixa de Entrada de Texto */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendToAgent();
                  }
                }}
                placeholder={`Pergunte algo estratégico para ${activeAgent.name}...`}
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => handleSendToAgent()}
                disabled={loading || !promptInput.trim()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-50 shrink-0"
              >
                <Send size={15} />
                <span>Enviar</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Pressione Enter para enviar. Todas as respostas utilizam modelos Gemini avançados com direcionamento técnico e gramatical estrito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
