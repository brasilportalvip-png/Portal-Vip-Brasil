import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthModal } from './components/AuthModal';
import { TermsConsentModal } from './components/TermsConsentModal';
import { OfflineBanner } from './components/OfflineBanner';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileTopBar } from './components/MobileTopBar';
import { BottomNav } from './components/BottomNav';
import { MobileDrawer } from './components/MobileDrawer';

// Pages
import { BlogPortalPage } from './pages/BlogPortalPage';
import { VitrinePage } from './pages/VitrinePage';
import { DashboardPage } from './pages/DashboardPage';
import { MyCompanyPage } from './pages/MyCompanyPage';
import { AutopilotPage } from './pages/AutopilotPage';
import { CreateContentPage } from './pages/CreateContentPage';
import { CreateImagePage } from './pages/CreateImagePage';
import { CreateVideoPage } from './pages/CreateVideoPage';
import { CreateArticlePage } from './pages/CreateArticlePage';
import { SeoPage } from './pages/SeoPage';
import { FrocIaPage } from './pages/FrocIaPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SocialNetworksPage } from './pages/SocialNetworksPage';
import { ContentsLibraryPage } from './pages/ContentsLibraryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SupportPage } from './pages/SupportPage';
import { LegalPage } from './pages/LegalPage';
import { AdminPage } from './pages/AdminPage';

import type { Campaign, Company, ContentItem, ScheduledPost, User, Wallet } from './types';
import { ApiRequestError, apiRequest, isApiAbortError } from './lib/api';
import { auth } from './lib/firebase';
import { initialPortalProject, PORTAL_PROJECT_COMPANIES } from './lib/portalProjectAdapter';

const TAB_PATH: Record<string, string> = {
  home: '/',
  vitrine: '/vitrine',
  blog: '/blog',
  dashboard: '/dashboard',
  projetos: '/projetos',
  'froc-ia': '/froc-ia',
  autopilot: '/autopilot',
  'criar-conteudo': '/criar-conteudo',
  'criar-imagem': '/criar-imagem',
  'criar-video': '/criar-video',
  'criar-artigo': '/criar-artigo',
  seo: '/seo',
  campanhas: '/campanhas',
  calendario: '/calendario',
  'redes-sociais': '/redes-sociais',
  conteudos: '/conteudos',
  analytics: '/analytics',
  perfil: '/perfil',
  suporte: '/suporte',
  legal: '/termos',
  privacidade: '/privacidade',
  termos: '/termos',
  cookies: '/cookies',
  lgpd: '/exclusao-de-dados',
  'exclusao-de-dados': '/exclusao-de-dados',
  'apps-compliance': '/apps-compliance',
  admin: '/admin'
};

const TAB_ALIASES: Record<string, string> = {
  artigos: 'home',
  posts: 'home',
  estrategia: 'froc-ia',
  configuracoes: 'perfil',
  redes: 'redes-sociais',
  privacy: 'privacidade',
  terms: 'termos',
  'exclusao-dados': 'exclusao-de-dados',
  'data-deletion': 'exclusao-de-dados',
  'direitos-lgpd': 'lgpd',
  empresa: 'projetos',
  company: 'projetos',
  companies: 'projetos',
  planos: 'dashboard',
  creditos: 'dashboard'
};

const PUBLIC_TABS = new Set([
  'home',
  'blog',
  'vitrine',
  'legal',
  'privacidade',
  'termos',
  'cookies',
  'lgpd',
  'exclusao-de-dados',
  'apps-compliance'
]);

interface RouteResolution {
  tab: string;
  canonicalPath: string;
  known: boolean;
}

function canonicalTab(value: string): string {
  const clean = String(value || '').trim();
  return TAB_ALIASES[clean] || clean;
}

