// Utilitário de capas temáticas de altíssima conversão (CTR Orgânico) e saneamento visual de artigos do Blog
// Garante capas deslumbrantes, hiper-relevantes ao nicho do post e variedade sem repetições visuais.

export interface CoverAsset {
  url: string;
  alt: string;
}

export const NICHE_PHOTO_CATALOG: Record<string, CoverAsset[]> = {
  // 1. Runas Nórdicas, Mitologia Viking e Sabedoria Ancestral
  runes_viking: [
    {
      url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=1200&q=80',
      alt: 'Runas nórdicas gravadas em pedras místicas sobre madeira ancestral para tiragens'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      alt: 'Tocha sagrada e fogo iluminando símbolos nórdicos e força viking'
    },
    {
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Paisagem épica nórdica com névoa serena e pedras ancestrais'
    },
    {
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Montanhas imponentes e céus nórdicos invocando a coragem e sabedoria viking'
    },
    {
      url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Floresta ancestral mística envolta em neblina para rituais rúnicos'
    },
    {
      url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
      alt: 'Caminho ancestral entre carvalhos sagrados e energia da mitologia nórdica'
    },
    {
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      alt: 'Grimório antigo e manuscrito de símbolos rúnicos e ensinamentos arcanos'
    }
  ],

  // 2. Tarot, Cartomancia, Baralho Cigano & Oráculos Sagrados
  tarot_oraculos: [
    {
      url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cartas clássicas de tarot e baralho cigano distribuídas com riqueza de detalhes'
    },
    {
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mesa de cartomancia com cartas clássicas de tarot e velas de firmeza'
    },
    {
      url: 'https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cartas de baralho oracular iluminadas com estética mística e revelações'
    },
    {
      url: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mandala astrológica com cartas arcanas e alinhamento oracular'
    },
    {
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cristais de ametista e quartzo ao lado de cartas oraculares iluminadas'
    },
    {
      url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Velas cintilantes e atmosfera de vidência e revelação espiritual'
    },
    {
      url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      alt: 'Meditação profunda e intuição conectada às leituras oraculares'
    },
    {
      url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estudo aprofundado dos mistérios e arcanos maiores da cartomancia'
    }
  ],

  // 3. Maria Padilha, Simpatias Amorosas, Sedução, Magnetismo e Autoestima
  love_maria_padilha: [
    {
      url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
      alt: 'Rosas vermelhas rubras intensas simbolizando paixão irresistível e poder afetivo'
    },
    {
      url: 'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pétalas escarlates aveludadas para atração amorosa, magnetismo e Maria Padilha'
    },
    {
      url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=80',
      alt: 'Buquê de rosas aveludadas para rituais de atração, magnetismo e amor próprio'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      alt: 'Velas vermelhas sagradas ardendo em firmeza de intenção e sedução'
    },
    {
      url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
      alt: 'Conexão amorosa e sentimento verdadeiro sob iluminação romântica'
    },
    {
      url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pétalas de rosas escarlates e atmosfera encantadora de conquista'
    },
    {
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      alt: 'Luzes douradas e ambiente misterioso da Rainha das Encruzilhadas'
    },
    {
      url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
      alt: 'Símbolo do coração dourado e atração de alma gêmea'
    }
  ],

  // 4. Exu, Guardiões, Abertura de Caminhos, Umbanda & Quimbanda
  exu_guardioes: [
    {
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Fogueira sagrada na noite e firmeza de guardiões para destravamento de caminhos'
    },
    {
      url: 'https://images.unsplash.com/photo-1498855926480-d98e83099315?auto=format&fit=crop&w=1200&q=80',
      alt: 'Chama ancestral radiante e quebra de demandas espirituais com proteção de Exu'
    },
    {
      url: 'https://images.unsplash.com/photo-1475724017904-b712052c192a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Chamas ardentes e labaredas de purificação e força ancestral'
    },
    {
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
      alt: 'Energia crepuscular e força espiritual protetora na encruzilhada'
    },
    {
      url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Encruzilhada iluminada com caminhos amplos e abertos para novas oportunidades'
    },
    {
      url: 'https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?auto=format&fit=crop&w=1200&q=80',
      alt: 'Fogueira ceremonial na natureza emanando poder e proteção de Exu'
    },
    {
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Altar tradicional de guardiões com elementos sagrados de proteção'
    },
    {
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estrada dourada no horizonte que simboliza vitória sobre obstáculos'
    }
  ],

  // 5. Católico, Terço, Bíblia, Santos, Novenas & Liturgia Sagrada
  catolico_devocao: [
    {
      url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      alt: 'Bíblia Sagrada e terço com velas acesas no momento de oração'
    },
    {
      url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
      alt: 'Vela sagrada no altar da igreja e recolhimento litúrgico'
    },
    {
      url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
      alt: 'Interior majestoso de templo católico com iluminação suave de devoção'
    },
    {
      url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cúpula e vitrais sacros inspirando serenidade, oração e bênçãos'
    },
    {
      url: 'https://images.unsplash.com/photo-1515549832467-8783363e19b6?auto=format&fit=crop&w=1200&q=80',
      alt: 'Atmosfera de santuário católico, paz interior e novenas milagrosas'
    },
    {
      url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mãos em oração com fé inabalável e bênção divina'
    },
    {
      url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Raios celestiais descendo como graça e conforto espiritual'
    }
  ],

  // 6. Magia das Crenças, Prosperidade, Gratidão & Lei da Atração
  prosperidade_crencas: [
    {
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      alt: 'Céu estrelado e montanhas iluminadas pelo poder das crenças positivas'
    },
    {
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      alt: 'Conquista, elegância e realização dos objetivos de prosperidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1200&q=80',
      alt: 'Crescimento financeiro, riqueza e manifestação da prosperidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Nascer do sol dourado no mar refletindo gratidão e abundância financeira'
    },
    {
      url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Luz solar incidindo sobre sementes de prosperidade e conquista material'
    },
    {
      url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
      alt: 'Raios dourados entre árvores trazendo renovação de energias e fé'
    },
    {
      url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=1200&q=80',
      alt: 'Brilho dourado cintilante e atração de boa sorte e harmonia'
    },
    {
      url: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?auto=format&fit=crop&w=1200&q=80',
      alt: 'Pôr do sol inspirador com serenidade e afirmações positivas'
    }
  ],

  // 7. Froc IA, Inteligência Artificial, Automação & Tecnologia do Futuro
  ia_inteligencia_artificial: [
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      alt: 'Ondas sinápticas de inteligência artificial generativa em tons vibrantes'
    },
    {
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cérebro digital com conexões neurais avançadas de IA e inovação'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planeta digital e conexões globais de dados em alta velocidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Matriz de código e algoritmos inteligentes de automação'
    },
    {
      url: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Robótica avançada e integração com modelos generativos autônomos'
    },
    {
      url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80',
      alt: 'Laptop de alta tecnologia e arquitetura de sistemas autônomos'
    },
    {
      url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Tecnologia de inteligência artificial com visual limpo e moderno'
    },
    {
      url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
      alt: 'Linhas de código de alto desempenho impulsionando automações digitais'
    },
    {
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      alt: 'Processador neural de última geração com luzes azuis e douradas'
    },
    {
      url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Interações digitais e fluxo contínuo de inovação com IA'
    }
  ],

  // 8. Tráfego Orgânico, SEO, Google Play Store, ASO & Crescimento Viral
  trafego_organico_growth: [
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Dashboard de tráfego orgânico com curvas de crescimento exponencial e métricas de SEO'
    },
    {
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
      alt: 'Trabalho estratégico de crescimento de audiência e atração de tráfego orgânico'
    },
    {
      url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estratégia de crescimento acelerado e posicionamento no topo das pesquisas'
    },
    {
      url: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=1200&q=80',
      alt: 'Escalada para a posição número 1 no Google e Play Store'
    },
    {
      url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planejamento digital com foco em métricas de conversão e visitas recorrentes'
    },
    {
      url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Gráficos de conversão e explosão de visualizações orgânicas'
    },
    {
      url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
      alt: 'Aplicativo mobile moderno no smartphone com milhares de downloads'
    },
    {
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      alt: 'Métricas de engajamento, SEO técnico e audiência orgânica qualificada'
    },
    {
      url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planejamento tático de conversão e marketing de autoridade'
    },
    {
      url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
      alt: 'Resultados financeiros gerados por tráfego orgânico consistente'
    }
  ]
};

