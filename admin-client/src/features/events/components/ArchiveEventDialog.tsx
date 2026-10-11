import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { eventsApi } from '../api';
import { EventItem } from '../types';

export interface ArchiveEventDialogProps {
  event: EventItem;
  onClose: () => void;
  onArchived: () => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}

export const ArchiveEventDialog: React.FC<ArchiveEventDialogProps> = ({
  event,
  onClose,
  onArchived,
  notify,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await eventsApi.archiveEvent(event.id);
      notify(`Archived "${event.name}".`);
      onArchived();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not archive this event.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <div className="surface bg-surface text-ink w-full max-w-md overflow-hidden flex flex-col shadow-modal animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="archive-title" className="text-headline-sm font-semibold text-ink">Archive event</h2>
          <button onClick={onClose} disabled={busy} className="btn btn-ghost p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-body-sm text-ink-secondary">
            Students will no longer be able to register for <span className="font-semibold text-ink">{event.name}</span>. Existing registrations, submissions and teams are kept.
          </p>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-3 text-status-rejected text-xs" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-edge bg-surface-sunken">
          <button onClick={onClose} disabled={busy} className="btn btn-secondary text-xs">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy} className="btn btn-primary text-xs flex items-center gap-1.5">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Archive event
          </button>
        </div>
      </div>
    </div>
  );
};
