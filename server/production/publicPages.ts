import { config } from '../config/index.js';
import { PORTAL_VIP_OFFICIAL_ASSETS, getPortalProjectFromDb, listAllPortalProjectsFromDb } from './almaPortfolio.js';
import { INITIAL_SEEDED_ARTICLES, listBlogArticles, isInvalidOrLogoImage, isTemplateLikeArticle, resolveThematicCoverForProject } from './blogEngine.js';
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
    seoParagraphs(post?.introduction || post?.excerpt || post?.summary || post?.metaDescription) + '</header>' +
    (sectionHtml || seoParagraphs(String(post?.content || '').replace(/^#{1,6}\s+/gm, ''))) + faqHtml +
    seoParagraphs(post?.conclusion) + seoParagraphs(post?.callToAction) + linkHtml +
    '<p><a href="' + esc(canonical) + '">Link permanente deste artigo</a></p></article></main>';
}
function blogIndexSeoBody(articles: any[]): string {
  if (!articles.length) return '';
  return '<main data-portal-seo-prerender="blog"><h1>Artigos publicados — Portal Vip Brasil</h1><p>Conteúdos recentes dos projetos ativos do Portal Vip Brasil.</p><section>' +
    articles.slice(0, 50).map((article: any) => {
      const href = '/blog/' + encodeURIComponent(String(article?.slug || ''));
      return '<article><h2><a href="' + esc(href) + '">' + esc(article?.title || '') + '</a></h2>' +
        seoParagraphs(article?.excerpt || article?.metaDescription) + '</article>';
    }).join('') + '</section></main>';
}


const LEGAL_PAGES: Record<string, { title: string; description: string; h1: string; text: string }> = {
  '/termos': {
    title: 'Termos de Uso — Portal Vip Brasil',
    description: 'Termos de Uso do Portal Vip Brasil: regras de acesso, responsabilidades, conteúdo, propriedade intelectual e contato oficial.',
    h1: 'Termos de Uso',
    text: 'Condições que regem o acesso e o uso do Portal Vip Brasil, da Vitrine de projetos e do Blog.'
  },
  '/privacidade': {
    title: 'Política de Privacidade (LGPD) — Portal Vip Brasil',
    description: 'Como o Portal Vip Brasil coleta, usa, protege e exclui dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).',
    h1: 'Política de Privacidade',
    text: 'Transparência sobre o tratamento de dados pessoais, direitos do titular e canais de atendimento conforme a LGPD.'
  },
  '/cookies': {
    title: 'Política de Cookies — Portal Vip Brasil',
    description: 'Saiba quais cookies o Portal Vip Brasil utiliza, para que servem e como gerenciar seu consentimento.',
    h1: 'Política de Cookies',
    text: 'Cookies essenciais, de desempenho e de análise, com consentimento e controle total pelo visitante.'
  },
  '/exclusao-de-dados': {
    title: 'Exclusão de Dados — Portal Vip Brasil',
    description: 'Como solicitar a exclusão dos seus dados pessoais e de conexões de redes sociais no Portal Vip Brasil.',
    h1: 'Solicitação de Exclusão de Dados',
    text: 'Passo a passo para solicitar a remoção completa dos seus dados e prazos de atendimento.'
  },
  '/apps-compliance': {
    title: 'Conformidade de Aplicativos — Portal Vip Brasil',
    description: 'Informações de conformidade dos aplicativos e integrações do Portal Vip Brasil com Google, Meta, TikTok e demais plataformas.',
    h1: 'Conformidade de Aplicativos',
    text: 'Políticas de uso de dados de plataformas parceiras e compromissos de segurança das integrações.'
  }
};

function legalSeoBody(page: { h1: string; text: string }): string {
  return '<main data-portal-seo-prerender="legal"><h1>' + esc(page.h1) + '</h1><p>' + esc(page.text) + '</p>' +
    '<nav aria-label="Documentos legais"><ul>' + Object.entries(LEGAL_PAGES).map(([href, item]) =>
      '<li><a href="' + esc(href) + '">' + esc(item.h1) + '</a></li>').join('') + '</ul></nav></main>';
}

function homeSeoBody(articles: any[], projects: any[]): string {
  const projectHtml = projects.slice(0, 12).map((project: any) =>
    '<li><a href="/vitrine/' + esc(encodeURIComponent(project.slug)) + '"><strong>' + esc(project.name) + '</strong></a> — ' +
    esc(String(project.description || '').slice(0, 160)) + '</li>').join('');
  const articleHtml = articles.slice(0, 12).map((article: any) =>
    '<li><a href="/blog/' + esc(encodeURIComponent(String(article?.slug || ''))) + '">' + esc(article?.title || '') + '</a></li>').join('');
  return '<main data-portal-seo-prerender="home">' +
    '<header><h1>Portal Vip Brasil — Vitrine oficial de sites, aplicativos e conteúdos que você procura</h1>' +
    '<p>Encontre em um só lugar os projetos oficiais do Portal Vip Brasil: aplicativos Android na Google Play, sites, guias completos e artigos atualizados todos os dias. ' +
    'Conteúdo original, verificado e gratuito sobre espiritualidade, fé, oráculos, tarô, inteligência artificial e marketing digital.</p>' +
    '<p><a href="/vitrine">Explorar a Vitrine</a> · <a href="/blog">Ler os artigos mais recentes</a></p></header>' +
    (projectHtml ? '<section><h2>Projetos e aplicativos oficiais</h2><ul>' + projectHtml + '</ul></section>' : '') +
    (articleHtml ? '<section><h2>Artigos e guias recentes</h2><ul>' + articleHtml + '</ul></section>' : '') +
    '<section><h2>Por que confiar no Portal Vip Brasil</h2><ul>' +
    '<li>Projetos oficiais com links verificados para sites e Google Play.</li>' +
    '<li>Artigos originais, revisados e atualizados com frequência.</li>' +
    '<li>Privacidade em conformidade com a LGPD e navegação segura (HTTPS).</li></ul></section>' +
    '<nav aria-label="Institucional"><a href="/termos">Termos de Uso</a> · <a href="/privacidade">Privacidade</a> · <a href="/cookies">Cookies</a> · <a href="/exclusao-de-dados">Exclusão de dados</a></nav>' +
    '</main>';
}

function breadcrumb(base: string, items: Array<{ name: string; path: string }>): any {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: base + item.path }))
  };
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
  noindex?: boolean;
}

