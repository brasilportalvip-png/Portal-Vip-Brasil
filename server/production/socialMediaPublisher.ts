import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { config } from '../config/index.js';
import { COLLECTIONS, firestore, nowIso } from './store.js';
import {
  ensureValidSocialAccessToken,
  findSocialConnection,
  normalizeProvider,
  publishInstagramMedia,
  publishText,
  type ExternalState,
  type SocialProvider
} from './social.js';

const MEDIA_FETCH_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 128 * 1024 * 1024;
const LINKEDIN_VIDEO_CHUNK_BYTES = 4 * 1024 * 1024;
const TIKTOK_MULTI_CHUNK_BYTES = 32 * 1024 * 1024;
const TIKTOK_WHOLE_UPLOAD_MAX_BYTES = 64 * 1024 * 1024;

export type MediaRequirement = 'none' | 'image_or_video' | 'video';

export interface ScheduledProviderOptions {
  youtubePrivacyStatus?: 'private' | 'unlisted' | 'public';
}

export interface ScheduledContentLike {
  title?: string;
  headline?: string;
  body?: string;
  cta?: string;
  hashtags?: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface UniversalPublishResult {
  provider: SocialProvider;
  externalId: string | null;
  externalState: ExternalState;
  retrySafe: boolean;
  success: boolean;
  error?: string;
  statusCode?: number;
  requiresUserAction?: boolean;
  deliveryMode?: 'published' | 'draft';
  externalUrl?: string;
  videoUrl?: string;
  rawResponse?: any;
}

interface SocialConnectionRecord {
  id: string;
  provider: SocialProvider;
  accountId?: string;
  pageId?: string;
  accountName?: string;
  scopes?: string[];
  [key: string]: any;
}

interface DownloadedMedia {
  buffer: Buffer;
  contentType: string;
  size: number;
}

export interface TikTokChunkPlan {
  chunkSize: number;
  totalChunkCount: number;
  ranges: Array<{ start: number; endExclusive: number }>;
}

/**
 * Planeja o FILE_UPLOAD conforme o Media Transfer Guide do TikTok.
 * Até 64 MiB o arquivo pode ir inteiro. Acima disso usamos blocos de 32 MiB
 * e incorporamos qualquer resto ao último bloco, mantendo pelo menos 2 partes.
 */
export function planTikTokVideoChunks(videoSize: number): TikTokChunkPlan {
  if (!Number.isSafeInteger(videoSize) || videoSize <= 0 || videoSize > MAX_VIDEO_BYTES) {
    throw new Error('Tamanho de vídeo inválido para upload no TikTok.');
  }

  if (videoSize <= TIKTOK_WHOLE_UPLOAD_MAX_BYTES) {
    return {
      chunkSize: videoSize,
      totalChunkCount: 1,
      ranges: [{ start: 0, endExclusive: videoSize }]
    };
  }

  const chunkSize = TIKTOK_MULTI_CHUNK_BYTES;
  const totalChunkCount = Math.floor(videoSize / chunkSize);
  if (totalChunkCount < 2) throw new Error('Planejamento de chunks do TikTok inconsistente.');

  const ranges = Array.from({ length: totalChunkCount }, (_, index) => {
    const start = index * chunkSize;
    const endExclusive = index === totalChunkCount - 1
      ? videoSize
      : Math.min(videoSize, start + chunkSize);
    return { start, endExclusive };
  });

  return { chunkSize, totalChunkCount, ranges };
}

async function uploadTikTokVideoChunks(uploadUrl: string, media: DownloadedMedia, plan: TikTokChunkPlan): Promise<void> {
  for (let index = 0; index < plan.ranges.length; index += 1) {
    const range = plan.ranges[index];
    const chunk = media.buffer.subarray(range.start, range.endExclusive);
    const isFinal = index === plan.ranges.length - 1;
    let uploaded = false;
    let lastStatus = 0;

    for (let attempt = 1; attempt <= 3 && !uploaded; attempt += 1) {
      const response = await providerFetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': media.contentType.startsWith('video/') ? media.contentType : 'video/mp4',
          'Content-Length': String(chunk.byteLength),
          'Content-Range': `bytes ${range.start}-${range.endExclusive - 1}/${media.size}`
        },
        body: chunk
      }, 120_000);
      lastStatus = response.status;

