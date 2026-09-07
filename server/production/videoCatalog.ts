// server/production/videoCatalog.ts
// Catálogo Estratégico de Vídeos Verticais e Roteiros por Nicho no Servidor

export interface ServerNicheVideoTemplate {
  id: string;
  nicheName: string;
  appProjectSlug: string;
  appName: string;
  playStoreUrl?: string;
  badge: string;
  icon: string;
  category: string;
  headline: string;
  videoPrompt: string;
  cameraMotion: string;
  lighting: string;
  mood: string;
  sampleVideoUrl: string;
  posterImageUrl: string;
  viralScript: {
    hook: string;
    scenes: Array<{
      sceneNumber: number;
      timeSeconds: string;
      visualDescription: string;
      audioVoiceover: string;
      onScreenText: string;
    }>;
    callToAction: string;
    suggestedAudioTrack: string;
    caption: string;
    hashtags: string[];
  };
}

export const SERVER_NICHE_VIDEO_TEMPLATES: Record<string, ServerNicheVideoTemplate> = {
  runes_viking: {
    id: 'runes_viking',
    nicheName: 'Runas Nórdicas & Tradição Viking',
    appProjectSlug: 'oraculos',
    appName: 'Oráculos App (Runas & Futhark)',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.oraculos',
    badge: 'Sabedoria Ancestral Nórdica',
    icon: 'ᚱ',
    category: 'Oráculos, Mitologia Nórdica & Autoconhecimento',
    headline: 'Revelação Rúnica do Dia: A Mensagem Oculta que os Deuses Reservaram para Você',
    videoPrompt: 'Cinematic vertical 9:16 macro shot of ancient carved wooden elder futhark runes glowing with faint golden ethereal light on dark weathered slate stone, swirling mystical fog, soft candle flames flickering, cinematic slow push-in, hyper-realistic, 8k resolution, authentic viking aesthetic.',
    cameraMotion: 'Slow macro push-in with subtle low-angle orbital tilt',
    lighting: 'Warm flickering candle rim-light with cool ambient misty backlight and glowing runes',
    mood: 'Epic mystical, cinematic historical fantasy with high contrast and tactile texture',
    sampleVideoUrl: '/videos/runes_viking.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'PARE O FEED! Se essa runa apareceu na sua tela, não é coincidência: os nórdicos têm um aviso urgente.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Mão tirando uma pedra rúnica de Futhark de dentro de uma bolsa de couro sobre a névoa fria.',
          audioVoiceover: 'Pare o feed agora! Se esse vídeo chegou até você, a sabedoria das runas antigas tem uma resposta.',
          onScreenText: 'ᚠ A RUNA QUE ESCOLHEU VOCÊ HOJE'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-12s',
          visualDescription: 'A runa Fehu ou Ansuz brilha suavemente na madeira antiga com runas entalhadas.',
          audioVoiceover: 'Essa é a runa que destrava caminhos que pareciam bloqueados. Uma notícia importante chega nos próximos 3 dias.',
          onScreenText: 'BLOQUEIOS SENDO DESFEITOS'
        },
        {
          sceneNumber: 3,
          timeSeconds: '13-22s',
          visualDescription: 'Demonstração da tiragem de 3 runas no aplicativo Oráculos com interpretação detalhada.',
          audioVoiceover: 'Não tome decisões no escuro. Consulte as Runas de Odin a qualquer hora e descubra seu destino.',
          onScreenText: 'ORÁCULO RÚNICO NA PALMA DA MÃO'
        },
        {
          sceneNumber: 4,
          timeSeconds: '23-30s',
          visualDescription: 'Tela do app Oráculos na Play Store com botão de download e logotipo oficial.',
          audioVoiceover: 'Comente "RUNA SAGRADA" para ativar essa bênção e baixe grátis o app Oráculos no link da bio ou Play Store!',
          onScreenText: 'BAIXE GRÁTIS NA GOOGLE PLAY'
        }
      ],
      callToAction: 'Toque no link da bio ou busque por "Oráculos" na Google Play Store para fazer sua tiragem diária!',
      suggestedAudioTrack: 'Wardruna / Danheim Style - Nordic Shamanic Drums (Trending TikTok)',
      caption: 'ᚱ Revelação das Runas Nórdicas: o que o destino tem guardado para você hoje? Comente "EU ACEITO" para receber a força dos antigos. Baixe o app Oráculos na Google Play Store! #runasnordicas #viking #oraculo #futhark #runas #portalvipbrasil #tarot',
      hashtags: ['#runasnordicas', '#viking', '#oraculo', '#futhark', '#mitologianordica', '#espiritualidade', '#portalvipbrasil']
    }
  },

  tarot_oraculos: {
    id: 'tarot_oraculos',
    nicheName: 'Tarot de Marselha & Baralho Cigano',
    appProjectSlug: 'oraculos',
    appName: 'Oráculos App (Tarot & Baralho Cigano)',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.oraculos',
    badge: 'Tiragens Claras & Revelações',
    icon: '🔮',
    category: 'Tarot, Cartomancia, Baralho Cigano & Previsões',
    headline: 'Tiragem Interativa do Tarot: Escolha uma Carta e Veja o que o Destino Reservou',
    videoPrompt: 'Atmospheric vertical 9:16 close-up of elegant hands turning over a golden-foil Tarot card on deep royal velvet, crystal ball reflecting candlelight, incense smoke wafting smoothly, rich purple and gold ambient tones, cinematic depth of field, 8k, flawless clarity.',
    cameraMotion: 'Dynamic cinematic top-down slider transitioning into low-angle macro',
    lighting: 'Warm candle glow with deep purple and indigo volumetric sidelight',
    mood: 'Enigmatic, luxurious, highly magnetic and aesthetically captivating',
    sampleVideoUrl: '/videos/tarot_oraculos.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Respire fundo, escolha a Carta 1 ou Carta 2. O Tarot vai revelar agora o que aquela pessoa está pensando sobre você.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Duas cartas de Tarot viradas para baixo sobre um manto de veludo com cristais de ametista.',
          audioVoiceover: 'Respire fundo. Não pule esse vídeo. Escolha a carta número 1 ou número 2.',
          onScreenText: 'CARTA 1 OU CARTA 2? ESCOLHA AGORA'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-14s',
          visualDescription: 'A mão vira a carta 1: O Enamorado ou A Estrela com detalhes em dourado reluzente.',
          audioVoiceover: 'Quem escolheu a carta 1: uma conversa sincera vai acontecer antes do final da semana. Uma dúvida que te atormentava será esclarecida.',
          onScreenText: 'CARTA 1: A VERDADE VAI APARECER'
        },
        {
          sceneNumber: 3,
          timeSeconds: '15-22s',
          visualDescription: 'A mão vira a carta 2: Roda da Fortuna ou Sol.',
          audioVoiceover: 'Quem escolheu a carta 2: reviravolta financeira e portas se abrindo onde parecia não ter saída.',
          onScreenText: 'CARTA 2: REVIRAVOLTA POSITIVA'
        },
        {
          sceneNumber: 4,
          timeSeconds: '23-30s',
          visualDescription: 'Demonstração da tiragem completa no app Oráculos com botão de download da Google Play.',
          audioVoiceover: 'Quer sua tiragem completa e personalizada de amor e dinheiro? Instale grátis o app Oráculos na Google Play Store!',
          onScreenText: 'TIRAGEM COMPLETA NO APP ORÁCULOS'
        }
      ],
      callToAction: 'Instale grátis o app Oráculos na Google Play Store ou toque no link da bio para tirar suas cartas!',
      suggestedAudioTrack: 'Mystic Frequency 432Hz / Dark Ambient Strings (Trending TikTok)',
      caption: '🔮 O que o Tarot revelou para você hoje? Comente qual carta escolheu (1 ou 2) para selar a energia! Baixe grátis o app Oráculos na Google Play Store. #tarot #baralhocigano #tarotonline #cartomancia #previsao #oraculo #portalvipbrasil',
      hashtags: ['#tarot', '#baralhocigano', '#tarotonline', '#cartasdetarot', '#previsaodotarot', '#oraculos', '#portalvipbrasil']
    }
  },

  love_maria_padilha: {
    id: 'love_maria_padilha',
    nicheName: 'Maria Padilha & Poder Amoroso',
    appProjectSlug: 'maria-padilha-rainha-das-7-encruzilhadas',
    appName: 'Maria Padilha Rainha das 7 Encruzilhadas App',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha',
    badge: 'Magnetismo & Amor Sagrado',
    icon: '🌹',
    category: 'Amor, Magnetismo Pessoal, Orações & Sedução',
    headline: 'Oração Forte de Maria Padilha para Trazer de Volta o Amor e Afastar Inveja',
    videoPrompt: 'Cinematic vertical 9:16 scene of red velvet roses, ornate golden goblet, incense smoke curling upward in soft candlelight, subtle red and gold reflections, luxurious warm lighting, dramatic chiaroscuro, cinematic slow motion, ultra-detailed 8k.',
    cameraMotion: 'Slow sensual dolly zoom with soft focus pull on red roses and golden goblet',
    lighting: 'Deep ruby red ambient wash with warm golden flame rim-lighting',
    mood: 'Passionate, magnetic, regal, deeply respectful and spiritually authoritative',
    sampleVideoUrl: '/videos/love_maria_padilha.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Se você ama alguém e sente que a distância está aumentando, escute essa oração de Maria Padilha até o fim.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Pétalas de rosas vermelhas caindo suavemente sobre um tecido escuro com iluminação de velas douradas.',
          audioVoiceover: 'Não ignore esse chamado. Maria Padilha manda te dizer: o que é seu ninguém toma.',
          onScreenText: '🌹 ORAÇÃO PODEROSA DE MARIA PADILHA'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-13s',
          visualDescription: 'Taça dourada com rosas e fumaça perfumada subindo com brilho aveludado.',
          audioVoiceover: 'Repita com firmeza: "Pela força da Rainha das 7 Encruzilhadas, o orgulho se quebra e o amor verdadeiro renasce."',
          onScreenText: 'REPITA: O ORGULHO SE QUEBRA'
        },
        {
          sceneNumber: 3,
          timeSeconds: '14-22s',
          visualDescription: 'Demonstração das orações, simpatias e conselhos diários no app Maria Padilha na Play Store.',
          audioVoiceover: 'Acesse orações secretas de atração, conselhos para o coração e simpatias sagradas direto no seu celular.',
          onScreenText: 'ORAÇÕES & CONSELHOS DIÁRIOS'
        },
        {
          sceneNumber: 4,
          timeSeconds: '23-30s',
          visualDescription: 'Tela do app oficial Maria Padilha na Google Play Store com botão de download em destaque.',
          audioVoiceover: 'Comente "LAROYÊ MARIA PADILHA" e baixe grátis o app oficial na Play Store para proteger o seu amor!',
          onScreenText: 'BAIXE NA GOOGLE PLAY: MARIA PADILHA'
        }
      ],
      callToAction: 'Instale o app oficial Maria Padilha na Google Play Store e acesse todas as orações e conselhos sagrados!',
      suggestedAudioTrack: 'Instrumental Étnico Flamenco com Violão e Percussão Envolvente (Trending)',
      caption: '🌹 Oração forte de Maria Padilha Rainha das 7 Encruzilhadas para proteção amorosa e magnetismo. Deixe seu "LAROYÊ" nos comentários! Baixe o app na Play Store. #mariapadilha #rainhadas7encruzilhadas #simpatiaamorosa #pombagira #oracaodoamor #portalvipbrasil',
      hashtags: ['#mariapadilha', '#rainhadas7encruzilhadas', '#simpatiaamorosa', '#oracaoforte', '#pombagira', '#amorbemcuidado', '#portalvipbrasil']
    }
  },

  exu_guardioes: {
    id: 'exu_guardioes',
    nicheName: 'Exu Responde & Guardiões dos Caminhos',
    appProjectSlug: 'exu-responde',
    appName: 'Exu Responde App (Play Store)',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde',
    badge: 'Abertura de Caminhos & Firmeza',
    icon: '⚡',
    category: 'Oráculos dos Guardiões, Firmeza & Proteção',
    headline: 'Conselho dos Guardiões: O Que Você Precisa Saber Antes de Tomar Qualquer Decisão',
    videoPrompt: 'Cinematic vertical 9:16 nighttime ceremonial scene with glowing embers from sacred bonfire, deep black and amber flames, authentic rustic iron elements, swirling dramatic smoke, high contrast rim-light, sharp cinematic focus, powerful ancestral presence.',
    cameraMotion: 'Low-angle slow tracking shot with dynamic ember particles drifting past lens',
    lighting: 'Intense firelight chiaroscuro with deep amber, volcanic red and midnight black shadows',
    mood: 'Bold, commanding, protective, authoritative and deeply grounded',
    sampleVideoUrl: '/videos/exu_guardioes.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Se os seus caminhos estão parecendo travados e nada dá certo, esse conselho do guardião é pra você.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Chamas crepitando na escuridão com brasas brilhantes flutuando pela tela.',
          audioVoiceover: 'Caminhos trancados? Pare de insistir no que já morreu. Ouça o conselho do guardião.',
          onScreenText: '⚡ CONSELHO DO GUARDIÃO PARA HOJE'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-12s',
          visualDescription: 'Bússola ou encruzilhada iluminada por tocha ancestral com fumaça ritual.',
          audioVoiceover: 'A porteira fechou para te livrar de uma armadilha. A verdadeira vitória vai chegar por outro caminho.',
          onScreenText: 'A PORTA FECHOU PARA TE PROTEGER'
        },
        {
          sceneNumber: 3,
          timeSeconds: '13-21s',
          visualDescription: 'Interface do aplicativo Exu Responde mostrando a tiragem de respostas em tempo real.',
          audioVoiceover: 'Tenha respostas diretas sobre trabalho, pessoas falsas e caminhos com o app Exu Responde.',
          onScreenText: 'RESPOSTAS DIRETAS NO APP'
        },
        {
          sceneNumber: 4,
          timeSeconds: '22-30s',
          visualDescription: 'Tela final com o aplicativo Exu Responde na Google Play Store.',
          audioVoiceover: 'Comente "LAROYÊ EXU" para abrir seus caminhos e baixe grátis o app na Google Play Store!',
          onScreenText: 'BAIXE NA PLAY STORE: EXU RESPONDE'
        }
      ],
      callToAction: 'Abra seus caminhos: baixe agora o aplicativo Exu Responde na Google Play Store!',
      suggestedAudioTrack: 'Atabaque e Tambor Ancestral Forte com Clima Épico (Trending TikTok)',
      caption: '⚡ Resposta e conselho do Guardião para os seus caminhos hoje. Deixe seu "LAROYÊ EXU É MOJUBÁ" para desatar os nós da sua vida! App na Play Store. #exuresponde #guardiao #aberturadecaminhos #oraculodosguardioes #protecaoespiritual #portalvipbrasil',
      hashtags: ['#exuresponde', '#guardiao', '#aberturadecaminhos', '#oraculo', '#umbanda', '#quimbanda', '#portalvipbrasil']
    }
  },

  catolico_devocao: {
    id: 'catolico_devocao',
    nicheName: 'Tradição Católica & Devoção Diária',
    appProjectSlug: 'manual-catolico',
    appName: 'Manual Católico App (Play Store)',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=br.com.manualcatolico.app',
    badge: 'Santo do Dia & Santo Terço',
    icon: '✝️',
    category: 'Devoção Católica, Novenas, Santo Terço & Liturgia',
    headline: 'Oração Milagrosa do Santo do Dia para Abençoar Sua Casa e Sua Família',
    videoPrompt: 'Cinematic vertical 9:16 serene shot of an authentic carved wooden Rosary resting beside an open sacred Bible, sunlight streaming through stained glass window casting soft rays of colorful light, peaceful sanctuary atmosphere, photorealistic, peaceful, 8k.',
    cameraMotion: 'Gentle slow crane-down with soft warm sunlight glint on the crucifix',
    lighting: 'Soft volumetric cathedral morning light with golden dust motes',
    mood: 'Holy, reverent, peaceful, deeply comforting and spiritually uplifting',
    sampleVideoUrl: '/videos/catolico_devocao.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1548625361-16eb4318c4fc?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Reze comigo essa oração do Santo do Dia antes de começar o seu trabalho, e nenhuma aflição vai te abalar.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Terço de madeira sagrado iluminado por feixes dourados de luz matinal.',
          audioVoiceover: 'Não comece seu dia sem essa bênção. Reze comigo em 30 segundos.',
          onScreenText: '✝️ ORAÇÃO DO SANTO DO DIA'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-12s',
          visualDescription: 'Bíblia aberta e vela suavemente acesa em um ambiente de profunda paz.',
          audioVoiceover: '"Senhor, que a Tua graça guarde o meu lar, afaste as enfermidades e traga a paz que o mundo não pode dar."',
          onScreenText: 'QUE A TUA GRAÇA GUARDE O MEU LAR'
        },
        {
          sceneNumber: 3,
          timeSeconds: '13-21s',
          visualDescription: 'Demonstração das novenas, liturgia diária e terço no aplicativo Manual Católico.',
          audioVoiceover: 'Tenha o Santo do dia, as novenas mais poderosas e a liturgia diária sempre no seu celular.',
          onScreenText: 'LITURGIA & NOVENAS NO SEU CELULAR'
        },
        {
          sceneNumber: 4,
          timeSeconds: '22-30s',
          visualDescription: 'Logo do Manual Católico na Google Play Store com botão de instalação.',
          audioVoiceover: 'Deixe o seu "AMÉM" nos comentários e baixe o aplicativo Manual Católico grátis na Google Play Store!',
          onScreenText: 'BAIXE GRÁTIS NA GOOGLE PLAY'
        }
      ],
      callToAction: 'Fortaleça sua fé diária: baixe grátis o Manual Católico na Google Play Store!',
      suggestedAudioTrack: 'Canto Gregoriano Suave com Harpa Celestial (Trending TikTok Faith)',
      caption: '✝️ Oração poderosa de proteção para você e sua família. Deixe o seu "AMÉM" nos comentários e compartilhe essa bênção! Baixe grátis o Manual Católico na Play Store. #manualcatolico #oracaododia #santododia #terço #fe #catolicos #portalvipbrasil',
      hashtags: ['#manualcatolico', '#oracaododia', '#santododia', '#santoterco', '#oracoescatolicas', '#fe', '#portalvipbrasil']
    }
  },

  prosperidade_crencas: {
    id: 'prosperidade_crencas',
    nicheName: 'Magia das Crenças & Prosperidade',
    appProjectSlug: 'magia-das-crencas',
    appName: 'Magia das Crenças App (Play Store)',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.magiadascrencas.app',
    badge: 'Decretos & Lei da Atração',
    icon: '✨',
    category: 'Prosperidade, Decretos Sagrados & Reprogramação Mental',
    headline: 'Decreto Quântico de Prosperidade: Ative a Abundância Financeira Imediata',
    videoPrompt: 'Cinematic vertical 9:16 breathtaking view of golden sunrise over misty mountains, sparkling golden light particles floating across the screen, lush green valley, deep emerald tones, uplifting golden hour lighting, 8k ultra high definition, cinema camera quality.',
    cameraMotion: 'Smooth panoramic upward tilt toward radiant golden sun rays',
    lighting: 'Radiant golden hour sunrise with warm lens flares and emerald ambient glow',
    mood: 'Triumphant, uplifting, prosperous, inspiring and filled with positive energy',
    sampleVideoUrl: '/videos/prosperidade_crencas.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Repita esse decreto em voz alta agora e veja o dinheiro inesperado chegar até você nos próximos 7 dias.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Luz dourada intensa brilhando entre as montanhas com partículas de luz reluzente.',
          audioVoiceover: 'Não pule! O universo não erra o endereço. Ative esse decreto de riqueza agora.',
          onScreenText: '✨ DECRETO DE PROSPERIDADE IMEDIATA'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-12s',
          visualDescription: 'Árvore frondosa verdejante com raios de sol e orvalho brilhante.',
          audioVoiceover: '"Eu sou a prosperidade em ação. Fontes inesperadas de renda se conectam a mim agora."',
          onScreenText: '"FONTES INESPERADAS SE CONECTAM A MIM"'
        },
        {
          sceneNumber: 3,
          timeSeconds: '13-21s',
          visualDescription: 'Demonstração dos decretos, rituais diários e mensagens do app Magia das Crenças.',
          audioVoiceover: 'Acesse decretos quânticos, rituais diários de prosperidade e orações no app Magia das Crenças.',
          onScreenText: 'DECRETOS & RITUAIS NO SEU APP'
        },
        {
          sceneNumber: 4,
          timeSeconds: '22-30s',
          visualDescription: 'Tela do app Magia das Crenças na Google Play Store com botão de download.',
          audioVoiceover: 'Comente "ESTÁ FEITO, ASSIM É" para selar e baixe grátis o app Magia das Crenças na Play Store!',
          onScreenText: 'BAIXE NA GOOGLE PLAY STORE'
        }
      ],
      callToAction: 'Instale o aplicativo Magia das Crenças na Google Play Store e acesse seus decretos de poder diários!',
      suggestedAudioTrack: 'Frequência de Prosperidade 528Hz / Piano Motivacional Suave (Trending TikTok)',
      caption: '✨ Decreto poderoso de ativação de riqueza e prosperidade. Digite "777 ESTÁ FEITO" para ativar essa frequência! Baixe o app Magia das Crenças na Google Play Store. #magiadascrencas #leidaatracao #prosperidade #afirmacoespositivas #abundancia #portalvipbrasil',
      hashtags: ['#magiadascrencas', '#leidaatracao', '#prosperidade', '#afirmacoespositivas', '#abundancia', '#decretos', '#portalvipbrasil']
    }
  },

  ia_inteligencia_artificial: {
    id: 'ia_inteligencia_artificial',
    nicheName: 'Froc IA & Automação de Conteúdo',
    appProjectSlug: 'froc-ia',
    appName: 'Froc IA Platform',
    badge: 'IA Generativa & Automação',
    icon: '🤖',
    category: 'Inteligência Artificial, Marketing Digital & Criação de Conteúdo',
    headline: 'Como Criar 30 Vídeos Virais para o TikTok em Menos de 5 Minutos com IA',
    videoPrompt: 'Cinematic vertical 9:16 futuristic clean workspace, glowing cyan neural network nodes connecting in mid-air, high-end monitor displaying automated video timeline, neon cyan and deep blue cybernetic lighting, ultra-sharp 8k, modern technological mastery.',
    cameraMotion: 'Futuristic hyper-smooth slider track passing luminous holographic data stream',
    lighting: 'Cyber neon cyan and electric cobalt blue with soft studio keylight',
    mood: 'Innovative, high-tech, razor-sharp, productive and authoritative',
    sampleVideoUrl: '/videos/ia_inteligencia_artificial.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Se você ainda perde horas tentando ter ideias para vídeos no TikTok, você está fazendo do jeito errado.',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Tela acelerada com interface moderna de IA gerando roteiros completos automaticamente.',
          audioVoiceover: 'Você ainda gasta horas pensando em conteúdo pro TikTok? Olha isso aqui.',
          onScreenText: '🤖 CRIE 30 VÍDEOS EM 5 MINUTOS'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-12s',
          visualDescription: 'Painel da Froc IA gerando ganchos de alta retenção e cenas cinematográficas para Veo 3.1.',
          audioVoiceover: 'Com um clique, a Froc IA cria o gancho, as cenas de alta retenção, a legenda e as hashtags virais.',
          onScreenText: 'GANCHO + CENAS + HASHTAGS NO PILOTO AUTOMÁTICO'
        },
        {
          sceneNumber: 3,
          timeSeconds: '13-21s',
          visualDescription: 'Publicação de rascunho sendo enviada diretamente para a caixa de entrada do TikTok.',
          audioVoiceover: 'E o melhor: já exporta os rascunhos para o TikTok e Reels sem complicação.',
          onScreenText: 'ENVIO DIRETO PARA O TIKTOK'
        },
        {
          sceneNumber: 4,
          timeSeconds: '22-30s',
          visualDescription: 'Logo do Portal Vip Brasil & Froc IA com link de acesso imediato.',
          audioVoiceover: 'Comente "FROC IA" para testar agora mesmo e escalar seus resultados no tráfego orgânico!',
          onScreenText: 'ACESSE AGORA: FROC IA'
        }
      ],
      callToAction: 'Multiplique sua produção de vídeos no piloto automático com o Froc IA!',
      suggestedAudioTrack: 'Tech Future Bass / Modern Beat Energético (Trending TikTok Tech)',
      caption: '🤖 Pare de perder tempo criando vídeos do zero! Descubra como a Froc IA automatiza roteiros, prompts cinematográficos e postagens para o TikTok. Comente "QUERO" para acessar! #frocia #inteligenciaartificial #marketingdigital #tiktokgrowth #trafegoorganico #portalvipbrasil',
      hashtags: ['#frocia', '#inteligenciaartificial', '#automacao', '#marketingdigital', '#tiktokgrowth', '#criacaodeconteudo', '#portalvipbrasil']
    }
  },

  trafego_organico_growth: {
    id: 'trafego_organico_growth',
    nicheName: 'Tráfego Orgânico & Google Play Growth',
    appProjectSlug: 'froc-ia-marketing-engine',
    appName: 'Portal Vip Brasil Growth Engine',
    badge: 'ASO & Viralidade Orgânica',
    icon: '🚀',
    category: 'Marketing de Conteúdo, ASO & Crescimento de Aplicativos',
    headline: 'O Segredo para Fazer seu Aplicativo Bater 10 Mil Downloads na Google Play sem Gastar com Anúncios',
    videoPrompt: 'Cinematic vertical 9:16 dynamic shot of smartphone displaying exponential downloads graph rising, surrounded by glowing social media notifications, clean modern office background, electric violet and royal blue studio lighting, 8k high-end tech commercial.',
    cameraMotion: 'Snappy dynamic push-in with 45-degree angle rotation emphasizing rising metric graph',
    lighting: 'High-contrast studio lighting with violet backlight and crisp softbox fill',
    mood: 'High-energy, authoritative, commercial, conversion-oriented and clean',
    sampleVideoUrl: '/videos/trafego_organico_growth.mp4',
    posterImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1080&q=80',
    viralScript: {
      hook: 'Como levar milhares de pessoas para o seu aplicativo na Google Play sem gastar 1 real com anúncios?',
      scenes: [
        {
          sceneNumber: 1,
          timeSeconds: '0-3s',
          visualDescription: 'Gráfico de downloads disparando no smartphone com notificações de instalação.',
          audioVoiceover: 'Quer saber como lotar seu app de usuários reais sem torrar dinheiro em tráfego pago?',
          onScreenText: '🚀 TRÁFEGO ORGÂNICO REAL PARA APPS'
        },
        {
          sceneNumber: 2,
          timeSeconds: '4-13s',
          visualDescription: 'Feed do TikTok com vídeos temáticos do nicho do app alcançando milhares de visualizações.',
          audioVoiceover: 'O segredo é produzir vídeos verticais focados na dor do nicho, com gancho de 3 segundos e CTA direto para a Play Store.',
          onScreenText: 'VÍDEOS DO NICHO + GANCHO DE 3s'
        },
        {
          sceneNumber: 3,
          timeSeconds: '14-22s',
          visualDescription: 'Demonstração dos aplicativos do Portal Vip Brasil ranqueando no topo com SEO e ASO.',
          audioVoiceover: 'Combinando o TikTok com o blog de alta autoridade, seu app vira uma máquina de tráfego orgânico constante.',
          onScreenText: 'AUTORIDADE NO GOOGLE + TIKTOK VIRAL'
        },
        {
          sceneNumber: 4,
          timeSeconds: '23-30s',
          visualDescription: 'Tela do ecossistema Portal Vip Brasil com botão para conferir os aplicativos.',
          audioVoiceover: 'Siga nosso perfil e acesse o Portal Vip Brasil para conhecer nosso ecossistema de apps na Google Play!',
          onScreenText: 'ACESSE O PORTAL VIP BRASIL'
        }
      ],
      callToAction: 'Descubra como dominar o tráfego orgânico com os aplicativos oficiais do Portal Vip Brasil!',
      suggestedAudioTrack: 'Corporate Dynamic Motivation / Upbeat Tech (Trending TikTok Business)',
      caption: '🚀 Como dominar o tráfego orgânico e escalar downloads de aplicativos na Google Play e TikTok sem anúncios pagos. Conheça as estratégias do Portal Vip Brasil! #trafegoorganico #googleplay #aso #marketingdeaplicativos #crescimentodigital #portalvipbrasil',
      hashtags: ['#trafegoorganico', '#googleplay', '#aso', '#crescimentodigital', '#marketingdigital', '#appsbrasil', '#portalvipbrasil']
    }
  }
};

