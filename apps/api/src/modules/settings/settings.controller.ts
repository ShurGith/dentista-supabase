import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin, config } from '../../config/index.js';
import { updateSettingsSchema } from '@clinica-eugenia/shared';

const router = Router();

// GET /api/v1/settings - Obtener configuración general de la clínica
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('clinic_id', config.clinicId)
      .single();

    if (error) throw error;

    // Never return provider credentials through the settings endpoint.
    const safeSettings = {
      ...settings,
      wawp_api_token: settings.wawp_api_token ? '••••••••••••••••' : '',
      wawp_webhook_secret: settings.wawp_webhook_secret ? '••••••••••••••••' : '',
    };

    res.json({ success: true, data: safeSettings });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/settings/public - Identidad pública de la web (sin sesión): título, subtítulo y color de marca.
// Solo estos campos: el resto de settings (Wawp, reglas internas) sigue protegido.
router.get('/public', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('hero_title, hero_subtitle, primary_color')
      .eq('clinic_id', config.clinicId)
      .maybeSingle();
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-cache');
    res.json({ success: true, data: data || {} });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/settings - Actualizar configuración de la clínica
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateSettingsSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('settings')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('clinic_id', config.clinicId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data, message: 'Configuración guardada correctamente.' });
  } catch (err) {
    next(err);
  }
});

export const settingsRouter = router;

