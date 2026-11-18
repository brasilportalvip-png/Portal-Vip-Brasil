import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNicheVisualGuidance } from '../server/production/ai.js';
import { PORTAL_VIP_PROJECTS } from '../server/production/almaPortfolio.js';

const style = (company: any, theme = '') => resolveNicheVisualGuidance(company, theme, theme).styleDescription;

test('Imagem: cada projeto oficial recebe o estilo do próprio nicho', () => {
  const byName = (n: string) => PORTAL_VIP_PROJECTS.find((p: any) => p.name.includes(n))!;
  assert.match(style(byName('Magia das Crenças'), 'Oração da manhã'), /sol radiante/);
  assert.match(style(byName('Exu Responde'), 'Oração da manhã'), /encruzilhada/);
  assert.match(style(byName('Maria Padilha'), 'Oração da manhã'), /rosas vermelhas/);
  assert.match(style(byName('Manual Católico'), 'Tarô'), /terço/);
  assert.match(style(byName('Oráculos'), 'Oração'), /cartomancia/);
  assert.match(style(byName('Froc IA'), 'Oração'), /cyberfuturista/);
});

test('Imagem: "magia" e "energia" não viram tecnologia neon; acentos são reconhecidos', () => {
  for (const t of ['Magia de proteção', 'Energia do dia', 'Bahia']) assert.doesNotMatch(style({ name: 'Projeto' }, t), /cyberfuturista/, t);
  assert.match(style({ name: 'Projeto' }, 'Oração de São Jorge'), /terço/);
  assert.match(style({ name: 'Projeto' }, 'Tarô do amor'), /cartomancia/);
  assert.match(style({ name: 'Projeto' }, 'Gratidão'), /sol radiante/);
  assert.doesNotMatch(style({ name: 'Loja' }, 'Promoção de sapatos'), /smartphone|métricas/);
});
