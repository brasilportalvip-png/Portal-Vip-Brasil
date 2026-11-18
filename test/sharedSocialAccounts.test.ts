import test from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import { updateMasterAutomationControl } from '../server/production/automationGate.js';
import { runDailyPortalMarketingCycle } from '../server/production/antiFallEngine.js';
import { listAllPortalProjectsFromDb, seedPortalProjectsIfEmpty } from '../server/production/almaPortfolio.js';

test('Divulgação diária: TODOS os projetos usam as contas oficiais conectadas (antes só o Exu Responde publicava)', async () => {
  resetMemoryDb();
  await seedPortalProjectsIfEmpty();
  await updateMasterAutomationControl('owner_1', { globalEnabled: true, pauseAllExternalApis: false } as any);
  // Contas oficiais do Portal conectadas só dentro do Exu Responde (como está no site).
  for (const provider of ['facebook', 'linkedin', 'instagram']) {
    await firestore().collection(COLLECTIONS.socialConnections).doc(`c_${provider}`).set({
      id: `c_${provider}`, userId: 'owner_1', companyId: 'proj_exu_responde', provider, status: 'connected',
      accessToken: 'tok', expiresAt: new Date(Date.now() + 86_400_000).toISOString()
    });
  }
  const result = await runDailyPortalMarketingCycle({ userId: 'owner_1' });
  const projects = (await listAllPortalProjectsFromDb()).filter((p: any) => p.active !== false && p.dailyMarketingEnabled !== false);
  assert.ok(projects.length >= 7);
  assert.equal(result.generatedCount, projects.length);
  assert.equal(result.scheduledCount, projects.length, `só ${result.scheduledCount} de ${projects.length} projetos agendaram`);
  const scheduled = (await firestore().collection(COLLECTIONS.scheduledPosts).get()).docs.map((d: any) => d.data());
  const byProject = new Set(scheduled.map((s: any) => s.companyId));
  for (const p of projects) assert.ok(byProject.has(p.id), `${p.name} ficou sem publicação`);
  assert.ok(scheduled.every((s: any) => s.platforms.includes('facebook') && s.platforms.includes('linkedin')));
  // Rodar de novo no mesmo dia não duplica.
  const again = await runDailyPortalMarketingCycle({ userId: 'owner_1' });
  assert.equal(again.scheduledCount, 0);
});

test('Sem nenhuma conta conectada, nada é agendado (só gera para revisão)', async () => {
  resetMemoryDb();
  await seedPortalProjectsIfEmpty();
  await updateMasterAutomationControl('owner_2', { globalEnabled: true, pauseAllExternalApis: false } as any);
  const result = await runDailyPortalMarketingCycle({ userId: 'owner_2' });
  assert.ok(result.generatedCount > 0);
  assert.equal(result.scheduledCount, 0);
});

test('Repescagem da divulgação: roda das 10h às 22h, uma vez por dia, e respeita o tempo', async () => {
  const { runDailyMarketingCatchUp } = await import('../server/production/antiFallEngine.js');
  resetMemoryDb();
  await seedPortalProjectsIfEmpty();
  await updateMasterAutomationControl('owner_3', { globalEnabled: true, pauseAllExternalApis: false } as any);
  const at = (iso: string) => Date.parse(iso);
  assert.equal((await runDailyMarketingCatchUp({ budgetMs: 200_000, nowMs: at('2026-11-18T11:00:00Z') })).reason, 'fora_do_horario', '8h de Brasília');
  assert.equal((await runDailyMarketingCatchUp({ budgetMs: 100_000, nowMs: at('2026-11-18T14:00:00Z') })).reason, 'sem_tempo_neste_ciclo');
  const first = await runDailyMarketingCatchUp({ budgetMs: 200_000, nowMs: at('2026-11-18T14:00:00Z'), userId: 'owner_3' });
  assert.equal(first.ran, true);
  assert.ok((first.generatedCount || 0) > 0);
  const second = await runDailyMarketingCatchUp({ budgetMs: 200_000, nowMs: at('2026-11-18T14:05:00Z'), userId: 'owner_3' });
  assert.equal(second.reason, 'ja_concluido_hoje');
});

