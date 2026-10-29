import { config } from '../config/index.js';
import { COLLECTIONS, firestore, nowIso } from './store.js';

export interface GoogleSearchConsoleStatus {
  configured: boolean;
  status: 'connected' | 'configured' | 'unconfigured' | 'auth_failed' | 'permission_denied' | 'error';
  siteUrl?: string;
  hasCredentials: boolean;
  message: string;
  lastCheckedAt: string;
}

export interface GoogleSearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GoogleSearchAnalyticsResult {
  configured: boolean;
  rows: GoogleSearchAnalyticsRow[];
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  error?: string;
}

export interface GoogleSearchConsoleSitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
}

/**
 * Consulta a configuração e saúde da integração oficial com o Google Search Console.
 * Diferencia explicitamente: credenciais ausentes, falha de autenticação, falta de permissão e conexão funcional.
 * Fail-Closed & Sem Falsificações: Não simula métricas falsas.
 */
export async function getGoogleSearchConsoleStatus(): Promise<GoogleSearchConsoleStatus> {
  const serviceAccountEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || config.appUrl.replace(/\/$/, '');

  const hasCredentials = Boolean(serviceAccountEmail && privateKey);

  if (!hasCredentials) {
    return {
      configured: false,
      status: 'unconfigured',
      siteUrl,
      hasCredentials: false,
      message: 'Google Search Console não configurado: Credenciais (service account / chave privada) ausentes em variáveis de ambiente.',
      lastCheckedAt: nowIso()
    };
  }

  // Se credenciais existem, valida o token e a permissão real na propriedade
  const token = await getSearchConsoleAccessToken();
  if (!token) {
    return {
      configured: false,
      status: 'auth_failed',
      siteUrl,
      hasCredentials: true,
      message: 'Falha de autenticação: Credenciais presentes, mas a chave privada ou conta de serviço foram rejeitadas pelo endpoint OAuth2 do Google.',
      lastCheckedAt: nowIso()
    };
  }

  try {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 403) {
      return {
        configured: true,
        status: 'permission_denied',
        siteUrl,
        hasCredentials: true,
        message: `Conta de serviço autenticada, mas sem permissão de acesso à propriedade "${siteUrl}" no Search Console. Adicione ${serviceAccountEmail} como usuário no painel do Google Search Console.`,
        lastCheckedAt: nowIso()
      };
    }

    if (!res.ok) {
      return {
        configured: true,
        status: 'error',
        siteUrl,
        hasCredentials: true,
        message: `API Search Console retornou status HTTP ${res.status} ao consultar a propriedade.`,
        lastCheckedAt: nowIso()
      };
    }

    return {
      configured: true,
      status: 'connected',
      siteUrl,
      hasCredentials: true,
      message: 'Conexão ativa e verificada com o Google Search Console via API oficial autenticada.',
      lastCheckedAt: nowIso()
    };
  } catch (netErr: any) {
    return {
      configured: true,
      status: 'error',
      siteUrl,
      hasCredentials: true,
      message: `Erro de conexão ao verificar propriedade no Google Search Console: ${netErr?.message || netErr}`,
      lastCheckedAt: nowIso()
    };
  }
}

/**
 * Obtém token OAuth2 via JWT de Conta de Serviço Google para a API Webmasters/Search Console.
 */
async function getSearchConsoleAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) return null;
  key = key.replace(/\\n/g, '\n');

  try {
    // Monta JWT manual para Google OAuth2 token endpoint
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    const payload = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
    const toSign = `${header}.${payload}`;

    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(toSign);
    const signature = signer.sign(key, 'base64url');
    const jwt = `${toSign}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      console.warn('[GoogleSearchConsole] Falha na troca de JWT por token de acesso Google:', res.status);
      return null;
    }

    const json = await res.json() as any;
    return json.access_token || null;
  } catch (err: any) {
    console.warn('[GoogleSearchConsole] Erro ao obter access_token:', err?.message || err);
    return null;
  }
}

/**
 * Consulta sitemaps registrados na API do Google Search Console.
 */
export async function listSearchConsoleSitemaps(): Promise<{
  configured: boolean;
  sitemaps: GoogleSearchConsoleSitemapInfo[];
  error?: string;
}> {
  const status = await getGoogleSearchConsoleStatus();
  if (!status.configured) {
    return {
      configured: false,
      sitemaps: [],
      error: 'Google Search Console não configurado no ambiente.'
    };
  }

  const token = await getSearchConsoleAccessToken();
  if (!token) {
    return {
      configured: true,
      sitemaps: [],
      error: 'Não foi possível autenticar junto à API do Google Search Console com a chave fornecida.'
    };
  }

  const siteUrl = encodeURIComponent(status.siteUrl || config.appUrl.replace(/\/$/, ''));
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps`;

  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        configured: true,
        sitemaps: [],
        error: `API Google Search Console retornou HTTP ${res.status}: ${errText.slice(0, 300)}`
      };
    }

    const data = await res.json() as any;
    const items = Array.isArray(data.sitemap) ? data.sitemap : [];
    return {
      configured: true,
      sitemaps: items.map((sm: any) => ({
        path: sm.path,
        lastSubmitted: sm.lastSubmitted,
        isPending: sm.isPending,
        isSitemapsIndex: sm.isSitemapsIndex,
        type: sm.type,
        lastDownloaded: sm.lastDownloaded,
        warnings: Number(sm.warnings || 0),
        errors: Number(sm.errors || 0)
      }))
    };
  } catch (err: any) {
    return {
      configured: true,
      sitemaps: [],
      error: `Falha de rede ao consultar Google Search Console: ${err?.message || err}`
    };
  }
}

