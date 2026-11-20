import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin, config } from '../../config/index.js';

const router = Router();

// GET /api/v1/services - Listado de servicios dentales (sin precios)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, isPublicOnly } = req.query;

    let query = supabaseAdmin
      .from('services')
      .select('id, name, slug, category, description, benefits, duration_minutes, color, icon, is_public_bookable, sort_order')
      .eq('clinic_id', config.clinicId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (category) query = query.eq('category', category as string);
    if (isPublicOnly === 'true') query = query.eq('is_public_bookable', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/services/:slug - Detalle de un servicio por slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export const servicesRouter = router;

