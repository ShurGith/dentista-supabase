import React from 'react';
import { clinicNow, usePublicSchedule } from '../../clinicHours.js';
import { Clock, Calendar, MessageSquare, Phone, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';
import { fullAddress, telHref, useClinicInfo, whatsappHref, whatsappPhone } from '../../clinicInfo.js';

interface PublicScheduleSectionProps {
  onOpenBooking: () => void;
}

export const PublicScheduleSection: React.FC<PublicScheduleSectionProps> = ({ onOpenBooking }) => {
  // Misma petición compartida que la franja superior, el hero y contacto.
  const { data: scheduleData, loading } = usePublicSchedule();
  const clinic = useClinicInfo();

  // «Hoy» según la hora de la clínica (Madrid), no la del navegador.
  const todayNum = clinicNow().day;

  return (
    <section id="horarios" className="py-20 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Disponibilidad y Apertura
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Horario de atención
          </h2>
          <p className="text-base text-slate-600">
            Horarios actualizados en tiempo real directamente desde nuestra central clínica para ofrecerte la máxima puntualidad.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Columna Izquierda: Tabla Semanal Interactiva */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Horario Semanal Habitual</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Horario activo
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Cargando horario activo...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {scheduleData?.weekly_schedule?.map((day: any) => {
                  const isToday = day.day_of_week === todayNum;

                  return (
                    <div
                      key={day.day_of_week}
                      className={`py-3.5 px-4 rounded-xl flex items-center justify-between text-sm transition ${
                        isToday ? 'bg-brand-50/80 font-bold text-brand-950 border border-brand-100' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{day.day_name}</span>
                        {isToday && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white px-2 py-0.5 rounded-full">
                            Hoy
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        {day.is_closed ? (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                            Cerrado
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {day.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aviso de festivos o excepciones próximas */}
            {!!scheduleData?.upcoming_holidays?.length && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Próximos festivos o modificaciones de agenda:</strong>
                  {scheduleData.upcoming_holidays.map((h: any) => (
                    <p key={h.id} className="mt-0.5">
                      • {new Date(h.start_time).toLocaleDateString('es-ES')}: {h.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Tarjetas de urgencia y contacto */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Urgencias Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base">Atención de Urgencias</h4>
                  <p className="text-xs text-red-300">Dolor agudo, fracturas o traumatismos</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Si sufres dolor dental severo, disponemos de huecos de urgencia en el mismo día y guardia telefónica para atenderte con prioridad.
              </p>

              <div className="space-y-3">
                {clinic?.emergency_phone && (
                  <a
                    href={telHref(clinic.emergency_phone)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                  >
                    <Phone className="w-4 h-4" />
                    Llamar a Urgencias: {clinic.emergency_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Reserva o consulta directamente:</h4>

              <button
                onClick={onOpenBooking}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-brand-600/20"
              >
                <Calendar className="w-4 h-4" />
                Reservar Cita Previa
              </button>

              <a
                href={whatsappHref(whatsappPhone(clinic), 'Hola, quisiera consultar por una cita o tratamiento')}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                Consultar por WhatsApp (Wawp)
              </a>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{fullAddress(clinic)}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

