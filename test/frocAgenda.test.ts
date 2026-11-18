import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { buildOwnerAgenda, resolveAgendaDay, brazilToday } from '../server/production/frocAgenda.js';
import { sanitizeActions, buildFrocSystemPrompt, OWNER_TOOLS } from '../shared/froc/brain.js';
import { runOwnerTool } from '../src/froc/ownerTools.js';

// 18/11/2026 09:05 em Brasília = 12:05 UTC (quarta-feira).
const NOW = Date.parse('2026-11-18T12:05:00Z');

test('Datas da agenda no horário de Brasília', () => {
  assert.equal(brazilToday(Date.parse('2026-11-19T02:30:00Z')), '2026-11-18', '23h30 de Brasília ainda é dia 18');
  assert.equal(resolveAgendaDay('hoje', NOW), '2026-11-18');
  assert.equal(resolveAgendaDay('amanhã', NOW), '2026-11-19');
  assert.equal(resolveAgendaDay('ontem', NOW), '2026-11-17');
  assert.equal(resolveAgendaDay('25/12', NOW), '2026-12-25');
  assert.equal(resolveAgendaDay('2026-11-30', NOW), '2026-11-30');
  assert.equal(resolveAgendaDay('qualquer coisa', NOW), '2026-11-18');
});

