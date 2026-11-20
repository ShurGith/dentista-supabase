import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, MessageSquare, ShieldAlert } from 'lucide-react';

type NoticeType = 'error' | 'success' | 'info' | 'confirm';
/** danger: acción destructiva (rojo). whatsapp: pregunta sobre un envío por WhatsApp (esmeralda). */
type ConfirmTone = 'danger' | 'whatsapp';
type Notice = { type: NoticeType; title: string; message: string; confirmLabel?: string; cancelLabel?: string; tone?: ConfirmTone };

function NoticeModal({ notice, onClose }: { notice: Notice | null; onClose: (confirmed: boolean) => void }) {
  if (!notice) return null;
  const isWhatsApp = notice.type === 'confirm' && notice.tone === 'whatsapp';
  const Icon = isWhatsApp ? MessageSquare : notice.type === 'error' ? AlertCircle : notice.type === 'success' ? CheckCircle2 : notice.type === 'confirm' ? ShieldAlert : Info;
  const iconClass = isWhatsApp ? 'text-emerald-600 bg-emerald-50' : notice.type === 'error' ? 'text-red-600 bg-red-50' : notice.type === 'success' ? 'text-emerald-600 bg-emerald-50' : notice.type === 'confirm' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
  const actionClass = isWhatsApp
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : notice.type === 'error' || notice.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={e => e.stopPropagation()}>
      <section role={notice.type === 'confirm' || notice.type === 'error' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="notice-title" aria-describedby="notice-message" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}><Icon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 id="notice-title" className="text-base font-extrabold text-slate-900">{notice.title}</h2>
            <p id="notice-message" className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{notice.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {notice.type === 'confirm' && <button autoFocus onClick={() => onClose(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{notice.cancelLabel || 'Cancelar'}</button>}
          {/* En confirmaciones el foco va a Cancelar: un Intro accidental no ejecuta la acción. */}
          <button autoFocus={notice.type !== 'confirm'} onClick={() => onClose(notice.type === 'confirm')} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${actionClass}`}>
            {notice.type === 'confirm' ? (notice.confirmLabel || 'Confirmar') : 'Entendido'}
          </button>
        </div>
      </section>
    </div>
  );
}

export function useNoticeModal() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const resolveConfirm = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    setNotice(null);
    resolveConfirm.current?.(confirmed);
    resolveConfirm.current = null;
  }, []);
  const notify = useCallback((message: string, type: Exclude<NoticeType, 'confirm'> = 'error', title?: string) => {
    setNotice({ type, message, title: title || ({ error: 'No se pudo completar', success: 'Operación completada', info: 'Aviso' } as const)[type] });
  }, []);
  const confirm = useCallback((
    message: string,
    title = 'Confirmar acción',
    confirmLabel?: string,
    options: { cancelLabel?: string; tone?: ConfirmTone } = {},
  ) => new Promise<boolean>(resolve => {
    resolveConfirm.current = resolve;
    setNotice({ type: 'confirm', title, message, confirmLabel, ...options });
  }), []);

  return { notify, confirm, modal: <NoticeModal notice={notice} onClose={close} /> };
}
