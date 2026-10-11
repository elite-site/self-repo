import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  isRegistered?: boolean;
}

const eventDateParts = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    full: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' }),
  };
};

export const EventCard: React.FC<EventCardProps> = ({ event: e, isRegistered }) => {
  const parts = eventDateParts(e.date);

  return (
    <article
      className="card card-interactive group flex flex-col justify-between overflow-hidden p-6"
      role="listitem"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-brand">{e.type || 'EVENT'}</span>
            {isRegistered ? (
              <span className="badge badge-approved inline-flex items-center gap-1">
                <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                Registered
              </span>
            ) : (
              <span className="badge badge-pending inline-flex items-center gap-1">
                <Clock size={12} strokeWidth={2} aria-hidden="true" />
                Open
              </span>
            )}
          </div>

          {parts && (
            <div className="flex flex-col items-center rounded-lg border border-edge bg-surface-sunken px-2.5 py-1 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                {parts.month}
              </span>
              <span className="font-heading text-lg font-extrabold text-ink leading-tight">
                {parts.day}
              </span>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-heading text-headline-sm-mobile font-bold text-ink group-hover:text-ink-brand transition-colors">
            <Link to={`/events/${e.id}`} className="focus:outline-hidden">
              {e.title}
            </Link>
          </h2>
          {e.description && (
            <p className="mt-2 text-body-sm text-ink-secondary line-clamp-3">
              {e.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-edge pt-4">
        <span className="text-label-sm text-ink-muted">
          {parts ? parts.full : 'Date TBA'}
        </span>

        <Link
          to={`/events/${e.id}`}
          className="inline-flex items-center gap-1 text-label-sm font-semibold text-ink-brand hover:underline"
          aria-label={`View details for ${e.title}`}
        >
          <span>View details</span>
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};
