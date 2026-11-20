import React from 'react';
import { Calendar, Phone, MessageSquare, ShieldCheck, Award, Heart, Sparkles } from 'lucide-react';
import { todayStatus, todayStatusLabel, usePublicSchedule } from '../../clinicHours.js';
import { telHref, useClinicInfo, whatsappHref, whatsappPhone } from '../../clinicInfo.js';
import { useSiteIdentity } from '../../brandTheme.js';

interface HeroProps {
  onOpenBooking: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  const clinic = useClinicInfo();
  const { data: schedule } = usePublicSchedule();
  const status = schedule ? todayStatus(schedule.weekly_schedule) : null;
  const identity = useSiteIdentity();
  // Las tres últimas palabras del título van en el color de marca (si el título tiene al menos cinco).
  const titleWords = (identity?.hero_title || '').trim().split(/\s+/).filter(Boolean);
  const accentCount = titleWords.length >= 5 ? 3 : 0;
  const titleLead = titleWords.slice(0, titleWords.length - accentCount).join(' ') + (accentCount ? ' ' : '');
  const titleAccent = titleWords.slice(titleWords.length - accentCount).join(' ');
  return (
    <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white py-20 lg:py-28">
      {/* Decorative backdrop elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 w-80 h-80 rounded-full bg-brand-200/40 blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main text column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-100/80 text-brand-800 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Tecnología Odontológica 3D & Trato Cercano
            </div>

            {/* Título y subtítulo: Configuración → Identidad Visual y Contenidos Web */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] min-h-[1.15em]">
              {titleLead}{titleAccent && <span className="text-brand-600">{titleAccent}</span>}
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal min-h-[1.6em]">
              {identity?.hero_subtitle || ''}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-xl text-base shadow-lg shadow-brand-600/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Calendar className="w-5 h-5" />
                Pedir Cita Online
              </button>

              <a
                href={whatsappHref(whatsappPhone(clinic), `Hola, me gustaría consultar por una cita en ${clinic?.name || 'la clínica'}`)}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-4 rounded-xl text-base shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
              >
                <MessageSquare className="w-5 h-5" />
                Contactar por WhatsApp
              </a>

              {clinic?.phone && (
                <a
                  href={telHref(clinic.phone)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-slate-700 hover:text-brand-700 bg-white hover:bg-slate-50 border border-slate-200 font-bold px-6 py-4 rounded-xl text-base transition"
                >
                  <Phone className="w-4 h-4 text-slate-500" />
                  {clinic.phone}
                </a>
              )}
            </div>

            {/* Badges */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-left">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Sin dolor</h4>
                  <p className="text-xs text-slate-500">Anestesia guiada</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Award className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Especialistas</h4>
                  <p className="text-xs text-slate-500">Colegiados en Madrid</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">+15.000</h4>
                  <p className="text-xs text-slate-500">Sonrisas cuidadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual card column */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-100 p-6 sm:p-8">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-black text-xl">
                    DE
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Atención Inmediata</h3>
                    {status ? (
                      <p className={`text-xs font-semibold flex items-center gap-1 ${status.state === 'open' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        <span className={`w-2 h-2 rounded-full inline-block ${status.state === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {todayStatusLabel(status)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold">Consultando horario…</p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  Centro Madrid
                </span>
              </div>

              {/* Highlights */}
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold">
                    1ª
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">Diagnóstico y Exploración Completa</h4>
                    <p className="text-xs text-slate-500">Exploración clínica con radiovisiografía digital</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                    3D
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">Escaneo Intraoral Digital</h4>
                    <p className="text-xs text-slate-500">Sin pastas ni moldes molestos</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    WA
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-emerald-950 text-sm">Confirmación y Avisos por WhatsApp</h4>
                    <p className="text-xs text-emerald-700">Recordatorios automáticos en tu móvil mediante Wawp</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onOpenBooking}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-brand-400" />
                Comprobar horarios disponibles
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

