import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb, getMemoryCollection } from '../server/production/store.js';
import * as firebaseAdminProvider from '../server/providers/firebaseAdmin.js';
import {
  isValidMp4Buffer,
  setMediaAiClientForTesting,
  startVideoGenerationJob,
  checkAndCompleteVideoJob
} from '../server/production/ai.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

const validMp4 = Buffer.from([
  0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x6d,0x70,0x34,0x32,0x00,0x00,0x00,0x00,
  0x6d,0x70,0x34,0x32,0x69,0x73,0x6f,0x6d,0x00,0x00,0x00,0x08,0x6d,0x6f,0x6f,0x76
]);

test('Media: valida container MP4 e rejeita HTML/JSON', () => {
  assert.equal(isValidMp4Buffer(validMp4), true);
  assert.equal(isValidMp4Buffer(Buffer.from('<!doctype html><html>erro</html>')), false);
  assert.equal(isValidMp4Buffer(Buffer.from('{"error":"provider"}')), false);
});

test('Media: vídeo privado usa zero créditos, finaliza uma vez e isola usuário', async () => {
  resetMemoryDb();
  const saved = new Map<string, Buffer>();
  firebaseAdminProvider.setAdminStorageForTesting({
    bucket: () => ({
      name: 'portal-vip-test.appspot.com',
      file: (path: string) => ({
        save: async (buffer: Buffer) => { saved.set(path, buffer); },
        delete: async () => { saved.delete(path); }
      })
    })
  } as any);

  setMediaAiClientForTesting({
    models: { generateVideos: async () => ({ name: 'operations/private-video-1' }) },
    operations: {
      getVideosOperation: async () => ({
        done: true,
        response: { generatedVideos: [{ video: { videoBytes: validMp4.toString('base64'), mimeType: 'video/mp4' } }] }
      })
    }
  } as any);

  const userId = 'usr_media_private';
  const project = PORTAL_VIP_PROJECTS[0];
  const job = await startVideoGenerationJob({
    userId,
    company: { id: project.id, name: project.name },
    prompt: 'Vídeo institucional do projeto',
    preset: 'pro_1080p',
    aspectRatio: '9:16'
  });

  assert.equal(job.creditsReserved, 0);
  assert.match(job.reservationId, /^private_/);
  await assert.rejects(() => checkAndCompleteVideoJob('outro_usuario', job.id), /não autorizado/i);

  const [a,b] = await Promise.all([
    checkAndCompleteVideoJob(userId, job.id),
    checkAndCompleteVideoJob(userId, job.id)
  ]);
  assert.ok(['completed','finalizing'].includes(a.status));
  assert.ok(['completed','finalizing'].includes(b.status));

  const final = await checkAndCompleteVideoJob(userId, job.id);
  assert.equal(final.status, 'completed');
  assert.equal(final.creditsCommitted, 0);
  assert.ok(final.videoUrl);
  assert.ok(saved.size >= 1);

  const content = getMemoryCollection('contentItems').get(final.contentItemId);
  assert.ok(content);
  assert.equal(content.type, 'video');
  assert.equal(Number(content.creditsUsed || 0), 0, 'Compatibilidade pode manter o campo, mas nunca pode haver cobrança.');

  setMediaAiClientForTesting(undefined);
});

test('Media: falha do Firebase Storage não cria vídeo concluído nem agendamento com URL local', async () => {
  resetMemoryDb();
  firebaseAdminProvider.setAdminStorageForTesting(null);
  setMediaAiClientForTesting({
    models: { generateVideos: async () => ({ name: 'operations/storage-failure-video' }) },
    operations: {
      getVideosOperation: async () => ({
        done: true,
        response: { generatedVideos: [{ video: { videoBytes: validMp4.toString('base64'), mimeType: 'video/mp4' } }] }
      })
    }
  } as any);

  const project = PORTAL_VIP_PROJECTS[0];
  const job = await startVideoGenerationJob({
    userId: 'usr_storage_failure',
    company: { id: project.id, name: project.name },
    prompt: 'Vídeo que não pode virar fallback local',
    preset: 'pro_1080p',
    aspectRatio: '9:16',
    autoPublishPlatforms: ['youtube'],
    autoPublishProviderOptions: { youtubePrivacyStatus: 'unlisted' }
  });

  const result = await checkAndCompleteVideoJob(job.userId, job.id);
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, 'VIDEO_STORAGE_PERSISTENCE_FAILED');
  assert.equal(Boolean(result.videoUrl), false);
  assert.equal(getMemoryCollection('scheduledPosts').size, 0);
  const failedContent = getMemoryCollection('contentItems').get(result.contentItemId);
  assert.equal(failedContent?.status, 'failed');
  assert.equal(Boolean(failedContent?.videoUrl), false);

  setMediaAiClientForTesting(undefined);
  firebaseAdminProvider.setAdminStorageForTesting(undefined);
});
