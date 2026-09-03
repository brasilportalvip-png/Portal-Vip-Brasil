import test from 'node:test';
import assert from 'node:assert/strict';
import { firestore, resetMemoryDb } from '../server/production/store.js';
import {
  PORTAL_VIP_PROJECTS,
  getPortalProjectFromDb,
  listAllPortalProjectsFromDb
} from '../server/production/almaPortfolio.js';

test('Projetos oficiais: identidade canônica vence dados antigos sem apagar estado operacional', async () => {
  resetMemoryDb();

  const official = PORTAL_VIP_PROJECTS[0];
  const db = firestore();
  const ref = db.collection('projects').doc(official.id);

  await ref.set({
    id: official.id,
    slug: official.slug,
    name: 'Nome persistido antigo',
    logoUrl: 'https://legacy.invalid/logo.png',
    bannerUrl: 'https://legacy.invalid/banner.png',
    websiteUrl: 'https://legacy.invalid/site',
    active: false,
    dailyMarketingEnabled: false,
    dailyBlogEnabled: false,
    socialSettings: {
      instagramEnabled: false,
      facebookEnabled: true,
      linkedinEnabled: false,
      xEnabled: false,
      pinterestEnabled: true,
      youtubeEnabled: false,
      tiktokEnabled: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    operationalMarker: 'preservar'
  });

  await db.collection('projects').doc('proj_forged_extra').set({
    id: 'proj_forged_extra',
    slug: 'forged-extra',
    name: 'Projeto que não pertence ao registro oficial',
    active: true
  });

  const projects = await listAllPortalProjectsFromDb();
  assert.equal(projects.length, PORTAL_VIP_PROJECTS.length);
  assert.equal(projects.some((item) => item.id === 'proj_forged_extra'), false);

  const project = projects.find((item) => item.id === official.id)!;
  assert.equal(project.name, official.name);
  assert.equal(project.logoUrl, official.logoUrl);
  assert.equal(project.bannerUrl, official.bannerUrl);
  assert.equal(project.websiteUrl, official.websiteUrl);

  assert.equal(project.active, false);
  assert.equal(project.dailyMarketingEnabled, false);
  assert.equal(project.dailyBlogEnabled, false);
  assert.equal(project.socialSettings?.instagramEnabled, false);
  assert.equal(project.socialSettings?.pinterestEnabled, true);
  assert.equal((project as any).operationalMarker, 'preservar');
  assert.equal(project.createdAt, '2026-01-01T00:00:00.000Z');

  const persisted = (await ref.get()).data() as any;
  assert.equal(persisted.logoUrl, official.logoUrl);
  assert.equal(persisted.bannerUrl, official.bannerUrl);
  assert.equal(persisted.websiteUrl, official.websiteUrl);
  assert.equal(persisted.active, false);
  assert.equal(persisted.dailyMarketingEnabled, false);
  assert.equal(persisted.dailyBlogEnabled, false);
  assert.equal(persisted.operationalMarker, 'preservar');

  const individual = await getPortalProjectFromDb(official.slug);
  assert.equal(individual?.id, official.id);
  assert.equal(individual?.logoUrl, official.logoUrl);
  assert.equal(individual?.bannerUrl, official.bannerUrl);
  assert.equal(individual?.active, false);
  assert.equal((individual as any)?.operationalMarker, 'preservar');

  const forged = await getPortalProjectFromDb('proj_forged_extra');
  assert.equal(forged, undefined);
});