      const accepted = isFinal
        ? [200, 201, 204].includes(response.status)
        : response.status === 206;
      if (accepted) {
        uploaded = true;
        break;
      }

      if (response.status < 500 || attempt === 3) break;
      await wait(attempt * 750);
    }

    if (!uploaded) {
      throw new Error(`Falha ao enviar o bloco ${index + 1}/${plan.ranges.length} do vídeo ao TikTok (HTTP ${lastStatus || 'desconhecido'}).`);
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeErrorMessage(value: unknown, fallback: string): string {
  const text = String((value as any)?.message || value || fallback)
    .replace(/\b(?:EAA|IGQV|EAAB)[A-Za-z0-9_-]{10,}\b/g, '[TOKEN_REMOVIDO]')
    .replace(/(access_token|refresh_token|client_secret|authorization|code)\s*[=:]\s*[^&\s,;]+/gi, '$1=[REMOVIDO]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REMOVIDO]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  return (text || fallback).slice(0, 500);
}

async function providerFetch(input: string | URL, init: RequestInit = {}, timeoutMs = MEDIA_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: init.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpAddress(address: string): boolean {
  if (isPrivateIpv4(address)) return true;
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return false;
}

async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL de mídia inválida.');
  }
  if (url.protocol !== 'https:') throw new Error('A mídia precisa usar HTTPS.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || isPrivateIpAddress(host)) {
    throw new Error('A URL de mídia aponta para uma origem privada ou local e foi bloqueada.');
  }
  try {
    const resolved = await dns.lookup(host, { all: true, verbatim: true });
    if (!resolved.length || resolved.some((item) => isPrivateIpAddress(item.address))) {
      throw new Error('A URL de mídia resolve para uma rede privada e foi bloqueada.');
    }
  } catch (error: any) {
    if (/rede privada|bloqueada/i.test(String(error?.message || error))) throw error;
    throw new Error('Não foi possível validar o endereço público da mídia.');
  }
  return url;
}

async function downloadMedia(rawUrl: string, kind: 'image' | 'video'): Promise<DownloadedMedia> {
  let url = await assertPublicHttpsUrl(rawUrl);
  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  let response: Response | null = null;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    response = await providerFetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: kind === 'image' ? 'image/*' : 'video/mp4,video/*;q=0.9,application/octet-stream;q=0.5'
      }
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location || redirectCount === 3) throw new Error('A mídia excedeu o limite seguro de redirecionamentos.');
    try { await response.body?.cancel(); } catch {}
    url = await assertPublicHttpsUrl(new URL(location, url).toString());
  }
  if (!response) throw new Error('Não foi possível baixar a mídia.');
  if (!response.ok) throw new Error(`Não foi possível baixar a mídia (HTTP ${response.status}).`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error(`A mídia excede o limite seguro de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength <= 0 || arrayBuffer.byteLength > maxBytes) {
    throw new Error(`A mídia possui tamanho inválido ou excede ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  const contentType = String(response.headers.get('content-type') || (kind === 'video' ? 'video/mp4' : 'image/jpeg')).split(';')[0].trim();
  if (kind === 'image' && !contentType.startsWith('image/')) throw new Error('O endereço informado não retornou uma imagem válida.');
  if (kind === 'video' && !contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
    throw new Error('O endereço informado não retornou um vídeo válido.');
  }
  return { buffer: Buffer.from(arrayBuffer), contentType, size: arrayBuffer.byteLength };
}

async function getConnection(userId: string, companyId: string, provider: SocialProvider): Promise<{ connection: SocialConnectionRecord; token: string }> {
  const resolved = await findSocialConnection(userId, companyId, provider);
  if (!resolved) throw new Error(`Conta ${provider} não conectada para este projeto.`);
  const connection = { id: resolved.docId, ...(resolved.data as any) } as SocialConnectionRecord;
  const token = await ensureValidSocialAccessToken(resolved.docId);
  return { connection, token };
}

function success(provider: SocialProvider, externalId: string, extra: Partial<UniversalPublishResult> = {}): UniversalPublishResult {
  return {
    provider,
    externalId,
    externalState: 'confirmed_success',
    retrySafe: false,
    success: true,
    deliveryMode: 'published',
    ...extra
  };
}

function failure(provider: SocialProvider, error: string, retrySafe = true, statusCode?: number): UniversalPublishResult {
  return {
    provider,
    externalId: null,
    externalState: 'confirmed_failed',
    retrySafe,
    success: false,
    error: safeErrorMessage(error, `Falha ao publicar em ${provider}.`),
    ...(statusCode ? { statusCode } : {})
  };
}

function unknown(provider: SocialProvider, error: string, statusCode?: number): UniversalPublishResult {
  return {
    provider,
    externalId: null,
    externalState: 'unknown',
    retrySafe: false,
    success: false,
    error: safeErrorMessage(error, `Resultado incerto da publicação em ${provider}.`),
    ...(statusCode ? { statusCode } : {})
  };
}

export function isUniversalAutoPublishSupported(provider: string): boolean {
  return Boolean(normalizeProvider(provider));
}

export function mediaRequirementForProvider(provider: string): MediaRequirement | null {
  const normalized = normalizeProvider(provider);
  if (!normalized) return null;
  if (normalized === 'instagram' || normalized === 'tiktok') return 'image_or_video';
  if (normalized === 'youtube') return 'video';
  return 'none';
}

export function validateScheduledContentForProvider(
  provider: string,
  content: ScheduledContentLike
): string | null {
  const normalized = normalizeProvider(provider);
  if (!normalized) return `Rede social "${provider}" não reconhecida.`;
  const hasText = Boolean([content.headline, content.body, content.cta].some((value) => String(value || '').trim()));
  const hasImage = Boolean(String(content.imageUrl || '').trim());
  const hasVideo = Boolean(String(content.videoUrl || '').trim());

  if (normalized === 'instagram' && !hasImage && !hasVideo) {
    return 'Instagram exige imagem ou vídeo/Reel salvo na Biblioteca de Conteúdos.';
  }
  if (normalized === 'tiktok' && !hasImage && !hasVideo) {
    return 'TikTok exige imagem ou vídeo. No modo automático, o Portal envia como rascunho para conclusão no TikTok.';
  }
  if (normalized === 'youtube' && !hasVideo) {
    return 'YouTube exige um vídeo MP4 concluído e salvo na Biblioteca de Conteúdos.';
  }
  if ((normalized === 'facebook' || normalized === 'linkedin') && !hasText && !hasImage && !hasVideo) {
    return `${normalized} exige texto, imagem ou vídeo para publicação.`;
  }
  return null;
}

function buildText(content: ScheduledContentLike): string {
  return [content.headline, content.body, content.cta, ...(Array.isArray(content.hashtags) ? content.hashtags : [])]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

async function publishFacebookMedia(data: {
  userId: string;
  companyId: string;
  text: string;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<UniversalPublishResult> {
  if (!data.imageUrl && !data.videoUrl) {
    const textResult = await publishText({ userId: data.userId, companyId: data.companyId, provider: 'facebook', text: data.text });
    return { ...textResult, externalId: textResult.externalId ?? null, success: textResult.externalState === 'confirmed_success', ...(textResult.externalState === 'confirmed_success' ? { deliveryMode: 'published' as const } : {}) };
  }

  try {
    const { connection, token } = await getConnection(data.userId, data.companyId, 'facebook');
    const pageId = String(connection.accountId || connection.pageId || '');
    if (!pageId) return failure('facebook', 'Identificador da Página do Facebook não encontrado.', false);

    const endpoint = data.videoUrl
      ? `https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(pageId)}/videos`
      : `https://graph.facebook.com/${config.social.meta.graphVersion}/${encodeURIComponent(pageId)}/photos`;
    const params = new URLSearchParams({ access_token: token });
    if (data.videoUrl) {
      params.set('file_url', data.videoUrl);
      params.set('description', data.text.slice(0, 10_000));
      params.set('title', data.title.slice(0, 255));
      params.set('published', 'true');
    } else {
      params.set('url', data.imageUrl!);
      params.set('caption', data.text.slice(0, 10_000));
      params.set('published', 'true');
    }

    const response = await providerFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const json = await response.json().catch(() => ({} as any));
    if (response.status >= 500) return unknown('facebook', `Erro interno da Meta (HTTP ${response.status}).`, response.status);
    if (!response.ok) {
      const authError = json?.error?.code === 190 || json?.error?.type === 'OAuthException';
      return failure('facebook', json?.error?.message || `Facebook rejeitou a mídia (HTTP ${response.status}).`, !authError, response.status);
    }
    const id = json.post_id || json.id;
    return id ? success('facebook', String(id)) : unknown('facebook', 'Facebook aceitou a mídia, mas não retornou um ID confiável.', response.status);
  } catch (error: any) {
    return /timeout|fetch failed|network/i.test(String(error?.message || error))
      ? unknown('facebook', error)
      : failure('facebook', error?.message || String(error), false);
  }
}

function linkedinHeaders(token: string): Record<string, string> {
  if (!config.social.linkedin.apiVersion) throw new Error('LINKEDIN_API_VERSION precisa estar configurada para publicar mídia no LinkedIn.');
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': config.social.linkedin.apiVersion,
    'X-Restli-Protocol-Version': '2.0.0'
  };
}

async function linkedinCreatePost(token: string, ownerUrn: string, text: string, mediaUrn: string): Promise<UniversalPublishResult> {
  const response = await providerFetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: { ...linkedinHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: ownerUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: mediaUrn } },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    })
  });
  if (response.status >= 500) return unknown('linkedin', `Erro interno do LinkedIn (HTTP ${response.status}).`, response.status);
  const responseText = await response.text().catch(() => '');
  if (!response.ok) return failure('linkedin', responseText || `LinkedIn rejeitou a publicação (HTTP ${response.status}).`, response.status !== 401, response.status);
  const id = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id');
  return id ? success('linkedin', id) : unknown('linkedin', 'LinkedIn aceitou a publicação sem retornar x-restli-id.', response.status);
}

