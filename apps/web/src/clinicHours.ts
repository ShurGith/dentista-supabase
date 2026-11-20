// Horario de apertura de la clínica: una sola fuente (tabla clinic_schedules vía /schedules/public).
// La web pública lo usa para la franja superior, el hero, contacto y la sección de horarios.
import { useEffect, useState } from 'react';
import { api } from './api.js';

export const CLINIC_TZ = 'Europe/Madrid';

export interface PublicDaySchedule {
  day_of_week: number; // 0 = domingo … 6 = sábado
  day_name: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
  lunch_start?: string | null;
  lunch_end?: string | null;
  label: string;
}

export interface PublicScheduleData {
  weekly_schedule: PublicDaySchedule[];
  upcoming_holidays: { id: string; start_time: string; end_time: string; reason: string }[];
  emergency_hours: string;
  contact: Record<string, string> | null;
}

// Una petición compartida por todos los componentes de la página. Se descarta si falla, para reintentar.
let cached: Promise<PublicScheduleData> | null = null;
export function loadPublicSchedule(force = false) {
  if (!cached || force) {
    cached = api.getPublicSchedules().catch(err => { cached = null; throw err; });
  }
  return cached;
}

export function usePublicSchedule() {
  const [data, setData] = useState<PublicScheduleData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadPublicSchedule().then(d => alive && setData(d)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);
  return { data, error, loading: !data && !error };
}

const SHORT_DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

/** Agrupa días consecutivos con el mismo horario: [{ days: "Lun–Vie", hours: "09:00–14:00 y 16:00–20:00" }]. */
export function groupWeek(week: PublicDaySchedule[], { includeClosed = false } = {}) {
  const byDay = new Map(week.map(d => [d.day_of_week, d]));
  const hoursOf = (d?: PublicDaySchedule) => {
    if (!d || d.is_closed) return 'Cerrado';
    const open = hhmm(d.open_time), close = hhmm(d.close_time);
    return d.lunch_start && d.lunch_end
      ? `${open}–${hhmm(d.lunch_start)} y ${hhmm(d.lunch_end)}–${close}`
      : `${open}–${close}`;
  };
  const groups: { days: string; hours: string; closed: boolean }[] = [];
  let start = 0;
  for (let i = 1; i <= WEEK_ORDER.length; i++) {
    const prev = hoursOf(byDay.get(WEEK_ORDER[i - 1]));
    if (i < WEEK_ORDER.length && hoursOf(byDay.get(WEEK_ORDER[i])) === prev) continue;
    const first = SHORT_DAY[WEEK_ORDER[start]], last = SHORT_DAY[WEEK_ORDER[i - 1]];
    const span = i - start;
    const days = span === 1 ? first : span === 2 ? `${first} y ${last}` : `${first}–${last}`;
    if (includeClosed || prev !== 'Cerrado') groups.push({ days, hours: prev, closed: prev === 'Cerrado' });
    start = i;
  }
  return groups;
}

/** Día de la semana y minuto actual en la zona horaria de la clínica. */
export function clinicNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const toMinutes = (t?: string | null) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export type OpenStatus =
  | { state: 'open'; until: string }
  | { state: 'opens-later'; at: string }
  | { state: 'closed-now' }
  | { state: 'closed-today' };

/** Estado de hoy según el horario semanal (no tiene en cuenta bloqueos puntuales). */
export function todayStatus(week: PublicDaySchedule[], date = new Date()): OpenStatus {
  const { day, minutes } = clinicNow(date);
  const d = week.find(w => w.day_of_week === day);
  if (!d || d.is_closed) return { state: 'closed-today' };
  const ranges = d.lunch_start && d.lunch_end
    ? [[d.open_time, d.lunch_start], [d.lunch_end, d.close_time]]
    : [[d.open_time, d.close_time]];
  for (const [from, to] of ranges) {
    if (minutes < toMinutes(from)) return { state: 'opens-later', at: hhmm(from) };
    if (minutes < toMinutes(to)) return { state: 'open', until: hhmm(to) };
  }
  return { state: 'closed-now' };
}

/** Texto corto del estado de hoy, p. ej. «Abierto ahora · hasta las 14:00». */
export function todayStatusLabel(s: OpenStatus) {
  switch (s.state) {
    case 'open': return `Abierto ahora · hasta las ${s.until}`;
    case 'opens-later': return `Cerrado ahora · abrimos a las ${s.at}`;
    case 'closed-now': return 'Cerrado ahora · hoy ya hemos terminado';
    default: return 'Hoy cerrado';
  }
}
