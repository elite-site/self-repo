import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

interface EventTeamModalProps {
  isOpen: boolean;
  eventTitle: string;
  teamName: string;
  creatingTeam: boolean;
  teamError: string | null;
  teamSuccess: string | null;
  onTeamNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EventTeamModal: React.FC<EventTeamModalProps> = ({
  isOpen,
  eventTitle,
  teamName,
  creatingTeam,
  teamError,
  teamSuccess,
  onTeamNameChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-team-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !creatingTeam) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge text-left my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <h3 id="event-team-modal-title" className="text-body-md font-bold text-ink font-heading">
            Create team for {eventTitle}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close team modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {teamSuccess ? (
          <div className="py-8 text-center space-y-2" role="status" aria-live="polite">
            <Check className="w-10 h-10 text-status-approved mx-auto" aria-hidden="true" />
            <h4 className="text-body-sm font-bold text-ink font-heading">Team created</h4>
            <p className="text-body-sm text-ink-secondary">{teamSuccess}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            {teamError && (
              <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
                {teamError}
              </div>
            )}

            <div>
              <label htmlFor="team-name-input" className="label">Team name *</label>
              <input
                id="team-name-input"
                type="text"
                required
                value={teamName}
                onChange={(e) => onTeamNameChange(e.target.value)}
                placeholder="e.g. Binary Beasts"
                className="input"
                autoFocus
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
                disabled={creatingTeam || !teamName.trim()}
                className="btn btn-primary"
              >
                {creatingTeam ? 'Creating…' : 'Create team'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
