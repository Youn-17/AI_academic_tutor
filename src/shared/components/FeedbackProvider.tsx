import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Locale } from '@/types';
import { cn } from '@/lib/utils';

// One small deep module for all transient user feedback: toasts (replaces scattered alert()) and a
// promise-based bilingual confirm dialog (replaces native confirm(), which can't be styled or
// localized). Callers pass already-localized message text; the provider supplies default OK/Cancel
// labels from `locale`. Mounted once at the app root.

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
interface ConfirmOpts {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface FeedbackCtx {
  toast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used within FeedbackProvider');
  return c.toast;
}
export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConfirm must be used within FeedbackProvider');
  return c.confirm;
}

let _id = 0;

const TOAST_STYLE: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  info: 'bg-slate-800 border-slate-700 text-white',
};
function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle2 size={16} className="flex-shrink-0" />;
  if (type === 'error') return <AlertCircle size={16} className="flex-shrink-0" />;
  return <Info size={16} className="flex-shrink-0" />;
}

export const FeedbackProvider: React.FC<{ locale: Locale; children: React.ReactNode }> = ({
  locale,
  children,
}) => {
  const en = locale === 'en';
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      {createPortal(
        <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex max-w-xs items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg animate-in fade-in slide-in-from-top-2',
                TOAST_STYLE[t.type],
              )}
            >
              <ToastIcon type={t.type} />
              <span className="leading-snug">{t.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}

      {confirmState &&
        createPortal(
          <div
            className="fixed inset-0 z-[101] flex items-center justify-center bg-black/40 p-4 animate-in fade-in"
            onClick={() => closeConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {confirmState.title && (
                <h3 className="mb-2 text-base font-semibold text-slate-800">{confirmState.title}</h3>
              )}
              <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {confirmState.message}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => closeConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  {confirmState.cancelText || (en ? 'Cancel' : '取消')}
                </button>
                <button
                  onClick={() => closeConfirm(true)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                    confirmState.danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700',
                  )}
                >
                  {confirmState.confirmText || (en ? 'Confirm' : '确认')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
};
