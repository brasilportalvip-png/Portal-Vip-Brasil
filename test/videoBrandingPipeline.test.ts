import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as firebaseAdminProvider from '../server/providers/firebaseAdmin.js';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { updateMasterAutomationControl } from '../server/production/automationGate.js';
import { setMediaAiClientForTesting, startVideoGenerationJob, checkAndCompleteVideoJob } from '../server/production/ai.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';
import { resolveFfmpegPath } from '../server/production/videoBranding.js';

const ffmpeg = resolveFfmpegPath();

test('Pipeline real: vídeo do Veo sai do Portal com logotipo, legendas e CTA', { skip: (!ffmpeg && 'ffmpeg não instalado') || (process.platform === 'win32' && 'validado no CI Linux') }, async (t) => {
  process.env.PVB_BRANDING_TEST = '1';
  t.after(() => { delete process.env.PVB_BRANDING_TEST; setMediaAiClientForTesting(undefined as any); firebaseAdminProvider.setAdminStorageForTesting(undefined as any); });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvb-pipe-'));
  const src = path.join(dir, 'veo.mp4');
  const made = spawnSync(ffmpeg!, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x334455:s=360x640:d=4', '-f', 'lavfi', '-i', 'sine=d=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', src]);
  assert.equal(made.status, 0);
  const veo = fs.readFileSync(src);

  resetMemoryDb();
  await updateMasterAutomationControl('admin', { globalEnabled: true, pauseAllExternalApis: false });
  const saved = new Map<string, Buffer>();
  firebaseAdminProvider.setAdminStorageForTesting({
    bucket: () => ({ name: 'portal-vip-test.appspot.com', file: (p: string) => ({ save: async (b: Buffer) => { saved.set(p, b); }, delete: async () => { saved.delete(p); } }) })
  } as any);
  setMediaAiClientForTesting({
    models: { generateVideos: async () => ({ name: 'operations/brand-1' }) },
    operations: { getVideosOperation: async () => ({ done: true, response: { generatedVideos: [{ video: { videoBytes: veo.toString('base64'), mimeType: 'video/mp4' } }] } }) }
  } as any);

  const project: any = PORTAL_VIP_PROJECTS[0];
  const job = await startVideoGenerationJob({ userId: 'usr_brand', company: project, prompt: 'Oração para abrir caminhos', title: 'Oração para abrir caminhos', preset: 'demo_720p', aspectRatio: '9:16' });
  const final: any = await checkAndCompleteVideoJob('usr_brand', job.id);
  assert.equal(final.status, 'completed');
  assert.equal(final.brandingApplied, true, final.brandingReason);
  const stored = [...saved.values()][0];
  assert.ok(stored && !stored.equals(veo), 'o arquivo salvo precisa ser o vídeo marcado');
  const item: any = (await firestore().collection(COLLECTIONS.contentItems).doc(final.contentItemId).get()).data();
  assert.equal(item.metadata.brandingApplied, true);
  assert.equal(item.metadata.overlayCopy.ctaDetail, 'Na Play Store • magiadascrencas.com.br');

  // Desmarcado na tela: vídeo limpo, igual ao do Veo.
  saved.clear();
  const clean = await startVideoGenerationJob({ userId: 'usr_brand', company: project, prompt: 'Cena limpa', preset: 'demo_720p', aspectRatio: '9:16', branding: false });
  const cleanFinal: any = await checkAndCompleteVideoJob('usr_brand', clean.id);
  assert.equal(cleanFinal.status, 'completed');
  assert.ok([...saved.values()][0].equals(veo));
  fs.rmSync(dir, { recursive: true, force: true });
});
