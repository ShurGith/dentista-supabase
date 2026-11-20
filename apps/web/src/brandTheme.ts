// Identidad pública de la web (tabla settings): título, subtítulo y color de marca.
// El color principal se toma como tono 600 de la paleta «brand» y se generan los demás tonos
// mezclando con blanco (más claros) o negro (más oscuros). Se aplican como variables CSS
// (--brand-50 … --brand-900) que usa Tailwind, así que toda la web, CRM incluido, cambia de color.
import { useEffect, useState } from 'react';
import { api } from './api.js';

export interface SiteIdentity {
  hero_title?: string | null;
  hero_subtitle?: string | null;
  primary_color?: string | null;
}

export const DEFAULT_BRAND = '#0d9488';
const STORAGE_KEY = 'brand-color';
const SHADES: [number, 'white' | 'black' | null, number][] = [
  [50, 'white', 0.95], [100, 'white', 0.85], [200, 'white', 0.7], [300, 'white', 0.5], [400, 'white', 0.25],
  [500, 'white', 0.1], [600, null, 0], [700, 'black', 0.15], [800, 'black', 0.3], [900, 'black', 0.45],
];

const isHex = (v?: string | null): v is string => !!v && /^#[0-9a-fA-F]{6}$/.test(v);
const hexToRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** Paleta 50–900 como tripletes «R G B» para las variables CSS. */
export function brandPalette(hex: string): Record<number, string> {
  const base = hexToRgb(hex);
  const out: Record<number, string> = {};
  for (const [shade, mixWith, amount] of SHADES) {
    const target = mixWith === 'white' ? 255 : 0;
    out[shade] = base.map(c => Math.round(mixWith ? c + (target - c) * amount : c)).join(' ');
  }
  return out;
}

/** Aplica el color de marca a toda la página. */
export function applyBrandColor(hex?: string | null) {
  const color = isHex(hex) ? hex : DEFAULT_BRAND;
  const root = document.documentElement;
  for (const [shade, rgb] of Object.entries(brandPalette(color))) root.style.setProperty(`--brand-${shade}`, rgb);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try { localStorage.setItem(STORAGE_KEY, color); } catch { /* sin almacenamiento: no pasa nada */ }
}

/** Al arrancar, aplica el último color conocido para que no parpadee el turquesa por defecto. */
export function applyCachedBrandColor() {
  try {
    const cachedColor = localStorage.getItem(STORAGE_KEY);
    if (isHex(cachedColor)) applyBrandColor(cachedColor);
  } catch { /* sin almacenamiento */ }
}

/** Contraste WCAG del texto blanco sobre el color (los botones de marca llevan texto blanco). */
export function whiteContrast(hex: string) {
  if (!isHex(hex)) return 21;
  const lum = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  return 1.05 / (L + 0.05);
}

// ---- Datos de identidad compartidos -------------------------------------------------------------

let cached: Promise<SiteIdentity> | null = null;
const listeners = new Set<(s: SiteIdentity) => void>();

export function loadSiteIdentity(force = false) {
  if (!cached || force) {
    cached = api.getSiteIdentity().catch(err => { cached = null; throw err; });
    cached.then(s => { applyBrandColor(s.primary_color); listeners.forEach(l => l(s)); }).catch(() => undefined);
  }
  return cached;
}

export function useSiteIdentity() {
  const [identity, setIdentity] = useState<SiteIdentity | null>(null);
  useEffect(() => {
    let alive = true;
    const update = (s: SiteIdentity) => alive && setIdentity(s);
    listeners.add(update);
    loadSiteIdentity().then(update).catch(() => undefined);
    return () => { alive = false; listeners.delete(update); };
  }, []);
  return identity;
}
