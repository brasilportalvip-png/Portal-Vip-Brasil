import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('Calendário permite expandir dias com mais de três publicações', () => {
  const source = read('src/pages/CalendarPage.tsx');
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /Mostrar todas as publicações/);
  assert.match(source, /visiblePosts\.map/);
});

test('Worker social possui endpoint protegido e workflow frequente', () => {
  const router = read('server/production/router.ts');
  assert.match(router, /post\('\/cron\/social-publications'/);
  assert.match(router, /verifyCronAuthorization/);

  const workflow = YAML.parse(read('.github/workflows/social-publications.yml'));
  assert.ok(workflow.on.schedule.some((entry: any) => entry.cron === '*/5 * * * *'));
  assert.equal(workflow.concurrency.group, 'social-publications');
  assert.equal(workflow.jobs['publish-due-content']['timeout-minutes'], 5);
  assert.match(read('.github/workflows/social-publications.yml'), /secrets\.CRON_SECRET/);
  assert.match(read('.github/workflows/social-publications.yml'), /--max-time 270/);

  const worker = read('server/production/socialPublicationWorker.ts');
  assert.match(worker, /options\.timeoutMs \|\| 70_000/);
  assert.match(worker, /published: 0/);
  assert.match(worker, /requiresReview: 0/);
  assert.match(worker, /remaining: 0/);

  const publisher = read('server/production/scheduledPublisherR8.ts');
  assert.match(publisher, /publicationResults,\s*processingHeartbeatAt: nowIso\(\)/);
  assert.match(publisher, /Publicação adiada com segurança para o próximo ciclo/);
  assert.match(publisher, /allRequestedHaveResult/);
  assert.match(publisher, /status: finalStatus/);
});

test('Vercel nao mistura functions com builds legados', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(Array.isArray(vercel.builds));
  assert.equal(vercel.functions, undefined);
});

test('Estúdio exibe o job mais recente encerrado e sua mensagem real de erro', () => {
  const source = read('src/pages/CreateVideoPage.tsx');
  assert.match(source, /refreshedCurrent \|\| ongoing \|\| data\.jobs\[0\] \|\| null/);
  assert.match(source, /activeJob\.lastErrorMessage \|\| activeJob\.errorMessage \|\| activeJob\.error/);
});

test('Autopilot reaproveita o vídeo vertical nas redes adequadas sem incluir LinkedIn e X', () => {
  const autopilot = read('server/production/autopilotMultimediaR8.ts');
  assert.match(autopilot, /\['youtube', 'tiktok', 'facebook', 'instagram', 'pinterest'\]/);
  assert.match(autopilot, /imageTargets = targets\.filter\(\(target\) => !videoProviders\.has\(target\.provider\)\)/);
  assert.match(autopilot, /target\.provider !== 'pinterest' \|\| Boolean\(videoCoverImageUrl\)/);
  assert.match(autopilot, /imageTargets\.length > 0 \|\| pinterestVideoSelected \|\| mode !== 'automatic'/);

  const ai = read('server/production/ai.ts');
  assert.match(ai, /imageUrl: workingJob\.coverImageUrl \|\| ''/);
  assert.match(ai, /coverImageUrl: data\.coverImageUrl/);
});

test('Projetos novos herdam todas as sete redes conectadas do proprietário', () => {
  const autopilot = read('server/production/autopilotMultimediaR8.ts');
  for (const provider of ['Facebook', 'Instagram', 'LinkedIn', 'X', 'TikTok', 'YouTube', 'Pinterest']) {
    assert.match(autopilot, new RegExp(`['\"]${provider}['\"]`));
  }
  assert.match(autopilot, /DEFAULT_AUTOPILOT_TARGET_PLATFORMS/);
  assert.match(read('server/production/router.ts'), /\.\.\.DEFAULT_AUTOPILOT_TARGET_PLATFORMS/);
  assert.match(read('src\/pages\/AutopilotPage.tsx'), /defaultTargetPlatforms = channels\.map/);
});
