import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/**
 * Marca o vídeo do Veo com a identidade do projeto, como um vídeo de marketing de verdade:
 * logotipo o tempo todo, gancho nos primeiros segundos, mensagens de benefício (legenda),
 * chamada para ação no final e o destino oficial (site ou app).
 *
 * O Veo não escreve texto com qualidade (erra letras), por isso o texto entra aqui,
 * por cima do vídeo pronto, com fonte profissional e sem erro de ortografia.
 */

export interface VideoOverlayCopy {
  /** Gancho dos primeiros segundos (gatilho de curiosidade/identificação). */
  hook: string;
  /** Mensagens de legenda no meio do vídeo (benefício, autoridade, prova verdadeira). */
  points: string[];
  /** Chamada para ação curta. */
  cta: string;
  /** Onde a pessoa vai: domínio do site ou "App na Play Store". */
  ctaDetail: string;
}

export interface VideoBrandingInput {
  copy: VideoOverlayCopy;
  brandName: string;
  logoPath?: string | null;
  brandColor?: string;
  durationSeconds?: number;
}

export interface VideoBrandingResult {
  buffer: Buffer;
  applied: boolean;
  reason?: string;
}

const ASSETS_DIR = () => path.join(process.cwd(), 'server', 'assets', 'branding');
const FONT_BOLD = () => path.join(ASSETS_DIR(), 'Inter-ExtraBold.otf');
const FONT_SEMI = () => path.join(ASSETS_DIR(), 'Inter-SemiBold.otf');

const PROJECT_LOGOS: Record<string, string> = {
  proj_magia_crencas: 'magia-crencas.png',
  'magia-das-crencas': 'magia-crencas.png',
  proj_exu_responde: 'exu-responde.png',
  'exu-responde': 'exu-responde.png',
  proj_maria_padilha: 'maria-padilha.png',
  'maria-padilha-rainha-das-7-encruzilhadas': 'maria-padilha.png',
  proj_manual_catolico: 'manual-catolico.png',
  'manual-catolico': 'manual-catolico.png',
  proj_froc_ia: 'froc-ia.png',
  'froc-ia': 'froc-ia.png',
  proj_oraculos: 'oraculos.png',
  oraculos: 'oraculos.png',
  proj_froc_marketing_engine: 'froc-marketing-engine.png',
  'froc-ia-marketing-engine': 'froc-marketing-engine.png'
};

const BRAND_COLORS: Array<[RegExp, string]> = [
  [/magia|crenca/, '#B45309'],
  [/exu/, '#B91C1C'],
  [/padilha/, '#9F1239'],
  [/catolic/, '#1D4ED8'],
  [/oraculo/, '#6D28D9'],
  [/froc/, '#0E7490']
];

