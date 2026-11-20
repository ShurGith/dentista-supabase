import { config, supabaseAdmin } from '../../config/index.js';
import { whatsappProvider } from '../whatsapp/whatsapp.provider.js';
import { assertWithinClinicHours, isAppointmentTooFarInPast } from '../schedules/clinicHours.js';
function assertAppointmentNotTooFarInPast(start) {
    if (isAppointmentTooFarInPast(start)) {
        throw Object.assign(new Error('No se pueden programar citas anteriores a hace tres horas.'), { status: 422, code: 'APPOINTMENT_IN_PAST' });
    }
}
export class AppointmentsService {
    /**
     * Obtiene la lista de citas filtradas por rango de fechas, odontólogo, consultorio o estado
     */
    async listAppointments(filters) {
        const clinicId = filters.clinicId || config.clinicId;
        let query = supabaseAdmin
            .from('appointments')
            .select(`
        *,
        patient:patients (id, first_name, last_name, phone, email, dni_nie),
        professional:professionals (id, first_name, last_name, specialty, color),
        service:services (id, name, duration_minutes, color, category),
        operatory:operatories (id, name, color)
      `)
            .eq('clinic_id', clinicId)
            .order('start_time', { ascending: true });
        if (filters.startDate)
            query = query.gte('start_time', filters.startDate);
        if (filters.endDate)
            query = query.lte('end_time', filters.endDate);
        if (filters.professionalId)
            query = query.eq('professional_id', filters.professionalId);
        if (filters.operatoryId)
            query = query.eq('operatory_id', filters.operatoryId);
        if (filters.status)
            query = query.eq('status', filters.status);
        if (filters.patientId)
            query = query.eq('patient_id', filters.patientId);
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Obtiene el detalle de una cita por su ID
     */
    async getAppointmentById(id) {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
        *,
        patient:patients (*),
        professional:professionals (*),
        service:services (*),
        operatory:operatories (*),
        history:appointment_status_history (*)
      `)
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Crea una nueva cita, validando solapamientos con la base de datos
     * y despachando confirmación por WhatsApp mediante Wawp
     */
    async createAppointment(input) {
        const clinicId = input.clinicId || config.clinicId;
        // 1. Obtener duración del servicio si no se proporciona
        let duration = input.durationMinutes;
        if (!duration) {
            const { data: srv } = await supabaseAdmin
                .from('services')
                .select('duration_minutes')
                .eq('id', input.serviceId)
                .single();
            duration = srv?.duration_minutes || 45;
        }
        // Calcular fin si no viene dado
        const actualDuration = duration || 45;
        const startDate = new Date(input.startTime);
        const endDate = input.endTime
            ? new Date(input.endTime)
            : new Date(startDate.getTime() + actualDuration * 60000);
        assertAppointmentNotTooFarInPast(startDate);
        // Solo dentro del horario de apertura configurado (clinic_schedules)
        await assertWithinClinicHours(startDate, endDate, clinicId);
        // 2. Si no se especificó gabinete, usar el default del profesional
        let operatoryId = input.operatoryId;
        if (!operatoryId) {
            const { data: prof } = await supabaseAdmin
                .from('professionals')
                .select('default_operatory_id')
                .eq('id', input.professionalId)
                .single();
            operatoryId = prof?.default_operatory_id;
            if (!operatoryId) {
                const { data: op } = await supabaseAdmin
                    .from('operatories')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .limit(1)
                    .single();
                operatoryId = op?.id;
            }
        }
        // 3. Insertar la cita (el trigger de PostgreSQL `check_appointment_overlap` validará solapamientos)
        const { data: appt, error } = await supabaseAdmin
            .from('appointments')
            .insert({
            clinic_id: clinicId,
            patient_id: input.patientId,
            professional_id: input.professionalId,
            operatory_id: operatoryId,
            service_id: input.serviceId,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            duration_minutes: duration,
            status: input.status || 'pending',
            patient_notes: input.patientNotes,
            clinical_notes: input.clinicalNotes,
            created_by: input.createdBy,
        })
            .select(`
        *,
        patient:patients (first_name, last_name, phone),
        professional:professionals (first_name, last_name),
        service:services (name)
      `)
            .single();
        if (error)
            throw error;
        // 4. Enviar notificación por WhatsApp con Wawp
        if (appt?.patient?.phone) {
            const dateFormatted = startDate.toLocaleDateString('es-ES', {
                timeZone: config.wawp.appTimezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const timeFormatted = startDate.toLocaleTimeString('es-ES', {
                timeZone: config.wawp.appTimezone,
                hour: '2-digit',
                minute: '2-digit',
            });
            await whatsappProvider.sendTemplate(appt.patient.phone, 'cita_confirmada', {
                nombre: appt.patient.first_name,
                fecha: dateFormatted,
                hora: timeFormatted,
                profesional: `${appt.professional.first_name} ${appt.professional.last_name}`,
                servicio: appt.service.name,
                enlace_gestion: `${config.supabase.url}/reserva/gestion/${appt.id}`,
            }, appt.id);
        }
        return appt;
    }
    /**
     * Mueve una cita (arrastrar y soltar en FullCalendar eventDrop)
     */
    async moveAppointment(params) {
        assertAppointmentNotTooFarInPast(new Date(params.startTime));
        await assertWithinClinicHours(params.startTime, params.endTime);
        const updatePayload = {
            start_time: params.startTime,
            end_time: params.endTime,
            reschedule_reason: params.reason || 'Modificado desde el calendario visual',
            updated_by: params.updatedBy,
        };
        if (params.professionalId)
            updatePayload.professional_id = params.professionalId;
        if (params.operatoryId)
            updatePayload.operatory_id = params.operatoryId;
        const { data: updated, error } = await supabaseAdmin
            .from('appointments')
            .update(updatePayload)
            .eq('id', params.appointmentId)
            .select(`
        *,
        patient:patients (first_name, last_name, phone),
        professional:professionals (first_name, last_name),
        service:services (name)
      `)
            .single();
        if (error)
            throw error;
        // Notificar reprogramación por WhatsApp
        if (params.notifyWhatsApp !== false && updated?.patient?.phone) {
            const newStartDate = new Date(params.startTime);
            const dateFormatted = newStartDate.toLocaleDateString('es-ES', {
                timeZone: config.wawp.appTimezone,
                day: 'numeric',
                month: 'long',
            });
            const timeFormatted = newStartDate.toLocaleTimeString('es-ES', {
                timeZone: config.wawp.appTimezone,
                hour: '2-digit',
                minute: '2-digit',
            });
            await whatsappProvider.sendTemplate(updated.patient.phone, 'cita_reprogramada', {
                nombre: updated.patient.first_name,
                fecha: dateFormatted,
                hora: timeFormatted,
                profesional: `${updated.professional.first_name} ${updated.professional.last_name}`,
            }, updated.id);
        }
        return updated;
    }
    /**
     * Redimensiona una cita (cambio de duración en FullCalendar eventResize)
     */
    async resizeAppointment(params) {
        await assertWithinClinicHours(params.startTime, params.endTime);
        const { data: updated, error } = await supabaseAdmin
            .from('appointments')
            .update({
            start_time: params.startTime,
            end_time: params.endTime,
            duration_minutes: params.durationMinutes,
            updated_by: params.updatedBy,
        })
            .eq('id', params.appointmentId)
            .select()
            .single();
        if (error)
            throw error;
        return updated;
    }
    /**
     * Cambia el estado de una cita (confirmada, en sala de espera, completada, cancelada, etc.)
     */
    async updateStatus(appointmentId, newStatus, reason, notifyWhatsApp = true) {
        const updatePayload = { status: newStatus };
        if (newStatus === 'cancelled_by_clinic' || newStatus === 'cancelled_by_patient') {
            updatePayload.cancellation_reason = reason || 'Cancelada';
        }
        const { data: updated, error } = await supabaseAdmin
            .from('appointments')
            .update(updatePayload)
            .eq('id', appointmentId)
            .select(`
        *,
        patient:patients (first_name, last_name, phone),
        professional:professionals (first_name, last_name),
        service:services (name)
      `)
            .single();
        if (error)
            throw error;
        // Si fue cancelada y se solicita notificación
        if (notifyWhatsApp && updated?.patient?.phone && (newStatus === 'cancelled_by_clinic' || newStatus === 'cancelled_by_patient')) {
            const apptDate = new Date(updated.start_time);
            await whatsappProvider.sendTemplate(updated.patient.phone, 'cita_cancelada', {
                nombre: updated.patient.first_name,
                fecha: apptDate.toLocaleDateString('es-ES', { timeZone: config.wawp.appTimezone, day: 'numeric', month: 'long' }),
                hora: apptDate.toLocaleTimeString('es-ES', { timeZone: config.wawp.appTimezone, hour: '2-digit', minute: '2-digit' }),
            }, updated.id);
        }
        return updated;
    }
    /**
     * Elimina una cita (recordatorios e historial de estados se borran en cascada; el trigger
     * audit_appointments de la migración security_hardening registra el borrado cuando esa
     * migración está aplicada). Si notifyWhatsApp, avisa al paciente con la
     * plantilla `cita_cancelada` solo después de borrar con éxito. El envío respeta MODO_DEV.
     */
    async deleteAppointment(appointmentId, notifyWhatsApp) {
        const { data: appt, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('id, start_time, patient:patients (first_name, phone)')
            .eq('id', appointmentId)
            .eq('clinic_id', config.clinicId)
            .maybeSingle();
        if (fetchError)
            throw fetchError;
        if (!appt)
            return null;
        const { error: deleteError } = await supabaseAdmin
            .from('appointments')
            .delete()
            .eq('id', appointmentId)
            .eq('clinic_id', config.clinicId);
        if (deleteError)
            throw deleteError;
        const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
        let whatsapp = { requested: notifyWhatsApp, sent: false };
        if (notifyWhatsApp) {
            if (!patient?.phone) {
                whatsapp.error = 'El paciente no tiene teléfono registrado.';
            }
            else {
                const apptDate = new Date(appt.start_time);
                // Sin appointmentId: la cita ya no existe y el registro del mensaje no puede apuntar a ella.
                const res = await whatsappProvider.sendTemplate(patient.phone, 'cita_cancelada', {
                    nombre: patient.first_name,
                    fecha: apptDate.toLocaleDateString('es-ES', { timeZone: config.wawp.appTimezone, day: 'numeric', month: 'long' }),
                    hora: apptDate.toLocaleTimeString('es-ES', { timeZone: config.wawp.appTimezone, hour: '2-digit', minute: '2-digit' }),
                });
                whatsapp = { requested: true, sent: res.success, error: res.success ? undefined : res.error };
            }
        }
        return { id: appointmentId, whatsapp };
    }
}
export const appointmentsService = new AppointmentsService();
