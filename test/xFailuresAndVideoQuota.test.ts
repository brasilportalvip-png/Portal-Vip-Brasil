import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb } from '../server/production/store.js';
import { effectiveScheduledStatus, withEffectiveStatus } from '../server/production/scheduledStatus.js';
import { reserveAutomatedVideoSlot } from '../server/production/videoQuota.js';
import { updateMasterAutomationControl } from '../server/production/automationGate.js';

test('Post antigo com X falhando ("credits depleted") e Facebook/Instagram publicados conta como publicado', () => {
  const post = {
    id: 'p1', status: 'requires_review', errorMessage: 'credits depleted',
    publicationResults: [
      { provider: 'x', success: false, error: 'credits depleted' },
      { provider: 'facebook', success: true, externalId: '1034_122' },
      { provider: 'instagram', success: true, externalId: '1818' }
    ]
  };
  const eff = effectiveScheduledStatus(post);
  assert.equal(eff.status, 'published');
  assert.match(String(eff.note), /facebook, instagram/);
  const shown: any = withEffectiveStatus(post);
  assert.equal(shown.status, 'published');
  assert.equal(shown.originalStatus, 'requires_review');
  assert.equal(shown.errorMessage, null);
  // Falha de rede ATIVA continua falha.
  assert.equal(effectiveScheduledStatus({ status: 'failed', publicationResults: [{ provider: 'x', success: false }, { provider: 'instagram', success: false, error: 'token' }, { provider: 'facebook', success: true, externalId: '1' }] }).status, 'failed');
  // Só X, sem nenhuma rede publicada: continua falha.
  assert.equal(effectiveScheduledStatus({ status: 'failed', publicationResults: [{ provider: 'x', success: false }] }).status, 'failed');
  assert.equal(effectiveScheduledStatus({ status: 'published' }).status, 'published');
});

test('Limite diário de vídeos da Automação é respeitado (antes saíam 11 vídeos com limite 1)', async () => {
  resetMemoryDb();
  await updateMasterAutomationControl('admin', { globalEnabled: true, pauseAllExternalApis: false, maxDailyVideos: 2 } as any);
  const now = Date.parse('2026-11-18T13:00:00Z');
  const r = [];
  for (let i = 0; i < 4; i++) r.push(await reserveAutomatedVideoSlot({ projectId: `p${i}`, nowMs: now }));
  assert.deepEqual(r.map((x) => x.allowed), [true, true, false, false]);
  assert.equal(r[3].limit, 2);
  // Dia seguinte (Brasília) a cota zera.
  assert.equal((await reserveAutomatedVideoSlot({ nowMs: Date.parse('2026-11-19T03:30:00Z') })).allowed, true);
  // 23h30 de Brasília ainda é o mesmo dia (cota cheia).
  assert.equal((await reserveAutomatedVideoSlot({ nowMs: Date.parse('2026-11-19T02:30:00Z') })).allowed, false);
  await updateMasterAutomationControl('admin', { maxDailyVideos: 0 } as any);
  assert.equal((await reserveAutomatedVideoSlot({ nowMs: Date.parse('2026-11-20T13:00:00Z') })).allowed, false, 'limite 0 = nenhum vídeo automático');
});
