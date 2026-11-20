import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import {
  Calendar, Users, Clock, AlertCircle, CheckCircle2,
  XCircle, MessageSquare, TrendingUp, Sparkles, UserCheck
} from 'lucide-react';

interface CrmDashboardProps {
  onGoToCalendar: () => void;
  onGoToWhatsApp: () => void;
  onGoToPatients: () => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({
  onGoToCalendar,
  onGoToWhatsApp,
  onGoToPatients,
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAppointments(),
      api.getPatients(),
    ])
      .then(([apptsData, patientsData]) => {
        setAppointments(apptsData);
        setPatients(patientsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.start_time?.startsWith(todayStr));
  const pendingConfirmation = appointments.filter(a => a.status === 'pending');
  const confirmedToday = todayAppointments.filter(a => a.status === 'confirmed');
  const inWaitingRoom = todayAppointments.filter(a => a.status === 'in_waiting_room');
  const cancelledCount = appointments.filter(a => a.status.startsWith('cancelled')).length;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Operativo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de actividad clínica, ocupación de sillones y estado de citas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToCalendar}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" /> Ver Agenda en Calendario
          </button>
        </div>
      </div>

      {/* KPI Cards (Zero Financial Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Citas Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{todayAppointments.length}</span>
            <span className="text-xs font-semibold text-emerald-600">
              {confirmedToday.length} confirmadas
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sala de Espera</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-brand-600">{inWaitingRoom.length}</span>
            <span className="text-xs text-slate-500">pacientes listos</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por Confirmar</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{pendingConfirmation.length}</span>
            <span className="text-xs text-slate-500">pendientes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{patients.length}</span>
            <span className="text-xs text-slate-500">expedientes activos</span>
          </div>
        </div>

      </div>

      {/* Main Content Grid: Citas de Hoy + Alertas Operativas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Appointments List */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base">Agenda de Hoy ({todayStr})</h3>
            <span className="text-xs text-slate-400 font-semibold">{todayAppointments.length} programadas</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando agenda...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay citas programadas para hoy. Puedes consultar los próximos días en la pestaña de Calendario.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayAppointments.map((appt) => (
                <div key={appt.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {new Date(appt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {appt.patient?.first_name} {appt.patient?.last_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {appt.service?.name} · <span className="text-brand-700 font-medium">{appt.professional?.first_name} {appt.professional?.last_name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        appt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                        appt.status === 'in_waiting_room' ? 'bg-sky-50 text-sky-700' :
                        appt.status === 'completed' ? 'bg-brand-50 text-brand-800' :
                        'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Alerts & WhatsApp Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Alertas Operativas
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{pendingConfirmation.length} citas sin confirmar</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">Se han enviado recordatorios por WhatsApp.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pasarela Wawp activa</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Automatizaciones y webhooks en funcionamiento.</p>
                </div>
              </div>
            </div>

            <button
              onClick={onGoToWhatsApp}
              className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Abrir Bandeja de WhatsApp
            </button>
          </div>

          {/* Gabinetes / Operatories status */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Estado de Gabinetes</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="font-medium text-slate-700">Gabinete 1 (General)</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="font-medium text-slate-700">Gabinete 2 (Ortodoncia)</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="font-medium text-slate-700">Gabinete 3 (Cirugía)</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

