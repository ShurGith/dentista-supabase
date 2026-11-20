import { Router } from 'express';
import { supabaseAdmin, config } from '../../config/index.js';
import { DAY_NAMES_ES } from '@clinica-eugenia/shared';
import { z } from 'zod';
const router = Router();
// GET /api/v1/schedules/public - Horario público activo para la landing web y pacientes
router.get('/public', async (req, res, next) => {
    try {
        const clinicId = req.query.clinicId || config.clinicId;
        // 1. Obtener horario semanal de la clínica
        const { data: clinicSchedules, error: schedErr } = await supabaseAdmin
            .from('clinic_schedules')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('day_of_week', { ascending: true });
        if (schedErr)
            throw schedErr;
        // Formatear en orden amigable (Lunes a Domingo)
        const formattedSchedule = [1, 2, 3, 4, 5, 6, 0].map(dayNum => {
            const entry = (clinicSchedules || []).find(s => s.day_of_week === dayNum);
            const dayName = DAY_NAMES_ES[dayNum];
            if (!entry || entry.is_closed) {
                return {
                    day_of_week: dayNum,
                    day_name: dayName,
                    is_closed: true,
                    label: 'Cerrado',
                };
            }
            let label = `${entry.open_time.slice(0, 5)} - ${entry.close_time.slice(0, 5)}`;
            if (entry.lunch_start && entry.lunch_end) {
                label = `${entry.open_time.slice(0, 5)} - ${entry.lunch_start.slice(0, 5)} y ${entry.lunch_end.slice(0, 5)} - ${entry.close_time.slice(0, 5)}`;
            }
            return {
                day_of_week: dayNum,
                day_name: dayName,
                is_closed: false,
                open_time: entry.open_time,
                close_time: entry.close_time,
                lunch_start: entry.lunch_start,
                lunch_end: entry.lunch_end,
                label,
            };
        });
        // 2. Próximos festivos o cierres excepcionales en los próximos 30 días
        const nowIso = new Date().toISOString();
        const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: holidays } = await supabaseAdmin
            .from('blocked_slots')
            .select('id, start_time, end_time, reason')
            .eq('clinic_id', clinicId)
            .is('professional_id', null)
            .is('operatory_id', null)
            .gte('end_time', nowIso)
            .lte('start_time', futureIso)
            .order('start_time', { ascending: true });
        // 3. Información de contacto y urgencias
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('phone, emergency_phone, email, address, postal_code, city')
            .eq('id', clinicId)
            .single();
        res.json({
            success: true,
            data: {
                weekly_schedule: formattedSchedule,
                upcoming_holidays: holidays || [],
                emergency_hours: 'Atención de urgencias disponible durante el horario de apertura y guardia telefónica.',
                contact: clinic,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/schedules/all - Panel CRM: obtener horarios completos (clínica, profesionales, consultorios)
router.get('/all', async (req, res, next) => {
    try {
        const clinicId = config.clinicId;
        const [{ data: clinicSchedules }, { data: profSchedules }, { data: blockedSlots }, { data: timeOff },] = await Promise.all([
            supabaseAdmin.from('clinic_schedules').select('*').eq('clinic_id', clinicId),
            supabaseAdmin.from('professional_schedules').select('*, professional:professionals(first_name, last_name, color)'),
            supabaseAdmin.from('blocked_slots').select('*').eq('clinic_id', clinicId).order('start_time', { ascending: false }).limit(50),
            supabaseAdmin.from('professional_time_off').select('*, professional:professionals(first_name, last_name)').order('start_date', { ascending: false }),
        ]);
        res.json({
            success: true,
            data: {
                clinic_schedules: clinicSchedules,
                professional_schedules: profSchedules,
                blocked_slots: blockedSlots,
                time_off: timeOff,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Horario semanal: 7 días (0 = domingo … 6 = sábado), horas "HH:MM" y pausa opcional dentro del horario.
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora no válida (HH:MM).').transform(t => t.slice(0, 5));
const optionalTime = z.union([timeSchema, z.literal(''), z.null()]).optional().transform(t => t || null);
const dayScheduleSchema = z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: timeSchema,
    close_time: timeSchema,
    lunch_start: optionalTime,
    lunch_end: optionalTime,
}).superRefine((d, ctx) => {
    const day = DAY_NAMES_ES[d.day_of_week];
    // La tabla exige apertura < cierre también en días cerrados (se conservan las horas para cuando se reabra).
    if (d.open_time >= d.close_time) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${day}: la apertura debe ser anterior al cierre.` });
    }
    if (!!d.lunch_start !== !!d.lunch_end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${day}: indica el inicio y el fin de la pausa, o ninguno.` });
    }
    else if (d.lunch_start && d.lunch_end && !d.is_closed
        && !(d.open_time < d.lunch_start && d.lunch_start < d.lunch_end && d.lunch_end < d.close_time)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${day}: la pausa debe empezar y terminar dentro del horario de apertura.` });
    }
});
const weekScheduleSchema = z.array(dayScheduleSchema).length(7, 'Hay que enviar los 7 días de la semana.')
    .refine(days => new Set(days.map(d => d.day_of_week)).size === 7, 'Cada día de la semana debe aparecer una sola vez.');
// PUT /api/v1/schedules/clinic - Actualizar horario semanal de la clínica (fuente única para web, disponibilidad y app)
router.put('/clinic', async (req, res, next) => {
    try {
        const parsed = weekScheduleSchema.safeParse(req.body?.schedules);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_SCHEDULE',
                message: parsed.error.issues.map(i => i.message).join(' '),
            });
        }
        const rows = parsed.data.map(d => ({
            clinic_id: config.clinicId,
            day_of_week: d.day_of_week,
            open_time: d.open_time,
            close_time: d.close_time,
            lunch_start: d.lunch_start,
            lunch_end: d.lunch_end,
            is_closed: d.is_closed,
            updated_at: new Date().toISOString(),
        }));
        const { data, error } = await supabaseAdmin
            .from('clinic_schedules')
            .upsert(rows, { onConflict: 'clinic_id,day_of_week' })
            .select('day_of_week, open_time, close_time, lunch_start, lunch_end, is_closed')
            .order('day_of_week', { ascending: true });
        if (error)
            throw error;
        res.json({ success: true, message: 'Horario de la clínica actualizado correctamente.', data });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/schedules/blocked-slots - Crear excepción / bloqueo de agenda
router.post('/blocked-slots', async (req, res, next) => {
    try {
        const { operatory_id, professional_id, start_time, end_time, reason, is_all_day } = req.body;
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({
                success: false,
                message: 'La fecha/hora de inicio debe ser anterior a la de fin.',
            });
        }
        const { data, error } = await supabaseAdmin
            .from('blocked_slots')
            .insert({
            clinic_id: config.clinicId,
            operatory_id: operatory_id || null,
            professional_id: professional_id || null,
            start_time,
            end_time,
            reason: reason || 'Bloqueo de agenda',
            is_all_day: !!is_all_day,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/schedules/blocked-slots/:id - Eliminar bloqueo
router.delete('/blocked-slots/:id', async (req, res, next) => {
    try {
        const { error } = await supabaseAdmin
            .from('blocked_slots')
            .delete()
            .eq('id', req.params.id);
        if (error)
            throw error;
        res.json({ success: true, message: 'Bloqueo eliminado con éxito.' });
    }
    catch (err) {
        next(err);
    }
});
export const schedulesRouter = router;
