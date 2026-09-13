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
  assert.match(read('.github/workflows/social-publications.yml'), /secrets\.CRON_SECRET/);
});

test('Vercel nao mistura functions com builds legados', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(Array.isArray(vercel.builds));
  assert.equal(vercel.functions, undefined);
});
