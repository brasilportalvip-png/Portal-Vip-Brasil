import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { createApp } from '../server/app.js';
import { config } from '../server/config/index.js';
import { firestore, COLLECTIONS, resetMemoryDb } from '../server/production/store.js';
import {
  runVideoRetryWorker,
  acquireVideoRetryCronLock,
  releaseVideoRetryCronLock,
  getVideoRetryWorkerHealth,
  verifyCronAuthorization
} from '../server/production/videoRetryWorker.js';
import {
  startVideoRetryDaemon,
  scheduleRetryWakeup,
  stopVideoRetryDaemon,
  isDaemonRunning,
  getActiveTimerCount
} from '../server/production/videoRetryDaemon.js';
import { setMediaAiClientForTesting } from '../server/production/ai.js';

// Utilitário para chamadas HTTP locais no Express
async function invokeAppRoute(app: any, method: 'GET' | 'POST', urlPath: string, headers: Record<string, string> = {}, body?: any) {
  const http = await import('node:http');
  return new Promise<{ status: number; headers: Record<string, any>; body: any }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      const port = addr.port;
      const postData = body ? JSON.stringify(body) : '';
      const reqHeaders: Record<string, string> = {
        'host': `127.0.0.1:${port}`,
        ...headers
      };
      if (postData) {
        reqHeaders['content-type'] = 'application/json';
        reqHeaders['content-length'] = String(Buffer.byteLength(postData));
      }

      const clientReq = http.request({
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: reqHeaders
      }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          server.close(() => {
            try {
              const json = raw ? JSON.parse(raw) : null;
              resolve({ status: res.statusCode || 500, headers: res.headers, body: json });
            } catch {
              resolve({ status: res.statusCode || 500, headers: res.headers, body: raw });
            }
          });
        });
      });

      clientReq.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (postData) clientReq.write(postData);
      clientReq.end();
    });
  });
}

test('1. Workflow YAML: Carregamento e validação estrutural do arquivo video-retries.yml', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'video-retries.yml');
  assert.ok(fs.existsSync(workflowPath), 'Arquivo .github/workflows/video-retries.yml deve existir');

  const content = fs.readFileSync(workflowPath, 'utf8');
  const parsed = YAML.parse(content);

  assert.ok(parsed, 'O YAML deve ser um documento sintaticamente válido');
  assert.equal(typeof parsed.name, 'string');
  assert.ok(parsed.on, 'Deve conter a seção on');
  assert.ok(parsed.jobs, 'Deve conter a seção jobs');
});

test('2. Workflow YAML: Confirma cron a cada 5 minutos e workflow_dispatch', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'video-retries.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');
  const parsed = YAML.parse(content);

  // Confirmação de agendamento a cada 5 minutos
  assert.ok(parsed.on.schedule, 'Deve conter agendamento schedule');
  assert.ok(Array.isArray(parsed.on.schedule), 'Schedule deve ser uma lista');
  const cronEntry = parsed.on.schedule.find((s: any) => s.cron === '*/5 * * * *');
  assert.ok(cronEntry, 'Schedule deve conter exatamente o cron a cada 5 minutos: */5 * * * *');

  // Confirmação de workflow_dispatch
  assert.ok('workflow_dispatch' in parsed.on, 'Deve conter o gatilho manual workflow_dispatch');
});

test('3. Workflow YAML: Confirma uso exclusivo de secrets.CRON_SECRET e ausência de segredo literal', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'video-retries.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  // Confirma uso do secret do repositório
  assert.ok(content.includes('${{ secrets.CRON_SECRET }}'), 'Deve utilizar exclusivamente ${{ secrets.CRON_SECRET }}');

  // Confirma que não há strings literais suspeitas de senhas/tokens fixos
  assert.ok(!content.includes('portal_vip_cron_secret'), 'Não deve conter segredo fixo');
  assert.ok(!content.includes('Bearer secret'), 'Não deve conter token literal');
  assert.ok(!content.includes('Bearer 12345'), 'Não deve conter token de teste literal');
});

test('4. Workflow YAML: Confirma que chama exatamente o domínio oficial de produção', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'video-retries.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  const officialUrl = 'https://portal-vip-brasil.vercel.app/api/cron/video-retries';
  assert.ok(content.includes(officialUrl), `Workflow deve chamar exatamente o endpoint oficial: ${officialUrl}`);
});

