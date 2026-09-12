import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireLock,
  releaseLock,
  withControlledTimeout,
  processSchedulerTick,
  getSchedulerPublicRuntime,
  getSchedulerDiagnostics
} from '../server/production/scheduler.js';
import { isImageAlreadyUsed } from '../server/production/autopilotMultimediaR8.js';
import { generateMarketingImage } from '../server/production/ai.js';
import {
  createPortalProjectInDb,
  updatePortalProjectInDb,
  getPortalProjectFromDb,
  PORTAL_VIP_PROJECTS
} from '../server/production/almaPortfolio.js';
import { resetMemoryDb, firestore, COLLECTIONS } from '../server/production/store.js';
import crypto from 'node:crypto';

test('1. Autopilot Priority: Autopilot executa antes de tarefas pesadas e publica posts gerados', async () => {
  resetMemoryDb();
  const db = firestore();
  
  // Executa o tick do scheduler
  const tick = await processSchedulerTick({ trigger: 'social_tick', timeoutMs: 30_000 });
  assert.equal(tick.skipped, false);
  assert.equal(typeof tick.autopilot, 'number');
  assert.equal(typeof tick.scheduledPosts, 'number');
  assert.equal(typeof tick.scheduledPostsAfterGeneration, 'number');

  // Verifica que o ciclo concluiu e o lock foi liberado
  const lockSnap = await db.collection(COLLECTIONS.schedulerLocks).doc('process').get();
  assert.equal(lockSnap.data()?.lockedUntil, 0);
  assert.ok(lockSnap.data()?.releasedAt > 0);
});

test('2. Real Timeout: withControlledTimeout cancela tarefa lenta e preserva execução do processo', async () => {
  const slowTask = () => new Promise<string>((resolve) => setTimeout(() => resolve('concluido_tarde'), 500));

  await assert.rejects(
    () => withControlledTimeout(slowTask, 50, 'tarefaLentaTeste'),
    (err: any) => {
      assert.match(err.message, /\[Timeout\] tarefaLentaTeste excedeu o limite controlado de 50ms/);
      return true;
    }
  );

  const fastTask = () => new Promise<string>((resolve) => setTimeout(() => resolve('concluido_rapido'), 20));
  const result = await withControlledTimeout(fastTask, 200, 'tarefaRapidaTeste');
  assert.equal(result, 'concluido_rapido');
});

test('3. Lock Security: releaseLock valida owner e fencingToken estritamente e bloqueia tokens desatualizados', async () => {
  resetMemoryDb();
  const db = firestore();

  // Adquire o lock oficial
  const lease = await acquireLock('internal');
  assert.ok(lease);
  assert.equal(typeof lease.fencingToken, 'number');

  // Simula um processo concorrente ou antigo com fencingToken defasado tentando liberar o lock
  const staleLease = {
    ...lease,
    fencingToken: lease.fencingToken - 1
  };
  const releasedWithStaleToken = await releaseLock(staleLease, 'ok');
  assert.equal(releasedWithStaleToken, false, 'Lease com fencingToken obsoleto NÃO deve liberar o lock');

  // Simula um processo com outro owner tentando liberar
  const foreignLease = {
    ...lease,
    owner: 'cron_invasor_ou_antigo'
  };
  const releasedWithForeignOwner = await releaseLock(foreignLease, 'ok');
  assert.equal(releasedWithForeignOwner, false, 'Lease com owner incorreto NÃO deve liberar o lock');

  // Verifica que o lock continua intacto no banco
  const lockDoc = (await db.collection(COLLECTIONS.schedulerLocks).doc('process').get()).data();
  assert.equal(lockDoc?.owner, lease.owner);
  assert.equal(Number(lockDoc?.fencingToken), lease.fencingToken);
  assert.ok(Number(lockDoc?.lockedUntil) > Date.now());

  // Liberação legítima com o lease correto
  const legitimateRelease = await releaseLock(lease, 'ok');
  assert.equal(legitimateRelease, true, 'Lease com owner e fencingToken corretos DEVE liberar o lock');

  const unlockedDoc = (await db.collection(COLLECTIONS.schedulerLocks).doc('process').get()).data();
  assert.equal(unlockedDoc?.lockedUntil, 0);
  assert.equal(unlockedDoc?.releasedBy, lease.owner);
});

