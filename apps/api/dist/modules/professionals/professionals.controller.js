import { Router } from 'express';
import { supabaseAdmin, config } from '../../config/index.js';
const router = Router();
// GET /api/v1/professionals - Listado de odontólogos y especialistas
router.get('/', async (req, res, next) => {
    try {
        const { serviceId } = req.query;
        let query = supabaseAdmin
            .from('professionals')
            .select(`
        id, first_name, last_name, collegiated_number, specialty,
        biography, languages, color, photo_url, default_operatory_id, sort_order,
        services:professional_services (service:services(id, name, slug))
      `)
            .eq('clinic_id', config.clinicId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        const { data, error } = await query;
        if (error)
            throw error;
        let list = data || [];
        if (serviceId) {
            list = list.filter((p) => p.services?.some((s) => s.service?.id === serviceId));
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/professionals/:id - Perfil detallado con horario
router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('professionals')
            .select(`
        *,
        schedules:professional_schedules (*),
        services:professional_services (service:services(*))
      `)
            .eq('id', req.params.id)
            .single();
        if (error)
            throw error;
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
export const professionalsRouter = router;
