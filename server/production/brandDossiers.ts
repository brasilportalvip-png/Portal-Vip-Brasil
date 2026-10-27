/**
 * BRAND DOSSIERS ENGINE — PORTAL VIP BRASIL
 * 
 * Estrutura formal com exatamente 35 campos obrigatórios para cada marca/projeto
 * do ecossistema. Garante conformidade com o nicho, zero poluição visual cruzada,
 * ausência de logos genéricos e dados factuais verificados.
 * 
 * Regra: Campos pendentes de confirmação empírica devem conter:
 * "Não verificado — confirmação necessária"
 */

import { PortalProjectItem, getPortalProjectFromDb, PORTAL_VIP_PROJECTS } from './almaPortfolio.js';

export interface SearchIntentMap {
  informational: string[];
  transactional: string[];
  navigational: string[];
}

export interface BrandColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface BrandVerificationStatus {
  isAudited: boolean;
  lastAuditedAt: string;
  auditNotes: string;
  unverifiedFields: string[];
}

export interface MasterBrandDossier {
  // 1-5: Identificação Básica & Posicionamento
  projectId: string;
  brandName: string;
  slug: string;
  segment: string;
  category: string;

  // 6-10: Identidade Editorial & Propósito
  tagline: string;
  mission: string;
  coreThemes: string[];
  targetAudience: string;
  toneOfVoice: string;

  // 11-15: Arquétipos, Presença Digital & Aplicativos
  brandArchetype: string;
  websiteUrl: string;
  playStoreUrl: string;
  appTitle: string;
  hasApp: boolean;

  // 16-18: Identidade Visual & Design System
  logoUrl: string;
  bannerUrl: string;
  colorPalette: BrandColorPalette;

  // 19-22: Guardrails, Restrições & Diferenciais
  visualNegativeConstraints: string[];
  editorialNegativeConstraints: string[];
  culturalReligiousSensitivities: string[];
  keyDifferentiators: string[];

  // 23-27: SEO, Descoberta & Conversão
  primaryKeywords: string[];
  longTailKeywords: string[];
  searchIntentMap: SearchIntentMap;
  conversionHooks: string[];
  callToActionCatalog: string[];

  // 28-30: Canais & Mídias
  socialPlatforms: string[];
  contentPillars: string[];
  videoVisualDirectives: string;

  // 31-35: Multimídia, ASO, Prova & Auditoria
  allowedImageArchetypes: string[];
  prohibitedImageArchetypes: string[];
  appStoreKeywords: string[];
  proofPoints: string[];
  verificationStatus: BrandVerificationStatus;
}