// Mapeamento retrocompatível para garantir que qualquer chamada por ID de projeto antigo funcione
export const THEMATIC_NICHE_IMAGES: Record<string, CoverAsset> = {
  proj_runas_oraculo: NICHE_PHOTO_CATALOG.runes_viking[0],
  proj_padilha_amor: NICHE_PHOTO_CATALOG.love_maria_padilha[0],
  proj_exu_guardioes: NICHE_PHOTO_CATALOG.exu_guardioes[0],
  proj_manual_catolico: NICHE_PHOTO_CATALOG.catolico_devocao[0],
  proj_magia_crencas: NICHE_PHOTO_CATALOG.prosperidade_crencas[0],
  proj_froc_ia: NICHE_PHOTO_CATALOG.ia_inteligencia_artificial[0],
  proj_froc_marketing: NICHE_PHOTO_CATALOG.trafego_organico_growth[0],
  proj_marketing_seo: NICHE_PHOTO_CATALOG.trafego_organico_growth[1]
};

export const DEFAULT_FALLBACK_COVER: CoverAsset = NICHE_PHOTO_CATALOG.prosperidade_crencas[0];

const PROJECT_DEFAULT_NICHE: Record<string, string> = {
  proj_runas_oraculo: 'runes_viking',
  proj_padilha_amor: 'love_maria_padilha',
  proj_exu_guardioes: 'exu_guardioes',
  proj_manual_catolico: 'catolico_devocao',
  proj_magia_crencas: 'prosperidade_crencas',
  proj_froc_ia: 'ia_inteligencia_artificial',
  proj_froc_marketing: 'trafego_organico_growth',
  proj_marketing_seo: 'trafego_organico_growth'
};

