import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateScheduledContentForProvider } from '../server/production/socialMediaPublisher.js';
import { isLegacyUnsplashImage } from '../server/production/autopilotMultimediaR8.js';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('Presença obrigatória do Calendário Editorial no menu lateral e móvel', () => {
  const sidebar = source('src/components/Sidebar.tsx');
  const mobileDrawer = source('src/components/MobileDrawer.tsx');

  assert.ok(sidebar.includes("id: 'calendario'"));
  assert.ok(sidebar.includes("label: 'Calendário'"));

  assert.ok(mobileDrawer.includes("'calendario'"));
  assert.ok(mobileDrawer.includes("'Calendário'"));
});

test('YouTube: rejeição estrita de texto e de imagens (não substitui vídeo por imagem)', () => {
  // Apenas texto
  const textErr = validateScheduledContentForProvider('YouTube', {
    title: 'Exu Responde',
    body: 'Texto explicativo sobre espiritualidade'
  });
  assert.match(textErr || '', /YouTube exige um vídeo/i);

  // Imagem estática não é aceita no lugar de vídeo
  const imgErr = validateScheduledContentForProvider('YouTube', {
    title: 'Exu Responde',
    imageUrl: 'https://storage.googleapis.com/test-bucket/image.png',
    body: 'Tentativa de postar imagem no YouTube'
  });
  assert.match(imgErr || '', /YouTube exige um vídeo/i);

  // Vídeo é aceito
  const vidErr = validateScheduledContentForProvider('YouTube', {
    title: 'Exu Responde - Vídeo oficial',
    videoUrl: 'https://storage.googleapis.com/test-bucket/video.mp4'
  });
  assert.equal(vidErr, null);
});

test('Autopilot: proteção contra imagens legadas/repetidas do Unsplash', () => {
  assert.equal(isLegacyUnsplashImage('https://images.unsplash.com/photo-1518770660439-4636190af475'), true);
  assert.equal(isLegacyUnsplashImage('https://source.unsplash.com/random'), true);
  assert.equal(isLegacyUnsplashImage('https://storage.googleapis.com/portal-vip/generated-ai-image.webp'), false);
  assert.equal(isLegacyUnsplashImage(undefined), false);
});

test('Autopilot no modo Automático exclusivo para YouTube: vídeo Veo e parâmetros unlisted', () => {
  const autopilotSource = source('server/production/autopilotMultimediaR8.ts');

  // Verifica que o agendamento de YouTube exige vídeo e não aceita imagem
  assert.match(autopilotSource, /youtubePrivacyStatus:\s*'unlisted'/);
  assert.match(autopilotSource, /startVideoGenerationJob/);

  // Verifica que se o YouTube for selecionado e o pipeline de vídeo falhar, a falha é tratada como fatal
  assert.ok(autopilotSource.includes('if (youtubeSelected || imageTargets.length === 0)'));
});

test('Persistência obrigatória de videoJob: falha se não houver artefato persistido', () => {
  const autopilotSource = source('server/production/autopilotMultimediaR8.ts');

  // Validação explícita de persistência do videoJob no mediaGenerationJobs
  assert.ok(autopilotSource.includes('COLLECTIONS.mediaGenerationJobs'));
  assert.ok(autopilotSource.includes('doc(videoJob.id).get()'));

  // Validação de que o ciclo falha se não houver contentId, videoJobId ou scheduleId comprovado
  assert.ok(autopilotSource.includes('const hasArtifact = Boolean(contentId || videoJobId || scheduleId)'));
  assert.ok(autopilotSource.includes('Nenhum artefato persistido'));

  // Verificação no triggerUserAutopilotMultimediaR8
  assert.ok(autopilotSource.includes('const persisted = Boolean(confirmedContentId || confirmedVideoJobId || confirmedScheduleId)'));
  assert.ok(autopilotSource.includes("const stage = isVideoProcessing"));
});

test('Contrato inequívoco da API em /autopilot/trigger-now', () => {
  const routerSource = source('server/production/router.ts');
  const schedulerSource = source('server/production/scheduler.ts');

  // Rota responde com todos os campos exigidos
  assert.match(routerSource, /success:\s*result\.success/);
  assert.match(routerSource, /jobId:\s*result\.jobId/);
  assert.match(routerSource, /contentId:\s*result\.contentId/);
  assert.match(routerSource, /videoJobId:\s*result\.videoJobId/);
  assert.match(routerSource, /scheduleId:\s*result\.scheduleId/);
  assert.match(routerSource, /stage:\s*result\.stage/);
  assert.match(routerSource, /status:\s*result\.status/);
  assert.match(routerSource, /persisted:\s*result\.persisted/);
  assert.match(routerSource, /publicationConfirmed:\s*result\.publicationConfirmed/);

  // Scheduler exporta tipagem coerente
  assert.match(schedulerSource, /Promise<AutopilotExecutionResult>/);
});

test('Interface de usuário rejeita resultados com persisted !== true e detalha processamento Veo', () => {
  const pageSource = source('src/pages/AutopilotPage.tsx');

  assert.match(pageSource, /isPersisted\s*=\s*res\?\.persisted\s*===\s*true/);
  assert.match(pageSource, /if\s*\(!isSuccess\s*\|\|\s*!isPersisted\)/);
  assert.match(pageSource, /Vídeo em processamento pelo pipeline Veo/);
  assert.match(pageSource, /Job ID:\s*\$\{res\.videoJobId\}/);
  assert.match(pageSource, /O envio ao YouTube ainda não ocorreu/);
});

test('Envio ao YouTube configura unlisted e persiste resposta sanitizada', () => {
  const publisherSource = source('server/production/socialMediaPublisher.ts');
  const scheduledSource = source('server/production/scheduledPublisherR8.ts');

  // Verifica unlisted como padrão
  assert.match(publisherSource, /privacyStatus:\s*data\.privacyStatus\s*\|\|\s*'unlisted'/);

  // Verifica resposta sanitizada com ID e URL
  assert.match(publisherSource, /youtube\.com\/watch\?v=/);
  assert.match(publisherSource, /sanitizedResponse/);

  // Verifica persistência de youtubeVideoId e youtubeUrl no post e contentItem
  assert.match(scheduledSource, /youtubeVideoId:\s*youtubeResult\.externalId/);
  assert.match(scheduledSource, /youtubeUrl:/);
});
