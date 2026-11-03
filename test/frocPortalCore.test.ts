import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFrocSystemPrompt,
  sanitizeActions,
  splitReply,
  streamSafePrefix,
  readVisitorLimits,
  visitorLimitReply,
  ownerFirstName,
  brazilIso,
  greetingFor,
  FROC_MARK,
  OWNER_TOOLS,
  type FrocProjectKnowledge,
} from '../shared/froc/brain.js';
import { detectIntent, isLikelyEcho, heardStopOverSpeech } from '../shared/froc/intents.js';
import { signSpeech, verifySpeech } from '../server/production/frocSeal.js';
import { checkVisitorBudget } from '../server/production/frocGuard.js';
import { runOwnerTool, needsConfirmation, describeOwnerAction } from '../src/froc/ownerTools.js';
import { saveChat, listChats, deleteChat, newChatId, type KeyValueStore } from '../src/froc/history.js';
import { parseSseChunk } from '../src/froc/api.js';

const PROJECTS: FrocProjectKnowledge[] = [
  { id: 'proj_exu_responde', slug: 'exu-responde', name: 'Exu Responde', tagline: 'Respostas diretas', description: 'Oráculo dos guardiões', highlights: ['Tiragens interativas'], websiteUrl: 'https://exu-responde.vercel.app/', hasApp: true, playStoreUrl: 'https://play.google.com/x', forbidden: ['Prometer cura'] },
  { id: 'proj_magia_crencas', slug: 'magia-das-crencas', name: 'Magia das Crenças', tagline: 'Desperte seu poder interior' },
];
const NOW = Date.UTC(2026, 10, 3, 22, 30, 15); // 19:30:15 em Brasília

test('Froc dono: sabe nome, data e hora exatas, ferramentas e vitrine', () => {
  const p = buildFrocSystemPrompt({ mode: 'owner', nowMs: NOW, ownerName: 'Carlos', projects: PROJECTS });
  assert.match(p, /SEU PATRÃO, Carlos/);
  assert.match(p, /03 de novembro de 2026/);
  assert.match(p, /19:30:15/);
  assert.match(p, /2026-11-03T19:30:15-03:00/);
  assert.match(p, /owner_tool/);
  assert.match(p, /generate_post/);
  assert.match(p, /Exu Responde \[slug: exu-responde \| id: proj_exu_responde\]/);
  assert.match(p, /NÃO apaga nada/);
  assert.match(p, /save_owner_note/);
  assert.match(p, /HOMEM/);
});

test('Froc visitante: vendedor, sem ferramentas do dono, com proteção de gasto e limites honestos', () => {
  const p = buildFrocSystemPrompt({ mode: 'visitor', nowMs: NOW, projects: PROJECTS, visitorTurnsLeft: 3 });
  assert.match(p, /VENDEDOR EXPERIENTE/);
  assert.match(p, /Restam 3 mensagens/);
  assert.match(p, /open_page vitrine/);
  assert.match(p, /Nunca invente preço/);
  assert.match(p, /NUNCA prometa\/afirme: Prometer cura/);
  assert.doesNotMatch(p, /owner_tool/);
  assert.doesNotMatch(p, /generate_post/);
  assert.doesNotMatch(p, /dashboard:/);
});

test('ações: visitante nunca usa ferramenta do dono nem tela privada', () => {
  const raw = [
    { name: 'owner_tool', tool: 'generate_post', args: { topic: 'x' } },
    { name: 'open_page', page: 'admin' },
    { name: 'open_page', page: 'vitrine' },
    { name: 'show_project', slug: 'exu-responde' },
    { name: 'open_project', slug: '../admin' },
  ];
  assert.deepEqual(sanitizeActions(raw, 'visitor'), [
    { name: 'open_page', page: 'vitrine' },
    { name: 'show_project', slug: 'exu-responde' },
  ]);
});