/**
 * Normaliza uma string removendo acentos e pontuação para busca léxica precisa
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Detecta o nicho e contexto exato do artigo a partir de múltiplos sinais (título, categoria, tags, slug)
 * Dá máxima prioridade ao TÍTULO e SLUG para respeitar a intenção específica do artigo individual.
 */
export function detectArticleNiche(meta: {
  title?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  relatedProjectId?: string;
}): string {
  const titleAndSlug = normalizeText(`${meta.title || ''} ${meta.slug || ''}`);
  const fullCorpus = normalizeText(
    `${meta.title || ''} ${meta.slug || ''} ${meta.category || ''} ${(meta.tags || []).join(' ')}`
  );
  const proj = meta.relatedProjectId || '';

  // === FASE 1: Detecção de Alta Precisão pelo TÍTULO e SLUG ===

  // 1. Tarot & Baralho Cigano
  if (
    titleAndSlug.includes('tarot') ||
    titleAndSlug.includes('cigano') ||
    titleAndSlug.includes('baralho') ||
    titleAndSlug.includes('marselha') ||
    titleAndSlug.includes('arcanos') ||
    titleAndSlug.includes('tiragem')
  ) {
    return 'tarot_oraculos';
  }

  // 2. Runas Nórdicas & Vikings
  if (
    titleAndSlug.includes('runa') ||
    titleAndSlug.includes('viking') ||
    titleAndSlug.includes('futhark') ||
    titleAndSlug.includes('odin') ||
    titleAndSlug.includes('nordic')
  ) {
    return 'runes_viking';
  }

  // 3. Maria Padilha, Simpatias de Amor, Sedução & Casamento
  if (
    titleAndSlug.includes('padilha') ||
    titleAndSlug.includes('simpatia amor') ||
    titleAndSlug.includes('amorosa') ||
    titleAndSlug.includes('seducao') ||
    titleAndSlug.includes('paixao') ||
    titleAndSlug.includes('amarra') ||
    titleAndSlug.includes('relacionamento') ||
    titleAndSlug.includes('afetiv')
  ) {
    return 'love_maria_padilha';
  }

  // 4. Exu, Guardiões, Abertura de Caminhos, Umbanda & Quimbanda
  if (
    titleAndSlug.includes('exu') ||
    titleAndSlug.includes('quimbanda') ||
    titleAndSlug.includes('umbanda') ||
    titleAndSlug.includes('guardiao') ||
    titleAndSlug.includes('guardioes') ||
    titleAndSlug.includes('encruzilhada') ||
    titleAndSlug.includes('tranca rua') ||
    titleAndSlug.includes('abertura de caminho') ||
    titleAndSlug.includes('abrir caminho')
  ) {
    return 'exu_guardioes';
  }

  // 5. Católico, Terço, Bíblia, Santos, Novenas
  if (
    titleAndSlug.includes('catolico') ||
    titleAndSlug.includes('novena') ||
    titleAndSlug.includes('terco') ||
    titleAndSlug.includes('salmo') ||
    titleAndSlug.includes('biblia') ||
    titleAndSlug.includes('oracao') ||
    titleAndSlug.includes('santo') ||
    titleAndSlug.includes('santa') ||
    titleAndSlug.includes('devocionario') ||
    titleAndSlug.includes('missa')
  ) {
    return 'catolico_devocao';
  }

  // 6. Prosperidade, Magia das Crenças, Gratidão & Riqueza
  if (
    titleAndSlug.includes('prosperidade') ||
    titleAndSlug.includes('gratidao') ||
    titleAndSlug.includes('abundancia') ||
    titleAndSlug.includes('riqueza') ||
    titleAndSlug.includes('crenca') ||
    titleAndSlug.includes('crencas') ||
    titleAndSlug.includes('manifestacao') ||
    titleAndSlug.includes('atrair dinheiro') ||
    titleAndSlug.includes('leis da atracao')
  ) {
    return 'prosperidade_crencas';
  }

  // 7. Froc IA, Inteligência Artificial & Automação de Conteúdo
  if (
    titleAndSlug.includes('froc ia') ||
    titleAndSlug.includes('inteligencia artificial') ||
    titleAndSlug.includes('ia generativa') ||
    titleAndSlug.includes('chatgpt') ||
    titleAndSlug.includes('automacao de conteudo') ||
    titleAndSlug.includes('geradores de texto') ||
    titleAndSlug.includes('deep research')
  ) {
    return 'ia_inteligencia_artificial';
  }

  // 8. Tráfego Orgânico, SEO, Google Play, Downloads & ASO
  if (
    titleAndSlug.includes('trafego organico') ||
    titleAndSlug.includes('seo') ||
    titleAndSlug.includes('google play') ||
    titleAndSlug.includes('play store') ||
    titleAndSlug.includes('downloads') ||
    titleAndSlug.includes('ranking') ||
    titleAndSlug.includes('indexar') ||
    titleAndSlug.includes('growth') ||
    titleAndSlug.includes('marketing')
  ) {
    return 'trafego_organico_growth';
  }

  // === FASE 2: Detecção Complementar pelo Corpus Inteiro (Categorias, Tags) ===
  if (fullCorpus.includes('runa') || fullCorpus.includes('viking') || fullCorpus.includes('nordic')) return 'runes_viking';
  if (fullCorpus.includes('tarot') || fullCorpus.includes('cartomanc') || fullCorpus.includes('cigano')) return 'tarot_oraculos';
  if (fullCorpus.includes('padilha') || fullCorpus.includes('amorosa') || fullCorpus.includes('seducao')) return 'love_maria_padilha';
  if (fullCorpus.includes('exu') || fullCorpus.includes('umbanda') || fullCorpus.includes('quimbanda')) return 'exu_guardioes';
  if (fullCorpus.includes('catolico') || fullCorpus.includes('novena') || fullCorpus.includes('terco')) return 'catolico_devocao';
  if (fullCorpus.includes('prosperidade') || fullCorpus.includes('gratidao') || proj === 'proj_magia_crencas') return 'prosperidade_crencas';
  if (fullCorpus.includes('inteligencia artificial') || fullCorpus.includes('froc ia') || proj === 'proj_froc_ia') return 'ia_inteligencia_artificial';
  if (fullCorpus.includes('trafego') || fullCorpus.includes('marketing') || fullCorpus.includes('seo') || proj === 'proj_marketing_seo' || proj === 'proj_froc_marketing') return 'trafego_organico_growth';

  // === FASE 3: Fallback por Projeto Vinculado ===
  if (proj && PROJECT_DEFAULT_NICHE[proj]) {
    return PROJECT_DEFAULT_NICHE[proj];
  }

  return 'prosperidade_crencas';
}

