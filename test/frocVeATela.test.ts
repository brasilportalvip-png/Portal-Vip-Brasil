import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describeState } from '../shared/froc/brain.js';

const screen = 'Rolagem: 0% da página\n▶ # Calendário Editorial\n▶ [AVISO] Falha ao agendar';

test('Froc vê a tela: dono recebe o resumo do que está na tela', () => {
  const text = describeState({ page: 'calendario', screen }, 'owner');
  assert.match(text, /\[O QUE ESTÁ NA TELA AGORA\]/);
  assert.match(text, /Falha ao agendar/);
});

test('Froc vê a tela: visitante nunca recebe conteúdo da página', () => {
  const text = describeState({ page: 'vitrine', screen }, 'visitor');
  assert.doesNotMatch(text, /O QUE ESTÁ NA TELA/);
  assert.doesNotMatch(text, /Falha ao agendar/);
});

test('Froc vê a tela: sem resumo, o estado continua igual ao de antes', () => {
  const text = describeState({ page: 'calendario' }, 'owner');
  assert.doesNotMatch(text, /O QUE ESTÁ NA TELA/);
});

test('Froc vê a tela: cliente só envia no modo dono e nunca lê senha nem a conversa do Froc', () => {
  const home = fs.readFileSync('src/components/froc/FrocHome.tsx', 'utf8');
  assert.ok(home.includes("screen: mode === 'owner' ? captureScreenSummary() : null"));
  const scr = fs.readFileSync('src/froc/screen.ts', 'utf8');
  assert.ok(scr.includes("['password', 'hidden', 'file']"));
  assert.ok(scr.includes('[data-testid="froc-dock"]'));
  const router = fs.readFileSync('server/production/frocRouter.ts', 'utf8');
  assert.ok(router.includes('.slice(0, 4000)'));
});
