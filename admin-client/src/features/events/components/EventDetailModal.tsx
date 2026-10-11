import React from 'react';
import { X } from 'lucide-react';
import { formatDate, formatRegistrationRange } from '@/shared/utils/formatDate';
import { EventItem } from '../types';
import { EventStatusBadge } from './EventStatusBadge';

export const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  HACKATHON: 'Hackathon',
  WORKSHOP: 'Workshop',
  COMPETITION: 'Competition',
  SEMINAR: 'Seminar',
  OTHER: 'Other',
};

export const formatEventType = (type?: string | null): string => {
  if (!type) return 'General';
  const upper = type.toUpperCase();
  if (EVENT_TYPE_LABELS[upper]) return EVENT_TYPE_LABELS[upper];
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export const EventDetailModal: React.FC<{ event: EventItem; onClose: () => void }> = ({ event, onClose }) => (
  <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <div className="surface bg-surface text-ink w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
      <div className="flex items-center justify-between p-5 border-b border-edge">
        <h2 id="detail-title" className="text-headline-sm font-semibold text-ink">{event.name}</h2>
        <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Close details">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3 text-body-sm">
        {event.description && <p className="text-ink-secondary">{event.description}</p>}
        <div className="surface-sunken rounded-lg p-4 space-y-2">
          <div><span className="font-semibold text-ink-secondary">Status:</span> <span className="text-ink ml-2"><EventStatusBadge status={event.status} /></span></div>
          <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{formatEventType(event.type)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Year:</span> <span className="text-ink ml-2">{event.year}</span></div>
          <div><span className="font-semibold text-ink-secondary">Event date:</span> <span className="text-ink ml-2">{formatDate(event.eventDate)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{formatRegistrationRange(event.registrationStart, event.registrationEnd)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Eligible years:</span> <span className="text-ink ml-2">{event.eligibilityYears?.length ? event.eligibilityYears.join(', ') : 'All years'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Min completion:</span> <span className="text-ink ml-2">{event.minCompletion ?? 0}%</span></div>
          <div><span className="font-semibold text-ink-secondary">Teams:</span> <span className="text-ink ml-2">{event.teamEnabled ? `${event.teamMin ?? 1}-${event.teamMax ?? 4} members` : 'Disabled'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Notifications:</span> <span className="text-ink ml-2">{event.notifyOnOpen ? 'On open' : 'No open notice'}, {event.notifyReminder ? 'reminder on' : 'no reminder'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Registrations:</span> <span className="text-ink ml-2">{event.registrationCount ?? 0}</span></div>
        </div>
      </div>
    </div>
  </div>
);
