import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encrypt,
  initYouTubeResumableUpload,
  listConnections,
  publishInstagramMedia,
  publishText
} from '../server/production/social.js';
import { COLLECTIONS, firestore, resetMemoryDb } from '../server/production/store.js';

async function seedConnection(data: {
  id: string;
  userId: string;
  companyId: string;
  provider: 'facebook' | 'instagram' | 'youtube';
  accountId: string;
  accountName: string;
}) {
  await firestore().collection(COLLECTIONS.socialConnections).doc(data.id).set({
    ...data,
    encryptedAccessToken: encrypt('test_social_access_token'),
    encryptedRefreshToken: null,
    status: 'connected',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
}

test('isolamento social: listConnections de proj_A não retorna conexões de proj_B', async () => {
  resetMemoryDb();
  const userId = 'usr_social_isolation';
  await seedConnection({
    id: 'conn_a',
    userId,
    companyId: 'proj_a',
    provider: 'facebook',
    accountId: 'page_a',
    accountName: 'Página A'
  });
  await seedConnection({
    id: 'conn_b',
    userId,
    companyId: 'proj_b',
    provider: 'facebook',
    accountId: 'page_b',
    accountName: 'Página B'
  });

  const connections = await listConnections(userId, 'proj_a');
  assert.equal(connections.length, 1);
  assert.equal(connections[0].companyId, 'proj_a');
  assert.equal(connections[0].accountId, 'page_a');
});

test('isolamento social: publishText não usa Facebook de outro projeto', async () => {
  resetMemoryDb();
  const userId = 'usr_publish_isolation';
  await seedConnection({
    id: 'conn_fb_b',
    userId,
    companyId: 'proj_b',
    provider: 'facebook',
    accountId: 'page_b',
    accountName: 'Página B'
  });

  const originalFetch = globalThis.fetch;
  let externalCalled = false;
  globalThis.fetch = (async () => {
    externalCalled = true;
    throw new Error('API externa não deveria ser chamada');
  }) as typeof fetch;

  try {
    const result = await publishText({
      userId,
      companyId: 'proj_a',
      provider: 'facebook',
      text: 'Publicação do projeto A'
    });

    assert.equal(result.externalState, 'confirmed_failed');
    assert.equal(result.externalId, null);
    assert.match(result.error || '', /não conectada para este projeto/i);
    assert.equal(externalCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('isolamento social: Instagram não usa conta de outro projeto', async () => {
  resetMemoryDb();
  const userId = 'usr_instagram_isolation';
  await seedConnection({
    id: 'conn_ig_b',
    userId,
    companyId: 'proj_b',
    provider: 'instagram',
    accountId: 'ig_b',
    accountName: '@projeto_b'
  });

  const originalFetch = globalThis.fetch;
  let externalCalled = false;
  globalThis.fetch = (async () => {
    externalCalled = true;
    throw new Error('API externa não deveria ser chamada');
  }) as typeof fetch;

  try {
    await assert.rejects(
      publishInstagramMedia({
        userId,
        companyId: 'proj_a',
        imageUrl: 'https://example.com/imagem.jpg',
        caption: 'Projeto A'
      }),
      /Instagram não conectada para este projeto/i
    );
    assert.equal(externalCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('isolamento social: YouTube não usa canal de outro projeto', async () => {
  resetMemoryDb();
  const userId = 'usr_youtube_isolation';
  await seedConnection({
    id: 'conn_yt_b',
    userId,
    companyId: 'proj_b',
    provider: 'youtube',
    accountId: 'channel_b',
    accountName: 'Canal B'
  });

  const originalFetch = globalThis.fetch;
  let externalCalled = false;
  globalThis.fetch = (async () => {
    externalCalled = true;
    throw new Error('API externa não deveria ser chamada');
  }) as typeof fetch;

  try {
    await assert.rejects(
      initYouTubeResumableUpload({
        userId,
        companyId: 'proj_a',
        title: 'Vídeo Projeto A',
        mimeType: 'video/mp4'
      }),
      /YouTube não conectado para este projeto/i
    );
    assert.equal(externalCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