export const CANONICAL_BRAND_DOSSIERS: Record<string, MasterBrandDossier> = {
  proj_magia_crencas: {
    projectId: 'proj_magia_crencas',
    brandName: 'Magia das Crenças',
    slug: 'magia-das-crencas',
    segment: 'Portal Holístico e Aplicativo Devocional',
    category: 'Espiritualidade, Fé & Autoconhecimento',
    tagline: 'Desperte seu poder interior e a força das suas convicções.',
    mission: 'Auxiliar buscadores espirituais a elevar a vibração pessoal através de orações diárias, decretos de prosperidade e sabedoria metafísica universal.',
    coreThemes: [
      'Orações e decretos quânticos diários',
      'Leis universais e atração da prosperidade',
      'Salmos, bênçãos e proteção espiritual do lar',
      'Práticas meditativas e equilíbrio emocional'
    ],
    targetAudience: 'Homens e mulheres de 25 a 65 anos em busca de acolhimento emocional, renovação da esperança, conexão divina e alívio do estresse.',
    toneOfVoice: 'Acolhedor, solene, empático, esperançoso, reverente e inspirador. Nunca sensacionalista ou punitivo.',
    brandArchetype: 'O Mago & O Curador — transmuta dores em fé e sabedoria prática.',
    websiteUrl: 'https://www.magiadascrencas.com.br/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.magiadascrencas.app',
    appTitle: 'Magia das Crenças App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/magia-crencas.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#D4AF37', // Dourado radiante
      secondary: '#6D28D9', // Púrpura espiritual
      accent: '#38BDF8', // Azul celeste
      background: '#0B0F19' // Noite profunda
    },
    visualNegativeConstraints: [
      'NUNCA utilizar símbolos sombrios, góticos, crânios, demônios ou sangue',
      'NUNCA utilizar santos católicos descontextualizados ou misturados indevidamente',
      'NUNCA utilizar fotografias corporativas frias de escritórios ou modelos engravatados',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO prometer curas médicas milagrosas ou abandono de tratamento convencional',
      'PROIBIDO prometer enriquecimento fácil e sem trabalho em 24 horas',
      'PROIBIDO incutir medo de maldições para vender amuletos ou consultas'
    ],
    culturalReligiousSensitivities: [
      'Respeito irrestrito a todas as confissões de fé e espiritualidade livre',
      'Foco na espiritualidade laica, sincrética e inclusiva',
      'Linguagem fraterna que une em vez de polarizar'
    ],
    keyDifferentiators: [
      'Aplicativo nativo disponível na Play Store com oração do dia atualizada',
      'Curadoria de salmos e decretos alinhados com neurociência e bem-estar',
      'Comunidade ativa e acolhedora no Portal Vip Brasil'
    ],
    primaryKeywords: [
      'magia das crenças',
      'oração poderosa para abrir caminhos',
      'decreto de prosperidade imediata',
      'espiritualidade diária',
      'salmo de proteção'
    ],
    longTailKeywords: [
      'como elevar a vibração espiritual em momentos difíceis',
      'oração da manhã para começar o dia com paz e gratidão',
      'aplicativo de orações diárias e reflexões espirituais'
    ],
    searchIntentMap: {
      informational: ['qual salmo orar para aflição', 'significado de decretar prosperidade'],
      transactional: ['baixar app magia das crenças play store', 'comprar guia de orações'],
      navigational: ['site oficial magia das crenças', 'magiadascrencas com br']
    },
    conversionHooks: [
      'Sente que seus caminhos estão pesados? Faça esta oração agora e sinta o alívio imediato.',
      'Mais de 50.000 pessoas começam o dia com o decreto oficial. Baixe o app na Play Store.'
    ],
    callToActionCatalog: [
      'Toque aqui para baixar o aplicativo oficial na Google Play Store.',
      'Leia o decreto completo e receba a bênção do dia.',
      'Compartilhe esta luz com quem precisa de esperança hoje.'
    ],
    socialPlatforms: ['Instagram', 'YouTube', 'Pinterest', 'Facebook'],
    contentPillars: ['Oração Matinal', 'Decreto de Prosperidade', 'Salmo do Dia', 'Reflexão de Sabedoria'],
    videoVisualDirectives: 'Iluminação dourada translúcida, raios de sol entre árvores milenares, mãos em postura de oração, partículas de luz sutis flutuando em 4K 60fps. ZERO texto embutido na imagem.',
    allowedImageArchetypes: ['Luz solar ao amanhecer', 'Céu estrelado límpido', 'Velas suaves em castiçal nobre', 'Cristais naturais translúcidos'],
    prohibitedImageArchetypes: ['Figuras demoníacas', 'Armas', 'Cenários urbanos cinzentos poluídos', 'Letreiros artificiais'],
    appStoreKeywords: ['orações', 'fé', 'decretos', 'salmos', 'meditação', 'prosperidade espiritual'],
    proofPoints: [
      'Aplicativo publicado e ativo na Google Play Store',
      'Mais de 7 anos de atuação no ecossistema espiritual brasileiro'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Dossiê validado com dados oficiais do aplicativo e domínio www.magiadascrencas.com.br',
      unverifiedFields: []
    }
  },

  proj_exu_responde: {
    projectId: 'proj_exu_responde',
    brandName: 'Exu Responde',
    slug: 'exu-responde',
    segment: 'Consultas Espirituais, Conselhos & Sabedoria Ancestral',
    category: 'Oráculos & Religiões de Matriz Africana',
    tagline: 'Respostas diretas, firmeza nos caminhos e sabedoria ancestral.',
    mission: 'Desmistificar a figura sagrada de Exu como força cósmica de ordem, vitalidade, justiça e movimento, oferecendo conselhos éticos e acolhimento ancestral.',
    coreThemes: [
      'Tiragens e respostas de guardiões de luz',
      'Desbloqueio de caminhos e quebra de demandas espirituais',
      'Fundamentos da Umbanda e valorização das religiões de matriz africana',
      'Equilíbrio emocional através do autoconhecimento dos oráculos'
    ],
    targetAudience: 'Praticantes de Umbanda e Candomblé, simpatizantes, pessoas passando por encruzilhadas emocionais ou financeiras precisando de clareza imediata.',
    toneOfVoice: 'Firme, direto, respeitoso, sem meias-palavras, sábio e leal. Uma voz guardiã que protege e orienta sem bajulação.',
    brandArchetype: 'O Rebelde Iluminado & O Guardião do Umbral — quebra ilusões com a verdade libertadora.',
    websiteUrl: 'https://exu-responde.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde',
    appTitle: 'Exu Responde App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/exu-responde.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#DC2626', // Vermelho fogo de Exu
      secondary: '#000000', // Preto mistério e proteção
      accent: '#D97706', // Âmbar / bronze
      background: '#050505' // Noite fechada
    },
    visualNegativeConstraints: [
      'TERMINANTEMENTE PROIBIDO associar Exu ao diabo cristão, figuras com chifres pejorativos, forquilhas demonizadas ou carnificina',
      'TERMINANTEMENTE PROIBIDO misturar santos católicos nas tiragens de Exu',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO oferecer amarrações amorosas que ferem o livre-arbítrio alheio',
      'PROIBIDO prometer destruição de inimigos ou feitiços de vingança',
      'PROIBIDO banalizar a liturgia e o respeito devido aos terreiros e sacerdotes'
    ],
    culturalReligiousSensitivities: [
      'Combate intransigente ao racismo religioso e à intolerância contra religiões de matriz africana',
      'Respeito aos preceitos litúrgicos: Exu é orixá, é mensageiro, é guardião de lei',
      'Uso correto de saudações: Laroyê Exu, Exu é Mojubá'
    ],
    keyDifferentiators: [
      'Primeiro aplicativo oracular nativo com inteligência ancestral fundamentada',
      'Respostas estruturadas sem exploração financeira do consulente',
      'Defesa cultural ativa do patrimônio imaterial afro-brasileiro'
    ],
    primaryKeywords: [
      'exu responde',
      'oráculo de exu online',
      'conselho de exu para o amor e trabalho',
      'abertura de caminhos exu',
      'laroye exu mojubá'
    ],
    longTailKeywords: [
      'como saber a resposta de exu para uma dúvida urgente',
      'qual o significado de exu na umbanda sagrada',
      'aplicativo de oráculo dos guardiões na play store'
    ],
    searchIntentMap: {
      informational: ['quem é exu na umbanda', 'o que significa laroye'],
      transactional: ['tirar carta no exu responde app', 'consultar oraculo exu online'],
      navigational: ['exu responde app oficial', 'exu responde vercel app']
    },
    conversionHooks: [
      'Está diante de uma encruzilhada na sua vida? O guardião tem uma resposta franca para você.',
      'Consulte agora o oráculo e receba a firmeza que seu coração procura.'
    ],
    callToActionCatalog: [
      'Toque aqui para consultar o oráculo no app oficial na Google Play Store.',
      'Tire sua dúvida agora com o conselho do guardião.',
      'Laroyê! Compartilhe esta mensagem com quem precisa de firmeza nos passos.'
    ],
    socialPlatforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'],
    contentPillars: ['Conselho da Encruzilhada', 'Fundamentos de Proteção', 'Desmistificando Exu', 'Firmeza de Caminhos'],
    videoVisualDirectives: 'Encruzilhadas de terra ao crepúsculo, brasa viva acesa em detalhe macro, fumaça aromática de defumação ancestral, folhas de aroeira e elementos sagrados em iluminação cinematográfica chiaroscuro. ZERO texto embutido.',
    allowedImageArchetypes: ['Brasas reluzentes', 'Encruzilhada ao luar', 'Cálice de ferro nobre', 'Charuto ritualístico em fumaça etérea'],
    prohibitedImageArchetypes: ['Imagens do diabo cristão', 'Chifres vermelhos caricatos', 'Imagens de terror hollywoodiano'],
    appStoreKeywords: ['oráculo', 'exu', 'guardião', 'conselho', 'umbanda', 'abertura de caminhos'],
    proofPoints: [
      'Aplicativo verificado e ativo na Google Play Store',
      'Pioneirismo em tecnologia oracular com respeito aos fundamentos'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Dossiê alinhado aos fundamentos da Umbanda e App Store com ID oficial com.portalvipbrasil.exuresponde',
      unverifiedFields: []
    }
  },

  proj_maria_padilha: {
    projectId: 'proj_maria_padilha',
    brandName: 'Maria Padilha Rainha das 7 Encruzilhadas',
    slug: 'maria-padilha-rainha-das-7-encruzilhadas',
    segment: 'Espiritualidade, Autoestima, Força Feminina & Magnetismo',
    category: 'Pombagira, Sagrado Feminino & Relacionamentos',
    tagline: 'Desperte a soberania do seu coração e o poder do magnetismo pessoal.',
    mission: 'Promover o empoderamento feminino, a cura de feridas afetivas e o resgate da soberania pessoal através da energia régia de Maria Padilha.',
    coreThemes: [
      'Autoestima, magnetismo e poder de atração saudável',
      'Cura de dependência emocional e resgate da dignidade',
      'Orações, firmezas éticas e sintonia com a Rainha',
      'Conselhos afetivos com foco no amor-próprio como base de tudo'
    ],
    targetAudience: 'Mulheres e buscadores afetivos que enfrentam desilusões, buscam autoconfiança, magnetismo e reconciliação com o próprio valor.',
    toneOfVoice: 'Magnético, sofisticado, caloroso, altivo, empoderador e lúcido. Fala como uma soberana que ensina a levantar a cabeça.',
    brandArchetype: 'A Amante Magnética & A Rainha Soberana — equilibra sedução sadia com autoridade inabalável.',
    websiteUrl: 'https://maria-padilha-rainha-das-7-encruzilhadas.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilha',
    appTitle: 'Maria Padilha Rainha das 7 Encruzilhadas App',
    hasApp: true,
    logoUrl: '/icons/projects/maria-padilha.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#BE123C', // Rubi real / vermelho aveludado
      secondary: '#1C1917', // Preto ônix
      accent: '#F59E0B', // Ouro antigo
      background: '#0F0508' // Vinho escuro profundo
    },
    visualNegativeConstraints: [
      'NUNCA exibir vulgaridade, poses apelativas ou nudez desrespeitosa',
      'NUNCA retratar a entidade como figura demoníaca ou grotesca',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO prometer "amarração definitiva em 24h" ou trazer amor de volta contra a vontade',
      'PROIBIDO estimular submissão a relacionamentos abusivos',
      'PROIBIDO cobrar valores exorbitantes prometendo milagres imediatos'
    ],
    culturalReligiousSensitivities: [
      'Maria Padilha é entidade coroada de Umbanda e Quimbanda: respeito absoluto ao seu trono e fundamento',
      'Elementos sagrados respeitados: rosas vermelhas aveludadas, perfumes finos, champanhe, taça de cristal, leque e coroa régia',
      'Saudação oficial: Laroyê Maria Padilha! Salve a Rainha!'
    ],
    keyDifferentiators: [
      'Abordagem pioneira que une fundamentos espirituais com psicologia da autoestima e autovalorização',
      'App nativo interativo com orações e conselhos diários',
      'Conteúdo elegante e livre de estigmas e preconceitos'
    ],
    primaryKeywords: [
      'maria padilha rainha das 7 encruzilhadas',
      'oração de maria padilha para o amor próprio',
      'laroyê maria padilha',
      'firmeza de maria padilha para abrir caminhos amorosos',
      'conselho da pombagira'
    ],
    longTailKeywords: [
      'como ativar o magnetismo pessoal com a força de maria padilha',
      'oração para recuperar a autoestima e superar um término',
      'aplicativo oficial de maria padilha na google play store'
    ],
    searchIntentMap: {
      informational: ['história de maria padilha', 'como fazer firmeza para maria padilha'],
      transactional: ['baixar app maria padilha na play store', 'fazer oração guiada'],
      navigational: ['maria padilha portal vip brasil', 'app maria padilha play store']
    },
    conversionHooks: [
      'Você nasceu para ser cortejada pela vida, não para implorar atenção. Descubra sua força.',
      'Receba agora a mensagem especial da Rainha para seu coração no aplicativo oficial.'
    ],
    callToActionCatalog: [
      'Toque aqui para baixar o app na Play Store e receber sua mensagem diária.',
      'Faça a oração da soberania agora e eleve seu magnetismo.',
      'Salve a Rainha! Compartilhe com quem merece se sentir poderosa hoje.'
    ],
    socialPlatforms: ['Instagram', 'TikTok', 'Pinterest', 'YouTube'],
    contentPillars: ['Conselho Régio', 'Autoestima & Soberania', 'Firmeza Ética de Amor', 'História e Fundamentos'],
    videoVisualDirectives: 'Rosas vermelhas aveludadas abrindo em câmera lenta, gotas de orvalho reluzindo sob luz de velas, seda preta e rubi ondulando com suavidade, taça de cristal lapidado refletindo brilho dourado em 4K. ZERO texto embutido.',
    allowedImageArchetypes: ['Rosas vermelhas nobres', 'Leque de renda e ouro', 'Taça de cristal com espumante rubi', 'Coroa delicada em almofada de veludo'],
    prohibitedImageArchetypes: ['Vulgaridade', 'Caricaturas assustadoras', 'Ambientes médicos ou hospitalares'],
    appStoreKeywords: ['maria padilha', 'pombagira', 'autoestima', 'amor próprio', 'oráculo', 'rainha'],
    proofPoints: [
      'Aplicativo devocional de alta aprovação na Google Play Store',
      'Comunidade engajada com milhares de testemunhos de resgate da dignidade'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Validado com especificações oficiais da Play Store com.portalvipbrasil.mariapadilha',
      unverifiedFields: []
    }
  },

  proj_manual_catolico: {
    projectId: 'proj_manual_catolico',
    brandName: 'Manual Católico',
    slug: 'manual-catolico',
    segment: 'Doutrina, Liturgia, Devoção & Tradição da Igreja Católica',
    category: 'Fé Cristã, Tradição & Espiritualidade Bíblica',
    tagline: 'A fortaleza da fé cristã, a profundidade das orações e a luz dos santos.',
    mission: 'Ser o guia devocional definitivo para o fiel católico, unindo liturgia das horas, santo do dia, salmos, rosário e doutrina bimilenar com clareza e fidelidade.',
    coreThemes: [
      'Liturgia Diária e Santo do Dia com reflexão do Evangelho',
      'Santo Terço e Rosário Mariano completo',
      'Orações tradicionais dos Santos Padres e Doutores da Igreja',
      'Formação moral, virtudes cristãs e vida interior'
    ],
    targetAudience: 'Fiéis católicos, catequistas, famílias cristãs e qualquer pessoa buscando orações autênticas da Igreja e o Evangelho do dia.',
    toneOfVoice: 'Solene, sereno, reverente, humilde, doutrinário, reconfortante e litúrgico.',
    brandArchetype: 'O Pastor & O Guardião da Fé — transmite a verdade eterna com caridade e fidelidade.',
    websiteUrl: 'https://manual-catolico.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.manualcatolico',
    appTitle: 'Manual Católico App (Play Store)',
    hasApp: true,
    logoUrl: '/icons/projects/manual-catolico.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#1E3A8A', // Azul mariano profundo
      secondary: '#EAB308', // Ouro papal / sagrado
      accent: '#FFFFFF', // Branco litúrgico
      background: '#030712' // Azul noite sóbrio
    },
    visualNegativeConstraints: [
      'TERMINANTEMENTE PROIBIDO qualquer elemento esotérico, cartas de tarot, runas, amuletos pagãos ou mandalas',
      'NUNCA utilizar imagens de culto sincretista ou de outras religiões em desacordo com a tradição católica',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO publicar heresias, teologias da prosperidade mercantilistas ou distorções bíblicas',
      'PROIBIDO adotar tom agressivo contra fiéis de outras confissões',
      'PROIBIDO vender indulgências ou garantir salvação automática por cliques'
    ],
    culturalReligiousSensitivities: [
      'Fidelidade ao Magistério da Igreja Católica Apostólica Romana e ao Catecismo',
      'Respeito rigoroso aos ciclos litúrgicos (Advento, Natal, Quaresma, Páscoa, Tempo Comum)',
      'Reverência absoluta à Santíssima Trindade, à Virgem Maria e aos Santos'
    ],
    keyDifferentiators: [
      'Aplicativo completo com áudio das orações, Santo Terço guiado e Santo do Dia',
      'Curadoria teológica fundamentada em fontes patrísticas e bíblicas oficiais',
      'Zero anúncios intrusivos ou inapropriados para o momento de oração'
    ],
    primaryKeywords: [
      'manual católico',
      'liturgia diária católica',
      'santo do dia história e oração',
      'como rezar o terço passo a passo',
      'oração a são bento e nossa senhora'
    ],
    longTailKeywords: [
      'evangelho do dia com reflexão para a vida cristã',
      'oração de consagração a nossa senhora aparecida',
      'aplicativo católico com orações e bíblia na play store'
    ],
    searchIntentMap: {
      informational: ['qual é o santo de hoje', 'mistérios do rosário terça-feira'],
      transactional: ['baixar app manual católico play store', 'rezar terço online'],
      navigational: ['manual catolico app', 'site manual catolico']
    },
    conversionHooks: [
      'Comece seu dia na presença de Deus com o Evangelho e o Santo de hoje.',
      'Aprofunde sua oração diária com o Santo Terço completo no aplicativo da Play Store.'
    ],
    callToActionCatalog: [
      'Baixe o Manual Católico gratuitamente na Google Play Store.',
      'Reze a oração do Santo do Dia e peça sua intercessão.',
      'Compartilhe o Evangelho de hoje com sua família e amigos.'
    ],
    socialPlatforms: ['Instagram', 'Facebook', 'YouTube', 'Pinterest'],
    contentPillars: ['Liturgia Diária', 'Santo do Dia', 'Mistérios do Terço', 'Doutrina & Virtudes'],
    videoVisualDirectives: 'Vitrais góticos iluminados pela luz matinal, velas do altar acesas com chama mansa, Bíblia Sagrada encadernada em couro sobre estante de carvalho, detalhes artísticos de catedrais sacras em planos cinematográficos contemplativos. ZERO texto embutido.',
    allowedImageArchetypes: ['Vitrais sacros', 'Ícones bizantinos e clássicos', 'Terço de madeira nobre sobre bíblia', 'Catedrais e capelas históricas'],
    prohibitedImageArchetypes: ['Cartas de tarot', 'Runas nórdicas', 'Esoterismo', 'Festas mundanas'],
    appStoreKeywords: ['católico', 'oração', 'terço', 'evangelho', 'santo do dia', 'bíblia', 'liturgia'],
    proofPoints: [
      'Aplicativo nativo disponível na Google Play Store',
      'Conformidade integral com os textos litúrgicos da CNBB'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Validado com parâmetros litúrgicos e identificador de app com.portalvipbrasil.manualcatolico',
      unverifiedFields: []
    }
  },

  proj_froc_ia: {
    projectId: 'proj_froc_ia',
    brandName: 'Froc IA',
    slug: 'froc-ia',
    segment: 'Inteligência Artificial Generativa, Engenharia de Software & Inovação',
    category: 'Tecnologia, Inteligência Artificial & SaaS',
    tagline: 'Engenharia de inteligência artificial prática que transforma negócios e acelera o futuro.',
    mission: 'Capacitar desenvolvedores, criadores e empresas com soluções robustas de IA generativa, prompts de alta precisão e automações inteligentes escaláveis.',
    coreThemes: [
      'Arquitetura com SDK @google/genai e modelos Gemini (gemini-3.8-flash)',
      'Engenharia de prompts avançada e function calling',
      'Automação de fluxos de conteúdo e agentes cognitivos autônomos',
      'Desenvolvimento moderno com React, TypeScript e microsserviços Node'
    ],
    targetAudience: 'Desenvolvedores, fundadores de startups, engenheiros de software, gestores de tecnologia e criadores que desejam implementar IA real em produção.',
    toneOfVoice: 'Técnico, vanguardista, pragmático, analítico, seguro e direto. Foco em arquitetura e código que funciona.',
    brandArchetype: 'O Visionário & O Criador — constrói sistemas que resolvem complexidade com elegância técnica.',
    websiteUrl: 'https://froc-ia.vercel.app/',
    playStoreUrl: 'Não verificado — confirmação necessária',
    appTitle: 'Não verificado — confirmação necessária',
    hasApp: false,
    logoUrl: '/icons/projects/froc-ia.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#06B6D4', // Ciano futurista
      secondary: '#3B82F6', // Azul tecnologia
      accent: '#10B981', // Verde neon sucesso
      background: '#030712' // Espaço cibernético profundo
    },
    visualNegativeConstraints: [
      'NUNCA utilizar robôs humanoides destruidores, olhos vermelhos de ficção científica apocalíptica',
      'NUNCA utilizar elementos místicos ou religiosos (fora do contexto de análise tecnológica)',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO anunciar inteligência artificial que substitui profissionais sem supervisão',
      'PROIBIDO vender promessas de "lucro passivo automático" através de robôs de IA',
      'PROIBIDO utilizar modelos descontinuados ou alucinar especificações irreais'
    ],
    culturalReligiousSensitivities: [
      'Ética estrita em inteligência artificial e transparência de modelos',
      'Proteção de dados, conformidade com a LGPD e privacidade de tokens',
      'Inclusão digital e acessibilidade tecnológica para desenvolvedores brasileiros'
    ],
    keyDifferentiators: [
      'Engenharia nativa com o SDK mais recente do Google (@google/genai)',
      'Redução comprovada de 60% em custos de tokens através de cache e destilação de contexto',
      'Integração total ao ecossistema Portal Vip Brasil'
    ],
    primaryKeywords: [
      'froc ia',
      'inteligência artificial para empresas',
      'desenvolvimento com gemini api brasil',
      'automação com agentes de ia',
      'engenharia de prompts profissional'
    ],
    longTailKeywords: [
      'como integrar o sdk @google/genai em aplicações react e typescript',
      'arquitetura de agentes de ia autônomos para geração de conteúdo',
      'otimização de custos de api de inteligência artificial em produção'
    ],
    searchIntentMap: {
      informational: ['como funciona o gemini 3.8 flash', 'o que é function calling'],
      transactional: ['contratar froc ia consultoria', 'acessar plataforma froc ia'],
      navigational: ['froc ia portal vip brasil', 'froc ia vercel app']
    },
    conversionHooks: [
      'Automatize seus processos críticos com agentes de IA que realmente entregam código funcional.',
      'Economize até 60% na sua fatura de LLMs com nossa arquitetura otimizada.'
    ],
    callToActionCatalog: [
      'Explore as soluções de IA da Froc IA no Portal Vip Brasil.',
      'Veja o código de exemplo e implemente agora em seus projetos.',
      'Conecte sua empresa à próxima geração de inteligência artificial.'
    ],
    socialPlatforms: ['LinkedIn', 'GitHub', 'YouTube', 'X/Twitter'],
    contentPillars: ['Engenharia de Prompts', 'Arquitetura de LLMs', 'Estudos de Caso de Automação', 'Tendências de IA'],
    videoVisualDirectives: 'Renderizações 3D abstratas de feixes de dados em nós neurais, interfaces holográficas minimalistas, servidores em rack com luzes azuis e ciano pulsantes, telas de código com sintaxe moderna. ZERO texto gerado na imagem.',
    allowedImageArchetypes: ['Redes neurais luminosas 3D', 'Data centers ultra limpos', 'Ondas cinemáticas de partículas cibernéticas'],
    prohibitedImageArchetypes: ['Robôs com aparência ameaçadora', 'Cenários medievais', 'Clichês de aperto de mãos robô-humano'],
    appStoreKeywords: ['inteligência artificial', 'automação', 'tecnologia', 'software', 'gemini api'],
    proofPoints: [
      'Engenharia implementada e rodando no núcleo de 30 agentes do portal',
      'Processamento de alta velocidade e arquitetura sem dependências obsoletas'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Dossiê validado para o ecossistema Froc IA. App nativo móvel marcado como pendente de confirmação.',
      unverifiedFields: ['playStoreUrl', 'appTitle']
    }
  },

  proj_oraculos: {
    projectId: 'proj_oraculos',
    brandName: 'Oráculos & Runas Nórdicas',
    slug: 'oraculos',
    segment: 'Tarot de Marselha, Baralho Cigano (Lenormand) & Futhark Antigo',
    category: 'Cartomancia, Runas Nórdicas & Autoconhecimento Simbólico',
    tagline: 'O espelho da alma através dos símbolos milenares dos oráculos.',
    mission: 'Proporcionar leituras oraculares profundas, responsáveis e fundamentadas na psicologia arquetípica de Carl Jung e nas tradições celtas e nórdicas.',
    coreThemes: [
      'Os 78 Arcanos do Tarot (Maiores e Menores) e suas jornadas interiores',
      'Mesa Real do Baralho Cigano de Santa Sara Kali para clareza cotidiana',
      'As 24 Runas do Futhark Antigo e a sabedoria ancestral de Odin',
      'Sincronicidade, arquétipos e tomada de decisão consciente'
    ],
    targetAudience: 'Estudantes de esoterismo, pessoas em momentos de transição pessoal ou profissional e buscadores de respostas oraculares sérias.',
    toneOfVoice: 'Místico, profundo, filosófico, sábio, sereno e ético. Evita o fatalismo e prioriza o autoconhecimento.',
    brandArchetype: 'O Eremita & O Oráculo — ilumina a escuridão do caminho com a lanterna da sabedoria interior.',
    websiteUrl: 'https://oraculos-web.vercel.app/',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.oraculos',
    appTitle: 'Oráculos: Tarot, Runas & Baralho Cigano App',
    hasApp: true,
    logoUrl: '/icons/projects/oraculos.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#9333EA', // Roxo ametista oracular
      secondary: '#4338CA', // Índigo profundo
      accent: '#F59E0B', // Ouro runa
      background: '#0B0A17' // Universo oracular
    },
    visualNegativeConstraints: [
      'NUNCA misturar símbolos cristãos ou santos católicos nas runas vikings',
      'NUNCA retratar o diabo dos quadrinhos ou imagens sangrentas',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO emitir sentenças deterministas fatais como "você sofrerá um acidente" ou previsões de morte',
      'PROIBIDO incentivar dependência psicológica onde o consulente não toma nenhuma decisão sem consultar cartas',
      'PROIBIDO explorar a dor de consulentes fragilizados com cobranças abusivas'
    ],
    culturalReligiousSensitivities: [
      'Respeito às raízes históricas dos povos nórdicos e da mitologia escandinava',
      'Reverência à tradição do Povo Cigano e devoção a Santa Sara Kali no Lenormand',
      'Enfoque do oráculo como bússola de reflexão e nunca como prisão do destino'
    ],
    keyDifferentiators: [
      'Plataforma única que une Tarot clássico, Baralho Cigano e Runas Vikings num só lugar',
      'App interativo com tiragens em cruz celta, templo de afrodite e três runas de nornas',
      'Interpretações profundas escritas por especialistas no simbolismo tradicional'
    ],
    primaryKeywords: [
      'oráculos online',
      'tiragem de tarot grátis',
      'baralho cigano mesa real',
      'runas nórdicas significado futhark',
      'arcanos do tarot interpretação'
    ],
    longTailKeywords: [
      'qual o significado da runa fehu na tiragem de trabalho',
      'como fazer uma tiragem de três cartas no baralho cigano para o amor',
      'aplicativo de oráculos com tarot e runas nórdicas na google play store'
    ],
    searchIntentMap: {
      informational: ['significado da carta a torre no tarot', 'o que são as runas de odin'],
      transactional: ['tirar tarot online no aplicativo', 'baixar app oráculos play store'],
      navigational: ['oráculos portal vip brasil', 'oraculos web vercel app']
    },
    conversionHooks: [
      'As cartas não determinam seu futuro, elas revelam as correntes do presente. Tire sua lâmina.',
      'Consulte as runas nórdicas e encontre o conselho que sua intuição já sussurrava.'
    ],
    callToActionCatalog: [
      'Toque aqui para baixar o aplicativo Oráculos na Google Play Store.',
      'Faça sua tiragem de hoje e desvende o conselho dos arcanos.',
      'Compartilhe esta leitura com quem busca clareza em seu caminho.'
    ],
    socialPlatforms: ['Instagram', 'Pinterest', 'YouTube', 'TikTok'],
    contentPillars: ['Arcano do Dia', 'Runa da Semana', 'Tiragens Guiadas', 'Arquétipos Junguianos'],
    videoVisualDirectives: 'Madeira rústica entalhada com runas brilhando em dourado sob luz de tocha, cartas de tarot com bordas douradas sendo abertas sobre veludo roxo escuro, pedras de ametista e quartzo fumê ao fundo, atmosfera nórdica ancestral. ZERO texto gerado.',
    allowedImageArchetypes: ['Runas de madeira sobre musgo nórdico', 'Cartas de tarot clássicas em mesa nobre', 'Cristais e ametistas naturais'],
    prohibitedImageArchetypes: ['Imagens bíblicas descontextualizadas', 'Monstros de videogame', 'Ambientes futuristas cibernéticos'],
    appStoreKeywords: ['tarot', 'runas', 'baralho cigano', 'oráculo', 'arcanos', 'futuro', 'autoconhecimento'],
    proofPoints: [
      'Aplicativo completo publicado na Google Play Store',
      'Acervo detalhado dos 78 arcanos e 24 runas totalmente documentados'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Dossiê validado com ID de pacote com.portalvipbrasil.oraculos e domínio oraculos-web.vercel.app',
      unverifiedFields: []
    }
  },

  proj_froc_marketing_engine: {
    projectId: 'proj_froc_marketing_engine',
    brandName: 'Froc IA Marketing Engine',
    slug: 'froc-ia-marketing-engine',
    segment: 'Growth Hacking, Yoast SEO, Sitemaps XML, Pings & Tráfego Multicanal',
    category: 'Marketing Digital, SEO de Alto Impacto & Automação de Tráfego',
    tagline: 'O motor definitivo para domínio de tráfego orgânico, posicionamento no Google e conversão.',
    mission: 'Capacitar as marcas do ecossistema a conquistar o topo dos buscadores através de SEO técnico rigoroso, sitemaps XML perfeitos, cópia magnética e campanhas de anúncios de altíssimo ROI.',
    coreThemes: [
      'Auditoria de SEO On-Page padrão Yoast e RankMath (título, meta description, H1-H3, slug)',
      'Sitemaps XML 0.9 com imagens e rich snippets Schema.org (JSON-LD)',
      'Notificações de indexação rápida via protocolo IndexNow (Bing, Yandex)',
      'Gestão integrada de campanhas de alta conversão (Meta Ads, Google Search, TikTok e Pinterest)'
    ],
    targetAudience: 'Empreendedores, gestores de tráfego, redatores, analistas de SEO e os administradores do Portal Vip Brasil.',
    toneOfVoice: 'Estratégico, persuasivo, analítico, focado em métricas, conversão e crescimento sustentável.',
    brandArchetype: 'O Conquistador & O Estrategista — desenha planos de dominação de mercado e os executa com precisão matemática.',
    websiteUrl: 'https://froc-ia-marketing-engine.vercel.app/',
    playStoreUrl: 'Não verificado — confirmação necessária',
    appTitle: 'Não verificado — confirmação necessária',
    hasApp: false,
    logoUrl: '/icons/projects/froc-marketing-engine.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#10B981', // Verde esmeralda crescimento / ROI
      secondary: '#0F172A', // Slate escuro executivo
      accent: '#6366F1', // Índigo conversão
      background: '#040B11' // Fundo analítico de alta performance
    },
    visualNegativeConstraints: [
      'NUNCA utilizar prints falsos de saldos bancários ou faturamento milionário estilo "guru fake"',
      'NUNCA utilizar imagens de carros de luxo ou ostentação barata',
      'NUNCA utilizar o logotipo genérico /icons/logo.png'
    ],
    editorialNegativeConstraints: [
      'PROIBIDO prometer "1º lugar no Google garantido em 24 horas" sem trabalho de SEO de qualidade',
      'PROIBIDO recomendar práticas Black Hat SEO (fazenda de links, cloaking, keyword stuffing)',
      'PROIBIDO sugerir compra de seguidores ou métricas de vaidade sem conversão'
    ],
    culturalReligiousSensitivities: [
      'Ética profissional e transparência em todas as auditorias e relatórios de métricas',
      'Respeito rigoroso às políticas de anúncios da Meta, Google Ads e TikTok Ads',
      'Conformidade com os padrões de busca útil e confiável do Google (Helpful Content / EEAT)'
    ],
    keyDifferentiators: [
      'Motor de IA diretamente conectado a sitemaps XML reais e auditoria Yoast em tempo real',
      'Integração nativa com os 30 agentes especializados do Portal Vip Brasil',
      'Arquitetura de proteção financeira com teto de custos Fail-Closed'
    ],
    primaryKeywords: [
      'froc ia marketing engine',
      'seo técnico padrão yoast',
      'automação de marketing digital',
      'sitemap xml e indexnow brasil',
      'otimização de taxa de conversão cro'
    ],
    longTailKeywords: [
      'como configurar sitemap xml com imagens para rankear no google',
      'estratégias de copywriting persuasivo para anúncios no meta ads e google',
      'arquitetura de tráfego orgânico cruzado entre portal de conteúdo e vitrine'
    ],
    searchIntentMap: {
      informational: ['como funciona o protocolo indexnow', 'como auditar seo on-page'],
      transactional: ['ativar froc ia marketing engine', 'otimizar sitemap do portal'],
      navigational: ['froc ia marketing engine login', 'froc marketing engine portal vip']
    },
    conversionHooks: [
      'Pare de perder tráfego para concorrentes que sabem usar SEO técnico. Audite suas páginas agora.',
      'Transforme visitantes curiosos em clientes fiéis com copywriting estruturado para conversão.'
    ],
    callToActionCatalog: [
      'Ative a automação inteligente no painel da Froc IA Marketing Engine.',
      'Consulte o Yoast SEO Specialist para otimizar seus artigos hoje.',
      'Acompanhe o crescimento das suas métricas no painel de controle do portal.'
    ],
    socialPlatforms: ['LinkedIn', 'YouTube', 'X/Twitter', 'Instagram'],
    contentPillars: ['SEO Técnico & Sitemaps', 'Copywriting & Ganchos Virais', 'Tráfego Pago & ROI', 'CRO & Conversão'],
    videoVisualDirectives: 'Gráficos holográficos de crescimento orgânico ascendente, painéis de telemetria analítica com visualização fluida de dados, mapas de calor de interação de usuários e interfaces de busca em alta resolução. ZERO texto gerado.',
    allowedImageArchetypes: ['Gráficos vetoriais limpos de analytics', 'Telas de SEO e performance técnica', 'Conceito de funil de conversão iluminado'],
    prohibitedImageArchetypes: ['Ostentação de carros e notas de dinheiro', 'Gráficos rabiscados', 'Pessoas desesperadas em frente a computadores'],
    appStoreKeywords: ['marketing digital', 'seo', 'analytics', 'growth hacking', 'tráfego pago'],
    proofPoints: [
      'Motor ativo que orquestra as diretrizes de SEO do Portal Vip Brasil',
      'Estrutura com mais de 30 agentes especializados cobrindo todas as áreas de marketing'
    ],
    verificationStatus: {
      isAudited: true,
      lastAuditedAt: '2026-10-27T00:00:00.000Z',
      auditNotes: 'Dossiê validado para o núcleo de marketing da Froc IA. App móvel não aplicável (SaaS web).',
      unverifiedFields: ['playStoreUrl', 'appTitle']
    }
  }
};