function normalize(value: string): string {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function brandColorFor(project: any): string {
  const explicit = String(project?.brandColor || project?.primaryColor || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(explicit)) return explicit;
  const key = normalize(`${project?.slug || ''} ${project?.name || ''}`);
  const curated = BRAND_COLORS.find(([re]) => re.test(key))?.[1];
  if (curated) return curated;
  // Projeto novo sem cor cadastrada: cor estável derivada do nome (cada projeto fica com a sua).
  const palette = ['#B45309', '#B91C1C', '#9F1239', '#1D4ED8', '#6D28D9', '#0E7490', '#047857', '#A16207', '#C2410C', '#7C3AED', '#0369A1', '#BE185D'];
  const hash = crypto.createHash('sha1').update(String(project?.id || project?.slug || project?.name || 'x')).digest()[0];
  return palette[hash % palette.length];
}

/** Cor de destaque tirada do próprio logotipo (para projetos novos sem cor cadastrada). */
export async function brandColorFromLogo(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  try {
    const { dominant } = await sharp(logoPath).stats();
    const { r, g, b } = dominant;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Cinza, quase branco ou quase preto não servem de botão: usa a cor do nome.
    if (max - min < 40 || max < 60 || min > 200) return null;
    const k = max > 200 ? 180 / max : 1; // escurece um pouco para o texto branco ler bem
    const hex = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
  } catch {
    return null;
  }
}

/** Logotipo local em PNG (os SVGs do site já foram convertidos em server/assets/branding/logos). */
export function localLogoFor(project: any): string | null {
  const file = PROJECT_LOGOS[String(project?.id || '')] || PROJECT_LOGOS[String(project?.slug || '')];
  const isPortal = /portal[ -]?vip/.test(normalize(`${project?.id || ''} ${project?.slug || ''} ${project?.name || ''}`));
  const candidates = [
    file ? path.join(ASSETS_DIR(), 'logos', file) : '',
    // O logo do Portal Vip só vale para o próprio Portal; projeto novo nunca recebe a marca de outro.
    isPortal ? path.join(ASSETS_DIR(), 'logos', 'portal-vip.png') : ''
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) || null;
}

/**
 * Logotipo de QUALQUER projeto (os 7 iniciais e todos os que você cadastrar):
 * 1) o logo cadastrado em Projetos & Sites (link https ou caminho do site, PNG/JPG/WebP/SVG),
 *    convertido para PNG; 2) o PNG embutido dos projetos iniciais; 3) sem logo, só o nome.
 */
export async function prepareProjectLogo(project: any, dir: string, siteUrl?: string): Promise<string | null> {
  const raw = String(project?.logoUrl || '').trim();
  const local = localLogoFor(project);
  const builtInFile = PROJECT_LOGOS[String(project?.id || '')] || PROJECT_LOGOS[String(project?.slug || '')];
  // Projeto inicial com o logo padrão do site: usa o PNG pronto (sem rede).
  if (local && (!raw || (builtInFile && raw.includes(builtInFile.replace('.png', ''))))) return local;
  if (raw) {
    try {
      let source: Buffer | null = null;
      if (raw.startsWith('/') && !raw.startsWith('//')) {
        const onDisk = [path.join(process.cwd(), 'public', raw), path.join(process.cwd(), 'dist', raw)].find((f) => fs.existsSync(f));
        if (onDisk) source = fs.readFileSync(onDisk);
        else if (siteUrl) source = await fetchLogo(new URL(raw, siteUrl).toString());
      } else if (/^https:\/\//i.test(raw)) {
        source = await fetchLogo(raw);
      } else if (/^data:image\/[a-z+]+;base64,/i.test(raw)) {
        source = Buffer.from(raw.split(',')[1] || '', 'base64');
      }
      if (source && source.length) {
        const out = path.join(dir, 'logo-project.png');
        await sharp(source, { density: 300 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
        return out;
      }
    } catch {
      // logo cadastrado inválido: segue para o próximo recurso
    }
  }
  return local;
}

async function fetchLogo(url: string): Promise<Buffer | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const res = await fetch(parsed, { signal: AbortSignal.timeout(8000) });
    const type = String(res.headers.get('content-type') || '');
    if (!res.ok || !/image\/(png|jpe?g|webp|svg\+xml|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length && buf.length <= 4 * 1024 * 1024 ? buf : null;
  } catch {
    return null;
  }
}

/** Baixa logotipo enviado pelo dono (PNG/JPG/WebP por HTTPS). SVG não é aceito pelo ffmpeg. */
export async function downloadLogo(url: string, dir: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const res = await fetch(parsed, { signal: AbortSignal.timeout(8000) });
    const type = String(res.headers.get('content-type') || '');
    if (!res.ok || !/image\/(png|jpe?g|webp)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 4 * 1024 * 1024) return null;
    const file = path.join(dir, `logo.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`);
    fs.writeFileSync(file, buf);
    return file;
  } catch {
    return null;
  }
}

/** Remove emojis e símbolos que a fonte não desenha, mantém acentos do português. */
export function cleanOverlayText(value: string, max: number): string {
  // Só letras, números e pontuação que a fonte desenha: emoji e símbolos raros virariam um quadrado.
  const text = String(value || '')
    .replace(/[^\p{L}\p{N}\s.,;:!?'"()\-–—•%&@/+…ºª$]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > max * 0.6 ? space : max).trim()}…`;
}

export function wrapLines(text: string, maxChars: number, maxLines = 3): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean)
    .flatMap((w) => (w.length > maxChars ? w.match(new RegExp(`.{1,${Math.max(1, maxChars - 1)}}`, 'g')) || [w] : [w]));
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:!?…]*$/, '')}…`;
    return kept;
  }
  return lines;
}

export function domainOf(url?: string): string {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Texto de apoio montado só com dados reais do projeto (usado quando a IA não responde). */
export function fallbackOverlayCopy(project: any, title?: string): VideoOverlayCopy {
  const angles: string[] = Array.isArray(project?.socialMarketingAngles) ? project.socialMarketingAngles : [];
  const highlights: string[] = Array.isArray(project?.highlights) ? project.highlights : [];
  const site = domainOf(project?.websiteUrl || project?.website);
  const hasApp = Boolean(project?.hasApp && (project?.playStoreUrl || project?.androidApp));
  const hook = cleanOverlayText(title || angles[0] || project?.tagline || project?.name || '', 60);
  const points = [project?.tagline, ...highlights].filter(Boolean).map((p: string) => cleanOverlayText(p, 70)).filter((p: string) => p && p !== hook).slice(0, 2);
  return {
    hook,
    points,
    cta: hasApp ? 'Baixe o app oficial' : site ? 'Acesse agora' : 'Siga para mais',
    ctaDetail: hasApp ? (site && site.length <= 26 ? `Na Play Store • ${site}` : 'Na Play Store') : site || cleanOverlayText(project?.name || '', 40)
  };
}

export function sanitizeOverlayCopy(raw: any, fallback: VideoOverlayCopy): VideoOverlayCopy {
  const pick = (v: any, max: number, fb: string) => cleanOverlayText(typeof v === 'string' && v.trim() ? v : fb, max) || fb;
  const points = Array.isArray(raw?.points) ? raw.points.filter((p: any) => typeof p === 'string' && p.trim()) : [];
  return {
    hook: pick(raw?.hook, 60, fallback.hook),
    points: (points.length ? points : fallback.points).slice(0, 2).map((p: string) => cleanOverlayText(p, 70)).filter(Boolean),
    cta: pick(raw?.cta, 32, fallback.cta),
    // O destino nunca é inventado pela IA: sempre vem do cadastro do projeto.
    ctaDetail: fallback.ctaDetail
  };
}

let cachedFfmpeg: string | null | undefined;
export function resolveFfmpegPath(): string | null {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg;
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  try {
    const req = createRequire(path.join(process.cwd(), 'package.json'));
    const fromPackage = req('ffmpeg-static');
    if (typeof fromPackage === 'string') candidates.push(fromPackage);
  } catch {
    // pacote não instalado: tenta o ffmpeg do sistema
  }
  candidates.push('/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg');
  const found = candidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } }) || null;
  cachedFfmpeg = found ? ensureExecutable(found) : null;
  return cachedFfmpeg;
}

/** Na Vercel a pasta do código é só leitura: se o binário perdeu a permissão de execução, usa uma cópia em /tmp. */
function ensureExecutable(bin: string): string | null {
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    return bin;
  } catch {
    try {
      const copy = path.join(os.tmpdir(), 'pvb-ffmpeg');
      if (!fs.existsSync(copy)) fs.copyFileSync(bin, copy);
      fs.chmodSync(copy, 0o755);
      return copy;
    } catch {
      return null;
    }
  }
}

function runFfmpeg(bin: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr = (stderr + d.toString()).slice(-4000); });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('ffmpeg demorou demais')); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.split('\n').slice(-4).join(' ').slice(0, 400)}`));
    });
  });
}

