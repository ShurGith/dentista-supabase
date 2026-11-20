import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useClinicInfo, whatsappHref, whatsappPhone } from '../../clinicInfo.js';

export const FloatingWhatsApp: React.FC = () => {
  const clinic = useClinicInfo();
  const href = whatsappHref(whatsappPhone(clinic), `Hola, quisiera pedir información para una cita en ${clinic?.name || 'la clínica'}`);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 flex items-center justify-center group"
    >
      <MessageSquare className="w-7 h-7 fill-white" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-xs pl-0 group-hover:pl-2">
        ¿Hablamos por WhatsApp?
      </span>
    </a>
  );
};

