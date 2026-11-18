/**
 * Copia texto com segurança em qualquer navegador.
 * Usa a API moderna quando o navegador permite e cai para o método clássico
 * (textarea + execCommand) em celulares, webviews e páginas sem permissão.
 * Nunca lança erro: devolve true só quando o texto foi realmente copiado.
 */
export async function copyText(text: string): Promise<boolean> {
  const value = String(text ?? '');
  if (!value) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Sem permissão: tenta o método clássico abaixo.
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