async function probeVideo(bin: string, file: string): Promise<{ width: number; height: number; duration: number; hasAudio: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', () => {
      const size = err.match(/Video:.*?(\d{3,5})x(\d{3,5})/);
      const dur = err.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
      resolve({
        width: size ? Number(size[1]) : 720,
        height: size ? Number(size[2]) : 1280,
        duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 8,
        hasAudio: /Audio:/.test(err)
      });
    });
    child.on('error', () => resolve({ width: 720, height: 1280, duration: 8, hasAudio: false }));
  });
}

function esc(value: string): string {
  // Caminhos dentro do filtro do ffmpeg: escapar \ : ' ,
  return value.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,');
}

function fade(start: number, end: number, f = 0.3): string {
  const s = start.toFixed(2);
  const e = end.toFixed(2);
  return `if(lt(t\\,${s})\\,0\\,if(lt(t\\,${s}+${f})\\,(t-${s})/${f}\\,if(lt(t\\,${e}-${f})\\,1\\,if(lt(t\\,${e})\\,(${e}-t)/${f}\\,0))))`;
}

export interface OverlaySegment { kind: 'hook' | 'point' | 'cta'; text: string; start: number; end: number }

/** Linha do tempo do texto: gancho no início, legendas no meio, CTA no final. */
export function planOverlayTimeline(copy: VideoOverlayCopy, duration: number): OverlaySegment[] {
  const d = Math.max(3, duration);
  const ctaLen = Math.min(3, d * 0.33);
  const hookLen = Math.min(2.6, d * 0.3);
  const segments: OverlaySegment[] = [{ kind: 'hook', text: copy.hook, start: 0, end: hookLen }];
  const middleStart = hookLen;
  const middleEnd = d - ctaLen;
  const pts = copy.points.filter(Boolean);
  if (pts.length && middleEnd - middleStart > 1) {
    const slot = (middleEnd - middleStart) / pts.length;
    pts.forEach((text, i) => segments.push({ kind: 'point', text, start: middleStart + i * slot, end: middleStart + (i + 1) * slot }));
  }
  segments.push({ kind: 'cta', text: copy.cta, start: d - ctaLen, end: d + 0.5 });
  return segments;
}

