import React from 'react';
import type { FrocEmotion } from '../../../shared/froc/brain';

export type FrocPhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline';

/** Brilho: verde ouvindo, dourado pensando, branco falando, rosa animado/alerta. */
export function glowFor(phase: FrocPhase, emotion: FrocEmotion): string {
  if (emotion === 'preocupado') return '#ec4899';
  if (phase === 'thinking') return '#d4a937';
  if (phase === 'speaking') return emotion === 'empolgado' || emotion === 'animado' ? '#f472b6' : '#f8fafc';
  if (phase === 'listening') return '#22c55e';
  if (phase === 'offline') return '#475569';
  return '#d4a937';
}

interface Props {
  phase: FrocPhase;
  emotion: FrocEmotion;
  level?: number;
  size?: number;
  onClick?: () => void;
  label?: string;
}

export function FrocAvatar({ phase, emotion, level = 0, size = 150, onClick, label }: Props) {
  const glow = glowFor(phase, emotion);
  const eye = phase === 'speaking' ? 0.35 + Math.min(1, level) * 0.65 : phase === 'listening' ? 0.55 : 0.25;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || 'Froc'}
      data-testid="froc-avatar"
      data-phase={phase}
      className="relative shrink-0 rounded-full cursor-pointer select-none"
      style={{ width: size, height: size, ['--pvf-glow' as any]: glow } as React.CSSProperties}
    >
      <span className={`pvf-ring ${phase === 'listening' ? 'is-listening' : ''} ${phase === 'thinking' ? 'is-thinking' : ''}`} />
      <span className="absolute inset-0 rounded-full overflow-hidden bg-black">
        <img src="/brand/froc-avatar.webp" alt="" width={size} height={size} className="w-full h-full object-cover" draggable={false} />
        <span className="pvf-eye" style={{ opacity: eye }} />
      </span>
    </button>
  );
}