async function publishLinkedInMedia(data: {
  userId: string;
  companyId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<UniversalPublishResult> {
  if (!data.imageUrl && !data.videoUrl) {
    const textResult = await publishText({ userId: data.userId, companyId: data.companyId, provider: 'linkedin', text: data.text });
    return { ...textResult, externalId: textResult.externalId ?? null, success: textResult.externalState === 'confirmed_success', ...(textResult.externalState === 'confirmed_success' ? { deliveryMode: 'published' as const } : {}) };
  }

  try {
    const { connection, token } = await getConnection(data.userId, data.companyId, 'linkedin');
    const ownerId = String(connection.accountId || '');
    if (!ownerId) return failure('linkedin', 'Identificador da conta LinkedIn não encontrado.', false);
    const ownerUrn = ownerId.startsWith('urn:li:') ? ownerId : `urn:li:person:${ownerId}`;

    if (data.imageUrl) {
      const media = await downloadMedia(data.imageUrl, 'image');
      const init = await providerFetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: { ...linkedinHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } })
      });
      const initJson = await init.json().catch(() => ({} as any));
      if (!init.ok || !initJson?.value?.uploadUrl || !initJson?.value?.image) {
        return failure('linkedin', initJson?.message || `Falha ao inicializar imagem no LinkedIn (HTTP ${init.status}).`, init.status !== 401, init.status);
      }
      const upload = await providerFetch(initJson.value.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': media.contentType, 'Content-Length': String(media.size) },
        body: media.buffer
      });
      if (!upload.ok) return failure('linkedin', `Falha ao enviar imagem ao LinkedIn (HTTP ${upload.status}).`, true, upload.status);
      return linkedinCreatePost(token, ownerUrn, data.text, String(initJson.value.image));
    }

    const media = await downloadMedia(data.videoUrl!, 'video');
    const init = await providerFetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
      method: 'POST',
      headers: { ...linkedinHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: ownerUrn,
          fileSizeBytes: media.size,
          uploadCaptions: false,
          uploadThumbnail: false
        }
      })
    });
    const initJson = await init.json().catch(() => ({} as any));
    const value = initJson?.value;
    if (!init.ok || !value?.video || !Array.isArray(value.uploadInstructions) || value.uploadInstructions.length === 0) {
      return failure('linkedin', initJson?.message || `Falha ao inicializar vídeo no LinkedIn (HTTP ${init.status}).`, init.status !== 401, init.status);
    }

    const uploadedPartIds: string[] = [];
    for (const instruction of value.uploadInstructions) {
      const first = Math.max(0, Number(instruction.firstByte || 0));
      const last = Math.min(media.size - 1, Number(instruction.lastByte ?? Math.min(first + LINKEDIN_VIDEO_CHUNK_BYTES - 1, media.size - 1)));
      const chunk = media.buffer.subarray(first, last + 1);
      const upload = await providerFetch(String(instruction.uploadUrl), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(chunk.length) },
        body: chunk
      }, 60_000);
      if (!upload.ok) return failure('linkedin', `Falha ao enviar parte do vídeo ao LinkedIn (HTTP ${upload.status}).`, true, upload.status);
      const etag = String(upload.headers.get('etag') || '').replace(/^"|"$/g, '');
      if (!etag) return unknown('linkedin', 'LinkedIn recebeu uma parte do vídeo sem retornar ETag; não é seguro finalizar automaticamente.');
      uploadedPartIds.push(etag);
    }

    const finalize = await providerFetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
      method: 'POST',
      headers: { ...linkedinHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalizeUploadRequest: { video: value.video, uploadToken: value.uploadToken || '', uploadedPartIds } })
    });
    if (finalize.status >= 500) return unknown('linkedin', `Erro interno ao finalizar vídeo no LinkedIn (HTTP ${finalize.status}).`, finalize.status);
    if (!finalize.ok) {
      const text = await finalize.text().catch(() => '');
      return failure('linkedin', text || `Falha ao finalizar vídeo no LinkedIn (HTTP ${finalize.status}).`, finalize.status !== 401, finalize.status);
    }
    return linkedinCreatePost(token, ownerUrn, data.text, String(value.video));
  } catch (error: any) {
    return /timeout|fetch failed|network/i.test(String(error?.message || error))
      ? unknown('linkedin', error)
      : failure('linkedin', error?.message || String(error), false);
  }
}

