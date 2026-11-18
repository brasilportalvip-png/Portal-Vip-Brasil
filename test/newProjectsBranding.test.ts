import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectVideoNiche } from '../server/production/videoCatalog.js';
import { resolveFfmpegPath, resolveProjectBrand, fallbackOverlayCopy, localLogoFor } from '../server/production/videoBranding.js';
import { resolveNicheVisualGuidance, companyContext } from '../server/production/ai.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

// Projetos cadastrados depois (não fazem parte dos 7 iniciais).
const NOVOS: any[] = [
  { id: 'proj_pet', slug: 'pet-feliz', name: 'Pet Feliz', category: 'Pet Shop & Banho e Tosa', segment: 'Serviços para cães e gatos', websiteUrl: 'https://petfeliz.com.br', keywords: ['banho e tosa', 'pet shop'], tagline: 'Seu pet limpo e feliz.', highlights: ['Banho com produtos naturais', 'Busca e entrega'], logoUrl: '/icons/projects/oraculos.svg' },
  { id: 'proj_cafe', slug: 'cafe-da-serra', name: 'Café da Serra', category: 'Cafeteria artesanal', segment: 'Cafés especiais', playStoreUrl: 'https://play.google.com/store/apps/details?id=cafe.serra', hasApp: true, websiteUrl: 'https://cafedaserra.com', logoUrl: '' },
  { id: 'proj_cristais', slug: 'cristais-de-luz', name: 'Cristais de Luz', category: 'Terapias holísticas e cristais', segment: 'Loja esotérica', websiteUrl: 'https://cristaisdeluz.com.br' },
  { id: 'proj_casa', slug: 'casa-energia-solar', name: 'Casa Energia Solar', category: 'Energia solar residencial', segment: 'Instalação de painéis', websiteUrl: 'https://casaenergiasolar.com.br', logoUrl: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="20" fill="#15803d"/></svg>').toString('base64') }
];

test('Projeto novo: vídeo divulga o PRÓPRIO app/site, nunca o de outro projeto', () => {
  for (const p of NOVOS) {
    const n = projectVideoNiche(p, 'Promoção de inverno');
    assert.equal(n.appName, p.name, p.name);
    assert.ok(!/Portal Vip|Froc|Oráculos|Magia/.test(n.viralScript.callToAction), `${p.name}: CTA de outro projeto: ${n.viralScript.callToAction}`);
    assert.ok(n.viralScript.hashtags.every((h) => !/portalvip|froc|oraculo/i.test(h)), `${p.name}: hashtag de outro projeto`);
  }
  assert.match(projectVideoNiche(NOVOS[1], 'x').viralScript.callToAction, /Play Store/);
  assert.match(projectVideoNiche(NOVOS[0], 'x').viralScript.callToAction, /petfeliz\.com\.br/);
  // "Casa Energia Solar" não pode virar IA nem growth; pet shop também não.
  assert.equal(projectVideoNiche(NOVOS[3], 'Economia na conta de luz').id, 'projeto_personalizado');
  assert.equal(projectVideoNiche(NOVOS[0], 'Banho de cachorro').id, 'projeto_personalizado');
  // Os 7 iniciais continuam com o próprio nicho e CTA.
  for (const p of PORTAL_VIP_PROJECTS as any[]) assert.equal(projectVideoNiche(p, 'Oração').appProjectSlug, p.slug, p.name);
});

test('Projeto novo: imagem segue o nicho do próprio projeto', () => {
  assert.doesNotMatch(resolveNicheVisualGuidance(NOVOS[3], 'Economia').styleDescription, /cyber|altar|terço/);
  assert.match(resolveNicheVisualGuidance(NOVOS[2], 'Promoção').styleDescription, /altar místico|cristais/);
  assert.match(resolveNicheVisualGuidance(NOVOS[1], 'Cappuccino').styleDescription, /ultra-realista/);
});

test('Projeto novo: IA recebe o cadastro dele e o texto da tela usa o destino dele', () => {
  assert.match(companyContext(NOVOS[0]), /Promessa\/Slogan Oficial: Seu pet limpo e feliz/);
  assert.equal(fallbackOverlayCopy(NOVOS[0], 'Banho').ctaDetail, 'petfeliz.com.br');
  assert.equal(fallbackOverlayCopy(NOVOS[1], 'Café').ctaDetail, 'Na Play Store • cafedaserra.com');
  assert.equal(localLogoFor(NOVOS[1]), null, 'projeto novo sem logo não pode receber o logo do Portal');
});

test('Projeto novo: logo cadastrado (SVG do site ou data:) vira PNG e a cor sai do logo', async () => {
  const pet = await resolveProjectBrand(NOVOS[0]);
  assert.ok(pet.logoPath && fs.existsSync(pet.logoPath) && pet.logoPath.endsWith('.png'));
  pet.cleanup();
  const solar = await resolveProjectBrand(NOVOS[3]);
  assert.ok(solar.logoPath && fs.existsSync(solar.logoPath));
  assert.match(solar.brandColor, /^#[0-9A-F]{6}$/);
  assert.notEqual(solar.brandColor, '#B45309');
  solar.cleanup();
  const cafe = await resolveProjectBrand(NOVOS[1]);
  assert.equal(cafe.logoPath, null);
  assert.match(cafe.brandColor, /^#[0-9A-F]{6}$/i);
  cafe.cleanup();
  void os; void path; void resolveFfmpegPath;
});

test('Blog de projeto novo: capa mostra o próprio assunto (não vira vela/ritual da Magia das Crenças)', async () => {
  const { coverSceneGroupFor, coverNeedsThemeFix } = await import('../server/production/coverPhotoEngine.js');
  assert.equal(coverSceneGroupFor({ title: 'Como dar banho no seu cachorro com amor', relatedProjectId: 'proj_pet_feliz' }), 'tema_geral');
  assert.equal(coverSceneGroupFor({ title: 'Painel solar vale a pena em 2026?', relatedProjectId: 'proj_casa_solar' }), 'tema_geral');
  assert.equal(coverSceneGroupFor({ title: 'Qual app de corrida é mais barato?', relatedProjectId: 'proj_dinamico_1' }), 'tema_mobilidade');
  assert.equal(coverSceneGroupFor({ title: 'Tiragem de tarot do amor', relatedProjectId: 'proj_novo_tarot' }), 'proj_oraculos_ts');
  // Os iniciais e a revista não mudam.
  assert.equal(coverSceneGroupFor({ title: 'Oração do amor', relatedProjectId: 'proj_portal_vip_magazine' }), 'proj_portal_vip_magazine');
  assert.equal(coverSceneGroupFor({ title: 'Simpatia do amor' }), 'proj_maria_padilha');
  // Capa antiga errada (feita com o padrão da Magia) entra na fila para refazer.
  assert.equal(coverNeedsThemeFix({ title: 'Painel solar vale a pena?', relatedProjectId: 'proj_casa_solar', coverSceneGroup: 'proj_magia_crencas' }), true);
});

test('Agentes de IA: dossiê de projeto novo não herda site, logo nem ganchos de outro projeto', async () => {
  const { resetMemoryDb } = await import('../server/production/store.js');
  const { createPortalProjectInDb } = await import('../server/production/almaPortfolio.js');
  const { getMasterBrandDossier } = await import('../server/production/brandDossiers.js');
  resetMemoryDb();
  const created: any = await createPortalProjectInDb({ name: 'Pet Feliz Teste', websiteUrl: 'https://petfeliz.com.br', category: 'Pet Shop', description: 'Banho e tosa com produtos naturais para cães e gatos.', socialMarketingAngles: ['Seu pet cheiroso o dia todo', 'Busca e entrega grátis no bairro'] } as any);
  const d: any = await getMasterBrandDossier(created.id);
  assert.ok(d);
  assert.match(String(d.websiteUrl), /petfeliz\.com\.br/);
  assert.doesNotMatch(String(d.logoUrl), /froc-ia/);
  assert.deepEqual(d.conversionHooks.slice(0, 2), ['Seu pet cheiroso o dia todo', 'Busca e entrega grátis no bairro']);
});

test('Painel mostra todos os projetos cadastrados, não só os 7 iniciais', () => {
  const dash = fs.readFileSync(path.join(process.cwd(), 'src/pages/DashboardPage.tsx'), 'utf8');
  assert.match(dash, /apiRequest<[^>]*>\('\/api\/vitrine'\)/);
  assert.doesNotMatch(dash, /USER_PORTFOLIO_PROJECTS\.(map|length)/);
  assert.doesNotMatch(dash, /\(7 Sites/);
});
