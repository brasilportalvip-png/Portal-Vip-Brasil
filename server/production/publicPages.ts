import { config } from '../config/index.js';
import { PORTAL_VIP_OFFICIAL_ASSETS, getPortalProjectFromDb } from './almaPortfolio.js';
import { INITIAL_SEEDED_ARTICLES, listBlogArticles } from './blogEngine.js';
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
function seoParagraphs(value: any): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.split(/\n{2,}/).map((part) => '<p>' + esc(part) + '</p>').join('');
}
function seoHref(value: any): string {
  const raw = String(value || '').trim();
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '#';
  } catch {
    return '#';
  }
}
function articleSeoBody(post: any, canonical: string): string {
  const sections = Array.isArray(post?.sections) ? post.sections.slice(0, 8) : [];
  const faq = Array.isArray(post?.faqSection) ? post.faqSection.slice(0, 5) : [];
  const links = Array.isArray(post?.internalLinks) ? post.internalLinks.slice(0, 8) : [];
  const sectionHtml = sections.map((section: any) => {
    const h3s = Array.isArray(section?.h3s) ? section.h3s.slice(0, 6) : [];
    return '<section><h2>' + esc(section?.h2 || '') + '</h2>' + seoParagraphs(section?.content) +
      h3s.map((sub: any) => '<h3>' + esc(sub?.h3 || '') + '</h3>' + seoParagraphs(sub?.content)).join('') + '</section>';
  }).join('');
  const faqHtml = faq.length ? '<section><h2>Perguntas frequentes</h2>' + faq.map((item: any) =>
    '<h3>' + esc(item?.question || '') + '</h3>' + seoParagraphs(item?.answer)
  ).join('') + '</section>' : '';
  const linkHtml = links.length ? '<nav aria-label="Conteúdos relacionados"><h2>Conteúdos relacionados</h2><ul>' + links.map((item: any) =>
    '<li><a href="' + esc(seoHref(item?.url)) + '">' + esc(item?.label || 'Conteúdo relacionado') + '</a></li>'
  ).join('') + '</ul></nav>' : '';
  return '<main data-portal-seo-prerender="article"><article><header><h1>' + esc(post?.title || '') + '</h1>' +
    seoParagraphs(post?.introduction || post?.excerpt || post?.metaDescription) + '</header>' + sectionHtml + faqHtml +
    seoParagraphs(post?.conclusion) + seoParagraphs(post?.callToAction) + linkHtml +
    '<p><a href="' + esc(canonical) + '">Link permanente deste artigo</a></p></article></main>';
}
function blogIndexSeoBody(articles: any[]): string {
  if (!articles.length) return '';
  return '<main data-portal-seo-prerender="blog"><h1>Artigos publicados — Portal Vip Brasil</h1><p>Conteúdos recentes dos projetos ativos do Portal Vip Brasil.</p><section>' +
    articles.slice(0, 20).map((article: any) => {
      const href = '/blog/' + encodeURIComponent(String(article?.slug || ''));
      return '<article><h2><a href="' + esc(href) + '">' + esc(article?.title || '') + '</a></h2>' +
        seoParagraphs(article?.excerpt || article?.metaDescription) + '</article>';
    }).join('') + '</section></main>';
}

interface PublicMeta {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'website' | 'article';
  status: number;
  schema: any;
  bodyHtml?: string;
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

  if (pathname === '/' || pathname === '/blog') {
    try {
      const result = await listBlogArticles({ status: 'published', limit: 20, offset: 0 });
      const canonical = pathname === '/' ? base + '/' : base + '/blog';
      return {
        ...fallback,
        canonical,
        title: pathname === '/' ? fallback.title : 'Artigos, Guias e Novidades — Portal Vip Brasil',
        description: pathname === '/' ? fallback.description : 'Artigos originais dos projetos do Portal Vip Brasil com guias, dúvidas, recursos e conteúdos atualizados.',
        bodyHtml: blogIndexSeoBody(result.articles)
      };
    } catch (error) {
      console.warn('[Portal Vip Brasil SSR] Falha ao pré-renderizar índice do Blog:', error);
    }
  }

  if (pathname === '/vitrine') {
    return {
      ...fallback,
      title: 'Vitrine Oficial de Sites & Aplicativos — Portal Vip Brasil',
      description: 'Conheça a vitrine dinâmica de sites, aplicativos e projetos digitais ativos do Portal Vip Brasil.'
    };
  }

  const vitrineMatch = pathname.match(/^\/vitrine\/([^/]+)$/);
  if (vitrineMatch) {
    const slug = decodeURIComponent(vitrineMatch[1]);
    const project = await getPortalProjectFromDb(slug);
    if (project && project.active !== false) {
      const canonical = `${base}/vitrine/${encodeURIComponent(project.slug)}`;
      return {
        title: `${project.name} — Vitrine Portal Vip Brasil`,
        description: description(project.description, `${project.name} no Portal Vip Brasil.`),
        canonical,
        image: project.bannerUrl || project.logoUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl,
        type: 'website',
        status: 200,
        schema: project.hasApp ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: project.name,
          url: project.websiteUrl,
          applicationCategory: project.category,
          operatingSystem: 'Web, Android',
          description: project.description
        } : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: project.name,
          url: project.websiteUrl,
          description: project.description
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
      const db = firestore();
      const [articleSnap, postSnap] = await Promise.all([
        db.collection(COLLECTIONS.blogArticles).where('slug', '==', slug).limit(5).get(),
        db.collection(COLLECTIONS.blogPosts).where('slug', '==', slug).where('status', '==', 'published').limit(1).get()
      ]);
      const articleDoc = articleSnap.docs.find((item) => String((item.data() as any)?.status || '') === 'published') || null;
      const doc = articleDoc || (!postSnap.empty ? postSnap.docs[0] : null);
      const seeded = !doc ? INITIAL_SEEDED_ARTICLES.find((item) => item.slug === slug) : undefined;
      if (!doc && !seeded) return { ...fallback, status: 404, title: 'Artigo não encontrado — Portal Vip Brasil', description: 'Este artigo não está disponível no blog do Portal Vip Brasil.' };

      const post = doc ? ({ id: doc.id, ...doc.data() } as any) : seeded as any;
      const canonical = `${base}/blog/${encodeURIComponent(post.slug)}`;
      const authorName = typeof post.author === 'object' ? post.author?.name : post.author;
      const image = post.coverImage || post.featuredImageUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
      const summary = post.metaDescription || post.seoDescription || post.excerpt || post.summary;
      return {
        title: post.seoTitle || `${post.title} — Portal Vip Brasil`,
        description: description(summary, 'Artigo do Portal Vip Brasil.'),
        canonical, image: absolute(image), type: 'article', status: 200,
        bodyHtml: articleSeoBody(post, canonical),
        schema: {
          '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: summary,
          image: image ? [absolute(image)] : undefined,
          datePublished: post.publishedAt || post.createdAt, dateModified: post.updatedAt || post.publishedAt || post.createdAt,
          author: { '@type': 'Organization', name: authorName || 'Portal Vip Brasil' },
          keywords: [...new Set([post.primaryKeyword, ...(post.secondaryKeywords || []), ...(post.tags || [])].filter(Boolean))].join(', '),
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
</head><body class="bg-[#0B0F19] text-slate-100 antialiased"><div id="root">${meta.bodyHtml || ''}</div><noscript>O Portal Vip Brasil precisa de JavaScript habilitado.</noscript><script type="module" src="/assets/app.js"></script></body></html>`;
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
