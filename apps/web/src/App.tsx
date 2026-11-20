import React, { useEffect, useState } from 'react';
import { api, CRM_UNAUTHORIZED_EVENT, CrmSessionInfo } from './api.js';
import { CrmLogin } from './components/crm/CrmLogin.js';
import { useSiteIdentity } from './brandTheme.js';
import { useClinicInfo } from './clinicInfo.js';
import { Navbar } from './components/public/Navbar.js';
import { Hero } from './components/public/Hero.js';
import { ServicesSection } from './components/public/ServicesSection.js';
import { TeamSection } from './components/public/TeamSection.js';
import { PublicScheduleSection } from './components/public/PublicScheduleSection.js';
import { TestimonialsSection } from './components/public/TestimonialsSection.js';
import { FaqSection } from './components/public/FaqSection.js';
import { ContactSection } from './components/public/ContactSection.js';
import { Footer } from './components/public/Footer.js';
import { FloatingWhatsApp } from './components/public/FloatingWhatsApp.js';
import { PublicBookingModal } from './components/public/PublicBookingModal.js';

// CRM Components
import { CrmLayout } from './components/crm/CrmLayout.js';
import { CrmDashboard } from './components/crm/CrmDashboard.js';
import { CrmCalendar } from './components/crm/CrmCalendar.js';
import { CrmPatients } from './components/crm/CrmPatients.js';
import { CrmSchedules } from './components/crm/CrmSchedules.js';
import { CrmWhatsApp } from './components/crm/CrmWhatsApp.js';
import { CrmSettings } from './components/crm/CrmSettings.js';

// La vista actual vive en la URL (/, /crm/agenda, /crm/configuracion…) para que recargar o usar
// atrás/adelante mantenga la página. Las anclas de la web pública (#horarios…) siguen funcionando.
type CrmTab = 'dashboard' | 'calendar' | 'patients' | 'schedules' | 'whatsapp' | 'settings';
const TAB_SLUGS: Record<CrmTab, string> = {
  dashboard: 'dashboard', calendar: 'agenda', patients: 'pacientes',
  schedules: 'horarios', whatsapp: 'whatsapp', settings: 'configuracion',
};
const DEFAULT_TAB: CrmTab = 'calendar';

function readRoute(): { view: 'public' | 'crm'; tab: CrmTab } {
  const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'crm') return { view: 'public', tab: DEFAULT_TAB };
  const tab = (Object.keys(TAB_SLUGS) as CrmTab[]).find(t => TAB_SLUGS[t] === parts[1]) || DEFAULT_TAB;
  return { view: 'crm', tab };
}

function routePath(view: 'public' | 'crm', tab: CrmTab) {
  return view === 'crm' ? `/crm/${TAB_SLUGS[tab]}` : '/';
}

export const App: React.FC = () => {
  const initialRoute = readRoute();
  const [view, setViewState] = useState<'public' | 'crm'>(initialRoute.view);
  const [crmTab, setCrmTabState] = useState<CrmTab>(initialRoute.tab);

  const navigate = (nextView: 'public' | 'crm', nextTab: CrmTab = crmTab) => {
    const path = routePath(nextView, nextTab);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setViewState(nextView);
    setCrmTabState(nextTab);
    if (nextView === 'public') window.scrollTo(0, 0);
  };
  const setView = (next: 'public' | 'crm') => navigate(next);
  const setCrmTab = (tab: CrmTab) => navigate('crm', tab);

  // Atrás / adelante del navegador
  useEffect(() => {
    const onPop = () => {
      const r = readRoute();
      setViewState(r.view);
      setCrmTabState(r.tab);
    };
    window.addEventListener('popstate', onPop);
    // Normaliza la URL inicial (p. ej. /crm → /crm/agenda) sin crear entrada en el historial
    const canonical = routePath(initialRoute.view, initialRoute.tab);
    if (initialRoute.view === 'crm' && window.location.pathname !== canonical) window.history.replaceState(null, '', canonical);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);

  // Sesión del CRM: undefined = comprobando, null = sin sesión (pantalla de acceso)
  const [session, setSession] = useState<CrmSessionInfo | null | undefined>(undefined);
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    if (view !== 'crm' || session) return;
    let alive = true;
    api.getSession().then(s => alive && setSession(s)).catch(() => alive && setSession(null));
    return () => { alive = false; };
  }, [view]);

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(current => {
        if (current) setSessionNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        return null;
      });
    };
    window.addEventListener(CRM_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(CRM_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* la cookie se borra igualmente al caducar */ }
    setSession(null);
    setSessionNotice('');
  };

  // Título y descripción de la pestaña / buscadores, desde Configuración
  const identity = useSiteIdentity();
  const clinicInfo = useClinicInfo();
  useEffect(() => {
    if (!identity || !clinicInfo) return;
    const title = [clinicInfo.name, identity.hero_title].filter(Boolean).join(' · ');
    if (title) document.title = view === 'crm' ? `Panel · ${clinicInfo.name}` : title;
    const desc = identity.hero_subtitle || '';
    if (desc) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    }
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  }, [identity, clinicInfo, view]);

  const handleOpenBooking = (serviceId?: string) => {
    setPreselectedServiceId(serviceId);
    setIsBookingModalOpen(true);
  };

  // VISTA PANEL ADMINISTRATIVO / CRM (requiere sesión)
  if (view === 'crm') {
    if (session === undefined) {
      return <div className="min-h-dvh bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400">Comprobando acceso…</div>;
    }
    if (session === null) {
      return (
        <CrmLogin
          notice={sessionNotice}
          onSuccess={s => { setSession(s); setSessionNotice(''); }}
          onBack={() => setView('public')}
        />
      );
    }
    return (
      <CrmLayout
        currentTab={crmTab}
        onSelectTab={setCrmTab}
        onExitCrm={() => setView('public')}
        session={session}
        onLogout={handleLogout}
      >
        {crmTab === 'dashboard' && (
          <CrmDashboard
            onGoToCalendar={() => setCrmTab('calendar')}
            onGoToWhatsApp={() => setCrmTab('whatsapp')}
            onGoToPatients={() => setCrmTab('patients')}
          />
        )}
        {crmTab === 'calendar' && <CrmCalendar />}
        {crmTab === 'patients' && <CrmPatients />}
        {crmTab === 'schedules' && <CrmSchedules />}
        {crmTab === 'whatsapp' && <CrmWhatsApp />}
        {crmTab === 'settings' && <CrmSettings />}
      </CrmLayout>
    );
  }

  // VISTA WEB PÚBLICA / LANDING CORPORATIVA
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar
        onOpenBooking={() => handleOpenBooking()}
        onGoToCrm={() => setView('crm')}
      />

      <main className="flex-1">
        <Hero onOpenBooking={() => handleOpenBooking()} />
        <ServicesSection onSelectServiceForBooking={(sId) => handleOpenBooking(sId)} />
        <TeamSection onOpenBooking={() => handleOpenBooking()} />
        <PublicScheduleSection onOpenBooking={() => handleOpenBooking()} />
        <TestimonialsSection />
        <FaqSection />
        <ContactSection />
      </main>

      <Footer />
      <FloatingWhatsApp />

      {/* 4-Step Public Booking Modal */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        preselectedServiceId={preselectedServiceId}
      />
    </div>
  );
};

