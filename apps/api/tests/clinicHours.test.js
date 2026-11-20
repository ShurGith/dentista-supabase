import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppointmentTooFarInPast, outsideClinicHoursReason } from '../dist/modules/schedules/clinicHours.js';

const week = [
  { day_of_week: 0, open_time: '10:00:00', close_time: '14:00:00', lunch_start: null, lunch_end: null, is_closed: true },
  ...[1, 2, 3, 4, 5].map(d => ({ day_of_week: d, open_time: '09:00:00', close_time: '20:00:00', lunch_start: '14:00:00', lunch_end: '16:00:00', is_closed: false })),
  { day_of_week: 6, open_time: '09:00:00', close_time: '14:00:00', lunch_start: null, lunch_end: null, is_closed: false },
];
const tz = 'Europe/Madrid';
// 2026-11-23 es lunes; Madrid = UTC+1 en noviembre.
const at = (iso) => new Date(iso);

test('accepts appointments inside opening hours', () => {
  assert.equal(outsideClinicHoursReason(at('2026-11-23T09:00:00+01:00'), at('2026-11-23T09:30:00+01:00'), week, tz), null);
  assert.equal(outsideClinicHoursReason(at('2026-11-23T13:30:00+01:00'), at('2026-11-23T14:00:00+01:00'), week, tz), null);
  assert.equal(outsideClinicHoursReason(at('2026-11-23T16:00:00+01:00'), at('2026-11-23T20:00:00+01:00'), week, tz), null);
});

test('rejects closed days, lunch break and out-of-hours', () => {
  assert.match(outsideClinicHoursReason(at('2026-11-22T11:00:00+01:00'), at('2026-11-22T11:30:00+01:00'), week, tz), /no abre los domingos/);
  assert.match(outsideClinicHoursReason(at('2026-11-23T13:45:00+01:00'), at('2026-11-23T14:15:00+01:00'), week, tz), /fuera del horario/);
  assert.match(outsideClinicHoursReason(at('2026-11-23T08:30:00+01:00'), at('2026-11-23T09:00:00+01:00'), week, tz), /fuera del horario/);
  assert.match(outsideClinicHoursReason(at('2026-11-28T13:45:00+01:00'), at('2026-11-28T14:15:00+01:00'), week, tz), /sábado/);
  assert.match(outsideClinicHoursReason(at('2026-11-25T19:00:00+01:00'), at('2026-11-25T18:00:00+01:00'), week, tz), /posterior/);
});

test('rejects appointments more than three hours in the past', () => {
  const now = at('2026-11-20T12:00:00+01:00');
  assert.equal(isAppointmentTooFarInPast(at('2026-11-20T09:00:00+01:00'), now), false);
  assert.equal(isAppointmentTooFarInPast(at('2026-11-20T08:59:59+01:00'), now), true);
});
