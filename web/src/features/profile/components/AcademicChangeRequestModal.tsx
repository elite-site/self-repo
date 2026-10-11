import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react';

interface AcademicChangeRequestModalProps {
  isOpen: boolean;
  fieldName: string;
  requestedValue: string;
  reason: string;
  submitting: boolean;
  success: boolean;
  error: string | null;
  onFieldNameChange: (val: string) => void;
  onRequestedValueChange: (val: string) => void;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AcademicChangeRequestModal: React.FC<AcademicChangeRequestModalProps> = ({
  isOpen,
  fieldName,
  requestedValue,
  reason,
  submitting,
  success,
  error,
  onFieldNameChange,
  onRequestedValueChange,
  onReasonChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-req-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge text-left my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <h3 id="change-req-title" className="text-body-md font-bold text-ink font-heading">
            Request Record Correction
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close request modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2" role="status" aria-live="polite">
            <CheckCircle2 className="w-10 h-10 text-status-approved mx-auto" aria-hidden="true" />
            <h4 className="text-body-sm font-bold text-ink font-heading">Request Submitted</h4>
            <p className="text-body-sm text-ink-secondary">
              Department faculty will review and update your official academic record.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            {error && (
              <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="field-select" className="label">Field to Correct</label>
              <select
                id="field-select"
                value={fieldName}
                onChange={(e) => onFieldNameChange(e.target.value)}
                className="select"
              >
                <option value="name">Full Legal Name</option>
                <option value="rollNo">College Roll Number</option>
                <option value="section">Section</option>
                <option value="year">Academic Year</option>
                <option value="email">Institutional Email</option>
              </select>
            </div>

            <div>
              <label htmlFor="req-val" className="label">Requested Value *</label>
              <input
                id="req-val"
                type="text"
                required
                value={requestedValue}
                onChange={(e) => onRequestedValueChange(e.target.value)}
                placeholder="Enter correct official value"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="req-reason" className="label">Justification / Reason *</label>
              <textarea
                id="req-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Explain the discrepancy (e.g. clerical typo in grade sheet)"
                className="textarea"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-edge">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !requestedValue.trim() || !reason.trim()}
                className="btn btn-primary inline-flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{submitting ? 'Submitting…' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
