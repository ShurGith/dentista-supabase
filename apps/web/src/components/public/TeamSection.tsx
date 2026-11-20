import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Award, Languages, Calendar, Stethoscope } from 'lucide-react';

interface TeamSectionProps {
  onOpenBooking: () => void;
}

export const TeamSection: React.FC<TeamSectionProps> = ({ onOpenBooking }) => {
  const [professionals, setProfessionals] = useState<any[]>([]);

  useEffect(() => {
    api.getProfessionals().then(data => setProfessionals(data)).catch(console.error);
  }, []);

  return (
    <section id="equipo" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Equipo Facultativo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Odontólogos especialistas de primer nivel
          </h2>
          <p className="text-base text-slate-600">
            Profesionales colegiados con amplia trayectoria clínica, formación continua y un compromiso inquebrantable con la salud bucodental.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200"
            >
              <div>
                {/* Doctor Avatar / Badge */}
                <div className="relative mb-5">
                  <div
                    className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-md"
                    style={{ backgroundColor: prof.color || 'rgb(var(--brand-600))' }}
                  >
                    {prof.first_name[0]}{prof.last_name[0]}
                  </div>
                  {prof.collegiated_number && (
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-sm">
                        <Award className="w-3 h-3 text-brand-600" /> Col. Nº {prof.collegiated_number}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {prof.first_name} {prof.last_name}
                  </h3>
                  <p className="text-xs font-semibold text-brand-700 mt-1">
                    {prof.specialty}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed text-center mb-4">
                  {prof.biography}
                </p>

                {prof.languages && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 mb-4">
                    <Languages className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prof.languages}</span>
                  </div>
                )}
              </div>

              <button
                onClick={onOpenBooking}
                className="w-full mt-4 bg-white hover:bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Pedir cita con el doctor
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

