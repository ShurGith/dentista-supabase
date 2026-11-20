import React from 'react';
import { MapPin } from 'lucide-react';

export interface ClinicContactForm {
  phone: string;
  emergency_phone: string;
  whatsapp_phone: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  google_maps_url: string;
}

export const emptyContact: ClinicContactForm = {
  phone: '', emergency_phone: '', whatsapp_phone: '', email: '', address: '', postal_code: '', city: '', province: '', google_maps_url: '',
};

export function toContactForm(c: any): ClinicContactForm {
  return Object.fromEntries(Object.keys(emptyContact).map(k => [k, c?.[k] ?? ''])) as unknown as ClinicContactForm;
}

const PHONE_RE = /^\+?[0-9][0-9 ().-]{6,22}$/;
const validPhone = (v: string) => PHONE_RE.test(v.trim()) && v.replace(/\D/g, '').length >= 9 && v.replace(/\D/g, '').length <= 15;

/** Errores por campo (mismas reglas que valida la API). */
export function validateContact(f: ClinicContactForm): Partial<Record<keyof ClinicContactForm, string>> {
  const e: Partial<Record<keyof ClinicContactForm, string>> = {};
  if (!validPhone(f.phone)) e.phone = 'Teléfono con prefijo, p. ej. +34 915 223 344.';
  if (f.emergency_phone.trim() && !validPhone(f.emergency_phone)) e.emergency_phone = 'Teléfono no válido.';
  if (f.whatsapp_phone.trim() && !validPhone(f.whatsapp_phone)) e.whatsapp_phone = 'Teléfono no válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email no válido.';
  if (f.address.trim().length < 3) e.address = 'Indica la dirección.';
  if (!/^[0-9A-Za-z -]{3,10}$/.test(f.postal_code.trim())) e.postal_code = 'Código postal no válido.';
  if (f.city.trim().length < 2) e.city = 'Indica la ciudad.';
  if (f.google_maps_url.trim() && !/^https?:\/\/\S+$/.test(f.google_maps_url.trim())) e.google_maps_url = 'Debe ser un enlace que empiece por https://';
  return e;
}

const input = (error?: string) =>
  `w-full p-2.5 rounded-xl border ${error ? 'border-red-300' : 'border-slate-200'} bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500`;

interface FieldProps {
  id: keyof ClinicContactForm;
  label: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  className?: string;
}

export const ClinicContactEditor: React.FC<{
  value: ClinicContactForm;
  errors: Partial<Record<keyof ClinicContactForm, string>>;
  onChange: (v: ClinicContactForm) => void;
}> = ({ value, errors, onChange }) => {
  const Field = ({ id, label, hint, type = 'text', autoComplete, className }: FieldProps) => (
    <div className={className}>
      <label htmlFor={`clinic-${id}`} className="block font-bold text-slate-700 mb-1">{label}</label>
      <input
        id={`clinic-${id}`}
        type={type}
        autoComplete={autoComplete}
        value={value[id]}
        onChange={e => onChange({ ...value, [id]: e.target.value })}
        aria-invalid={!!errors[id]}
        className={input(errors[id])}
      />
      {errors[id]
        ? <span className="text-[11px] font-bold text-red-600 mt-0.5 block" role="alert">{errors[id]}</span>
        : hint && <span className="text-[10px] text-slate-400 mt-0.5 block">{hint}</span>}
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-600" /> Datos de Contacto de la Clínica
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xl">
          Teléfonos, email y dirección que aparecen en toda la web pública: cabecera, contacto, urgencias, botones de WhatsApp y confirmación de reserva.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {Field({ id: 'phone', label: 'Teléfono principal *', type: 'tel', autoComplete: 'tel', hint: 'Con prefijo, p. ej. +34 915 223 344' })}
        {Field({ id: 'emergency_phone', label: 'Teléfono de urgencias', type: 'tel', hint: 'Se muestra como «Urgencias 24h». Vacío = no se muestra.' })}
        {Field({ id: 'whatsapp_phone', label: 'WhatsApp de contacto', type: 'tel', hint: 'Botones de WhatsApp de la web. Vacío = urgencias o principal.' })}
        {Field({ id: 'email', label: 'Email *', type: 'email', autoComplete: 'email', className: 'sm:col-span-3 sm:max-w-md' })}
        {Field({ id: 'address', label: 'Dirección *', autoComplete: 'street-address', className: 'sm:col-span-3', hint: 'Calle, número y planta, p. ej. Calle Mayor 45, Planta 1' })}
        {Field({ id: 'postal_code', label: 'Código postal *', autoComplete: 'postal-code' })}
        {Field({ id: 'city', label: 'Ciudad *', autoComplete: 'address-level2' })}
        {Field({ id: 'province', label: 'Provincia', autoComplete: 'address-level1' })}
        {Field({ id: 'google_maps_url', label: 'Enlace de Google Maps', type: 'url', className: 'sm:col-span-3', hint: 'Opcional. Si está vacío, el mapa busca la dirección automáticamente.' })}
      </div>
    </div>
  );
};
