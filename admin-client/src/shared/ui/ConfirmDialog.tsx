import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dialog } from './Dialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

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
      <Dialog
        open={request !== null}
        onClose={handleClose}
        title={request?.title ?? ''}
        size="sm"
        initialFocusRef={cancelRef}
      >
        <p className="text-body-md text-ink-secondary">{request?.description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => settle(false)}
            className="btn btn-secondary"
          >
            {request?.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            className={`btn ${request?.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {request?.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);

export default ConfirmProvider;