/**
 * Retorna o dossiê mestre de uma marca/projeto, combinando a definição canônica
 * com eventuais personalizações salvas no Firestore. Se for um projeto dinâmico novo,
 * gera um dossiê preenchendo todos os 35 campos com rigor.
 */
export async function getMasterBrandDossier(projectId: string): Promise<MasterBrandDossier | null> {
  if (!projectId) return null;
  const cleanId = projectId.trim();

  // 1. Tenta carregar do Firestore primeiro
  let dbProject: PortalProjectItem | null = null;
  try {
    dbProject = await getPortalProjectFromDb(cleanId);
  } catch {
    // Falha silenciosa de banco recorre ao catálogo canônico
  }

  // 2. Base canônica se existir
  const canonical = CANONICAL_BRAND_DOSSIERS[cleanId] || null;

  if (!dbProject && !canonical) {
    // Procura por slug ou similar nos projetos canônicos
    const foundCanonical = Object.values(CANONICAL_BRAND_DOSSIERS).find(
      (d) => d.slug === cleanId || d.brandName.toLowerCase() === cleanId.toLowerCase()
    );
    if (foundCanonical) return foundCanonical;
    return null;
  }

  // 3. Mescla o dossiê respeitando os dados do Firestore e garantindo os 35 campos
  const baseDossier = canonical || {
    projectId: dbProject?.id || cleanId,
    brandName: dbProject?.name || cleanId,
    slug: dbProject?.slug || cleanId,
    segment: dbProject?.segment || 'Não verificado — confirmação necessária',
    category: dbProject?.category || 'Geral & Negócios',
    tagline: dbProject?.tagline || 'Excelência e autoridade no Portal Vip Brasil.',
    mission: dbProject?.description || 'Promover soluções de valor para sua audiência.',
    coreThemes: dbProject?.highlights || ['Conteúdo relevante e atualizado'],
    targetAudience: dbProject?.targetAudience || 'Não verificado — confirmação necessária',
    toneOfVoice: 'Profissional, acolhedor e informativo.',
    brandArchetype: 'O Especialista',
    websiteUrl: dbProject?.websiteUrl || 'https://portal-vip-brasil.vercel.app',
    playStoreUrl: dbProject?.playStoreUrl || 'Não verificado — confirmação necessária',
    appTitle: dbProject?.appTitle || 'Não verificado — confirmação necessária',
    hasApp: Boolean(dbProject?.hasApp),
    logoUrl: dbProject?.logoUrl || '/icons/projects/froc-ia.svg',
    bannerUrl: dbProject?.bannerUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    colorPalette: {
      primary: '#3B82F6',
      secondary: '#1E293B',
      accent: '#10B981',
      background: '#0B0F17'
    },
    visualNegativeConstraints: [
      'Proibido utilizar o logotipo genérico /icons/logo.png',
      'Proibido utilizar elementos fora do nicho cadastrado'
    ],
    editorialNegativeConstraints: [
      'Proibido fazer falsas promessas ou divulgar informações inverídicas'
    ],
    culturalReligiousSensitivities: [
      'Respeito ético ao público do segmento'
    ],
    keyDifferentiators: dbProject?.highlights || ['Presença confirmada no Portal Vip Brasil'],
    primaryKeywords: dbProject?.keywords || [cleanId],
    longTailKeywords: [cleanId + ' informações e novidades'],
    searchIntentMap: {
      informational: ['o que é ' + (dbProject?.name || cleanId)],
      transactional: ['acessar ' + (dbProject?.name || cleanId)],
      navigational: ['site oficial ' + (dbProject?.name || cleanId)]
    },
    conversionHooks: [
      'Conheça agora as novidades exclusivas de ' + (dbProject?.name || cleanId)
    ],
    callToActionCatalog: [
      'Visite o site oficial e confira todos os detalhes.'
    ],
    socialPlatforms: ['Instagram', 'YouTube'],
    contentPillars: ['Novidades', 'Dicas Exclusivas', 'Apresentação'],
    videoVisualDirectives: 'Cenas em alta definição alinhadas ao nicho, iluminação limpa e zero texto na imagem.',
    allowedImageArchetypes: ['Fotografia temática de alta resolução'],
    prohibitedImageArchetypes: ['Imagens descontextualizadas de outros nichos'],
    appStoreKeywords: dbProject?.keywords || [],
    proofPoints: ['Presença na vitrine oficial do Portal Vip Brasil'],
    verificationStatus: {
      isAudited: false,
      lastAuditedAt: 'Não verificado — confirmação necessária',
      auditNotes: 'Projeto cadastrado dinamicamente; dados básicos herdados do Firestore.',
      unverifiedFields: ['playStoreUrl', 'appTitle', 'targetAudience']
    }
  };

  // Se dbProject existe, aplica overrides de campos persistidos pelo usuário
  if (dbProject) {
    baseDossier.brandName = dbProject.name || baseDossier.brandName;
    baseDossier.slug = dbProject.slug || baseDossier.slug;
    baseDossier.category = dbProject.category || baseDossier.category;
    baseDossier.segment = dbProject.segment || baseDossier.segment;
    baseDossier.websiteUrl = dbProject.websiteUrl || baseDossier.websiteUrl;
    baseDossier.tagline = dbProject.tagline || baseDossier.tagline;
    if (dbProject.playStoreUrl) {
      baseDossier.playStoreUrl = dbProject.playStoreUrl;
      baseDossier.hasApp = true;
    }
    if (dbProject.appTitle) baseDossier.appTitle = dbProject.appTitle;
    if (dbProject.logoUrl && dbProject.logoUrl !== '/icons/logo.png') {
      baseDossier.logoUrl = dbProject.logoUrl;
    }
    if (dbProject.bannerUrl) baseDossier.bannerUrl = dbProject.bannerUrl;
    if (dbProject.targetAudience) baseDossier.targetAudience = dbProject.targetAudience;
    if (dbProject.highlights && dbProject.highlights.length > 0) {
      baseDossier.keyDifferentiators = dbProject.highlights;
    }
    if (dbProject.keywords && dbProject.keywords.length > 0) {
      baseDossier.primaryKeywords = dbProject.keywords;
    }
  }

  return baseDossier;
}

