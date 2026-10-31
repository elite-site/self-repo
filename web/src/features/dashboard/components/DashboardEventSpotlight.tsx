import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import type { StudentDashboardResponse } from '@/shared/types';

interface DashboardEventSpotlightProps {
  events: StudentDashboardResponse['events'];
  registrations: StudentDashboardResponse['registrations'];
}

export const DashboardEventSpotlight: React.FC<DashboardEventSpotlightProps> = ({
  events,
  registrations,
}) => {
  const nextEvent = events && events.length > 0 ? events[0] : null;

  const eventTitle = nextEvent?.title || 'Microservices & Cloud Hackathon';
  const eventCategory = nextEvent?.type || 'Department Hackathon';
  const eventLink = nextEvent?.id ? `/events/${nextEvent.id}` : '/events';

  let datePill = 'OCT 25 | 10 AM PST';
  if (nextEvent?.date) {
    try {
      const d = new Date(nextEvent.date);
      const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
      const day = d.getDate();
      const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      datePill = `${month} ${day} | ${time}`;
    } catch {
      datePill = 'Upcoming Soon';
    }
  }

  const isRegistered = nextEvent
    ? registrations.some((r) => r.eventId === nextEvent.id && r.status !== 'CANCELLED')
    : false;

  return (
    <Card className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between border border-edge bg-surface shadow-xs transition-all duration-quick hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-edge">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Calendar className="size-4" aria-hidden="true" />
            </span>
            <span className="text-label-xs uppercase font-semibold text-brand tracking-wider">
              {eventCategory}
            </span>
          </div>
          {isRegistered && (
            <span className="badge badge-approved text-xs">Registered</span>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <h2 className="font-heading text-headline-sm sm:text-headline-md font-bold text-ink leading-snug">
            Upcoming Hackathon &amp; Live Event
          </h2>
          <p className="text-body-sm text-ink-secondary line-clamp-2">
            {eventTitle}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-brand px-4 py-2 font-ui text-label-sm font-bold text-on-brand shadow-sm">
          {datePill}
        </span>
        <Link
          to={eventLink}
          className="btn btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5"
        >
          <span>{isRegistered ? 'View Details' : 'Register Now'}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
};
