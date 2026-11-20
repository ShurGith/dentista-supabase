import React from 'react';
import { CalendarClock, Copy } from 'lucide-react';

export interface ClinicDayHours {
  day_of_week: number; // 0 = domingo … 6 = sábado
  is_closed: boolean;
  open_time: string; // HH:MM
  close_time: string;
  has_break: boolean;
  lunch_start: string;
  lunch_end: string;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

/** Convierte las filas de clinic_schedules en el estado del editor (rellena días que falten como cerrados). */
export function toEditorWeek(rows: any[] | null | undefined): ClinicDayHours[] {
  return WEEK_ORDER.map(day => {
    const r = (rows || []).find(x => x.day_of_week === day);
    return {
      day_of_week: day,
      is_closed: r ? !!r.is_closed : true,
      open_time: hhmm(r?.open_time) || '09:00',
      close_time: hhmm(r?.close_time) || '14:00',
      has_break: !!(r?.lunch_start && r?.lunch_end),
      lunch_start: hhmm(r?.lunch_start) || '14:00',
      lunch_end: hhmm(r?.lunch_end) || '16:00',
    };
  });
}

/** Formato que espera PUT /schedules/clinic. */
export function toApiWeek(week: ClinicDayHours[]) {
  return week.map(d => {
    // Un día cerrado conserva sus horas para cuando se reabra, pero la tabla exige apertura < cierre.
    const keepTimes = d.open_time && d.close_time && d.open_time < d.close_time;
    const open_time = d.is_closed && !keepTimes ? '09:00' : d.open_time;
    const close_time = d.is_closed && !keepTimes ? '14:00' : d.close_time;
    const withBreak = !d.is_closed && d.has_break;
    return {
      day_of_week: d.day_of_week,
      is_closed: d.is_closed,
      open_time,
      close_time,
      lunch_start: withBreak ? d.lunch_start : null,
      lunch_end: withBreak ? d.lunch_end : null,
    };
  });
}

/** Errores por día; vacío si el horario es válido. Mismas reglas que valida la API. */
export function validateWeek(week: ClinicDayHours[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const d of week) {
    if (d.is_closed) continue;
    if (!d.open_time || !d.close_time) errors[d.day_of_week] = 'Indica la hora de apertura y la de cierre.';
    else if (d.open_time >= d.close_time) errors[d.day_of_week] = 'La apertura debe ser anterior al cierre.';
    else if (d.has_break) {
      if (!d.lunch_start || !d.lunch_end) errors[d.day_of_week] = 'Indica el inicio y el fin de la pausa.';
      else if (!(d.open_time < d.lunch_start && d.lunch_start < d.lunch_end && d.lunch_end < d.close_time)) {
        errors[d.day_of_week] = 'La pausa debe empezar y terminar dentro del horario.';
      }
    }
  }
  return errors;
}

interface Props {
  week: ClinicDayHours[];
  errors: Record<number, string>;
  onChange: (week: ClinicDayHours[]) => void;
  /** Contenido al pie de la tarjeta, alineado a la derecha (p. ej. el botón de guardar). */
  footer?: React.ReactNode;
}

const timeInput =
  'w-[5.5rem] p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 tabular-nums ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400';

export const ClinicHoursEditor: React.FC<Props> = ({ week, errors, onChange, footer }) => {
  const update = (day: number, patch: Partial<ClinicDayHours>) =>
    onChange(week.map(d => (d.day_of_week === day ? { ...d, ...patch } : d)));

  const copyMondayToWeekdays = () => {
    const monday = week.find(d => d.day_of_week === 1);
    if (!monday) return;
    onChange(week.map(d => (d.day_of_week >= 2 && d.day_of_week <= 5 ? { ...monday, day_of_week: d.day_of_week } : d)));
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-brand-600" /> Horario de Apertura
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Es el horario que ven los pacientes en la web y el que usa la agenda para ofrecer huecos de reserva.
            Los festivos y cierres puntuales se añaden en «Horarios y Bloqueos».
          </p>
        </div>
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          <Copy className="w-3.5 h-3.5" /> Copiar lunes a martes–viernes
        </button>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {week.map(d => {
          const error = errors[d.day_of_week];
          const open = !d.is_closed;
          const id = `day-${d.day_of_week}`;
          return (
            <div key={d.day_of_week} className="py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
                <span className="w-24 font-bold text-slate-900">{DAY_LABEL[d.day_of_week]}</span>

                <label className="flex items-center gap-2 cursor-pointer select-none w-28">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={open}
                    aria-label={`${DAY_LABEL[d.day_of_week]}: ${open ? 'abierto' : 'cerrado'}`}
                    onClick={() => update(d.day_of_week, { is_closed: open })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${open ? 'bg-brand-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${open ? 'translate-x-4' : ''}`} />
                  </button>
                  <span className={`font-bold ${open ? 'text-brand-700' : 'text-slate-400'}`}>{open ? 'Abierto' : 'Cerrado'}</span>
                </label>

                {open ? (
                  <>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`${id}-open`} className="sr-only">Apertura</label>
                      <input id={`${id}-open`} type="time" step={900} value={d.open_time}
                        onChange={e => update(d.day_of_week, { open_time: e.target.value })} className={timeInput} />
                      <span className="text-slate-400" aria-hidden="true">–</span>
                      <label htmlFor={`${id}-close`} className="sr-only">Cierre</label>
                      <input id={`${id}-close`} type="time" step={900} value={d.close_time}
                        onChange={e => update(d.day_of_week, { close_time: e.target.value })} className={timeInput} />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
                        <input type="checkbox" checked={d.has_break}
                          onChange={e => update(d.day_of_week, { has_break: e.target.checked })}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                        Pausa
                      </label>
                      {d.has_break && (
                        <>
                          <label htmlFor={`${id}-ls`} className="sr-only">Inicio de la pausa</label>
                          <input id={`${id}-ls`} type="time" step={900} value={d.lunch_start}
                            onChange={e => update(d.day_of_week, { lunch_start: e.target.value })} className={timeInput} />
                          <span className="text-slate-400" aria-hidden="true">–</span>
                          <label htmlFor={`${id}-le`} className="sr-only">Fin de la pausa</label>
                          <input id={`${id}-le`} type="time" step={900} value={d.lunch_end}
                            onChange={e => update(d.day_of_week, { lunch_end: e.target.value })} className={timeInput} />
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400 font-semibold">Sin citas este día</span>
                )}
              </div>
              {error && <p className="mt-2 text-[11px] font-bold text-red-600" role="alert">{error}</p>}
            </div>
          );
        })}
      </div>

      {footer && <div className="flex justify-end pt-4 border-t border-slate-100">{footer}</div>}
    </div>
  );
};
