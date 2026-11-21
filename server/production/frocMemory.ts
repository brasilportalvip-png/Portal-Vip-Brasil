/** Memória longa do Froc: um documento por dono, com até 60 itens curtos. */
export const FROC_MEMORY_COLLECTION = 'froc_owner_memory';
export const FROC_MEMORY_MAX_ITEMS = 60;

export function cleanMemoryText(raw: unknown): string {
  return String(raw ?? '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** Chave de comparação (sem acento, minúscula) para não guardar repetido e para "esquecer". */
export const memoryKey = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
