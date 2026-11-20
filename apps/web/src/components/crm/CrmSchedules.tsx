import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import {
  Clock, Calendar, AlertCircle, Plus, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { DAY_NAMES_ES } from '@clinica-eugenia/shared';
import { useNoticeModal } from '../ui/NoticeModal.js';

export const CrmSchedules: React.FC = () => {
  const notice = useNoticeModal();
  const [schedulesData, setSchedulesData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // New blocked slot form
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.getAllSchedules()
      .then(res => setSchedulesData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBlock(true);
    try {
      await api.createBlockedSlot({
        reason: blockReason,
        start_time: blockStart,
        end_time: blockEnd,
        is_all_day: false,
      });
      setIsBlockModalOpen(false);
      setBlockReason('');
      setBlockStart('');
      setBlockEnd('');
      loadData();
    } catch (err: any) {
      notice.notify(err.message || 'Error creando bloqueo.');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!await notice.confirm('¿Eliminar este bloqueo de agenda?', 'Eliminar bloqueo')) return;
    try {
      await api.deleteBlockedSlot(id);
      loadData();
    } catch (err: any) {
      notice.notify(err.message || 'Error eliminando bloqueo.');
    }
  };

  return (
    <div className="space-y-6">
      {notice.modal}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestión de Horarios y Bloqueos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta del horario semanal y gestión de festivos, cierres y bloqueos de agenda.
          </p>
        </div>

        <button
          onClick={() => setIsBlockModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Añadir Bloqueo / Festivo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Horario General de la Clínica */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" /> Horario Semanal de la Clínica
            </h3>
            <span className="text-xs text-slate-400">Se edita en Configuración</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando horarios...</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5, 6, 0].map(dayNum => {
                const item = (schedulesData?.clinic_schedules || []).find((s: any) => s.day_of_week === dayNum);
                return (
                  <div key={dayNum} className="py-3 flex items-center justify-between">
                    <span className="font-bold text-slate-800 w-24">{DAY_NAMES_ES[dayNum]}</span>
                    {item?.is_closed ? (
                      <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-semibold">Cerrado</span>
                    ) : (
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{item?.open_time?.slice(0, 5)} - {item?.close_time?.slice(0, 5)}</span>
                        {item?.lunch_start && (
                          <span className="block text-[10px] text-slate-400">
                            Pausa: {item.lunch_start.slice(0, 5)} - {item.lunch_end?.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bloqueos y Excepciones de Agenda */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Excepciones y Bloqueos de Agenda
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{schedulesData?.blocked_slots?.length || 0} activos</span>
          </div>

          <p className="text-xs text-slate-500">
            Los bloqueos impiden que se reserven citas en las fechas/horas indicadas, tanto en el panel CRM como en la web pública.
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando bloqueos...</div>
          ) : (schedulesData?.blocked_slots || []).length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
              No hay bloqueos activos actualmente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {schedulesData.blocked_slots.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">{b.reason}</strong>
                    <span className="text-[11px] text-slate-500">
                      {new Date(b.start_time).toLocaleString('es-ES')} → {new Date(b.end_time).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Eliminar bloqueo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL NUEVO BLOQUEO */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Añadir Bloqueo de Agenda</h3>
              <button onClick={() => setIsBlockModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo o justificación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Festivo local, Mantenimiento sillón dental, Congreso médico"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y hora de inicio *</label>
                <input
                  type="datetime-local"
                  required
                  value={blockStart}
                  onChange={e => setBlockStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y hora de fin *</label>
                <input
                  type="datetime-local"
                  required
                  value={blockEnd}
                  onChange={e => setBlockEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBlock}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
                >
                  {savingBlock ? 'Guardando...' : 'Crear Bloqueo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

