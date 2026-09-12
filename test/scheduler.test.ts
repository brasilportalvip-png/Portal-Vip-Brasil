import test from 'node:test';
import assert from 'node:assert/strict';
import {
  triggerUserAutopilot,
  processScheduledPosts,
  recoverStalePublishingPosts,
  getSchedulerHealth,
  getSchedulerPublicRuntime,
  processSocialTick,
  isAutopilotDue,
  getLocalDateAndHour,
  acquireLock,
  withControlledTimeout,
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


test('Scheduler: telemetria pública registra ciclos sem expor segredo', async () => {
  resetMemoryDb();

  const before = await getSchedulerPublicRuntime();
  assert.equal(before.executionObserved, false);
  assert.equal(before.totalCyclesRecorded, 0);
  assert.equal(before.lastCronStartedAt, null);

  const tick = await processSocialTick();
  assert.equal(tick.skipped, false);

  const runtime = await getSchedulerPublicRuntime();
  assert.equal(runtime.executionObserved, true);
  assert.equal(runtime.totalCyclesRecorded, 1);
  assert.equal(runtime.lastTrigger, 'social_tick');
  assert.equal(runtime.lastCycleStatus, 'ok');
  assert.equal(typeof runtime.lastCycleStartedAt, 'string');
  assert.equal(typeof runtime.lastCycleFinishedAt, 'string');
  assert.equal(runtime.vercelCronCyclesRecorded, 0);
  assert.equal(runtime.lastCronStartedAt, null);

  const serialized = JSON.stringify(runtime).toLowerCase();
  assert.ok(!serialized.includes('cron_secret'));
  assert.ok(!serialized.includes('authorization'));
  assert.ok(!serialized.includes('bearer '));
});

test('Scheduler: telemetria reconhece evidência legada do lock sem inventar sucesso', async () => {
  resetMemoryDb();
  const db = firestore();
  const started = Date.now() - 60_000;
  const released = Date.now() - 30_000;

  await db.collection(COLLECTIONS.schedulerLocks).doc('process').set({
    lockedAt: started,
    lockedUntil: 0,
    releasedAt: released,
    fencingToken: 3
  });

  const runtime = await getSchedulerPublicRuntime();
  assert.equal(runtime.executionObserved, true);
  assert.equal(runtime.totalCyclesRecorded, 0);
  assert.equal(runtime.lastCycleStatus, null);
  assert.equal(runtime.legacyLastLeaseStartedAt, new Date(started).toISOString());
  assert.equal(runtime.legacyLastLeaseReleasedAt, new Date(released).toISOString());
});

test('Scheduler: withControlledTimeout cancela cooperativamente com AbortSignal', async () => {
  let signalReceived = false;
  let abortedObserved = false;
  let sideEffectExecuted = false;

  await assert.rejects(
    () =>
      withControlledTimeout(
        async (signal) => {
          signalReceived = Boolean(signal);
          // Simula espera cooperativa
          for (let i = 0; i < 20; i++) {
            if (signal.aborted) {
              abortedObserved = true;
              return;
            }
            await new Promise((r) => setTimeout(r, 20));
          }
          sideEffectExecuted = true;
        },
        50,
        'tarefa_teste_timeout'
      ),
    /excedeu o limite controlado de 50ms/
  );

  assert.equal(signalReceived, true, 'O AbortSignal deve ter sido repassado para a tarefa');
  assert.equal(abortedObserved, true, 'A tarefa deve ter observado o sinal de aborto');
  assert.equal(sideEffectExecuted, false, 'Efeitos colaterais pós-timeout devem ser bloqueados');
});

test('Scheduler: acquireLock detecta execução abandonada e recupera telemetria como failed', async () => {
  resetMemoryDb();
  const db = firestore();

  // Simula execução anterior que caiu / não fez release e expirou o lock
  const staleStarted = Date.now() - 15 * 60 * 1000;
  const staleLockedUntil = Date.now() - 3 * 60 * 1000;
  await db.collection(COLLECTIONS.schedulerLocks).doc('process').set({
    owner: 'cron-stale-abandoned',
    fencingToken: 5,
    lockedAt: staleStarted,
    lockedUntil: staleLockedUntil,
    releasedAt: null
  });

  await db.collection(COLLECTIONS.systemSettings).doc('schedulerRuntime').set({
    totalCycles: 5,
    lastStartedAt: new Date(staleStarted).toISOString(),
    lastStatus: 'running',
    lastCycleOwner: 'cron-stale-abandoned',
    lastCycleFencingToken: 5,
    staleCyclesRecovered: 0
  });

  // Novo ciclo adquire o lock
  const newLease = await acquireLock('vercel_cron');
  assert.ok(newLease, 'Novo ciclo deve adquirir o lock com sucesso');
  assert.equal(newLease.fencingToken, 6, 'Token de fencing deve ser incrementado');

  // Verifica runtime
  const runtimeSnap = await db.collection(COLLECTIONS.systemSettings).doc('schedulerRuntime').get();
  const runtimeData = runtimeSnap.data() as any;

  assert.equal(runtimeData.staleCyclesRecovered, 1, 'Deve incrementar staleCyclesRecovered');
  assert.equal(runtimeData.previousCycleStatus, 'failed', 'Ciclo abandonado DEVE ser marcado como failed, NUNCA sucesso');
  assert.equal(runtimeData.previousCycleError, 'stale_execution_recovered');
  assert.equal(runtimeData.lastStaleRecoveryOwner, 'cron-stale-abandoned');

  const publicRuntime = await getSchedulerPublicRuntime();
  assert.equal(publicRuntime.staleCyclesRecovered, 1);
  assert.equal(typeof publicRuntime.lastStaleRecoveryAt, 'string');
});