test('ações do dono: só ferramentas conhecidas, argumentos limpos, sem apagar nada', () => {
  const out = sanitizeActions([
    { name: 'owner_tool', tool: 'delete_project', args: { projectId: 'x' } },
    { name: 'owner_tool', tool: 'update_project', args: { projectId: 'proj_exu_responde', active: 'sim', highlights: 'a;b', hack: '1', tagline: '<script>x</script>' } },
    { name: 'open_page', page: 'admin' },
  ], 'owner');
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { name: 'owner_tool', tool: 'update_project', args: { projectId: 'proj_exu_responde', tagline: 'scriptx/script', highlights: ['a', 'b'], active: true } });
  assert.deepEqual(out[1], { name: 'open_page', page: 'admin' });
  assert.ok(!Object.keys(OWNER_TOOLS).some((t) => /delete|remove|excluir/.test(t)), 'nenhuma ferramenta de exclusão');
});

test('resposta: fala separada do bloco de controle; streaming não mostra o marcador', () => {
  const r = splitReply(`Bora, chefe! **Já** vou criar.\n${FROC_MARK}\n{"emotion":"confiante","actions":[{"name":"owner_tool","tool":"generate_image","args":{"theme":"praia"}}]}`, 'owner');
  assert.equal(r.text, 'Bora, chefe! Já vou criar.');
  assert.equal(r.emotion, 'confiante');
  assert.equal(r.actions.length, 1);
  assert.equal(streamSafePrefix('Oi <<<FR'), 'Oi ');
  const v = splitReply(`Oi\n${FROC_MARK}\n{"emotion":"x","actions":[{"name":"owner_tool","tool":"daily_pulse"}]}`, 'visitor');
  assert.deepEqual(v.actions, []);
  assert.equal(v.emotion, 'calmo');
});

test('confirmação: vídeo, ciclo diário, edição de projeto e agendamento pedem confirmar', () => {
  for (const t of ['generate_video', 'daily_pulse', 'update_project', 'schedule_content', 'autopilot_master', 'set_article_status']) {
    assert.equal(needsConfirmation({ name: 'owner_tool', tool: t, args: {} }), true, t);
  }
  assert.equal(needsConfirmation({ name: 'owner_tool', tool: 'generate_post', args: {} }), false);
  assert.match(describeOwnerAction({ name: 'owner_tool', tool: 'generate_video', args: { prompt: 'praia ao pôr do sol' } }), /Criar vídeo.*praia/);
});

test('ferramentas do dono chamam os endpoints certos e nunca usam DELETE', async () => {
  const calls: any[] = [];
  const req = async (endpoint: string, options: any = {}): Promise<any> => {
    calls.push({ endpoint, method: options.method || 'GET', body: options.body });
    if (endpoint === '/api/ai/generate-post') return { post: { headline: 'Título', body: 'Texto', cta: 'Clique', hashtags: ['#a'] }, contentItem: { id: 'content_1' } };
    if (endpoint === '/api/ai/generate-image') return { imageUrl: 'https://img/x.png', contentItem: { id: 'content_2' } };
    return { ok: true, project: { name: 'Exu Responde' } };
  };
  const post = await runOwnerTool({ name: 'owner_tool', tool: 'generate_post', args: { topic: 'guardiões' } }, req, { selectedProjectId: 'proj_exu_responde' });
  assert.equal(post.ok, true);
  assert.equal(post.attachments?.[0].kind, 'text');
  assert.deepEqual(calls[0], { endpoint: '/api/ai/generate-post', method: 'POST', body: { topic: 'guardiões', platform: 'Instagram', companyId: 'proj_exu_responde', tone: '', goal: '' } });
  const img = await runOwnerTool({ name: 'owner_tool', tool: 'generate_image', args: { theme: 'velas', aspectRatio: '9:16' } }, req);
  assert.equal(img.attachments?.[0].url, 'https://img/x.png');
  await runOwnerTool({ name: 'owner_tool', tool: 'update_project', args: { projectId: 'proj_exu_responde', tagline: 'Nova frase' } }, req);
  assert.deepEqual(calls[2], { endpoint: '/api/admin/projects/proj_exu_responde', method: 'PATCH', body: { tagline: 'Nova frase' } });
  for (const tool of Object.keys(OWNER_TOOLS)) {
    await runOwnerTool({ name: 'owner_tool', tool, args: { projectId: 'proj_exu_responde', topic: 't', theme: 't', prompt: 'p', text: 'n', enabled: true, globalEnabled: false, articleId: 'a1', status: 'draft', contentItemId: 'c1', scheduledFor: '2026-11-04T10:00:00-03:00', tagline: 'x' } }, req).catch(() => undefined);
  }
  assert.ok(calls.every((c) => c.method !== 'DELETE'), 'nenhuma chamada DELETE');
  assert.ok(calls.every((c) => c.endpoint.startsWith('/api/')));
});