async function metaFor(pathname: string): Promise<PublicMeta> {
  const base = config.appUrl.replace(/\/$/, '');
  const fallback: PublicMeta = {
    title: 'Portal Vip Brasil — Central de Marketing, Vitrine e Divulgação Automática',
    description: 'Vitrine oficial e motor de marketing do Portal Vip Brasil. Divulgação de sites e aplicativos da Play Store com SEO inteligente para Bing e Google.',
    canonical: `${base}${pathname === '/' ? '/' : pathname}`,
    image: absolute(PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl),
    type: 'website',
    status: 200,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': base + '/#organization',
          name: 'Portal Vip Brasil',
          url: base + '/',
          logo: absolute(PORTAL_VIP_OFFICIAL_ASSETS.logoUrl)
        },
        {
          '@type': 'WebSite',
          '@id': base + '/#website',
          name: 'Portal Vip Brasil',
          url: base + '/',
          inLanguage: 'pt-BR',
          publisher: { '@id': base + '/#organization' },
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: base + '/blog?q={search_term_string}' },
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    }
  };

  const legal = LEGAL_PAGES[pathname];
  if (legal) {
    return {
      ...fallback,
      title: legal.title,
      description: legal.description,
      bodyHtml: legalSeoBody(legal),
      schema: { '@context': 'https://schema.org', '@graph': [...fallback.schema['@graph'], breadcrumb(base, [{ name: 'Início', path: '/' }, { name: legal.h1, path: pathname }])] }
    };
  }

  if (pathname === '/' || pathname === '/blog') {
    try {
      const result = await listBlogArticles({ status: 'published', limit: 50, offset: 0 });
      const canonical = pathname === '/' ? base + '/' : base + '/blog';
      if (pathname === '/') {
        const projects = await listAllPortalProjectsFromDb().catch(() => [] as any[]);
        const active = projects.filter((project: any) => project.active !== false && project.slug);
        return {
          ...fallback,
          canonical,
          bodyHtml: homeSeoBody(result.articles, active),
          schema: {
            '@context': 'https://schema.org',
            '@graph': [
              ...fallback.schema['@graph'],
              {
                '@type': 'ItemList',
                name: 'Projetos oficiais do Portal Vip Brasil',
                itemListElement: active.slice(0, 20).map((project: any, index: number) => ({
                  '@type': 'ListItem', position: index + 1, name: project.name, url: base + '/vitrine/' + encodeURIComponent(project.slug)
                }))
              }
            ]
          }
        };
      }
      return {
        ...fallback,
        canonical,
        title: 'Blog Portal Vip Brasil: Artigos, Guias e Novidades',
        description: 'Artigos originais e guias completos dos projetos do Portal Vip Brasil: fé, espiritualidade, oráculos, inteligência artificial e marketing digital. Atualizado todos os dias.',
        bodyHtml: blogIndexSeoBody(result.articles),
        schema: {
          '@context': 'https://schema.org',
          '@graph': [
            ...fallback.schema['@graph'],
            breadcrumb(base, [{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }]),
            {
              '@type': 'Blog',
              '@id': base + '/blog#blog',
              name: 'Blog Portal Vip Brasil',
              url: base + '/blog',
              inLanguage: 'pt-BR',
              blogPost: result.articles.slice(0, 20).map((article: any) => ({
                '@type': 'BlogPosting', headline: article.title, url: base + '/blog/' + encodeURIComponent(article.slug), datePublished: article.publishedAt || undefined
              }))
            }
          ]
        }
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
      const rawImage = post.coverImage || post.featuredImageUrl || PORTAL_VIP_OFFICIAL_ASSETS.bannerUrl;
      const image = isInvalidOrLogoImage(rawImage)
        ? resolveThematicCoverForProject(post.relatedProjectId, post.title).url
        : rawImage;
      const summary = post.metaDescription || post.seoDescription || post.excerpt || post.summary;
      return {
        title: post.seoTitle || `${post.title} — Portal Vip Brasil`,
        description: description(summary, 'Artigo do Portal Vip Brasil.'),
        canonical, image: absolute(image), type: 'article', status: 200, noindex: isTemplateLikeArticle(post),
        bodyHtml: articleSeoBody(post, canonical),
        schema: {
          '@context': 'https://schema.org', '@graph': [breadcrumb(base, [{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }, { name: String(post.title || ''), path: '/blog/' + encodeURIComponent(post.slug) }]), {
          '@type': 'BlogPosting', headline: post.title, description: summary, inLanguage: 'pt-BR',
          image: image ? [absolute(image)] : undefined,
          datePublished: post.publishedAt || post.createdAt, dateModified: post.updatedAt || post.publishedAt || post.createdAt,
          author: { '@type': 'Organization', name: authorName || 'Portal Vip Brasil' },
          keywords: [...new Set([post.primaryKeyword, ...(post.secondaryKeywords || []), ...(post.tags || [])].filter(Boolean))].join(', '),
          publisher: { '@type': 'Organization', name: 'Portal Vip Brasil', logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` } },
          mainEntityOfPage: canonical
        }] }
      };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export async function renderPublicPage(pathname: string): Promise<{ html: string; status: number }> {
  const meta = await metaFor(pathname);
  const noindex = meta.status === 404 || meta.noindex ? '<meta name="robots" content="noindex,follow" />' : '';
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#050811" />
<meta name="google-site-verification" content="WgcZ29owPWh-IYCntXdzzCadEoHsfk7NA7rx65_NRE4" />
${noindex || '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />'}
${config.bingSiteVerification ? `<meta name="msvalidate.01" content="${esc(config.bingSiteVerification)}" />` : ''}
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}" />
<link rel="canonical" href="${esc(meta.canonical)}" />
<link rel="alternate" hreflang="pt-BR" href="${esc(meta.canonical)}" />
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
