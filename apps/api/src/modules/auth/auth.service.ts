// Acceso al panel CRM: usuario y contraseña guardados en BD (crm_credentials) o el superusuario de .env.
// Sesión sin estado: cookie HttpOnly con un token firmado (HMAC-SHA256) que caduca a las 12 h.
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { config, supabaseAdmin } from '../../config/index.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;

export const SESSION_COOKIE = 'crm_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

export type SessionSource = 'env' | 'db';
export interface CrmSession { username: string; source: SessionSource; exp: number }

// ---- Contraseñas -------------------------------------------------------------------------------

/** Hash "scrypt$N$r$p$sal$hash" (base64). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Comparación en tiempo constante de cadenas de cualquier longitud. */
function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

// ---- Superusuario de .env ----------------------------------------------------------------------

// Se relee el .env de la raíz en cada uso (con caché de 2 s): cambiar SUPER_USER / SUPER_PASS
// tiene efecto sin reiniciar la API. Si el archivo no existe, se usan las variables de entorno del proceso.
const ROOT_ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../.env');
let envCache: { at: number; user: string; pass: string } | null = null;

export function getEnvSuperUser() {
  if (envCache && Date.now() - envCache.at < 2000) return envCache;
  let user = process.env.SUPER_USER || '';
  let pass = process.env.SUPER_PASS || '';
  try {
    const parsed = dotenv.parse(readFileSync(ROOT_ENV));
    if (parsed.SUPER_USER !== undefined) user = parsed.SUPER_USER;
    if (parsed.SUPER_PASS !== undefined) pass = parsed.SUPER_PASS;
  } catch { /* sin .env legible: valen las variables del proceso */ }
  envCache = { at: Date.now(), user: user.trim(), pass: pass.trim() };
  return envCache;
}

export function envSuperUserConfigured() {
  const { user, pass } = getEnvSuperUser();
  return user.length > 0 && pass.length > 0;
}
if (!envSuperUserConfigured()) {
  console.warn('[Auth] SUPER_USER / SUPER_PASS no están definidos en .env: solo funcionará el usuario guardado en la base de datos.');
}

// ---- Credenciales en BD ------------------------------------------------------------------------

export async function getDbCredentials() {
  const { data, error } = await supabaseAdmin
    .from('crm_credentials')
    .select('username, password_hash, updated_at')
    .eq('clinic_id', config.clinicId)
    .maybeSingle();
  if (error) throw error;
  return data as { username: string; password_hash: string; updated_at: string } | null;
}

export async function saveDbCredentials(username: string, password: string) {
  const password_hash = await hashPassword(password);
  const { data, error } = await supabaseAdmin
    .from('crm_credentials')
    .upsert({ clinic_id: config.clinicId, username, password_hash, updated_at: new Date().toISOString() }, { onConflict: 'clinic_id' })
    .select('username, password_hash, updated_at')
    .single();
  if (error) throw error;
  return data as { username: string; password_hash: string; updated_at: string };
}

// ---- Sesión firmada ----------------------------------------------------------------------------

// Secreto de firma: CRM_SESSION_SECRET o, si no existe, derivado de JWT_SECRET. Sin ninguno, uno aleatorio
// (las sesiones se pierden al reiniciar la API).
const sessionSecret = process.env.CRM_SESSION_SECRET
  || (process.env.JWT_SECRET ? createHmac('sha256', process.env.JWT_SECRET).update('crm-session-v1').digest('hex') : '');
const signingKey = sessionSecret || randomBytes(32).toString('hex');
if (!sessionSecret) console.warn('[Auth] Sin CRM_SESSION_SECRET ni JWT_SECRET: las sesiones del CRM se invalidarán en cada reinicio.');

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (payload: string) => createHmac('sha256', signingKey).update(payload).digest('base64url');

/** Huella de la credencial vigente: si cambia la contraseña (BD o .env), las sesiones anteriores dejan de valer. */
function credentialFingerprint(source: SessionSource, secretMaterial: string) {
  return createHmac('sha256', signingKey).update(`${source}:${secretMaterial}`).digest('base64url').slice(0, 22);
}

export function issueSessionToken(username: string, source: SessionSource, secretMaterial: string) {
  const payload = b64url(JSON.stringify({
    u: username,
    s: source,
    f: credentialFingerprint(source, secretMaterial),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }));
  return `${payload}.${sign(payload)}`;
}

/** Valida firma, caducidad y que la credencial no haya cambiado. Devuelve la sesión o null. */
export async function verifySessionToken(token: string | undefined): Promise<CrmSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  let data: { u: string; s: SessionSource; f: string; exp: number };
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!data?.u || !data.exp || data.exp < Date.now() / 1000) return null;

  if (data.s === 'env') {
    const { user: envUser, pass: envPass } = getEnvSuperUser();
    if (!envSuperUserConfigured() || data.u !== envUser) return null;
    if (data.f !== credentialFingerprint('env', `${envUser}:${envPass}`)) return null;
  } else if (data.s === 'db') {
    const creds = await getDbCredentials();
    if (!creds || creds.username !== data.u) return null;
    if (data.f !== credentialFingerprint('db', creds.password_hash)) return null;
  } else {
    return null;
  }
  return { username: data.u, source: data.s, exp: data.exp };
}

/** Comprueba usuario y contraseña: primero el superusuario de .env y después el de la BD. */
export async function authenticate(rawUsername: string, rawPassword: string) {
  // Se ignoran espacios en los extremos (habituales al copiar y pegar desde .env).
  const username = rawUsername.trim();
  const password = rawPassword.trim();
  const { user: envUser, pass: envPass } = getEnvSuperUser();
  if (envSuperUserConfigured() && safeEqual(username, envUser) && safeEqual(password, envPass)) {
    return { username: envUser, source: 'env' as const, token: issueSessionToken(envUser, 'env', `${envUser}:${envPass}`) };
  }
  const creds = await getDbCredentials();
  if (creds && creds.username === username && await verifyPassword(password, creds.password_hash)) {
    return { username: creds.username, source: 'db' as const, token: issueSessionToken(creds.username, 'db', creds.password_hash) };
  }
  return null;
}

// ---- Límite de intentos de login (por IP, en memoria) ------------------------------------------

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function loginBlockedFor(ip: string) {
  const f = failures.get(ip);
  if (!f || f.resetAt < Date.now()) return 0;
  return f.count >= MAX_FAILURES ? Math.ceil((f.resetAt - Date.now()) / 1000) : 0;
}
export function recordLoginFailure(ip: string) {
  const f = failures.get(ip);
  if (!f || f.resetAt < Date.now()) failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else f.count++;
}
export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
