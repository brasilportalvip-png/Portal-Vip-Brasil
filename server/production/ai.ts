import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { config } from '../config/index.js';
import { getAdminStorage } from '../providers/firebaseAdmin.js';
import { COLLECTIONS, createNotification, firestore, newId, nowIso, queryData } from './store.js';
import { serverDetectNicheForVideo, SERVER_NICHE_VIDEO_TEMPLATES } from './videoCatalog.js';
import { diagnoseAiError, calculateNextAttemptAt, sanitizeSecretText } from './aiErrorDiagnostic.js';
import { normalizeProvider } from './social.js';
import { checkUniversalConnectionReady } from './socialMediaPublisher.js';

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const VIDEO_FINALIZATION_LEASE_MS = 10 * 60 * 1000;
const VIDEO_PROVIDER_START_TIMEOUT_MS = 15 * 60 * 1000;
const VIDEO_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_VIDEO_DOWNLOAD_REDIRECTS = 3;

let textClient: GoogleGenAI | null = null;
let mediaClient: GoogleGenAI | null = null;
let overrideTextClient: any = undefined;
let overrideMediaClient: any = undefined;

export function setTextAiClientForTesting(client: any): void {
  overrideTextClient = client;
}

export function setMediaAiClientForTesting(client: any): void {
  overrideMediaClient = client;
}

export function textAiClient(): GoogleGenAI {
  if (overrideTextClient !== undefined) return overrideTextClient;
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY não configurada no servidor.');
  if (!textClient) {
    textClient = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return textClient;
}

export function mediaAiClient(): GoogleGenAI {
  if (overrideMediaClient !== undefined) return overrideMediaClient;
  const mediaKey = config.geminiMediaApiKey || config.geminiApiKey;
  if (!mediaKey) throw new Error('GEMINI_MEDIA_API_KEY ou GEMINI_API_KEY não configurada no servidor.');
  if (!mediaClient) {
    mediaClient = new GoogleGenAI({
      apiKey: mediaKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return mediaClient;
}

export function isValidMp4Buffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 16) return false;
  
  // Rejeitar assinaturas de texto/erro comuns
  const textPrefix = buffer.slice(0, 64).toString('utf8').toLowerCase();
  if (
    textPrefix.includes('<html') ||
    textPrefix.includes('<!doctype') ||
    textPrefix.includes('{"error') ||
    textPrefix.includes('{\n"error') ||
    textPrefix.includes('"error":') ||
    textPrefix.includes('error code')
  ) {
    return false;
  }

  // Verificar presença compatível com container ISO Base Media / MP4 ('ftyp', 'moov', 'mdat' no início)
  const ftypIndex = buffer.indexOf(Buffer.from('ftyp'));
  if (ftypIndex >= 4 && ftypIndex <= 32) {
    return true;
  }
  const moovIndex = buffer.indexOf(Buffer.from('moov'));
  if (moovIndex >= 4 && moovIndex <= 64) {
    return true;
  }
  const mdatIndex = buffer.indexOf(Buffer.from('mdat'));
  if (mdatIndex >= 4 && mdatIndex <= 64) {
    return true;
  }
  return false;
}

function aiClient(): GoogleGenAI {
  return textAiClient();
}

function sanitizeJsonText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstObject = trimmed.indexOf('{');
  const lastObject = trimmed.lastIndexOf('}');
  if (firstObject >= 0 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);
  const firstArray = trimmed.indexOf('[');
  const lastArray = trimmed.lastIndexOf(']');
  if (firstArray >= 0 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);
  return trimmed;
}

export function isRateLimitError(error: any): boolean {
  const msg = String(error?.message || error || '');
  return (
    error?.status === 429 ||
    /\b429\b/.test(msg) ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('Too Many Requests')
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatAiErrorMessage(error: any): string {
  const diagnostic = diagnoseAiError(error);
  return diagnostic.sanitizedMessage;
}

export function parseAiJson<T = any>(value: string): T {
  try {
    return JSON.parse(sanitizeJsonText(value)) as T;
  } catch {
    throw new Error('A IA retornou conteúdo fora do formato estruturado esperado. Tente novamente.');
  }
}

export function safeJsonParse<T = any>(value: string, fallback: T): T {
  try {
    return JSON.parse(sanitizeJsonText(value)) as T;
  } catch {
    return fallback;
  }
}

function promptFingerprint(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 24);
}

export function cleanHeadingText(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/^#+\s*/, '')
    .replace(/^[Hh][1-6][:\s-]+/i, '')
    .replace(/^#+\s*/, '')
    .trim();
}

export function normalizeArticleHeadings(article: any): any {
  if (!article || typeof article !== 'object') return article;
  const cleaned = { ...article };
  if (cleaned.title) cleaned.title = cleanHeadingText(cleaned.title);
  if (Array.isArray(cleaned.sections)) {
    cleaned.sections = cleaned.sections.map((sec: any) => ({
      ...sec,
      h2: cleanHeadingText(sec.h2),
      h3s: Array.isArray(sec.h3s)
        ? sec.h3s.map((sub: any) => ({
            ...sub,
            h3: cleanHeadingText(sub.h3)
          }))
        : []
    }));
  }
  return cleaned;
}

export function countArticleWords(article: any): number {
  if (!article || typeof article !== 'object') return 0;
  const parts: string[] = [
    article.title || '',
    article.introduction || '',
    article.conclusion || '',
    article.callToAction || ''
  ];
  if (Array.isArray(article.sections)) {
    for (const sec of article.sections) {
      parts.push(sec.h2 || '', sec.content || '');
      if (Array.isArray(sec.h3s)) {
        for (const sub of sec.h3s) {
          parts.push(sub.h3 || '', sub.content || '');
        }
      }
    }
  }
  if (Array.isArray(article.faqSection)) {
    for (const faq of article.faqSection) {
      parts.push(faq.question || '', faq.answer || '');
    }
  }
  const text = parts.join(' ').replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function companyContext(company?: any): string {
  if (!company) {
    return `Você é o Froc.IA, especialista sênior em marketing digital, vendas, conteúdo e SEO. Responda em português do Brasil, com ética, rigor factual e precisão.
DIRETRIZ DE GROUNDING E PROIBIÇÕES:
- Não invente clientes, cases, avaliações, depoimentos, certificações ou dados de prova social.
- Não invente números, percentuais, estatísticas, faturamento, leads, economia ou métricas financeiras.
- Não invente promoções, descontos, bônus, teste grátis, cupons, prazos promocionais ("último dia") ou escassez falsa.
- Não faça promessas de resultados garantidos ou garantias absolutas.
- Como não há empresa cadastrada no contexto, utilize Chamadas para Ação (CTAs) neutras como "Conheça mais sobre este tema", "Entre em contato para saber mais" ou "Descubra como aplicar essa solução". Nunca invente links, canais ou URLs.`;
  }

  const profile = company.marketingProfile || {};

  // 1. Canais e Destinos Efetivamente Verificados
  const verifiedDestinations: Record<string, string> = {};
  if (company.website && typeof company.website === 'string' && company.website.trim()) {
    verifiedDestinations.website = company.website.trim();
  }
  if (company.whatsapp && typeof company.whatsapp === 'string' && company.whatsapp.trim()) {
    verifiedDestinations.whatsapp = company.whatsapp.trim();
  }
  if (company.phone && typeof company.phone === 'string' && company.phone.trim()) {
    verifiedDestinations.phone = company.phone.trim();
  }
  if (company.email && typeof company.email === 'string' && company.email.trim()) {
    verifiedDestinations.email = company.email.trim();
  }

  const verifiedSocialLinks: Record<string, string> = {};
  if (company.socialLinks && typeof company.socialLinks === 'object') {
    for (const [net, link] of Object.entries(company.socialLinks)) {
      if (typeof link === 'string' && link.trim()) {
        verifiedSocialLinks[net] = link.trim();
      }
    }
  }

  const hasAnyDestination = Object.keys(verifiedDestinations).length > 0 || Object.keys(verifiedSocialLinks).length > 0;

  // 2. Modelo de Operação
  const isOnline = company.businessType === 'online';
  const isPhysical = company.businessType === 'physical';
  const isHybrid = company.businessType === 'hybrid';

  const opModel = isOnline
    ? 'Operação 100% Online / Digital (atendimento e vendas à distância; sem ponto presencial físico cadastrado).'
    : isPhysical
    ? 'Operação com Ponto Físico / Presencial.'
    : isHybrid
    ? 'Operação Híbrida (atendimento físico e presença digital).'
    : 'Modelo não especificado.';

  // 3. Fatos Comprovados da Empresa
  const factualLines: string[] = [
    `Nome da Marca: ${company.name}`,
    `Modelo de Operação: ${opModel}`
  ];

  if (company.category || company.segment) {
    factualLines.push(`Segmento/Categoria: ${[company.category, company.segment].filter(Boolean).join(' • ')}`);
  }
  if (company.description) {
    factualLines.push(`Descrição Institucional: ${company.description}`);
  }
  if (Array.isArray(company.products) && company.products.length > 0) {
    factualLines.push(`Produtos Oficiais: ${company.products.join(', ')}`);
  }
  if (Array.isArray(company.services) && company.services.length > 0) {
    factualLines.push(`Serviços Oficiais: ${company.services.join(', ')}`);
  }
  if (company.differentials || profile.keyDifferentials) {
    factualLines.push(`Diferenciais Cadastrados: ${company.differentials || profile.keyDifferentials}`);
  }
  if (company.targetAudience || profile.targetAudience) {
    factualLines.push(`Público-Alvo: ${company.targetAudience || profile.targetAudience}`);
  }
  if (profile.persona) {
    factualLines.push(`Persona: ${profile.persona}`);
  }
  if (company.brandTone || profile.toneOfVoice) {
    factualLines.push(`Tom de Voz: ${company.brandTone || profile.toneOfVoice}`);
  }
  if (company.goals || profile.goals) {
    factualLines.push(`Objetivos Estratégicos: ${company.goals || profile.goals}`);
  }
  if (company.coverageRegion) {
    factualLines.push(`Região de Atendimento Declarada: ${company.coverageRegion}`);
  }
  if (!isOnline && (company.address || company.city || company.state)) {
    factualLines.push(`Localização Física: ${[company.address, company.city, company.state, company.country].filter(Boolean).join(', ')}`);
  }
  if (Array.isArray(company.onlineChannels) && company.onlineChannels.length > 0) {
    factualLines.push(`Canais Declarados: ${company.onlineChannels.join(', ')}`);
  }
  if (Array.isArray(company.keywords) && company.keywords.length > 0) {
    factualLines.push(`Palavras-chave: ${company.keywords.join(', ')}`);
  }

  // 4. Seção de Destinos para CTA
  const destinationLines: string[] = [];
  if (verifiedDestinations.website) destinationLines.push(`- Website Oficial: ${verifiedDestinations.website} (Permitido CTA para o site)`);
  if (verifiedDestinations.whatsapp) destinationLines.push(`- WhatsApp Oficial: ${verifiedDestinations.whatsapp} (Permitido CTA para WhatsApp)`);
  if (verifiedDestinations.phone) destinationLines.push(`- Telefone Oficial: ${verifiedDestinations.phone} (Permitido CTA para ligação)`);
  if (verifiedDestinations.email) destinationLines.push(`- E-mail Oficial: ${verifiedDestinations.email} (Permitido CTA para e-mail)`);
  for (const [net, link] of Object.entries(verifiedSocialLinks)) {
    destinationLines.push(`- Rede Social ${net}: ${link} (Permitido CTA para ${net})`);
  }

  const ctaInstruction = hasAnyDestination
    ? `DESTINOS DISPONÍVEIS PARA CTA (Use SOMENTE os canais listados abaixo):\n${destinationLines.join('\n')}\nSe for sugerir CTA, direcione EXCLUSIVAMENTE para os destinos reais acima. NUNCA invente checkout, landing page, links na bio ou canais não listados.`
    : `DESTINOS PARA CTA: NENHUM canal de contato ou link foi cadastrado para esta empresa. É OBRIGATÓRIO usar CTA neutro (Exemplos: "Conheça melhor a solução", "Descubra como essa solução pode ajudar seu negócio", "Entre em contato para saber mais"). É ESTRITAMENTE PROIBIDO inventar URLs, dizer "clique no link da bio", "chame no WhatsApp" ou criar canais fictícios.`;

  return `Você é o Froc.IA, estrategista de marketing da marca "${company.name}".
Responda em português do Brasil, com clareza, autoridade e precisão factual.

=== FATOS COMPROVADOS DA EMPRESA (Use SOMENTE estes dados como verdade) ===
${factualLines.join('\n')}

=== DIRETRIZES DE DESTINOS E CTA ===
${ctaInstruction}

=== REGRAS OBRIGATÓRIAS DE GROUNDING E PROIBIÇÕES DA IA ===
1. PROIBIÇÃO DE FATOS FICTÍCIOS: Nunca invente clientes, cases, avaliações, depoimentos ou prova social inexistente.
2. PROIBIÇÃO DE NÚMEROS E ESTATÍSTICAS INVENTADAS: Nunca invente números, percentuais, estatísticas, horas economizadas, faturamento, alcance, conversões, leads ou economia que não foram explicitamente informados.
3. PROIBIÇÃO DE CERTIFICAÇÕES: Não invente selos, certificações ou aprovações não cadastradas.
4. PROIBIÇÃO DE PROMOÇÕES INVENTADAS: Nunca invente descontos, bônus, teste grátis, cupons, prazos promocionais, "último dia" ou escassez falsa.
5. PROIBIÇÃO DE PROMESSAS ABSOLUTAS: Não faça promessas de resultado garantido ou garantias absolutas.
6. PROIBIÇÃO DE CANAIS FICTÍCIOS: Nunca mencione WhatsApp se não estiver cadastrado; nunca mencione website/checkout/landing page se não estiver cadastrado; nunca mencione "link na bio" ou redes sociais não cadastradas.
7. SUGESTÕES VS FATOS: Se for propor uma ideia ou canal não cadastrado, use EXPLICITAMENTE linguagem de recomendação ("Sugestão: ...", "Uma possibilidade seria...", "Você pode considerar..."). NUNCA afirme como fato estabelecido da empresa.`;
}

async function generateRaw(data: {
  prompt: string;
  systemInstruction?: string;
  useProModel?: boolean;
  jsonOutput?: boolean;
  maxTokens?: number;
}): Promise<{ text: string; modelUsed: string; attempts: string[] }> {
  if (process.env.NODE_ENV === 'test') {
    const text = data.jsonOutput
      ? JSON.stringify({
          headline: 'Headline de Teste Autopilot',
          body: 'Corpo do post gerado pelo Autopilot para testes.',
          cta: 'Saiba mais e confira nossa coleção.',
          hashtags: ['#teste', '#autopilot'],
          keywords: ['marketing', 'vendas'],
          visualPrompt: 'Foto profissional de moda feminina em alta definição',
          cameraMotion: 'Dynamic cinematic tracking pan',
          lighting: 'Golden hour dramatic contrast',
          mood: 'Inspiring and sophisticated'
        })
      : 'Texto de teste gerado pelo modelo Froc AI.';
    return { text, modelUsed: 'test-model', attempts: ['test-model'] };
  }

  // Cascata multi-modelo oficial com prioridade para gemini-3.8-flash (alta quota) e gemini-3.1-flash-lite
  const prioritized = data.useProModel
    ? [config.geminiModels.pro, 'gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite']
    : [config.geminiModels.text, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];

  const models = Array.from(new Set(prioritized.filter(Boolean)));
  const attempts: string[] = [];
  let lastError = 'Falha desconhecida';

  for (const model of models) {
    attempts.push(model);
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const response = await aiClient().models.generateContent({
          model,
          contents: data.prompt,
          config: {
            systemInstruction: data.systemInstruction,
            maxOutputTokens: data.maxTokens || 3500,
            responseMimeType: data.jsonOutput ? 'application/json' : 'text/plain'
          }
        });
        const text = response.text?.trim();
        if (text) return { text, modelUsed: model, attempts };
        lastError = 'Resposta vazia retornada pelo modelo';
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (isRateLimitError(error) && retryCount < maxRetries) {
          retryCount += 1;
          const waitTime = 1200 * retryCount + Math.floor(Math.random() * 400);
          console.warn(`[Froc AI Rate Limit] 429 na tentativa ${retryCount} em ${model}. Aguardando ${waitTime}ms para reabastecimento de token bucket...`);
          await sleep(waitTime);
          continue;
        }
        console.warn(`[Froc AI Anti-Quedas] Tentativa em ${model} falhou: ${lastError}. Acionando próximo modelo da cascata...`);
        if (isRateLimitError(error)) {
          await sleep(1000);
        }
        break;
      }
    }
  }

  throw new Error(`Todos os modelos de IA falharam na cascata de resiliência. Último erro: ${lastError}`);
}

export async function executeAi<T = string>(data: {
  userId: string;
  company?: any;
  operation: string;
  prompt: string;
  systemInstruction?: string;
  useProModel?: boolean;
  jsonOutput?: boolean;
  maxTokens?: number;
  parse?: (text: string) => T;
}): Promise<{ result: T; creditsUsed: number; executionId: string; modelUsed: string }> {
  const cost = 0;
  const executionId = newId('exec');
  const started = Date.now();

  try {
    const generated = await generateRaw({
      prompt: data.prompt,
      systemInstruction: data.systemInstruction || companyContext(data.company),
      useProModel: data.useProModel,
      jsonOutput: data.jsonOutput,
      maxTokens: data.maxTokens
    });
    const result = data.parse ? data.parse(generated.text) : (generated.text as T);
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: data.operation,
      provider: 'Google Gemini',
      model: generated.modelUsed,
      attempts: generated.attempts,
      promptHash: promptFingerprint(data.prompt),
      promptLength: data.prompt.length,
      creditsConsumed: cost,
      durationMs: Date.now() - started,
      status: 'success',
      timestamp: nowIso()
    });
    return { result, creditsUsed: cost, executionId, modelUsed: generated.modelUsed };
  } catch (error) {
    // Se for operação editorial do Autopilot e persistir erro de rate limit da Google, aciona contingência estruturada
    if ((data.operation === 'autopilot_cycle' || data.operation === 'post') && isRateLimitError(error)) {
      console.warn('[Froc AI Anti-Quedas] Rate limit atingido na API Google. Ativando matriz editorial de contingência para o projeto...');
      const comp = data.company || {};
      const fallbackHeadline = comp.tagline || `Destaque Estratégico: ${comp.name || 'Portal Vip Brasil'}`;
      const fallbackBody = comp.description || `Acompanhe as soluções, novidades e diferenciais de ${comp.name || 'nosso projeto'} no ecossistema Portal Vip Brasil. Autoridade, relevância e excelência digital para seu dia a dia.`;
      const fallbackCta = `Acesse o canal oficial: ${comp.websiteUrl || 'https://portal-vip-brasil.vercel.app'}`;
      const fallbackHashtags = Array.isArray(comp.keywords) && comp.keywords.length > 0
        ? comp.keywords.slice(0, 6).map((k: string) => `#${String(k).replace(/\s+/g, '')}`)
        : ['#PortalVipBrasil', '#MarketingDigital', '#Inovacao', '#Crescimento'];
      const syntheticResult = {
        headline: fallbackHeadline,
        body: fallbackBody,
        cta: fallbackCta,
        hashtags: fallbackHashtags,
        keywords: comp.keywords || ['portal vip', 'crescimento', 'marketing'],
        visualPrompt: `Foto profissional moderna de alta definição representando ${comp.name || 'projeto de marketing'}`
      };
      const finalResult = (data.parse ? syntheticResult : JSON.stringify(syntheticResult)) as T;

      await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
        userId: data.userId,
        companyId: data.company?.id || null,
        type: data.operation,
        provider: 'Google Gemini (Contingência Editorial)',
        model: 'smart_contingency_matrix',
        attempts: ['gemini-rate-limit-mitigation'],
        promptHash: promptFingerprint(data.prompt),
        promptLength: data.prompt.length,
        creditsConsumed: 0,
        durationMs: Date.now() - started,
        status: 'success',
        metadata: { contingencyTriggered: true, originalError: String(error) },
        timestamp: nowIso()
      });

      return {
        result: finalResult,
        creditsUsed: 0,
        executionId,
        modelUsed: 'smart_contingency_matrix'
      };
    }

    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: data.operation,
      provider: 'Google Gemini',
      promptHash: promptFingerprint(data.prompt),
      promptLength: data.prompt.length,
      creditsConsumed: 0,
      durationMs: Date.now() - started,
      status: 'failed',
      error: message.slice(0, 500),
      timestamp: nowIso()
    });
    throw new Error(message);
  }
}

