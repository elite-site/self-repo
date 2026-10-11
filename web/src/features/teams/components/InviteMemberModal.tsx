import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  inviteRollNo: string;
  inviting: boolean;
  inviteError: string | null;
  inviteSuccess: boolean;
  onRollNoChange: (rollNo: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  inviteRollNo,
  inviting,
  inviteError,
  inviteSuccess,
  onRollNoChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !inviting) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge text-left my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <h3 id="invite-modal-title" className="text-body-md font-bold text-ink font-heading">Invite Team Member</h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close invite modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {inviteSuccess ? (
          <div className="py-8 text-center space-y-2" role="status" aria-live="polite">
            <Check className="w-10 h-10 text-status-approved mx-auto" aria-hidden="true" />
            <h4 className="text-body-sm font-bold text-ink font-heading">Invitation sent</h4>
            <p className="text-body-sm text-ink-secondary">The student will receive an invitation in their portal inbox.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            {inviteError && (
              <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
                {inviteError}
              </div>
            )}

            <div>
              <label htmlFor="invite-roll-no" className="label">
                Student Roll Number *
              </label>
              <input
                id="invite-roll-no"
                type="text"
                required
                value={inviteRollNo}
                onChange={(e) => onRollNoChange(e.target.value.toUpperCase())}
                placeholder="e.g. 21K61A1201"
                className="input font-mono uppercase"
              />
              <p className="hint">Enter the student's exact college roll number.</p>
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
                disabled={inviting || !inviteRollNo.trim()}
                className="btn btn-primary"
              >
                {inviting ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
