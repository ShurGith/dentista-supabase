import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config/index.js';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, authenticate, clearLoginFailures, envSuperUserConfigured, getDbCredentials, issueSessionToken, loginBlockedFor, recordLoginFailure, saveDbCredentials, verifyPassword, verifySessionToken, } from './auth.service.js';
const router = Router();
// ---- Cookies (sin dependencias) ----------------------------------------------------------------
export function readCookie(req, name) {
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === name)
            return decodeURIComponent(v.join('='));
    }
    return undefined;
}
function setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/api',
        maxAge: SESSION_TTL_SECONDS * 1000,
    });
}
function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/api' });
}
// ---- Puerta de acceso: todo /api exige sesión salvo las rutas públicas -------------------------
const PUBLIC_ROUTES = [
    ['GET', /^\/api\/v1\/health\/?$/],
    ['POST', /^\/api\/v1\/auth\/(login|logout)\/?$/],
    ['GET', /^\/api\/v1\/auth\/me\/?$/],
    // Web pública: catálogo, equipo, horario, disponibilidad y reserva
    ['GET', /^\/api\/v1\/services(\/[^/]+)?\/?$/],
    ['GET', /^\/api\/v1\/professionals(\/[^/]+)?\/?$/],
    ['GET', /^\/api\/v1\/schedules\/public\/?$/],
    ['GET', /^\/api\/v1\/clinic\/public\/?$/],
    ['GET', /^\/api\/v1\/settings\/public\/?$/],
    ['GET', /^\/api\/v1\/availability\/?$/],
    ['POST', /^\/api\/v1\/appointments\/public-book\/?$/],
    // Webhooks de Wawp: tienen su propio secreto (WAWP_WEBHOOK_SECRET)
    ['POST', /^\/api\/wawp\/webhook\/?$/],
    ['POST', /^\/api\/v1\/whatsapp\/webhook\/?$/],
];
export async function requireCrmSession(req, res, next) {
    if (req.method === 'OPTIONS')
        return next();
    const path = req.path.startsWith('/api') ? req.path : `${req.baseUrl}${req.path}`;
    if (PUBLIC_ROUTES.some(([method, re]) => method === req.method && re.test(path)))
        return next();
    try {
        const session = await verifySessionToken(readCookie(req, SESSION_COOKIE));
        if (!session) {
            return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Inicia sesión para acceder al panel.' });
        }
        req.crmSession = session;
        next();
    }
    catch (err) {
        next(err);
    }
}
// ---- Rutas /api/v1/auth ------------------------------------------------------------------------
const loginSchema = z.object({
    username: z.string().trim().min(1, 'Introduce el usuario.').max(80),
    password: z.string().min(1, 'Introduce la contraseña.').max(200),
});
// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const wait = loginBlockedFor(ip);
        if (wait) {
            res.setHeader('Retry-After', String(wait));
            return res.status(429).json({ success: false, error: 'TOO_MANY_ATTEMPTS', message: `Demasiados intentos fallidos. Vuelve a probar en ${Math.ceil(wait / 60)} min.` });
        }
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join(' ') });
        }
        const result = await authenticate(parsed.data.username, parsed.data.password);
        if (!result) {
            recordLoginFailure(ip);
            console.warn(JSON.stringify({ event: 'crm.login', status: 'failed' }));
            return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos.' });
        }
        clearLoginFailures(ip);
        setSessionCookie(res, result.token);
        console.info(JSON.stringify({ event: 'crm.login', status: 'ok', source: result.source }));
        res.json({ success: true, data: { username: result.username, source: result.source } });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
});
// GET /api/v1/auth/me - Sesión actual (401 si no hay)
router.get('/me', async (req, res, next) => {
    try {
        const session = await verifySessionToken(readCookie(req, SESSION_COOKIE));
        if (!session)
            return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Sin sesión.' });
        res.json({ success: true, data: { username: session.username, source: session.source } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/auth/credentials - Usuario configurado en BD (nunca la contraseña)
router.get('/credentials', async (_req, res, next) => {
    try {
        const creds = await getDbCredentials();
        res.json({
            success: true,
            data: { username: creds?.username || null, updated_at: creds?.updated_at || null, env_superuser_configured: envSuperUserConfigured() },
        });
    }
    catch (err) {
        next(err);
    }
});
const credentialsSchema = z.object({
    username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres.').max(80)
        .regex(/^[\p{L}\p{N}._@-]+$/u, 'El usuario solo puede tener letras, números y . _ @ -'),
    new_password: z.string().trim().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200),
    current_password: z.string().trim().max(200).optional(),
});
// PUT /api/v1/auth/credentials - Crear o cambiar el usuario y la contraseña guardados en BD
router.put('/credentials', async (req, res, next) => {
    try {
        const parsed = credentialsSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join(' ') });
        }
        const session = req.crmSession;
        const existing = await getDbCredentials();
        // Quien entró con el usuario de BD debe confirmar su contraseña actual; el superusuario de .env no
        // (sirve para recuperar el acceso si se olvida).
        if (session.source === 'db' && existing) {
            if (!parsed.data.current_password || !(await verifyPassword(parsed.data.current_password, existing.password_hash))) {
                return res.status(403).json({ success: false, error: 'WRONG_CURRENT_PASSWORD', message: 'La contraseña actual no es correcta.' });
            }
        }
        const saved = await saveDbCredentials(parsed.data.username, parsed.data.new_password);
        // Si la sesión es del usuario de BD, se renueva para no expulsarle al cambiar su propia contraseña.
        if (session.source === 'db')
            setSessionCookie(res, issueSessionToken(saved.username, 'db', saved.password_hash));
        console.info(JSON.stringify({ event: 'crm.credentials_updated', by: session.source }));
        res.json({ success: true, data: { username: saved.username, updated_at: saved.updated_at } });
    }
    catch (err) {
        next(err);
    }
});
export const authRouter = router;