export async function generatePost(data: { userId: string; company?: any; topic: string; platform?: string; goal?: string; tone?: string }) {
  const prompt = `Crie um post completo e verdadeiro para ${data.platform || 'Instagram'} sobre "${data.topic}".
Objetivo: ${data.goal || 'engajamento e vendas'}.
Tom: ${data.tone || 'persuasivo e profissional'}.
Responda SOMENTE JSON: {"headline":"","body":"","cta":"","hashtags":[""],"visualPrompt":"","keywords":[""]}.`;
  return executeAi<any>({
    userId: data.userId,
    company: data.company,
    operation: 'full_post',
    prompt,
    jsonOutput: true,
    parse: parseAiJson
  });
}

export async function generateAutopilotPost(data: { userId: string; company?: any; topic: string; platform?: string; goal?: string; tone?: string }) {
  const prompt = `Crie um post completo e verdadeiro para ${data.platform || 'Instagram'} sobre "${data.topic}".
Objetivo: ${data.goal || 'engajamento e vendas'}.
Tom: ${data.tone || 'persuasivo e profissional'}.
Responda SOMENTE JSON: {"headline":"","body":"","cta":"","hashtags":[""],"visualPrompt":"","keywords":[""]}.`;
  return executeAi<any>({
    userId: data.userId,
    company: data.company,
    operation: 'autopilot_cycle',
    prompt,
    jsonOutput: true,
    parse: parseAiJson
  });
}

export async function generateStrategy(data: { userId: string; company: any; timeframe: 'semana' | 'mes'; goal?: string }) {
  const prompt = `Crie uma estratégia de marketing executável para ${data.timeframe === 'mes' ? '30 dias' : '7 dias'}.
Objetivo: ${data.goal || 'crescer autoridade, alcance e vendas'}.
Responda SOMENTE JSON com: {"strategySummary":"","contentPillars":[""],"actionPlan":[{"dayOrWeek":"","platform":"","format":"","topic":"","hook":""}],"positioning":"","audienceInsights":[""],"campaignIdeas":[{"name":"","concept":"","channels":[""]}],"kpis":[""],"nextSteps":[""]}.`;
  return executeAi<any>({ userId: data.userId, company: data.company, operation: 'strategy', prompt, useProModel: true, jsonOutput: true, maxTokens: 5000, parse: parseAiJson });
}

export async function generateCopy(data: { userId: string; company?: any; type: 'cta' | 'headline' | 'caption' | 'variations'; prompt: string }) {
  const op = data.type === 'variations' ? 'variations' : data.type;
  return executeAi<string>({
    userId: data.userId,
    company: data.company,
    operation: op,
    prompt: `Crie ${data.type} de alta conversão para o briefing: ${data.prompt}. Seja específico, verdadeiro e alinhado à marca.`,
    maxTokens: 1200
  });
}

export async function generateCarousel(data: { userId: string; company?: any; topic: string; slidesCount?: number; goal?: string }) {
  const count = Math.min(Math.max(Number(data.slidesCount) || 5, 3), 10);
  const prompt = `Crie um carrossel de ${count} slides sobre "${data.topic}". Objetivo: ${data.goal || 'educar e converter'}.
Responda SOMENTE JSON: {"carouselTitle":"","slides":[{"slideNumber":1,"title":"","text":"","visualDesc":""}],"caption":"","hashtags":[""]}.`;
  return executeAi<any>({ userId: data.userId, company: data.company, operation: 'carousel', prompt, jsonOutput: true, parse: parseAiJson });
}

