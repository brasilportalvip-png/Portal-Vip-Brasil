import { isRemovedSocialProvider } from './social.js';

/**
 * Status real de um agendamento antigo: até o X ser retirado, os posts iam para X + Facebook + Instagram.
 * O X falhava ("credits depleted" = API do X sem créditos) e o post inteiro ficava como falha,
 * mesmo com Facebook e Instagram PUBLICADOS. Aqui, falha só de rede retirada não conta.
 */
export function effectiveScheduledStatus(post: any): { status: string; note?: string; ignoredProviders?: string[] } {
  const status = String(post?.status || '');
  const results: any[] = Array.isArray(post?.publicationResults) ? post.publicationResults : [];
  if (!['failed', 'requires_review'].includes(status) || !results.length) return { status };
  const providerOf = (r: any) => String(r?.provider || r?.platform || '').toLowerCase();
  const removed = (r: any) => isRemovedSocialProvider(providerOf(r)) || ['twitter', 'x (twitter)'].includes(providerOf(r));
  const failedResults = results.filter((r) => !r?.success);
  const kept = results.filter((r) => !removed(r));
  if (!failedResults.length || !failedResults.every(removed)) return { status };
  if (!kept.length || !kept.every((r) => r?.success && r?.externalId)) return { status };
  const ignored = [...new Set(failedResults.map(providerOf))];
  return {
    status: 'published',
    note: `Publicado em ${[...new Set(kept.map(providerOf))].join(', ')}. ${ignored.join('/').toUpperCase()} foi retirado do portal; a falha dele não conta.`,
    ignoredProviders: ignored
  };
}

export function withEffectiveStatus<T extends Record<string, any>>(post: T): T {
  const eff = effectiveScheduledStatus(post);
  if (eff.status === post.status) return post;
  return { ...post, status: eff.status, originalStatus: post.status, statusNote: eff.note, errorMessage: null };
}