test('Refazer o que não saiu hoje: libera só quem não publicou e divulga artigos de hoje sem duplicar', async () => {
  const { redoTodayMissingPublications } = await import('../server/production/redoToday.js');
  const { runDailyMarketingCatchUp } = await import('../server/production/antiFallEngine.js');
  const { stableId } = await import('../server/production/store.js');
  resetMemoryDb();
  await seedPortalProjectsIfEmpty();
  await updateMasterAutomationControl('owner_4', { globalEnabled: true, pauseAllExternalApis: false } as any);
  const db = firestore();
  for (const provider of ['facebook', 'linkedin', 'instagram']) {
    await db.collection(COLLECTIONS.socialConnections).doc(`c4_${provider}`).set({ id: `c4_${provider}`, userId: 'owner_4', companyId: 'proj_exu_responde', provider, status: 'connected', accessToken: 'tok', expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  }
  const today = new Date().toISOString().slice(0, 10);
  const claim = (pid: string) => db.collection(COLLECTIONS.idempotency).doc(stableId(`portal-daily-marketing:owner_4:${pid}:${today}`));
  // Como ficou hoje com o código antigo: Exu publicou, os outros só geraram.
  const projects = (await listAllPortalProjectsFromDb()).filter((p: any) => p.active !== false && p.dailyMarketingEnabled !== false);
  for (const p of projects) await claim(p.id).set({ status: 'completed', scheduleId: p.id === 'proj_exu_responde' ? 'sched_exu' : null, attempts: 1 });
  await db.collection(COLLECTIONS.systemSettings).doc(`daily_marketing_done_${today}`).set({ date: today });
  const nowIsoStr = new Date().toISOString();
  await db.collection(COLLECTIONS.blogArticles).doc('art_magia').set({ id: 'art_magia', slug: 'oracao-magia', title: 'Oração da prosperidade', excerpt: 'Resumo', status: 'published', publishedAt: nowIsoStr, relatedProjectId: 'proj_magia_crencas', coverImage: 'https://example.com/c.jpg' });
  await db.collection(COLLECTIONS.blogArticles).doc('art_exu').set({ id: 'art_exu', slug: 'exu', title: 'Artigo do Exu', status: 'published', publishedAt: nowIsoStr, relatedProjectId: 'proj_exu_responde', coverImage: 'https://example.com/e.jpg' });
  await db.collection(COLLECTIONS.scheduledPosts).doc('blog-sched-' + stableId('art_exu:social').slice(0, 48)).set({ id: 'x', status: 'published' });

  const r = await redoTodayMissingPublications('owner_4');
  assert.equal(r.dailyReleased.length, projects.length - 1);
  assert.ok(!r.dailyReleased.includes('Exu Responde'), 'Exu já publicou: não repete');
  assert.deepEqual(r.articlesScheduled.map((a) => a.title), ['Oração da prosperidade']);
  assert.deepEqual(r.articlesScheduled[0].platforms, ['facebook', 'instagram', 'linkedin']);
  // O worker de 5 min refaz a divulgação dos liberados, agora publicando nas contas oficiais.
  const brHour = new Date(Date.now() - 3 * 3600_000).getUTCHours();
  const nowForCatchUp = brHour >= 10 && brHour < 22 ? Date.now() : Date.parse(`${today}T15:00:00Z`);
  const c = await runDailyMarketingCatchUp({ budgetMs: 200_000, nowMs: nowForCatchUp, userId: 'owner_4' });
  assert.equal(c.ran, true);
  assert.equal(c.scheduledCount, projects.length - 1);
  // Rodar o "refazer" de novo não libera mais nada.
  const again = await redoTodayMissingPublications('owner_4');
  assert.equal(again.dailyReleased.length, 0);
  assert.equal(again.articlesScheduled.length, 0);
});
