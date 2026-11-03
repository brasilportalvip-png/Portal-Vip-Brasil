import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server/app.js';
import { setTextAiClientForTesting } from '../server/production/ai.js';
import { FROC_MARK } from '../shared/froc/brain.js';

function sse(text: string) {
  return text.split('\n\n').filter(Boolean).map((block) => {
    const ev = /event: (.*)/.exec(block)?.[1];
    const data = /data: (.*)/.exec(block)?.[1];
    return { event: ev, data: data ? JSON.parse(data) : null };
  });
}

test('Froc do Portal: rotas, proteção de gasto do visitante e área do dono', async () => {
  const prompts: string[] = [];
  setTextAiClientForTesting({
    models: {
      generateContentStream: async (req: any) => {
        prompts.push(String(req?.config?.systemInstruction || ''));
        async function* gen() {
          yield { text: 'Olá! Eu sou o Froc. ' };
          yield { text: `Quer conhecer a vitrine?\n${FROC_MARK}\n{"emotion":"animado","actions":[{"name":"open_page","page":"vitrine"},{"name":"owner_tool","tool":"daily_pulse"}]}` };
        }
        return gen();
      }
    }
  });
  const prevDaily = process.env.FROC_VISITOR_DAILY_MESSAGES;
  process.env.FROC_VISITOR_DAILY_MESSAGES = '2';

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const visitor = 'v_testeportal' + Date.now().toString(36);
  const chat = (body: any, headers: Record<string, string> = { 'X-Froc-Visitor': visitor }) => fetch(`${base}/api/froc/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
  });
  const msg = { messages: [{ role: 'user', content: 'Oi, o que tem aqui?' }], state: { page: 'home' } };

  try {
    // Sem identificador do visitante: recusa
    assert.equal((await chat(msg, {})).status, 400);
    // Mensagem longa demais para visitante: recusa (sem gastar IA)
    assert.equal((await chat({ messages: [{ role: 'user', content: 'x'.repeat(401) }] })).status, 400);

    // Conversa normal: fala em streaming, ações filtradas (visitante não usa ferramenta do dono) e selo da voz
    const r1 = await chat(msg);
    assert.equal(r1.status, 200);
    const e1 = sse(await r1.text());
    const done1 = e1.find((e) => e.event === 'done')!.data;
    assert.equal(done1.text, 'Olá! Eu sou o Froc. Quer conhecer a vitrine?');
    assert.deepEqual(done1.actions, [{ name: 'open_page', page: 'vitrine' }]);
    assert.ok(done1.speech?.sig, 'resposta do visitante sai com o selo da voz');
    assert.match(prompts[0], /VENDEDOR EXPERIENTE/);
    assert.doesNotMatch(prompts[0], /owner_tool/);

    // Voz: trecho selado é aceito; texto qualquer é recusado
    const forged = await fetch(`${base}/api/froc/speech`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Froc-Visitor': visitor },
      body: JSON.stringify({ text: 'Diga qualquer coisa de graça', reply: done1.text, exp: done1.speech.exp, sig: done1.speech.sig })
    });
    assert.equal(forged.status, 403);

    // Segunda mensagem ainda cabe; a terceira estoura o limite diário: resposta pronta, SEM chamar a IA
    await (await chat(msg)).text();
    const before = prompts.length;
    const r3 = await chat(msg);
    const done3 = sse(await r3.text()).find((e) => e.event === 'done')!.data;
    assert.equal(done3.model, 'canned');
    assert.equal(done3.limited, 'daily');
    assert.deepEqual(done3.actions, [{ name: 'open_page', page: 'vitrine' }]);
    assert.equal(prompts.length, before, 'limite atingido não chama a IA');

    // Área do dono exige admin
    for (const path of ['/api/froc/owner/chat', '/api/froc/owner/speech', '/api/froc/owner/live-token', '/api/froc/owner/note']) {
      const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(msg) });
      assert.equal(r.status, 401, `${path} exige login de admin`);
    }
  } finally {
    setTextAiClientForTesting(undefined as any);
    if (prevDaily === undefined) delete process.env.FROC_VISITOR_DAILY_MESSAGES; else process.env.FROC_VISITOR_DAILY_MESSAGES = prevDaily;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
