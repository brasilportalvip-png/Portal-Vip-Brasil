import test from 'node:test';
import assert from 'node:assert/strict';
import {
  triggerUserAutopilot,
  processScheduledPosts,
  recoverStalePublishingPosts,
  getSchedulerHealth,
  isAutopilotDue,
  getLocalDateAndHour,
  type AutopilotScheduleConfig
} from '../server/production/scheduler.js';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

test('Scheduler: Autopilot aceita somente projeto oficial', async () => {
  resetMemoryDb();
  await assert.rejects(() => triggerUserAutopilot('usr_test', 'comp_legada_invalida'), /Projeto oficial não encontrado/);
});

test('Scheduler: isAutopilotDue respeita 10h America\/Sao_Paulo e bloqueia repetição do slot', () => {
  const cfg: AutopilotScheduleConfig = {
    enabled: true,
    timezone: 'America/Sao_Paulo',
    frequency: 'daily',
    preferredDays: [1,2,3,4,5],
    preferredHours: [10,15]
  };
  const monday1007SP = new Date('2026-08-17T13:07:00.000Z');
  assert.equal(isAutopilotDue(cfg, monday1007SP), true);
  const local = getLocalDateAndHour(monday1007SP, 'America/Sao_Paulo');
  assert.equal(local.hour, 10);
  assert.equal(isAutopilotDue({ ...cfg, lastRunSlot: `${local.dateStr}_h${local.hour}`, lastRunAt: monday1007SP.toISOString() }, new Date('2026-08-17T13:45:00.000Z')), false);
});

test('Scheduler: conteúdo de outro usuário falha antes de publicar', async () => {
  resetMemoryDb();
  const db = firestore();
  const projectId = PORTAL_VIP_PROJECTS[0].id;
  const owner = 'usr_owner_private';
  const other = 'usr_other_private';
  await db.collection(COLLECTIONS.users).doc(owner).set({ id: owner, email: 'owner@example.com', role: 'admin' });
  await db.collection(COLLECTIONS.contentItems).doc('content_cross').set({
    id: 'content_cross', userId: other, companyId: projectId, headline: 'Outro usuário', body: 'Teste', status: 'saved'
  });
  await db.collection(COLLECTIONS.scheduledPosts).doc('sched_cross').set({
    id: 'sched_cross', userId: owner, companyId: projectId, contentItemId: 'content_cross',
    platforms: ['Facebook'], scheduledFor: new Date(Date.now() - 1000).toISOString(), status: 'scheduled'
  });
  await processScheduledPosts();
  const result = (await db.collection(COLLECTIONS.scheduledPosts).doc('sched_cross').get()).data();
  assert.equal(result?.status, 'failed');
  assert.match(String(result?.errorMessage || ''), /Conteúdo não pertence/);
});

test('Scheduler: agendamento futuro permanece intacto', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.scheduledPosts).doc('future').set({
    id: 'future', userId: 'u', companyId: PORTAL_VIP_PROJECTS[0].id, contentItemId: 'c',
    platforms: ['Facebook'], scheduledFor: new Date(Date.now() + 3600000).toISOString(), status: 'scheduled'
  });
  const processed = await processScheduledPosts();
  assert.equal(processed, 0);
  assert.equal((await db.collection(COLLECTIONS.scheduledPosts).doc('future').get()).data()?.status, 'scheduled');
});

test('Scheduler: recovery exige revisão quando resultado externo é incerto', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.scheduledPosts).doc('stale').set({
    id: 'stale', userId: 'u', companyId: PORTAL_VIP_PROJECTS[0].id,
    status: 'publishing', processingAt: new Date(Date.now() - 20*60*1000).toISOString(), platforms: ['Facebook']
  });
  assert.equal(await recoverStalePublishingPosts(), 1);
  assert.equal((await db.collection(COLLECTIONS.scheduledPosts).doc('stale').get()).data()?.status, 'requires_review');
});

test('Scheduler: health expõe filas e cron secret sem dados falsos', async () => {
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.scheduledPosts).doc('due').set({ status: 'scheduled', scheduledFor: new Date(Date.now()-1000).toISOString() });
  const health = await getSchedulerHealth();
  assert.equal(health.status, 'ok');
  assert.equal(health.queueStats?.scheduledPending, 1);
  assert.equal(typeof health.cronSecretConfigured, 'boolean');
});
