import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../../api.js';
import {
  Calendar, Clock, User, Phone, CheckCircle2, XCircle,
  AlertCircle, MessageSquare, ChevronRight, Plus, RefreshCw, Filter, Trash2
} from 'lucide-react';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '@clinica-eugenia/shared';
import { useNoticeModal } from '../ui/NoticeModal.js';

const readableAppointmentError = (message: string | undefined, fallback: string) =>
  message?.includes('CONFLICT_BLOCKED_SLOT')
    ? 'Ese horario está bloqueado o corresponde a un festivo. Elige otra fecha u hora.'
    : message || fallback;

export const CrmCalendar: React.FC = () => {
  const notice = useNoticeModal();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  // Horario de apertura (clinic_schedules): las horas y días sin servicio quedan bloqueados en la agenda.
  const [clinicWeek, setClinicWeek] = useState<any[] | null>(null);

  // Filters
  const [filterProf, setFilterProf] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSlotDate, setCreateSlotDate] = useState<string>('');

  // Feedback message
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const showToast = (message: string, type: 'ok' | 'err' = 'ok') => {
    if (type === 'err') {
      notice.notify(message);
      return;
    }
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const [apptsData, profsData, srvsData, patientsData, schedulesData] = await Promise.all([
        api.getAppointments(),
        api.getProfessionals(),
        api.getServices(),
        api.getPatients(),
        api.getAllSchedules(),
      ]);

      setClinicWeek(schedulesData?.clinic_schedules || []);
      setAppointments(apptsData);
      setProfessionals(profsData);
      setServices(srvsData);
      setPatients(patientsData);

      // Map to FullCalendar events
      const fcEvents = apptsData
        .filter(a => !filterProf || a.professional_id === filterProf)
        .filter(a => !filterStatus || a.status === filterStatus)
        .map(a => {
          const profName = a.professional ? `${a.professional.first_name} ${a.professional.last_name}` : '';
          const patName = a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Paciente';
          const srvName = a.service?.name || 'Tratamiento';
          const color = APPOINTMENT_STATUS_COLORS[a.status] || a.professional?.color || 'rgb(var(--brand-600))';

          return {
            id: a.id,
            title: `${patName} · ${srvName}`,
            start: a.start_time,
            end: a.end_time,
            backgroundColor: color,
            borderColor: color,
            textColor: '#ffffff',
            extendedProps: {
              ...a,
              patientName: patName,
              professionalName: profName,
              serviceName: srvName,
            },
          };
        });

      setEvents(fcEvents);
    } catch (err: any) {
      console.error(err);
      showToast('Error cargando datos del calendario', 'err');
    }
  };

  useEffect(() => {
    loadData();
  }, [filterProf, filterStatus]);

  // Event Drop (Arrastrar y soltar)
  const handleEventDrop = async (info: any) => {
    const apptId = info.event.id;
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end.toISOString();
    if (new Date(newStart).getTime() < Date.now() - 3 * 60 * 60 * 1000) {
      info.revert();
      notice.notify('No se pueden programar citas anteriores a hace tres horas.');
      return;
    }
    const patientName = info.event.extendedProps.patientName || 'el paciente';
    const when = new Date(newStart).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
    const hasPhone = Boolean(info.event.extendedProps.patient?.phone);
    const notifyWhatsApp = hasPhone && await notice.confirm(
      `¿Quieres avisar a ${patientName} por WhatsApp de que su cita pasa al ${when}?`,
      'Avisar al paciente',
      'Enviar WhatsApp',
      { cancelLabel: 'No enviar', tone: 'whatsapp' },
    );

    try {
      await api.moveAppointment({
        appointment_id: apptId,
        start_time: newStart,
        end_time: newEnd,
        reason: 'Reprogramación arrastrando en calendario visual',
        notify_whatsapp: notifyWhatsApp,
      });
      showToast(notifyWhatsApp ? 'Cita reprogramada y aviso de WhatsApp solicitado' : 'Cita reprogramada');
      loadData();
    } catch (err: any) {
      info.revert();
      showToast(readableAppointmentError(err.message, 'No se puede mover la cita: hueco ocupado o fuera de horario.'), 'err');
    }
  };

  // Event Resize (Cambio de duración)
  const handleEventResize = async (info: any) => {
    const apptId = info.event.id;
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end.toISOString();
    const durationMinutes = Math.round((info.event.end.getTime() - info.event.start.getTime()) / 60000);

    try {
      await api.resizeAppointment({
        appointment_id: apptId,
        start_time: newStart,
        end_time: newEnd,
        duration_minutes: durationMinutes,
      });
      showToast(`Duración actualizada a ${durationMinutes} minutos`);
      loadData();
    } catch (err: any) {
      info.revert();
      showToast(readableAppointmentError(err.message, 'No se puede cambiar la duración: entra en conflicto con otra cita.'), 'err');
    }
  };

  // Event Click (Abrir detalle)
  const handleEventClick = (info: any) => {
    const appt = appointments.find(a => a.id === info.event.id);
    if (appt) {
      setSelectedAppointment(appt);
      setIsDetailOpen(true);
    }
  };

  // Tramos de trabajo por día en formato FullCalendar (la pausa del mediodía parte el día en dos).
  const businessHours = useMemo(() => (clinicWeek || []).flatMap((d: any) => {
    if (d.is_closed) return [];
    const open = d.open_time.slice(0, 5), close = d.close_time.slice(0, 5);
    const ls = d.lunch_start?.slice(0, 5), le = d.lunch_end?.slice(0, 5);
    const ranges = ls && le && open < ls && ls < le && le < close ? [[open, ls], [le, close]] : [[open, close]];
    return ranges.map(([startTime, endTime]) => ({ daysOfWeek: [d.day_of_week], startTime, endTime }));
  }), [clinicWeek]);

  // La vista empieza 1 h antes de la primera apertura y acaba 1 h después del último cierre.
  const [slotMin, slotMax] = useMemo(() => {
    const open = (clinicWeek || []).filter((d: any) => !d.is_closed);
    if (!open.length) return ['08:00:00', '21:00:00'];
    const toH = (t: string) => Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60;
    const min = Math.max(0, Math.floor(Math.min(...open.map((d: any) => toH(d.open_time)))) - 1);
    const max = Math.min(24, Math.ceil(Math.max(...open.map((d: any) => toH(d.close_time)))) + 1);
    return [`${String(min).padStart(2, '0')}:00:00`, `${String(max).padStart(2, '0')}:00:00`];
  }, [clinicWeek]);

  /** ¿El instante (o el día, si allDay) cae en horario de apertura? */
  const isBookable = (date: Date, allDay: boolean) => {
    const day = date.getDay();
    const ranges = businessHours.filter(b => b.daysOfWeek[0] === day);
    if (!ranges.length) return false;
    if (allDay) return true;
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return ranges.some(r => hm >= r.startTime && hm < r.endTime);
  };

  // Date Click (Crear cita en hueco libre)
  const handleDateClick = (info: any) => {
    if (!isBookable(info.date, info.allDay)) {
      notice.notify(
        info.allDay
          ? 'La clínica no abre ese día, así que no se pueden crear citas en él.'
          : 'Esa hora está fuera del horario de apertura de la clínica. Elige un hueco dentro del horario (las zonas grises están cerradas).',
        'info',
        'Horario no disponible',
      );
      return;
    }
    setCreateSlotDate(info.dateStr);
    setIsCreateOpen(true);
  };

  // Status Change
  const handleChangeStatus = async (newStatus: string, reason?: string) => {
    if (!selectedAppointment) return;
    try {
      await api.updateAppointmentStatus(selectedAppointment.id, newStatus, reason);
      showToast(`Cita marcada como ${APPOINTMENT_STATUS_LABELS[newStatus] || newStatus}`);
      setIsDetailOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado', 'err');
    }
  };

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const handleSendAppointmentWhatsApp = async () => {
    const appt = selectedAppointment;
    const phone = appt?.patient?.phone;
    if (!appt || !phone || sendingWhatsApp) return;

    const name = [appt.patient?.first_name, appt.patient?.last_name].filter(Boolean).join(' ') || 'el paciente';
    const start = new Date(appt.start_time);
    const confirmed = await notice.confirm(
      `Se enviará a ${name} la confirmación de su cita por WhatsApp.`,
      'Enviar confirmación',
      'Enviar WhatsApp',
      { cancelLabel: 'Cancelar', tone: 'whatsapp' },
    );
    if (!confirmed) return;

    setSendingWhatsApp(true);
    try {
      await api.sendWhatsAppMessage({
        phone_number: phone,
        content: 'Confirmación de cita',
        template_code: 'cita_confirmada',
        template_variables: {
          nombre: appt.patient.first_name,
          fecha: start.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          hora: start.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }),
          profesional: `${appt.professional?.first_name || ''} ${appt.professional?.last_name || ''}`.trim(),
          servicio: appt.service?.name || 'Tratamiento dental',
          enlace_gestion: `${window.location.origin}/reserva/gestion/${appt.id}`,
        },
        appointment_id: appt.id,
      });
      showToast('Confirmación enviada por WhatsApp');
    } catch (err: any) {
      notice.notify(
        err.message || 'No se pudo enviar el WhatsApp con Wawp.',
        'error',
        err.code === 'BLOCKED_BY_DEV_MODE' ? 'Modo de pruebas activo' : undefined,
      );
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Eliminar cita: 1) confirmar el borrado; 2) preguntar si se avisa al paciente por WhatsApp.
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAppointment = async () => {
    const appt = selectedAppointment;
    if (!appt || deleting) return;
    const name = [appt.patient?.first_name, appt.patient?.last_name].filter(Boolean).join(' ') || 'este paciente';
    const start = new Date(appt.start_time);
    const when = `${start.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' })} a las ${start.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })}`;

    const confirmed = await notice.confirm(
      `Se eliminará la cita de ${name} del ${when}${appt.service?.name ? ` (${appt.service.name})` : ''}.\n\n` +
      'También se borran sus recordatorios pendientes. Esta acción no se puede deshacer.',
      'Eliminar cita',
      'Eliminar cita',
      { cancelLabel: 'Volver' },
    );
    if (!confirmed) return;

    let notify = false;
    if (appt.patient?.phone) {
      notify = await notice.confirm(
        `¿Quieres enviar a ${name} un WhatsApp informándole de que su cita del ${when} ha sido cancelada?`,
        'Avisar al paciente',
        'Enviar WhatsApp',
        { cancelLabel: 'No enviar', tone: 'whatsapp' },
      );
    }

    setDeleting(true);
    try {
      const result = await api.deleteAppointment(appt.id, notify);
      setIsDetailOpen(false);
      setSelectedAppointment(null);
      loadData();
      if (result.whatsapp.requested && !result.whatsapp.sent) {
        notice.notify(
          `La cita se ha eliminado correctamente, pero el WhatsApp al paciente no se ha enviado.\n\nMotivo: ${result.whatsapp.error || 'error desconocido'}`,
          'info',
          'Cita eliminada · WhatsApp no enviado',
        );
      } else {
        showToast(result.whatsapp.sent ? 'Cita eliminada y paciente avisado por WhatsApp' : 'Cita eliminada');
      }
    } catch (err: any) {
      showToast(err.message || 'No se pudo eliminar la cita', 'err');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice.modal}
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition animate-in fade-in ${
            toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Bar with Filters and Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={filterProf}
            onChange={(e) => setFilterProf(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="">Todos los odontólogos</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="">Todos los estados</option>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {(filterProf || filterStatus) && (
            <button
              onClick={() => { setFilterProf(''); setFilterStatus(''); }}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Recargar agenda"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCreateSlotDate(new Date().toISOString()); setIsCreateOpen(true); }}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva Cita
          </button>
        </div>
      </div>

      {/* FullCalendar Interactive Container */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={window.matchMedia('(max-width: 639px)').matches ? 'timeGridDay' : 'timeGridWeek'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek',
          }}
          locale="es"
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            list: 'Lista',
          }}
          slotMinTime={slotMin}
          slotMaxTime={slotMax}
          businessHours={businessHours}
          eventConstraint="businessHours"
          selectConstraint="businessHours"
          slotDuration="00:15:00"
          slotLabelInterval="01:00"
          allDaySlot={false}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          height="auto"
        />
      </div>

      {/* MODAL DETALLE DE CITA */}
      {isDetailOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest block">
                  Detalle de la Cita
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tratamiento:</span>
                  <span className="font-bold text-slate-900">{selectedAppointment.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Odontólogo:</span>
                  <span className="font-bold text-slate-900">{selectedAppointment.professional?.first_name} {selectedAppointment.professional?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gabinete:</span>
                  <span className="font-bold text-slate-900">{selectedAppointment.operatory?.name || 'Gabinete 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Horario:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedAppointment.start_time).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(selectedAppointment.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedAppointment.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400">Estado actual:</span>
                  <span className="font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800">
                    {APPOINTMENT_STATUS_LABELS[selectedAppointment.status] || selectedAppointment.status}
                  </span>
                </div>
              </div>

              {selectedAppointment.patient_notes && (
                <div className="p-3 rounded-xl bg-slate-50 text-slate-600 text-xs">
                  <strong className="block text-slate-800">Notas del paciente:</strong>
                  {selectedAppointment.patient_notes}
                </div>
              )}
            </div>

            {/* Quick Status Change Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">Cambiar estado de la cita:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleChangeStatus('confirmed')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmada
                </button>
                <button
                  onClick={() => handleChangeStatus('in_waiting_room')}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" /> En Sala de Espera
                </button>
                <button
                  onClick={() => handleChangeStatus('completed')}
                  className="bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completada
                </button>
                <button
                  onClick={() => handleChangeStatus('cancelled_by_patient', 'Solicitud del paciente')}
                  className="bg-red-50 hover:bg-red-100 text-red-800 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" /> Volver
                </button>
              </div>
            </div>

            {/* WhatsApp Trigger */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSendAppointmentWhatsApp}
                disabled={!selectedAppointment.patient?.phone || sendingWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> {sendingWhatsApp ? 'Enviando WhatsApp…' : 'Enviar WhatsApp con Wawp'}
              </button>
            </div>

            {/* Eliminar cita (con confirmación y aviso opcional por WhatsApp) */}
            <button
              type="button"
              onClick={handleDeleteAppointment}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-red-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 active:translate-y-0 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-red-600 disabled:hover:shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> {deleting ? 'Eliminando…' : 'Eliminar cita'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA CITA */}
      {isCreateOpen && (
        <CreateAppointmentModal
          isOpen={isCreateOpen}
          initialDate={createSlotDate}
          clinicWeek={clinicWeek}
          patients={patients}
          professionals={professionals}
          services={services}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            showToast('Cita creada con éxito');
            loadData();
          }}
        />
      )}

    </div>
  );
};

// Modal secundario para crear cita
const CreateAppointmentModal: React.FC<any> = ({
  isOpen, initialDate, clinicWeek, patients, professionals, services, onClose, onSuccess
}) => {
  const notice = useNoticeModal();
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [profId, setProfId] = useState(professionals[0]?.id || '');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [dateStr, setDateStr] = useState(initialDate ? initialDate.split('T')[0] : '');
  const [timeStr, setTimeStr] = useState(initialDate && initialDate.includes('T') ? initialDate.split('T')[1].slice(0, 5) : '10:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const dateOptions = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    return Array.from({ length: 90 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const row = clinicWeek?.find((day: any) => day.day_of_week === date.getDay());
      const close = row?.close_time?.slice(0, 5);
      const enabled = Boolean(row && !row.is_closed && close && new Date(`${value}T${close}:00`).getTime() > cutoff);
      return {
        value,
        enabled,
        label: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });
  }, [clinicWeek]);

  useEffect(() => {
    if (!dateOptions.some(option => option.value === dateStr && option.enabled)) {
      setDateStr(dateOptions.find(option => option.enabled)?.value || '');
    }
  }, [dateOptions, dateStr]);

  useEffect(() => {
    if (!dateStr || !serviceId || !profId) {
      setAvailableSlots([]);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    api.getAvailableSlots({ service_id: serviceId, professional_id: profId, date: dateStr })
      .then(slots => { if (active) setAvailableSlots(slots); })
      .catch(() => { if (active) setAvailableSlots([]); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [dateStr, serviceId, profId]);

  useEffect(() => {
    if (availableSlots.length && !availableSlots.some(slot => slot.time_label === timeStr)) {
      setTimeStr(availableSlots[0].time_label);
    }
  }, [availableSlots, timeStr]);

  const availableTimes = new Set(availableSlots.map(slot => slot.time_label));
  const selectedHour = timeStr.slice(0, 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startTime = `${dateStr}T${timeStr}:00+01:00`;
      await api.createAppointment({
        patient_id: patientId,
        professional_id: profId,
        service_id: serviceId,
        start_time: startTime,
        patient_notes: notes || undefined,
        status: 'confirmed',
      });
      onSuccess();
    } catch (err: any) {
      notice.notify(readableAppointmentError(err.message, 'Error creando la cita. Puede existir solapamiento de horario.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      {notice.modal}
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900">Nueva Cita en Agenda</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Paciente *</label>
            <select
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              required
            >
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tratamiento dental *</label>
            <select
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              required
            >
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Odontólogo *</label>
            <select
              value={profId}
              onChange={e => setProfId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              required
            >
              {professionals.map((p: any) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha *</label>
              <select
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {dateOptions.map(option => <option key={option.value} value={option.value} disabled={!option.enabled}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hora *</label>
              <select
                required
                value={selectedHour}
                onChange={e => setTimeStr(availableSlots.find(slot => slot.time_label.startsWith(`${e.target.value}:`))?.time_label || `${e.target.value}:00`)}
                disabled={loadingSlots || availableSlots.length === 0}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-100"
              >
                {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map(hour => (
                  <option key={hour} value={hour} disabled={!Array.from(availableTimes).some(time => time.startsWith(`${hour}:`))}>{hour}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Minutos *</label>
              <select
                required
                value={timeStr.slice(3, 5)}
                onChange={e => setTimeStr(`${selectedHour}:${e.target.value}`)}
                disabled={loadingSlots || availableSlots.length === 0}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-100"
              >
                {[0, 15, 30, 45].map(minute => {
                  const value = String(minute).padStart(2, '0');
                  return <option key={value} value={value} disabled={!availableTimes.has(`${selectedHour}:${value}`)}>{value}</option>;
                })}
              </select>
            </div>
          </div>
          {loadingSlots && <p className="text-[11px] text-slate-400">Comprobando huecos disponibles…</p>}
          {!loadingSlots && dateStr && availableSlots.length === 0 && <p className="text-[11px] text-amber-700">No hay huecos disponibles en esa fecha para este tratamiento y odontólogo.</p>}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notas:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalle o motivo..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !availableTimes.has(timeStr)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
            >
              {loading ? 'Guardando...' : 'Crear Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

