import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { groupWeek, usePublicSchedule } from '../../clinicHours.js';
import { fullAddress, mapsHref, shortAddress, telHref, useClinicInfo } from '../../clinicInfo.js';

export const ContactSection: React.FC = () => {
  const [sent, setSent] = useState(false);
  const clinic = useClinicInfo();
  const { data: schedule, error: scheduleError } = usePublicSchedule();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section id="contacto" className="py-20 bg-white border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Estamos en el centro de Madrid
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ven a conocernos o contáctanos
          </h2>
          <p className="text-base text-slate-600">
            Instalaciones clínicas modernas y accesibles a 2 minutos de la Puerta del Sol.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Info & Map Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5">
              <h3 className="font-extrabold text-slate-900 text-lg">Información de contacto</h3>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Dirección:</strong>
                    <span>{fullAddress(clinic) || 'Cargando…'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Teléfono:</strong>
                    <a href={telHref(clinic?.phone)} className="hover:text-brand-600 font-semibold">{clinic?.phone || 'Cargando…'}</a>
                    {clinic?.emergency_phone && (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Urgencias: <a href={telHref(clinic.emergency_phone)} className="font-semibold hover:text-brand-600">{clinic.emergency_phone}</a>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Email:</strong>
                    <a href={clinic?.email ? `mailto:${clinic.email}` : undefined} className="hover:text-brand-600 font-semibold">{clinic?.email || 'Cargando…'}</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Horario habitual:</strong>
                    {schedule ? (
                      groupWeek(schedule.weekly_schedule, { includeClosed: true }).map(g => (
                        <p key={g.days} className="text-xs text-slate-600">
                          {g.days}: <span className={g.closed ? 'text-slate-400' : 'font-semibold text-slate-700 tabular-nums'}>{g.hours}</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        {scheduleError ? 'Consulta el horario llamando a la clínica.' : 'Cargando horario…'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder Graphic */}
            <a
              href={mapsHref(clinic)}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl overflow-hidden border border-slate-200/80 bg-slate-100 hover:bg-slate-200/60 transition h-48 relative flex items-center justify-center text-center p-4"
            >
              <div>
                <MapPin className="w-8 h-8 text-red-500 mx-auto mb-1" />
                <span className="font-bold text-slate-900 text-xs block">{shortAddress(clinic) || 'Cargando…'}</span>
                <span className="text-[11px] font-semibold text-brand-700">Ver en Google Maps</span>
              </div>
            </a>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">Envíanos un mensaje o consulta</h3>
            <p className="text-xs text-slate-500 mb-6">Nuestro equipo de atención al paciente responderá en menos de 24 horas laborables.</p>

            {sent ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-extrabold text-slate-900 text-lg">¡Mensaje enviado con éxito!</h4>
                <p className="text-sm text-slate-600">Nos pondremos en contacto contigo a la mayor brevedad.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre completo *</label>
                    <input type="text" required placeholder="Tu nombre" className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono *</label>
                    <input type="tel" required placeholder="Tu número de móvil" className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico *</label>
                  <input type="email" required placeholder="tu@email.com" className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje o duda *</label>
                  <textarea required rows={4} placeholder="Escribe aquí tu consulta..." className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500" />
                </div>

                <div className="text-xs text-slate-500 leading-relaxed">
                  Tus datos serán tratados exclusivamente para responder a tu consulta conforme a nuestra política de privacidad (RGPD).
                </div>

                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-7 py-3.5 rounded-xl transition flex items-center gap-2 shadow-sm shadow-brand-600/20"
                >
                  <Send className="w-4 h-4" />
                  Enviar Consulta
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};

