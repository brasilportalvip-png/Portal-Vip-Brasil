import { config } from '../config/index.js';
import { PORTAL_VIP_OFFICIAL_ASSETS, PORTAL_VIP_PROJECTS, getProjectBySlug } from './almaPortfolio.js';
import { COLLECTIONS, firestore } from './store.js';

function esc(value: any): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function jsonLd(value: any): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
function absolute(value?: string): string {
  if (!value) return PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
  try { return new URL(value, config.appUrl).toString(); } catch { return PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl; }
}
function description(value: any, fallback: string): string {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 180);
}

interface PublicMeta {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'website' | 'article';
  status: number;
  schema: any;
}

async function metaFor(pathname: string): Promise<PublicMeta> {
  const base = config.appUrl.replace(/\/$/, '');
  const fallback: PublicMeta = {
    title: 'Portal Vip Brasil — Central de Marketing, Vitrine e Divulgação Automática',
    description: 'Vitrine oficial e motor de marketing do Portal Vip Brasil. Divulgação de sites e aplicativos da Play Store com SEO inteligente para Bing e Google.',
    canonical: `${base}${pathname === '/' ? '/' : pathname}`,
    image: PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
    type: 'website',
    status: 200,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Portal Vip Brasil',
      url: base,
      logo: PORTAL_VIP_OFFICIAL_ASSETS.logoUrl
    }
  };

  if (pathname === '/vitrine') {
    return {
      ...fallback,
      title: 'Vitrine Oficial de Sites & Aplicativos — Portal Vip Brasil',
      description: 'Conheça nosso portfólio de sites e aplicativos da Play Store: Magia das Crenças, Exu Responde, Maria Padilha, Manual Católico, Froc IA, Oráculos TS e Marketing Engine.'
    };
  }

  const vitrineMatch = pathname.match(/^\/vitrine\/([^/]+)$/);
  if (vitrineMatch) {
    const slug = decodeURIComponent(vitrineMatch[1]);
    const localProject = getProjectBySlug(slug);
    if (localProject) {
      const canonical = `${base}/vitrine/${encodeURIComponent(localProject.slug)}`;
      return {
        title: `${localProject.name} — Vitrine Portal Vip Brasil`,
        description: description(localProject.description, `${localProject.name} no Portal Vip Brasil.`),
        canonical,
        image: localProject.bannerUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
        type: 'website',
        status: 200,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: localProject.name,
          url: localProject.websiteUrl,
          applicationCategory: localProject.category,
          operatingSystem: localProject.hasApp ? 'Web, Android' : 'Web',
          description: localProject.description
        }
      };
    }
  }
  if (vitrineMatch) {
    return {
      ...fallback,
      status: 404,
      title: 'Projeto não encontrado — Portal Vip Brasil',
      description: 'Este projeto não faz parte da vitrine oficial do Portal Vip Brasil.'
    };
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const slug = decodeURIComponent(blogMatch[1]);
      const snap = await firestore().collection(COLLECTIONS.blogPosts).where('slug', '==', slug).where('status', '==', 'published').limit(1).get();
      if (snap.empty) return { ...fallback, status: 404, title: 'Artigo não encontrado — Portal Vip Brasil', description: 'Este artigo não está disponível no blog do Portal Vip Brasil.' };
      const post = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      const canonical = `${base}/blog/${encodeURIComponent(post.slug)}`;
      return {
        title: post.seoTitle || `${post.title} — Portal Vip Brasil`,
        description: description(post.seoDescription || post.summary, 'Artigo do Portal Vip Brasil.'),
        canonical, image: absolute(post.featuredImageUrl), type: 'article', status: 200,
        schema: {
          '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.summary || post.seoDescription,
          image: post.featuredImageUrl ? [absolute(post.featuredImageUrl)] : undefined,
          datePublished: post.publishedAt || post.createdAt, dateModified: post.updatedAt || post.publishedAt || post.createdAt,
          author: { '@type': 'Organization', name: post.author || 'Portal Vip Brasil' },
          publisher: { '@type': 'Organization', name: 'Portal Vip Brasil', logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` } },
          mainEntityOfPage: canonical
        }
      };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export async function renderPublicPage(pathname: string): Promise<{ html: string; status: number }> {
  const meta = await metaFor(pathname);
  const noindex = meta.status === 404 ? '<meta name="robots" content="noindex,follow" />' : '';
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#050811" />
<meta name="google-site-verification" content="WgcZ29owPWh-IYCntXdzzCadEoHsfk7NA7rx65_NRE4" />
${noindex}
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}" />
<link rel="canonical" href="${esc(meta.canonical)}" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="Portal Vip Brasil" />
<meta property="og:type" content="${meta.type}" />
<meta property="og:url" content="${esc(meta.canonical)}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
<script type="application/ld+json">${jsonLd(meta.schema)}</script>
<link rel="stylesheet" href="/assets/app.css" />
</head><body class="bg-[#0B0F19] text-slate-100 antialiased"><div id="root"></div><noscript>O Portal Vip Brasil precisa de JavaScript habilitado.</noscript><script type="module" src="/assets/app.js"></script></body></html>`;
  return { html, status: meta.status };
}

export function renderPrivateAppPage(pathname: string): { html: string; status: number } {
  const title = 'Portal Vip Brasil — Central de Marketing & Painel';
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#0B0F19" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<title>${esc(title)}</title>
<meta name="description" content="Área administrativa do Portal Vip Brasil." />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="${PORTAL_VIP_OFFICIAL_ASSETS.logoUrl}" />
<link rel="stylesheet" href="/assets/app.css" />
</head><body class="bg-[#0B0F19] text-slate-100 antialiased" data-portal-path="${esc(pathname)}"><div id="root"></div><noscript>O Portal Vip Brasil precisa de JavaScript habilitado.</noscript><script type="module" src="/assets/app.js"></script></body></html>`;
  return { html, status: 200 };
}
