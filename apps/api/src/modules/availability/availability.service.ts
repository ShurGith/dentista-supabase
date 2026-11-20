import { config, supabaseAdmin } from '../../config/index.js';

export interface Slot {
  start_time: string;
  end_time: string;
  time_label: string; // "10:00"
  professional_id: string;
  professional_name: string;
  operatory_id: string;
}

export class AvailabilityService {
  /**
   * Calcula los intervalos de tiempo disponibles para una cita respetando:
   * 1. Horario de la clínica (y si está cerrada ese día de la semana)
   * 2. Horario del profesional o profesionales cualificados
   * 3. Descanso/almuerzo del profesional
   * 4. Citas ya existentes (evita solapamiento)
   * 5. Bloqueos de agenda y festivos (blocked_slots y professional_time_off)
   * 6. Margen de limpieza/buffer entre citas
   */
  async getAvailableSlots(params: {
    clinicId?: string;
    serviceId: string;
    professionalId?: string | null;
    date: string; // YYYY-MM-DD
    durationMinutes?: number;
  }): Promise<Slot[]> {
    const clinicId = params.clinicId || config.clinicId;
    const dateStr = params.date;
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay(); // 0=Domingo, 1=Lunes... 6=Sábado

    // 1. Obtener datos del servicio (para conocer la duración estándar si no viene dada)
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('id, duration_minutes, is_active')
      .eq('id', params.serviceId)
      .single();

    if (!service || !service.is_active) {
      return [];
    }

    const duration = params.durationMinutes || service.duration_minutes || 45;

    // 2. Obtener configuración de la clínica (buffer entre citas, antelación mínima)
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('buffer_between_appointments_minutes, min_notice_hours')
      .eq('clinic_id', clinicId)
      .single();

    const bufferMinutes = settings?.buffer_between_appointments_minutes || 10;
    const minNoticeHours = settings?.min_notice_hours || 2;
    const minBookingTime = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);

    // 3. Obtener horario general de la clínica para ese día de la semana
    const { data: clinicSchedule } = await supabaseAdmin
      .from('clinic_schedules')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (!clinicSchedule || clinicSchedule.is_closed) {
      return []; // La clínica está cerrada este día
    }

    // 4. Identificar profesionales elegibles
    let professionalIds: string[] = [];
    if (params.professionalId) {
      professionalIds = [params.professionalId];
    } else {
      // Buscar todos los profesionales activos que realizan este servicio
      const { data: profServices } = await supabaseAdmin
        .from('professional_services')
        .select('professional_id')
        .eq('service_id', params.serviceId);

      professionalIds = (profServices || []).map(p => p.professional_id);

      if (professionalIds.length === 0) {
        // Fallback: todos los profesionales activos
        const { data: allProfs } = await supabaseAdmin
          .from('professionals')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('is_active', true);
        professionalIds = (allProfs || []).map(p => p.id);
      }
    }

    if (professionalIds.length === 0) {
      return [];
    }

    // 5. Consultar información de los profesionales
    const { data: professionals } = await supabaseAdmin
      .from('professionals')
      .select('id, first_name, last_name, default_operatory_id')
      .in('id', professionalIds)
      .eq('is_active', true);

    if (!professionals || professionals.length === 0) {
      return [];
    }

    // Consultar horarios de estos profesionales para este día de la semana
    const { data: profSchedules } = await supabaseAdmin
      .from('professional_schedules')
      .select('*')
      .in('professional_id', professionalIds)
      .eq('day_of_week', dayOfWeek)
      .eq('is_working', true);

    // Consultar ausencias / vacaciones para esta fecha
    const { data: timeOffList } = await supabaseAdmin
      .from('professional_time_off')
      .select('professional_id')
      .in('professional_id', professionalIds)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    const absentProfIds = new Set((timeOffList || []).map(t => t.professional_id));

    // 6. Consultar citas ya existentes para ese día
    const dayStart = `${dateStr}T00:00:00Z`;
    const dayEnd = `${dateStr}T23:59:59Z`;

    const { data: existingAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id, professional_id, operatory_id, start_time, end_time')
      .eq('clinic_id', clinicId)
      .gte('start_time', dayStart)
      .lte('end_time', dayEnd)
      .not('status', 'in', '("cancelled_by_patient","cancelled_by_clinic")');

    // Consultar bloqueos de agenda para ese día
    const { data: blockedSlots } = await supabaseAdmin
      .from('blocked_slots')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`start_time.lte.${dayEnd},end_time.gte.${dayStart}`);

    // Consultar consultorios activos
    const { data: operatories } = await supabaseAdmin
      .from('operatories')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    const defaultOperatoryId = operatories?.[0]?.id || 'a1111111-1111-1111-1111-111111111111';

