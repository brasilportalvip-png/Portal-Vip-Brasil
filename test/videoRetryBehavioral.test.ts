import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import {
  acquireVideoOperationLease,
  startOrRetryVideoOperation,
  manualRetryVideoJob,
  checkAndCompleteVideoJob,
  processPendingVideoJobs,
  setMediaAiClientForTesting,
  clearManualRetryStateForTesting,
  setOnRetryScheduledCallback,
  VideoJobData
} from '../server/production/ai.js';
import {
  scheduleRetryWakeup,
  stopVideoRetryDaemon,
  getActiveTimerCount
} from '../server/production/videoRetryDaemon.js';

// Utilitário para criar jobs no Firestore com defaults controlados
async function createTestVideoJob(overrides: Partial<VideoJobData> = {}): Promise<VideoJobData> {
  const db = firestore();
  const id = overrides.id || `job_${Math.random().toString(36).slice(2, 10)}`;
  const job: VideoJobData = {
    id,
    userId: 'test_user_alpha',
    companyId: 'default',
    title: 'Vídeo Institucional Teste',
    prompt: 'Vídeo institucional cinematográfico 4k',
    finalPrompt: 'Vídeo institucional cinematográfico 4k expandido',
    aspectRatio: '9:16',
    durationSeconds: 5,
    resolution: '1080p',
    preset: 'pro_1080p',
    status: 'retry_scheduled',
    pipelineState: 'provider_starting',
    attemptCount: 1,
    maxAttempts: 5,
    nextAttemptAt: new Date(Date.now() - 5000).toISOString(),
    leaseOwner: null,
    leaseUntil: null,
    leaseFence: 0,
    reservationId: `res_${id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc(id).set(job);
  return job;
}

test('1. Concorrência: Duas chamadas concorrentes tentando adquirir o mesmo job - apenas uma obtém o lease', async () => {
  resetMemoryDb();
  const job = await createTestVideoJob({ id: 'job_concurrent_lease' });

  // Executa duas aquisições estritamente concorrentes no Firestore
  const [acqA, acqB] = await Promise.all([
    acquireVideoOperationLease(job.id, { workerId: 'worker_alpha' }),
    acquireVideoOperationLease(job.id, { workerId: 'worker_beta' })
  ]);

  const acquiredCount = (acqA.acquired ? 1 : 0) + (acqB.acquired ? 1 : 0);
  assert.equal(acquiredCount, 1, 'Exatamente uma chamada concorrente deve adquirir o lease');

  const winner = acqA.acquired ? acqA : acqB;
  const loser = acqA.acquired ? acqB : acqA;

  assert.equal(winner.acquired, true);
  assert.equal(typeof winner.leaseFence, 'number');
  assert.ok(winner.leaseFence! >= 1);
  assert.equal(loser.acquired, false);
  assert.equal(loser.reason, 'lease_active');
});

test('2. Idempotência: Confirmação de apenas uma chamada ao generateVideos sob concorrência', async () => {
  resetMemoryDb();
  const job = await createTestVideoJob({ id: 'job_single_generate' });

  let generateCallCount = 0;
  const mockMediaClient = {
    models: {
      generateVideos: async () => {
        generateCallCount++;
        // Simula pequena latência da API Veo
        await new Promise((r) => setTimeout(r, 25));
        return { name: `operations/veo_op_${job.id}` };
      }
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    // Dispara dois workers simultâneos tentando processar o mesmo job
    const [res1, res2] = await Promise.all([
      startOrRetryVideoOperation(job.id, { workerId: 'worker_1' }),
      startOrRetryVideoOperation(job.id, { workerId: 'worker_2' })
    ]);

    assert.equal(generateCallCount, 1, 'A API generateVideos do Veo deve ser invocada exatamente UMA vez');
    // Ambos retornam um job válido sem lançar exceção não tratada
    assert.ok(res1 && res2);
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('3. Lease vigente bloqueando cron e ação manual', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const activeLeaseUntil = new Date(Date.now() + 60_000).toISOString();
  const job = await createTestVideoJob({
    id: 'job_active_lease_lock',
    leaseOwner: 'another_running_worker',
    leaseUntil: activeLeaseUntil,
    leaseFence: 3
  });

  // Ação manual deve ser rejeitada com 409
  await assert.rejects(
    () => manualRetryVideoJob(job.userId, job.id),
    (err: any) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /já está em andamento sob lease ativo/);
      return true;
    }
  );

  // O cron (processPendingVideoJobs) deve ignorar o job com lease ativo
  const telemetry = await processPendingVideoJobs();
  assert.equal(telemetry.started, 0, 'Worker cron não deve iniciar job sob lease ativo');
});

test('4. Lease expirado sendo recuperado com segurança por novo worker', async () => {
  resetMemoryDb();
  const expiredLeaseUntil = new Date(Date.now() - 30_000).toISOString();
  const job = await createTestVideoJob({
    id: 'job_expired_lease',
    leaseOwner: 'crashed_worker',
    leaseUntil: expiredLeaseUntil,
    leaseFence: 2,
    attemptCount: 2
  });

  // Novo worker adquire o lease com sucesso
  const acq = await acquireVideoOperationLease(job.id, { workerId: 'recovery_worker' });
  assert.equal(acq.acquired, true);
  assert.equal(acq.leaseOwner, 'recovery_worker');
  assert.equal(acq.leaseFence, 3, 'Fencing token deve incrementar monotonicamente');
  assert.equal(acq.attemptCount, 3, 'Contador de tentativas deve incrementar');
});

test('5. maxAttempts nunca ultrapassado, inclusive manualmente', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const job = await createTestVideoJob({
    id: 'job_max_attempts',
    attemptCount: 5,
    maxAttempts: 5,
    status: 'retry_scheduled'
  });

  // Tentativa manual deve ser bloqueada com 409
  await assert.rejects(
    () => manualRetryVideoJob(job.userId, job.id),
    (err: any) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Limite máximo de tentativas \(5\) já atingido/);
      return true;
    }
  );

  // Tentativa via aquisição de lease também deve ser recusada e marcar failed_permanent
  const acq = await acquireVideoOperationLease(job.id, { workerId: 'any_worker' });
  assert.equal(acq.acquired, false);
  assert.equal(acq.reason, 'max_attempts_exceeded');

  const db = firestore();
  const snap = await db.collection(COLLECTIONS.mediaGenerationJobs).doc(job.id).get();
  assert.equal(snap.data()?.status, 'failed_permanent');
});

test('6. Cooldown e rate limit do botão manual', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const job = await createTestVideoJob({ id: 'job_rate_limit_manual' });

  // 1º clique manual: mock Veo responde com sucesso
  const mockMediaClient = {
    models: {
      generateVideos: async () => ({ name: 'operations/veo_op_manual_1' })
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    const res1 = await manualRetryVideoJob(job.userId, job.id);
    assert.equal(res1.status, 'processing');

    // 2º clique manual imediato: bloqueado por cooldown (429)
    await assert.rejects(
      () => manualRetryVideoJob(job.userId, job.id),
      (err: any) => {
        assert.equal(err.statusCode, 429);
        assert.match(err.message, /Cooldown ativo/);
        return true;
      }
    );
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('7. Retry antes de nextAttemptAt sendo recusado (respeito ao backoff)', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const futureNextAttempt = new Date(Date.now() + 45_000).toISOString();
  const job = await createTestVideoJob({
    id: 'job_backoff_future',
    status: 'retry_scheduled',
    nextAttemptAt: futureNextAttempt
  });

  // Ação manual recusa respeitando o backoff da IA
  await assert.rejects(
    () => manualRetryVideoJob(job.userId, job.id),
    (err: any) => {
      assert.equal(err.statusCode, 429);
      assert.match(err.message, /Aguarde o período de cooldown da IA/);
      return true;
    }
  );

  // Tentativa de aquisição de lease recusa
  const acq = await acquireVideoOperationLease(job.id);
  assert.equal(acq.acquired, false);
  assert.equal(acq.reason, 'backoff_not_elapsed');
});

test('8. Retry elegível sendo executado com sucesso', async () => {
  resetMemoryDb();
  const pastNextAttempt = new Date(Date.now() - 10_000).toISOString();
  const job = await createTestVideoJob({
    id: 'job_eligible_retry',
    status: 'retry_scheduled',
    nextAttemptAt: pastNextAttempt
  });

  const mockMediaClient = {
    models: {
      generateVideos: async () => ({ name: 'operations/veo_op_eligible' })
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    const updated = await startOrRetryVideoOperation(job.id);
    assert.equal(updated.status, 'processing');
    assert.equal(updated.operationName, 'operations/veo_op_eligible');
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('9. Erro 429 da API Veo persiste retry_scheduled com diagnóstico correto e backoff', async () => {
  resetMemoryDb();
  const job = await createTestVideoJob({
    id: 'job_err_429',
    attemptCount: 1,
    maxAttempts: 5
  });

  const mockMediaClient = {
    models: {
      generateVideos: async () => {
        const err: any = new Error('Resource has been exhausted (rate limit). Please retry in 20s.');
        err.status = 429;
        throw err;
      }
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    const updated = await startOrRetryVideoOperation(job.id);
    assert.equal(updated.status, 'retry_scheduled');
    assert.equal(updated.attemptCount, 2);
    assert.equal(updated.lastErrorCategory, 'rate_limit_temporary');
    assert.ok(updated.nextAttemptAt);
    assert.ok(new Date(updated.nextAttemptAt).getTime() > Date.now());
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('10. Background worker encontra e processa job com retry devido', async () => {
  resetMemoryDb();
  const job = await createTestVideoJob({
    id: 'job_worker_sweep',
    status: 'retry_scheduled',
    nextAttemptAt: new Date(Date.now() - 5000).toISOString()
  });

  const mockMediaClient = {
    models: {
      generateVideos: async () => ({ name: 'operations/veo_op_worker_sweep' })
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    const telemetry = await processPendingVideoJobs();
    assert.equal(telemetry.checked >= 1, true);
    assert.equal(telemetry.started, 1);

    const db = firestore();
    const fresh = (await db.collection(COLLECTIONS.mediaGenerationJobs).doc(job.id).get()).data();
    assert.equal(fresh?.status, 'processing');
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('11. Telemetria do worker: status processing conta como started, NÃO como completed', async () => {
  resetMemoryDb();
  await createTestVideoJob({
    id: 'job_telemetry_check',
    status: 'retry_scheduled',
    nextAttemptAt: new Date(Date.now() - 5000).toISOString()
  });

  const mockMediaClient = {
    models: {
      generateVideos: async () => ({ name: 'operations/veo_op_telemetry' })
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    const telemetry = await processPendingVideoJobs();
    // Somente iniciado, nunca completed!
    assert.equal(telemetry.started, 1, 'Job em processing deve incrementar started');
    assert.equal(telemetry.completed, 0, 'Job em processing NÃO deve ser contado como completed');
    assert.equal(telemetry.published, 0, 'Job em processing NÃO deve ser contado como published');
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('12. Idempotência estrita entre cron e botão manual', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const job = await createTestVideoJob({
    id: 'job_cron_manual_idempotency',
    status: 'retry_scheduled',
    nextAttemptAt: new Date(Date.now() - 5000).toISOString()
  });

  let generateCount = 0;
  const mockMediaClient = {
    models: {
      generateVideos: async () => {
        generateCount++;
        await new Promise((r) => setTimeout(r, 40));
        return { name: 'operations/veo_op_shared' };
      }
    }
  };
  setMediaAiClientForTesting(mockMediaClient);

  try {
    // Dispara cron e clique manual simultaneamente
    const [telemetryResult, manualResult] = await Promise.allSettled([
      processPendingVideoJobs(),
      manualRetryVideoJob(job.userId, job.id)
    ]);

    // Exatamente uma das duas ações obtém o lease e aciona generateVideos
    assert.equal(generateCount, 1, 'Exatamente uma chamada deve atingir o modelo Veo');

    // Nenhuma corrupção de estado
    const db = firestore();
    const finalJob = (await db.collection(COLLECTIONS.mediaGenerationJobs).doc(job.id).get()).data();
    assert.equal(finalJob?.status, 'processing');
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('13. Ausência de duplicação de vídeo e agendamento na finalização', async () => {
  resetMemoryDb();
  const db = firestore();
  const jobId = 'job_no_duplication';
  const contentItemId = 'content_item_deterministic_1';

  // Seed de job em finalizing
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId).set({
    id: jobId,
    userId: 'user_dup_test',
    companyId: 'default',
    title: 'Vídeo Sem Duplicação',
    status: 'completed',
    contentItemId,
    videoUrl: 'https://example.com/video.mp4',
    createdAt: new Date().toISOString()
  });

  // Salva o post agendado inicial
  const scheduleId = `sched-video-${jobId}`;
  await db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId).set({
    id: scheduleId,
    userId: 'user_dup_test',
    contentItemId,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  });

  // Checagem repetida não duplica nem sobrescreve
  const result = await checkAndCompleteVideoJob('user_dup_test', jobId);
  assert.equal(result.status, 'completed');

  const allPosts = await db.collection(COLLECTIONS.scheduledPosts).where('contentItemId', '==', contentItemId).get();
  assert.equal(allPosts.docs.length, 1, 'Deve existir exatamente um post agendado vinculado ao conteúdo');
});

test('14. Isolamento multi-tenant estrito entre usuários', async () => {
  resetMemoryDb();
  clearManualRetryStateForTesting();
  const job = await createTestVideoJob({
    id: 'job_user_isolation',
    userId: 'legitimate_owner_123'
  });

  // Invasor tentando retentar job alheio
  await assert.rejects(
    () => manualRetryVideoJob('malicious_user_456', job.id),
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Acesso não autorizado/);
      return true;
    }
  );
});

test('15. Gatilho automático de retry ocorrendo no mesmo dia via daemon', async () => {
  resetMemoryDb();
  stopVideoRetryDaemon();

  const jobId = 'job_same_day_trigger';
  let callbackFired = false;

  // Registra callback de retry wake-up com timer curto
  scheduleRetryWakeup(jobId, Date.now() + 60);
  assert.equal(getActiveTimerCount() >= 1, true, 'Daemon deve registrar timer ativo em memória para o job');

  // Aguarda o disparo do timer no mesmo dia
  await new Promise((r) => setTimeout(r, 120));

  // Timer foi executado e desregistrado
  assert.equal(getActiveTimerCount(), 0, 'Timer do daemon deve ser limpo após execução');
  stopVideoRetryDaemon();
});