/**
 * Submete formalmente a URL do sitemap à API do Google Search Console.
 */
export async function submitSearchConsoleSitemap(feedpath: string): Promise<{
  success: boolean;
  message: string;
  configured: boolean;
}> {
  const status = await getGoogleSearchConsoleStatus();
  if (!status.configured) {
    return {
      success: false,
      configured: false,
      message: 'Google Search Console não configurado: Credenciais ausentes. Não simulamos envio falso.'
    };
  }

  const token = await getSearchConsoleAccessToken();
  if (!token) {
    return {
      success: false,
      configured: true,
      message: 'Falha ao autenticar token junto à API do Google Search Console.'
    };
  }

  const siteUrl = encodeURIComponent(status.siteUrl || config.appUrl.replace(/\/$/, ''));
  const sitemapUrl = encodeURIComponent(feedpath);
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps/${sitemapUrl}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 204 || res.status === 200) {
      // Registra persistência de envio no Firestore
      try {
        await firestore().collection(COLLECTIONS.systemSettings).doc('latest_gsc_submission').set({
          feedpath,
          submittedAt: nowIso(),
          status: 'submitted',
          responseStatus: res.status
        }, { merge: true });
      } catch {}

      return {
        success: true,
        configured: true,
        message: `Sitemap submetido com sucesso à API oficial do Google Search Console (HTTP ${res.status}).`
      };
    }

    const errBody = await res.text();
    return {
      success: false,
      configured: true,
      message: `Google Search Console rejeitou submissão (HTTP ${res.status}): ${errBody.slice(0, 300)}`
    };
  } catch (err: any) {
    return {
      success: false,
      configured: true,
      message: `Erro de conexão ao submeter sitemap ao Google Search Console: ${err?.message || err}`
    };
  }
}

/**
 * Consulta relatórios reais de desempenho orgânico (Search Analytics) da API oficial do Google Search Console.
 * Sem simulação: se não configurado ou sem permissão, reporta o status real sem dados falsos.
 */
export async function querySearchAnalytics(options: {
  startDate?: string;
  endDate?: string;
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'searchAppearance' | 'date'>;
  rowLimit?: number;
} = {}): Promise<GoogleSearchAnalyticsResult> {
  const status = await getGoogleSearchConsoleStatus();
  if (!status.configured) {
    return {
      configured: false,
      rows: [],
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
      error: status.message || 'Google Search Console não configurado no ambiente.'
    };
  }

  const token = await getSearchConsoleAccessToken();
  if (!token) {
    return {
      configured: true,
      rows: [],
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
      error: 'Não foi possível autenticar junto à API do Google Search Console com as credenciais fornecidas.'
    };
  }

  const siteUrl = encodeURIComponent(status.siteUrl || config.appUrl.replace(/\/$/, ''));
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  const now = new Date();
  const endDate = options.endDate || now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const startDate = options.startDate || thirtyDaysAgo.toISOString().slice(0, 10);

  const requestBody = {
    startDate,
    endDate,
    dimensions: options.dimensions || ['query', 'page'],
    rowLimit: Math.min(1000, Math.max(1, options.rowLimit || 50))
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        configured: true,
        rows: [],
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        error: `API Google Search Console retornou HTTP ${res.status}: ${errText.slice(0, 300)}`
      };
    }

    const data = await res.json() as any;
    const rawRows = Array.isArray(data.rows) ? data.rows : [];

    let totalClicks = 0;
    let totalImpressions = 0;
    let sumCtr = 0;
    let sumPos = 0;

    const rows: GoogleSearchAnalyticsRow[] = rawRows.map((r: any) => {
      const clicks = Number(r.clicks || 0);
      const impressions = Number(r.impressions || 0);
      const ctr = Number(r.ctr || 0);
      const position = Number(r.position || 0);

      totalClicks += clicks;
      totalImpressions += impressions;
      sumCtr += ctr;
      sumPos += position;

      return {
        keys: Array.isArray(r.keys) ? r.keys : [],
        clicks,
        impressions,
        ctr,
        position
      };
    });

    const averageCtr = rows.length > 0 ? sumCtr / rows.length : 0;
    const averagePosition = rows.length > 0 ? sumPos / rows.length : 0;

    return {
      configured: true,
      rows,
      totalClicks,
      totalImpressions,
      averageCtr: Math.round(averageCtr * 10000) / 10000,
      averagePosition: Math.round(averagePosition * 100) / 100
    };
  } catch (err: any) {
    return {
      configured: true,
      rows: [],
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
      error: `Erro de rede ao consultar Search Analytics: ${err?.message || err}`
    };
  }
}