async function publishTikTokDraft(data: {
  userId: string;
  companyId: string;
  title: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<UniversalPublishResult> {
  try {
    const { token } = await getConnection(data.userId, data.companyId, 'tiktok');
    let endpoint: string;
    let body: any;
    if (data.videoUrl) {
      const media = await downloadMedia(data.videoUrl, 'video');
      endpoint = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
      const chunkPlan = planTikTokVideoChunks(media.size);
      body = {
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: media.size,
          chunk_size: chunkPlan.chunkSize,
          total_chunk_count: chunkPlan.totalChunkCount
        }
      };

      const initResponse = await providerFetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body)
      });
      const initJson = await initResponse.json().catch(() => ({} as any));
      if (initResponse.status >= 500) return unknown('tiktok', `Erro interno do TikTok (HTTP ${initResponse.status}).`, initResponse.status);
      if (!initResponse.ok || (initJson?.error?.code && initJson.error.code !== 'ok')) {
        return failure('tiktok', initJson?.error?.message || initJson?.message || `TikTok rejeitou a inicialização do rascunho (HTTP ${initResponse.status}).`, initResponse.status !== 401, initResponse.status);
      }
      const publishId = String(initJson?.data?.publish_id || '');
      const uploadUrl = String(initJson?.data?.upload_url || '');
      if (!publishId || !uploadUrl) return unknown('tiktok', 'TikTok iniciou o rascunho sem retornar publish_id/upload_url.', initResponse.status);

      try {
        await uploadTikTokVideoChunks(uploadUrl, media, chunkPlan);
      } catch (uploadError: any) {
        return /timeout|fetch failed|network/i.test(String(uploadError?.message || uploadError))
          ? unknown('tiktok', uploadError)
          : failure('tiktok', uploadError?.message || String(uploadError), true);
      }
      return success('tiktok', publishId, {
        deliveryMode: 'draft',
        requiresUserAction: true,
        error: 'Rascunho de vídeo enviado ao TikTok. A publicação final deve ser confirmada no aplicativo TikTok.'
      });
    } else if (data.imageUrl) {
      await assertPublicHttpsUrl(data.imageUrl);
      endpoint = 'https://open.tiktokapis.com/v2/post/publish/content/init/';
      body = {
        media_type: 'PHOTO',
        post_mode: 'MEDIA_UPLOAD',
        post_info: {
          title: data.title.slice(0, 90),
          description: data.text.slice(0, 4000)
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_images: [data.imageUrl],
          photo_cover_index: 0
        },
        is_aigc: true
      };
    } else {
      return failure('tiktok', 'TikTok exige imagem ou vídeo.', false);
    }

    const response = await providerFetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({} as any));
    if (response.status >= 500) return unknown('tiktok', `Erro interno do TikTok (HTTP ${response.status}).`, response.status);
    if (!response.ok || (json?.error?.code && json.error.code !== 'ok')) {
      return failure('tiktok', json?.error?.message || json?.message || `TikTok rejeitou o envio (HTTP ${response.status}).`, response.status !== 401, response.status);
    }
    const publishId = String(json?.data?.publish_id || '');
    if (!publishId) return unknown('tiktok', 'TikTok aceitou o envio sem retornar publish_id.', response.status);
    return success('tiktok', publishId, {
      deliveryMode: 'draft',
      requiresUserAction: true,
      error: 'Rascunho enviado ao TikTok. A publicação final deve ser confirmada no aplicativo TikTok.'
    });
  } catch (error: any) {
    return /timeout|fetch failed|network/i.test(String(error?.message || error))
      ? unknown('tiktok', error)
      : failure('tiktok', error?.message || String(error), false);
  }
}

