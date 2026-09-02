import React from 'react';

export interface OrbitalSymbolDef {
  id: string;
  tabTarget: string;
  colorName: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  voiceIntroduction: string;
  audioHarmonics: number[];
  gazeCoord: { x: number; y: number }; // normalized -1 to 1 for face gaze
  renderGlyph: (primary: string, secondary: string) => React.ReactNode;
}

export const ORBITAL_SYMBOLS: OrbitalSymbolDef[] = [
  {
    id: 'sym-home',
    tabTarget: 'alma-home',
    colorName: 'amber',
    primaryColor: '#F59E0B',
    secondaryColor: '#FB923C',
    glowColor: 'rgba(245, 158, 11, 0.75)',
    voiceIntroduction: 'Ambientes físicos e residenciais sincronizados sob minha regência.',
    audioHarmonics: [528, 660, 792],
    gazeCoord: { x: -0.75, y: -0.45 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <polygon points="24,6 42,20 36,42 12,42 6,20" stroke={p} strokeWidth="2.2" strokeLinejoin="round" fill="url(#amber-grad)" fillOpacity="0.3" />
        <polygon points="24,14 34,22 30,36 18,36 14,22" stroke={s} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="24" cy="25" r="4" fill={p} className="animate-pulse" />
        <defs>
          <radialGradient id="amber-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.7" />
            <stop offset="100%" stopColor={s} stopOpacity="0.05" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-vision',
    tabTarget: 'alma-vision',
    colorName: 'cyan',
    primaryColor: '#06B6D4',
    secondaryColor: '#38BDF8',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    voiceIntroduction: 'Sensores ópticos e percepção visual contínua ativados.',
    audioHarmonics: [640, 800, 960],
    gazeCoord: { x: -0.88, y: -0.1 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <path d="M4 24C10 14 38 14 44 24C38 34 10 34 4 24Z" stroke={p} strokeWidth="2.2" fill="url(#cyan-grad)" fillOpacity="0.25" />
        <circle cx="24" cy="24" r="8" stroke={s} strokeWidth="2" />
        <circle cx="24" cy="24" r="3.5" fill={p} />
        <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
        <defs>
          <radialGradient id="cyan-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.7" />
            <stop offset="100%" stopColor={s} stopOpacity="0.05" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-agents',
    tabTarget: 'alma-agents',
    colorName: 'indigo',
    primaryColor: '#6366F1',
    secondaryColor: '#818CF8',
    glowColor: 'rgba(99, 102, 241, 0.8)',
    voiceIntroduction: 'O conselho dos dezessete agentes especialistas está reunido em prontidão.',
    audioHarmonics: [440, 554, 659],
    gazeCoord: { x: -0.75, y: 0.4 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <circle cx="24" cy="24" r="16" stroke={p} strokeWidth="1.6" strokeDasharray="3 3" />
        <circle cx="24" cy="24" r="7" fill={s} fillOpacity="0.35" stroke={p} strokeWidth="2" />
        <circle cx="24" cy="8" r="3.5" fill={p} />
        <circle cx="38" cy="18" r="3" fill={s} />
        <circle cx="34" cy="34" r="3" fill={p} />
        <circle cx="14" cy="34" r="3" fill={s} />
        <circle cx="10" cy="18" r="3" fill={p} />
        <circle cx="24" cy="24" r="3" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'sym-memory',
    tabTarget: 'alma-memory',
    colorName: 'violet',
    primaryColor: '#A855F7',
    secondaryColor: '#C084FC',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    voiceIntroduction: 'Conexões semânticas e memória viva abertas.',
    audioHarmonics: [493, 622, 740],
    gazeCoord: { x: -0.4, y: 0.78 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <path d="M12 12C20 20 28 20 36 12M12 36C20 28 28 28 36 36" stroke={p} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3" fill={s} />
        <circle cx="32" cy="16" r="3" fill={s} />
        <circle cx="24" cy="24" r="4.5" fill={p} />
        <circle cx="16" cy="32" r="3" fill={s} />
        <circle cx="32" cy="32" r="3" fill={s} />
        <line x1="24" y1="12" x2="24" y2="36" stroke={s} strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    )
  },
  {
    id: 'sym-autopilot',
    tabTarget: 'autopilot',
    colorName: 'crimson',
    primaryColor: '#EF4444',
    secondaryColor: '#F87171',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    voiceIntroduction: 'Regência autônoma e execução contínua em curso.',
    audioHarmonics: [392, 493, 587],
    gazeCoord: { x: 0.4, y: 0.78 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <path d="M24 6L30 18L42 22L32 30L34 42L24 35L14 42L16 30L6 22L18 18Z" stroke={p} strokeWidth="2.2" fill="url(#red-grad)" fillOpacity="0.3" />
        <circle cx="24" cy="25" r="5" fill={s} />
        <circle cx="24" cy="25" r="2.5" fill="#FFFFFF" />
        <defs>
          <radialGradient id="red-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.75" />
            <stop offset="100%" stopColor={s} stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-create',
    tabTarget: 'criar-conteudo',
    colorName: 'emerald',
    primaryColor: '#10B981',
    secondaryColor: '#34D399',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    voiceIntroduction: 'Matriz de manifestação criativa e síntese de ideias.',
    audioHarmonics: [587, 740, 880],
    gazeCoord: { x: 0.75, y: 0.4 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <path d="M24 4L28 18L42 24L28 30L24 44L20 30L6 24L20 18Z" stroke={p} strokeWidth="2.2" fill="url(#green-grad)" fillOpacity="0.35" />
        <circle cx="24" cy="24" r="4.5" fill={s} />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
        <defs>
          <radialGradient id="green-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.75" />
            <stop offset="100%" stopColor={s} stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-web',
    tabTarget: 'seo',
    colorName: 'blue',
    primaryColor: '#3B82F6',
    secondaryColor: '#60A5FA',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    voiceIntroduction: 'Varredura e posicionamento na rede global.',
    audioHarmonics: [440, 660, 880],
    gazeCoord: { x: 0.88, y: -0.1 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <circle cx="24" cy="24" r="17" stroke={p} strokeWidth="2.2" />
        <ellipse cx="24" cy="24" rx="8.5" ry="17" stroke={s} strokeWidth="1.6" />
        <line x1="7" y1="24" x2="41" y2="24" stroke={s} strokeWidth="1.6" />
        <circle cx="24" cy="24" r="3.2" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'sym-gold',
    tabTarget: 'dashboard',
    colorName: 'gold',
    primaryColor: '#EAB308',
    secondaryColor: '#FDE047',
    glowColor: 'rgba(234, 179, 8, 0.8)',
    voiceIntroduction: 'Métricas de expansão, desempenho e inteligência de dados.',
    audioHarmonics: [587, 740, 932],
    gazeCoord: { x: 0.65, y: -0.5 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <circle cx="24" cy="24" r="16" stroke={p} strokeWidth="2" strokeDasharray="6 4" />
        <polygon points="24,10 36,32 12,32" stroke={s} strokeWidth="2" fill={p} fillOpacity="0.25" />
        <circle cx="24" cy="22" r="3.5" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'sym-vitrine',
    tabTarget: 'vitrine',
    colorName: 'cyan-gold',
    primaryColor: '#06B6D4',
    secondaryColor: '#F59E0B',
    glowColor: 'rgba(6, 182, 212, 0.9)',
    voiceIntroduction: 'Vitrine oficial de projetos e aplicativos do Portal Vip Brasil.',
    audioHarmonics: [528, 660, 880],
    gazeCoord: { x: 0.25, y: -0.75 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <polygon points="24,4 44,24 24,44 4,24" stroke={p} strokeWidth="2.2" fill="url(#vitrine-grad)" fillOpacity="0.35" />
        <circle cx="24" cy="24" r="8" stroke={s} strokeWidth="1.8" strokeDasharray="3 2" />
        <circle cx="24" cy="24" r="3.8" fill="#FFFFFF" />
        <defs>
          <radialGradient id="vitrine-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.8" />
            <stop offset="100%" stopColor={s} stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-business',
    tabTarget: 'froc-ia',
    colorName: 'magenta',
    primaryColor: '#D946EF',
    secondaryColor: '#F472B6',
    glowColor: 'rgba(217, 70, 239, 0.8)',
    voiceIntroduction: 'Estratégia de negócios, projeções e crescimento.',
    audioHarmonics: [554, 698, 830],
    gazeCoord: { x: 0.65, y: -0.5 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <polygon points="24,6 40,24 24,42 8,24" stroke={p} strokeWidth="2.2" fill="url(#mag-grad)" fillOpacity="0.3" />
        <line x1="24" y1="6" x2="24" y2="42" stroke={s} strokeWidth="1.6" />
        <line x1="8" y1="24" x2="40" y2="24" stroke={s} strokeWidth="1.6" />
        <circle cx="24" cy="24" r="3.8" fill="#FFFFFF" />
        <defs>
          <radialGradient id="mag-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p} stopOpacity="0.75" />
            <stop offset="100%" stopColor={s} stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'sym-portal',
    tabTarget: 'perfil',
    colorName: 'platinum',
    primaryColor: '#F1F5F9',
    secondaryColor: '#38BDF8',
    glowColor: 'rgba(241, 245, 249, 0.9)',
    voiceIntroduction: 'Governança, créditos e identidade do operador.',
    audioHarmonics: [523, 659, 784],
    gazeCoord: { x: -0.25, y: -0.75 },
    renderGlyph: (p, s) => (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
        <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" stroke={p} strokeWidth="2.2" />
        <polygon points="24,12 34,18 34,30 24,36 14,30 14,18" stroke={s} strokeWidth="1.6" />
        <circle cx="24" cy="24" r="4.2" fill="#FFFFFF" />
      </svg>
    )
  }
];

interface AlmaOrbitalSymbolsProps {
  activeSymbolId: string | null;
  onHoverSymbol: (symbol: OrbitalSymbolDef | null) => void;
  onSelectSymbol: (symbol: OrbitalSymbolDef) => void;
}

export const AlmaOrbitalSymbols: React.FC<AlmaOrbitalSymbolsProps> = ({
  activeSymbolId,
  onHoverSymbol,
  onSelectSymbol
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative w-full h-full max-w-[1240px] max-h-[920px] flex items-center justify-center">
        {ORBITAL_SYMBOLS.map((sym, index) => {
          const total = ORBITAL_SYMBOLS.length;
          // Distribuição elíptica orbital cinematográfica ao redor do ALMA
          const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
          const rx = 44; // percentual horizontal
          const ry = 42; // percentual vertical
          const posX = 50 + Math.cos(angle) * rx;
          const posY = 50 + Math.sin(angle) * ry;

          const isActive = activeSymbolId === sym.id;

          return (
            <div
              key={sym.id}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${index * 0.15}s`
              }}
              className="absolute pointer-events-auto"
            >
              <button
                type="button"
                id={`orbital-btn-${sym.id}`}
                aria-label={`Símbolo ${sym.colorName}`}
                onMouseEnter={() => onHoverSymbol(sym)}
                onMouseLeave={() => onHoverSymbol(null)}
                onTouchStart={() => onHoverSymbol(sym)}
                onClick={() => onSelectSymbol(sym)}
                className={`group relative p-2.5 sm:p-3.5 md:p-4 rounded-full transition-all duration-500 focus:outline-none ${
                  isActive
                    ? 'scale-125 z-40'
                    : 'hover:scale-115 active:scale-95 hover:z-30'
                }`}
              >
                {/* Aura e halos de luz volumétrica */}
                <div
                  className="absolute inset-0 rounded-full blur-xl transition-opacity duration-500"
                  style={{
                    backgroundColor: sym.glowColor,
                    opacity: isActive ? 0.95 : 0.35
                  }}
                />

                {/* Anel de ressonância do símbolo */}
                <div
                  className="absolute -inset-2 rounded-full border transition-all duration-700"
                  style={{
                    borderColor: sym.primaryColor,
                    opacity: isActive ? 0.85 : 0.25,
                    transform: isActive ? 'scale(1.15) rotate(90deg)' : 'scale(1) rotate(0deg)'
                  }}
                />

                {/* Corpo do símbolo em vidro e plasma colorido */}
                <div
                  className="relative w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 rounded-full flex items-center justify-center p-2.5 backdrop-blur-2xl border transition-all duration-500 shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(4, 8, 18, 0.8)',
                    borderColor: sym.primaryColor,
                    boxShadow: isActive ? `0 0 40px ${sym.glowColor}` : `0 0 16px ${sym.glowColor}`
                  }}
                >
                  {sym.renderGlyph(sym.primaryColor, sym.secondaryColor)}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
