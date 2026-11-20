import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Clock, MessageSquare,
  Settings, ArrowLeft, Stethoscope, Menu, X, LogOut
} from 'lucide-react';
import { useClinicInfo } from '../../clinicInfo.js';

type CrmTab = 'dashboard' | 'calendar' | 'patients' | 'schedules' | 'whatsapp' | 'settings';

interface CrmLayoutProps {
  currentTab: CrmTab;
  onSelectTab: (tab: CrmTab) => void;
  onExitCrm: () => void;
  session: { username: string; source: 'env' | 'db' };
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: { id: CrmTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Agenda y Citas', icon: Calendar },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'schedules', label: 'Horarios y Bloqueos', icon: Clock },
  { id: 'whatsapp', label: 'WhatsApp (Wawp)', icon: MessageSquare, badge: 'En vivo' },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export const CrmLayout: React.FC<CrmLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitCrm,
  session,
  onLogout,
  children,
}) => {
  const clinic = useClinicInfo();
  const initials = session.username.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'U';
  const roleLabel = session.source === 'env' ? 'Superusuario' : 'Usuario del panel';
  // Por debajo de lg (1024 px) el menú lateral es un panel desplegable; en escritorio está siempre visible.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    firstNavRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Si la ventana pasa a escritorio con el menú abierto, se cierra para no dejar el velo puesto.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const selectTab = (tab: CrmTab) => {
    onSelectTab(tab);
    setMenuOpen(false);
  };

  const currentLabel = navItems.find(i => i.id === currentTab)?.label;

  return (
    <div className="h-dvh flex bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Velo del menú en móvil/tablet */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="crm-sidebar"
        aria-label="Menú del panel"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 shadow-xl
          transition-transform duration-200 ease-out lg:static lg:translate-x-0
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="min-h-0 overflow-y-auto">
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm block tracking-tight">Dental Eugenia</span>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block">Panel Clínico</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); menuButtonRef.current?.focus(); }}
              className="lg:hidden p-2 -mr-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  ref={index === 0 ? firstNavRef : undefined}
                  onClick={() => selectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onExitCrm}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la Web Pública
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="crm-sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* En móvil, la cabecera dice en qué sección estás */}
            <span className="lg:hidden text-sm font-extrabold text-slate-900 truncate">{currentLabel}</span>
            <span className="hidden lg:inline text-xs text-slate-400 font-medium">Clínica:</span>
            <span className="hidden lg:inline text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
              {clinic ? `${clinic.name}${clinic.city ? ` (${clinic.city})` : ''}` : 'Cargando…'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:pl-4 sm:border-l border-slate-200 shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs" aria-hidden="true">
              {initials}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight">{session.username}</span>
              <span className="text-[10px] text-slate-500 block">{roleLabel}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
