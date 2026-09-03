import test from 'node:test';
import assert from 'node:assert/strict';
import { requireOwnedCompany } from '../server/production/router.js';
import { resetMemoryDb, firestore } from '../server/production/store.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

test('Portal privado: requireOwnedCompany aceita somente projetos oficiais e ignora companies arbitrárias', async () => {
  resetMemoryDb();

  const userA = 'usr_private_admin_a';
  const userB = 'usr_private_admin_b';
  const officialProject = PORTAL_VIP_PROJECTS[0];

  // 1. Projeto oficial sempre é resolvido como contexto virtual do usuário autenticado.
  const projectA = await requireOwnedCompany(userA, officialProject.id);
  assert.equal(projectA.id, officialProject.id);
  assert.equal(projectA.userId, userA);
  assert.equal(projectA.portalProject, true);
  assert.equal(projectA.virtual, true);

  // 2. O mesmo projeto oficial, quando resolvido por outra sessão autenticada de teste,
  // recebe o userId daquela sessão. Não existe documento company compartilhado.
  const projectB = await requireOwnedCompany(userB, officialProject.id);
  assert.equal(projectB.id, officialProject.id);
  assert.equal(projectB.userId, userB);

  // 3. Mesmo que exista um documento arbitrário na coleção antiga, ele NÃO pode
  // se tornar projeto operacional do Portal privado.
  const forgedCompanyId = 'comp_firestore_legada_falsa';
  await firestore().collection('companies').doc(forgedCompanyId).set({
    id: forgedCompanyId,
    userId: userA,
    name: 'Empresa Legada Forjada'
  });

  await assert.rejects(
    () => requireOwnedCompany(userA, forgedCompanyId),
    (err: any) => err?.statusCode === 404 && /Projeto oficial não encontrado|não autorizado/i.test(String(err?.message || ''))
  );

  // 4. ID inexistente também falha fechado.
  await assert.rejects(
    () => requireOwnedCompany(userA, 'proj_inexistente_999'),
    (err: any) => err?.statusCode === 404
  );
});
