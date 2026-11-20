import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClinicInfo } from '../../clinicInfo.js';

export const FaqSection: React.FC = () => {
  const clinic = useClinicInfo();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Cómo funciona la reserva online de citas?',
      a: 'Es muy sencillo: seleccionas el tratamiento dental que necesitas, eliges a tu especialista preferido (o el primero libre), seleccionas fecha y hora en tiempo real, e introduces tus datos de contacto. Recibirás una confirmación inmediata por WhatsApp.',
    },
    {
      q: '¿Puedo cancelar o reprogramar mi cita médica?',
      a: 'Sí. A través del enlace que recibes por WhatsApp o avisándonos directamente en ese mismo chat, puedes solicitar el cambio de día o la anulación de tu cita con total comodidad.',
    },
    {
      q: '¿Qué medidas de protección de datos (RGPD) aplicáis a mi historial?',
      a: 'Tus datos clínicos y de contacto están rigurosamente protegidos bajo el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales (LOPD-GDD). Solo el personal facultativo autorizado accede a tu historial médico.',
    },
    {
      q: '¿Atendéis urgencias odontológicas sin cita previa?',
      a: `Sí. Si sufres dolor agudo, flemón, sangrado o rotura de una pieza dental, acude directamente a nuestra clínica${clinic?.address ? ` en ${clinic.address}` : ''}${clinic?.emergency_phone ? ` o llámanos al teléfono de urgencias ${clinic.emergency_phone}` : ''}.`,
    },
    {
      q: '¿Cómo funciona la confirmación por WhatsApp mediante Wawp?',
      a: 'Nuestro sistema de mensajería automatizada te envía recordatorios 24 horas y 2 horas antes de tu cita. Puedes confirmar tu asistencia simplemente respondiendo "SÍ" al mensaje.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-14 space-y-3">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Resolvemos tus dudas
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 text-sm sm:text-base focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

