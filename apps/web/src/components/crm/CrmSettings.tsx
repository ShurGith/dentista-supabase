import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import {
  Settings, MessageSquare, Shield, Clock, Palette,
  Save, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useNoticeModal } from '../ui/NoticeModal.js';
import { ClinicHoursEditor, ClinicDayHours, toApiWeek, toEditorWeek, validateWeek } from './ClinicHoursEditor.js';
import { loadPublicSchedule } from '../../clinicHours.js';
import { CrmAccessSettings } from './CrmAccessSettings.js';
import { ClinicContactEditor, ClinicContactForm, emptyContact, toContactForm, validateContact } from './ClinicContactEditor.js';
import { loadClinicInfo } from '../../clinicInfo.js';
import { applyBrandColor, loadSiteIdentity, whiteContrast } from '../../brandTheme.js';

export const CrmSettings: React.FC = () => {
  const notice = useNoticeModal();
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [wawpStatus, setWawpStatus] = useState<{ mode: 'api' | 'sandbox'; connected: boolean | null; status: string; phoneSuffix?: string } | null>(null);
  const [checkingWawp, setCheckingWawp] = useState(false);

  // Form Fields
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [rem24h, setRem24h] = useState(true);
  const [rem2h, setRem2h] = useState(true);
  const [remPost, setRemPost] = useState(true);

  // Horario semanal de apertura (tabla clinic_schedules)
  const [week, setWeek] = useState<ClinicDayHours[]>([]);
  const [weekErrors, setWeekErrors] = useState<Record<number, string>>({});
  const [weekLoadError, setWeekLoadError] = useState('');

  const loadWeek = () => {
    setWeekLoadError('');
    api.getAllSchedules()
      .then(data => setWeek(toEditorWeek(data.clinic_schedules)))
      .catch(() => setWeekLoadError('No se pudo cargar el horario de apertura. Comprueba la conexión con el backend y recarga.'));
  };

  // Datos de contacto de la clínica (tabla clinics): teléfonos, email y dirección de toda la web
  const [contact, setContact] = useState<ClinicContactForm | null>(null);
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof ClinicContactForm, string>>>({});
  const [contactLoadError, setContactLoadError] = useState('');

  const loadContact = () => {
    setContactLoadError('');
    api.getClinic()
      .then(c => setContact(toContactForm(c)))
      .catch(() => setContactLoadError('No se pudieron cargar los datos de contacto. Comprueba la conexión con el backend y recarga.'));
  };

  const loadSettings = () => {
    setLoading(true);
    loadWeek();
    loadContact();
    api.getSettings()
      .then(data => {
        setSettings(data);
        setHeroTitle(data.hero_title || '');
        setHeroSubtitle(data.hero_subtitle || '');
        setPrimaryColor(data.primary_color || '#0d9488');
        setMinNoticeHours(data.min_notice_hours || 2);
        setBufferMinutes(data.buffer_between_appointments_minutes || 10);
        setRem24h(!!data.reminder_24h_enabled);
        setRem2h(!!data.reminder_2h_enabled);
        setRemPost(!!data.reminder_post_enabled);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const checkWawpConnection = async () => {
    setCheckingWawp(true);
    try {
      setWawpStatus(await api.getWawpStatus());
    } catch (err: any) {
      notice.notify(err.message || 'No se pudo comprobar la conexión con Wawp.');
      setWawpStatus(null);
    } finally {
      setCheckingWawp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
      notice.notify('El color principal debe tener el formato #RRGGBB, por ejemplo #0d9488.');
      return;
    }
    if (heroTitle.trim().length < 5 || heroSubtitle.trim().length < 10) {
      notice.notify('El título principal necesita al menos 5 caracteres y el subtítulo al menos 10.');
      return;
    }
    const errors = validateWeek(week);
    setWeekErrors(errors);
    const cErrors = contact ? validateContact(contact) : {};
    setContactErrors(cErrors);
    if (Object.keys(cErrors).length) {
      notice.notify('Revisa los datos de contacto de la clínica: hay campos incompletos o con formato incorrecto. Los errores aparecen debajo de cada campo.');
      return;
    }
    if (Object.keys(errors).length) {
      notice.notify('Revisa el horario de apertura: hay días con horas que no encajan. Los errores aparecen debajo de cada día.');
      return;
    }
    setSaving(true);
    try {
      if (contact) {
        const savedClinic = await api.updateClinic({ ...emptyContact, ...contact });
        setContact(toContactForm(savedClinic));
        loadClinicInfo(true).catch(() => undefined);
      }
      if (week.length) {
        const saved = await api.updateClinicSchedule(toApiWeek(week));
        if (Array.isArray(saved)) setWeek(toEditorWeek(saved));
        loadPublicSchedule(true).catch(() => undefined);
      }
      await api.updateSettings({
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        primary_color: primaryColor,
        min_notice_hours: Number(minNoticeHours),
        buffer_between_appointments_minutes: Number(bufferMinutes),
        reminder_24h_enabled: rem24h,
        reminder_2h_enabled: rem2h,
        reminder_post_enabled: remPost,
      });
      // Título, subtítulo y color se aplican al momento en toda la web
      applyBrandColor(primaryColor);
      loadSiteIdentity(true).catch(() => undefined);
      setToastMsg('Configuración guardada correctamente.');
      setTimeout(() => setToastMsg(''), 4000);
      loadSettings();
    } catch (err: any) {
      notice.notify(err.message || 'Error guardando ajustes');
    } finally {
      setSaving(false);
    }
  };

  // Botón «Guardar Todos los Ajustes»: aparece en la cabecera, al final del horario y al final del formulario.
  // Usa form="crm-settings-form" para poder estar fuera del <form> (cabecera).
  const saveAllButton = (key: string) => (
    <button
      key={key}
      type="submit"
      form="crm-settings-form"
      disabled={saving}
      className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-md shadow-brand-600/20 shrink-0"
    >
      <Save className="w-4 h-4" />
      {saving ? 'Guardando...' : 'Guardar Todos los Ajustes'}
    </button>
  );

  return (
    <div className="space-y-6">
      {notice.modal}
      
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Configuración General
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identidad visual, datos de contacto, horario de apertura, reglas de reserva y pasarela Wawp.
          </p>
        </div>
        {saveAllButton('header')}
      </div>

      <form id="crm-settings-form" onSubmit={handleSave} className="space-y-6" noValidate>
        
        {/* Identidad Visual & Web */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-600" /> Identidad Visual y Contenidos Web
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Color Principal (Hexadecimal):</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-32 p-2 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>
              {/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? (
                whiteContrast(primaryColor) < 4.5 ? (
                  <span className="text-[11px] font-bold text-amber-700 mt-1 block" role="status">
                    Color muy claro: el texto blanco de los botones tendrá poco contraste ({whiteContrast(primaryColor).toFixed(1)}:1, se recomienda 4,5:1 o más).
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">Se aplica a botones, enlaces y acentos de toda la web y del panel.</span>
                )
              ) : (
                <span className="text-[11px] font-bold text-red-600 mt-1 block" role="alert">Usa el formato #RRGGBB, p. ej. #0d9488.</span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Título Principal (Hero Web):</label>
              <input
                type="text"
                value={heroTitle}
                onChange={e => setHeroTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Subtítulo Descriptivo:</label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={e => setHeroSubtitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Datos de contacto: fuente única para teléfonos, email y dirección de la web */}
        {contactLoadError ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-xs text-red-600 font-semibold flex items-center justify-between gap-3" role="alert">
            {contactLoadError}
            <button type="button" onClick={loadContact} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50">Reintentar</button>
          </div>
        ) : contact ? (
          <ClinicContactEditor
            value={contact}
            errors={contactErrors}
            onChange={next => {
              setContact(next);
              if (Object.keys(contactErrors).length) setContactErrors(validateContact(next));
            }}
          />
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-xs text-slate-400">Cargando datos de contacto…</div>
        )}

        {/* Horario de apertura: fuente única para web pública, disponibilidad y app */}
        {weekLoadError ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-xs text-red-600 font-semibold flex items-center justify-between gap-3" role="alert">
            {weekLoadError}
            <button type="button" onClick={loadWeek} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50">Reintentar</button>
          </div>
        ) : week.length ? (
          <ClinicHoursEditor
            footer={saveAllButton('hours')}
            week={week}
            errors={weekErrors}
            onChange={next => {
              setWeek(next);
              if (Object.keys(weekErrors).length) setWeekErrors(validateWeek(next));
            }}
          />
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-xs text-slate-400">Cargando horario de apertura…</div>
        )}

        {/* Reglas de Reserva de Citas */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" /> Reglas de Reserva de Agenda
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Antelación mínima para reservar (horas):
              </label>
              <input
                type="number"
                min={0}
                max={48}
                value={minNoticeHours}
                onChange={e => setMinNoticeHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Impide que pacientes reserven citas con menos de estas horas de margen.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Margen de limpieza entre citas (minutos):
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={bufferMinutes}
                onChange={e => setBufferMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tiempo reservado para desinfección y preparación del gabinete.
              </span>
            </div>
          </div>
        </div>

        {/* Configuración de Wawp & WhatsApp */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" /> Integración con Wawp (https://wawp.net/en)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">Conexión gestionada por configuración segura del backend</p>
                  <p className="mt-1 text-slate-500">El token y el ID de instancia se guardan en `.env`; no se exponen al navegador.</p>
                </div>
                <button type="button" onClick={checkWawpConnection} disabled={checkingWawp} className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {checkingWawp ? 'Comprobando…' : 'Probar conexión'}
                </button>
              </div>

              {wawpStatus && (
                <div className={`rounded-xl p-3 font-semibold ${wawpStatus.connected === false ? 'bg-amber-50 text-amber-800' : wawpStatus.connected ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`} role="status">
                  {wawpStatus.mode === 'sandbox' ? 'Modo sandbox activo; no se envían mensajes a Wawp.' : `Wawp: ${wawpStatus.status}${wawpStatus.phoneSuffix ? ` · teléfono terminado en ${wawpStatus.phoneSuffix}` : ''}`}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">Recordatorios Automáticos por WhatsApp:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={rem24h}
                    onChange={e => setRem24h(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Enviar recordatorio 24 horas antes con confirmación "SÍ"</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={rem2h}
                    onChange={e => setRem2h(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Enviar recordatorio 2 horas antes de la consulta</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={remPost}
                    onChange={e => setRemPost(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Enviar mensaje de seguimiento post-tratamiento</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          {saveAllButton('bottom')}
        </div>

      </form>

      {/* Acceso al panel: formulario propio (no se guarda con «Guardar Todos los Ajustes») */}
      <CrmAccessSettings onSaved={msg => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); }} />

    </div>
  );
};

