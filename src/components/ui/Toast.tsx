import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  variant?: ToastVariant;
  onAction?: () => void;
  durationMs?: number;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  onAction?: () => void;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-win/40 text-win',
  error: 'border-loss/40 text-loss',
  info: 'border-line text-text',
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const { variant = 'info', onAction, durationMs = 3000 } = options;
      const id = nextId++;
      setToasts((current) => [...current, { id, message, variant, onAction }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => {
            const classes = clsx(
              'w-full max-w-sm rounded-xl border bg-surface-2 px-4 py-3 text-left text-sm shadow-lg',
              variantClasses[toast.variant],
            );
            return toast.onAction ? (
              <button
                key={toast.id}
                type="button"
                role="status"
                className={classes}
                onClick={() => {
                  toast.onAction?.();
                  dismiss(toast.id);
                }}
              >
                {toast.message}
              </button>
            ) : (
              <div key={toast.id} role="status" className={classes}>
                {toast.message}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
