import test from 'node:test';
import assert from 'node:assert/strict';
import { firestore, resetMemoryDb } from '../server/production/store.js';
import {
  PORTAL_VIP_PROJECTS,
  getPortalProjectFromDb,
  listAllPortalProjectsFromDb,
  updatePortalProjectInDb,
  createPortalProjectInDb,
  deletePortalProjectInDb
} from '../server/production/almaPortfolio.js';

test('Prioridade 0 - Teste A: Edição de projeto oficial tem precedência estrita sobre dados de código', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[0];
  
  // 1. Atualizar projeto oficial com valores customizados do usuário
  const updated = await updatePortalProjectInDb(official.id, {
    name: 'Magia das Crenças - Versão Customizada',
    tagline: 'Minha nova tagline devocional personalizada',
    description: 'Nova descrição detalhada gravada pelo usuário no painel.',
    logoUrl: 'https://meudominio.com/logo-personalizado.png',
    bannerUrl: 'https://meudominio.com/banner-personalizado.jpg',
    highlights: ['Destaque 1 exclusivo', 'Destaque 2 exclusivo'],
    active: true
  });

  assert.ok(updated);
  assert.equal(updated.name, 'Magia das Crenças - Versão Customizada');
  assert.equal(updated.tagline, 'Minha nova tagline devocional personalizada');
  assert.equal(updated.logoUrl, 'https://meudominio.com/logo-personalizado.png');
  assert.equal(updated.bannerUrl, 'https://meudominio.com/banner-personalizado.jpg');

  // 2. Buscar individualmente e confirmar que valores editados continuam presentes
  const fetched = await getPortalProjectFromDb(official.id);
  assert.ok(fetched);
  assert.equal(fetched.name, 'Magia das Crenças - Versão Customizada');
  assert.equal(fetched.tagline, 'Minha nova tagline devocional personalizada');
  assert.equal(fetched.description, 'Nova descrição detalhada gravada pelo usuário no painel.');
  assert.equal(fetched.logoUrl, 'https://meudominio.com/logo-personalizado.png');
  assert.equal(fetched.bannerUrl, 'https://meudominio.com/banner-personalizado.jpg');
});

test('Prioridade 0 - Teste B: Criação de novo projeto customizado persiste e é retornado', async () => {
  resetMemoryDb();

  const newProject = await createPortalProjectInDb({
    name: 'Novo Portal Místico',
    websiteUrl: 'https://novoportalmistico.com.br',
    category: 'Espiritualidade',
    segment: 'Portal Digital',
    tagline: 'Conhecimento e sabedoria',
    description: 'Portal completo para estudos e rituais.',
    logoUrl: 'https://novoportalmistico.com.br/logo.png',
    bannerUrl: 'https://novoportalmistico.com.br/banner.jpg',
    highlights: ['Ritual diário', 'Consultas online'],
    keywords: ['espiritualidade', 'portal mistico'],
    active: true
  });

  assert.ok(newProject);
  assert.ok(newProject.id.startsWith('proj_novo_portal_mistico'));

  const fetched = await getPortalProjectFromDb(newProject.id);
  assert.ok(fetched);
  assert.equal(fetched.name, 'Novo Portal Místico');
  assert.equal(fetched.websiteUrl, 'https://novoportalmistico.com.br/');
  assert.equal(fetched.isSeedProject, false);
});

