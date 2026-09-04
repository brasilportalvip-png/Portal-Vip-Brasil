import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('Autopilot recebe companies em todos os renderizadores principais', () => {
  const app = read('src/App.tsx');
  const alma = read('src/pages/AlmaLivingCore.tsx');
  assert.match(app, /<AutopilotPage\s+companies=\{companies\}/s);
  assert.match(alma, /<AutopilotPage\s+companies=\{companies\}/s);
});

test('Biblioteca global recebe companies e não depende de selectedCompany', () => {
  const app = read('src/App.tsx');
  const library = read('src/pages/ContentsLibraryPage.tsx');
  assert.match(app, /<ContentsLibraryPage\s+companies=\{companies\}/s);
  assert.ok(!/interface ContentsLibraryPageProps[\s\S]*selectedCompany:/.test(library));
});
