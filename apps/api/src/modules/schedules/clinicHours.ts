import { config, supabaseAdmin } from '../../config/index.js';
import { DAY_NAMES_ES } from '@clinica-eugenia/shared';

/** Día de la semana (0 = domingo), fecha local y minuto del día en la zona horaria de la clínica. */
export function clinicLocal(date: Date, timeZone = config.wawp.appTimezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const toMin = (t?: string | null) => {
  if (!t) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export interface ClinicDayRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  is_closed: boolean;
}

/** Tramos de trabajo del día en minutos: [[apertura, inicio pausa], [fin pausa, cierre]] o [[apertura, cierre]]. */
export function workingRanges(row: ClinicDayRow | undefined): [number, number][] {
  if (!row || row.is_closed) return [];
  const open = toMin(row.open_time), close = toMin(row.close_time);
  const ls = toMin(row.lunch_start), le = toMin(row.lunch_end);
  if (!Number.isNaN(ls) && !Number.isNaN(le) && open < ls && ls < le && le < close) return [[open, ls], [le, close]];
  return [[open, close]];
}

/** Motivo por el que [start, end) queda fuera del horario, o null si está dentro. Función pura (testeable). */
export function outsideClinicHoursReason(start: Date, end: Date, rows: ClinicDayRow[], timeZone = config.wawp.appTimezone): string | null {
  if (!(end > start)) return 'La hora de fin debe ser posterior a la de inicio.';
  const s = clinicLocal(start, timeZone);
  const e = clinicLocal(end, timeZone);
  const row = rows.find(r => r.day_of_week === s.day);
  const dayName = DAY_NAMES_ES[s.day] || 'ese día';
  const ranges = workingRanges(row);
  const plural = dayName.toLowerCase().endsWith('s') ? dayName.toLowerCase() : `${dayName.toLowerCase()}s`;
  if (!ranges.length) return `La clínica no abre los ${plural}: no se pueden poner citas ese día.`;
  // Una cita que acaba justo a medianoche cuenta como fin del mismo día.
  const endMinutes = e.dateKey === s.dateKey ? e.minutes : (e.minutes === 0 ? 24 * 60 : NaN);
  const fits = !Number.isNaN(endMinutes) && ranges.some(([from, to]) => s.minutes >= from && endMinutes <= to);
  if (fits) return null;
  const hours = row!.lunch_start && row!.lunch_end
    ? `${hhmm(row!.open_time)}–${hhmm(row!.lunch_start)} y ${hhmm(row!.lunch_end)}–${hhmm(row!.close_time)}`
    : `${hhmm(row!.open_time)}–${hhmm(row!.close_time)}`;
  return `La cita queda fuera del horario de apertura del ${dayName.toLowerCase()} (${hours}).`;
}

export function isAppointmentTooFarInPast(start: Date, now = new Date()) {
  return start.getTime() < now.getTime() - 3 * 60 * 60 * 1000;
}

/** Lanza un error 422 si la cita no cae dentro del horario de apertura de la clínica (tabla clinic_schedules). */
export async function assertWithinClinicHours(startIso: string | Date, endIso: string | Date, clinicId = config.clinicId) {
  if (Number.isNaN(new Date(startIso).getTime()) || Number.isNaN(new Date(endIso).getTime())) {
    throw Object.assign(new Error('La fecha u hora de la cita no es válida.'), { status: 400, code: 'INVALID_DATE' });
  }
  const { data, error } = await supabaseAdmin
    .from('clinic_schedules')
    .select('day_of_week, open_time, close_time, lunch_start, lunch_end, is_closed')
    .eq('clinic_id', clinicId);
  if (error) throw error;
  const reason = outsideClinicHoursReason(new Date(startIso), new Date(endIso), (data || []) as ClinicDayRow[]);
  if (reason) throw Object.assign(new Error(reason), { status: 422, code: 'OUTSIDE_CLINIC_HOURS' });
}
