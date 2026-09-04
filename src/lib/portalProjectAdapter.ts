import type { Company } from '../types';
import { USER_PORTFOLIO_PROJECTS, type PortalProject } from '../data/portalProjects';

export interface ApiPortalProject {
  id: string;
  name: string;
  slug: string;
  category?: string;
  segment?: string;
  websiteUrl?: string;
  playStoreUrl?: string;
  appTitle?: string;
  hasApp?: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  targetAudience?: string;
  socialMarketingAngles?: string[];
  bingSeoKeywords?: string[];
  active?: boolean;
  dailyMarketingEnabled?: boolean;
  dailyBlogEnabled?: boolean;
  isSeedProject?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function portalProjectToCompany(project: ApiPortalProject): Company {
  const now = new Date().toISOString();
  return {
    id: project.id,
    userId: 'portal-project',
    name: project.name,
    slug: project.slug,
    logoUrl: project.logoUrl,
    description: project.description || '',
    businessType: 'online',
    onlineChannels: ['Site / Aplicativo', 'Redes Sociais'],
    website: project.websiteUrl,
    androidApp: project.playStoreUrl,
    category: project.category || 'Projeto digital',
    segment: project.segment || '',
    products: [],
    services: [],
    targetAudience: project.targetAudience || '',
    coverageRegion: 'Digital / Brasil',
    differentials: Array.isArray(project.highlights) ? project.highlights.join(' • ') : '',
    brandTone: 'Autêntico, claro e coerente com a identidade do projeto',
    goals: 'Crescimento orgânico, autoridade, tráfego qualificado e divulgação automatizada',
    competitors: [],
    keywords: Array.isArray(project.keywords) ? project.keywords : [],
    isPublicInVitrine: true,
    active: project.active !== false,
    dailyMarketingEnabled: project.dailyMarketingEnabled !== false,
    dailyBlogEnabled: project.dailyBlogEnabled !== false,
    isSeedProject: Boolean(project.isSeedProject),
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || project.createdAt || now
  };
}



export function portalProjectToDisplay(project: ApiPortalProject & { website?: string; coverUrl?: string; niche?: string }): PortalProject {
  const websiteUrl = project.websiteUrl || project.website || '';
  const playStoreUrl = project.playStoreUrl || undefined;
  const logoUrl = project.logoUrl || 'https://portal-vip-brasil.vercel.app/icons/icon-512.png';
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    category: project.category || project.niche || 'Projeto digital',
    segment: project.segment || 'Site / Aplicativo',
    websiteUrl,
    playStoreUrl,
    appTitle: project.appTitle || (playStoreUrl ? `${project.name} App` : undefined),
    hasApp: typeof project.hasApp === 'boolean' ? project.hasApp : Boolean(playStoreUrl),
    logoUrl,
    bannerUrl: project.bannerUrl || project.coverUrl || logoUrl,
    tagline: project.tagline || '',
    description: project.description || '',
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    keywords: Array.isArray(project.keywords) ? project.keywords : [],
    targetAudience: project.targetAudience || '',
    socialMarketingAngles: Array.isArray(project.socialMarketingAngles) ? project.socialMarketingAngles : [],
    bingSeoKeywords: Array.isArray(project.bingSeoKeywords) ? project.bingSeoKeywords : (Array.isArray(project.keywords) ? project.keywords : []),
    color: 'from-cyan-500/20 to-blue-600/10'
  };
}

export function portalProjectsToCompanies(projects: ApiPortalProject[]): Company[] {
  return projects
    .filter((project) => project && project.id && project.name && project.active !== false)
    .map(portalProjectToCompany);
}

export const PORTAL_PROJECT_COMPANIES: Company[] = USER_PORTFOLIO_PROJECTS.map((project) => portalProjectToCompany({
  ...project,
  active: true,
  dailyMarketingEnabled: true,
  dailyBlogEnabled: true,
  isSeedProject: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}));

export function initialPortalProject(projects: Company[] = PORTAL_PROJECT_COMPANIES): Company | null {
  if (!projects.length) return null;
  try {
    const stored = localStorage.getItem('portal_vip_selected_project');
    return projects.find((project) => project.id === stored) || projects[0];
  } catch {
    return projects[0];
  }
}
