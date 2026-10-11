import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { EventRegistration } from '../types';

interface RegistrationCardProps {
  registration: EventRegistration;
  cancelling: boolean;
  onCancel: (id: string) => void;
}

export const RegistrationCard: React.FC<RegistrationCardProps> = ({
  registration: r,
  cancelling,
  onCancel,
}) => {
  const event = r.event || { title: 'Department Event', type: 'COMPETITION', date: undefined };
  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
      case 'CONFIRMED':
        return { className: 'badge badge-approved', label: 'Registered' };
      case 'WAITLISTED':
        return { className: 'badge badge-draft', label: 'Waitlisted' };
      default:
        return { className: 'badge badge-pending', label: 'Pending' };
    }
  };

  const badge = getStatusBadge(r.status);

  return (
    <div
      className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors flex flex-col justify-between"
      role="listitem"
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="badge badge-brand text-xs uppercase">{event.type || 'Event'}</span>
          <span className={badge.className}>{badge.label}</span>
        </div>

        <h3 className="font-bold text-body-md text-ink font-heading leading-snug">
          <Link to={`/events/${r.eventId}`} className="hover:text-brand transition-colors">
            {event.title}
          </Link>
        </h3>

        <div className="text-body-sm text-ink-secondary space-y-1">
          <div>
            <span className="text-ink-muted">Scheduled:</span>{' '}
            <span className="font-medium text-ink">{formatDate(event.date)}</span>
          </div>
          {r.team && (
            <div>
              <span className="text-ink-muted">Team:</span>{' '}
              <span className="font-medium text-ink">{r.team.name}</span>
            </div>
          )}
          <div>
            <span className="text-ink-muted">Registered:</span>{' '}
            <span>{formatDate(r.registeredAt || r.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="surface-sunken px-5 py-3 border-t border-edge flex items-center justify-between">
        <Link
          to={`/events/${r.eventId}`}
          className="text-label-sm font-bold text-brand hover:underline inline-flex items-center gap-1"
        >
          <span>Event details</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>

        <button
          onClick={() => onCancel(r.id)}
          disabled={cancelling}
          className="text-label-sm text-ink-muted hover:text-status-rejected flex items-center gap-1 cursor-pointer transition-colors"
          aria-label={`Cancel registration for ${event.title}`}
        >
          {cancelling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};
