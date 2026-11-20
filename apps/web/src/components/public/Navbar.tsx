import React from 'react';
import { Calendar, Phone, MessageSquare, Shield, Clock, Stethoscope } from 'lucide-react';
import { groupWeek, usePublicSchedule } from '../../clinicHours.js';
import { shortAddress, telHref, useClinicInfo, whatsappHref, whatsappPhone } from '../../clinicInfo.js';

interface NavbarProps {
  onOpenBooking: () => void;
  onGoToCrm: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking, onGoToCrm }) => {
  const clinic = useClinicInfo();
  const { data: schedule } = usePublicSchedule();
  const hoursSummary = schedule
    ? groupWeek(schedule.weekly_schedule).map(g => `${g.days}: ${g.hours}`).join(' · ')
    : '';
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
      {/* Top emergency and info bar */}
      {/* <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            {hoursSummary || 'Consulta nuestro horario'}
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline">{shortAddress(clinic)}</span>
        </div>
        <div className="flex items-center gap-4">
          {clinic?.emergency_phone && (
            <a
              href={telHref(clinic.emergency_phone)}
              className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
            >
              <Phone className="w-3 h-3" /> Urgencias 24h: {clinic.emergency_phone}
            </a>
          )}
      
        </div>
      </div> */}

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                         <button
            onClick={onGoToCrm}>
            <Stethoscope className="w-6 h-6" />
          </button>   
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
              {clinic?.name || 'la clínica'}
            </span>
            <span className="text-xs text-brand-600 font-semibold uppercase tracking-wider block">
              Odontología Integral Avanzada
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
          <a href="#inicio" className="text-slate-700 hover:text-brand-600 transition">Inicio</a>
          <a href="#tratamientos" className="text-slate-700 hover:text-brand-600 transition">Tratamientos</a>
          <a href="#equipo" className="text-slate-700 hover:text-brand-600 transition">Equipo Médico</a>
          <a href="#horarios" className="text-slate-700 hover:text-brand-600 transition">Horarios</a>
          <a href="#testimonios" className="text-slate-700 hover:text-brand-600 transition">Opiniones</a>
          <a href="#contacto" className="text-slate-700 hover:text-brand-600 transition">Contacto</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={whatsappHref(whatsappPhone(clinic), `Hola, quisiera solicitar información en ${clinic?.name || 'la clínica'}`)}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            WhatsApp
          </a>
          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-brand-600/20 transition active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            Reservar Cita
          </button>
        </div>
      </div>
    </header>
  );
};

