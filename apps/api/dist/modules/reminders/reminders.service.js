import { config, supabaseAdmin } from '../../config/index.js';
import { whatsappProvider } from '../whatsapp/whatsapp.provider.js';
export class RemindersService {
    /**
     * Ejecuta la revisión periódica de citas próximas y envía los recordatorios
     * correspondientes a través de Wawp, evitando envíos duplicados.
     */
    async runDueReminders() {
        const results = {
            reminders_24h_sent: 0,
            reminders_2h_sent: 0,
            errors: [],
        };
        try {
            const { data: settings } = await supabaseAdmin
                .from('settings')
                .select('*')
                .eq('clinic_id', config.clinicId)
                .single();
            if (!settings?.wawp_enabled) {
                console.log('[Reminders] Wawp desactivado en ajustes. Omitiendo recordatorios.');
                return results;
            }
            const now = new Date();
            // 1. Recordatorios de 24 horas antes (ventana entre 23h y 25h futuras)
            if (settings.reminder_24h_enabled) {
                const winStart24h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
                const winEnd24h = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
                const { data: appts24h } = await supabaseAdmin
                    .from('appointments')
                    .select(`
            id, start_time,
            patient:patients (first_name, last_name, phone),
            professional:professionals (first_name, last_name),
            service:services (name)
          `)
                    .eq('clinic_id', config.clinicId)
                    .gte('start_time', winStart24h)
                    .lte('start_time', winEnd24h)
                    .in('status', ['pending', 'confirmed']);
                for (const appt of appts24h || []) {
                    // Comprobar si ya se envió el recordatorio de 24h
                    const { data: existing } = await supabaseAdmin
                        .from('appointment_reminders')
                        .select('id')
                        .eq('appointment_id', appt.id)
                        .eq('reminder_type', '24h_before')
                        .maybeSingle();
                    if (!existing && appt?.patient?.phone) {
                        const apptDate = new Date(appt.start_time);
                        const dateStr = apptDate.toLocaleDateString('es-ES', { timeZone: config.wawp.appTimezone, weekday: 'long', day: 'numeric', month: 'long' });
                        const timeStr = apptDate.toLocaleTimeString('es-ES', { timeZone: config.wawp.appTimezone, hour: '2-digit', minute: '2-digit' });
                        const res = await whatsappProvider.sendTemplate(appt.patient.phone, 'recordatorio_24h', {
                            nombre: appt.patient.first_name,
                            fecha: dateStr,
                            hora: timeStr,
                            profesional: `${appt.professional.first_name} ${appt.professional.last_name}`,
                            servicio: appt.service.name,
                            enlace_confirmar: `${config.supabase.url}/reserva/confirmar/${appt.id}`,
                        }, appt.id);
                        await supabaseAdmin.from('appointment_reminders').insert({
                            appointment_id: appt.id,
                            reminder_type: '24h_before',
                            scheduled_for: now.toISOString(),
                            sent_at: res.success ? now.toISOString() : null,
                            status: res.success ? 'sent' : 'failed',
                            wawp_message_id: res.messageId,
                            error_message: res.error,
                        });
                        if (res.success)
                            results.reminders_24h_sent++;
                    }
                }
            }
            // 2. Recordatorios de 2 horas antes (ventana entre 1h 45m y 2h 15m)
            if (settings.reminder_2h_enabled) {
                const winStart2h = new Date(now.getTime() + 105 * 60 * 1000).toISOString();
                const winEnd2h = new Date(now.getTime() + 135 * 60 * 1000).toISOString();
                const { data: appts2h } = await supabaseAdmin
                    .from('appointments')
                    .select(`
            id, start_time,
            patient:patients (first_name, last_name, phone)
          `)
                    .eq('clinic_id', config.clinicId)
                    .gte('start_time', winStart2h)
                    .lte('start_time', winEnd2h)
                    .in('status', ['confirmed', 'pending']);
                for (const appt of appts2h || []) {
                    const { data: existing } = await supabaseAdmin
                        .from('appointment_reminders')
                        .select('id')
                        .eq('appointment_id', appt.id)
                        .eq('reminder_type', '2h_before')
                        .maybeSingle();
                    if (!existing && appt?.patient?.phone) {
                        const timeStr = new Date(appt.start_time).toLocaleTimeString('es-ES', { timeZone: config.wawp.appTimezone, hour: '2-digit', minute: '2-digit' });
                        const res = await whatsappProvider.sendTemplate(appt.patient.phone, 'recordatorio_2h', {
                            nombre: appt.patient.first_name,
                            hora: timeStr,
                        }, appt.id);
                        await supabaseAdmin.from('appointment_reminders').insert({
                            appointment_id: appt.id,
                            reminder_type: '2h_before',
                            scheduled_for: now.toISOString(),
                            sent_at: res.success ? now.toISOString() : null,
                            status: res.success ? 'sent' : 'failed',
                            wawp_message_id: res.messageId,
                            error_message: res.error,
                        });
                        if (res.success)
                            results.reminders_2h_sent++;
                    }
                }
            }
        }
        catch (err) {
            console.error('[Reminders Job Error]', err);
            results.errors.push(err.message);
        }
        return results;
    }
}
export const remindersService = new RemindersService();
