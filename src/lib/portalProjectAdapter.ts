import type { Company } from '../types';
import { USER_PORTFOLIO_PROJECTS } from '../data/portalProjects';

export const PORTAL_PROJECT_COMPANIES: Company[] = USER_PORTFOLIO_PROJECTS.map((project) => ({
  id: project.id,
  userId: 'portal-project',
  name: project.name,
  slug: project.slug,
  logoUrl: project.logoUrl,
  description: project.description,
  businessType: 'online',
  onlineChannels: ['Site / Aplicativo', 'Redes Sociais'],
  website: project.websiteUrl,
  androidApp: project.playStoreUrl,
  category: project.category,
  segment: project.segment,
  products: [],
  services: [],
  targetAudience: project.targetAudience,
  coverageRegion: 'Digital / Brasil',
  differentials: project.highlights.join(' • '),
  brandTone: 'Autêntico, claro e coerente com a identidade do projeto',
  goals: 'Crescimento orgânico, autoridade, tráfego qualificado e divulgação automatizada',
  competitors: [],
  keywords: project.keywords,
  isPublicInVitrine: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}));

export function initialPortalProject(): Company | null {
  if (!PORTAL_PROJECT_COMPANIES.length) return null;
  try {
    const stored = localStorage.getItem('portal_vip_selected_project');
    return PORTAL_PROJECT_COMPANIES.find((project) => project.id === stored) || PORTAL_PROJECT_COMPANIES[0];
  } catch {
    return PORTAL_PROJECT_COMPANIES[0];
  }
}