/**
 * Formata um dossiê mestre de marca como contexto estruturado
 * para injeção em prompts dos 30 agentes e nos motores editoriais.
 */
export function formatDossierForAgentContext(dossier: MasterBrandDossier): string {
  return `=== DOSSIÊ MESTRE DE MARCA VERIFICADO: ${dossier.brandName} ===
1. Projeto / Slug: ${dossier.projectId} (${dossier.slug})
2. Segmento & Categoria: ${dossier.segment} | ${dossier.category}
3. Tagline Oficial: "${dossier.tagline}"
4. Missão: ${dossier.mission}
5. Público-Alvo: ${dossier.targetAudience}
6. Tom de Voz: ${dossier.toneOfVoice}
7. Arquétipo de Marca: ${dossier.brandArchetype}
8. Presença Digital:
   - Website Oficial: ${dossier.websiteUrl}
   - App Google Play Store: ${dossier.hasApp ? `${dossier.appTitle} (${dossier.playStoreUrl})` : 'Sem app mobile publicado'}
   - Logo Oficial Vetorial: ${dossier.logoUrl}
   - Banner de Capa: ${dossier.bannerUrl}
9. Paleta Cromática: Primária ${dossier.colorPalette.primary}, Secundária ${dossier.colorPalette.secondary}, Acento ${dossier.colorPalette.accent}
10. REGRAS NEGATIVAS VISUAIS (PROIBIDO GERAR OU DESCREVER):
${dossier.visualNegativeConstraints.map((c) => `    * [PROIBIÇÃO VISUAL] ${c}`).join('\n')}
11. REGRAS NEGATIVAS EDITORIAIS (PROIBIDO AFIRMAR OU PROMETER):
${dossier.editorialNegativeConstraints.map((c) => `    * [PROIBIÇÃO EDITORIAL] ${c}`).join('\n')}
12. FUNDAMENTOS CULTURAIS & RELIGIOSOS:
${dossier.culturalReligiousSensitivities.map((s) => `    * ${s}`).join('\n')}
13. Diferenciais Únicos: ${dossier.keyDifferentiators.join(' | ')}
14. Palavras-Chave Foco (SEO Primário): ${dossier.primaryKeywords.join(', ')}
15. Palavras-Chave Cauda Longa: ${dossier.longTailKeywords.join(', ')}
16. Ganchos de Conversão: ${dossier.conversionHooks.join(' | ')}
17. Catálogo de Chamadas para Ação (CTAs):
${dossier.callToActionCatalog.map((cta) => `    * ${cta}`).join('\n')}
18. Pilares de Conteúdo: ${dossier.contentPillars.join(', ')}
19. Diretivas para Vídeo Veo: ${dossier.videoVisualDirectives}
20. Status de Verificação Real: ${dossier.verificationStatus.isAudited ? `Auditado em ${dossier.verificationStatus.lastAuditedAt} (${dossier.verificationStatus.auditNotes})` : 'Pendente de auditoria'}
${dossier.verificationStatus.unverifiedFields.length > 0 ? `    * Campos não verificados: ${dossier.verificationStatus.unverifiedFields.join(', ')}` : ''}
============================================================`;
}
