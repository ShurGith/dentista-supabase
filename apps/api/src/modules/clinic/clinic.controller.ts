// Datos de contacto de la clínica (tabla clinics): fuente única para toda la web pública.
// GET /api/v1/clinic/public  → público (web)
// GET /api/v1/clinic         → CRM (requiere sesión)
// PUT /api/v1/clinic         → CRM (requiere sesión), se edita en Configuración
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config, supabaseAdmin } from '../../config/index.js';

const router = Router();

const PUBLIC_FIELDS = 'name, phone, emergency_phone, whatsapp_phone, email, address, postal_code, city, province, country, google_maps_url';

async function loadClinic() {
  const { data, error } = await supabaseAdmin.from('clinics').select(PUBLIC_FIELDS).eq('id', config.clinicId).single();
  if (error) throw error;
  return data;
}

router.get('/public', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({ success: true, data: await loadClinic() });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await loadClinic() });
  } catch (err) {
    next(err);
  }
});

// Teléfono en formato internacional: "+34 915 223 344", "+34915223344"…
const phone = (label: string) => z.string().trim()
  .regex(/^\+?[0-9][0-9 ().-]{6,22}$/, `${label}: usa un teléfono válido con prefijo (p. ej. +34 915 223 344).`)
  .refine(v => { const d = v.replace(/\D/g, ''); return d.length >= 9 && d.length <= 15; }, `${label}: debe tener entre 9 y 15 dígitos.`);
const optionalPhone = (label: string) => z.union([phone(label), z.literal('')]).transform(v => v || null);

const clinicSchema = z.object({
  phone: phone('Teléfono principal'),
  emergency_phone: optionalPhone('Teléfono de urgencias'),
  whatsapp_phone: optionalPhone('WhatsApp'),
  email: z.string().trim().email('El email no es válido.').max(255),
  address: z.string().trim().min(3, 'Indica la dirección.').max(255),
  postal_code: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, 'El código postal no es válido.'),
  city: z.string().trim().min(2, 'Indica la ciudad.').max(100),
  province: z.string().trim().max(100).optional().transform(v => v || null),
  google_maps_url: z.union([z.string().trim().url('El enlace de Google Maps no es una URL válida.').max(1000), z.literal('')])
    .optional().transform(v => v || null),
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = clinicSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join(' ') });
    }
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', config.clinicId)
      .select(PUBLIC_FIELDS)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export const clinicRouter = router;