/** Monta o filtro do ffmpeg (exportado para teste). */
export function buildBrandingFilter(opts: {
  width: number; height: number; duration: number; copy: VideoOverlayCopy; brandName: string;
  brandColor: string; hasLogo: boolean; dir: string; fontBold: string; fontSemi: string;
}): { filter: string; files: Record<string, string>; outputLabel: string } {
  const { width: W, height: H, duration, copy, brandColor, dir } = opts;
  const base = Math.min(W, H); // lado curto: mesma proporção de texto em vertical e horizontal
  const files: Record<string, string> = {};
  const color = brandColor.replace('#', '0x');
  const steps: string[] = [];
  let label = '[0:v]';
  let n = 0;
  const push = (expr: string) => {
    const out = `[v${++n}]`;
    steps.push(`${label}${expr}${out}`);
    label = out;
  };
  const textLine = (text: string, font: string, size: number, y: string, alpha: string, box: string, fontColor = 'white') => {
    const key = `t${Object.keys(files).length}`;
    const file = path.join(dir, `${key}.txt`);
    files[key] = file;
    fs.writeFileSync(file, text, 'utf8');
    push(`drawtext=expansion=none:fontfile='${esc(font)}':textfile='${esc(file)}':fontsize=${Math.round(size)}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${y}:alpha='${alpha}':${box}shadowcolor=black@0.55:shadowx=2:shadowy=2`);
  };

  if (opts.hasLogo) {
    const logoSize = Math.round(base * 0.15);
    steps.push(`[1:v]scale=${logoSize}:${logoSize}:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.92[logo]`);
    push(`[logo]overlay=x=${Math.round(base * 0.045)}:y=${Math.round(H * 0.035)}`);
  }
  const brandSize = base * 0.034;
  const nameX = opts.hasLogo ? Math.round(base * 0.045 + base * 0.15 + base * 0.025) : Math.round(base * 0.05);
  {
    const key = `t${Object.keys(files).length}`;
    const file = path.join(dir, `${key}.txt`);
    files[key] = file;
    fs.writeFileSync(file, cleanOverlayText(opts.brandName, 34), 'utf8');
    push(`drawtext=expansion=none:fontfile='${esc(opts.fontSemi)}':textfile='${esc(file)}':fontsize=${Math.round(brandSize)}:fontcolor=white:x=${nameX}:y=${Math.round(H * 0.035 + base * 0.075 - brandSize / 2)}:shadowcolor=black@0.7:shadowx=2:shadowy=2`);
  }

  for (const seg of planOverlayTimeline(copy, duration)) {
    const alpha = fade(seg.start, seg.end);
    seg.text = seg.kind === 'cta' ? seg.text : cleanOverlayText(seg.text, seg.kind === 'hook' ? 60 : 70);
    if (seg.kind !== 'cta' && !seg.text) continue;
    if (seg.kind === 'hook') {
      const size = base * 0.074;
      const lines = wrapLines(seg.text, Math.max(12, Math.floor((W * 0.84) / (size * 0.56))), 3);
      const hookTop = Math.max(H * 0.17, H * 0.035 + base * 0.15 + base * 0.05);
      lines.forEach((line, i) => textLine(line, opts.fontBold, size, `${Math.round(hookTop + i * size * 1.32)}`, alpha, `box=1:boxcolor=black@0.55:boxborderw=${Math.round(size * 0.28)}:`));
    } else if (seg.kind === 'point') {
      const size = base * 0.058;
      const lines = wrapLines(seg.text, Math.max(14, Math.floor((W * 0.86) / (size * 0.55))), 3);
      const top = H * 0.66;
      lines.forEach((line, i) => textLine(line, opts.fontBold, size, `${Math.round(top + i * size * 1.34)}`, alpha, `box=1:boxcolor=black@0.6:boxborderw=${Math.round(size * 0.26)}:`));
    } else {
      const ctaText = cleanOverlayText(seg.text, 32);
      const detail = cleanOverlayText(copy.ctaDetail, 52);
      const size = Math.min(base * 0.078, (W * 0.8) / (Math.max(ctaText.length, 8) * 0.58));
      const detailSize = Math.min(base * 0.046, (W * 0.9) / (Math.max(detail.length, 8) * 0.55));
      const top = H * 0.7;
      if (ctaText) textLine(ctaText, opts.fontBold, size, `${Math.round(top)}`, alpha, `box=1:boxcolor=${color}@0.95:boxborderw=${Math.round(size * 0.42)}:`);
      if (detail) textLine(detail, opts.fontSemi, detailSize, `${Math.round(top + size * 1.75)}`, alpha, `box=1:boxcolor=black@0.6:boxborderw=${Math.round(base * 0.016)}:`);
    }
  }

  return { filter: steps.join(';'), files, outputLabel: label };
}