test('Agenda de hoje: separa o que sai hoje, o que atrasou, falhas, automação, blog, Kwai e vídeos', async () => {
  resetMemoryDb();
  const db = firestore();
  const sp = db.collection(COLLECTIONS.scheduledPosts);
  // 560 antigos de setembro (eram eles que o Froc mostrava antes)
  for (let i = 0; i < 560; i++) await sp.doc(`old_${i}`).set({ id: `old_${i}`, userId: 'u', companyId: 'proj_magia_crencas', scheduledFor: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T13:00:00.000Z`, status: 'published', platforms: ['instagram'], title: 'Antigo' });
  await sp.doc('hoje_1').set({ id: 'hoje_1', userId: 'u', companyId: 'proj_exu_responde', scheduledFor: '2026-11-18T14:00:00.000Z', status: 'scheduled', platforms: ['instagram', 'facebook'], title: 'Conselho do guardião' });
  await sp.doc('hoje_2').set({ id: 'hoje_2', userId: 'u', companyId: 'proj_magia_crencas', scheduledFor: '2026-11-18T21:30:00.000Z', status: 'pending', platforms: ['tiktok'], title: 'Oração da noite' });
  await sp.doc('atrasada').set({ id: 'atrasada', userId: 'u', companyId: 'proj_manual_catolico', scheduledFor: '2026-11-18T11:00:00.000Z', status: 'pending', platforms: ['instagram'], title: 'Santo do dia' });
  await sp.doc('falhou').set({ id: 'falhou', userId: 'u', companyId: 'proj_oraculos_ts', scheduledFor: '2026-11-17T13:00:00.000Z', updatedAt: '2026-11-17T13:01:00.000Z', status: 'failed', platforms: ['instagram'], title: 'Tarot', lastError: 'Token do Instagram expirou' });
  await sp.doc('falhou2').set({ id: 'falhou2', userId: 'u', companyId: 'proj_exu_responde', scheduledFor: '2026-11-16T13:00:00.000Z', updatedAt: '2026-11-16T13:01:00.000Z', status: 'failed', platforms: ['facebook'], errorMessage: 'Token do Instagram expirou' });
  await sp.doc('velha').set({ id: 'velha', userId: 'u', companyId: 'proj_exu_responde', scheduledFor: '2026-09-10T13:00:00.000Z', updatedAt: '2026-09-10T13:01:00.000Z', status: 'failed', platforms: ['instagram'], errorMessage: '(#10) Application does not have permission for this action 123456789' });
  await sp.doc('amanha').set({ id: 'amanha', userId: 'u', companyId: 'proj_exu_responde', scheduledFor: '2026-11-19T13:00:00.000Z', status: 'scheduled', platforms: ['instagram'], title: 'Amanhã' });
  // 00h30 de 19/11 em Brasília ainda NÃO é hoje (é 03:30Z do dia 19)
  await sp.doc('madrugada').set({ id: 'madrugada', userId: 'u', companyId: 'proj_exu_responde', scheduledFor: '2026-11-19T03:30:00.000Z', status: 'scheduled', platforms: ['instagram'], title: 'Madrugada' });
  await db.collection(COLLECTIONS.autopilotConfigs).doc('a1').set({ companyId: 'proj_exu_responde', enabled: true, preferredDays: [3], preferredHours: [10, 18], targetPlatforms: ['Instagram', 'Kwai'] });
  await db.collection(COLLECTIONS.autopilotConfigs).doc('a2').set({ companyId: 'proj_magia_crencas', enabled: true, preferredDays: [1], preferredHours: [9] });
  await db.collection(COLLECTIONS.blogArticles).doc('b1').set({ title: 'Artigo de hoje', status: 'published', publishedAt: '2026-11-18T11:30:00.000Z', relatedProjectId: 'proj_magia_crencas' });
  await db.collection('kwaiReminders').doc('k1').set({ title: 'Vídeo do Exu', dueAt: '2026-11-18T22:00:00.000Z' });
  await db.collection(COLLECTIONS.mediaGenerationJobs).doc('v1').set({ title: 'Vídeo prosperidade', status: 'processing', companyId: 'proj_magia_crencas', createdAt: '2026-11-18T11:50:00.000Z' });

  const a = await buildOwnerAgenda({ day: 'hoje', nowMs: NOW });
  assert.deepEqual(a.publicacoes.itens.map((p) => p.id), ['atrasada', 'hoje_1', 'hoje_2']);
  assert.equal(a.publicacoes.itens[1].hora, '18/11 11:00');
  assert.equal(a.publicacoes.itens[1].projeto, 'Exu Responde');
  assert.equal(a.atrasadas.total, 1);
  assert.equal(a.atrasadas.itens[0].id, 'atrasada');
  assert.equal(a.falhasRecentes.total, 2);
  assert.equal(a.falhasRecentes.motivos[0].quantidade, 2);
  assert.equal(a.falhasRecentes.motivos[0].oQueFazer, 'reconectar a conta em Redes Sociais');
  assert.equal(a.falhasHistorico.total, 3);
  assert.equal(a.falhasHistorico.maisDeDoisDias, 1);
  assert.ok(a.falhasHistorico.motivos.some((m) => m.oQueFazer.includes('permissões') && !/\d{5}/.test(m.motivo)));
  assert.match(a.resumo, /NÃO devem ser republicados/);
  assert.match(a.resumo, /Token do Instagram expirou|Falhas nos últimos 7 dias: 1/);
  assert.equal(a.totalGeral.total, 568);
  assert.equal(a.totalGeral.proxima?.id, 'hoje_1');
  assert.deepEqual(a.automacao.previstoNoPeriodo.map((x) => x.projeto), ['Exu Responde'], 'quarta-feira: só quem tem dia 3');
  assert.equal(a.blog.publicadosNoPeriodo.length, 1);
  assert.equal(a.kwai.avisosNoPeriodo.length, 1);
  assert.equal(a.videos.emProducao.length, 1);
  assert.match(a.resumo, /Agenda para o dia 18\/11: 3 publicação/);
  assert.match(a.resumo, /ATRASADAS/);

  const amanha = await buildOwnerAgenda({ day: 'amanhã', nowMs: NOW });
  assert.deepEqual(amanha.publicacoes.itens.map((p) => p.id), ['madrugada', 'amanha']);
  const semana = await buildOwnerAgenda({ day: 'hoje', days: 7, nowMs: NOW });
  assert.equal(semana.publicacoes.total, 5);
  const soExu = await buildOwnerAgenda({ day: 'hoje', projectId: 'proj_exu_responde', nowMs: NOW });
  assert.deepEqual(soExu.publicacoes.itens.map((p) => p.id), ['hoje_1']);
});

test('Froc: ferramenta de agenda existe, aceita dia/dias e o prompt manda usá-la', () => {
  const acts: any = sanitizeActions([{ name: 'owner_tool', tool: 'agenda', args: { day: 'amanhã', days: '7 dias', projectId: 'proj_exu_responde' } }], 'owner');
  assert.deepEqual(acts[0].args, { day: 'amanhã', days: 7, projectId: 'proj_exu_responde' });
  for (const t of ['agenda', 'project_details', 'list_campaigns', 'video_jobs', 'support_tickets', 'system_health', 'owner_notes', 'cancel_scheduled', 'retry_scheduled', 'run_scheduler_now']) assert.ok(OWNER_TOOLS[t], t);
  assert.equal(OWNER_TOOLS.cancel_scheduled.confirm, true);
  assert.equal(OWNER_TOOLS.run_scheduler_now.confirm, true);
  const prompt = buildFrocSystemPrompt({ mode: 'owner', nowMs: NOW, ownerName: 'Flavio', projects: [] });
  assert.match(prompt, /use agenda/);
  assert.match(prompt, /Não diga que não consegue filtrar por data/);
  assert.match(prompt, /Nunca ofereça reenviar tudo/);
  assert.match(prompt, /NÃO reenvia o que falhou/);
});

test('Froc: listar agendadas mostra as PRÓXIMAS, não as de setembro', async () => {
  const now = Date.now();
  const iso = (h: number) => new Date(now + h * 3600_000).toISOString();
  const posts = [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, scheduledFor: `2026-09-${String(i + 1).padStart(2, '0')}T13:00:00.000Z`, status: 'published', platforms: ['instagram'], title: 'Setembro' })),
    { id: 'prox2', scheduledFor: iso(5), status: 'scheduled', platforms: ['tiktok'], title: 'Depois' },
    { id: 'prox1', scheduledFor: iso(1), status: 'scheduled', platforms: ['instagram'], title: 'Logo mais' }
  ];
  const req: any = async () => ({ scheduledPosts: posts });
  const r = await runOwnerTool({ name: 'owner_tool', tool: 'list_scheduled', args: {} } as any, req);
  assert.match(r.summary, /22 agendamentos no total/);
  assert.match(r.summary, /Próximos a partir de agora \(2\)/);
  assert.ok(r.summary.indexOf('Logo mais') < r.summary.indexOf('Depois'));
  assert.doesNotMatch(r.summary, /Setembro/);
  const f = await runOwnerTool({ name: 'owner_tool', tool: 'list_scheduled', args: { status: 'published' } } as any, req);
  assert.match(f.summary, /Com status published \(20\)/);
});

test('Falha por saldo do Gemini esgotado vira instrução clara de recarga', async () => {
  const { failureHint } = await import('../server/production/frocAgenda.js');
  assert.match(failureHint('Your prepayment credits are depleted. Please go to AI Studio'), /saldo pré-pago da API do Gemini/);
  assert.match(failureHint('credits depleted'), /aistudio\.google\.com/);
  assert.equal(failureHint('Session has expired'), 'reconectar a conta em Redes Sociais');
});

test('Autopilot de hora em hora: roda 13h/15h/19h, não disputa com as 10h e não repete fora da janela', async () => {
  const { runHourlyAutopilot } = await import('../server/production/autopilotHourly.js');
  resetMemoryDb();
  const db = firestore();
  await db.collection(COLLECTIONS.autopilotConfigs).doc('u_proj_magia_crencas').set({ userId: 'u', companyId: 'proj_magia_crencas', enabled: true, preferredDays: [3], preferredHours: [10, 15, 19], timezone: 'America/Sao_Paulo' });
  let calls = 0;
  const fake = async () => { calls++; return { processed: 1, successCount: 1, failedCount: 0, skippedCount: 0, jobs: [] } as any; };
  const at = (iso: string) => ({ process: fake as any, globalOn: async () => true, now: () => new Date(iso) });
  // quarta 18/11 15h05 em Brasília = 18:05Z → roda
  const r15 = await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-18T18:05:00Z'));
  assert.equal(r15.ran, true); assert.equal(calls, 1);
  // 15h40: fora da janela de 15 min
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-18T18:40:00Z'))).reason, 'fora_da_janela_da_hora');
  // 10h: é do ciclo diário da Vercel
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-18T13:05:00Z'))).reason, 'horario_do_ciclo_diario');
  // 14h: ninguém tem horário
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-18T17:05:00Z'))).reason, 'nenhum_projeto_neste_horario');
  // quinta não está nos dias
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-19T22:05:00Z'))).reason, 'nenhum_projeto_neste_horario');
  // Botão Mestre desligado
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, { ...at('2026-11-18T22:05:00Z'), globalOn: async () => false })).reason, 'botao_mestre_desligado');
  // Ciclo diário rodando: não entra
  await db.collection(COLLECTIONS.schedulerLocks).doc('process').set({ lockedUntil: Date.now() + 60_000 });
  assert.equal((await runHourlyAutopilot({ budgetMs: 120_000 }, at('2026-11-18T22:05:00Z'))).reason, 'ciclo_diario_rodando');
  assert.equal(calls, 1);
});