async function publishYouTubeVideo(data: {
  userId: string;
  companyId: string;
  title: string;
  text: string;
  videoUrl?: string;
  privacyStatus?: 'private' | 'unlisted' | 'public';
}): Promise<UniversalPublishResult> {
  if (!data.videoUrl) return failure('youtube', 'YouTube exige vídeo MP4.', false);
  try {
    const media = await downloadMedia(data.videoUrl, 'video');
    const { token } = await getConnection(data.userId, data.companyId, 'youtube');
    const initEndpoint = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
    const init = await providerFetch(initEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(media.size)
      },
      body: JSON.stringify({
        snippet: { title: data.title.slice(0, 100) || 'Vídeo Portal Vip Brasil', description: data.text.slice(0, 5000), categoryId: '22' },
        status: { privacyStatus: data.privacyStatus || 'unlisted', selfDeclaredMadeForKids: false }
      })
    });
    if (!init.ok) {
      const json = await init.json().catch(() => ({} as any));
      return failure('youtube', json?.error?.message || `Falha ao iniciar upload no YouTube (HTTP ${init.status}).`, init.status !== 401, init.status);
    }
    const uploadUrl = init.headers.get('location');
    if (!uploadUrl) return unknown('youtube', 'YouTube iniciou o upload sem retornar o header Location.');
    const upload = await providerFetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(media.size) },
      body: media.buffer
    }, 120_000);
    const json = await upload.json().catch(() => ({} as any));
    if (upload.status >= 500) return unknown('youtube', `Erro interno do YouTube no envio do vídeo (HTTP ${upload.status}).`, upload.status);
    if (!upload.ok) return failure('youtube', json?.error?.message || `YouTube rejeitou o vídeo (HTTP ${upload.status}).`, upload.status !== 401, upload.status);
    if (json?.id) {
      const videoId = String(json.id);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const sanitizedResponse = {
        id: videoId,
        url: videoUrl,
        title: data.title.slice(0, 100),
        status: data.privacyStatus || 'unlisted',
        uploadStatus: json?.status?.uploadStatus || 'uploaded'
      };
      return success('youtube', videoId, {
        videoUrl,
        rawResponse: sanitizedResponse
      });
    }
    return unknown('youtube', 'YouTube aceitou o vídeo sem retornar o ID.', upload.status);
  } catch (error: any) {
    return /timeout|fetch failed|network/i.test(String(error?.message || error))
      ? unknown('youtube', error)
      : failure('youtube', error?.message || String(error), false);
  }
}

