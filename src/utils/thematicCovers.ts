// Utilitário de imagens temáticas e saneamento visual de artigos do Blog
// Garante que nenhum artigo exiba logotipos, ícones de app ou imagens quebradas

export const THEMATIC_COVERS: Record<string, Array<{ url: string; alt: string }>> = {
  proj_magia_crencas: [
    {
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      alt: 'Montanhas sob céu estrelado iluminadas pela aurora da fé e espiritualidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Nascer do sol no oceano com raios dourados de gratidão e prosperidade'
    },
    {
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      alt: 'Paisagem serena de natureza e águas calmas para meditação e orações'
    }
  ],
  proj_exu_responde: [
    {
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Noite mística com fogueira e velas sagradas abrindo caminhos espirituais'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      alt: 'Chamas douradas de firmeza e clareza para tomadas de decisão'
    },
    {
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Altar sagrado de guardiões com elementos tradicionais e força espiritual'
    }
  ],
  proj_maria_padilha: [
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      alt: 'Rosas vermelhas aveludadas e luz de velas para magnetismo pessoal e amor próprio'
    },
    {
      url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
      alt: 'Buquê de rosas vermelhas rubras intensas simbolizando atração e paixão'
    },
    {
      url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=80',
      alt: 'Rosas escarlates em composição cinematográfica de autoestima e mistério'
    }
  ],
  proj_manual_catolico: [
    {
      url: 'https://images.unsplash.com/photo-1548625361-16eb4318c4fc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Catedral histórica com vitrais e raios de sol iluminando a devoção católica'
    },
    {
      url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
      alt: 'Bíblia Sagrada e terço com velas devocionais'
    },
    {
      url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
      alt: 'Vela acesa no altar e momento sagrado de oração e liturgia'
    }
  ],
  proj_frocia2: [
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      alt: 'Ondas abstratas digitais de inteligência artificial generativa e inovação tecnológica'
    },
    {
      url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Rede neural artificial e processamento cognitivo de marketing'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planeta digital conectado por dados em alta velocidade e tecnologia global'
    }
  ],
  proj_oraculos_ts: [
    {
      url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Cartas clássicas de tarot e baralho cigano sobre madeira rústica e velas'
    },
    {
      url: 'https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?auto=format&fit=crop&w=1200&q=80',
      alt: 'Mandala cósmica e mapa astrológico com cartas oraculares'
    },
    {
      url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=1200&q=80',
      alt: 'Runas nórdicas antigas esculpidas em pedra para autoconhecimento e tiragens'
    }
  ],
  proj_froc_marketing_engine: [
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Dashboard analítico de tráfego orgânico, SEO e métricas de conversão'
    },
    {
      url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      alt: 'Estratégia de marketing digital em equipe e crescimento de aplicativos'
    },
    {
      url: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=1200&q=80',
      alt: 'Gráficos de escalada para primeiro lugar em pesquisas de tráfego e downloads'
    }
  ]
};

export function isInvalidOrLogoImage(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'about:blank' || trimmed.length < 10) return true;
  if (
    trimmed.includes('logo.png') ||
    trimmed.includes('/logo') ||
    trimmed.includes('icon-512') ||
    trimmed.includes('icon-192') ||
    trimmed.includes('/icons/') ||
    trimmed.includes('apple-touch-icon') ||
    trimmed.includes('favicon') ||
    trimmed.includes('cropped-507d5ca1') ||
    trimmed.includes('chatgpt-image-19-de-mai') ||
    trimmed.includes('wp-content/uploads') ||
    trimmed.includes('placeholder')
  ) {
    return true;
  }
  if (trimmed.startsWith('data:image/png;base64,ivborw0kggoaaaansuheugaaaaeeaaab')) return true;
  return false;
}

export function getThematicCover(projectId: string | undefined, title?: string): { url: string; alt: string } {
  const list = (projectId && THEMATIC_COVERS[projectId]) || THEMATIC_COVERS.proj_magia_crencas;
  if (!title) return list[0];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
}

export function resolveArticleCover(
  coverImage: string | undefined | null,
  projectId: string | undefined,
  title?: string
): string {
  if (!isInvalidOrLogoImage(coverImage)) {
    return coverImage!.trim();
  }
  return getThematicCover(projectId, title).url;
}

export function resolveArticleCoverAlt(
  alt: string | undefined | null,
  projectId: string | undefined,
  title?: string
): string {
  if (alt && alt.trim().length > 0 && !isInvalidOrLogoImage(alt)) {
    return alt.trim();
  }
  return getThematicCover(projectId, title).alt;
}
