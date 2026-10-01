import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: null,
  showToast: () => {},
  dismissToast: () => {},
});

// Errors linger longer than confirmations: a student who has just been told
// their video is 40 MB and must be under 25 MB needs longer to read and act on
// it than to notice a success message.
const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  error: 6000,
};

const TONE: Record<ToastType, string> = {
  success: 'bg-surface-inverse text-ink-inverse',
  info: 'bg-surface-inverse text-ink-inverse',
  error: 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30',
};

/**
 * Portal-wide toast notifications.
 *
 * Inline error text on an upload form sits below the fold on a phone and gets
 * scrolled past while the student is watching an upload progress bar, so the
 * outcome of an action is announced in a fixed viewport-layer toast instead.
 * Mounted once in App; pages just call `useToast()`.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      clearTimer();
      setToast({ message, type });
      timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS[type]);
    },
    [clearTimer],
  );

  // A pending timer must not fire after the provider unmounts on logout.
  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(
    () => ({ toast, showToast, dismissToast }),
    [toast, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          className={`safe-area-pt pointer-events-none fixed left-4 right-4 top-5 z-toast sm:left-auto sm:right-5 sm:max-w-sm animate-fade-in ${TONE[toast.type]}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-xs font-semibold shadow-modal">
            {toast.type === 'error' ? (
              <AlertCircle className="mt-px w-4 h-4 shrink-0" aria-hidden="true" />
            ) : toast.type === 'info' ? (
              <Info className="mt-px w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle className="mt-px w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="shrink-0 rounded opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);