export async function publishScheduledContent(data: {
  userId: string;
  companyId: string;
  provider: SocialProvider;
  content: ScheduledContentLike;
  providerOptions?: ScheduledProviderOptions;
  link?: string;
}): Promise<UniversalPublishResult> {
  const validationError = validateScheduledContentForProvider(data.provider, data.content);
  if (validationError) return failure(data.provider, validationError, false);

  const text = buildText(data.content);
  const title = String(data.content.title || data.content.headline || 'Portal Vip Brasil').trim();
  const imageUrl = String(data.content.imageUrl || '').trim() || undefined;
  const videoUrl = String(data.content.videoUrl || '').trim() || undefined;

  switch (data.provider) {
    case 'facebook':
      return publishFacebookMedia({ userId: data.userId, companyId: data.companyId, text, title, imageUrl, videoUrl });
    case 'instagram':
      try {
        const result = await publishInstagramMedia({ userId: data.userId, companyId: data.companyId, imageUrl, videoUrl, caption: text });
        return success('instagram', result.externalId);
      } catch (error: any) {
        return /timeout|rede|network|processamento/i.test(String(error?.message || error))
          ? unknown('instagram', error)
          : failure('instagram', error?.message || String(error), false);
      }
    case 'linkedin':
      return publishLinkedInMedia({ userId: data.userId, companyId: data.companyId, text, imageUrl, videoUrl });
    case 'tiktok':
      return publishTikTokDraft({ userId: data.userId, companyId: data.companyId, title, text, imageUrl, videoUrl });
    case 'youtube':
      return publishYouTubeVideo({
        userId: data.userId,
        companyId: data.companyId,
        title,
        text,
        videoUrl,
        privacyStatus: data.providerOptions?.youtubePrivacyStatus || 'unlisted'
      });
  }
}