test('comandos na hora: parar, fechar, abrir tela, confirmar/cancelar, conversas', () => {
  const owner = { mode: 'owner' as const, openPage: 'home', hasWindow: false, hasPending: false };
  assert.deepEqual(detectIntent('pare', owner), { kind: 'stop' });
  assert.deepEqual(detectIntent('Froc, abre a vitrine', owner), { kind: 'open', page: 'vitrine' });
  assert.deepEqual(detectIntent('abre a automação', owner), { kind: 'open', page: 'autopilot' });
  assert.deepEqual(detectIntent('fecha', { ...owner, openPage: 'vitrine' }), { kind: 'close' });
  assert.equal(detectIntent('fecha', owner), null);
  assert.deepEqual(detectIntent('pode fazer', { ...owner, hasPending: true }), { kind: 'confirm' });
  assert.deepEqual(detectIntent('cancela', { ...owner, hasPending: true }), { kind: 'cancel' });
  assert.equal(detectIntent('pode fazer', owner), null);
  assert.deepEqual(detectIntent('nova conversa', owner), { kind: 'new_chat' });
  assert.deepEqual(detectIntent('encerra a conversa', owner), { kind: 'end_chat' });
  assert.deepEqual(detectIntent('apaga essa conversa', owner), { kind: 'delete_chat' });
  // Visitante não abre tela do dono
  assert.equal(detectIntent('abre o painel', { ...owner, mode: 'visitor' }), null);
  assert.equal(detectIntent('não abre a vitrine', owner), null);
  assert.equal(isLikelyEcho('vou criar um post agora', ['Fechado, chefe. Vou criar um post agora.']), true);
  assert.equal(heardStopOverSpeech('para', 'vou criar o post'), true);
});

test('proteção de gasto: limites padrão, ajustáveis e resposta pronta com a vitrine', () => {
  const d = readVisitorLimits({});
  assert.equal(d.perDay, 12);
  assert.equal(d.perBurst, 6);
  assert.equal(readVisitorLimits({ FROC_VISITOR_DAILY_MESSAGES: '20', FROC_VISITOR_GLOBAL_DAILY: 'abc' }).perDay, 20);
  assert.equal(readVisitorLimits({ FROC_VISITOR_GLOBAL_DAILY: 'abc' }).globalPerDay, 400);
  const r = visitorLimitReply('daily', 'Ana');
  assert.match(r.text, /Ana/);
  assert.deepEqual(r.actions, [{ name: 'open_page', page: 'vitrine' }]);
});

