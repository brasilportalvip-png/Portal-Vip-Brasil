import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildFrocSystemPrompt, OWNER_TOOLS, sanitizeActions } from '../shared/froc/brain.js';
import { cleanMemoryText, FROC_MEMORY_MAX_ITEMS } from '../server/production/frocMemory.js';

const read = (f: string) => fs.readFileSync(f, 'utf8');

test('Froc+: ferramentas novas existem e as que mudam dados pedem confirmação', () => {
  for (const t of ['screen_scroll', 'screen_click', 'screen_fill', 'remember_fact', 'forget_fact', 'reschedule_scheduled', 'publish_scheduled_now']) {
    assert.ok(OWNER_TOOLS[t], `faltou ${t}`);
  }
  assert.equal(OWNER_TOOLS.reschedule_scheduled.confirm, true);
  assert.equal(OWNER_TOOLS.publish_scheduled_now.confirm, true);
  assert.equal(OWNER_TOOLS.screen_scroll.confirm, false);
});

test('Froc+: dono pode usar as ações de tela; visitante não', () => {
  const raw = [
    { name: 'owner_tool', tool: 'screen_scroll', args: { to: 'fim' } },
    { name: 'owner_tool', tool: 'screen_fill', args: { field: 'Título', value: 'Promoção' } },
    { name: 'owner_tool', tool: 'screen_click', args: { label: 'Salvar' } }
  ];
  const owner = sanitizeActions(raw, 'owner');
  assert.equal(owner.length, 3);
  assert.deepEqual((owner[1] as any).args, { field: 'Título', value: 'Promoção' });
  assert.equal(sanitizeActions(raw, 'visitor').length, 0);
});

test('Froc+: clique em botão que muda dados exige confirmação; clique de navegação não', () => {
  const tools = read('src/froc/ownerTools.ts');
  const screen = read('src/froc/screen.ts');
  assert.ok(tools.includes("if (a.tool === 'screen_click')"));
  const re = /excluir|apagar|deletar|remover|publicar|agendar|enviar|confirmar|salvar|pagar|comprar|assinar|sair|logout|desconectar|arquivar|cancelar|aprovar|disparar|gerar|criar|refazer|reenviar|desligar|ligar/;
  assert.ok(screen.includes(re.source));
  for (const risky of ['excluir projeto', 'publicar agora', 'salvar', 'agendar publicacao', 'sair']) assert.ok(re.test(risky), risky);
  for (const safe of ['ver biblioteca', 'proximo mes', 'detalhes', 'instagram']) assert.ok(!re.test(safe), safe);
});

test('Froc+: memória longa entra no prompt do dono e nunca no do visitante', () => {
  const owner = buildFrocSystemPrompt({ mode: 'owner', nowMs: Date.now(), projects: [], ownerMemory: ['Prefere posts às 19h'] });
  assert.match(owner, /\[MEMÓRIA LONGA/);
  assert.match(owner, /Prefere posts às 19h/);
  const visitor = buildFrocSystemPrompt({ mode: 'visitor', nowMs: Date.now(), projects: [], ownerMemory: ['Prefere posts às 19h'] } as any);
  assert.doesNotMatch(visitor, /Prefere posts às 19h/);
  assert.equal(cleanMemoryText('  <b>lembrar</b>   isto  '), 'b lembrar /b isto');
  assert.ok(cleanMemoryText('x'.repeat(500)).length <= 200);
  assert.equal(FROC_MEMORY_MAX_ITEMS, 60);
});

test('Froc+: reagendar só mexe em publicação na fila, dentro de transação', () => {
  const router = read('server/production/router.ts');
  const i = router.indexOf("router.post('/content/scheduled/:id/reschedule'");
  assert.ok(i > 0);
  const block = router.slice(i, router.indexOf('router.post(', i + 10));
  assert.ok(block.includes('runTransaction'));
  assert.ok(block.includes("current.status !== 'scheduled'"));
  assert.ok(block.includes("current.userId !== req.user!.id"));
});

test('Froc+: rolar e preencher não geram comentário extra; ações de tela rodam em sequência', () => {
  const home = read('src/components/froc/FrocHome.tsx');
  assert.ok(home.includes('if (r.ok && r.quiet) return;'));
  assert.ok(home.includes("if (a.tool.startsWith('screen_'))"));
});
