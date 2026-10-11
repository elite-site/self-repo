import React from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { Event } from '../types';

interface RegistrationModalProps {
  isOpen: boolean;
  event: Event;
  answers: Record<string, string>;
  submitting: boolean;
  regError: string | null;
  onAnswerChange: (fieldId: string, value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  event,
  answers,
  submitting,
  regError,
  onAnswerChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge text-left my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <div>
            <h3 id="registration-modal-title" className="text-body-md font-bold text-ink font-heading">
              Register for {event.title}
            </h3>
            <p className="text-label-sm text-ink-secondary">Complete the required details to secure your spot</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close registration modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {regError && (
            <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
              {regError}
            </div>
          )}

          {event.registrationFields && event.registrationFields.length > 0 ? (
            event.registrationFields.map((field) => (
              <div key={field.id}>
                <label htmlFor={`reg-field-${field.id}`} className="label">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' && field.options ? (
                  <select
                    id={`reg-field-${field.id}`}
                    value={answers[field.id] || ''}
                    onChange={(e) => onAnswerChange(field.id, e.target.value)}
                    required={field.required}
                    className="select"
                  >
                    <option value="">Select an option</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`reg-field-${field.id}`}
                    type={field.type || 'text'}
                    value={answers[field.id] || ''}
                    onChange={(e) => onAnswerChange(field.id, e.target.value)}
                    required={field.required}
                    className="input"
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-body-sm text-ink-secondary">
              No additional registration fields required. Confirm to register with your student profile credentials.
            </p>
          )}

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
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{submitting ? 'Registering…' : 'Confirm registration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
