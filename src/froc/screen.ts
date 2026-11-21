/**
 * Resumo do que está na tela agora, para o Froc (modo dono) responder com precisão.
 * Lê só o que é visível no site: títulos, avisos, botões, campos e textos.
 * Nunca lê senhas, campos ocultos nem a própria conversa do Froc.
 */
const SKIP_SELECTOR = '[data-testid="froc-dock"], [data-testid="froc-home"], [data-froc-private], script, style, noscript, svg';
const MAX_ITEM = 160;

function clean(text: string | null | undefined, max = MAX_ITEM): string {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest(SKIP_SELECTOR)) return false;
  if (el.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
}

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function fieldLabel(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
  return clean(el.getAttribute('aria-label') || byFor || el.closest('label')?.textContent || (el as any).placeholder || el.name || 'campo', 60);
}

export function captureScreenSummary(maxChars = 3500): string | null {
  if (typeof document === 'undefined') return null;
  // Conversa do Froc em tela cheia: a "tela" é a própria conversa, não há página para descrever.
  if (document.querySelector('[data-testid="froc-home"]')) return null;

  const root = document.querySelector('main') || document.body;
  const lines: string[] = [];
  const buttons: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    if (!line || seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const nodes = root.querySelectorAll('h1, h2, h3, h4, [role="alert"], [aria-live], p, li, td, th, dt, dd, label, button, a[href], [role="button"], input, textarea, select');
  for (const el of Array.from(nodes)) {
    if (!isVisible(el)) continue;
    const mark = inViewport(el) ? '▶ ' : '';
    const tag = el.tagName.toLowerCase();

    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const type = (field as HTMLInputElement).type || '';
      if (['password', 'hidden', 'file'].includes(type)) continue;
      let value = '';
      if (tag === 'select') value = clean((field as HTMLSelectElement).selectedOptions?.[0]?.textContent, 60);
      else if (type === 'checkbox' || type === 'radio') value = (field as HTMLInputElement).checked ? 'marcado' : 'desmarcado';
      else value = clean(field.value, 60);
      push(`${mark}Campo "${fieldLabel(field)}": ${value || '(vazio)'}`);
      continue;
    }
    if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button') {
      const label = clean(el.getAttribute('aria-label') || el.textContent, 50);
      if (label && !buttons.includes(label)) buttons.push(label);
      continue;
    }
    // Texto de bloco: evita repetir o texto de um filho que já tem a própria linha.
    if (['p', 'li', 'td', 'th', 'dt', 'dd', 'label'].includes(tag) && el.querySelector('h1, h2, h3, h4, p, li, table')) continue;
    const text = clean(el.textContent);
    if (!text) continue;
    if (/^h[1-4]$/.test(tag)) push(`${mark}# ${text}`);
    else if (el.getAttribute('role') === 'alert' || el.hasAttribute('aria-live')) push(`${mark}[AVISO] ${text}`);
    else push(`${mark}${text}`);
  }

  const doc = document.documentElement;
  const scrollable = Math.max(0, doc.scrollHeight - window.innerHeight);
  const pct = scrollable ? Math.round((window.scrollY / scrollable) * 100) : 0;
  const header = [
    `Rolagem: ${scrollable ? `${pct}% da página` : 'página inteira cabe na tela'}`,
    '(▶ = aparecendo na tela agora)',
  ];
  const btnLine = buttons.length ? `Botões e links: ${buttons.slice(0, 40).join(' | ')}` : '';

  let out = header.join('\n');
  const budget = maxChars - out.length - btnLine.length - 4;
  let used = 0;
  const body: string[] = [];
  for (const line of lines) {
    if (used + line.length + 1 > budget) { body.push('… (tela continua)'); break; }
    body.push(line);
    used += line.length + 1;
  }
  out += '\n' + body.join('\n');
  if (btnLine) out += '\n' + btnLine;
  return out.slice(0, maxChars);
}

// ---------------------------------------------------------------------------
// Ações na tela (modo dono): rolar, clicar e preencher
// ---------------------------------------------------------------------------

const ACTION_SKIP = '[data-testid="froc-dock"], [data-testid="froc-home"], [data-froc-private]';
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Botões que mudam dados de verdade: o Froc só clica depois da confirmação do dono. */
export const RISKY_CLICK_RE = /excluir|apagar|deletar|remover|publicar|agendar|enviar|confirmar|salvar|pagar|comprar|assinar|sair|logout|desconectar|arquivar|cancelar|aprovar|disparar|gerar|criar|refazer|reenviar|desligar|ligar/;

