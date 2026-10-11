import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface CreateTeamModalProps {
  isOpen: boolean;
  events: any[];
  selectedEventId: string;
  teamName: string;
  creating: boolean;
  createError: string | null;
  onEventChange: (id: string) => void;
  onTeamNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  events,
  selectedEventId,
  teamName,
  creating,
  createError,
  onEventChange,
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
      aria-labelledby="create-team-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge text-left my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <h3 id="create-team-modal-title" className="text-body-md font-bold text-ink font-heading">Create team</h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close create team modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {createError && (
            <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
              {createError}
            </div>
          )}

          {events.length === 0 && (
            <div className="p-3 bg-status-bg-pending border border-edge-strong rounded-lg text-body-sm text-status-pending flex items-center gap-2" role="status">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>No active event available to create a team for.</span>
            </div>
          )}

          <div>
            <label htmlFor="create-team-event" className="label">Target event *</label>
            {events.length === 0 ? (
              <div className="p-2.5 surface-sunken border border-edge rounded-lg text-body-sm text-ink-secondary">
                No active event available to create a team for.
              </div>
            ) : (
              <select
                id="create-team-event"
                value={selectedEventId}
                onChange={(e) => onEventChange(e.target.value)}
                required
                className="select"
              >
                <option value="" disabled>Select an event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title || ev.name} ({ev.year || 2026})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="create-team-name" className="label">Team name *</label>
            <input
              id="create-team-name"
              type="text"
              required
              value={teamName}
              onChange={(e) => onTeamNameChange(e.target.value)}
              placeholder="e.g. AlgoRhythms / CyberKnights"
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
              disabled={creating || !teamName.trim() || !selectedEventId || events.length === 0}
              className="btn btn-primary"
            >
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