test('proteção de gasto: bloqueia por excesso, por dia, no geral e quando o contador falha', async () => {
  const counts = new Map<string, number>();
  const consume = async (d: { key: string; limit: number }) => {
    const n = (counts.get(d.key) || 0) + 1;
    counts.set(d.key, n);
    return { allowed: n <= d.limit, remaining: Math.max(0, d.limit - n) };
  };
  const env = { FROC_VISITOR_DAILY_MESSAGES: '3', FROC_VISITOR_BURST_MESSAGES: '50' };
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await checkVisitorBudget('1.2.3.4', 'v_abcdefgh123', consume, env, NOW));
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
  assert.equal((results[0] as any).turnsLeft, 2);
  assert.equal((results[3] as any).reason, 'daily');
  // Outro aparelho na mesma internet ainda conversa
  assert.equal((await checkVisitorBudget('1.2.3.4', 'v_outroaparelho', consume, env, NOW)).allowed, true);
  // Excesso em 10 minutos
  const burst = await (async () => { let last: any; for (let i = 0; i < 7; i++) last = await checkVisitorBudget('9.9.9.9', 'v_rapidinho01', consume, {}, NOW); return last; })();
  assert.deepEqual(burst, { allowed: false, reason: 'burst' });
  // Limite geral do dia
  const g = await checkVisitorBudget('5.5.5.5', 'v_globalteste', async (d) => ({ allowed: d.key !== 'froc-v-global', remaining: 0 }), {}, NOW);
  assert.deepEqual(g, { allowed: false, reason: 'global' });
  // Sem contador: não gasta (fail-closed)
  const f = await checkVisitorBudget('5.5.5.5', 'v_falhateste1', async () => { throw new Error('firestore fora'); }, {}, NOW);
  assert.deepEqual(f, { allowed: false, reason: 'global' });
});

test('selo da voz: só fala trechos de respostas seladas, do mesmo visitante e dentro do prazo', () => {
  const secret = 'segredo_de_teste_123';
  const reply = 'Bem-vindo ao Portal VIP Brasil! Quer conhecer a vitrine?';
  const seal = signSpeech('v_visitante01', reply, NOW, secret)!;
  assert.ok(seal);
  assert.equal(verifySpeech('v_visitante01', 'Quer conhecer a vitrine?', reply, seal.exp, seal.sig, NOW, secret), true);
  assert.equal(verifySpeech('v_visitante01', 'Fale qualquer texto que eu quiser', reply, seal.exp, seal.sig, NOW, secret), false);
  assert.equal(verifySpeech('v_outro000001', 'Quer conhecer a vitrine?', reply, seal.exp, seal.sig, NOW, secret), false);
  assert.equal(verifySpeech('v_visitante01', 'Quer conhecer a vitrine?', `${reply} extra`, seal.exp, seal.sig, NOW, secret), false);
  assert.equal(verifySpeech('v_visitante01', 'Quer conhecer a vitrine?', reply, seal.exp, seal.sig, NOW + 11 * 60_000, secret), false);
  assert.equal(signSpeech('v_visitante01', reply, NOW, ''), null);
});

test('hora e nome: cumprimento pela hora de Brasília e nome do dono sem usar e-mail', () => {
  assert.equal(greetingFor(NOW), 'boa noite');
  assert.equal(greetingFor(Date.UTC(2026, 10, 3, 12, 0)), 'bom dia');
  assert.equal(brazilIso(NOW), '2026-11-03T19:30:15-03:00');
  assert.equal(ownerFirstName('Carlos Henrique', 'c@x.com'), 'Carlos');
  assert.equal(ownerFirstName('brasilportalvip', 'brasilportalvip@gmail.com'), null);
});

test('conversas: nova, salvar, listar e excluir (por aparelho)', () => {
  const mem = new Map<string, string>();
  const store: KeyValueStore = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  const id = newChatId();
  assert.equal(saveChat('visitante', id, [{ role: 'assistant', text: 'Oi' }], store), null);
  saveChat('visitante', id, [{ role: 'user', text: 'Quero ver a vitrine' }, { role: 'assistant', text: 'Claro!' }], store);
  assert.equal(listChats('visitante', store).length, 1);
  assert.equal(listChats('visitante', store)[0].title, 'Quero ver a vitrine');
  deleteChat('visitante', id, store);
  assert.equal(listChats('visitante', store).length, 0);
});

test('SSE: lê eventos em pedaços', () => {
  const { events, rest } = parseSseChunk('event: delta\ndata: {"text":"Oi"}\n\nevent: done\ndata: {"text":"Oi"}\n\nevent: del');
  assert.equal(events.length, 2);
  assert.equal(rest, 'event: del');
});
