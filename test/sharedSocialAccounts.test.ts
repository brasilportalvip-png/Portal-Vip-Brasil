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