export function serverDetectNicheForVideo(text?: string, projectSlugOrId?: string): ServerNicheVideoTemplate {
  const normalized = `${text || ''} ${projectSlugOrId || ''}`.toLowerCase();

  // 1. Runas nórdicas
  if (
    normalized.includes('runa') ||
    normalized.includes('viking') ||
    normalized.includes('futhark') ||
    normalized.includes('odin') ||
    normalized.includes('nordic') ||
    normalized.includes('valhalla')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.runes_viking;
  }

  // 2. Maria Padilha & Amor
  if (
    normalized.includes('padilha') ||
    normalized.includes('mariapadilha') ||
    normalized.includes('encruzilhada') ||
    normalized.includes('pombagira') ||
    normalized.includes('pomba gira') ||
    normalized.includes('simpatia amor') ||
    normalized.includes('reconquista') ||
    normalized.includes('sedução') ||
    normalized.includes('amorosa') ||
    normalized.includes('trazer amor')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.love_maria_padilha;
  }

  // 3. Exu Responde & Guardiões
  if (
    normalized.includes('exu') ||
    normalized.includes('guardiao') ||
    normalized.includes('guardião') ||
    normalized.includes('tranca rua') ||
    normalized.includes('abertura de caminho') ||
    normalized.includes('porteira') ||
    normalized.includes('quebra de demanda') ||
    normalized.includes('oraculo dos caminhos')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.exu_guardioes;
  }

  // 4. Católico & Devoção
  if (
    normalized.includes('catolico') ||
    normalized.includes('católico') ||
    normalized.includes('manual catolico') ||
    normalized.includes('santo do dia') ||
    normalized.includes('santo terço') ||
    normalized.includes('novena') ||
    normalized.includes('santa igreja') ||
    normalized.includes('liturgia') ||
    normalized.includes('jesus') ||
    normalized.includes('nossa senhora') ||
    normalized.includes('aparecida') ||
    normalized.includes('terco')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.catolico_devocao;
  }

  // 5. Prosperidade & Crenças
  if (
    normalized.includes('magia das crencas') ||
    normalized.includes('magia das crenças') ||
    normalized.includes('prosperidade') ||
    normalized.includes('abundancia') ||
    normalized.includes('abundância') ||
    normalized.includes('decreto') ||
    normalized.includes('lei da atracao') ||
    normalized.includes('lei da atração') ||
    normalized.includes('riqueza') ||
    normalized.includes('reprogramacao mental')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.prosperidade_crencas;
  }

  // 6. Tarot & Baralho Cigano
  if (
    normalized.includes('tarot') ||
    normalized.includes('cigano') ||
    normalized.includes('cartomancia') ||
    normalized.includes('arcanos') ||
    normalized.includes('oraculos') ||
    normalized.includes('oráculos') ||
    normalized.includes('tiragem') ||
    normalized.includes('lenormand')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.tarot_oraculos;
  }

  // 7. Froc IA & Automação
  if (
    normalized.includes('froc') ||
    normalized.includes('frocia') ||
    normalized.includes('inteligencia artificial') ||
    normalized.includes('inteligência artificial') ||
    normalized.includes('ia ') ||
    normalized.includes('prompt') ||
    normalized.includes('veo') ||
    normalized.includes('automacao') ||
    normalized.includes('automação')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.ia_inteligencia_artificial;
  }

  // 8. Tráfego orgânico & Growth
  if (
    normalized.includes('trafego') ||
    normalized.includes('tráfego') ||
    normalized.includes('organico') ||
    normalized.includes('orgânico') ||
    normalized.includes('google play') ||
    normalized.includes('play store') ||
    normalized.includes('aso') ||
    normalized.includes('downloads') ||
    normalized.includes('crescimento') ||
    normalized.includes('tiktok growth') ||
    normalized.includes('marketing')
  ) {
    return SERVER_NICHE_VIDEO_TEMPLATES.trafego_organico_growth;
  }

  // Se o projectSlug bate diretamente
  if (projectSlugOrId) {
    const slug = projectSlugOrId.toLowerCase();
    if (slug.includes('exu')) return SERVER_NICHE_VIDEO_TEMPLATES.exu_guardioes;
    if (slug.includes('padilha')) return SERVER_NICHE_VIDEO_TEMPLATES.love_maria_padilha;
    if (slug.includes('catolico')) return SERVER_NICHE_VIDEO_TEMPLATES.catolico_devocao;
    if (slug.includes('crenca') || slug.includes('crença')) return SERVER_NICHE_VIDEO_TEMPLATES.prosperidade_crencas;
    if (slug.includes('oraculo')) return SERVER_NICHE_VIDEO_TEMPLATES.tarot_oraculos;
    if (slug.includes('froc')) return SERVER_NICHE_VIDEO_TEMPLATES.ia_inteligencia_artificial;
  }

  return SERVER_NICHE_VIDEO_TEMPLATES.trafego_organico_growth;
}