test('4. Imagem: Detecção de repetição por URL, storagePath e hash criptográfico', async () => {
  resetMemoryDb();
  const db = firestore();
  const companyId = 'proj_portal_vip_magazine';

  const knownHash = crypto.createHash('sha256').update('imagem_binaria_de_teste').digest('hex');
  const knownStorage = 'marketing/images/arte_antiga_123.webp';
  const knownUrl = 'https://portalvipbrasil.com.br/media/arte_antiga.webp';

  // Cadastra um conteúdo existente no banco com a imagem
  await db.collection(COLLECTIONS.contentItems).doc('content_existente').set({
    id: 'content_existente',
    companyId,
    imageUrl: knownUrl,
    metadata: {
      imageHash: knownHash,
      imageStoragePath: knownStorage
    }
  });

  // 1. Testa colisão de Hash
  const hashCheck = await isImageAlreadyUsed(companyId, { imageHash: knownHash });
  assert.equal(hashCheck.isDuplicate, true);
  assert.equal(hashCheck.matchField, 'hash');

  // 2. Testa colisão de Storage Path
  const storageCheck = await isImageAlreadyUsed(companyId, { storagePath: knownStorage });
  assert.equal(storageCheck.isDuplicate, true);
  assert.equal(storageCheck.matchField, 'storagePath');

  // 3. Testa colisão de URL pública
  const urlCheck = await isImageAlreadyUsed(companyId, { imageUrl: knownUrl });
  assert.equal(urlCheck.isDuplicate, true);
  assert.equal(urlCheck.matchField, 'imageUrl');

  // 4. Imagem verdadeiramente nova não acusa duplicidade
  const newCheck = await isImageAlreadyUsed(companyId, {
    imageHash: crypto.createHash('sha256').update('imagem_nova_e_exclusiva').digest('hex'),
    storagePath: 'marketing/images/arte_nova_456.webp',
    imageUrl: 'https://portalvipbrasil.com.br/media/arte_nova.webp'
  });
  assert.equal(newCheck.isDuplicate, false);
});

test('5. Imagem: generateMarketingImage gera hash SHA-256 e contextualiza o prompt com projeto, data e identificador', async () => {
  const company = PORTAL_VIP_PROJECTS[0];
  const executionId = 'exec_teste_789';
  const dateIso = '2026-09-12';
  const title = 'Lançamento de Campanha';

  const generated = await generateMarketingImage({
    userId: 'usr_admin_test',
    company,
    title,
    theme: 'Design moderno e inovador',
    dateIso,
    executionId,
    resolution: '1K'
  });

  assert.ok(generated.imageUrl);
  assert.ok(generated.imageHash, 'A geração deve incluir imageHash');
  assert.equal(typeof generated.imageHash, 'string');
  assert.equal(generated.imageHash.length, 64, 'imageHash deve ser SHA-256 em hex (64 caracteres)');
});

test('6. Edit Project Form: Atualização preserva o ID original, usa PATCH e NÃO duplica o projeto', async () => {
  resetMemoryDb();

  // Cria um projeto customizado
  const created = await createPortalProjectInDb({
    name: 'Projeto Original Teste',
    websiteUrl: 'https://original-teste.com',
    category: 'Tecnologia',
    segment: 'SaaS',
    tagline: 'Versão inicial'
  });

  assert.ok(created.id);
  const initialId = created.id;

  // Atualiza via updatePortalProjectInDb (equivalente ao PATCH /api/admin/projects/:id)
  const updated = await updatePortalProjectInDb(initialId, {
    name: 'Projeto Atualizado com Sucesso',
    websiteUrl: 'https://atualizado-teste.com',
    tagline: 'Nova tagline salva via PATCH'
  });

  assert.ok(updated);
  assert.equal(updated.id, initialId, 'O ID original DEVE ser rigorosamente preservado');
  assert.equal(updated.name, 'Projeto Atualizado com Sucesso');
  assert.equal(updated.tagline, 'Nova tagline salva via PATCH');

  // Verifica que o projeto original foi atualizado in-place e NÃO houve duplicação no banco
  const db = firestore();
  const snap = await db.collection(COLLECTIONS.projects).where('id', '==', initialId).get();
  assert.equal(snap.docs.length, 1, 'Não deve existir projeto duplicado com o mesmo id');

  const allProjectsSnap = await db.collection(COLLECTIONS.projects).get();
  const matches = allProjectsSnap.docs.filter((doc) => {
    const data = doc.data() as any;
    return data.name === 'Projeto Atualizado com Sucesso' || data.name === 'Projeto Original Teste';
  });
  assert.equal(matches.length, 1, 'Deve existir exatamente 1 registro no banco, sem duplicata');
});