/**
 * Gera um hash robusto e bem distribuído para evitar repetições
 */
function computeStableHash(seedString: string): number {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Seleciona com inteligência semântica e variedade anti-repetição a capa ideal
 */
export function getSmartThematicCover(articleMeta: {
  relatedProjectId?: string;
  title?: string;
  slug?: string;
  id?: string;
  category?: string;
  tags?: string[];
}): CoverAsset {
  const niche = detectArticleNiche(articleMeta);
  const photoPool = NICHE_PHOTO_CATALOG[niche] || NICHE_PHOTO_CATALOG.prosperidade_crencas;

  // Semente única combinando ID, Slug e Título para garantir variedade máxima entre artigos
  const seedString = `${articleMeta.id || ''}:${articleMeta.slug || ''}:${articleMeta.title || ''}:${articleMeta.relatedProjectId || ''}`;
  const hash = computeStableHash(seedString);
  const chosenIndex = hash % photoPool.length;

  return photoPool[chosenIndex];
}

/**
 * Retorna uma capa temática de alta resolução para o projeto informado.
 * Aceita opcionalmente título ou identificador do artigo para diversificar as capas dentro do mesmo nicho.
 */
export function getThematicCover(projectId?: string, articleTitle?: string, articleSlug?: string, articleId?: string): CoverAsset {
  return getSmartThematicCover({
    relatedProjectId: projectId,
    title: articleTitle,
    slug: articleSlug,
    id: articleId
  });
}

/**
 * Identifica se uma imagem é inválida, logo corporativo, SVG ou miniatura pequena
 */
export function isInvalidOrLogoImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith('data:image/svg+xml')) return true;

  const lower = trimmed.toLowerCase();

  if (
    lower.includes('/logo') ||
    lower.includes('logo-') ||
    lower.includes('-logo') ||
    lower.includes('icon-') ||
    lower.includes('favicon') ||
    lower.includes('apple-touch-icon') ||
    lower.includes('avatar') ||
    lower.includes('portal_vip_brasil_logo') ||
    lower.includes('pvb_og_image') ||
    lower.includes('/icons/') ||
    lower.includes('/brand/') ||
    lower.includes('placeholder')
  ) {
    return true;
  }

  if (lower.endsWith('.svg') || lower.includes('.svg?')) {
    return true;
  }

  return false;
}

