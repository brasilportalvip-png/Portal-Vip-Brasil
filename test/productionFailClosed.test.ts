import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const requiredProductionVariables = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'TOKEN_ENCRYPTION_KEY',
  'CRON_SECRET',
  'GEMINI_API_KEY',
  'GEMINI_MEDIA_API_KEY'
];

function productionEnv() {
  const env = { ...process.env, NODE_ENV: 'production', APP_URL: 'https://portal-vip-brasil.vercel.app' };
  for (const name of requiredProductionVariables) delete env[name];
  return env;
}

test('Produção falha explicitamente quando faltam credenciais críticas', () => {
  const probe = spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--input-type=module',
    '--eval',
    "import('./server/config/index.ts').then(({ assertProductionConfig }) => assertProductionConfig())"
  ], {
    cwd: process.cwd(),
    env: productionEnv(),
    encoding: 'utf8'
  });

  assert.notEqual(probe.status, 0);
  assert.match(`${probe.stderr}\n${probe.stdout}`, /Configuração de produção incompleta/);
});

test('Produção nunca permite fallback silencioso para armazenamento em memória', () => {
  const probe = spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--input-type=module',
    '--eval',
    "import('./server/production/store.ts').then(({ isLocalMemoryStoreAllowed }) => { if (isLocalMemoryStoreAllowed()) process.exit(9) })"
  ], {
    cwd: process.cwd(),
    env: { ...productionEnv(), ALLOW_LOCAL_MEMORY_STORE: 'true' },
    encoding: 'utf8'
  });

  assert.equal(probe.status, 0, `${probe.stderr}\n${probe.stdout}`);
});