test('Prioridade 0 - Teste C: Edição de múltiplos campos simultaneamente com verificação pós-escrita', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[1]; // Exu Responde
  const updates = {
    name: 'Exu Responde Oráculo Supremo',
    tagline: 'Firmeza ancestral com direcionamento em tempo real',
    description: 'Novo compêndio oracular com respostas diretas dos guardiões.',
    category: 'Oráculos & Religiões Tradicionais',
    segment: 'Consultas Espirituais Especializadas',
    websiteUrl: 'https://exu-responde-oficial.com.br',
    logoUrl: 'https://exu-responde-oficial.com.br/guardiao-logo.svg',
    bannerUrl: 'https://exu-responde-oficial.com.br/encruzilhada-banner.jpg',
    targetAudience: 'Buscadores de direcionamento rápido e proteção espiritual',
    highlights: ['Tiragens ao vivo', 'Proteção de caminhos', 'App Android integrado'],
    keywords: ['exu', 'guardiao', 'oraculo', 'caminhos abertos'],
    socialMarketingAngles: ['Conselho direto do dia', 'Abertura imediata de caminhos'],
    bingSeoKeywords: ['oraculo exu online', 'consulta guardioes'],
    active: true,
    dailyMarketingEnabled: true,
    dailyBlogEnabled: false
  };

  const saved = await updatePortalProjectInDb(official.id, updates);
  assert.ok(saved);
  assert.equal(saved.name, updates.name);
  assert.equal(saved.tagline, updates.tagline);
  assert.equal(saved.dailyBlogEnabled, false);
  assert.equal(saved.websiteUrl, 'https://exu-responde-oficial.com.br/');

  // Checa diretamente no banco de dados Firestore para garantir que a verificação gravou tudo
  const dbSnap = await firestore().collection('projects').doc(official.id).get();
  assert.ok(dbSnap.exists);
  const data = dbSnap.data() as any;
  assert.equal(data.name, updates.name);
  assert.equal(data.tagline, updates.tagline);
  assert.equal(data.description, updates.description);
  assert.equal(data.dailyBlogEnabled, false);
});

test('Prioridade 0 - Teste D & E: listAllPortalProjectsFromDb não reverte edições para os dados padrão', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[2]; // Maria Padilha
  await updatePortalProjectInDb(official.id, {
    name: 'Maria Padilha - Templo Virtual Oficial',
    tagline: 'Amor, magnetismo e união',
    logoUrl: 'https://padilha.com/logo-exclusivo.png'
  });

  // Executa listAllPortalProjectsFromDb repetidamente simulando múltiplos acessos
  const list1 = await listAllPortalProjectsFromDb();
  const proj1 = list1.find((p) => p.id === official.id);
  assert.ok(proj1);
  assert.equal(proj1.name, 'Maria Padilha - Templo Virtual Oficial');
  assert.equal(proj1.tagline, 'Amor, magnetismo e união');
  assert.equal(proj1.logoUrl, 'https://padilha.com/logo-exclusivo.png');

  // Segunda leitura
  const list2 = await listAllPortalProjectsFromDb();
  const proj2 = list2.find((p) => p.id === official.id);
  assert.ok(proj2);
  assert.equal(proj2.name, 'Maria Padilha - Templo Virtual Oficial');
  assert.equal(proj2.tagline, 'Amor, magnetismo e união');
});

test('Prioridade 0 - Teste F: Concorrência com timestamp detecta conflito e impede sobrescrita cega', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[3]; // Manual Católico
  const updated1 = await updatePortalProjectInDb(official.id, {
    name: 'Manual Católico 1ª Edição'
  });
  assert.ok(updated1);

  // Tentativa de update passando um expectedUpdatedAt obsoleto (passado)
  await assert.rejects(
    async () => {
      await updatePortalProjectInDb(
        official.id,
        { name: 'Manual Católico Tentativa Concorrente' },
        { expectedUpdatedAt: '2020-01-01T00:00:00.000Z' }
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 409);
      assert.ok(String(err.message).includes('Conflito de edição'));
      return true;
    }
  );
});

test('Prioridade 0 - Teste G: Proteção dos 7 projetos semente contra exclusão', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[0];
  const deleteResult = await deletePortalProjectInDb(official.id);
  assert.equal(deleteResult.deleted, false);
  assert.equal(deleteResult.protected, true);

  // Confirma que o projeto ainda existe no banco
  const proj = await getPortalProjectFromDb(official.id);
  assert.ok(proj);
  assert.equal(proj.id, official.id);
});
