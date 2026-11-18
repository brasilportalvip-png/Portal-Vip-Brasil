import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb } from '../server/production/store.js';
import { updateMasterAutomationControl } from '../server/production/automationGate.js';
import * as firebaseAdminProvider from '../server/providers/firebaseAdmin.js';
import {
  VIDEO_PRESETS,
  resolveVideoModel,
  extractInteractionVideo,
  omniAspectRatio,
  setMediaAiClientForTesting,
  startVideoGenerationJob,
  checkAndCompleteVideoJob
} from '../server/production/ai.js';
import { brandingCanvas } from '../server/production/videoBranding.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

const validMp4 = Buffer.from([
  0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x6d,0x70,0x34,0x32,0x00,0x00,0x00,0x00,
  0x6d,0x70,0x34,0x32,0x69,0x73,0x6f,0x6d,0x00,0x00,0x00,0x08,0x6d,0x6f,0x6f,0x76
]);

test('Veo 3.1 preview (desligado pelo Google em 22/10/2026) nunca é usado', () => {
  for (const retired of ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview', 'veo-3.1-lite-generate-preview', 'veo-3.0-generate-001', 'veo-2.0-generate-001', '']) {
    assert.equal(resolveVideoModel(retired), 'gemini-omni-1.1-flash', retired);
  }
  assert.equal(resolveVideoModel('gemini-omni-2-flash'), 'gemini-omni-2-flash');
  for (const preset of Object.values(VIDEO_PRESETS)) assert.match(preset.model, /^gemini-omni/);
  assert.equal(VIDEO_PRESETS.pro_1080p.resolution, '360p', 'divulgação diária no econômico combinado (≈ R$1,30 por vídeo)');
  assert.equal(omniAspectRatio('1:1'), '9:16');
  assert.equal(omniAspectRatio('16:9'), '16:9');
});

test('Resposta do Omni: acha o vídeo no formato do SDK e no formato REST', () => {
  assert.deepEqual(extractInteractionVideo({ output_video: { data: 'QUJD', mime_type: 'video/mp4' } }), { data: 'QUJD', uri: undefined, mimeType: 'video/mp4' });
  const rest = { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }, { type: 'video', uri: 'https://generativelanguage.googleapis.com/v1beta/files/x', mime_type: 'video/mp4' }] }] };
  assert.equal(extractInteractionVideo(rest)?.uri, 'https://generativelanguage.googleapis.com/v1beta/files/x');
  assert.equal(extractInteractionVideo({ status: 'completed', outputs: [{ type: 'text', text: 'sem vídeo' }] }), null);
});

test('Marca nítida: vídeo 360p é ampliado para 720 px antes da legenda/logo/CTA', () => {
  assert.deepEqual(brandingCanvas(360, 640), { width: 720, height: 1280, prescale: true });
  assert.deepEqual(brandingCanvas(640, 360), { width: 1280, height: 720, prescale: true });
  assert.deepEqual(brandingCanvas(720, 1280), { width: 720, height: 1280, prescale: false });
});

test('Geração com Gemini Omni: inicia em segundo plano, acompanha e conclui o vídeo', async () => {
  resetMemoryDb();
  await updateMasterAutomationControl('admin', { globalEnabled: true, pauseAllExternalApis: false });
  firebaseAdminProvider.setAdminStorageForTesting({
    bucket: () => ({
      name: 'portal-vip-test.appspot.com',
      file: () => ({ save: async () => {}, delete: async () => {} })
    })
  } as any);

  const created: any[] = [];
  let polls = 0;
  setMediaAiClientForTesting({
    interactions: {
      create: async (body: any) => { created.push(body); return { id: 'omni123', status: 'in_progress' }; },
      get: async (id: string) => {
        assert.equal(id, 'omni123');
        polls++;
        return polls === 1
          ? { id, status: 'in_progress' }
          : { id, status: 'completed', output_video: { data: validMp4.toString('base64'), mime_type: 'video/mp4' } };
      }
    }
  } as any);

  try {
    const project = PORTAL_VIP_PROJECTS[0];
    const job = await startVideoGenerationJob({
      userId: 'usr_omni',
      company: { id: project.id, name: project.name },
      prompt: 'Vídeo de divulgação do projeto',
      preset: 'pro_1080p',
      aspectRatio: '9:16'
    });
    assert.equal(job.operationName, 'interactions/omni123');
    assert.equal(created.length, 1);
    assert.equal(created[0].model, 'gemini-omni-1.1-flash');
    assert.equal(created[0].background, true);
    assert.deepEqual(created[0].response_format, { type: 'video', aspect_ratio: '9:16', resolution: '360p' });

    const first = await checkAndCompleteVideoJob('usr_omni', job.id);
    assert.equal(first.status, 'processing');
    let final = await checkAndCompleteVideoJob('usr_omni', job.id);
    if (final.status === 'finalizing') final = await checkAndCompleteVideoJob('usr_omni', job.id);
    assert.equal(final.status, 'completed');
    assert.ok(final.videoUrl);
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('Geração com Gemini Omni: falha do provedor encerra o vídeo sem travar a fila', async () => {
  resetMemoryDb();
  await updateMasterAutomationControl('admin', { globalEnabled: true, pauseAllExternalApis: false });
  setMediaAiClientForTesting({
    interactions: {
      create: async () => ({ id: 'omni_fail', status: 'in_progress' }),
      get: async (id: string) => ({ id, status: 'failed', error: { message: 'blocked by safety filters' } })
    }
  } as any);
  try {
    const project = PORTAL_VIP_PROJECTS[0];
    const job = await startVideoGenerationJob({
      userId: 'usr_omni2',
      company: { id: project.id, name: project.name },
      prompt: 'Vídeo',
      preset: 'pro_1080p',
      aspectRatio: '9:16'
    });
    const done = await checkAndCompleteVideoJob('usr_omni2', job.id);
    assert.ok(['failed', 'failed_permanent', 'retry_scheduled'].includes(done.status), done.status);
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});
