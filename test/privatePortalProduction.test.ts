import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('produção privada: vitrine pública usa somente projetos oficiais', () => {
  const router = read('server/production/router.ts');
  const start = router.indexOf("function sanitizePublicVitrineProject");
  const end = router.indexOf("// Admin", start);
  assert.ok(start >= 0 && end > start, 'Bloco da Vitrine deve existir');
  const vitrine = router.slice(start, end);
  assert.match(vitrine, /PORTAL_VIP_PROJECTS/);
  assert.doesNotMatch(vitrine, /COLLECTIONS\.companies/);
});

test('produção privada: admin visível não contém empresas, usuários comerciais ou créditos', () => {
  const admin = read('src/pages/AdminPage.tsx');
  assert.doesNotMatch(admin, /Créditos emitidos/i);
  assert.doesNotMatch(admin, /Concessão manual de créditos/i);
  assert.doesNotMatch(admin, /\/api\/admin\/grant-credits/);
  assert.doesNotMatch(admin, /totalCompanies/);
  assert.doesNotMatch(admin, /totalCreditsIssued/);
  assert.match(admin, /Projetos oficiais/);
  assert.match(admin, /Conexões sociais ativas/);
});

test('produção privada: backend bloqueia concessão de créditos', () => {
  const router = read('server/production/router.ts');
  const marker = "router.post('/admin/grant-credits'";
  const start = router.indexOf(marker);
  assert.ok(start >= 0);
  const section = router.slice(start, start + 700);
  assert.match(section, /config\.privatePortalMode/);
  assert.match(section, /Créditos não fazem parte do Portal Vip Brasil privado/);
});

test('produção privada: dashboard não usa prontidão fixa para automação e artigo', () => {
  const dashboard = read('src/pages/DashboardPage.tsx');
  assert.match(dashboard, /status\.autopilotEnabled/);
  assert.match(dashboard, /status\.hasCreatedArticle/);
  assert.doesNotMatch(dashboard, /\['Configurar Automação 1x\/dia', true/);
  assert.doesNotMatch(dashboard, /\['Criar Artigo no Blog', true/);
});

test('produção privada: falha do pulso diário não é apresentada como sucesso', () => {
  const vitrine = read('src/pages/VitrinePage.tsx');
  assert.doesNotMatch(vitrine, /Executado com proteção anti-quedas de emergência/);
  assert.match(vitrine, /Falha:/);
  const dashboard = read('src/pages/DashboardPage.tsx');
  assert.match(dashboard, /dailyFeedback\.success/);
  assert.match(dashboard, /bg-rose-950/);
});

test('produção privada: termos não instruem cadastro público nem exclusão inexistente pelo perfil', () => {
  const legal = read('src/pages/LegalPage.tsx');
  assert.doesNotMatch(legal, /usuário deve criar uma conta/i);
  assert.doesNotMatch(legal, /clique na opção de encerramento de conta/i);
  assert.match(legal, /não oferece cadastro público/i);
  assert.match(legal, /Solicitação pelo Canal Oficial LGPD/);
});

test('PWA: atalhos refletem a central privada atual', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const urls = manifest.shortcuts.map((item: any) => item.url);
  assert.deepEqual(urls, ['/projetos', '/redes-sociais', '/autopilot']);
  const sw = read('public/sw.js');
  assert.match(sw, /portal-vip-shell-v1\.2\.0/);
});
