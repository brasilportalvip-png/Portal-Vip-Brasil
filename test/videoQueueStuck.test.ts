import test from 'node:test';
import assert from 'node:assert/strict';
import { firestore, COLLECTIONS, resetMemoryDb } from '../server/production/store.js';
import {
  processPendingVideoJobs,
  setMediaAiClientForTesting,
  isVideoProcessingExpired,
  VIDEO_PROCESSING_EXPIRED_CODE,
  VIDEO_PROCESSING_MAX_AGE_MS
} from '../server/production/ai.js';

function job(id: string, ageMs: number) {
  const at = new Date(Date.now() - ageMs).toISOString();
  return {
    id,
    userId: 'owner',
    companyId: `proj_${id}`,
    reservationId: `res_${id}`,
    status: 'processing',
    operationName: `operations/${id}`,
    preset: 'pro_1080p',
    createdAt: at,
    providerStartedAt: at,
    updatedAt: at
  };
}

test('isVideoProcessingExpired: só encerra depois de 6 horas', () => {
  const now = Date.now();
  assert.equal(isVideoProcessingExpired({ createdAt: new Date(now - 60_000).toISOString() }, now), false);
  assert.equal(isVideoProcessingExpired({ createdAt: new Date(now - VIDEO_PROCESSING_MAX_AGE_MS - 1).toISOString() }, now), true);
  assert.equal(isVideoProcessingExpired({ createdAt: '' }, now), false);
});

test('Fila de vídeos: vídeos antigos presos não bloqueiam os de hoje e são encerrados sem nova cobrança', async () => {
  resetMemoryDb();
  const db = firestore();
  // 6 vídeos antigos (ids menores, como os de dias anteriores) + 4 de hoje.
  for (let i = 0; i < 6; i++) await db.collection(COLLECTIONS.mediaGenerationJobs).doc(`a_old_${i}`).set(job(`a_old_${i}`, 15 * 24 * 3600_000));
  for (let i = 0; i < 4; i++) await db.collection(COLLECTIONS.mediaGenerationJobs).doc(`z_new_${i}`).set(job(`z_new_${i}`, 5 * 60_000));

  const polled: string[] = [];
  setMediaAiClientForTesting({
    operations: {
      getVideosOperation: async ({ operation }: any) => {
        polled.push(String(operation.name));
        // Provedor nunca conclui: simula operação perdida/expirada.
        return { done: false };
      }
    }
  });
  try {
    await processPendingVideoJobs({ trigger: 'test' });
    await processPendingVideoJobs({ trigger: 'test' });
  } finally {
    setMediaAiClientForTesting(undefined);
  }

  const all = (await db.collection(COLLECTIONS.mediaGenerationJobs).get()).docs.map((d: any) => d.data());
  const old = all.filter((j: any) => j.id.startsWith('a_old_'));
  const fresh = all.filter((j: any) => j.id.startsWith('z_new_'));

  assert.ok(old.every((j: any) => j.status === 'failed' && j.errorCode === VIDEO_PROCESSING_EXPIRED_CODE), 'vídeos antigos presos devem ser encerrados');
  assert.ok(old.every((j: any) => !/internal server|temporar|try again|timeout|indispon/i.test(j.errorMessage)), 'mensagem não pode disparar nova geração paga');
  assert.ok(fresh.every((j: any) => j.status === 'processing'), 'vídeos de hoje continuam aguardando o provedor');
  for (let i = 0; i < 4; i++) assert.ok(polled.includes(`operations/z_new_${i}`), `vídeo de hoje z_new_${i} precisa ser consultado`);
});
