import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  applyImageBranding, applyVideoBranding, brandColorFor, cleanOverlayText, fallbackOverlayCopy,
  localLogoFor, planOverlayTimeline, resolveFfmpegPath, sanitizeOverlayCopy, wrapLines
} from '../server/production/videoBranding.js';
import { companyContext } from '../server/production/ai.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

const magia: any = PORTAL_VIP_PROJECTS.find((p: any) => p.id === 'proj_magia_crencas');

test('IA lê o direcionamento cadastrado do projeto (promessa, destaques, ângulos, site e app)', () => {
  const ctx = companyContext(magia);
  assert.match(ctx, /Promessa\/Slogan Oficial: Desperte seu poder interior/);
  assert.match(ctx, /Destaques Oficiais: .*Orações e decretos/);
  assert.match(ctx, /Ângulos de Marketing Aprovados pelo Dono/);
  assert.match(ctx, /Website Oficial: https:\/\/www\.magiadascrencas\.com\.br/);
  assert.match(ctx, /Aplicativo Oficial \(Play Store\): https:\/\/play\.google\.com/);
});

test('Texto do vídeo: gancho, legendas e CTA com destino real do cadastro', () => {
  const fb = fallbackOverlayCopy(magia, 'Oração para abrir caminhos');
  assert.equal(fb.hook, 'Oração para abrir caminhos');
  assert.equal(fb.points.length, 2);
  assert.equal(fb.cta, 'Baixe o app oficial');
  assert.equal(fb.ctaDetail, 'Na Play Store • magiadascrencas.com.br');
  // A IA nunca escolhe o destino: link inventado é descartado.
  const s = sanitizeOverlayCopy({ hook: 'Gancho 🔥 forte', points: ['Um', 'Dois', 'Três'], cta: 'Compre já', ctaDetail: 'golpe.com' }, fb);
  assert.equal(s.hook, 'Gancho forte');
  assert.equal(s.points.length, 2);
  assert.equal(s.ctaDetail, fb.ctaDetail);
  assert.ok(cleanOverlayText('x'.repeat(200), 60).length <= 61);
  assert.deepEqual(wrapLines('um dois tres quatro cinco seis', 9, 2), ['um dois', 'tres…']);
});

test('Texto com %, aspas, emoji e palavra gigante não quebra a legenda', async () => {
  const { buildBrandingFilter } = await import('../server/production/videoBranding.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvb-f-'));
  const { filter } = buildBrandingFilter({ width: 720, height: 1280, duration: 8, copy: { hook: '100% 🙏 fé', points: ['x'.repeat(200)], cta: 'Já', ctaDetail: 'site.com' }, brandName: 'Marca', brandColor: '#112233', hasLogo: false, dir, fontBold: 'a.otf', fontSemi: 'b.otf' });
  assert.ok(!/drawtext=(?!expansion=none)/.test(filter), 'todo texto precisa de expansion=none (senão % some)');
  const texts = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
  assert.ok(texts.includes('100% fé'));
  assert.ok(texts.every((t) => t.length <= 40), 'linha longa demais para a tela');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Linha do tempo: gancho no início, legendas no meio e CTA no final', () => {
  const tl = planOverlayTimeline({ hook: 'H', points: ['A', 'B'], cta: 'C', ctaDetail: 'D' }, 8);
  assert.deepEqual(tl.map((s) => s.kind), ['hook', 'point', 'point', 'cta']);
  assert.equal(tl[0].start, 0);
  assert.ok(tl[tl.length - 1].start >= 5 && tl[tl.length - 1].end > 8);
  for (let i = 1; i < tl.length; i++) assert.ok(Math.abs(tl[i].start - tl[i - 1].end) < 0.01);
});

test('Cada projeto oficial tem logotipo em PNG e cor própria', () => {
  for (const p of PORTAL_VIP_PROJECTS as any[]) {
    const logo = localLogoFor(p);
    assert.ok(logo && logo.endsWith('.png') && !logo.endsWith('portal-vip.png'), `${p.name} sem logotipo próprio`);
    assert.match(brandColorFor(p), /^#[0-9A-F]{6}$/i);
  }
});

const ffmpeg = resolveFfmpegPath();
test('ffmpeg real: vídeo sai com marca, 360p ampliado para 720x1280 e áudio preservado', { skip: (!ffmpeg && 'ffmpeg não instalado nesta máquina') || (process.platform === 'win32' && 'validado no CI Linux (mesmo ambiente da Vercel)') }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvb-test-'));
  const src = path.join(dir, 's.mp4');
  const made = spawnSync(ffmpeg!, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x553366:s=360x640:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', src]);
  assert.equal(made.status, 0, String(made.stderr));
  const input = fs.readFileSync(src);
  const out = await applyVideoBranding(input, { copy: fallbackOverlayCopy(magia, 'Teste de gancho'), brandName: magia.name, logoPath: localLogoFor(magia), brandColor: brandColorFor(magia), durationSeconds: 4 });
  assert.equal(out.applied, true, out.reason);
  assert.notDeepEqual(out.buffer, input);
  fs.writeFileSync(path.join(dir, 'o.mp4'), out.buffer);
  const probe = spawnSync(ffmpeg!, ['-hide_banner', '-i', path.join(dir, 'o.mp4')]);
  const info = String(probe.stderr);
  assert.match(info, /720x1280/, '360p econômico é ampliado para a legenda/logo ficarem nítidos');
  assert.match(info, /Audio:/);

  const img = path.join(dir, 'i.png');
  spawnSync(ffmpeg!, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x223344:s=540x675', '-frames:v', '1', img]);
  const branded = await applyImageBranding(fs.readFileSync(img), { headline: 'Título forte', cta: 'Acesse agora', ctaDetail: 'magiadascrencas.com.br', brandName: magia.name, logoPath: localLogoFor(magia) });
  assert.equal(branded.applied, true, branded.reason);
  assert.equal(branded.mimeType, 'image/jpeg');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Sem ffmpeg o vídeo continua sendo entregue (limpo), nunca quebra a geração', async () => {
  const prev = process.env.FFMPEG_PATH;
  const buf = Buffer.from('nao-e-video');
  process.env.FFMPEG_PATH = '/caminho/que/nao/existe';
  const out = await applyVideoBranding(buf, { copy: { hook: 'a', points: [], cta: 'b', ctaDetail: '' }, brandName: 'X' });
  // Com ffmpeg do sistema disponível ele tenta e falha no arquivo inválido; sem ffmpeg, pula. Nos dois casos devolve o original.
  assert.equal(out.applied, false);
  assert.deepEqual(out.buffer, buf);
  if (prev === undefined) delete process.env.FFMPEG_PATH; else process.env.FFMPEG_PATH = prev;
});
