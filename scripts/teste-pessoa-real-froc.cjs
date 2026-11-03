#!/usr/bin/env node
/**
 * TESTE DE PESSOA REAL — Froc na tela inicial do Portal VIP Brasil (site publicado).
 * Abre o navegador visível e usa o site como um visitante, no computador e no celular:
 * tela inicial estilo ChatGPT, rodapé só com Termos e Política, menu ☰, conversa com o Froc,
 * vitrine com o Froc acompanhando e volta para a conversa sem perder nada.
 * Usa só 1 mensagem por aparelho (o visitante tem limite de conversa por dia).
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');

const SITE = process.env.SITE_URL || 'https://portal-vip-brasil.vercel.app';
const resultados = [];
const passo = (aparelho, ok, texto) => { resultados.push(`${ok ? '✅ OK ' : '❌ ERRO'} [${aparelho}] ${texto}`); console.log(resultados[resultados.length - 1]); };

async function testar(nome, opcoes) {
  const browser = await chromium.launch({ headless: false, slowMo: 120 });
  const page = await (await browser.newContext({ ...opcoes, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })).newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  try {
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const home = page.getByTestId('froc-home');
    await home.waitFor({ timeout: 20000 });
    passo(nome, true, 'tela inicial é a conversa com o Froc (estilo ChatGPT)');
    passo(nome, /Eu sou o Froc/.test(await home.innerText()), 'Froc se apresenta e cumprimenta pela hora');
    const rodape = (await page.getByTestId('froc-footer').innerText()).replace(/\s+/g, ' ').trim();
    passo(nome, /Termos de uso/.test(rodape) && /Política de privacidade/.test(rodape) && rodape.length < 60, `rodapé só com Termos e Política ("${rodape}")`);

    await page.getByTestId('froc-menu-button').click();
    const menu = page.getByTestId('froc-menu-panel');
    await page.waitForTimeout(400);
    const textoMenu = await menu.innerText();
    passo(nome, /Nova conversa/.test(textoMenu) && /Vitrine de projetos/.test(textoMenu) && /Blog e posts/.test(textoMenu), 'menu ☰ com nova conversa, vitrine e posts');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await page.getByTestId('froc-input').fill('Oi Froc! Que projeto você me indica para começar?');
    await page.getByTestId('froc-send').click();
    const resposta = page.getByTestId('froc-reply').last();
    await resposta.waitFor({ timeout: 45000 });
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid="froc-reply"]');
      const el = els[els.length - 1];
      return el && el.textContent && el.textContent.trim().length > 10 && !el.querySelector('.animate-pulse');
    }, null, { timeout: 60000 });
    const txt = (await resposta.innerText()).trim();
    passo(nome, txt.length > 10, `Froc respondeu: "${txt.slice(0, 140)}"`);
    await page.screenshot({ path: `teste-pessoa-real-froc-${nome}.png` });

    await page.getByTestId('froc-menu-button').click();
    await page.waitForTimeout(400);
    await page.getByTestId('froc-menu-vitrine').click();
    await page.getByTestId('froc-dock').waitFor({ timeout: 20000 });
    passo(nome, /\/vitrine/.test(page.url()), 'menu ☰ abriu a vitrine');
    passo(nome, true, 'na vitrine o Froc continua junto (barra flutuante)');
    await page.getByTestId('froc-dock-open').click();
    await page.waitForTimeout(500);
    await page.getByText('Tela cheia').click();
    await home.waitFor({ timeout: 10000 });
    const aindaLa = (await page.getByTestId('froc-reply').last().innerText()).trim() === txt;
    passo(nome, aindaLa, 'voltou para a conversa em tela cheia sem perder a conversa');

    const graves = erros.filter((e) => !/ResizeObserver|Analytics|gtag/i.test(e));
    passo(nome, graves.length === 0, `sem erro de JavaScript${graves.length ? ': ' + graves[0].slice(0, 120) : ''}`);
  } catch (e) {
    passo(nome, false, `falhou: ${String(e.message || e).slice(0, 180)}`);
    await page.screenshot({ path: `teste-pessoa-real-froc-${nome}-erro.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`\n  TESTE DE PESSOA REAL — Froc — ${SITE}\n`);
  await testar('computador', { viewport: { width: 1366, height: 860 } });
  await testar('celular', { ...devices['Pixel 5'] });
  fs.writeFileSync('relatorio-pessoa-real-froc.txt', resultados.join('\n') + '\n', 'utf8');
  const erros = resultados.filter((r) => r.includes('ERRO')).length;
  console.log(`\n  RESULTADO: ${resultados.length - erros} OK, ${erros} com erro.\n`);
  console.log('  Agora teste como DONO: entre pelo menu ☰ > "Entrar (área do dono)" e diga:');
  console.log('  "Froc, que dia e que horas são, e qual é o meu nome?"  e depois  "Froc, como está o portal hoje?"\n');
  process.exit(erros ? 1 : 0);
})();