export async function assertUniversalConnectionReady(userId: string, companyId: string, provider: SocialProvider): Promise<void> {
  const { connection } = await getConnection(userId, companyId, provider);
  if (provider === 'linkedin' && !config.social.linkedin.apiVersion) {
    throw new Error('LINKEDIN_API_VERSION não configurada para publicação no LinkedIn.');
  }
  const allScopes = Array.isArray(connection.scopes)
    ? connection.scopes.flatMap((s: any) => String(s || '').split(/[ ,]+/)).filter(Boolean)
    : String(connection.scopes || '').split(/[ ,]+/).filter(Boolean);

  const hasScope = (req: string) =>
    allScopes.some((s: string) => s.toLowerCase() === req.toLowerCase() || s.toLowerCase().includes(req.toLowerCase()));

  if (provider === 'tiktok' && allScopes.length > 0 && !hasScope('video.upload')) {
    throw new Error('A conexão do TikTok não possui o escopo video.upload. Reconecte a conta.');
  }
}

export async function checkUniversalConnectionReady(userId: string, companyId: string, provider: SocialProvider): Promise<boolean> {
  try {
    await assertUniversalConnectionReady(userId, companyId, provider);
    return true;
  } catch {
    return false;
  }
}

export function universalProviderSummary(): Record<SocialProvider, { automatic: boolean; media: string; note: string }> {
  return {
    facebook: { automatic: true, media: 'text_image_video', note: 'Publicação em Página via Graph API.' },
    instagram: { automatic: true, media: 'image_video_reel', note: 'Conta profissional; imagem ou Reel.' },
    linkedin: { automatic: true, media: 'text_image_video', note: 'Posts API + Images/Videos API.' },
    tiktok: { automatic: true, media: 'image_video_draft', note: 'Automação envia rascunho; conclusão ocorre no TikTok conforme regra oficial.' },
    youtube: { automatic: true, media: 'video', note: 'Upload resumível de vídeo; padrão não listado.' }
  };
}

export async function markDraftDeliveryAudit(data: { userId: string; companyId: string; provider: SocialProvider; externalId: string }): Promise<void> {
  if (data.provider !== 'tiktok') return;
  const id = `${data.userId}_${data.companyId}_${data.externalId}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
  await firestore().collection('socialDraftUploads').doc(id).set({
    id,
    userId: data.userId,
    companyId: data.companyId,
    provider: 'tiktok',
    publishId: data.externalId,
    status: 'draft_sent_by_scheduler',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, { merge: true }).catch(() => undefined);
}
