import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isUniversalAutoPublishSupported,
  validateScheduledContentForProvider,
  planTikTokVideoChunks
} from '../server/production/socialMediaPublisher.js';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const ALL = ['Facebook', 'Instagram', 'LinkedIn', 'X', 'TikTok', 'YouTube', 'Pinterest'];

test('R8: todas as sete redes são reconhecidas pelo publicador universal', () => {
  for (const provider of ALL) assert.equal(isUniversalAutoPublishSupported(provider), true, provider);
});

test('R8: requisitos de mídia são aplicados sem fingir suporte textual', () => {
  assert.equal(validateScheduledContentForProvider('Facebook', { body: 'texto' }), null);
  assert.equal(validateScheduledContentForProvider('LinkedIn', { body: 'texto' }), null);
  assert.equal(validateScheduledContentForProvider('X', { body: 'texto' }), null);
  assert.match(validateScheduledContentForProvider('Instagram', { body: 'texto' }) || '', /imagem|vídeo/i);
  assert.match(validateScheduledContentForProvider('TikTok', { body: 'texto' }) || '', /imagem|vídeo/i);
  assert.match(validateScheduledContentForProvider('Pinterest', { body: 'texto' }) || '', /imagem|vídeo/i);
  assert.match(validateScheduledContentForProvider('YouTube', { imageUrl: 'https://example.com/a.jpg' }) || '', /vídeo/i);
  assert.equal(validateScheduledContentForProvider('Instagram', { imageUrl: 'https://example.com/a.jpg' }), null);
  assert.equal(validateScheduledContentForProvider('TikTok', { videoUrl: 'https://example.com/a.mp4' }), null);
  assert.equal(validateScheduledContentForProvider('YouTube', { videoUrl: 'https://example.com/a.mp4' }), null);
});

test('R8: TikTok automático usa rascunho FILE_UPLOAD e não finge Direct Post público', () => {
  const publisher = source('server/production/socialMediaPublisher.ts');
  const social = source('server/production/social.ts');
  assert.match(publisher, /post\/publish\/inbox\/video\/init/);
  assert.match(publisher, /source: 'FILE_UPLOAD'/);
  assert.match(publisher, /requiresUserAction: true/);
  assert.match(publisher, /deliveryMode: 'draft'/);
  assert.match(social, /scope: 'user\.info\.basic,video\.upload'/);
  assert.ok(!social.includes("scope: 'user.info.basic,video.upload,video.publish'"));
});

test('R8.1: OAuth do X inclui media.write para imagem e vídeo', () => {
  const social = source('server/production/social.ts');
  assert.match(social, /tweet\.read tweet\.write users\.read media\.write offline\.access/);
});

test('R8.1: foto do TikTok usa Upload API MEDIA_UPLOAD e continua exigindo ação do usuário', () => {
  const publisher = source('server/production/socialMediaPublisher.ts');
  assert.match(publisher, /post_mode: 'MEDIA_UPLOAD'/);
  assert.match(publisher, /media_type: 'PHOTO'/);
  assert.match(publisher, /requiresUserAction: true/);
});

test('R8.1: vídeo TikTok acima de 64 MiB é dividido sequencialmente em múltiplos chunks', () => {
  const small = planTikTokVideoChunks(4 * 1024 * 1024);
  assert.equal(small.totalChunkCount, 1);
  assert.equal(small.chunkSize, 4 * 1024 * 1024);
  assert.deepEqual(small.ranges, [{ start: 0, endExclusive: 4 * 1024 * 1024 }]);

  const medium = planTikTokVideoChunks(64 * 1024 * 1024);
  assert.equal(medium.totalChunkCount, 1);

  const largeSize = 100 * 1024 * 1024 + 123;
  const large = planTikTokVideoChunks(largeSize);
  assert.equal(large.chunkSize, 32 * 1024 * 1024);
  assert.equal(large.totalChunkCount, 3);
  assert.equal(large.ranges[0].endExclusive - large.ranges[0].start, 32 * 1024 * 1024);
  assert.equal(large.ranges[1].endExclusive - large.ranges[1].start, 32 * 1024 * 1024);
  assert.equal(large.ranges[2].endExclusive, largeSize);
  assert.ok(large.ranges[2].endExclusive - large.ranges[2].start > 32 * 1024 * 1024);

  const publisher = source('server/production/socialMediaPublisher.ts');
  assert.match(publisher, /response\.status === 206/);
  assert.match(publisher, /for \(let index = 0; index < plan\.ranges\.length; index \+= 1\)/);
});

test('R8: scheduler delega publicação e recuperação ao pipeline multimídia', () => {
  const scheduler = source('server/production/scheduler.ts');
  assert.match(scheduler, /recoverStalePublishingPostsR8/);
  assert.match(scheduler, /processScheduledPostsR8/);
  assert.match(scheduler, /processAutopilotMultimediaR8/);
  assert.match(scheduler, /triggerUserAutopilotMultimediaR8/);
});

test('R8.1: link do artigo tem prioridade sobre o site do projeto quando for URL HTTPS', () => {
  const scheduled = source('server/production/scheduledPublisherR8.ts');
  assert.match(scheduled, /https\?:\\\/\\\//i);
  assert.match(scheduled, /content\.cta/);
  assert.match(scheduled, /scheduledProject\.websiteUrl/);
});

test('R8: vídeo Veo pode criar agendamento social durável após conclusão', () => {
  const ai = source('server/production/ai.ts');
  assert.match(ai, /autoPublishPlatforms\?: string\[\]/);
  assert.match(ai, /sched-video-/);
  assert.match(ai, /COLLECTIONS\.scheduledPosts/);
  assert.match(ai, /youtubePrivacyStatus/);
});

test('R8: calendário e Autopilot não ficam limitados a Facebook, LinkedIn e X', () => {
  const calendar = source('src/pages/CalendarPage.tsx');
  const autopilot = source('src/pages/AutopilotPage.tsx');
  for (const network of ALL) {
    assert.ok(calendar.includes(`id: '${network}'`), `Calendário sem ${network}`);
    assert.ok(autopilot.includes(`name: '${network}'`), `Autopilot sem ${network}`);
  }
  assert.ok(!calendar.includes("const filtered = prev.filter((p) => ['Facebook', 'LinkedIn', 'X'].includes(p));"));
  assert.ok(!autopilot.includes("cfg.targetPlatforms.filter((name) => ['Facebook','LinkedIn','X'].includes(name))"));
});

test('R8.1: Autopilot diário cobre os 7 dias e usa o ciclo das 10h', () => {
  const autopilot = source('server/production/autopilotMultimediaR8.ts');
  const router = source('server/production/router.ts');
  assert.match(autopilot, /\[0, 1, 2, 3, 4, 5, 6\]/);
  assert.match(router, /preferredDays: \[0, 1, 2, 3, 4, 5, 6\]/);
  assert.match(router, /preferredHours: \[10\]/);
});

test('R8.1: LinkedIn usa versão ativa por padrão sem depender de variável manual', () => {
  const config = source('server/config/index.ts');
  assert.match(config, /LINKEDIN_API_VERSION', '202608'/);
});

test('R8: frequência nativa da Vercel permanece exatamente uma vez ao dia', () => {
  const vercel = JSON.parse(source('vercel.json'));
  assert.deepEqual(vercel.crons, [{ path: '/api/cron/process', schedule: '0 13 * * *' }]);
});