/**
 * Resolve a melhor imagem de capa para um artigo.
 * Se a imagem atual for inválida ou um logo, usa a capa temática curada correspondente ao nicho do artigo.
 */
export function resolveArticleCover(
  currentCover?: string | null,
  projectId?: string,
  articleTitle?: string,
  articleSlug?: string,
  articleId?: string,
  category?: string,
  tags?: string[]
): string {
  if (!isInvalidOrLogoImage(currentCover)) {
    return (currentCover as string).trim();
  }
  return getSmartThematicCover({
    relatedProjectId: projectId,
    title: articleTitle,
    slug: articleSlug,
    id: articleId,
    category,
    tags
  }).url;
}

/**
 * Resolve o texto alternativo (alt) da capa do artigo
 */
export function resolveArticleCoverAlt(
  currentAlt?: string | null,
  projectId?: string,
  articleTitle?: string,
  articleSlug?: string,
  articleId?: string,
  category?: string,
  tags?: string[]
): string {
  if (currentAlt && currentAlt.trim().length > 5 && !currentAlt.toLowerCase().includes('logo')) {
    return currentAlt.trim();
  }
  return getSmartThematicCover({
    relatedProjectId: projectId,
    title: articleTitle,
    slug: articleSlug,
    id: articleId,
    category,
    tags
  }).alt;
}