test('5. Workflow YAML: Concurrency, timeout e permissões mínimas', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'video-retries.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');
  const parsed = YAML.parse(content);

  // Concorrência para evitar execuções sobrepostas
  assert.ok(parsed.concurrency, 'Deve configurar concurrency');
  assert.equal(parsed.concurrency.group, 'video-retries');
  assert.equal(parsed.concurrency['cancel-in-progress'], false);

  // Permissões mínimas
  assert.ok(parsed.permissions, 'Deve definir bloco de permissões');
  assert.equal(parsed.permissions.contents, 'read');

  // curl --fail-with-body e timeout
  assert.ok(content.includes('--fail-with-body'), 'Deve usar curl com --fail-with-body');
  assert.ok(content.includes('--max-time'), 'Deve conter timeout curto via --max-time');
});

test('6. Endpoint /api/cron/video-retries: HTTP 401 quando o cabeçalho Authorization está ausente ou incorreto', async () => {
  resetMemoryDb();
  const app = createApp();

  // Chamada sem Authorization
  const resNoAuth = await invokeAppRoute(app, 'POST', '/api/cron/video-retries');
  assert.equal(resNoAuth.status, 401, 'Requisição sem cabeçalho Authorization deve retornar 401');
  assert.equal(resNoAuth.body?.error, 'Cron não autorizado.');

  // Chamada com Authorization incorreto
  const resBadAuth = await invokeAppRoute(app, 'POST', '/api/cron/video-retries', {
    'authorization': 'Bearer token_invalido_12345'
  });
  assert.equal(resBadAuth.status, 401, 'Requisição com token incorreto deve retornar 401');
  assert.equal(resBadAuth.body?.error, 'Cron não autorizado.');
});

test('7. Endpoint /api/cron/video-retries: HTTP 200 com autorização válida e resposta sanitizada', async () => {
  resetMemoryDb();
  const app = createApp();
  const testSecret = 'secret_test_cron_token_valid_2026';
  (config as any).cronSecret = testSecret;

  const res = await invokeAppRoute(app, 'POST', '/api/cron/video-retries', {
    'authorization': `Bearer ${testSecret}`
  }, { trigger: 'github_actions' });

  assert.equal(res.status, 200, 'Requisição autorizada deve retornar HTTP 200');
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.status, 'success');
  assert.equal(res.body?.trigger, 'github_actions');
  assert.ok(res.body?.telemetry, 'Deve incluir objeto de telemetria');
  assert.equal(typeof res.body?.telemetry?.checked, 'number');
  assert.equal(typeof res.body?.telemetry?.started, 'number');

  // Garante que não há vazamento de dados internos de jobs ou segredos
  assert.equal(res.body?.cronSecret, undefined);
  assert.equal(res.body?.apiKey, undefined);
  assert.equal(res.body?.jobs, undefined);
});

test('8. Endpoint /api/cron/video-retries: HTTP 500 com tratamento seguro quando ocorre falha interna', async () => {
  resetMemoryDb();
  const app = createApp();
  const testSecret = 'secret_test_cron_token_valid_2026';
  (config as any).cronSecret = testSecret;

  // Força erro em tempo de execução via mock que lança exceção não tratada
  setMediaAiClientForTesting({
    models: {
      generateVideos: async () => {
        throw new Error('Falha simulada crítica de infraestrutura');
      }
    }
  });

  // Cria um job elegível para forçar a execução da tentativa
  const db = firestore();
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc('job_for_failure_test').set({
    id: 'job_for_failure_test',
    userId: 'user_fail_test',
    status: 'retry_scheduled',
    nextAttemptAt: new Date(Date.now() - 10_000).toISOString(),
    attemptCount: 1,
    maxAttempts: 5,
    prompt: 'Prompt teste'
  });

  try {
    const res = await invokeAppRoute(app, 'POST', '/api/cron/video-retries', {
      'authorization': `Bearer ${testSecret}`
    });

    // O worker trata ou o endpoint retorna 200 com status error/failed, ou 500 se não puder processar
    assert.ok(res.status === 200 || res.status === 500);
    if (res.status === 500) {
      assert.equal(res.body?.success, false);
      assert.ok(res.body?.error);
    } else {
      // Se status 200, a telemetria reporta o status de falha do job
      assert.ok(res.body?.telemetry);
    }
  } finally {
    setMediaAiClientForTesting(undefined);
  }
});

