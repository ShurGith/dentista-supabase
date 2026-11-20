import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { fullAddress, useClinicInfo } from '../../clinicInfo.js';
import {
  Calendar, Clock, User, Phone, Mail, FileText, CheckCircle2,
  ChevronRight, ChevronLeft, AlertCircle, Sparkles, MessageSquare
} from 'lucide-react';

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedServiceId?: string;
}

export const PublicBookingModal: React.FC<PublicBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedServiceId,
}) => {
  const clinic = useClinicInfo();
  const [step, setStep] = useState<number>(1);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedServiceId || '');
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Patient Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+34 ');
  const [email, setEmail] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getServices().then(data => {
        setServices(data);
        if (preselectedServiceId) setSelectedServiceId(preselectedServiceId);
        else if (data.length > 0 && !selectedServiceId) setSelectedServiceId(data[0].id);
      }).catch(console.error);

      api.getProfessionals().then(data => setProfessionals(data)).catch(console.error);
    }
  }, [isOpen, preselectedServiceId]);

  // Query availability whenever service, professional or date changes
  useEffect(() => {
    if (selectedServiceId && selectedDate && step === 2) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setErrorMsg('');

      api.getAvailableSlots({
        service_id: selectedServiceId,
        date: selectedDate,
        professional_id: selectedProfId || null,
      })
        .then(slots => setAvailableSlots(slots))
        .catch(err => setErrorMsg(err.message))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedServiceId, selectedProfId, selectedDate, step]);

  if (!isOpen) return null;

  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedProf = professionals.find(p => p.id === selectedProfId);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rgpdConsent) {
      setErrorMsg('Debes aceptar la política de protección de datos (RGPD) para continuar.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Debes seleccionar un horario disponible.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.publicBookAppointment({
        service_id: selectedServiceId,
        professional_id: selectedProfId || selectedSlot.professional_id || null,
        start_time: selectedSlot.start_time,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        patient_notes: patientNotes.trim() || undefined,
        rgpd_consent: true,
        whatsapp_consent: whatsappConsent,
      });

      setConfirmedAppointment(res);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo reservar la cita. Por favor verifica la información.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest block">
              Reserva de Cita Online
            </span>
            <h3 className="text-xl font-extrabold text-white">
              Clínica Dental Eugenia
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar (Pasos) */}
        {step < 4 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className={step >= 1 ? 'text-brand-700 font-bold' : ''}>1. Tratamiento</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={step >= 2 ? 'text-brand-700 font-bold' : ''}>2. Fecha y Hora</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={step >= 3 ? 'text-brand-700 font-bold' : ''}>3. Datos Personales</span>
          </div>
        )}

        {/* Content body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO 1: Selección de Servicio */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Selecciona el tratamiento que necesitas:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {services.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between ${
                      selectedServiceId === s.id
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                        {s.category}
                      </span>
                      <h5 className="font-bold text-slate-900 text-sm">{s.name}</h5>
                      <span className="text-xs text-slate-500 mt-1 block">⏱ {s.duration_minutes} min aprox.</span>
                    </div>
                    {selectedServiceId === s.id && (
                      <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedServiceId}
                  onClick={() => setStep(2)}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2"
                >
                  Continuar a Fecha y Hora
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Selección de Odontólogo, Fecha y Horario disponible */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Odontólogo preferido (Opcional):
                  </label>
                  <select
                    value={selectedProfId}
                    onChange={(e) => setSelectedProfId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Cualquier especialista disponible</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha deseada:
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Slots Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Franjas horarias disponibles:
                </label>

                {loadingSlots ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Comprobando disponibilidad médica en tiempo real...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800">
                    No hay huecos disponibles en la fecha seleccionada. Por favor prueba otro día o con cualquier profesional.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-center ${
                          selectedSlot?.start_time === slot.start_time
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/50'
                        }`}
                      >
                        {slot.time_label}
                        <span className="block text-[9px] font-normal opacity-75 truncate">
                          {slot.professional_name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-600 hover:text-slate-900 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2"
                >
                  Continuar a Datos Personales
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Datos de Contacto y Consentimientos RGPD */}
          {step === 3 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-100 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-900">{selectedService?.name}</strong>
                  <span>{new Date(selectedSlot?.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlot?.time_label}</span>
                </div>
                <span className="text-[11px] font-bold text-brand-700 bg-white px-2.5 py-1 rounded-full border border-brand-200">
                  {selectedSlot?.professional_name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Laura"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez Fernández"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono móvil (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@email.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas o motivo de la visita (Opcional):</label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Indícanos si tienes alguna molestia concreta o preferencia..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Consentimientos RGPD */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={rgpdConsent}
                    onChange={(e) => setRgpdConsent(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    He leído y acepto la <strong className="text-slate-900">política de privacidad y protección de datos</strong> de Clínica Dental Eugenia para la gestión de mi historial y cita dental (RGPD).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    Deseo recibir la confirmación y recordatorios de mi cita por <strong className="text-emerald-700">WhatsApp</strong> mediante Wawp.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-slate-600 hover:text-slate-900 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-7 py-3 rounded-xl text-sm transition flex items-center gap-2 shadow-md shadow-brand-600/20"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar Cita'}
                </button>
              </div>
            </form>
          )}

          {/* PASO 4: Confirmación Exitosa */}
          {step === 4 && (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-extrabold text-slate-900">
                  ¡Cita reservada con éxito!
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Hemos registrado tu cita en el sistema de Clínica Dental Eugenia y te hemos enviado la confirmación instantánea a tu <strong className="text-emerald-700">WhatsApp</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-md mx-auto text-left text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Tratamiento:</span>
                  <span className="font-bold text-slate-900">{selectedService?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fecha y Hora:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedSlot?.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlot?.time_label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Ubicación:</span>
                  <span className="font-bold text-slate-900">{fullAddress(clinic)}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl text-sm transition"
                >
                  Entendido, gracias
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

