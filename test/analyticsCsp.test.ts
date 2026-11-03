import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('CSP libera o Google Analytics (gtag) sem abrir outras origens de script', () => {
  const app = readFileSync('server/app.ts', 'utf8');
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const header = vercel.routes.find((r: any) => r.headers?.['Content-Security-Policy']).headers['Content-Security-Policy'] as string;
  for (const csp of [header, app]) {
    assert.match(csp, /script-src 'self' https:\/\/www\.googletagmanager\.com/);
    assert.match(csp, /https:\/\/\*\.google-analytics\.com/);
    assert.match(csp, /https:\/\/\*\.analytics\.google\.com/);
    assert.match(csp, /wss:\/\/generativelanguage\.googleapis\.com/);
    assert.doesNotMatch(csp, /script-src[^;"]*'unsafe-eval'/);
  }
  assert.match(JSON.stringify(vercel), /microphone=\(self\)/, 'microfone do Froc continua liberado');
});
