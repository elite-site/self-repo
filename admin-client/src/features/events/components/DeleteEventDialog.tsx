import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { eventsApi } from '../api';
import { EventItem } from '../types';

export interface DeleteEventDialogProps {
  event: EventItem;
  onClose: () => void;
  onDeleted: () => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}

const DEPENDENT_LABELS: Record<string, string> = {
  registrations: 'Registrations',
  submissions: 'Submissions',
  formFields: 'Registration form fields',
  teams: 'Teams',
  votes: 'Votes cast',
  emailLogs: 'Email log entries',
};

export const DeleteEventDialog: React.FC<DeleteEventDialogProps> = ({
  event,
  onClose,
  onDeleted,
  notify,
}) => {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDelete = async (force: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await eventsApi.deleteEvent(event.id, force);
      notify(`Deleted "${event.name}".`);
      onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error === 'CONFIRMATION_REQUIRED') {
        setCounts(data.dependents || {});
      } else {
        setError(data?.message || "Couldn't delete this event. Nothing was deleted.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveInstead = async () => {
    setBusy(true);
    setError(null);
    try {
      await eventsApi.archiveEvent(event.id);
      notify(`Archived "${event.name}".`);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not archive this event.');
    } finally {
      setBusy(false);
    }
  };

  const listed = counts
    ? Object.entries(counts).filter(([, n]) => (n as number) > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-event-title"
    >
      <div className="surface bg-surface text-ink w-full max-w-md overflow-hidden flex flex-col shadow-modal animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="delete-event-title" className="text-headline-sm font-semibold text-ink">
            Delete event
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-ghost p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-body-sm text-ink-secondary">
            Permanently delete <span className="font-semibold text-ink">{event.name}</span>?
          </p>

          {counts && (
            <div className="rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-4 space-y-2">
              <p className="text-xs font-bold text-status-rejected">
                This will also permanently delete the following:
              </p>
              <ul className="space-y-1">
                {listed.map(([key, n]) => (
                  <li key={key} className="flex items-center justify-between text-xs text-status-rejected">
                    <span>{DEPENDENT_LABELS[key] ?? key}</span>
                    <span className="font-bold">{n}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-status-rejected pt-1 border-t border-status-rejected/20">
                This cannot be undone.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-3 text-status-rejected text-xs" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => runDelete(counts !== null)}
                    disabled={busy}
                    className="underline font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Try again
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleArchiveInstead}
                    disabled={busy}
                    className="underline font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Archive instead
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-edge bg-surface-sunken">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => runDelete(counts !== null)}
            disabled={busy}
            className="btn btn-danger text-xs flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {counts ? 'Delete anyway' : 'Delete event'}
          </button>
        </div>
      </div>
    </div>
  );
};