/**
 * Aplica a marca. Nunca derruba a geração: se o ffmpeg não existir ou falhar,
 * devolve o vídeo original com applied=false e o motivo.
 */
export async function applyVideoBranding(video: Buffer, input: VideoBrandingInput): Promise<VideoBrandingResult> {
  const bin = resolveFfmpegPath();
  if (!bin) return { buffer: video, applied: false, reason: 'ffmpeg indisponível no servidor' };
  if (!fs.existsSync(FONT_BOLD()) || !fs.existsSync(FONT_SEMI())) return { buffer: video, applied: false, reason: 'fontes da marca ausentes' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pvb-brand-${crypto.randomUUID().slice(0, 8)}-`));
  try {
    const inFile = path.join(dir, 'in.mp4');
    const outFile = path.join(dir, 'out.mp4');
    fs.writeFileSync(inFile, video);
    const info = await probeVideo(bin, inFile);
    const duration = input.durationSeconds && input.durationSeconds > 0 ? Math.min(input.durationSeconds, info.duration || input.durationSeconds) : info.duration;
    const hasLogo = Boolean(input.logoPath && fs.existsSync(input.logoPath));
    const { filter, outputLabel } = buildBrandingFilter({
      width: info.width, height: info.height, duration, copy: input.copy, brandName: input.brandName,
      brandColor: input.brandColor || '#B45309', hasLogo, dir, fontBold: FONT_BOLD(), fontSemi: FONT_SEMI()
    });
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile];
    if (hasLogo) args.push('-i', String(input.logoPath));
    args.push('-filter_complex', filter, '-map', outputLabel);
    if (info.hasAudio) args.push('-map', '0:a?', '-c:a', 'copy');
    // Função serverless tem tempo curto: preset rápido e teto de 40 s (se passar, entrega o vídeo limpo).
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile);
    await runFfmpeg(bin, args, Number(process.env.PVB_BRANDING_TIMEOUT_MS || 40_000));
    const out = fs.readFileSync(outFile);
    if (out.length < 1000) return { buffer: video, applied: false, reason: 'saída do ffmpeg vazia' };
    const outInfo = await probeVideo(bin, outFile);
    if (info.duration > 0 && outInfo.duration < info.duration * 0.9) return { buffer: video, applied: false, reason: 'vídeo marcado ficou mais curto que o original' };
    if (info.hasAudio && !outInfo.hasAudio) return { buffer: video, applied: false, reason: 'vídeo marcado perdeu o áudio' };
    return { buffer: out, applied: true };
  } catch (error: any) {
    return { buffer: video, applied: false, reason: String(error?.message || error).slice(0, 300) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export interface ImageBrandingInput {
  headline: string;
  cta: string;
  ctaDetail: string;
  brandName: string;
  logoPath?: string | null;
  brandColor?: string;
}

/**
 * Peça de feed pronta: logotipo e nome no topo, título forte e chamada para ação na base,
 * sobre uma faixa escura suave para leitura. Se o ffmpeg falhar, devolve a imagem original.
 */
export async function applyImageBranding(image: Buffer, input: ImageBrandingInput): Promise<{ buffer: Buffer; mimeType: string; applied: boolean; reason?: string }> {
  const bin = resolveFfmpegPath();
  if (!bin) return { buffer: image, mimeType: '', applied: false, reason: 'ffmpeg indisponível no servidor' };
  if (!fs.existsSync(FONT_BOLD()) || !fs.existsSync(FONT_SEMI())) return { buffer: image, mimeType: '', applied: false, reason: 'fontes da marca ausentes' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pvb-img-${crypto.randomUUID().slice(0, 8)}-`));
  try {
    const inFile = path.join(dir, 'in.img');
    const outFile = path.join(dir, 'out.jpg');
    fs.writeFileSync(inFile, image);
    const info = await probeVideo(bin, inFile);
    const W = info.width;
    const H = info.height;
    const base = Math.min(W, H);
    const hasLogo = Boolean(input.logoPath && fs.existsSync(input.logoPath));
    const steps: string[] = [];
    let label = '[0:v]';
    let n = 0;
    let t = 0;
    const push = (expr: string) => { const out = `[i${++n}]`; steps.push(`${label}${expr}${out}`); label = out; };
    const text = (value: string, font: string, size: number, x: string, y: number, extra = '') => {
      const file = path.join(dir, `t${t++}.txt`);
      fs.writeFileSync(file, value, 'utf8');
      push(`drawtext=expansion=none:fontfile='${esc(font)}':textfile='${esc(file)}':fontsize=${Math.round(size)}:fontcolor=white:x=${x}:y=${Math.round(y)}:${extra}shadowcolor=black@0.6:shadowx=2:shadowy=2`);
    };
    // Faixas escuras em degradê no topo e na base para o texto respirar sem esconder a foto.
    push(`drawbox=x=0:y=0:w=iw:h=ih*0.16:color=black@0.28:t=fill,drawbox=x=0:y=ih*0.6:w=iw:h=ih*0.4:color=black@0.42:t=fill`);
    const logoSize = Math.round(base * 0.11);
    if (hasLogo) {
      steps.push(`[1:v]scale=${logoSize}:${logoSize}:force_original_aspect_ratio=decrease,format=rgba[logo]`);
      push(`[logo]overlay=x=${Math.round(base * 0.04)}:y=${Math.round(base * 0.03)}`);
    }
    const nameSize = base * 0.032;
    text(cleanOverlayText(input.brandName, 34), FONT_SEMI(), nameSize, `${hasLogo ? Math.round(base * 0.04 + logoSize + base * 0.02) : Math.round(base * 0.05)}`, base * 0.03 + logoSize / 2 - nameSize / 2);
    const hSize = base * 0.066;
    const lines = wrapLines(cleanOverlayText(input.headline, 90), Math.max(14, Math.floor((W * 0.88) / (hSize * 0.56))), 3);
    const ctaSize = base * 0.05;
    const detailSize = base * 0.034;
    const bottom = H - base * 0.06;
    const ctaY = bottom - detailSize * 1.6 - ctaSize * 1.5;
    const headTop = ctaY - base * 0.05 - lines.length * hSize * 1.22;
    lines.forEach((line, i) => text(line, FONT_BOLD(), hSize, '(w-text_w)/2', headTop + i * hSize * 1.22));
    const color = (input.brandColor || '#B45309').replace('#', '0x');
    const ctaText = cleanOverlayText(input.cta, 32);
    const detail = cleanOverlayText(input.ctaDetail, 52);
    if (ctaText) text(ctaText, FONT_BOLD(), Math.min(ctaSize, (W * 0.8) / (Math.max(ctaText.length, 8) * 0.58)), '(w-text_w)/2', ctaY, `box=1:boxcolor=${color}@0.95:boxborderw=${Math.round(ctaSize * 0.4)}:`);
    if (detail) text(detail, FONT_SEMI(), Math.min(detailSize, (W * 0.9) / (Math.max(detail.length, 8) * 0.55)), '(w-text_w)/2', bottom - detailSize);
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile];
    if (hasLogo) args.push('-i', String(input.logoPath));
    args.push('-filter_complex', steps.join(';'), '-map', label, '-frames:v', '1', '-q:v', '2', outFile);
    await runFfmpeg(bin, args, 20_000);
    const out = fs.readFileSync(outFile);
    if (out.length < 1000) return { buffer: image, mimeType: '', applied: false, reason: 'saída vazia' };
    return { buffer: out, mimeType: 'image/jpeg', applied: true };
  } catch (error: any) {
    return { buffer: image, mimeType: '', applied: false, reason: String(error?.message || error).slice(0, 300) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Logo + cor do projeto, prontos para o ffmpeg. Chame cleanup() depois. */
export async function resolveProjectBrand(project: any, siteUrl?: string): Promise<{ logoPath: string | null; brandColor: string; cleanup: () => void }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvb-brand-logo-'));
  const logoPath = await prepareProjectLogo(project, dir, siteUrl);
  const explicit = String(project?.brandColor || project?.primaryColor || '').trim();
  const curated = /^#[0-9a-f]{6}$/i.test(explicit) || BRAND_COLORS.some(([re]) => re.test(normalize(`${project?.slug || ''} ${project?.name || ''}`)));
  const brandColor = curated ? brandColorFor(project) : (await brandColorFromLogo(logoPath)) || brandColorFor(project);
  return { logoPath, brandColor, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
