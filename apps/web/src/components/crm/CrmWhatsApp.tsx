import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api.js';
import {
  MessageSquare, Send, Check, CheckCheck, Clock, User,
  Sparkles, RefreshCw, Smartphone, Phone, AlertCircle, Trash2
} from 'lucide-react';
import { useNoticeModal } from '../ui/NoticeModal.js';

const CLINIC_TZ = 'Europe/Madrid';
const dayKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString('es-ES', { timeZone: CLINIC_TZ, hour: '2-digit', minute: '2-digit' });

// "Hoy", "Ayer", "lunes, 17 nov" o "14 jul 2023" según la distancia al día actual.
function dayLabel(value: string) {
  const key = dayKey(value);
  const now = new Date();
  if (key === dayKey(now)) return 'Hoy';
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return 'Ayer';
  const sameYear = key.slice(0, 4) === dayKey(now).slice(0, 4);
  return new Date(value).toLocaleDateString('es-ES', sameYear
    ? { timeZone: CLINIC_TZ, weekday: 'long', day: 'numeric', month: 'short' }
    : { timeZone: CLINIC_TZ, day: 'numeric', month: 'short', year: 'numeric' });
}

// En la lista de chats: hora si es de hoy; si no, "Ayer" o la fecha corta.
function listStamp(value: string) {
  const label = dayLabel(value);
  if (label === 'Hoy') return timeLabel(value);
  if (label === 'Ayer') return 'Ayer';
  return new Date(value).toLocaleDateString('es-ES', { timeZone: CLINIC_TZ, day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const CrmWhatsApp: React.FC = () => {
  const notice = useNoticeModal();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');

  // Send input
  const [inputMessage, setInputMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sending, setSending] = useState(false);

  // Simulator
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [simPhone, setSimPhone] = useState('+34611223344');
  const [simText, setSimText] = useState('SÍ, confirmo mi asistencia a la cita de mañana');

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
      setLoadError('');
      setSelectedConv((current: any) => data.find(c => c.id === current?.id) || data[0] || null);
    } catch (e) {
      console.error(e);
      setLoadError('No se pudieron cargar las conversaciones guardadas. Comprueba la conexión con el backend.');
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await api.getConversationMessages(convId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    api.getMessageTemplates().then(setTemplates).catch(console.error);
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      const interval = setInterval(() => loadMessages(selectedConv.id), 5000);
      return () => clearInterval(interval);
    }
    setMessages([]);
  }, [selectedConv?.id, loadMessages]);

  // Scroll al último mensaje: siempre al abrir un chat; con mensajes nuevos solo si ya estaba abajo.
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrolledConvRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => { stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [selectedConv?.id]);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el || !messages.length) return;
    const isNewConversation = scrolledConvRef.current !== messages[0].conversation_id;
    if (isNewConversation || stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      scrolledConvRef.current = messages[0].conversation_id;
      stickToBottomRef.current = true;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConv) return;
    const recipient = selectedConv.contact?.phone_number || selectedConv.patient?.phone;

    setSending(true);
    try {
      await api.sendWhatsAppMessage({
        conversation_id: selectedConv.id,
        phone_number: recipient,
        content: inputMessage.trim(),
      });
      setInputMessage('');
      loadMessages(selectedConv.id);
      loadConversations();
    } catch (err: any) {
      notice.notify(
        err.message || 'Error enviando mensaje por Wawp.',
        'error',
        err.code === 'BLOCKED_BY_DEV_MODE' ? 'Modo de pruebas activo' : undefined,
      );
    } finally {
      setSending(false);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteConversation = async () => {
    if (!selectedConv || deleting) return;
    const name = selectedConv.patient
      ? `${selectedConv.patient.first_name} ${selectedConv.patient.last_name}`
      : (selectedConv.contact?.display_name || selectedConv.contact?.phone_number || 'este contacto');
    const ok = await notice.confirm(
      `Se eliminará la conversación con ${name} y ${messages.length === 1 ? 'su mensaje guardado' : `sus ${messages.length} mensajes guardados`} en el CRM.\n\n` +
      'Esta acción no se puede deshacer. El chat no se borra de WhatsApp, y el contacto se conserva.',
      'Eliminar conversación',
      'Eliminar',
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await api.deleteConversation(selectedConv.id);
      setConversations(current => current.filter(c => c.id !== selectedConv.id));
      setSelectedConv(null);
      setMessages([]);
      await loadConversations();
    } catch (err: any) {
      notice.notify(err.message || 'No se pudo eliminar la conversación.');
    } finally {
      setDeleting(false);
    }
  };

  const handleApplyTemplate = (tmplCode: string) => {
    setSelectedTemplate(tmplCode);
    const tmpl = templates.find(t => t.code === tmplCode);
    if (tmpl) {
      // Sustituir variables con datos del paciente seleccionado si existen
      let txt = tmpl.body_text;
      const patName = selectedConv?.patient?.first_name || selectedConv?.contact?.display_name || 'Paciente';
      txt = txt.replace(/{{nombre}}/g, patName);
      txt = txt.replace(/{{fecha}}/g, 'mañana');
      txt = txt.replace(/{{hora}}/g, '10:00');
      txt = txt.replace(/{{profesional}}/g, 'Dra. Eugenia Martínez');
      txt = txt.replace(/{{servicio}}/g, 'Revisión y Diagnóstico');
      txt = txt.replace(/{{enlace_confirmar}}/g, 'https://clinicadentaleugenia.es/citas/confirmar');
      setInputMessage(txt);
    }
  };

  const handleSimulateIncoming = async () => {
    try {
      await api.simulateIncomingWhatsApp(simPhone, simText);
      setIsSimOpen(false);
      notice.notify('Mensaje simulado procesado por el webhook de Wawp.', 'success');
      loadConversations();
      if (selectedConv) loadMessages(selectedConv.id);
    } catch (e: any) {
      notice.notify(e.message || 'Error simulando mensaje');
    }
  };

  return (
    <div className="space-y-6">
      {notice.modal}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" /> Bandeja de WhatsApp (Wawp)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sincronización bidireccional, plantillas con variables y confirmaciones automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Smartphone className="w-4 h-4" /> Simular Mensaje Entrante
          </button>
          <button
            onClick={() => { loadConversations(); if (selectedConv) loadMessages(selectedConv.id); }}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refrescar bandeja"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two-Column Chat Workspace */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden grid grid-cols-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] md:grid-cols-12 md:grid-rows-[minmax(0,1fr)] h-[680px]">
        {/* minmax(0,…) fija la fila a la altura de la caja: así las listas hacen scroll en vez de desbordar. */}

        {/* Left Column: Conversations List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col min-h-0 bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Conversaciones Activas ({conversations.length})
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {loadError ? (
              <div className="p-8 text-center text-xs text-rose-600">{loadError}</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay conversaciones activas aún.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConv?.id === c.id;
                const contactName = c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : (c.contact?.display_name || c.contact?.phone_number || 'Contacto');

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className={`w-full text-left p-4 transition flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-brand-50/70 border-l-4 border-brand-600' : 'hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs truncate">{contactName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.last_message_at ? listStamp(c.last_message_at) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{c.last_message_text || 'Sin mensajes'}</p>
                    </div>

                    {c.unread_count > 0 && (
                      <span className="bg-emerald-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread */}
        <div className="md:col-span-8 flex flex-col min-h-0 bg-slate-100/50">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    WA
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {selectedConv.patient ? `${selectedConv.patient.first_name} ${selectedConv.patient.last_name}` : (selectedConv.contact?.display_name || selectedConv.contact?.phone_number)}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedConv.contact?.phone_number || selectedConv.patient?.phone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Wawp Online
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    disabled={deleting}
                    title="Eliminar conversación"
                    aria-label="Eliminar conversación"
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
                {messages.map((m, i) => {
                  const isOutbound = m.direction === 'outbound';
                  const startsDay = i === 0 || dayKey(m.sent_at) !== dayKey(messages[i - 1].sent_at);

                  return (
                    <React.Fragment key={m.id}>
                    {startsDay && (
                      <div className="flex justify-center pt-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-white/90 border border-slate-200/80 px-3 py-1 rounded-full shadow-sm first-letter:uppercase">
                          {dayLabel(m.sent_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3.5 text-xs shadow-sm space-y-1 ${
                          isOutbound
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <div className={`flex items-center justify-end gap-1 text-[9px] ${isOutbound ? 'text-emerald-100' : 'text-slate-400'}`}>
                          <span title={new Date(m.sent_at).toLocaleString('es-ES', { timeZone: CLINIC_TZ })}>{timeLabel(m.sent_at)}</span>
                          {isOutbound && (
                            m.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-white" /> :
                            m.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 opacity-80" /> :
                            <Check className="w-3 h-3 opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Chat Input & Template Bar */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-3">
                {/* Templates quick selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Plantillas Wawp:</span>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleApplyTemplate(t.code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 font-semibold text-[11px] whitespace-nowrap transition"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe un mensaje de WhatsApp para el paciente..."
                    className="flex-1 p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 rounded-xl text-xs transition flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Selecciona una conversación a la izquierda.
            </div>
          )}
        </div>

      </div>

      {/* MODAL SIMULADOR MENSAJES WAWP */}
      {isSimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" /> Simulador de Webhook Wawp
              </h3>
              <button onClick={() => setIsSimOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Simula que un paciente responde al WhatsApp de la clínica para probar el webhook, la recepción en tiempo real y la auto-confirmación de citas.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfono remitente:</label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={e => setSimPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto del mensaje entrante:</label>
                <textarea
                  rows={3}
                  value={simText}
                  onChange={e => setSimText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip: escribe "SÍ" o "CONFIRMAR" para disparar la confirmación automática de cita del paciente.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSimOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSimulateIncoming}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
              >
                Disparar Webhook
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

