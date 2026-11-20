import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Clock, CheckCircle2, ChevronRight, Stethoscope, Sparkles, Smile, ShieldCheck, Zap, Activity, Heart, Sun, AlertCircle } from 'lucide-react';

interface ServicesSectionProps {
  onSelectServiceForBooking: (serviceId: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Smile,
  Zap,
  Activity,
  Heart,
  Sun,
  AlertCircle,
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectServiceForBooking }) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<any | null>(null);

  useEffect(() => {
    api.getServices().then(data => setServices(data)).catch(console.error);
  }, []);

  return (
    <section id="tratamientos" className="py-20 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Especialidades Clínicas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tratamientos odontológicos avanzados y sin dolor
          </h2>
          <p className="text-base text-slate-600">
            Cada plan de tratamiento es diseñado a medida por nuestro equipo médico tras un estudio digital minucioso.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((srv) => {
            const IconComp = ICON_MAP[srv.icon] || Sparkles;
            const benefitsList = srv.benefits ? srv.benefits.split(';') : [];

            return (
              <div
                key={srv.id}
                className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: srv.color || 'rgb(var(--brand-600))' }}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {srv.duration_minutes} min aprox.
                    </span>
                  </div>

                  <span className="text-xs font-bold text-brand-700 tracking-wider uppercase block mb-1">
                    {srv.category}
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-600 transition">
                    {srv.name}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    {srv.description}
                  </p>

                  {benefitsList.length > 0 && (
                    <div className="space-y-2 mb-6 pt-4 border-t border-slate-100">
                      {benefitsList.map((b: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{b.trim()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectServiceForBooking(srv.id)}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-brand-600/20"
                  >
                    Reservar este tratamiento
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedServiceDetail(srv)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-3 px-3 rounded-xl transition"
                    title="Ver más información"
                  >
                    Detalles
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal de Detalle de Tratamiento */}
      {selectedServiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedServiceDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: selectedServiceDetail.color || 'rgb(var(--brand-600))' }}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                  {selectedServiceDetail.category}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {selectedServiceDetail.name}
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción del procedimiento</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedServiceDetail.description}
              </p>
            </div>

            {selectedServiceDetail.benefits && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Beneficios para tu salud oral</h4>
                <div className="space-y-1.5">
                  {selectedServiceDetail.benefits.split(';').map((b: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{b.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-between text-xs font-medium text-brand-900">
              <span>⏱ Duración estimada en consulta:</span>
              <span className="font-bold">{selectedServiceDetail.duration_minutes} minutos</span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  const id = selectedServiceDetail.id;
                  setSelectedServiceDetail(null);
                  onSelectServiceForBooking(id);
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition text-center"
              >
                Reservar cita ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