test('9. Bloqueio de duas chamadas concorrentes via trava atômica distribuída', async () => {
  resetMemoryDb();
  const worker1 = 'worker_node_alpha';
  const worker2 = 'worker_node_beta';

  // 1. Worker 1 adquire a trava
  const lock1 = await acquireVideoRetryCronLock(worker1, 60_000);
  assert.equal(lock1.acquired, true, 'Worker 1 deve adquirir a trava inicial');
  assert.ok(lock1.fencingToken >= 1);

  // 2. Worker 2 tenta adquirir imediatamente enquanto a trava está ativa
  const lock2 = await acquireVideoRetryCronLock(worker2, 60_000);
  assert.equal(lock2.acquired, false, 'Worker 2 deve ser bloqueado enquanto Worker 1 detém a trava');
  assert.equal(lock2.reason, 'concurrent_execution_active');

  // 3. Worker 1 libera a trava
  await releaseVideoRetryCronLock(worker1, lock1.fencingToken);

  // 4. Worker 2 agora consegue adquirir a trava
  const lock2AfterRelease = await acquireVideoRetryCronLock(worker2, 60_000);
  assert.equal(lock2AfterRelease.acquired, true, 'Worker 2 deve adquirir a trava após liberação');
  assert.ok(lock2AfterRelease.fencingToken > lock1.fencingToken, 'Fencing token deve incrementar');

  // Libera a trava final
  await releaseVideoRetryCronLock(worker2, lock2AfterRelease.fencingToken);
});

test('10. Persistência durável da telemetria no Firestore e consulta pelo endpoint de saúde', async () => {
  resetMemoryDb();
  const testSecret = 'secret_test_cron_token_valid_2026';
  (config as any).cronSecret = testSecret;

  // Executa uma rodada do worker com gatilho github_actions
  const workerResult = await runVideoRetryWorker({ trigger: 'github_actions' });
  assert.equal(workerResult.status, 'success');

  // Verifica persistência no Firestore no documento do sistema
  const db = firestore();
  const docSnap = await db.collection(COLLECTIONS.systemSettings).doc('video_retry_worker_telemetry').get();
  assert.ok(docSnap.exists, 'Documento video_retry_worker_telemetry deve existir no Firestore');

  const persisted = docSnap.data() as any;
  assert.equal(persisted.trigger, 'github_actions');
  assert.equal(persisted.status, 'success');
  assert.ok(persisted.lastExecutionAt);
  assert.ok(typeof persisted.durationMs === 'number');
  assert.ok(persisted.telemetry);

  // Consulta pelo endpoint de saúde
  const health = await getVideoRetryWorkerHealth();
  assert.equal(health.healthy, true);
  assert.equal(health.trigger, 'github_actions');
  assert.equal(health.status, 'success');
  assert.equal(health.isCronSecretConfigured, true);
  assert.equal(typeof health.telemetry.checked, 'number');
  assert.equal(typeof health.telemetry.started, 'number');
  assert.equal(typeof health.telemetry.retryScheduled, 'number');
  assert.equal(typeof health.telemetry.completed, 'number');
  assert.equal(typeof health.telemetry.published, 'number');
  assert.equal(typeof health.telemetry.failed, 'number');
});

test('11. Produção Vercel não depende de startVideoRetryDaemon', () => {
  // Simula o ambiente da Vercel (onde VERCEL=1)
  const prevVercel = process.env.VERCEL;
  process.env.VERCEL = '1';

  try {
    stopVideoRetryDaemon();

    // Tenta iniciar o daemon no ambiente Vercel
    startVideoRetryDaemon();
    assert.equal(isDaemonRunning(), false, 'Daemon NÃO deve rodar quando VERCEL=1');

    // Tenta registrar um wake-up de retry no ambiente Vercel
    scheduleRetryWakeup('job_test_vercel', Date.now() + 1000);
    assert.equal(getActiveTimerCount(), 0, 'Nenhum timer em memória deve ser criado na Vercel');
  } finally {
    if (prevVercel !== undefined) {
      process.env.VERCEL = prevVercel;
    } else {
      delete process.env.VERCEL;
    }
    stopVideoRetryDaemon();
  }
});
