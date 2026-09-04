import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('Governança final: identidade central e documentação não regressam para o produto legado', () => {
  const capacitor = source('capacitor.config.ts');
  assert.match(capacitor, /appId:\s*'com\.portalvipbrasil\.app'/);
  assert.match(capacitor, /appName:\s*'Portal Vip Brasil'/);

  const readme = source('README.md');
  assert.match(readme, /Node\.js 22/);
  assert.match(readme, /npm 10/);
  assert.ok(!readme.includes('Node.js 18+'));
  assert.ok(!readme.includes('VITE_APP_URL'));

  const setup = source('docs/PRODUCTION_SETUP.md');
  assert.match(setup, /0 13 \* \* \*/);
  assert.match(setup, /America\/Sao_Paulo/);
  assert.ok(!setup.includes('MERCADO_PAGO_'));
  assert.ok(!setup.includes('video.publish'));

  const e2e = source('docs/PRODUCTION_E2E_CHECKLIST.md');
  assert.ok(!e2e.includes('Criar minha conta'));
  assert.ok(!e2e.includes('plan_free'));
  assert.ok(!e2e.includes('creditTransactions'));
  assert.ok(!e2e.includes('Mercado Pago'));
});

test('Governança final: CI usa runtime de Actions atualizado e bloqueia vulnerabilidade moderada+ em dependências de produção', () => {
  const ci = source('.github/workflows/ci.yml');
  assert.match(ci, /actions\/checkout@v5/);
  assert.match(ci, /actions\/setup-node@v5/);
  assert.match(ci, /npm audit --omit=dev --audit-level=moderate/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /Production Smoke After Merge/);
});

test('Governança final: smoke pós-merge valida fronteira administrativa, headers e aliases bloqueados', () => {
  const smoke = source('test/productionSmoke.mjs');
  assert.match(smoke, /content-security-policy/);
  assert.match(smoke, /strict-transport-security/);
  assert.match(smoke, /\/api\/admin\/scheduler\/run-now/);
  assert.match(smoke, /\['\/alma', '\/creditos'\]/);
  assert.match(smoke, /service-worker-allowed/);
});
