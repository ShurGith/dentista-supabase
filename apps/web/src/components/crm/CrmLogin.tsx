import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LogIn, Stethoscope } from 'lucide-react';
import { api, CrmSessionInfo } from '../../api.js';

interface Props {
  onSuccess: (session: CrmSessionInfo) => void;
  onBack: () => void;
  notice?: string;
}

export const CrmLogin: React.FC<Props> = ({ onSuccess, onBack, notice }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Introduce el usuario y la contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      onSuccess(await api.login(username.trim(), password));
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-base block tracking-tight leading-tight">Dental Eugenia</span>
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest block">Panel Clínico</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-5" noValidate>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Acceso al panel</h1>
            <p className="text-xs text-slate-500 mt-1">Introduce tu usuario y contraseña para gestionar la agenda, los pacientes y WhatsApp.</p>
          </div>

          {notice && !error && (
            <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs font-semibold text-amber-800" role="status">{notice}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="crm-user" className="block text-xs font-bold text-slate-700">Usuario</label>
            <input
              id="crm-user"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="crm-pass" className="block text-xs font-bold text-slate-700">Contraseña</label>
            <div className="relative">
              <input
                id="crm-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs font-bold text-red-700" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 mx-auto flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la web pública
        </button>
      </div>
    </div>
  );
};
