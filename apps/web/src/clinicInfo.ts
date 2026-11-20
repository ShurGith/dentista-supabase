// Datos de contacto de la clínica (tabla clinics, se editan en Configuración). Una sola petición
// compartida por toda la página; loadClinicInfo(true) la refresca tras guardar en el CRM.
import { useEffect, useState } from 'react';
import { api } from './api.js';

export interface ClinicInfo {
  name: string;
  phone: string | null;
  emergency_phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  google_maps_url: string | null;
}

let cached: Promise<ClinicInfo> | null = null;
const listeners = new Set<(c: ClinicInfo) => void>();

export function loadClinicInfo(force = false) {
  if (!cached || force) {
    cached = api.getClinicPublic().catch(err => { cached = null; throw err; });
    cached.then(c => listeners.forEach(l => l(c))).catch(() => undefined);
  }
  return cached;
}

export function useClinicInfo() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  useEffect(() => {
    let alive = true;
    const update = (c: ClinicInfo) => alive && setClinic(c);
    listeners.add(update);
    loadClinicInfo().then(update).catch(() => undefined);
    return () => { alive = false; listeners.delete(update); };
  }, []);
  return clinic;
}

const digits = (phone?: string | null) => (phone || '').replace(/\D/g, '');

/** Enlace tel: con prefijo internacional (+34915223344). */
export const telHref = (phone?: string | null) => (digits(phone) ? `tel:+${digits(phone)}` : undefined);

/** Enlace wa.me con texto opcional. */
export const whatsappHref = (phone?: string | null, text?: string) =>
  digits(phone) ? `https://wa.me/${digits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}` : undefined;

/** «Calle Mayor 45, Planta 1, 28013 Madrid» */
export const fullAddress = (c?: ClinicInfo | null) =>
  c ? [c.address, [c.postal_code, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';

/** «Calle Mayor 45, Planta 1, Madrid» (sin código postal, para espacios reducidos) */
export const shortAddress = (c?: ClinicInfo | null) => (c ? [c.address, c.city].filter(Boolean).join(', ') : '');

/** Enlace de mapa: el configurado o una búsqueda en Google Maps con la dirección. */
export const mapsHref = (c?: ClinicInfo | null) =>
  c?.google_maps_url || (c ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${fullAddress(c)}`)}` : undefined);

/** Teléfono de WhatsApp efectivo: el específico o, si falta, el de urgencias o el principal. */
export const whatsappPhone = (c?: ClinicInfo | null) => c?.whatsapp_phone || c?.emergency_phone || c?.phone || null;