    // 7. Generar candidatos de tramos horarios
    const availableSlots: Slot[] = [];

    for (const prof of professionals) {
      if (absentProfIds.has(prof.id)) continue; // Médico ausente/vacaciones

      const pSched = profSchedules?.find(s => s.professional_id === prof.id);
      if (!pSched) continue; // No trabaja este día

      const operatoryId = prof.default_operatory_id || defaultOperatoryId;

      // Calcular rango laboral efectivo cruzando clínica y profesional
      const workStartStr = pSched.start_time > clinicSchedule.open_time ? pSched.start_time : clinicSchedule.open_time;
      const workEndStr = pSched.end_time < clinicSchedule.close_time ? pSched.end_time : clinicSchedule.close_time;

      const [startH, startM] = workStartStr.split(':').map(Number);
      const [endH, endM] = workEndStr.split(':').map(Number);

      let currentMinute = startH * 60 + startM;
      const endMinute = endH * 60 + endM;

      // Pausa de comida de la clínica o del profesional
      let breakStartM = -1;
      let breakEndM = -1;
      if (pSched.break_start && pSched.break_end) {
        const [bsh, bsm] = pSched.break_start.split(':').map(Number);
        const [beh, bem] = pSched.break_end.split(':').map(Number);
        breakStartM = bsh * 60 + bsm;
        breakEndM = beh * 60 + bem;
      } else if (clinicSchedule.lunch_start && clinicSchedule.lunch_end) {
        const [lsh, lsm] = clinicSchedule.lunch_start.split(':').map(Number);
        const [leh, lem] = clinicSchedule.lunch_end.split(':').map(Number);
        breakStartM = lsh * 60 + lsm;
        breakEndM = leh * 60 + lem;
      }

      // Intervalo de cuadrícula (cada 15 o 30 min)
      const slotStepMinutes = 15;

      while (currentMinute + duration <= endMinute) {
        const slotStartM = currentMinute;
        const slotEndM = currentMinute + duration;

        // Comprobar si choca con la pausa de descanso
        const overlapsBreak =
          breakStartM !== -1 &&
          ((slotStartM >= breakStartM && slotStartM < breakEndM) ||
            (slotEndM > breakStartM && slotEndM <= breakEndM) ||
            (slotStartM <= breakStartM && slotEndM >= breakEndM));

        if (!overlapsBreak) {
          const sh = String(Math.floor(slotStartM / 60)).padStart(2, '0');
          const sm = String(slotStartM % 60).padStart(2, '0');
          const eh = String(Math.floor(slotEndM / 60)).padStart(2, '0');
          const em = String(slotEndM % 60).padStart(2, '0');

          const slotStartIso = `${dateStr}T${sh}:${sm}:00+01:00`;
          const slotEndIso = `${dateStr}T${eh}:${em}:00+01:00`;
          const slotStartDate = new Date(slotStartIso);
          const slotEndDate = new Date(slotEndIso);

          // Verificar antelación mínima (no reservar en el pasado inmediato)
          if (slotStartDate >= minBookingTime) {
            // Verificar solapamiento con citas existentes
            const hasApptConflict = (existingAppointments || []).some(appt => {
              const apptStart = new Date(appt.start_time);
              const apptEnd = new Date(appt.end_time);

              // Añadir buffer a la cita existente para desinfección
              const apptEndWithBuffer = new Date(apptEnd.getTime() + bufferMinutes * 60000);

              const sameDoctor = appt.professional_id === prof.id;
              const sameRoom = appt.operatory_id === operatoryId;

              if (!sameDoctor && !sameRoom) return false;

              // Conflicto de rangos
              return slotStartDate < apptEndWithBuffer && slotEndDate > apptStart;
            });

            // Verificar bloqueos de agenda
            const hasBlockConflict = (blockedSlots || []).some(block => {
              const blockStart = new Date(block.start_time);
              const blockEnd = new Date(block.end_time);

              const affectsDoctor = !block.professional_id || block.professional_id === prof.id;
              const affectsRoom = !block.operatory_id || block.operatory_id === operatoryId;

              if (!affectsDoctor && !affectsRoom) return false;

              return slotStartDate < blockEnd && slotEndDate > blockStart;
            });

            if (!hasApptConflict && !hasBlockConflict) {
              availableSlots.push({
                start_time: slotStartIso,
                end_time: slotEndIso,
                time_label: `${sh}:${sm}`,
                professional_id: prof.id,
                professional_name: `${prof.first_name} ${prof.last_name}`,
                operatory_id: operatoryId,
              });
            }
          }
        }

        currentMinute += slotStepMinutes;
      }
    }

    // Ordenar cronológicamente y eliminar duplicados de misma hora si hay múltiples profesionales
    return availableSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
}

export const availabilityService = new AvailabilityService();

