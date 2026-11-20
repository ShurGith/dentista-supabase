import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
const wawpDriver = process.env.WAWP_DRIVER || (process.env.NODE_ENV === 'production' ? 'api' : 'sandbox');
const wawpConfigSchema = z.object({
    driver: z.enum(['api', 'sandbox']),
    baseUrl: z.string().url(),
    accessToken: z.string(),
    instanceId: z.string(),
    appTimezone: z.string().min(1),
    tunnelUrl: z.string().url().optional(),
    webhookSecret: z.string(),
    // Fecha ISO 8601 con zona: los mensajes anteriores no se importan ni se archivan.
    historySince: z.string().refine((value) => /T.*(Z|[+-]\d{2}:?\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)), {
        message: 'WAWP_HISTORY_SINCE debe ser una fecha ISO 8601 con zona horaria, ej. 2026-11-19T00:00:00+01:00.',
    }).optional(),
});
const wawp = wawpConfigSchema.parse({
    driver: wawpDriver,
    baseUrl: process.env.WAWP_BASE_URL || 'https://api.wawp.net',
    accessToken: process.env.WAWP_ACCESS_TOKEN || process.env.WAWP_API_TOKEN || '',
    instanceId: process.env.WAWP_INSTANCE_ID || '',
    appTimezone: process.env.WAWP_APP_TIMEZONE || 'Europe/Madrid',
    tunnelUrl: process.env.WAWP_TUNNEL_URL || undefined,
    webhookSecret: process.env.WAWP_WEBHOOK_SECRET || '',
    historySince: process.env.WAWP_HISTORY_SINCE || undefined,
});
try {
    new Intl.DateTimeFormat('en', { timeZone: wawp.appTimezone });
}
catch {
    throw new Error('WAWP_APP_TIMEZONE debe ser una zona horaria IANA válida.');
}
if (wawp.driver === 'api' && (!wawp.accessToken || !wawp.instanceId)) {
    throw new Error('WAWP_ACCESS_TOKEN y WAWP_INSTANCE_ID son obligatorios con WAWP_DRIVER=api.');
}
if (process.env.NODE_ENV === 'production' && new URL(wawp.baseUrl).protocol !== 'https:') {
    throw new Error('WAWP_BASE_URL debe usar HTTPS en producción.');
}
if (process.env.NODE_ENV === 'production' && wawp.tunnelUrl) {
    throw new Error('WAWP_TUNNEL_URL solo se configura en desarrollo local.');
}
if (process.env.NODE_ENV === 'production' && !wawp.webhookSecret) {
    throw new Error('WAWP_WEBHOOK_SECRET es obligatorio en producción.');
}
// MODO_DEV: con WhatsApp real, solo se envía al número PHONE_NUMBER_DEV; el resto de envíos se bloquea.
const devMode = /^(true|1|yes|si|sí)$/i.test((process.env.MODO_DEV || '').trim());
const devPhoneDigits = (process.env.PHONE_NUMBER_DEV || '').trim().replace(/^["']|["']$/g, '').replace(/\D/g, '');
if (devMode && !/^\d{8,15}$/.test(devPhoneDigits)) {
    console.warn('[MODO_DEV] PHONE_NUMBER_DEV no es un teléfono internacional válido: se bloquearán TODOS los envíos de WhatsApp.');
}
const tunnelSecret = wawp.tunnelUrl ? new URL(wawp.tunnelUrl).searchParams.get('secret') : null;
if (tunnelSecret && tunnelSecret !== wawp.webhookSecret) {
    throw new Error('El parámetro secret de WAWP_TUNNEL_URL debe coincidir con WAWP_WEBHOOK_SECRET.');
}
export const config = {
    port: parseInt(process.env.API_PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    // Supabase Configuration
    supabase: {
        url: process.env.SUPABASE_URL || 'http://localhost:8000',
        serviceRoleKey: process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'dummy_service_role_key_for_testing',
        anonKey: process.env.ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'dummy_anon_key_for_testing',
    },
    wawp: {
        ...wawp,
        phoneNumber: process.env.WAWP_PHONE_NUMBER || '',
        sandboxMode: wawp.driver === 'sandbox',
        devMode,
        // Solo dígitos con prefijo internacional (p. ej. 34611223344); vacío = bloquear todo en MODO_DEV.
        devPhoneNumber: /^\d{8,15}$/.test(devPhoneDigits) ? devPhoneDigits : '',
    },
    clinicId: process.env.DEFAULT_CLINIC_ID || 'e1111111-1111-1111-1111-111111111111',
};
// Supabase Admin Client (Bypasses RLS for backend background jobs and triggers)
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