function routeFromPath(path: string): RouteResolution {
  const clean = path.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const match = Object.entries(TAB_PATH).find(([, value]) => value === clean);
  if (match) {
    return { tab: match[0], canonicalPath: match[1], known: true };
  }
  const rootSegment = clean.replace(/^\//, '').split('/')[0] || '';
  const aliased = canonicalTab(rootSegment);
  if (aliased && TAB_PATH[aliased]) {
    return { tab: aliased, canonicalPath: TAB_PATH[aliased], known: false };
  }
  return { tab: 'home', canonicalPath: '/', known: false };
}

function isPrivateTab(tab: string): boolean {
  return !PUBLIC_TABS.has(tab);
}

export function App() {
  const [currentTab, setCurrentTab] = useState<string>(() => routeFromPath(window.location.pathname).tab);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [companies, setCompanies] = useState<Company[]>(PORTAL_PROJECT_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => initialPortalProject());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingTabRef = useRef<string | null>(null);
  const sessionEpochRef = useRef(0);
  const tenantEpochRef = useRef(0);
  const sessionControllerRef = useRef<AbortController | null>(null);
  const tenantControllerRef = useRef<AbortController | null>(null);

  const isAdmin = user?.role === 'admin';

  const resetSessionState = useCallback(() => {
    sessionEpochRef.current += 1;
    tenantEpochRef.current += 1;
    sessionControllerRef.current?.abort();
    tenantControllerRef.current?.abort();
    setUser(null);
    setWallet(null);
    setCompanies(PORTAL_PROJECT_COMPANIES);
    setSelectedCompany((current) => current || initialPortalProject());
    setCampaigns([]);
    setScheduledPosts([]);
    setContentItems([]);
  }, []);

  const commitNavigation = useCallback((rawTab: string, historyMode: 'push' | 'replace' = 'push') => {
    const tab = canonicalTab(rawTab);
    const targetPath = TAB_PATH[tab] || '/';
    const currentPath = window.location.pathname || '/';

    setCurrentTab(tab);
    if (currentPath !== targetPath) {
      if (historyMode === 'replace') {
        window.history.replaceState({ tab }, '', targetPath);
      } else {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  const navigate = useCallback((tab: string) => {
    const targetTab = canonicalTab(tab);
    if (!user && isPrivateTab(targetTab)) {
      pendingTabRef.current = targetTab;
      setAuthOpen(true);
      return;
    }
    commitNavigation(targetTab, 'push');
  }, [commitNavigation, user]);

  useEffect(() => {
    const initialRoute = routeFromPath(window.location.pathname);
    commitNavigation(initialRoute.tab, 'replace');

    const handlePopState = () => {
      const resolved = routeFromPath(window.location.pathname);
      setCurrentTab(resolved.tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [commitNavigation]);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest<{ wallet: Wallet }>('/api/credits/balance');
      if (data?.wallet) setWallet(data.wallet);
    } catch (err) {
      if (!isApiAbortError(err)) console.warn('Erro ao atualizar carteira:', err);
    }
  }, [user]);

  const refreshContents = useCallback(async () => {
    if (!user || !selectedCompany) return;
    try {
      const data = await apiRequest<{ items: ContentItem[] }>(`/api/contents?companyId=${encodeURIComponent(selectedCompany.id)}`);
      if (Array.isArray(data?.items)) setContentItems(data.items);
    } catch (err) {
      if (!isApiAbortError(err)) console.warn('Erro ao carregar conteúdos:', err);
    }
  }, [selectedCompany, user]);

  const refreshSchedule = useCallback(async () => {
    if (!user || !selectedCompany) return;
    try {
      const data = await apiRequest<{ posts: ScheduledPost[] }>(`/api/schedule?companyId=${encodeURIComponent(selectedCompany.id)}`);
      if (Array.isArray(data?.posts)) setScheduledPosts(data.posts);
    } catch (err) {
      if (!isApiAbortError(err)) console.warn('Erro ao carregar agendamentos:', err);
    }
  }, [selectedCompany, user]);

  const refreshCampaigns = useCallback(async () => {
    if (!user || !selectedCompany) return;
    try {
      const data = await apiRequest<{ campaigns: Campaign[] }>(`/api/campaigns?companyId=${encodeURIComponent(selectedCompany.id)}`);
      if (Array.isArray(data?.campaigns)) setCampaigns(data.campaigns);
    } catch (err) {
      if (!isApiAbortError(err)) console.warn('Erro ao carregar campanhas:', err);
    }
  }, [selectedCompany, user]);

  const refreshCompanies = useCallback(async (_signal?: AbortSignal, _epoch?: number) => {
    setCompanies(PORTAL_PROJECT_COMPANIES);
    setSelectedCompany((current) => {
      if (current && PORTAL_PROJECT_COMPANIES.some((project) => project.id === current.id)) return current;
      return initialPortalProject();
    });
  }, []);

  const reloadSession = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const data = await apiRequest<{ user: User; wallet: Wallet }>('/api/auth/me');
      if (data?.user) setUser(data.user);
      if (data?.wallet) setWallet(data.wallet);
    } catch (err) {
      if (!isApiAbortError(err)) console.warn('Erro ao recarregar sessão:', err);
    }
  }, []);

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    try { localStorage.setItem('portal_vip_selected_project', company.id); } catch {}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const controller = new AbortController();
          const epoch = ++sessionEpochRef.current;
          sessionControllerRef.current = controller;

          const data = await apiRequest<{ user: User; wallet: Wallet }>('/api/auth/me', {
            signal: controller.signal,
            timeoutMs: 12_000
          });
          if (epoch !== sessionEpochRef.current) return;

          if (data?.user) {
            setUser(data.user);
            setWallet(data.wallet || null);
            await refreshCompanies(controller.signal, epoch);
          }
        } catch (err) {
          if (!isApiAbortError(err)) {
            console.error('Falha de inicialização:', err);
            resetSessionState();
          }
        }
      } else {
        resetSessionState();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshCompanies, resetSessionState]);

  const authSuccess = async (loggedUser: User) => {
    setUser(loggedUser);
    setAuthOpen(false);
    await reloadSession();
    const controller = new AbortController();
    const epoch = ++sessionEpochRef.current;
    sessionControllerRef.current = controller;
    await refreshCompanies(controller.signal, epoch);
    if (pendingTabRef.current) {
      commitNavigation(pendingTabRef.current, 'push');
      pendingTabRef.current = null;
    }
  };

  const logout = async () => {
    pendingTabRef.current = null;
    sessionControllerRef.current?.abort();
    tenantControllerRef.current?.abort();
    try {
      await signOut(auth);
    } finally {
      resetSessionState();
      setAuthOpen(false);
      commitNavigation('home', 'replace');
    }
  };

  const guardedTab = !user && isPrivateTab(currentTab)
    ? 'home'
    : currentTab === 'admin' && !isAdmin
      ? 'dashboard'
      : currentTab;

  const needsTermsConsent = Boolean(
    user && (
      !user.termsAcceptedAt ||
      !user.privacyAcceptedAt ||
      user.termsVersion !== '2026.1' ||
      user.privacyVersion !== '2026.1'
    )
  );

  // Home view is the Portal Vip Brasil Blog & Magazine
  if (guardedTab === 'home' || guardedTab === 'blog') {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500 selection:text-black">
        <OfflineBanner />
        <PwaInstallPrompt />
        <BlogPortalPage onNavigate={navigate} onOpenAuth={() => setAuthOpen(true)} user={user} />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={authSuccess} />
        <TermsConsentModal isOpen={needsTermsConsent} onConsentSuccess={authSuccess} onLogout={logout} />
      </div>
    );
  }

  // Vitrine view is the 7 projects catalog
  if (guardedTab === 'vitrine') {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500 selection:text-black">
        <OfflineBanner />
        <PwaInstallPrompt />
        <VitrinePage onNavigate={navigate} />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={authSuccess} />
        <TermsConsentModal isOpen={needsTermsConsent} onConsentSuccess={authSuccess} onLogout={logout} />
      </div>
    );
  }

  // Render Dashboard & Internal Tools
  const renderDashboardContent = () => {
    switch (guardedTab) {
      case 'dashboard':
        return (
          <DashboardPage
            user={user}
            wallet={wallet}
            selectedCompany={selectedCompany}
            campaigns={campaigns}
            scheduledPosts={scheduledPosts}
            onNavigate={navigate}
            onOpenAuth={() => setAuthOpen(true)}
          />
        );
      case 'projetos':
        return (
          <MyCompanyPage
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={handleSelectCompany}
            onRefreshCompanies={() => refreshCompanies()}
          />
        );
      case 'autopilot':
        return (
          <AutopilotPage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onNavigate={navigate}
          />
        );
      case 'criar-conteudo':
        return (
          <CreateContentPage
            companies={companies}
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onRefreshContents={refreshContents}
            onNavigate={navigate}
          />
        );
      case 'criar-imagem':
        return (
          <CreateImagePage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onRefreshContents={refreshContents}
            onNavigate={navigate}
          />
        );
      case 'criar-video':
        return (
          <CreateVideoPage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onRefreshContents={refreshContents}
            onNavigate={navigate}
          />
        );
      case 'criar-artigo':
        return (
          <CreateArticlePage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onRefreshContents={refreshContents}
            onNavigate={navigate}
          />
        );
      case 'seo':
        return (
          <SeoPage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
          />
        );
      case 'froc-ia':
        return (
          <FrocIaPage
            selectedCompany={selectedCompany}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onNavigate={navigate}
          />
        );
      case 'campanhas':
        return (
          <CampaignsPage
            selectedCompany={selectedCompany}
            campaigns={campaigns}
            onRefreshCampaigns={refreshCampaigns}
            onNavigate={navigate}
          />
        );
      case 'calendario':
        return (
          <CalendarPage
            selectedCompany={selectedCompany}
            scheduledPosts={scheduledPosts}
            contentItems={contentItems}
            onRefreshSchedule={refreshSchedule}
            onNavigate={navigate}
          />
        );
      case 'redes-sociais':
        return <SocialNetworksPage selectedCompany={selectedCompany} onNavigate={navigate} />;
      case 'conteudos':
        return (
          <ContentsLibraryPage
            selectedCompany={selectedCompany}
            contentItems={contentItems}
            onRefreshContents={refreshContents}
            onNavigate={navigate}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            selectedCompany={selectedCompany}
            wallet={wallet}
            campaigns={campaigns}
            scheduledPosts={scheduledPosts}
            onNavigate={navigate}
          />
        );
      case 'perfil':
        return <ProfilePage user={user} wallet={wallet} onRefreshUser={reloadSession} onNavigate={navigate} />;
      case 'suporte':
        return <SupportPage onNavigate={navigate} />;
      case 'legal':
      case 'privacidade':
      case 'termos':
      case 'cookies':
      case 'lgpd':
      case 'exclusao-de-dados':
      case 'apps-compliance':
        return <LegalPage initialSection={currentTab} onNavigate={navigate} />;
      case 'admin':
        return isAdmin ? <AdminPage onNavigate={navigate} /> : null;
      default:
        return (
          <DashboardPage
            user={user}
            wallet={wallet}
            selectedCompany={selectedCompany}
            campaigns={campaigns}
            scheduledPosts={scheduledPosts}
            onNavigate={navigate}
            onOpenAuth={() => setAuthOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <OfflineBanner />
      <PwaInstallPrompt />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          currentTab={guardedTab}
          onSelectTab={navigate}
          user={user}
          wallet={wallet}
          selectedCompany={selectedCompany}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isAdmin={isAdmin}
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header
          user={user}
          wallet={wallet}
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={logout}
          onNavigate={navigate}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Mobile Top Bar */}
      <MobileTopBar
        user={user}
        wallet={wallet}
        menuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onOpenAuth={() => setAuthOpen(true)}
        onNavigate={navigate}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        currentTab={guardedTab}
        user={user}
        isAdmin={isAdmin}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={navigate}
      />

      {/* Main App Content View */}
      <main
        className={`flex-1 transition-all duration-300 pt-20 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-10 ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {renderDashboardContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentTab={guardedTab} onNavigate={navigate} />

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={authSuccess} />
      <TermsConsentModal isOpen={needsTermsConsent} onConsentSuccess={authSuccess} onLogout={logout} />
    </div>
  );
}

export default App;
