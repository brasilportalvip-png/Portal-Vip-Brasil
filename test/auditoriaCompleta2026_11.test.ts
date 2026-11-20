import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ensureUserProfile } from '../server/production/auth.js';
import { config } from '../server/config/index.js';
import { resetMemoryDb } from '../server/production/store.js';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const ownerEmail = config.privateAdminEmails[0];

// ---------------------------------------------------------------------------
// Segurança: e-mail do proprietário só vale quando o Firebase confirmou a posse
// ---------------------------------------------------------------------------

test('Auditoria 11/2026: e-mail do proprietário NÃO verificado não recebe papel de administrador', async () => {
  resetMemoryDb();
  assert.ok(ownerEmail, 'o ambiente de teste precisa de um e-mail de proprietário configurado');
  const profile = await ensureUserProfile({
    uid: 'audit_owner_unverified',
    email: ownerEmail,
    email_verified: false
  } as any);
  assert.equal(profile.role, 'user');
});

test('Auditoria 11/2026: e-mail do proprietário verificado continua administrador', async () => {
  resetMemoryDb();
  const profile = await ensureUserProfile({
    uid: 'audit_owner_verified',
    email: ownerEmail,
    email_verified: true
  } as any);
  assert.equal(profile.role, 'admin');
});

test('Auditoria 11/2026: proprietário com custom claim de admin mantém acesso mesmo sem e-mail verificado', async () => {
  resetMemoryDb();
  const profile = await ensureUserProfile({
    uid: 'audit_owner_claim',
    email: ownerEmail,
    email_verified: false,
    role: 'admin',
    frocRole: 'admin'
  } as any);
  assert.equal(profile.role, 'admin');
});

// ---------------------------------------------------------------------------
// Servidor: CORS, cron em tempo constante, rotas privadas e SSR da Vitrine
// ---------------------------------------------------------------------------

test('Auditoria 11/2026: CORS libera os cabeçalhos usados pelo Froc (app Capacitor)', () => {
  const app = read('server/app.ts');
  assert.match(app, /allowedHeaders: \[[^\]]*'X-Froc-Visitor'/);
  assert.match(app, /exposedHeaders: \[[^\]]*'X-Froc-Audio-Sample-Rate'/);
});

test('Auditoria 11/2026: todas as rotas de cron usam comparação em tempo constante', () => {
  const router = read('server/production/router.ts');
  assert.ok(!router.includes('auth === `Bearer ${config.cronSecret}`'));
  assert.ok(router.includes('constantTimeEquals(safeString(req.body?.secretKey, 500), config.adminBootstrap.key)'));
});

test('Auditoria 11/2026: /agentes é rota privada no servidor e na Vercel', () => {
  assert.ok(read('server/app.ts').includes("'/agentes'"));
  assert.ok(read('vercel.json').includes('|agentes|'));
  assert.ok(read('src/App.tsx').includes("agentes: '/agentes'"));
});

test('Auditoria 11/2026: Vitrine e páginas de projeto têm conteúdo pré-renderizado para buscadores', () => {
  const pages = read('server/production/publicPages.ts');
  assert.match(pages, /data-portal-seo-prerender="vitrine"/);
  assert.match(pages, /data-portal-seo-prerender="project"/);
  assert.ok(pages.includes('bodyHtml: vitrineIndexSeoBody(active)'));
  assert.ok(pages.includes('bodyHtml: projectSeoBody(project)'));
  assert.ok(!pages.includes('/favicon.svg'));
});

// ---------------------------------------------------------------------------
// Cliente: carregamento de dados, sessão, calendário e mensagens
// ---------------------------------------------------------------------------

test('Auditoria 11/2026: campanhas e agendamentos são carregados após o login', () => {
  const app = read('src/App.tsx');
  assert.ok(app.includes('void refreshCampaigns();'));
  assert.ok(app.includes('void refreshSchedule();'));
  assert.ok(app.includes("guardedTab === 'calendario'"));
});

test('Auditoria 11/2026: rota privada mostra carregamento e pede login em vez de piscar a tela inicial', () => {
  const app = read('src/App.tsx');
  assert.ok(app.includes('if (loading && isPrivateTab(currentTab))'));
  assert.ok(app.includes('pendingTabRef.current = currentTab;'));
  assert.ok(app.includes('err.status === 401 || err.status === 403'));
});

test('Auditoria 11/2026: calendário usa horário local (não UTC) e só navega para telas existentes', () => {
  const calendar = read('src/pages/CalendarPage.tsx');
  assert.ok(!calendar.includes('toISOString().slice(0, 16)'));
  assert.ok(calendar.includes('toLocalDateTimeInput(nextHour)'));
  assert.ok(calendar.includes('localDateKey(p.scheduledFor) === prefix'));
  assert.ok(!calendar.includes("setActionableTab('planos')"));
  assert.ok(!calendar.includes("setActionableTab('empresa')"));
});

test('Auditoria 11/2026: helpers de data local do calendário', () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDateTimeInput = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const sample = new Date(2026, 10, 20, 22, 30);
  // O valor do input, reinterpretado como local, volta exatamente ao mesmo instante.
  assert.equal(new Date(toLocalDateTimeInput(sample)).getTime(), sample.getTime());
});

test('Auditoria 11/2026: tempo limite exibido corresponde ao configurado e HTML de erro não vira mensagem', () => {
  const api = read('src/lib/api.ts');
  assert.ok(!api.includes('limite permitido (240s)'));
  assert.ok(api.includes('Math.round(timeoutMs / 1000)'));
  assert.ok(api.includes("contentType.toLowerCase().includes('html')) return {};"));
});

test('Auditoria 11/2026: painel administrativo carrega seções de forma independente', () => {
  const admin = read('src/pages/AdminPage.tsx');
  assert.ok(admin.includes('Promise.allSettled'));
  assert.ok(admin.includes('Arquivar o artigo'));
});
