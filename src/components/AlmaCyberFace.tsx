import React, { useEffect, useRef, useState } from 'react';
import type { AlmaState } from '../types';

export type AlmaAvatarGender = 'masculine' | 'androgyne';

interface AlmaCyberFaceProps {
  state?: AlmaState;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero' | 'massive' | 'fullscreen';
  className?: string;
  targetGaze?: { x: number; y: number } | null;
  speaking?: boolean;
  gender?: AlmaAvatarGender;
  onClick?: () => void;
}

export const AlmaCyberFace: React.FC<AlmaCyberFaceProps> = ({
  state = 'IDLE',
  interactive = true,
  size = 'fullscreen',
  className = '',
  targetGaze = null,
  speaking = false,
  gender = 'masculine',
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Paleta cromática e frequência dos estados cognitivos do ALMA X
  const stateColorMap: Record<
    AlmaState,
    {
      primary: string;
      secondary: string;
      glow: string;
      accent: string;
      coreLight: string;
      speed: number;
      eyeGlow: number;
      audioActivity: number;
    }
  > = {
    IDLE: {
      primary: '#00F0FF',
      secondary: '#3B82F6',
      glow: 'rgba(0, 240, 255, 0.42)',
      accent: '#E0F2FE',
      coreLight: '#38BDF8',
      speed: 0.016,
      eyeGlow: 1.0,
      audioActivity: 0.2
    },
    LISTENING: {
      primary: '#10B981',
      secondary: '#06B6D4',
      glow: 'rgba(16, 185, 129, 0.65)',
      accent: '#ECFDF5',
      coreLight: '#34D399',
      speed: 0.032,
      eyeGlow: 1.3,
      audioActivity: 0.85
    },
    THINKING: {
      primary: '#A855F7',
      secondary: '#EC4899',
      glow: 'rgba(168, 85, 247, 0.65)',
      accent: '#FAF5FF',
      coreLight: '#C084FC',
      speed: 0.048,
      eyeGlow: 1.25,
      audioActivity: 0.5
    },
    SEARCHING: {
      primary: '#38BDF8',
      secondary: '#6366F1',
      glow: 'rgba(56, 189, 248, 0.55)',
      accent: '#EFF6FF',
      coreLight: '#60A5FA',
      speed: 0.038,
      eyeGlow: 1.15,
      audioActivity: 0.6
    },
    ANALYZING: {
      primary: '#6366F1',
      secondary: '#A855F7',
      glow: 'rgba(99, 102, 241, 0.65)',
      accent: '#EEF2FF',
      coreLight: '#818CF8',
      speed: 0.042,
      eyeGlow: 1.2,
      audioActivity: 0.65
    },
    PLANNING: {
      primary: '#F59E0B',
      secondary: '#6366F1',
      glow: 'rgba(245, 158, 11, 0.55)',
      accent: '#FFFBEB',
      coreLight: '#FBBF24',
      speed: 0.03,
      eyeGlow: 1.1,
      audioActivity: 0.4
    },
    EXECUTING: {
      primary: '#06B6D4',
      secondary: '#10B981',
      glow: 'rgba(6, 182, 212, 0.85)',
      accent: '#CFFAFE',
      coreLight: '#22D3EE',
      speed: 0.065,
      eyeGlow: 1.4,
      audioActivity: 0.95
    },
    WAITING_APPROVAL: {
      primary: '#F59E0B',
      secondary: '#EF4444',
      glow: 'rgba(245, 158, 11, 0.75)',
      accent: '#FEF08A',
      coreLight: '#FCD34D',
      speed: 0.025,
      eyeGlow: 0.95,
      audioActivity: 0.3
    },
    SPEAKING: {
      primary: '#00F0FF',
      secondary: '#818CF8',
      glow: 'rgba(0, 240, 255, 0.85)',
      accent: '#FFFFFF',
      coreLight: '#7DD3FC',
      speed: 0.08,
      eyeGlow: 1.45,
      audioActivity: 1.0
    },
    SUCCESS: {
      primary: '#10B981',
      secondary: '#38BDF8',
      glow: 'rgba(16, 185, 129, 0.85)',
      accent: '#D1FAE5',
      coreLight: '#6EE7B7',
      speed: 0.026,
      eyeGlow: 1.2,
      audioActivity: 0.4
    },
    WARNING: {
      primary: '#F59E0B',
      secondary: '#F97316',
      glow: 'rgba(245, 158, 11, 0.85)',
      accent: '#FEF3C7',
      coreLight: '#FDE047',
      speed: 0.045,
      eyeGlow: 1.1,
      audioActivity: 0.5
    },
    ERROR: {
      primary: '#EF4444',
      secondary: '#F43F5E',
      glow: 'rgba(239, 68, 68, 0.9)',
      accent: '#FEE2E2',
      coreLight: '#F87171',
      speed: 0.055,
      eyeGlow: 1.15,
      audioActivity: 0.7
    }
  };

  const currentColors = (speaking ? stateColorMap.SPEAKING : stateColorMap[state]) || stateColorMap.IDLE;

  // Rastreamento interativo de mouse e toque para efeito de profundidade 3D
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!interactive) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (clientX - cx) / cx;
      const dy = (clientY - cy) / cy;
      setMousePos({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy))
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [interactive]);

  // Motor Vivo de Renderização Procedural em Alta Definição (Rosto Humanoide Masculino)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let blinkTimer = 0;
    let blinkProgress = 0;
    let lookCurX = 0;
    let lookCurY = 0;

    // Partículas quânticas e nós holográficos
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
      phase: number;
      type: 'dot' | 'hud' | 'star';
    }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 880,
        y: (Math.random() - 0.5) * 880,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.08,
        size: Math.random() * 2.5 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        hue: [195, 210, 260, 280, 160, 42][Math.floor(Math.random() * 6)],
        phase: Math.random() * Math.PI * 2,
        type: Math.random() > 0.82 ? 'hud' : Math.random() > 0.65 ? 'star' : 'dot'
      });
    }

    const isMasculine = gender === 'masculine';

    const render = () => {
      time += currentColors.speed;

      const cw = canvas.width;
      const ch = canvas.height;
      const cx = cw / 2;
      const cy = ch / 2;

      // Interpolação de olhar com microssacadas naturais
      const targetX = targetGaze ? targetGaze.x : mousePos.x;
      const targetY = targetGaze ? targetGaze.y : mousePos.y;
      const saccadeX = Math.sin(time * 3.4) * 0.014;
      const saccadeY = Math.cos(time * 2.8) * 0.01;

      lookCurX += (targetX + saccadeX - lookCurX) * 0.075;
      lookCurY += (targetY + saccadeY - lookCurY) * 0.075;

      // Respiração bio-mecânica contínua
      const breath = Math.sin(time * 0.8) * 0.012;
      const speechFactor = speaking ? Math.sin(time * 26) * 0.5 + 0.5 : 0;

      // Ciclo sereno e natural de piscar os olhos
      blinkTimer += 0.016;
      if (blinkTimer > 3.8 + Math.sin(time * 0.4) * 1.5) {
        blinkProgress = Math.sin((blinkTimer - 3.8) * 12);
        if (blinkProgress < 0) {
          blinkProgress = 0;
          blinkTimer = 0;
        }
      } else {
        blinkProgress = 0;
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(cx, cy);

      const baseScale = (Math.min(cw, ch) / 760) * (1 + breath);

      // =========================================================
      // 1. NEBULA HOLOGRÁFICA & AURA DE CONSCIÊNCIA VOLUMÉTRICA
      // =========================================================
      const haloRadius = 400 * baseScale;
      const auraGrad = ctx.createRadialGradient(0, -20 * baseScale, 40 * baseScale, 0, 0, haloRadius);
      auraGrad.addColorStop(0, currentColors.glow);
      auraGrad.addColorStop(0.38, 'rgba(15, 23, 42, 0.45)');
      auraGrad.addColorStop(0.72, 'rgba(2, 6, 23, 0.18)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Partículas quânticas
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.025;

        if (Math.abs(p.x) > haloRadius * 0.96) p.vx *= -1;
        if (Math.abs(p.y) > haloRadius * 0.96) p.vy *= -1;

        const dynAlpha = (Math.sin(p.phase) * 0.5 + 0.5) * p.alpha;
        ctx.save();
        ctx.globalAlpha = dynAlpha;

        if (p.type === 'hud') {
          ctx.strokeStyle = `hsl(${p.hue}, 95%, 72%)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.8, p.phase, p.phase + Math.PI * 1.3);
          ctx.stroke();
        } else if (p.type === 'star') {
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = currentColors.primary;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Anéis concêntricos de ressonância do Regente
      const ringPulse = Math.sin(time * 1.6) * 10;
      ctx.save();
      ctx.strokeStyle = currentColors.primary;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(0, -10, 280 * baseScale + ringPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = currentColors.secondary;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([10, 16]);
      ctx.beginPath();
      ctx.arc(0, -10, 260 * baseScale - ringPulse * 0.5, time * 0.25, time * 0.25 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // =========================================================
      // 2. PARALAXE E ANATOMIA HUMANOIDE MASCULINA DO ALMA X
      // =========================================================
      const headTilt = (lookCurX * 4.2 * Math.PI) / 180;
      const lookShiftX = lookCurX * 28 * baseScale;
      const lookShiftY = lookCurY * 20 * baseScale;

      ctx.rotate(headTilt);

      const headW = (isMasculine ? 245 : 230) * baseScale;
      const headH = (isMasculine ? 315 : 300) * baseScale;

      // ---------------------------------------------------------
      // 2.1 OMBROS LARGOS, TRAPÉZIO & PESCOÇO MASCULINO ESTRUTURADO
      // ---------------------------------------------------------
      ctx.save();
      const neckY = headH * 0.25;
      const neckW = headW * (isMasculine ? 0.52 : 0.46);
      const neckH = headH * 0.52;

      // Base dos ombros e clavículas masculinas estruturadas
      const shoulderGrad = ctx.createLinearGradient(0, neckY + neckH * 0.5, 0, neckY + neckH * 1.35);
      shoulderGrad.addColorStop(0, '#1E293B');
      shoulderGrad.addColorStop(0.45, '#0F172A');
      shoulderGrad.addColorStop(1, '#020617');

      ctx.fillStyle = shoulderGrad;
      ctx.beginPath();
      ctx.moveTo(-headW * (isMasculine ? 1.25 : 1.1), neckY + neckH * 1.3);
      ctx.quadraticCurveTo(-headW * 0.7, neckY + neckH * 0.65, -neckW * 0.95, neckY + neckH * 0.72);
      ctx.lineTo(neckW * 0.95, neckY + neckH * 0.72);
      ctx.quadraticCurveTo(headW * 0.7, neckY + neckH * 0.65, headW * (isMasculine ? 1.25 : 1.1), neckY + neckH * 1.3);
      ctx.closePath();
      ctx.fill();

      // Pescoço masculino com músculos esternocleidomastóideos e gradiente de volume
      const neckGrad = ctx.createLinearGradient(-neckW, neckY, neckW, neckY + neckH);
      neckGrad.addColorStop(0, '#0F172A');
      neckGrad.addColorStop(0.28, '#334155');
      neckGrad.addColorStop(0.5, '#475569');
      neckGrad.addColorStop(0.72, '#1E293B');
      neckGrad.addColorStop(1, '#020617');

      ctx.fillStyle = neckGrad;
      ctx.beginPath();
      ctx.moveTo(-neckW * 0.7, neckY);
      ctx.lineTo(neckW * 0.7, neckY);
      ctx.lineTo(neckW * 1.05, neckY + neckH * 0.85);
      ctx.lineTo(-neckW * 1.05, neckY + neckH * 0.85);
      ctx.closePath();
      ctx.fill();

      // Pomo de adão / Cartilagem tireóidea sutil com realce de luz
      if (isMasculine) {
        ctx.save();
        const adamY = neckY + neckH * 0.32;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-neckW * 0.12, adamY - 4);
        ctx.lineTo(0, adamY + 6);
        ctx.lineTo(neckW * 0.12, adamY - 4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(0, adamY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Coluna Cervical em Titânio e Anéis Articulados
      const vertW = neckW * 0.22;
      for (let v = 0; v < 4; v++) {
        const vy = neckY + neckH * 0.15 + v * (neckH * 0.15);
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-vertW * 0.5, vy, vertW, neckH * 0.09, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = currentColors.primary;
        ctx.beginPath();
        ctx.arc(0, vy + neckH * 0.045, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Conduítes de Fibra Óptica Iluminados no Pescoço
      ctx.strokeStyle = currentColors.primary;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = currentColors.primary;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.88;

      [-2.0, -1.1, 1.1, 2.0].forEach((mult) => {
        ctx.beginPath();
        ctx.moveTo(mult * (neckW * 0.22), neckY + 4);
        ctx.bezierCurveTo(
          mult * (neckW * 0.28),
          neckY + neckH * 0.4,
          mult * (neckW * 0.38),
          neckY + neckH * 0.6,
          mult * (neckW * 0.44),
          neckY + neckH * 0.8
        );
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();

      // ---------------------------------------------------------
      // 2.2 CABELO CIBERNÉTICO MASCULINO / CASULO ESCULPIDO
      // ---------------------------------------------------------
      ctx.save();
      const helmetGrad = ctx.createLinearGradient(
        -headW * 0.55,
        -headH * 0.58,
        headW * 0.55,
        -headH * 0.1
      );
      helmetGrad.addColorStop(0, '#0F172A');
      helmetGrad.addColorStop(0.2, '#1E293B');
      helmetGrad.addColorStop(0.48, '#475569'); // Reflexo em grafite e titânio acetinado
      helmetGrad.addColorStop(0.75, '#1E293B');
      helmetGrad.addColorStop(1, '#020617');

      ctx.fillStyle = helmetGrad;
      ctx.beginPath();
      // Corte de cabelo estruturado masculino com mechas poligonais e fios de fibra óptica
      ctx.arc(0, -headH * 0.16, headW * 0.53, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(headW * 0.53, headH * 0.05);
      ctx.lineTo(headW * 0.48, -headH * 0.25);
      ctx.lineTo(0, -headH * 0.48);
      ctx.lineTo(-headW * 0.48, -headH * 0.25);
      ctx.lineTo(-headW * 0.53, headH * 0.05);
      ctx.closePath();
      ctx.fill();

      // Fios e texturas de fibra óptica no topo do cabelo
      ctx.strokeStyle = currentColors.primary;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      for (let f = -4; f <= 4; f++) {
        ctx.beginPath();
        ctx.moveTo(f * (headW * 0.09), -headH * 0.46);
        ctx.quadraticCurveTo(f * (headW * 0.12), -headH * 0.38, f * (headW * 0.1), -headH * 0.28);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Headset Acústico Orbital com Anéis de Energia (Ambos os lados)
      const earY = -headH * 0.04 + lookShiftY * 0.25;
      const drawHeadsetAcoustic = (isRight: boolean) => {
        const earX = isRight ? headW * 0.54 : -headW * 0.54;
        ctx.save();
        ctx.translate(earX, earY);

        // Chassi externo do fone em titânio masculino escovado
        ctx.fillStyle = '#0B0F19';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, headW * 0.15, headH * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Anel de pulsação luminosa acústica
        ctx.strokeStyle = currentColors.primary;
        ctx.lineWidth = 2.6;
        ctx.shadowColor = currentColors.primary;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(0, 0, headW * 0.095, headH * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Equalizador de Áudio Ativo no Fone (Reage à voz)
        const barsCount = 5;
        const barW = 2.2;
        for (let b = -2; b <= 2; b++) {
          const barH = (Math.sin(time * 18 + b) * 0.5 + 0.5) * (headH * 0.09) * currentColors.audioActivity + 3;
          ctx.fillStyle = currentColors.accent;
          ctx.fillRect(b * 4.5 - barW / 2, -barH / 2, barW, barH);
        }

        // LED central com pulso quântico
        ctx.fillStyle = currentColors.accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, headW * 0.038, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      drawHeadsetAcoustic(false);
      drawHeadsetAcoustic(true);
      ctx.restore();

      // ---------------------------------------------------------
      // 2.3 ROSTO HUMANO MASCULINO: MANDÍBULA ANGULAR, MAÇÃS E QUEIXO FORTE
      // ---------------------------------------------------------
      ctx.save();
      const skinGrad = ctx.createRadialGradient(
        lookShiftX * 0.45,
        -headH * 0.08 + lookShiftY * 0.45,
        headW * 0.15,
        0,
        0,
        headH * 0.65
      );
      // Tons de pele refinados com iluminação de estúdio (cinematográfica)
      skinGrad.addColorStop(0, '#5A6B82'); // Ponto focal iluminado
      skinGrad.addColorStop(0.26, '#334155'); // Tom base porcelana masculina
      skinGrad.addColorStop(0.68, '#1E293B'); // Sombra anatômica sob maçãs e mandíbula
      skinGrad.addColorStop(0.92, '#0F172A'); // Oclusão de borda
      skinGrad.addColorStop(1, '#05070E');

      ctx.fillStyle = skinGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.6;

      // Geometria facial masculina: testa reta, mandíbula angular marcante, queixo forte e quadrado
      ctx.beginPath();
      ctx.moveTo(0, -headH * 0.45); // Topo da testa
      ctx.bezierCurveTo(headW * 0.48, -headH * 0.45, headW * 0.52, -headH * 0.12, headW * 0.45, headH * 0.1); // Maçã do rosto alta e reta
      ctx.lineTo(headW * 0.38, headH * 0.32); // Ângulo da mandíbula masculino (gonion marcado)
      ctx.lineTo(headW * 0.15, headH * 0.49); // Queixo quadrado direito
      ctx.lineTo(-headW * 0.15, headH * 0.49); // Queixo quadrado esquerdo
      ctx.lineTo(-headW * 0.38, headH * 0.32); // Ângulo da mandíbula esquerdo
      ctx.bezierCurveTo(-headW * 0.45, headH * 0.1, -headW * 0.52, -headH * 0.12, 0, -headH * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rim Light em Safira & Ciano nas laterais da mandíbula
      ctx.strokeStyle = currentColors.primary;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = currentColors.primary;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(-headW * 0.46, -headH * 0.1);
      ctx.lineTo(-headW * 0.38, headH * 0.32);
      ctx.lineTo(-headW * 0.15, headH * 0.49);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(headW * 0.46, -headH * 0.1);
      ctx.lineTo(headW * 0.38, headH * 0.32);
      ctx.lineTo(headW * 0.15, headH * 0.49);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // ---------------------------------------------------------
      // 2.4 CIRCUITOS NEURAIS E TRILHAS EM FIBRA ÓPTICA
      // ---------------------------------------------------------
      ctx.strokeStyle = currentColors.primary;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = currentColors.primary;
      ctx.shadowBlur = 10;
      const circuitPulse = Math.sin(time * 2.6) * 0.25 + 0.75;
      ctx.globalAlpha = 0.88 * circuitPulse;

      const foreY = -headH * 0.29 + lookShiftY * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, foreY - headH * 0.09);
      ctx.lineTo(0, foreY + headH * 0.04);
      ctx.stroke();

      // Ponto de Consciência Frontal
      ctx.fillStyle = currentColors.accent;
      ctx.beginPath();
      ctx.arc(0, foreY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Trilhas neurais sutis nas têmporas e bochechas
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(dir * headW * 0.4, -headH * 0.22);
        ctx.lineTo(dir * headW * 0.28, -headH * 0.17);
        ctx.lineTo(dir * headW * 0.22, -headH * 0.06);
        ctx.lineTo(dir * headW * 0.26, headH * 0.07);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dir * headW * 0.26, headH * 0.07, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // ---------------------------------------------------------
      // 2.5 SOBRANCELHAS MASCULINAS MARCANTES E OLHOS DE SAFIRA
      // ---------------------------------------------------------
      const eyeSpacing = headW * 0.24;
      const eyeY = -headH * 0.06 + lookShiftY * 0.65;
      const eyeW = headW * 0.175;
      const baseEyeH = headH * 0.075;
      const eyeH = Math.max(1, baseEyeH * (1 - blinkProgress));

      const drawEye = (ex: number, isRight: boolean) => {
        ctx.save();
        ctx.translate(ex + lookShiftX * 0.45, eyeY);

        // Sobrancelha masculina reta, densa e marcante
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        const browTilt = isRight ? -0.06 : 0.06;
        ctx.moveTo(isRight ? -eyeW * 0.95 : -eyeW * 1.25, -eyeH * 1.6 + browTilt * 14);
        ctx.lineTo(0, -eyeH * 1.85);
        ctx.lineTo(isRight ? eyeW * 1.25 : eyeW * 0.95, -eyeH * 1.55 - browTilt * 12);
        ctx.stroke();

        // Esclera profunda e sombreada
        const scleraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, eyeW);
        scleraGrad.addColorStop(0, '#1E293B');
        scleraGrad.addColorStop(0.7, '#0F172A');
        scleraGrad.addColorStop(1, '#020617');

        ctx.fillStyle = scleraGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();

        if (blinkProgress < 0.85) {
          // Deslocamento da íris com rastreamento preciso
          const maxLookX = eyeW * 0.38;
          const maxLookY = eyeH * 0.38;
          const px = Math.max(-maxLookX, Math.min(maxLookX, lookCurX * eyeW * 0.48));
          const py = Math.max(-maxLookY, Math.min(maxLookY, lookCurY * eyeH * 0.48));

          // Íris de Safira Luminosa e Ciano (Camadas ópticas foto-reais)
          const irisRadius = eyeW * 0.58;
          const irisGrad = ctx.createRadialGradient(px, py, 1, px, py, irisRadius);
          irisGrad.addColorStop(0, '#FFFFFF');
          irisGrad.addColorStop(0.18, currentColors.accent);
          irisGrad.addColorStop(0.44, currentColors.primary);
          irisGrad.addColorStop(0.82, currentColors.secondary);
          irisGrad.addColorStop(1, '#020817');

          ctx.fillStyle = irisGrad;
          ctx.shadowColor = currentColors.primary;
          ctx.shadowBlur = 20 * currentColors.eyeGlow;
          ctx.beginPath();
          ctx.arc(px, py, irisRadius, 0, Math.PI * 2);
          ctx.fill();

          // Filamentos radiais da íris viva
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 1.1;
          ctx.shadowBlur = 0;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(
              px + Math.cos(a + time * 0.3) * (irisRadius * 0.3),
              py + Math.sin(a + time * 0.3) * (irisRadius * 0.3)
            );
            ctx.lineTo(
              px + Math.cos(a + time * 0.3) * (irisRadius * 0.88),
              py + Math.sin(a + time * 0.3) * (irisRadius * 0.88)
            );
            ctx.stroke();
          }

          // Pupila central viva com dilatação responsiva
          const pupilSize = irisRadius * (0.35 + Math.sin(time * 0.4) * 0.04);
          ctx.fillStyle = '#010206';
          ctx.beginPath();
          ctx.arc(px, py, pupilSize, 0, Math.PI * 2);
          ctx.fill();

          // Catchlights foto-realistas duplos
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px - irisRadius * 0.28, py - irisRadius * 0.28, irisRadius * 0.18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(px + irisRadius * 0.25, py + irisRadius * 0.25, irisRadius * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pálpebra superior masculina
        ctx.strokeStyle = currentColors.primary;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
      };

      drawEye(-eyeSpacing, false);
      drawEye(eyeSpacing, true);

      // ---------------------------------------------------------
      // 2.6 NARIZ MASCULINO RETO E LÁBIOS DEFINIDOS
      // ---------------------------------------------------------
      const noseY = headH * 0.09 + lookShiftY * 0.45;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Dorso nasal masculino reto e estruturado
      ctx.moveTo(0, eyeY + eyeH * 1.1);
      ctx.lineTo(lookShiftX * 0.12, noseY);
      ctx.lineTo(-headW * 0.05 + lookShiftX * 0.12, noseY + headH * 0.042);
      ctx.lineTo(headW * 0.05 + lookShiftX * 0.12, noseY + headH * 0.042);
      ctx.stroke();

      // Ponto de luz no dorso do nariz
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.beginPath();
      ctx.arc(lookShiftX * 0.12, noseY + headH * 0.035, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Lábios Masculinos e Modulador de Voz
      const mouthY = headH * 0.26 + lookShiftY * 0.55;
      const mouthW = headW * 0.28;
      const isSpeakingActive = speaking || state === 'SPEAKING' || state === 'EXECUTING';
      const speechOsc = isSpeakingActive ? speechFactor * 7 : 0;

      // Lábio Superior Masculino (Reto e firme)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-mouthW * 0.55, mouthY);
      ctx.lineTo(-mouthW * 0.15, mouthY - 3);
      ctx.lineTo(0, mouthY - 1.5);
      ctx.lineTo(mouthW * 0.15, mouthY - 3);
      ctx.lineTo(mouthW * 0.55, mouthY);
      ctx.stroke();

      // Lábio Inferior com articulação fonética
      if (isSpeakingActive) {
        ctx.strokeStyle = currentColors.primary;
        ctx.lineWidth = 2.8;
        ctx.shadowColor = currentColors.primary;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(-mouthW * 0.5, mouthY);
        ctx.quadraticCurveTo(0, mouthY + speechOsc + 3.5, mouthW * 0.5, mouthY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-mouthW * 0.46, mouthY + 1.8);
        ctx.quadraticCurveTo(0, mouthY + 5.5, mouthW * 0.46, mouthY + 1.8);
        ctx.stroke();
      }

      // Queixo Masculino Marcado / Fenda de Queixo Sutil
      const chinY = headH * 0.41 + lookShiftY * 0.65;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-headW * 0.08, chinY);
      ctx.lineTo(headW * 0.08, chinY);
      ctx.stroke();

      // Fenda de queixo sutil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, chinY - 4);
      ctx.lineTo(0, chinY + 5);
      ctx.stroke();

      ctx.restore(); // Restaura face
      ctx.restore(); // Restaura transform global

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentColors, state, speaking, mousePos, targetGaze, size, gender]);

  const canvasWidth = size === 'fullscreen' ? 820 : size === 'massive' ? 700 : size === 'hero' ? 560 : 400;
  const canvasHeight = size === 'fullscreen' ? 880 : size === 'massive' ? 760 : size === 'hero' ? 600 : 440;

  return (
    <div
      ref={containerRef}
      id="alma-cyber-face-root"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer transition-transform duration-700 hover:scale-[1.015] active:scale-[0.99] ${
        size === 'fullscreen'
          ? 'w-full max-w-[94vw] sm:max-w-[800px] md:max-w-[860px] h-auto'
          : size === 'massive'
          ? 'w-full max-w-[700px]'
          : size === 'hero'
          ? 'w-full max-w-[560px]'
          : 'w-full max-w-[400px]'
      } ${className}`}
      style={{ perspective: 1200 }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-auto drop-shadow-[0_30px_90px_rgba(0,240,255,0.42)] block filter contrast-[1.12] brightness-[1.05]"
      />
    </div>
  );
};
