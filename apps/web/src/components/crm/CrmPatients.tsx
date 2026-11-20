import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import {
  Users, Search, Plus, Phone, Mail, Calendar, FileText,
  AlertTriangle, Shield, CheckCircle2, Trash2, MessageSquare, Heart
} from 'lucide-react';
import { useNoticeModal } from '../ui/NoticeModal.js';

export const CrmPatients: React.FC = () => {
  const notice = useNoticeModal();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({ first_name: '', last_name: '', phone: '', email: '', dni_nie: '' });

  // Form New Patient
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+34 ');
  const [email, setEmail] = useState('');
  const [dniNie, setDniNie] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  // Medical Record Edit
  const [editingMedical, setEditingMedical] = useState(false);
  const [medAllergies, setMedAllergies] = useState('');
  const [medConditions, setMedConditions] = useState('');
  const [medMeds, setMedMeds] = useState('');
  const [medNotes, setMedNotes] = useState('');

  const loadPatients = (query?: string) => {
    setLoading(true);
    api.getPatients(query)
      .then(data => setPatients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenDetail = async (patId: string) => {
    try {
      const fullPat = await api.getPatientById(patId);
      setSelectedPatient(fullPat);
      setPatientForm({
        first_name: fullPat.first_name || '',
        last_name: fullPat.last_name || '',
        phone: fullPat.phone || '',
        email: fullPat.email || '',
        dni_nie: fullPat.dni_nie || '',
      });
      setEditingPatient(false);
      const rec = fullPat.medical_record || {};
      setMedAllergies(rec.allergies || '');
      setMedConditions(rec.medical_conditions || '');
      setMedMeds(rec.current_medications || '');
      setMedNotes(rec.clinical_notes || '');
    } catch (err) {
      console.error(err);
      notice.notify('No se pudo cargar el expediente del paciente.');
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await api.updatePatient(selectedPatient.id, {
        ...patientForm,
        dni_nie: patientForm.dni_nie || null,
      });
      setEditingPatient(false);
      await handleOpenDetail(selectedPatient.id);
      loadPatients(search);
    } catch (err: any) {
      notice.notify(err.message || 'Error al actualizar el paciente.');
    }
  };

  const handleDeletePatient = async (patId: string) => {
    if (!await notice.confirm('¿Eliminar este paciente del panel? Sus citas e historial se conservarán.', 'Eliminar paciente')) return;
    try {
      await api.deletePatient(patId);
      setSelectedPatient(null);
      loadPatients(search);
    } catch (err: any) {
      notice.notify(err.message || 'Error al eliminar el paciente.');
    }
  };

  const handleSaveMedicalRecord = async () => {
    if (!selectedPatient) return;
    try {
      await api.updatePatientMedicalRecord(selectedPatient.id, {
        allergies: medAllergies,
        medical_conditions: medConditions,
        current_medications: medMeds,
        clinical_notes: medNotes,
      });
      notice.notify('Historial clínico actualizado correctamente.', 'success');
      setEditingMedical(false);
      handleOpenDetail(selectedPatient.id);
    } catch (err: any) {
      notice.notify(err.message || 'Error guardando historial clínico.');
    }
  };

  const handleAnonymize = async (patId: string) => {
    if (!await notice.confirm('¿Confirmas la anonimización de este paciente conforme al derecho de supresión del RGPD? Esta acción es irreversible.', 'Anonimizar paciente')) {
      return;
    }
    try {
      await api.anonymizePatient(patId);
      notice.notify('Paciente anonimizado con éxito.', 'success');
      setSelectedPatient(null);
      loadPatients();
    } catch (err: any) {
      notice.notify(err.message || 'Error al anonimizar paciente.');
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPatient({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        dni_nie: dniNie.trim() || undefined,
        allergies: allergies.trim() || undefined,
        medical_conditions: medicalConditions.trim() || undefined,
      });
      setIsNewModalOpen(false);
      setFirstName('');
      setLastName('');
      setPhone('+34 ');
      setEmail('');
      setDniNie('');
      setAllergies('');
      setMedicalConditions('');
      loadPatients();
    } catch (err: any) {
      notice.notify(err.message || 'Error al dar de alta al paciente.');
    }
  };

  return (
    <div className="space-y-6">
      {notice.modal}
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestión de Pacientes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Expedientes clínicos, alergias, consentimientos RGPD y contacto.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Alta de Paciente
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apellidos, teléfono, DNI o email..."
          className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Limpiar
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-5">Paciente</th>
                <th className="py-3.5 px-4">Teléfono / WhatsApp</th>
                <th className="py-3.5 px-4">DNI / NIE</th>
                <th className="py-3.5 px-4">Alergias / Alertas</th>
                <th className="py-3.5 px-4">Etiquetas</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Buscando pacientes...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron pacientes.
                  </td>
                </tr>
              ) : (
                patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      <button
                        onClick={() => handleOpenDetail(pat.id)}
                        className="hover:text-brand-600 text-left"
                      >
                        {pat.first_name} {pat.last_name}
                      </button>
                      <span className="block text-[10px] text-slate-400 font-normal">{pat.email || 'Sin email'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {pat.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {pat.dni_nie || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {pat.medical_record?.allergies ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          {pat.medical_record.allergies.slice(0, 24)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Sin alergias reg.</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(pat.tags || []).map((t: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(pat.id)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FICHA DEL PACIENTE */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </h3>
                  <span className="text-xs text-brand-400 font-mono">
                    {selectedPatient.phone} {selectedPatient.dni_nie ? `· ${selectedPatient.dni_nie}` : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

              <div className="flex justify-end">
                <button
                  onClick={() => setEditingPatient(!editingPatient)}
                  className="text-brand-600 hover:text-brand-700 font-bold"
                >
                  {editingPatient ? 'Cancelar edición' : 'Editar datos'}
                </button>
              </div>

              {editingPatient && (
                <form onSubmit={handleSavePatient} className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4">
                  {([
                    ['first_name', 'Nombre'], ['last_name', 'Apellidos'], ['phone', 'Teléfono'], ['dni_nie', 'DNI / NIE'], ['email', 'Email'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="font-bold text-slate-700">
                      {label}
                      <input
                        type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                        required={key !== 'email' && key !== 'dni_nie'}
                        value={patientForm[key]}
                        onChange={e => setPatientForm({ ...patientForm, [key]: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-normal"
                      />
                    </label>
                  ))}
                  <div className="col-span-2 flex justify-end">
                    <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white">Guardar cambios</button>
                  </div>
                </form>
              )}
              
              {/* Quick WhatsApp Action */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Comunicación directa WhatsApp (Wawp)</span>
                </div>
                <a
                  href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition"
                >
                  Abrir Chat
                </a>
              </div>

              {/* Expediente Médico / Alergias */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" /> Historial Médico Odontológico
                  </h4>
                  <button
                    onClick={() => setEditingMedical(!editingMedical)}
                    className="text-brand-600 hover:text-brand-700 font-bold"
                  >
                    {editingMedical ? 'Cancelar Edición' : 'Editar Historial'}
                  </button>
                </div>

                {editingMedical ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Alergias conocidas (penicilina, látex, etc.):</label>
                      <input
                        type="text"
                        value={medAllergies}
                        onChange={e => setMedAllergies(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Patologías (diabetes, hipertensión, cardiopatías):</label>
                      <input
                        type="text"
                        value={medConditions}
                        onChange={e => setMedConditions(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Medicación habitual:</label>
                      <input
                        type="text"
                        value={medMeds}
                        onChange={e => setMedMeds(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Notas clínicas médicas:</label>
                      <textarea
                        rows={3}
                        value={medNotes}
                        onChange={e => setMedNotes(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <button
                      onClick={handleSaveMedicalRecord}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      Guardar Historial
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900 block">Alergias:</span>
                      <span>{selectedPatient.medical_record?.allergies || 'Sin alergias notificadas'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Patologías:</span>
                      <span>{selectedPatient.medical_record?.medical_conditions || 'Ninguna patología relevante'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Medicación actual:</span>
                      <span>{selectedPatient.medical_record?.current_medications || 'Sin medicación'}</span>
                    </div>
                    {selectedPatient.medical_record?.clinical_notes && (
                      <div>
                        <span className="font-bold text-slate-900 block">Notas clínicas:</span>
                        <p className="text-slate-600 italic">{selectedPatient.medical_record.clinical_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Historial de Citas del Paciente */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Citas del Paciente</h4>
                {selectedPatient.appointments?.length === 0 ? (
                  <p className="text-slate-400">Sin citas registradas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedPatient.appointments?.map((a: any) => (
                      <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block">{a.service?.name}</strong>
                          <span className="text-slate-500">{new Date(a.start_time).toLocaleDateString('es-ES')} · Dr. {a.professional?.first_name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RGPD Compliance section */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Consentimiento RGPD activo</span>
                </div>
                <button
                  onClick={() => handleAnonymize(selectedPatient.id)}
                  className="text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Anonimizar paciente (RGPD)
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleDeletePatient(selectedPatient.id)}
                  className="text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar paciente
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA DE PACIENTE */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Alta de Nuevo Paciente</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI / NIE</label>
                  <input
                    type="text"
                    value={dniNie}
                    onChange={e => setDniNie(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alergias conocidas (médicas):</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  placeholder="Ej. Alergia a la penicilina"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Antecedentes médicos:</label>
                <input
                  type="text"
                  value={medicalConditions}
                  onChange={e => setMedicalConditions(e.target.value)}
                  placeholder="Ej. Hipertensión"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                >
                  Guardar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