function scrollPercent(): number {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return max ? Math.round((window.scrollY / max) * 100) : 100;
}

export function scrollScreen(to: string): { ok: boolean; summary: string } {
  const target = norm(String(to || ''));
  const page = window.innerHeight * 0.8;
  if (!target || /^(baixo|desce|descer|down|abaixo|mais)$/.test(target)) window.scrollBy({ top: page, behavior: 'smooth' });
  else if (/^(cima|sobe|subir|up|acima)$/.test(target)) window.scrollBy({ top: -page, behavior: 'smooth' });
  else if (/^(topo|inicio|comeco|top)$/.test(target)) window.scrollTo({ top: 0, behavior: 'smooth' });
  else if (/^(fim|final|rodape|bottom)$/.test(target)) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  else {
    const candidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, section, [id], label, p, li, button'))
      .filter((el) => !el.closest(ACTION_SKIP) && el.getClientRects().length > 0);
    const found = candidates.find((el) => norm(el.textContent || '').startsWith(target))
      || candidates.find((el) => norm(el.textContent || '').includes(target));
    if (!found) return { ok: false, summary: `Não achei "${to}" nesta tela para rolar até lá.` };
    found.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return { ok: true, summary: `Rolei até "${String(found.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)}".` };
  }
  return { ok: true, summary: `Rolei a tela (${target || 'baixo'}).` };
}

function clickableElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [role="tab"], [role="menuitem"], summary, input[type="checkbox"], input[type="radio"]'))
    .filter((el) => !el.closest(ACTION_SKIP) && el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled);
}

function labelOf(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
    return String(el.getAttribute('aria-label') || byFor || el.closest('label')?.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return String(el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
}

export function findClickTarget(label: string): HTMLElement | null {
  const target = norm(label);
  if (!target) return null;
  const items = clickableElements();
  return items.find((el) => norm(labelOf(el)) === target)
    || items.find((el) => norm(labelOf(el)).startsWith(target))
    || items.find((el) => norm(labelOf(el)).includes(target))
    || null;
}

export function clickOnScreen(label: string): { ok: boolean; summary: string } {
  const el = findClickTarget(label);
  if (!el) return { ok: false, summary: `Não achei botão ou link "${label}" nesta tela.` };
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.click();
  return { ok: true, summary: `Cliquei em "${labelOf(el).slice(0, 60)}".` };
}

function fieldElements(): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select'))
    .filter((el) => !el.closest(ACTION_SKIP) && el.getClientRects().length > 0 && !el.disabled
      && !['password', 'hidden', 'file', 'submit', 'button', 'checkbox', 'radio'].includes((el as HTMLInputElement).type || ''));
}

function fieldName(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
  return String(el.getAttribute('aria-label') || byFor || el.closest('label')?.textContent || (el as any).placeholder || el.name || '').replace(/\s+/g, ' ').trim();
}

/** Preenche como se fosse digitado (o React percebe a mudança). Nunca envia o formulário. */
export function fillOnScreen(field: string, value: string): { ok: boolean; summary: string } {
  const target = norm(field);
  const items = fieldElements();
  const el = items.find((f) => norm(fieldName(f)) === target)
    || items.find((f) => norm(fieldName(f)).startsWith(target))
    || items.find((f) => norm(fieldName(f)).includes(target));
  if (!el) return { ok: false, summary: `Não achei o campo "${field}" nesta tela.` };
  const text = String(value ?? '');
  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options).find((o) => norm(o.textContent || '') === norm(text))
      || Array.from(el.options).find((o) => norm(o.textContent || '').includes(norm(text)) || norm(o.value) === norm(text));
    if (!option) return { ok: false, summary: `O campo "${fieldName(el)}" não tem a opção "${text}".` };
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter ? setter.call(el, option.value) : (el.value = option.value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter ? setter.call(el, text) : (el.value = text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { ok: true, summary: `Preenchi "${fieldName(el).slice(0, 50)}" com "${text.slice(0, 80)}" (não enviei nada).` };
}

export function currentScrollPercent(): number {
  return typeof document === 'undefined' ? 0 : scrollPercent();
}
