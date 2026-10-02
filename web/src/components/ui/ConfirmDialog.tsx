import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  /** One or two lines saying what will happen. Say plainly if it cannot be undone. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for anything that destroys data. Defaults to `primary`. */
  tone?: 'primary' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

/**
 * Replaces `window.confirm`.
 *
 * Eight flows deleted something the student had uploaded, and each asked with a
 * browser alert: unstyled, unthemeable, blocked on the main thread, and on iOS
 * it renders the page URL above the message. This gives those flows the same
 * dialog as the rest of the app, with the destructive action marked as such and
 * Cancel focused first.
 *
 * Mounted once in `App`; call sites just do
 *   `if (!(await confirm({ ... }))) return;`
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const handleClose = useCallback(() => settle(false), [settle]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={request !== null}
        onClose={handleClose}
        title={request?.title ?? ''}
        description={request?.description}
        size="sm"
        initialFocusRef={cancelRef}
        footer={
          <>
            <button ref={cancelRef} type="button" onClick={() => settle(false)} className="btn btn-secondary">
              {request?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => settle(true)}
              className={`btn ${request?.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            >
              {request?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);

export default ConfirmProvider;
