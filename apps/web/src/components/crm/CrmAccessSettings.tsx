import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { api, CrmSessionInfo } from '../../api.js';

const field =
  'w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500';

/** Usuario y contraseña del panel guardados en BD. El superusuario de .env (SUPER_USER / SUPER_PASS) sigue siendo válido. */
export const CrmAccessSettings: React.FC<{ onSaved?: (message: string) => void }> = ({ onSaved }) => {
  const [session, setSession] = useState<CrmSessionInfo | null>(null);
  const [current, setCurrent] = useState<{ username: string | null; updated_at: string | null; env_superuser_configured: boolean } | null>(null);
  const [loadError, setLoadError] = useState('');

  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadError('');
    Promise.all([api.getSession(), api.getCrmCredentials()])
      .then(([s, c]) => { setSession(s); setCurrent(c); setUsername(c.username || ''); })
      .catch(() => setLoadError('No se pudo cargar la configuración de acceso.'));
  };
  useEffect(load, []);

  // Quien entra con el usuario de BD confirma su contraseña actual; el superusuario de .env no lo necesita.
  const needsCurrent = session?.source === 'db' && !!current?.username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) return setError('El usuario debe tener al menos 3 caracteres.');
    if (newPassword.length < 10) return setError('La contraseña debe tener al menos 10 caracteres.');
    if (newPassword !== repeatPassword) return setError('Las dos contraseñas nuevas no coinciden.');
    if (needsCurrent && !currentPassword) return setError('Introduce tu contraseña actual para confirmar el cambio.');

    setSaving(true);
    try {
      const saved = await api.updateCrmCredentials({
        username: username.trim(),
        new_password: newPassword,
        ...(needsCurrent ? { current_password: currentPassword } : {}),
      });
      setNewPassword(''); setRepeatPassword(''); setCurrentPassword('');
      setCurrent(c => c ? { ...c, username: saved.username, updated_at: saved.updated_at } : c);
      if (session?.source === 'db') setSession({ username: saved.username, source: 'db' });
      onSaved?.('Usuario y contraseña del panel guardados.');
    } catch (err: any) {
      setError(err.message || 'No se pudieron guardar los datos de acceso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-600" /> Acceso al Panel
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xl">
          Usuario y contraseña para entrar al CRM. La contraseña se guarda cifrada (hash) en la base de datos; nadie puede leerla.
          El superusuario definido en el servidor (<code className="font-mono text-[11px]">SUPER_USER</code> / <code className="font-mono text-[11px]">SUPER_PASS</code>) también sirve siempre.
        </p>
      </div>

      {loadError ? (
        <p className="text-xs font-semibold text-red-600" role="alert">{loadError}</p>
      ) : !current ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : (
        <>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-600 space-y-1">
            <p>
              <span className="font-bold text-slate-800">Usuario guardado: </span>
              {current.username
                ? <><span className="font-mono">{current.username}</span>{current.updated_at && <> · cambiado el {new Date(current.updated_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' })}</>}</>
                : 'ninguno todavía (solo funciona el superusuario del servidor)'}
            </p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Has entrado como <span className="font-mono">{session?.username}</span> ({session?.source === 'env' ? 'superusuario' : 'usuario del panel'}).
            </p>
            {!current.env_superuser_configured && (
              <p className="font-semibold text-amber-700">El superusuario del servidor no está configurado: si olvidas esta contraseña no podrás recuperar el acceso desde aquí.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs" noValidate>
            <div className="sm:col-span-2 sm:max-w-sm">
              <label htmlFor="acc-user" className="block font-bold text-slate-700 mb-1">Usuario</label>
              <input id="acc-user" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="acc-new" className="block font-bold text-slate-700 mb-1">Nueva contraseña</label>
              <input id="acc-new" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={field} />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Mínimo 10 caracteres.</span>
            </div>
            <div>
              <label htmlFor="acc-rep" className="block font-bold text-slate-700 mb-1">Repite la nueva contraseña</label>
              <input id="acc-rep" type="password" autoComplete="new-password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} className={field} />
            </div>
            {needsCurrent && (
              <div className="sm:col-span-2 sm:max-w-sm">
                <label htmlFor="acc-cur" className="block font-bold text-slate-700 mb-1">Contraseña actual</label>
                <input id="acc-cur" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={field} />
              </div>
            )}

            {error && <p className="sm:col-span-2 text-[11px] font-bold text-red-600" role="alert">{error}</p>}

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <KeyRound className="w-4 h-4" /> {saving ? 'Guardando…' : current.username ? 'Cambiar acceso' : 'Crear acceso'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