export async function generateVideoScript(data: { userId: string; company?: any; topic: string; durationSeconds?: number; format?: string }) {
  const niche = serverDetectNicheForVideo(data.topic, data.company?.slug || data.company?.id);
  const prompt = `Você é o estrategista sênior de conteúdo viral e roteirista de vídeos verticais (9:16) para TikTok, Instagram Reels e YouTube Shorts do Portal Vip Brasil.
Crie um roteiro viral magnético, com altíssima taxa de retenção nos primeiros 3 segundos, sobre "${data.topic}".
Duração estimada: aproximadamente ${data.durationSeconds || 45}s.
Formato: ${data.format || 'TikTok / Reels / Shorts (Vertical 9:16)'}.
NICHO IDENTIFICADO DO PROJETO/APP: ${niche.nicheName} (${niche.category}).
APLICATIVO ALVO: ${niche.appName}.
CTA / AÇÃO RECOMENDADA: ${niche.viralScript.callToAction}
HASHTAGS ESTRATÉGICAS SUGERIDAS: ${niche.viralScript.hashtags.join(', ')}

DIRETRIZES ESSENCIAIS DE RETENÇÃO E ALGORITMO DO TIKTOK:
1. HOOK (0 a 3 segundos): Gancho de impacto que quebra a rolagem do feed (pattern interrupt). Proibido ganchos genéricos ou lentos.
2. CENAS (3 a 5 cenas): Cada cena deve ter número, minutagem precisa (ex: "0-3s", "4-12s"), descrição visual cinematográfica imersiva, fala natural e magnética da locução, e texto de destaque na tela (onScreenText) em letras maiúsculas para quem assiste sem som.
3. TRILHA SONORA: Estilo de música ou som viral específico adequado ao nicho (ex: instrumental épico, 432Hz místico, tambores ancestrais, som devocional ou batida tech moderna).
4. CHAMADA PARA AÇÃO (CTA): Direcione com clareza para baixar o aplicativo ou acessar o link na bio.
5. LEGENDA (CAPTION): Legenda pronta para publicação no TikTok contendo o gancho, resumo instigante, CTA claro e 5 a 8 hashtags de alta conversão do nicho.

Responda SOMENTE JSON válido no seguinte formato:
{
  "scriptTitle": "Título chamativo do roteiro",
  "hook": "Gancho magnético dos primeiros 3 segundos",
  "scenes": [
    {
      "sceneNumber": 1,
      "timeSeconds": "0-3s",
      "visualDescription": "Descrição visual cinematográfica clara da cena",
      "audioVoiceover": "Fala magnética da locução",
      "onScreenText": "TEXTO EM DESTAQUE NA TELA"
    }
  ],
  "callToAction": "Chamada para ação final direcionando ao aplicativo",
  "suggestedAudioTrack": "Estilo de trilha sonora em alta no TikTok",
  "caption": "Legenda completa do post para o TikTok com hashtags",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

  try {
    const executed = await executeAi<any>({
      userId: data.userId,
      company: data.company,
      operation: 'video_script',
      prompt,
      useProModel: true,
      jsonOutput: true,
      parse: parseAiJson
    });

    if (executed?.result && (executed.result.scenes || executed.result.hook)) {
      if (!Array.isArray(executed.result.hashtags) || executed.result.hashtags.length === 0) {
        executed.result.hashtags = niche.viralScript.hashtags;
      }
      executed.result.nicheId = niche.id;
      executed.result.nicheName = niche.nicheName;
      return executed;
    }
  } catch (err) {
    console.warn('[Froc AI Video Script] Falha na geração por IA, aplicando template viral de nicho:', err);
  }

  // Fallback estruturado de altíssima qualidade do nicho
  return {
    result: {
      scriptTitle: `${niche.headline} (${data.topic})`,
      hook: niche.viralScript.hook,
      scenes: niche.viralScript.scenes,
      callToAction: niche.viralScript.callToAction,
      suggestedAudioTrack: niche.viralScript.suggestedAudioTrack,
      caption: niche.viralScript.caption,
      hashtags: niche.viralScript.hashtags,
      nicheId: niche.id,
      nicheName: niche.nicheName
    },
    creditsUsed: 1
  };
}

export async function generateImagePrompt(data: { userId: string; company?: any; theme: string; style?: string }) {
  const prompt = `Crie uma direção visual publicitária profissional para "${data.theme}". Estilo: ${data.style || 'fotografia comercial premium'}.
Não alegue que uma imagem foi gerada: gere apenas especificação visual.
Responda SOMENTE JSON: {"promptPt":"","promptEn":"","artStyle":"","composition":"","colorPalette":["#000000"],"lightingNote":"","aspectRatio":"1:1"}.`;
  return executeAi<any>({ userId: data.userId, company: data.company, operation: 'image_prompt', prompt, jsonOutput: true, parse: parseAiJson });
}

export async function generateArticle(data: { userId: string; company?: any; topic: string; primaryKeyword?: string; targetAudience?: string; tone?: string }) {
  const prompt = `Escreva um artigo de autoridade aprofundado, original, educativo e altamente otimizado para SEO sobre "${data.topic}".
Palavra-chave principal: ${data.primaryKeyword || data.topic}.
Público-alvo: ${data.targetAudience || 'clientes potenciais e profissionais'}.
Tom de voz: ${data.tone || 'educativo, claro e autoritativo'}.

DIRETRIZES DE CONTEÚDO E ESTRUTURA:
1. O artigo deve ser profundo, prático e detalhado (desenvolva cada seção com explicações ricas, exemplos aplicáveis e orientações acionáveis).
2. Estruture em 3 a 6 seções H2 lógicas e relevantes, incluindo subtópicos H3 onde apropriado.
3. Não use marcações como "##", "H2:" ou "H3:" dentro dos campos de títulos do JSON; retorne apenas o texto puro do título.
4. Inclua uma seção de FAQ com 3 a 5 perguntas reais e respostas diretas e fundamentadas.
5. Conclusão persuasiva com Chamada para Ação contextualizada aos canais da empresa.
6. REGRAS ANTI-ALUCINAÇÃO: Não invente pesquisas falsas, percentuais inventados, testemunhos fictícios, citações de pessoas inexistentes ou promessas de ganhos financeiros milagrosos. Se usar dados, atenha-se a conceitos e práticas comprovadas de mercado.

Responda SOMENTE JSON válido no seguinte formato:
{
  "title": "Título H1 cativante com a palavra-chave",
  "metaDescription": "Meta descrição de 140 a 160 caracteres com gatilho e palavra-chave",
  "introduction": "Introdução engajadora apresentando a dor, a importância do tema e o que será aprendido no artigo.",
  "sections": [
    {
      "h2": "Título da Seção Principal",
      "content": "Conteúdo aprofundado e rico da seção...",
      "h3s": [
        {
          "h3": "Subtópico Prático",
          "content": "Detalhamento prático..."
        }
      ]
    }
  ],
  "faqSection": [
    {
      "question": "Pergunta comum do público sobre o tema?",
      "answer": "Resposta direta, clara e fundamentada."
    }
  ],
  "conclusion": "Síntese dos pontos-chave com visão de futuro.",
  "callToAction": "Chamada para ação clara convidando o leitor a dar o próximo passo.",
  "suggestedSlug": "slug-otimizado-para-seo"
}`;
  const response = await executeAi<any>({
    userId: data.userId,
    company: data.company,
    operation: 'seo_article',
    prompt,
    useProModel: true,
    jsonOutput: true,
    maxTokens: 7000,
    parse: (text) => {
      const parsed = parseAiJson<any>(text);
      return normalizeArticleHeadings(parsed);
    }
  });

  if (response.result && typeof response.result === 'object') {
    response.result = normalizeArticleHeadings(response.result);
    response.result.wordCount = countArticleWords(response.result);
  }

  return response;
}

export async function generatePlatformArticle(topic: string): Promise<{ article: any; modelUsed: string }> {
  const prompt = `Escreva um artigo editorial original para o Portal Vip Brasil Magazine sobre "${topic}".
Público: empreendedores, profissionais de marketing e pequenas/médias empresas no Brasil.
O conteúdo deve ser útil por si só, sem depender de notícias ou estatísticas não fornecidas. Não invente fontes, números, pesquisas, depoimentos ou resultados. Evite promessas absolutas.
Estruture para SEO e leitura mobile.
Responda SOMENTE JSON: {"title":"","summary":"","metaDescription":"","content":"Markdown completo com H2/H3","category":"Marketing & IA","tags":["Marketing","IA"],"suggestedSlug":""}.`;
  const generated = await generateRaw({
    prompt,
    systemInstruction: 'Você é a redação editorial do Portal Vip Brasil Magazine. Escreva em português do Brasil, com rigor, clareza e sem fabricar fatos.',
    useProModel: true,
    jsonOutput: true,
    maxTokens: 7000
  });
  const article = parseAiJson<any>(generated.text);
  const executionId = newId('exec');
  await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
    userId: 'system', type: 'blog_editorial', provider: 'Google Gemini', model: generated.modelUsed, attempts: generated.attempts,
    promptHash: promptFingerprint(prompt), promptLength: prompt.length, creditsConsumed: 0, status: 'success', timestamp: nowIso()
  });
  return { article, modelUsed: generated.modelUsed };
}


function normalizeAspectRatio(value?: string): string {
  const allowed = new Set(['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']);
  return value && allowed.has(value) ? value : '1:1';
}

function extractGeneratedImage(response: any): { data: string; mimeType: string } | null {
  // Check standard Imagen response
  if (response?.generatedImages?.[0]?.image?.imageBytes) {
    return {
      data: String(response.generatedImages[0].image.imageBytes),
      mimeType: 'image/jpeg'
    };
  }
  // Check Gemini generateContent response
  const parts = response?.candidates?.[0]?.content?.parts || response?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      return { data: String(part.inlineData.data), mimeType: String(part.inlineData.mimeType || 'image/jpeg') };
    }
    if (part?.inline_data?.data) {
      return { data: String(part.inline_data.data), mimeType: String(part.inline_data.mime_type || 'image/jpeg') };
    }
  }
  return null;
}

export async function generateMarketingImage(data: {
  userId: string;
  company?: any;
  title?: string;
  theme: string;
  style?: string;
  aspectRatio?: string;
  resolution?: '1K' | '2K' | '4K';
  executionId?: string;
  dateIso?: string;
}): Promise<{
  imageUrl: string;
  storagePath: string;
  mimeType: string;
  creditsUsed: number;
  executionId: string;
  modelUsed: string;
  resolution: string;
  imageHash?: string;
}> {
  const resolution = data.resolution === '4K' ? '4K' : data.resolution === '2K' ? '2K' : '1K';
  const opKey = resolution === '4K' ? 'image_ai_4k' : resolution === '2K' ? 'image_ai_2k' : 'image_ai_1k';
  const cost = 0;
  const executionId = data.executionId || newId('exec');
  const started = Date.now();
  const aspectRatio = normalizeAspectRatio(data.aspectRatio);
  const project = String(data.company?.name || 'Portal Vip Brasil');
  const currentDate = String(data.dateIso || nowIso().slice(0, 10));
  const title = String(data.title || data.theme);
  const theme = String(data.theme);

  const prompt = `${companyContext(data.company)}

Projeto: ${project}
Data: ${currentDate}
Identificador da execução: ${executionId}
Título da publicação: ${title}
Tema visual: ${theme}

Crie uma imagem publicitária premium, exclusiva e original para o projeto "${project}" com base no tema "${theme}" e título "${title}".
Data de criação: ${currentDate}. Identificador da execução única: ${executionId}.
Estilo visual: ${data.style || 'fotografia comercial moderna e sofisticada'}.
Proporção: ${aspectRatio}.
Resolução desejada: ${resolution}.
Não inclua logotipos ou marcas de terceiros. Não invente selos, depoimentos ou números. Se houver texto na arte, mantenha-o curto, legível e somente se fizer sentido para o briefing.`;

  let model = config.geminiModels.image || 'gemini-3.1-flash-image';

  try {
    let imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    let storagePath = `generated/${data.userId}/${executionId}.jpg`;
    let mimeType = 'image/jpeg';
    let imageHash = crypto.createHash('sha256').update(imageUrl).digest('hex');

    if (process.env.NODE_ENV !== 'test') {
      let response: any = null;
      const candidateModels = [
        model,
        config.geminiModels.imageLite || 'gemini-3.1-flash-lite-image'
      ];
      const uniqueImageModels = Array.from(new Set(candidateModels.filter(Boolean)));
      let imgSuccess = false;
      let lastImgError: any = null;

      for (const currentImgModel of uniqueImageModels) {
        let retry = 0;
        while (retry < 2) {
          try {
            if (currentImgModel.startsWith('imagen-')) {
              response = await (mediaAiClient() as any).models.generateImages({
                model: currentImgModel,
                prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: aspectRatio as any
                }
              });
            } else {
              response = await mediaAiClient().models.generateContent({
                model: currentImgModel,
                contents: prompt,
                config: {
                  imageConfig: {
                    aspectRatio,
                    imageSize: resolution
                  }
                }
              });
            }
            imgSuccess = true;
            model = currentImgModel;
            break;
          } catch (err) {
            lastImgError = err;
            if (isRateLimitError(err) && retry === 0) {
              retry++;
              await sleep(1500);
              continue;
            }
            break;
          }
        }
        if (imgSuccess) break;
      }

      if (!imgSuccess || !response) {
        console.warn(`[AI Image] Modelos de imagem indisponíveis ou limite temporário atingido (${lastImgError?.message || lastImgError}).`);
        await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
          userId: data.userId,
          companyId: data.company?.id || null,
          type: opKey,
          provider: 'Google Gemini',
          model,
          promptHash: promptFingerprint(prompt),
          promptLength: prompt.length,
          creditsConsumed: 0,
          durationMs: Date.now() - started,
          status: 'failed',
          metadata: { contingency: false, originalError: String(lastImgError) },
          timestamp: nowIso()
        }).catch(() => undefined);
        throw new Error(`Falha ao gerar imagem com IA: ${lastImgError?.message || 'Modelos de imagem indisponíveis'}`);
      }

      const image = extractGeneratedImage(response);
      if (!image?.data) throw new Error('O modelo de imagem não retornou um arquivo utilizável.');
      const buffer = Buffer.from(image.data, 'base64');
      if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error('A imagem retornada possui tamanho inválido.');
      imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const ext = image.mimeType.includes('png') ? 'png' : image.mimeType.includes('webp') ? 'webp' : 'jpg';
      storagePath = `generated/${data.userId}/${executionId}.${ext}`;
      imageUrl = `data:${image.mimeType};base64,${image.data}`;
      mimeType = image.mimeType;

      try {
        const token = crypto.randomUUID();
        const bucket = getAdminStorage().bucket();
        const file = bucket.file(storagePath);
        await file.save(buffer, {
          resumable: false,
          metadata: {
            contentType: image.mimeType,
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: token }
          }
        });
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
      } catch (storageErr) {
        console.error('[Froc AI Image Storage Error] Falha ao persistir imagem no Firebase Storage:', storageErr);
        throw new Error('Não foi possível armazenar a imagem gerada com segurança. A operação foi encerrada sem persistir resultado inválido.');
      }
    }

    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: opKey,
      provider: 'Google Gemini',
      model,
      promptHash: promptFingerprint(prompt),
      promptLength: prompt.length,
      creditsConsumed: cost,
      durationMs: Date.now() - started,
      status: 'success',
      outputStoragePath: storagePath,
      imageHash,
      timestamp: nowIso()
    });
    return { imageUrl, storagePath, mimeType, creditsUsed: cost, executionId, modelUsed: model, resolution, imageHash };
  } catch (error) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    await firestore().collection(COLLECTIONS.aiExecutions).doc(executionId).set({
      userId: data.userId,
      companyId: data.company?.id || null,
      type: opKey,
      provider: 'Google Gemini',
      model,
      promptHash: promptFingerprint(prompt),
      promptLength: prompt.length,
      creditsConsumed: 0,
      durationMs: Date.now() - started,
      status: 'failed',
      error: message.slice(0, 500),
      timestamp: nowIso()
    });
    throw new Error(message);
  }
}

export type VideoPreset = 'demo_720p' | 'pro_1080p' | 'cinema_4k';

export interface VideoPresetConfig {
  preset: VideoPreset;
  name: string;
  model: string;
  resolution: '720p' | '1080p' | '4k';
  durationSeconds: number;
  creditsKey: 'video_veo_fast' | 'video_veo_1080p' | 'video_veo_4k';
  credits: number;
}

export const VIDEO_PRESETS: Record<VideoPreset, VideoPresetConfig> = {
  demo_720p: {
    preset: 'demo_720p',
    name: 'Fast 720p',
    model: config.geminiModels.veoLite || 'veo-3.1-lite-generate-preview',
    resolution: '720p',
    durationSeconds: 4,
    creditsKey: 'video_veo_fast',
    credits: 50
  },
  pro_1080p: {
    preset: 'pro_1080p',
    name: 'Pro 1080p',
    model: config.geminiModels.veoFast || 'veo-3.1-fast-generate-preview',
    resolution: '1080p',
    durationSeconds: 8,
    creditsKey: 'video_veo_1080p',
    credits: 100
  },
  cinema_4k: {
    preset: 'cinema_4k',
    name: 'Cinema 4K',
    model: config.geminiModels.veoCinema || 'veo-3.1-generate-preview',
    resolution: '4k',
    durationSeconds: 8,
    creditsKey: 'video_veo_4k',
    credits: 200
  }
};

export type VideoJobStatus =
  | 'queued'
  | 'pending'
  | 'processing'
  | 'retry_scheduled'
  | 'rendering'
  | 'ready_to_publish'
  | 'publishing'
  | 'published'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'failed_permanent';

export interface VideoJobData {
  id: string;
  userId: string;
  companyId: string;
  projectId?: string;
  destinations?: string[];
  scheduledDate?: string;
  idempotencyKey?: string;
  operationName?: string;
  reservationId: string;
  creditsReserved: number;
  creditsCommitted?: number;
  sourcePrompt: string;
  finalPrompt: string;
  prompt: string;
  title?: string;
  preset: VideoPreset;
  resolution: '720p' | '1080p' | '4k';
  requestedResolution: '720p' | '1080p' | '4k';
  actualResolution?: '720p' | '1080p' | '4k';
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9';
  modelUsed: string;
  initialImageUrl?: string;
  coverImageUrl?: string;
  videoUrl?: string;
  storagePath?: string;
  contentItemId: string;
  autoPublishPlatforms?: string[];
  autoPublishProviderOptions?: { pinterestBoardId?: string; youtubePrivacyStatus?: 'private' | 'unlisted' | 'public' };
  status: VideoJobStatus;
  pipelineState?: 'credits_reserved' | 'provider_starting' | 'provider_running' | 'result_received' | 'result_persisted' | 'credits_committed' | 'completed' | 'failed';
  errorMessage?: string;
  errorCode?: string;
  progressPct?: number;
  providerStartedAt?: string;
  finalizationToken?: string;
  finalizationFence?: number;
  finalizationStartedAt?: string;
  finalizationLeaseUntil?: string;
  attemptCount: number;
  maxAttempts?: number;
  nextAttemptAt?: string | null;
  lastAttemptAt?: string | null;
  lastErrorCategory?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  leaseOwner?: string | null;
  leaseFence?: number;
  leaseUntil?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  publishedAt?: string | null;
  publishedResponse?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

function isSameFinalizationOwner(job: VideoJobData, token: string, fence: number): boolean {
  return job.status === 'finalizing' && job.finalizationToken === token && Number(job.finalizationFence || 0) === fence;
}

async function readLatestVideoJob(docRef: any): Promise<VideoJobData | null> {
  const latest = await docRef.get();
  return latest.exists ? (latest.data() as VideoJobData) : null;
}

async function renewVideoFinalizationLease(
  docRef: any,
  token: string,
  fence: number,
  updates: Partial<VideoJobData> = {}
): Promise<VideoJobData | null> {
  return firestore().runTransaction(async (tx) => {
    const freshSnap = await tx.get(docRef);
    if (!freshSnap.exists) return null;
    const current = freshSnap.data() as VideoJobData;
    if (!isSameFinalizationOwner(current, token, fence)) return null;
    const next: VideoJobData = {
      ...current,
      ...updates,
      finalizationLeaseUntil: new Date(Date.now() + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
      updatedAt: nowIso()
    };
    tx.set(docRef, next);
    return next;
  });
}

async function failVideoJob(data: {
  docRef: any;
  userId: string;
  reservationId: string;
  errorCode: string;
  errorMessage: string;
  ownerToken?: string;
  ownerFence?: number;
}): Promise<VideoJobData> {
  const result = await firestore().runTransaction(async (tx) => {
    const freshSnap = await tx.get(data.docRef);
    if (!freshSnap.exists) {
      return { marked: false, job: null as VideoJobData | null };
    }
    const current = freshSnap.data() as VideoJobData;
    if (current.status === 'completed' || current.status === 'failed') {
      return { marked: false, job: current };
    }

    if (data.ownerToken !== undefined && data.ownerFence !== undefined) {
      if (!isSameFinalizationOwner(current, data.ownerToken, data.ownerFence)) {
        return { marked: false, job: current };
      }
    } else if (current.status === 'finalizing') {
      const leaseUntil = current.finalizationLeaseUntil ? new Date(current.finalizationLeaseUntil).getTime() : 0;
      if (Date.now() < leaseUntil) {
        return { marked: false, job: current };
      }
    }

    const failedJob: VideoJobData = {
      ...current,
      status: 'failed',
      pipelineState: 'failed',
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      progressPct: 0,
      updatedAt: nowIso()
    };
    tx.set(data.docRef, failedJob);
    if (current.contentItemId) {
      const contentRef = firestore().collection(COLLECTIONS.contentItems).doc(current.contentItemId);
      tx.set(contentRef, {
        status: 'failed',
        metadata: {
          errorCode: data.errorCode,
          errorMessage: data.errorMessage
        },
        updatedAt: nowIso()
      }, { merge: true });
    }
    return { marked: true, job: failedJob };
  });


  if (result.job) return result.job;
  throw new Error('Job de geração de vídeo não encontrado durante a finalização.');
}

function videoDownloadError(code: string, message: string): Error {
  const error: any = new Error(message);
  error.videoErrorCode = code;
  return error;
}

function assertTrustedVideoDownloadUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw videoDownloadError('INVALID_DOWNLOAD_URI', 'A URI de download retornada pelo provedor é inválida.');
  }
  if (parsed.protocol !== 'https:') {
    throw videoDownloadError('UNTRUSTED_DOWNLOAD_URI', 'O provedor retornou uma URI de download insegura.');
  }
  const host = parsed.hostname.toLowerCase();
  const trusted = host === 'googleapis.com' || host.endsWith('.googleapis.com') || host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com');
  if (!trusted) {
    throw videoDownloadError('UNTRUSTED_DOWNLOAD_URI', 'O provedor retornou uma origem de download não autorizada.');
  }
  return parsed;
}

async function readResponseBufferWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw videoDownloadError('VIDEO_TOO_LARGE', 'O vídeo excede o limite máximo permitido de 250 MB.');
  }

  if (!response.body) {
    const fallback = Buffer.from(await response.arrayBuffer());
    if (fallback.byteLength > maxBytes) {
      throw videoDownloadError('VIDEO_TOO_LARGE', 'O vídeo excede o limite máximo permitido de 250 MB.');
    }
    return fallback;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('video_too_large');
        throw videoDownloadError('VIDEO_TOO_LARGE', 'O vídeo excede o limite máximo permitido de 250 MB.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function downloadTrustedVideo(rawUrl: string): Promise<Buffer> {
  let current = assertTrustedVideoDownloadUrl(rawUrl);
  const apiKey = config.geminiMediaApiKey || config.geminiApiKey;

  for (let redirects = 0; redirects <= MAX_VIDEO_DOWNLOAD_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIDEO_DOWNLOAD_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { Accept: 'video/mp4,video/*;q=0.9' };
      if (apiKey) headers['x-goog-api-key'] = apiKey;
      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw videoDownloadError('DOWNLOAD_FAILED', 'O servidor de mídia redirecionou sem informar o destino.');
        try { await response.body?.cancel(); } catch {}
        current = assertTrustedVideoDownloadUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) {
        throw videoDownloadError('DOWNLOAD_FAILED', `Falha ao baixar o arquivo de vídeo gerado (status HTTP ${response.status}).`);
      }
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        throw videoDownloadError('INVALID_VIDEO_PAYLOAD', 'O servidor de mídia retornou um formato inesperado em vez de vídeo.');
      }
      return await readResponseBufferWithLimit(response, MAX_VIDEO_BYTES);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw videoDownloadError('DOWNLOAD_TIMEOUT', 'O download do vídeo excedeu o tempo máximo permitido.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw videoDownloadError('TOO_MANY_REDIRECTS', 'O download do vídeo excedeu o limite de redirecionamentos.');
}

async function deleteStoredVideo(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageInstance = getAdminStorage();
    if (storageInstance) await storageInstance.bucket().file(storagePath).delete();
  } catch (error) {
    console.warn('[Froc AI Video Cleanup] Falha ao remover artefato órfão:', error);
  }
}

export async function generateVideoDirection(data: {
  userId: string;
  company?: any;
  prompt: string;
  aspectRatio?: '9:16' | '16:9';
  mood?: string;
  cameraMotion?: string;
  lighting?: string;
}): Promise<{ visualPrompt: string; cameraMotion: string; lighting: string; mood: string; nicheId?: string }> {
  const niche = serverDetectNicheForVideo(data.prompt, data.company?.slug || data.company?.id);
  const systemInstruction = `Você é um diretor de fotografia e cinematógrafo publicitário de alto nível da Froc.IA e Portal Vip Brasil.
Sua missão é expandir a ideia bruta do usuário em uma especificação visual cinematográfica de alta precisão, realismo fotográfico e apelo comercial para o modelo Veo 3.1.
NICHO IDENTIFICADO DO PROJETO/APP: ${niche.nicheName} (${niche.category}).
DIRETRIZES ESTÉTICAS DO NICHO:
- Iluminação sugerida: ${niche.lighting}
- Movimento de câmera sugerido: ${niche.cameraMotion}
- Atmosfera e tom sugeridos: ${niche.mood}

DIRETRIZES CINEMATOGRÁFICAS E REALISMO:
1. Descreva o sujeito, ambiente, textura dos materiais e ação fluida e plausível com foco no nicho.
2. Especifique iluminação realista e dramática (ex: volumetric candle rim-light, natural golden hour, cinematic chiaroscuro).
3. Especifique movimento de câmera preciso e estável (ex: smooth dolly push-in, low-angle orbital tracking, macro slider).
4. Especifique gradação de cor, resolução 8k e tom cinematográfico de alto impacto estético vertical (9:16) para TikTok e Reels.
5. REGRAS DE INTEGRIDADE VISUAL: Enfatize anatomia natural, ausência de artefatos de morfologia, sem membros extras, sem distorção.
6. REGRA ABSOLUTA DE TEXTO: A cena não pode conter palavras, letras, números, legendas, placas, letreiros, interfaces, marcas d'água ou logotipos. Nunca peça ao Veo para desenhar texto. Toda comunicação escrita será adicionada posteriormente pelo sistema.

Retorne SOMENTE um JSON estrito no formato:
{
  "visualPrompt": "Descrição visual cinematográfica vívida e detalhada da cena em inglês e português",
  "cameraMotion": "Movimento de câmera preciso (ex: Smooth cinematic push-in with low angle track)",
  "lighting": "Esquema de iluminação refinado (ex: Volumetric golden hour side-lighting with soft fill)",
  "mood": "Atmosfera e gradação de cor (ex: Premium, sleek commercial aesthetic with high dynamic range)"
}`;

  const prompt = `${companyContext(data.company)}
Ideia ou cena do vídeo: ${data.prompt}
Formato de tela: ${data.aspectRatio || '9:16'}
Sugestão de clima: ${data.mood || niche.mood || 'Comercial premium'}
Sugestão de câmera: ${data.cameraMotion || niche.cameraMotion || 'Movimento dinâmico e fluido'}
Sugestão de luz: ${data.lighting || niche.lighting || 'Iluminação de estúdio'}`;

  const raw = await generateRaw({
    prompt,
    systemInstruction,
    jsonOutput: true,
    maxTokens: 1200
  });

  const parsed = safeJsonParse<any>(raw.text, {
    visualPrompt: data.prompt ? `${niche.videoPrompt}. Detalhe: ${data.prompt}` : niche.videoPrompt,
    cameraMotion: data.cameraMotion || niche.cameraMotion || 'Smooth cinematic pan',
    lighting: data.lighting || niche.lighting || 'Studio lighting',
    mood: data.mood || niche.mood || 'Premium commercial'
  });

  return {
    visualPrompt: String(parsed.visualPrompt || data.prompt || niche.videoPrompt),
    cameraMotion: String(parsed.cameraMotion || data.cameraMotion || niche.cameraMotion || 'Smooth cinematic pan'),
    lighting: String(parsed.lighting || data.lighting || niche.lighting || 'Studio lighting'),
    mood: String(parsed.mood || data.mood || niche.mood || 'Premium commercial'),
    nicheId: niche.id
  };
}

export async function startVideoGenerationJob(data: {
  userId: string;
  company?: any;
  prompt: string;
  title?: string;
  preset?: VideoPreset;
  aspectRatio?: '9:16' | '16:9';
  initialImageBase64?: string;
  coverImageUrl?: string;
  cameraMotion?: string;
  lighting?: string;
  mood?: string;
  autoPublishPlatforms?: string[];
  autoPublishProviderOptions?: { pinterestBoardId?: string; youtubePrivacyStatus?: 'private' | 'unlisted' | 'public' };
}): Promise<VideoJobData> {
  const preset: VideoPreset = data.preset === 'cinema_4k' ? 'cinema_4k' : data.preset === 'pro_1080p' ? 'pro_1080p' : 'demo_720p';
  const presetConfig = VIDEO_PRESETS[preset];
  const aspectRatio = data.aspectRatio === '16:9' ? '16:9' : '9:16';
  const cost = 0;

  const jobId = newId('vjob');
  const reservationId = `private_${jobId}`;
  const contentItemId = newId('content');
  const now = nowIso();
  const docRef = firestore().collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);

  const queuedJob: VideoJobData = {
    id: jobId,
    userId: data.userId,
    companyId: data.company?.id || 'default',
    reservationId,
    creditsReserved: cost,
    sourcePrompt: data.prompt,
    finalPrompt: data.prompt,
    prompt: data.prompt,
    title: data.title || `Vídeo IA - ${data.prompt.slice(0, 60)}`,
    preset,
    resolution: presetConfig.resolution,
    requestedResolution: presetConfig.resolution,
    durationSeconds: presetConfig.durationSeconds,
    aspectRatio,
    modelUsed: presetConfig.model,
    ...(data.initialImageBase64 ? { initialImageUrl: 'provided' } : {}),
    ...(data.coverImageUrl ? { coverImageUrl: data.coverImageUrl } : {}),
    contentItemId,
    ...(Array.isArray(data.autoPublishPlatforms) && data.autoPublishPlatforms.length > 0
      ? { autoPublishPlatforms: data.autoPublishPlatforms.map((item) => String(item)).filter(Boolean).slice(0, 10) }
      : {}),
    ...(data.autoPublishProviderOptions ? { autoPublishProviderOptions: data.autoPublishProviderOptions } : {}),
    status: 'queued',
    pipelineState: 'provider_starting',
    progressPct: 2,
    attemptCount: 0,
    maxAttempts: 5,
    createdAt: now,
    updatedAt: now
  };

  // O job durável é criado antes da primeira chamada ao provedor.
  try {
    await docRef.create(queuedJob);
    const initialContentItem = {
      id: contentItemId,
      userId: data.userId,
      companyId: data.company?.id || 'default',
      type: 'video',
      title: data.title || `Vídeo IA - ${data.prompt.slice(0, 60)}`,
      headline: data.title || '',
      body: data.prompt,
      videoUrl: '',
      targetPlatform: aspectRatio === '9:16' ? 'Reels / TikTok / Shorts' : 'YouTube / Banner',
      status: 'processing',
      createdAt: now,
      updatedAt: now,
      metadata: {
        jobId,
        preset,
        resolution: presetConfig.resolution,
        aspectRatio,
        modelUsed: presetConfig.model,
        pipelineState: 'provider_starting',
        autoPublishPlatforms: data.autoPublishPlatforms || [],
        autoPublishProviderOptions: data.autoPublishProviderOptions || { youtubePrivacyStatus: 'unlisted' }
      }
    };
    await firestore().collection(COLLECTIONS.contentItems).doc(contentItemId).set(initialContentItem);
  } catch (error) {
    const message = 'Não foi possível registrar o job de vídeo antes do processamento. A operação foi encerrada com segurança.';
    throw new Error(formatAiErrorMessage(error instanceof Error ? error.message : message));
  }

  try {
    let direction = {
      visualPrompt: data.prompt,
      cameraMotion: data.cameraMotion || 'Smooth cinematic movement',
      lighting: data.lighting || 'Refined commercial lighting',
      mood: data.mood || 'High-end commercial aesthetic'
    };

    try {
      direction = await generateVideoDirection({
        userId: data.userId,
        company: data.company,
        prompt: data.prompt,
        aspectRatio,
        mood: data.mood,
        cameraMotion: data.cameraMotion,
        lighting: data.lighting
      });
    } catch (dirErr) {
      console.warn('[Froc Video Direction] Direção automática simplificada por fallback:', dirErr);
    }

    const finalPrompt = [
      companyContext(data.company),
      `Cinematic commercial video: ${direction.visualPrompt}.`,
      `Camera direction: ${data.cameraMotion || direction.cameraMotion}.`,
      `Lighting scheme: ${data.lighting || direction.lighting}.`,
      `Atmosphere & color grading: ${data.mood || direction.mood}.`,
      `Target format: ${aspectRatio}. Technical parameters: Ultra high definition commercial rendering, authentic physical textures, realistic lighting and reflections, natural fluid motion, no morphing artifacts, no anatomical distortions.`,
      `ABSOLUTE VISUAL RULE: no visible text, no words, no letters, no numbers, no captions, no subtitles, no signs, no labels, no user-interface text, no watermarks and no logos anywhere in any frame. Use only purely visual scenes. Written titles and captions are added outside the video by the publishing system.`
    ].filter(Boolean).join('\n');

    const providerStartedAt = nowIso();
    await docRef.set({
      finalPrompt,
      prompt: finalPrompt,
      pipelineState: 'provider_starting',
      providerStartedAt,
      progressPct: 5,
      updatedAt: providerStartedAt
    }, { merge: true });

    let operationName = `mock_op_${jobId}`;

    if (overrideMediaClient !== undefined || process.env.NODE_ENV !== 'test') {
      const videoConfig: any = {
        numberOfVideos: 1,
        resolution: presetConfig.resolution,
        durationSeconds: presetConfig.durationSeconds,
        aspectRatio
      };

      const reqPayload: any = {
        model: presetConfig.model,
        prompt: finalPrompt,
        config: videoConfig
      };

      if (data.initialImageBase64) {
        const cleanBase64 = data.initialImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        reqPayload.image = {
          imageBytes: cleanBase64,
          mimeType: 'image/jpeg'
        };
      }

      const operation = await mediaAiClient().models.generateVideos(reqPayload);
      if (!operation?.name) {
        throw new Error('A API Veo não retornou o identificador da operação de vídeo.');
      }
      operationName = operation.name;
    }

    const jobData: VideoJobData = {
      ...queuedJob,
      operationName,
      finalPrompt,
      prompt: finalPrompt,
      status: 'processing',
      pipelineState: 'provider_running',
      providerStartedAt,
      attemptCount: 1,
      lastAttemptAt: providerStartedAt,
      progressPct: 10,
      updatedAt: nowIso()
    };

    await docRef.set(jobData);
    return jobData;
  } catch (error) {
    const diagnostic = diagnoseAiError(error);
    const nowStr = nowIso();

    if (diagnostic.isRetryable) {
      const nextAttemptAt = calculateNextAttemptAt(1, diagnostic.retryAfterSeconds);
      const retryJob: VideoJobData = {
        ...queuedJob,
        status: 'retry_scheduled',
        pipelineState: 'provider_starting',
        attemptCount: 1,
        lastAttemptAt: nowStr,
        nextAttemptAt,
        lastErrorCategory: diagnostic.category,
        lastErrorCode: diagnostic.rawErrorCode || 'RATE_LIMIT_TEMPORARY',
        lastErrorMessage: diagnostic.sanitizedMessage,
        errorMessage: diagnostic.sanitizedMessage,
        errorCode: diagnostic.rawErrorCode || 'RATE_LIMIT_TEMPORARY',
        progressPct: 2,
        updatedAt: nowStr
      };
      await docRef.set(retryJob, { merge: true });
      return retryJob;
    }

    const message = diagnostic.sanitizedMessage;
    await failVideoJob({
      docRef,
      userId: data.userId,
      reservationId,
      errorCode: diagnostic.rawErrorCode || 'PROVIDER_START_FAILED',
      errorMessage: message
    });
    throw new Error(message);
  }
}

export interface LeaseAcquisition {
  acquired: boolean;
  reason?: 'not_found' | 'terminal_status' | 'lease_active' | 'backoff_not_elapsed' | 'max_attempts_exceeded' | 'conflict';
  leaseOwner?: string;
  leaseFence?: number;
  attemptCount?: number;
  job?: VideoJobData;
  error?: string;
}

let onRetryScheduledCallback: ((jobId: string, nextAttemptAt: string) => void) | null = null;
export function setOnRetryScheduledCallback(cb: ((jobId: string, nextAttemptAt: string) => void) | null): void {
  onRetryScheduledCallback = cb;
}

interface ManualRetryCooldownEntry {
  lastAttemptTime: number;
  timestamps: number[];
}

const manualRetryState = new Map<string, ManualRetryCooldownEntry>();
const MANUAL_RETRY_COOLDOWN_MS = 15_000; // 15s cooldown
const MANUAL_RETRY_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MANUAL_RETRY_MAX_PER_WINDOW = 3; // máximo 3 tentativas manuais a cada 5 min

export function resetManualRetryLimitsForTesting(): void {
  manualRetryState.clear();
}
export const clearManualRetryStateForTesting = resetManualRetryLimitsForTesting;

/**
 * Adquire a trava atômica de execução no Firestore através de transação com verificação
 * de lease vigente, cooldown/backoff e limite de tentativas com token monotônico de barreira (leaseFence).
 */
export async function acquireVideoOperationLease(
  jobId: string,
  options?: {
    workerId?: string;
    leaseDurationMs?: number;
  }
): Promise<LeaseAcquisition> {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return { acquired: false, reason: 'not_found', error: 'Job de geração de vídeo não encontrado.' };
    }

    const current = snap.data() as VideoJobData;

    // Status terminais não admitem novas aquisições de lease
    if (current.status === 'completed' || current.status === 'published' || current.status === 'failed_permanent') {
      return { acquired: false, reason: 'terminal_status', job: current, error: 'Job já finalizado.' };
    }

    const now = Date.now();
    const maxAttempts = current.maxAttempts || 5;
    const currentAttempts = typeof current.attemptCount === 'number' ? current.attemptCount : 0;

    // Se já atingiu maxAttempts, consolida permanentemente com segurança
    if (currentAttempts >= maxAttempts) {
      const failedJob: VideoJobData = {
        ...current,
        status: 'failed_permanent',
        pipelineState: 'failed',
        errorCode: 'MAX_ATTEMPTS_EXCEEDED',
        errorMessage: `Limite máximo de tentativas (${maxAttempts}) atingido sem sucesso.`,
        leaseOwner: null,
        leaseUntil: null,
        nextAttemptAt: null,
        updatedAt: nowIso()
      };
      tx.set(docRef, failedJob);
      return { acquired: false, reason: 'max_attempts_exceeded', job: failedJob, error: `Limite máximo de tentativas (${maxAttempts}) atingido.` };
    }

    // Verificação de lease concorrente ativo
    if (current.leaseUntil) {
      const leaseExpiry = new Date(current.leaseUntil).getTime();
      if (now < leaseExpiry) {
        return {
          acquired: false,
          reason: 'lease_active',
          job: current,
          error: 'O processamento deste vídeo já está em andamento sob lease ativo.'
        };
      }
      // Se now >= leaseExpiry, o lease expirou e é seguro recuperá-lo
    }

    // Verificação de cooldown/backoff para retry_scheduled
    if (current.status === 'retry_scheduled' && current.nextAttemptAt) {
      const retryTime = new Date(current.nextAttemptAt).getTime();
      if (now < retryTime) {
        return {
          acquired: false,
          reason: 'backoff_not_elapsed',
          job: current,
          error: 'Aguarde o período de cooldown da IA antes de retentar.'
        };
      }
    }

    // Concede o lease de forma atômica
    const nextFence = Number(current.leaseFence || 0) + 1;
    const nextAttempt = currentAttempts + 1;
    const leaseDuration = options?.leaseDurationMs || 120_000;
    const leaseOwner = options?.workerId || `worker_${now}_${Math.random().toString(36).slice(2, 9)}`;
    const leaseUntil = new Date(now + leaseDuration).toISOString();

    const acquiredJob: VideoJobData = {
      ...current,
      leaseOwner,
      leaseFence: nextFence,
      leaseUntil,
      attemptCount: nextAttempt,
      lastAttemptAt: nowIso(),
      updatedAt: nowIso()
    };

    tx.set(docRef, acquiredJob);

    return {
      acquired: true,
      leaseOwner,
      leaseFence: nextFence,
      attemptCount: nextAttempt,
      job: acquiredJob
    };
  });
}

/**
 * Dispara ou retenta a operação no Veo respeitando a trava transacional atômica
 * e os fencing tokens.
 */
export async function startOrRetryVideoOperation(
  jobOrId: VideoJobData | string,
  options?: { workerId?: string }
): Promise<VideoJobData> {
  const jobId = typeof jobOrId === 'string' ? jobOrId : jobOrId.id;
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);

  // 1. Aquisição atômica do lease no Firestore via transação
  const acquisition = await acquireVideoOperationLease(jobId, options);
  if (!acquisition.acquired) {
    return acquisition.job || (await readLatestVideoJob(docRef)) || (typeof jobOrId === 'string' ? null as any : jobOrId);
  }

  const workingJob = acquisition.job!;
  const leaseOwner = acquisition.leaseOwner!;
  const leaseFence = acquisition.leaseFence!;
  const nextAttempt = acquisition.attemptCount!;
  const maxAttempts = workingJob.maxAttempts || 5;

  const presetConfig = VIDEO_PRESETS[workingJob.preset || 'pro_1080p'];
  const finalPrompt = workingJob.finalPrompt || workingJob.prompt;

  try {
    let operationName = `mock_op_${workingJob.id}`;

    if (overrideMediaClient !== undefined || process.env.NODE_ENV !== 'test') {
      const videoConfig: any = {
        numberOfVideos: 1,
        resolution: presetConfig.resolution,
        durationSeconds: presetConfig.durationSeconds,
        aspectRatio: workingJob.aspectRatio || '9:16'
      };

      const reqPayload: any = {
        model: presetConfig.model,
        prompt: finalPrompt,
        config: videoConfig
      };

      const operation = await mediaAiClient().models.generateVideos(reqPayload);
      if (!operation?.name) {
        throw new Error('A API Veo não retornou o identificador da operação de vídeo.');
      }
      operationName = operation.name;
    }

    // 2. Persistência atômica do status processing com verificação do fencing token
    const updated = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data() as VideoJobData;
      if (current.leaseFence !== leaseFence || current.leaseOwner !== leaseOwner) {
        console.warn(`[Video Lease] Fence inválido ao persistir status processing para ${jobId}.`);
        return current;
      }
      const runningJob: VideoJobData = {
        ...current,
        operationName,
        status: 'processing',
        pipelineState: 'provider_running',
        providerStartedAt: nowIso(),
        progressPct: 10,
        leaseOwner: null,
        leaseUntil: null,
        errorCode: undefined,
        errorMessage: undefined,
        lastErrorCategory: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        nextAttemptAt: null,
        updatedAt: nowIso()
      };
      tx.set(docRef, runningJob);
      return runningJob;
    });

    return updated || workingJob;
  } catch (error: any) {
    const diagnostic = diagnoseAiError(error);
    const nowStr = nowIso();

    if (diagnostic.isRetryable && nextAttempt < maxAttempts) {
      const nextAttemptAt = calculateNextAttemptAt(nextAttempt, diagnostic.retryAfterSeconds);
      const retryJob = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        if (!freshSnap.exists) return null;
        const current = freshSnap.data() as VideoJobData;
        if (current.leaseFence !== leaseFence || current.leaseOwner !== leaseOwner) {
          return current;
        }
        const next: VideoJobData = {
          ...current,
          status: 'retry_scheduled',
          pipelineState: 'provider_starting',
          attemptCount: nextAttempt,
          lastAttemptAt: nowStr,
          nextAttemptAt,
          lastErrorCategory: diagnostic.category,
          lastErrorCode: diagnostic.rawErrorCode || 'RATE_LIMIT_TEMPORARY',
          lastErrorMessage: diagnostic.sanitizedMessage,
          errorMessage: diagnostic.sanitizedMessage,
          errorCode: diagnostic.rawErrorCode || 'RATE_LIMIT_TEMPORARY',
          leaseOwner: null,
          leaseUntil: null,
          updatedAt: nowStr
        };
        tx.set(docRef, next);
        return next;
      });

      if (onRetryScheduledCallback) {
        try {
          onRetryScheduledCallback(jobId, nextAttemptAt);
        } catch {}
      }

      return retryJob || workingJob;
    }

    const failedJob = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data() as VideoJobData;
      if (current.leaseFence !== leaseFence || current.leaseOwner !== leaseOwner) {
        return current;
      }
      const next: VideoJobData = {
        ...current,
        status: 'failed_permanent',
        pipelineState: 'failed',
        attemptCount: nextAttempt,
        lastAttemptAt: nowStr,
        nextAttemptAt: null,
        lastErrorCategory: diagnostic.category,
        lastErrorCode: diagnostic.rawErrorCode || 'PERMANENT_ERROR',
        lastErrorMessage: diagnostic.sanitizedMessage,
        errorMessage: diagnostic.sanitizedMessage,
        errorCode: diagnostic.rawErrorCode || 'PERMANENT_ERROR',
        leaseOwner: null,
        leaseUntil: null,
        updatedAt: nowStr
      };
      tx.set(docRef, next);
      return next;
    });

    return failedJob || workingJob;
  }
}

/**
 * Executa a retentativa manual com proteção rigorosa contra abusos:
 * - Rate limit e cooldown por usuário e job
 * - Validação de autorização de usuário
 * - Bloqueio de jobs finalizados (completed, published, failed_permanent)
 * - Bloqueio após atingir maxAttempts
 * - Respeito ao lease vigente (bloqueio de chamadas simultâneas)
 * - Respeito ao nextAttemptAt (cooldown da IA)
 */
export async function manualRetryVideoJob(userId: string, jobId: string): Promise<VideoJobData> {
  const userJobKey = `${userId}:${jobId}`;
  const now = Date.now();
  const state = manualRetryState.get(userJobKey) || { lastAttemptTime: 0, timestamps: [] };

  // 1. Verificação de cooldown entre cliques manuais
  if (now - state.lastAttemptTime < MANUAL_RETRY_COOLDOWN_MS) {
    const remainingSec = Math.ceil((MANUAL_RETRY_COOLDOWN_MS - (now - state.lastAttemptTime)) / 1000);
    const err: any = new Error(`Cooldown ativo. Aguarde ${remainingSec}s antes de tentar manualmente novamente.`);
    err.statusCode = 429;
    throw err;
  }

  // 2. Verificação de rate limit por janela
  const recentTimestamps = state.timestamps.filter((t) => now - t < MANUAL_RETRY_WINDOW_MS);
  if (recentTimestamps.length >= MANUAL_RETRY_MAX_PER_WINDOW) {
    const err: any = new Error(`Limite de tentativas manuais excedido (${MANUAL_RETRY_MAX_PER_WINDOW} por 5 min). Aguarde.`);
    err.statusCode = 429;
    throw err;
  }

  const db = firestore();
  const docRef = db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error('Job de geração de vídeo não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const job = snap.data() as VideoJobData;
  if (job.userId !== userId) {
    const err: any = new Error('Acesso não autorizado a este job.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Proibição de status terminais
  if (job.status === 'completed' || job.status === 'published') {
    const err: any = new Error(`Não é permitido retentar um job que já está ${job.status === 'completed' ? 'concluído' : 'publicado'}.`);
    err.statusCode = 409;
    throw err;
  }
  if (job.status === 'failed_permanent') {
    const err: any = new Error('O job atingiu falha permanente e não admite novas tentativas.');
    err.statusCode = 409;
    throw err;
  }

  // 4. Limite de tentativas
  const maxAttempts = job.maxAttempts || 5;
  const currentAttempts = typeof job.attemptCount === 'number' ? job.attemptCount : 0;
  if (currentAttempts >= maxAttempts) {
    const err: any = new Error(`Limite máximo de tentativas (${maxAttempts}) já atingido.`);
    err.statusCode = 409;
    throw err;
  }

  // 5. Lease ativo
  if (job.leaseUntil) {
    const leaseExpiry = new Date(job.leaseUntil).getTime();
    if (now < leaseExpiry) {
      const err: any = new Error('O processamento deste vídeo já está em andamento sob lease ativo. Aguarde a conclusão.');
      err.statusCode = 409;
      throw err;
    }
  }

  // 6. Respeito ao nextAttemptAt da IA
  if (job.status === 'retry_scheduled' && job.nextAttemptAt) {
    const retryTime = new Date(job.nextAttemptAt).getTime();
    if (now < retryTime) {
      const remainingSec = Math.ceil((retryTime - now) / 1000);
      const err: any = new Error(`Aguarde o período de cooldown da IA. Próxima tentativa elegível em ${remainingSec}s.`);
      err.statusCode = 429;
      throw err;
    }
  }

  // Registra o consumo de rate limit
  recentTimestamps.push(now);
  manualRetryState.set(userJobKey, { lastAttemptTime: now, timestamps: recentTimestamps });

  // Executa com garantia atômica
  return await startOrRetryVideoOperation(jobId, { workerId: `manual_${userId}` });
}

export async function checkAndCompleteVideoJob(userId: string, jobId: string): Promise<VideoJobData> {
  const db = firestore();
  const docRef = db.collection(COLLECTIONS.mediaGenerationJobs).doc(jobId);
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error('Job de geração de vídeo não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const job = snap.data() as VideoJobData;
  if (job.userId !== userId) {
    const err: any = new Error('Acesso não autorizado a este job.');
    err.statusCode = 403;
    throw err;
  }
  if (job.status === 'completed' || job.status === 'published' || job.status === 'failed' || job.status === 'failed_permanent') {
    return job;
  }

  if (job.status === 'retry_scheduled') {
    const isDue = !job.nextAttemptAt || Date.now() >= new Date(job.nextAttemptAt).getTime();
    if (isDue) {
      return await startOrRetryVideoOperation(job.id);
    }
    return job;
  }

  if (job.status === 'queued' && !job.operationName) {
    return await startOrRetryVideoOperation(job.id);
  }

  if (job.status === 'finalizing' && job.finalizationLeaseUntil) {
    const lease = new Date(job.finalizationLeaseUntil).getTime();
    if (Date.now() < lease) return job;
  }

  const hasPersistedResult = Boolean(
    job.videoUrl &&
    job.storagePath &&
    (job.pipelineState === 'result_persisted' || job.pipelineState === 'credits_committed')
  );
  let isDone = hasPersistedResult;
  let providerError: any = null;
  let downloadUri: string | undefined;

  if (!hasPersistedResult) {
    if (!job.operationName) {
      return failVideoJob({
        docRef,
        userId: job.userId,
        reservationId: job.reservationId,
        errorCode: 'MISSING_PROVIDER_OPERATION',
        errorMessage: 'O job não possui um identificador durável da operação de vídeo. A operação foi encerrada com segurança.'
      });
    }

    try {
      if (overrideMediaClient !== undefined) {
        const op = new GenerateVideosOperation();
        op.name = job.operationName;
        const updated = await overrideMediaClient.operations.getVideosOperation({ operation: op });
        isDone = Boolean(updated?.done);
        providerError = updated?.error;
        const generatedVideo = updated?.response?.generatedVideos?.[0]?.video;
        downloadUri = generatedVideo?.uri || (generatedVideo?.videoBytes
          ? `data:${generatedVideo.mimeType || 'video/mp4'};base64,${generatedVideo.videoBytes}`
          : undefined);
      } else if (process.env.NODE_ENV !== 'test') {
        const op = new GenerateVideosOperation();
        op.name = job.operationName;
        const updated = await mediaAiClient().operations.getVideosOperation({ operation: op });
        isDone = Boolean(updated?.done);
        providerError = updated?.error;
        const generatedVideo = updated?.response?.generatedVideos?.[0]?.video;
        downloadUri = generatedVideo?.uri || (generatedVideo?.videoBytes
          ? `data:${generatedVideo.mimeType || 'video/mp4'};base64,${generatedVideo.videoBytes}`
          : undefined);
      } else {
        isDone = true;
        downloadUri = 'https://storage.googleapis.com/froc-ia-test-bucket/mock-video.mp4';
      }
    } catch (error) {
      const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
      const retryJob = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        if (!freshSnap.exists) return null;
        const current = freshSnap.data() as VideoJobData;
        if (current.status !== 'processing') return current;
        const next: VideoJobData = {
          ...current,
          errorCode: 'PROVIDER_POLL_RETRY',
          errorMessage: message,
          updatedAt: nowIso()
        };
        tx.set(docRef, next);
        return next;
      });
      return retryJob || job;
    }
  }

  if (!isDone) {
    const elapsedSec = Math.max(0, (Date.now() - new Date(job.createdAt).getTime()) / 1000);
    const estimatedSeconds = job.preset === 'cinema_4k' ? 90 : job.preset === 'pro_1080p' ? 60 : 35;
    const progressPct = Math.min(92, Math.round(15 + (elapsedSec / estimatedSeconds) * 75));
    const progressJob = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data() as VideoJobData;
      if (current.status !== 'processing') return current;
      const next: VideoJobData = {
        ...current,
        progressPct,
        updatedAt: nowIso()
      };
      tx.set(docRef, next);
      return next;
    });
    return progressJob || job;
  }

  if (providerError) {
    const message = String(providerError.message || providerError || 'Falha no processamento de vídeo pelo modelo Veo.');
    return failVideoJob({
      docRef,
      userId: job.userId,
      reservationId: job.reservationId,
      errorCode: 'PROVIDER_PROCESSING_FAILED',
      errorMessage: message
    });
  }

  const claimTime = Date.now();
  const claim: any = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(docRef);
    if (!freshSnap.exists) return { claimed: false, reason: 'not_found' };
    const current = freshSnap.data() as VideoJobData;
    if (current.status === 'completed' || current.status === 'failed') {
      return { claimed: false, job: current, reason: 'already_terminal' };
    }
    if (current.status === 'finalizing') {
      const lease = current.finalizationLeaseUntil ? new Date(current.finalizationLeaseUntil).getTime() : 0;
      if (claimTime < lease) return { claimed: false, job: current, reason: 'locked_by_other' };
    }

    const token = newId('claim');
    const currentFence = Number.isSafeInteger(Number(current.finalizationFence))
      ? Math.max(0, Number(current.finalizationFence))
      : 0;
    const fence = currentFence + 1;
    const nextPipelineState = current.pipelineState === 'result_persisted' || current.pipelineState === 'credits_committed'
      ? current.pipelineState
      : 'result_received';
    const next: VideoJobData = {
      ...current,
      status: 'finalizing',
      pipelineState: nextPipelineState,
      finalizationToken: token,
      finalizationFence: fence,
      finalizationStartedAt: nowIso(),
      finalizationLeaseUntil: new Date(claimTime + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
      progressPct: Math.max(93, Number(current.progressPct || 0)),
      updatedAt: nowIso()
    };
    tx.set(docRef, next);
    return { claimed: true, token, fence, job: next };
  });

  if (!claim.claimed) return (claim.job as VideoJobData) || job;

  const ownerToken = String(claim.token);
  const ownerFence = Number(claim.fence);
  let workingJob = claim.job as VideoJobData;
  let storagePath = workingJob.storagePath;
  let publicVideoUrl = workingJob.videoUrl || '';
  let contentItemId = workingJob.contentItemId || newId('content');
  let contentPersisted = workingJob.pipelineState === 'result_persisted' || workingJob.pipelineState === 'credits_committed';

  try {
    if (!contentPersisted) {
      if (!downloadUri) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: 'MISSING_DOWNLOAD_URI',
          errorMessage: 'O modelo Veo concluiu o processamento, mas não retornou o arquivo do vídeo. A operação foi encerrada com segurança.'
        });
      }

      let videoBuffer: Buffer;
      try {
        if (downloadUri.startsWith('data:')) {
          const match = /^data:video\/[a-z0-9.+-]+;base64,([a-z0-9+/=\s]+)$/i.exec(downloadUri);
          if (!match) throw videoDownloadError('INVALID_VIDEO_PAYLOAD', 'O provedor retornou dados de vídeo em formato inválido.');
          const base64Data = match[1].replace(/\s+/g, '');
          const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
          const estimatedBytes = Math.max(0, Math.floor((base64Data.length * 3) / 4) - padding);
          if (estimatedBytes > MAX_VIDEO_BYTES) {
            throw videoDownloadError('VIDEO_TOO_LARGE', 'O vídeo excede o limite máximo permitido de 250 MB.');
          }
          videoBuffer = Buffer.from(base64Data, 'base64');
        } else if (
          !downloadUri.startsWith('http://127.0.0.1') &&
          !downloadUri.startsWith('http://localhost') &&
          downloadUri.includes('storage.googleapis.com/froc-ia-test-bucket')
        ) {
          const niche = serverDetectNicheForVideo(workingJob.prompt || workingJob.title, workingJob.companyId);
          const localNicheVideoPath = path.join(process.cwd(), 'public', 'videos', `${niche.id}.mp4`);
          if (fs.existsSync(localNicheVideoPath)) {
            videoBuffer = fs.readFileSync(localNicheVideoPath);
          } else {
            videoBuffer = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00, 0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x08, 0x6d, 0x6f, 0x6f, 0x76]);
          }
        } else {
          videoBuffer = await downloadTrustedVideo(downloadUri);
        }
      } catch (error: any) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: String(error?.videoErrorCode || 'DOWNLOAD_FAILED'),
          errorMessage: 'Falha ao recuperar o vídeo gerado com segurança. A operação foi encerrada com segurança.'
        });
      }

      if (!videoBuffer.length || videoBuffer.length > MAX_VIDEO_BYTES || !isValidMp4Buffer(videoBuffer)) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: 'INVALID_MP4_CONTAINER',
          errorMessage: 'O arquivo produzido não é um vídeo MP4 válido. A operação foi encerrada com segurança.'
        });
      }

      const renewedBeforeStorage = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
      if (!renewedBeforeStorage) return (await readLatestVideoJob(docRef)) || workingJob;
      workingJob = renewedBeforeStorage;

      storagePath = `generated/${workingJob.userId}/videos/${workingJob.id}/${ownerFence}-${ownerToken}.mp4`;
      const downloadToken = crypto.randomUUID();
      try {
        const storageInstance = getAdminStorage();
        if (!storageInstance) throw new Error('Firebase Storage não configurado.');
        const bucket = storageInstance.bucket();
        const bucketName = String(bucket.name || '').trim();
        if (!bucketName) throw new Error('Firebase Storage sem bucket configurado.');
        await bucket.file(storagePath).save(videoBuffer, {
          resumable: false,
          metadata: {
            contentType: 'video/mp4',
            cacheControl: 'public,max-age=31536000,immutable',
            metadata: { firebaseStorageDownloadTokens: downloadToken }
          }
        });
        publicVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;
      } catch (error) {
        console.warn('[Portal Vip Video Storage] Falha ao persistir MP4 no Firebase Storage:', sanitizeSecretText(error));
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: 'VIDEO_STORAGE_PERSISTENCE_FAILED',
          errorMessage: 'Não foi possível armazenar o vídeo MP4 no Firebase Storage. Nenhum agendamento foi criado.'
        });
      }

      let parsedPublicVideoUrl: URL;
      try {
        parsedPublicVideoUrl = new URL(publicVideoUrl);
      } catch {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: 'INVALID_PUBLIC_VIDEO_URL',
          errorMessage: 'O Firebase Storage não retornou uma URL HTTPS válida. Nenhum agendamento foi criado.'
        });
      }
      if (parsedPublicVideoUrl.protocol !== 'https:' || !parsedPublicVideoUrl.hostname) {
        return failVideoJob({
          docRef,
          userId: workingJob.userId,
          reservationId: workingJob.reservationId,
          ownerToken,
          ownerFence,
          errorCode: 'INVALID_PUBLIC_VIDEO_URL',
          errorMessage: 'O Firebase Storage não retornou uma URL HTTPS válida. Nenhum agendamento foi criado.'
        });
      }

      const renewedAfterStorage = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
      if (!renewedAfterStorage) {
        await deleteStoredVideo(storagePath);
        return (await readLatestVideoJob(docRef)) || workingJob;
      }
      workingJob = renewedAfterStorage;

      const contentItem = {
        id: contentItemId,
        userId: workingJob.userId,
        companyId: workingJob.companyId || 'default',
        type: 'video',
        title: workingJob.title || `Vídeo IA - ${(workingJob.sourcePrompt || workingJob.prompt).slice(0, 60)}`,
        headline: workingJob.title || '',
        body: workingJob.sourcePrompt || workingJob.prompt,
        imageUrl: workingJob.coverImageUrl || '',
        videoUrl: publicVideoUrl,
        targetPlatform: workingJob.aspectRatio === '9:16' ? 'Reels / TikTok / Shorts' : 'YouTube / Banner',
        status: Array.isArray(workingJob.autoPublishPlatforms) && workingJob.autoPublishPlatforms.length > 0 ? 'scheduled' : 'saved',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: {
          jobId: workingJob.id,
          storagePath,
          preset: workingJob.preset,
          resolution: workingJob.resolution,
          actualResolution: workingJob.resolution,
          durationSeconds: workingJob.durationSeconds,
          aspectRatio: workingJob.aspectRatio,
          modelUsed: workingJob.modelUsed,
          finalPrompt: workingJob.finalPrompt,
          finalizationFence: ownerFence
        }
      };
      const contentRef = db.collection(COLLECTIONS.contentItems).doc(contentItemId);
      const persisted = await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(docRef);
        if (!freshSnap.exists) return { owned: false, job: null as VideoJobData | null };
        const current = freshSnap.data() as VideoJobData;
        if (!isSameFinalizationOwner(current, ownerToken, ownerFence)) return { owned: false, job: current };
        const next: VideoJobData = {
          ...current,
          pipelineState: 'result_persisted',
          videoUrl: publicVideoUrl,
          storagePath,
          contentItemId,
          actualResolution: current.resolution,
          progressPct: 97,
          finalizationLeaseUntil: new Date(Date.now() + VIDEO_FINALIZATION_LEASE_MS).toISOString(),
          updatedAt: nowIso()
        };
        tx.set(contentRef, contentItem);
        const autoPublishPlatforms = Array.isArray(current.autoPublishPlatforms)
          ? current.autoPublishPlatforms.map((item) => String(item)).filter(Boolean).slice(0, 10)
          : [];
        if (autoPublishPlatforms.length > 0) {
          const scheduleId = `sched-video-${current.id}`;
          const scheduleRef = db.collection(COLLECTIONS.scheduledPosts).doc(scheduleId);
          tx.set(scheduleRef, {
            id: scheduleId,
            userId: current.userId,
            companyId: current.companyId,
            contentItemId,
            platforms: autoPublishPlatforms,
            scheduledFor: nowIso(),
            status: 'scheduled',
            isPlanning: false,
            autopilotGenerated: true,
            providerOptions: current.autoPublishProviderOptions || { youtubePrivacyStatus: 'unlisted' },
            createdAt: nowIso(),
            updatedAt: nowIso()
          }, { merge: true });
        }
        tx.set(docRef, next);
        return { owned: true, job: next };
      });

      if (!persisted.owned) {
        await deleteStoredVideo(storagePath);
        return persisted.job || workingJob;
      }
      workingJob = persisted.job as VideoJobData;
      contentPersisted = true;
    }

    if (!publicVideoUrl || !storagePath || !contentPersisted) {
      return failVideoJob({
        docRef,
        userId: workingJob.userId,
        reservationId: workingJob.reservationId,
        ownerToken,
        ownerFence,
        errorCode: 'INCOMPLETE_PERSISTED_RESULT',
        errorMessage: 'O resultado persistido do vídeo está incompleto. A operação foi encerrada com segurança.'
      });
    }

    const renewedBeforeCommit = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence);
    if (!renewedBeforeCommit) return (await readLatestVideoJob(docRef)) || workingJob;
    workingJob = renewedBeforeCommit;

    const creditsMarked = await renewVideoFinalizationLease(docRef, ownerToken, ownerFence, {
      pipelineState: 'credits_committed',
      creditsCommitted: 0,
      progressPct: 99
    });
    if (!creditsMarked) return (await readLatestVideoJob(docRef)) || workingJob;
    workingJob = creditsMarked;

    const completion = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) return null;
      const current = freshSnap.data() as VideoJobData;
      if (current.status === 'completed') return current;
      if (!isSameFinalizationOwner(current, ownerToken, ownerFence)) return current;
      const completedJob: VideoJobData = {
        ...current,
        status: 'completed',
        pipelineState: 'completed',
        progressPct: 100,
        videoUrl: publicVideoUrl,
        storagePath,
        contentItemId,
        actualResolution: current.resolution,
        creditsCommitted: 0,
        completedAt: nowIso(),
        updatedAt: nowIso()
      };
      tx.set(docRef, completedJob);
      return completedJob;
    });

    const completedJob = completion || workingJob;
    if (completedJob.status === 'completed') {
      try {
        await createNotification({
          userId: completedJob.userId,
          title: 'Seu vídeo com Veo 3.1 está pronto!',
          message: `O vídeo "${completedJob.title || 'Criativo IA'}" foi processado com sucesso em ${completedJob.resolution} e já está disponível para visualização e download.`,
          type: 'video_ready'
        });
      } catch (notificationError) {
        console.warn('[Froc AI Video Notification] Vídeo concluído; notificação será tentada posteriormente:', notificationError);
      }
    }
    return completedJob;
  } catch (error: any) {
    const message = formatAiErrorMessage(error instanceof Error ? error.message : String(error));
    const failedJob = await failVideoJob({
      docRef,
      userId: workingJob.userId,
      reservationId: workingJob.reservationId,
      ownerToken,
      ownerFence,
      errorCode: String(error?.videoErrorCode || 'VIDEO_FINALIZATION_FAILED'),
      errorMessage: message
    });
    if (
      failedJob.status === 'failed' &&
      failedJob.finalizationToken === ownerToken &&
      Number(failedJob.finalizationFence || 0) === ownerFence
    ) {
      await deleteStoredVideo(storagePath);
      if (contentPersisted) {
        try { await db.collection(COLLECTIONS.contentItems).doc(contentItemId).delete(); } catch {}
      }
    }
    return failedJob;
  }
}

export interface VideoJobWorkerTelemetry {
  checked: number;
  started: number;
  retryScheduled: number;
  completed: number;
  published: number;
  failed: number;
  schedulesRecovered: number;
}

const VIDEO_AUTOPUBLISH_PROVIDERS = new Map<string, string>([
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['x', 'X'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['pinterest', 'Pinterest']
]);

function recoverableVideoPlatforms(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const recovered = new Set<string>();
  for (const value of values) {
    const normalized = String(value || '').trim().toLowerCase();
    const provider = VIDEO_AUTOPUBLISH_PROVIDERS.get(normalized);
    if (provider) recovered.add(provider);
  }
  return [...recovered];
}

function resultProvider(result: any): string {
  return normalizeProvider(String(result?.provider || result?.platform || ''));
}

function isMissingConnectionFailure(result: any): boolean {
  if (result?.success) return false;
  const message = String(result?.error || result?.errorMessage || '').toLowerCase();
  return (
    message.includes('não conectad') ||
    message.includes('nao conectad') ||
    message.includes('sem conexão') ||
    message.includes('sem conexao') ||
    message.includes('not connected') ||
    message.includes('connection not found')
  );
}

function canSafelyRecoverProvider(provider: string, results: any[]): boolean {
  const providerResults = results.filter((result: any) => resultProvider(result) === provider);
  if (providerResults.some((result: any) => result?.success === true)) return false;
  if (providerResults.some((result: any) =>
    result?.externalState === 'unknown' || result?.requiresUserAction === true || result?.deliveryMode === 'draft'
  )) return false;
  if (providerResults.length === 0) return true;
  return providerResults.some((result: any) => result?.retrySafe !== false || isMissingConnectionFailure(result));
}

async function configuredVideoPlatforms(job: VideoJobData, schedule?: any): Promise<string[]> {
  const configured = new Set<string>([
    ...recoverableVideoPlatforms(job.autoPublishPlatforms),
    ...recoverableVideoPlatforms(schedule?.platforms)
  ]);
  const db = firestore();
  const configId = `${job.userId}_${job.companyId}`;
  let configSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(configId).get();
  if (!configSnap.exists) configSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(job.companyId).get();
  if (configSnap.exists) {
    const autopilotConfig = configSnap.data() as any;
    if (autopilotConfig?.mode === 'automatic' && autopilotConfig?.enabled !== false) {
      for (const platform of recoverableVideoPlatforms(autopilotConfig.targetPlatforms)) configured.add(platform);
    }
  }
  return [...configured];
}

async function recoverCompletedVideoSchedules(signal?: AbortSignal): Promise<number> {
  if (signal?.aborted) return 0;
  const db = firestore();
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;

  // Uma execução de recuperação antiga pode ter encontrado mais de um ciclo
  // recente do mesmo projeto. Antes de publicar qualquer coisa, preserva só o
  // agendamento recuperado mais novo de cada projeto e cancela os excedentes.
  const recoveredSchedulesSnap = await db.collection(COLLECTIONS.scheduledPosts)
    .where('status', '==', 'scheduled')
    .limit(100)
    .get();
  const recoveredByCompany = new Map<string, any[]>();
  for (const scheduleDoc of recoveredSchedulesSnap.docs) {
    const schedule = scheduleDoc.data() as any;
    if (schedule.recoveredFromCompletedVideo !== true) continue;
    const companyId = String(schedule.companyId || '');
    if (!companyId) continue;
    const group = recoveredByCompany.get(companyId) || [];
    group.push({ doc: scheduleDoc, schedule });
    recoveredByCompany.set(companyId, group);
  }
  for (const group of recoveredByCompany.values()) {
    group.sort((left, right) => String(right.schedule.createdAt || '').localeCompare(String(left.schedule.createdAt || '')));
    for (const duplicate of group.slice(1)) {
      await duplicate.doc.ref.set({
        status: 'cancelled',
        errorMessage: 'Agendamento recuperado excedente cancelado: somente o vídeo mais recente deste projeto será publicado.',
        cancelledAt: nowIso(),
        updatedAt: nowIso()
      }, { merge: true });
    }
  }

  const completedSnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
    .where('status', '==', 'completed')
    .limit(100)
    .get();
  let recovered = 0;

  const recentCandidates = completedSnap.docs
    .map((doc: any) => ({ doc, job: doc.data() as VideoJobData }))
    .filter(({ job }) => {
      const timestamp = new Date(job.completedAt || job.updatedAt || job.createdAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff && Boolean(job.contentItemId && job.videoUrl);
    })
    .sort((a, b) => String(b.job.createdAt).localeCompare(String(a.job.createdAt)));
  const newestByCompany = new Map<string, { doc: any; job: VideoJobData }>();
  for (const candidate of recentCandidates) {
    const companyId = String(candidate.job.companyId || 'default');
    if (!newestByCompany.has(companyId)) newestByCompany.set(companyId, candidate);
  }
  const candidates = [...newestByCompany.values()]
    .sort((a, b) => String(a.job.createdAt).localeCompare(String(b.job.createdAt)));

  for (const { doc, job } of candidates) {
    if (signal?.aborted) break;
    const scheduleRef = db.collection(COLLECTIONS.scheduledPosts).doc(`sched-video-${job.id}`);
    const existingSchedule = await scheduleRef.get();
    if (existingSchedule.exists) {
      const schedule = existingSchedule.data() as any;
      const scheduleStatus = String(schedule?.status || '');
      const contentRef = db.collection(COLLECTIONS.contentItems).doc(String(job.contentItemId));
      const publicationResults = Array.isArray(schedule?.publicationResults) ? schedule.publicationResults : [];

      if (scheduleStatus === 'published') {
        await contentRef.set({
          status: 'published',
          ...(schedule.youtubeVideoId ? { youtubeVideoId: schedule.youtubeVideoId } : {}),
          ...(schedule.youtubeUrl ? { youtubeUrl: schedule.youtubeUrl } : {}),
          updatedAt: nowIso()
        }, { merge: true });
      } else if (scheduleStatus === 'requires_review') {
        await contentRef.set({ status: 'requires_review', updatedAt: nowIso() }, { merge: true });
      } else if (scheduleStatus === 'failed') {
        const hasUnsafeResult = publicationResults.some((result: any) =>
          result?.externalState === 'unknown' || result?.requiresUserAction === true || result?.deliveryMode === 'draft'
        );
        if (hasUnsafeResult) {
          await scheduleRef.set({
            status: 'requires_review',
            errorMessage: 'Há uma resposta externa indefinida; confira a rede antes de tentar novamente.',
            updatedAt: nowIso()
          }, { merge: true });
          await contentRef.set({ status: 'requires_review', updatedAt: nowIso() }, { merge: true });
        } else {
          await contentRef.set({ status: 'failed', updatedAt: nowIso() }, { merge: true });
        }
      }

      // Nunca reabre o agendamento original: ele contém resultados terminais que
      // fariam o publicador pular as chamadas externas. Cria uma fila limpa e
      // determinística apenas para redes ainda não entregues e agora conectadas.
      if (['published', 'failed', 'requires_review'].includes(scheduleStatus)) {
        const previousRecoveryRef = db.collection(COLLECTIONS.scheduledPosts)
          .doc(`sched-video-${job.id}-connection-recovery`);
        const previousRecoverySnap = await previousRecoveryRef.get();
        const previousRecovery = previousRecoverySnap.exists ? previousRecoverySnap.data() as any : null;
        const historicalResults = [
          ...publicationResults,
          ...(Array.isArray(previousRecovery?.publicationResults) ? previousRecovery.publicationResults : [])
        ];
        const recoveryId = `sched-video-${job.id}-all-networks-recovery-v1`;
        const recoveryRef = db.collection(COLLECTIONS.scheduledPosts).doc(recoveryId);
        const desiredPlatforms = await configuredVideoPlatforms(job, schedule);
        const eligiblePlatforms: string[] = [];
        for (const platform of desiredPlatforms) {
          const provider = normalizeProvider(platform);
          if (!provider || !canSafelyRecoverProvider(provider, historicalResults)) continue;
          if (await checkUniversalConnectionReady(job.userId, job.companyId, provider)) {
            eligiblePlatforms.push(platform);
          }
        }
        if (eligiblePlatforms.length > 0) {
          const didRecover = await db.runTransaction(async (tx: any) => {
            const [freshRecovery, contentSnap] = await Promise.all([tx.get(recoveryRef), tx.get(contentRef)]);
            if (freshRecovery.exists || !contentSnap.exists) return false;
            const content = contentSnap.data() as any;
            if (!content.videoUrl || content.userId !== job.userId || content.companyId !== job.companyId) return false;
            const timestamp = nowIso();
            tx.set(recoveryRef, {
              id: recoveryId,
              userId: job.userId,
              companyId: job.companyId,
              contentItemId: job.contentItemId,
              platforms: eligiblePlatforms,
              publicationResults: [],
              scheduledFor: timestamp,
              status: 'scheduled',
              isPlanning: false,
              autopilotGenerated: true,
              recoveredAfterSharedConnections: true,
              sourceScheduleId: scheduleRef.id,
              providerOptions: schedule?.providerOptions || job.autoPublishProviderOptions || { youtubePrivacyStatus: 'unlisted' },
              createdAt: timestamp,
              updatedAt: timestamp
            });
            tx.set(contentRef, { status: 'scheduled', updatedAt: timestamp }, { merge: true });
            return true;
          });
          if (didRecover) recovered++;
        }
      }
      const autopilotSnap = await db.collection(COLLECTIONS.autopilotJobs).where('videoJobId', '==', job.id).limit(1).get();
      if (!autopilotSnap.empty && String(autopilotSnap.docs[0].data()?.status || '') === 'video_processing') {
        await autopilotSnap.docs[0].ref.set({
          status: 'completed',
          contentId: job.contentItemId,
          completedAt: job.completedAt || nowIso(),
          updatedAt: nowIso()
        }, { merge: true });
      }
      continue;
    }

    let platforms = recoverableVideoPlatforms(job.autoPublishPlatforms);
    const autopilotSnap = await db.collection(COLLECTIONS.autopilotJobs).where('videoJobId', '==', job.id).limit(1).get();
    if (platforms.length === 0 && !autopilotSnap.empty) {
      const autopilotJob = autopilotSnap.docs[0].data() as any;
      const configId = `${job.userId}_${job.companyId}`;
      let configSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(configId).get();
      if (!configSnap.exists) configSnap = await db.collection(COLLECTIONS.autopilotConfigs).doc(job.companyId).get();
      const autopilotConfig = configSnap.exists ? (configSnap.data() as any) : null;
      if (autopilotJob?.mode === 'automatic' && autopilotConfig?.mode === 'automatic' && autopilotConfig?.enabled !== false) {
        platforms = recoverableVideoPlatforms(autopilotConfig.targetPlatforms);
      }
    }
    if (platforms.length === 0) continue;

    const contentRef = db.collection(COLLECTIONS.contentItems).doc(String(job.contentItemId));
    const didRecover = await db.runTransaction(async (tx: any) => {
      const [freshJob, freshSchedule, contentSnap] = await Promise.all([
        tx.get(doc.ref), tx.get(scheduleRef), tx.get(contentRef)
      ]);
      if (!freshJob.exists || freshJob.data()?.status !== 'completed' || freshSchedule.exists || !contentSnap.exists) return false;
      const content = contentSnap.data() as any;
      if (!content.videoUrl || content.userId !== job.userId || content.companyId !== job.companyId) return false;
      const timestamp = nowIso();
      tx.set(scheduleRef, {
        id: `sched-video-${job.id}`,
        userId: job.userId,
        companyId: job.companyId,
        contentItemId: job.contentItemId,
        platforms,
        scheduledFor: timestamp,
        status: 'scheduled',
        isPlanning: false,
        autopilotGenerated: true,
        recoveredFromCompletedVideo: true,
        providerOptions: job.autoPublishProviderOptions || { youtubePrivacyStatus: 'unlisted' },
        createdAt: timestamp,
        updatedAt: timestamp
      });
      tx.set(contentRef, { status: 'scheduled', updatedAt: timestamp }, { merge: true });
      tx.set(doc.ref, { autoPublishPlatforms: platforms, scheduleRecoveredAt: timestamp, updatedAt: timestamp }, { merge: true });
      return true;
    });
    if (didRecover) recovered++;

    if (!autopilotSnap.empty) {
      await autopilotSnap.docs[0].ref.set({
        status: 'completed',
        contentId: job.contentItemId,
        completedAt: job.completedAt || nowIso(),
        updatedAt: nowIso()
      }, { merge: true });
    }
  }
  return recovered;
}

export async function processPendingVideoJobs(options?: { signal?: AbortSignal; trigger?: string }): Promise<VideoJobWorkerTelemetry> {
  const telemetry: VideoJobWorkerTelemetry = {
    checked: 0,
    started: 0,
    retryScheduled: 0,
    completed: 0,
    published: 0,
    failed: 0,
    schedulesRecovered: 0
  };

  try {
    if (options?.signal?.aborted) {
      return telemetry;
    }
    const db = firestore();

    // 1. Jobs em retry_scheduled que aguardam nova tentativa
    const retrySnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
      .where('status', '==', 'retry_scheduled')
      .limit(10)
      .get();

    const processingSnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
      .where('status', '==', 'processing')
      .limit(5)
      .get();

    const finalizingSnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
      .where('status', '==', 'finalizing')
      .limit(5)
      .get();

    const queuedSnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
      .where('status', '==', 'queued')
      .limit(10)
      .get();

    const failedSnap = await db.collection(COLLECTIONS.mediaGenerationJobs)
      .where('status', '==', 'failed')
      .limit(10)
      .get();

    for (const doc of failedSnap.docs) {
      if (options?.signal?.aborted) break;
      const job = doc.data() as VideoJobData;
      const failedAt = new Date(job.updatedAt || job.createdAt).getTime();
      const message = String(job.errorMessage || '');
      const attempts = Number(job.attemptCount || 0);
      const maxAttempts = Number(job.maxAttempts || 5);
      const isRecent = Number.isFinite(failedAt) && Date.now() - failedAt <= 48 * 60 * 60 * 1000;
      const isTransient = /internal server|temporar|try again|timeout|indispon/i.test(message);
      if (!isRecent || !isTransient || attempts >= maxAttempts) continue;
      telemetry.checked++;
      try {
        const retried = await startOrRetryVideoOperation(job.id, { workerId: `recovery_${options?.trigger || 'cron'}` });
        if (retried.status === 'processing') telemetry.started++;
        else if (retried.status === 'retry_scheduled') telemetry.retryScheduled++;
        else if (retried.status === 'completed') telemetry.completed++;
        else if (retried.status === 'failed' || retried.status === 'failed_permanent') telemetry.failed++;
      } catch (error) {
        console.warn(`[Video Background Worker] Erro ao recuperar job falho ${job.id}:`, error);
      }
    }

    // Processa retries agendados
    for (const doc of retrySnap.docs) {
      if (options?.signal?.aborted) break;
      const job = doc.data() as VideoJobData;
      telemetry.checked++;

      // Se possui lease ativo concedido a outro worker, não interfere
      if (job.leaseUntil && Date.now() < new Date(job.leaseUntil).getTime()) {
        continue;
      }

      const nextTime = job.nextAttemptAt ? new Date(job.nextAttemptAt).getTime() : 0;
      if (Date.now() >= nextTime) {
        try {
          const retried = await startOrRetryVideoOperation(job.id);
          if (retried.status === 'processing') {
            telemetry.started++;
          } else if (retried.status === 'retry_scheduled') {
            telemetry.retryScheduled++;
          } else if (retried.status === 'completed') {
            telemetry.completed++;
          } else if (retried.status === 'published') {
            telemetry.published++;
            telemetry.completed++;
          } else if (retried.status === 'failed_permanent' || retried.status === 'failed') {
            telemetry.failed++;
          }
        } catch (err) {
          console.warn(`[Video Background Worker] Erro ao retentar job ${job.id}:`, err);
        }
      }
    }

    const staleQueuedDocs = queuedSnap.docs.filter((doc: any) => {
      const queuedJob = doc.data() as VideoJobData;
      const providerStartedAt = new Date(queuedJob.providerStartedAt || queuedJob.updatedAt || queuedJob.createdAt).getTime();
      return Number.isFinite(providerStartedAt) && Date.now() - providerStartedAt >= VIDEO_PROVIDER_START_TIMEOUT_MS;
    });
    // Ordena globalmente pelo job menos recentemente atendido. Sem esta
    // alternância, os primeiros documentos retornados pelo Firestore podem
    // monopolizar todos os ciclos e deixar os demais projetos sem conclusão.
    const docs = [...processingSnap.docs, ...finalizingSnap.docs, ...staleQueuedDocs]
      .sort((left: any, right: any) => {
        const leftData = left.data() as VideoJobData;
        const rightData = right.data() as VideoJobData;
        const leftTime = new Date(leftData.updatedAt || leftData.createdAt || 0).getTime();
        const rightTime = new Date(rightData.updatedAt || rightData.createdAt || 0).getTime();
        return leftTime - rightTime;
      })
      .slice(0, 8);

    for (const doc of docs) {
      if (options?.signal?.aborted) break;
      const job = doc.data() as VideoJobData;

      if (job.status === 'queued') {
        telemetry.checked++;
        try {
          if (options?.signal?.aborted) break;
          const result = await failVideoJob({
            docRef: db.collection(COLLECTIONS.mediaGenerationJobs).doc(job.id),
            userId: job.userId,
            reservationId: job.reservationId,
            errorCode: 'PROVIDER_START_TIMEOUT',
            errorMessage: 'A inicialização do provedor de vídeo excedeu o tempo seguro. A operação foi encerrada com segurança.'
          });
          if (result.status === 'failed' || result.status === 'failed_permanent') telemetry.failed++;
        } catch (error) {
          console.warn(`[Video Background Worker] Erro ao encerrar job órfão ${job.id}:`, error);
        }
        continue;
      }
      
      // Se status for finalizing, verificar se o lease expirou antes de reprocessar
      if (job.status === 'finalizing' && job.finalizationLeaseUntil) {
        const leaseTime = new Date(job.finalizationLeaseUntil).getTime();
        if (Date.now() < leaseTime) {
          continue; // Outro processo ainda possui o lease
        }
      }

      telemetry.checked++;
      try {
        if (options?.signal?.aborted) break;
        const res = await checkAndCompleteVideoJob(job.userId, job.id);
        if (res.status === 'published') {
          telemetry.published++;
          telemetry.completed++;
        } else if (res.status === 'completed') {
          telemetry.completed++;
        } else if (res.status === 'retry_scheduled') {
          telemetry.retryScheduled++;
        } else if (res.status === 'failed' || res.status === 'failed_permanent') {
          telemetry.failed++;
        }
      } catch (err) {
        console.warn(`[Video Background Worker] Erro ao processar job ${job.id}:`, err);
      }
    }

    telemetry.schedulesRecovered = await recoverCompletedVideoSchedules(options?.signal);
    return telemetry;
  } catch (error) {
    console.warn('[Video Background Worker] Erro ao consultar jobs pendentes:', error);
    return telemetry;
  }
}

export async function listUserVideoJobs(userId: string, companyId?: string): Promise<VideoJobData[]> {
  let query: any = firestore().collection(COLLECTIONS.mediaGenerationJobs).where('userId', '==', userId);
  if (companyId && companyId !== 'all') {
    query = query.where('companyId', '==', companyId);
  }
  const items = queryData<VideoJobData>(await query.get());
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
