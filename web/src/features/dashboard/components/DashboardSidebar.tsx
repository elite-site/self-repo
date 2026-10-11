import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, ChevronRight, Plus, Vote } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { StudentDashboardResponse } from '@/shared/types';

interface DashboardSidebarProps {
  events: StudentDashboardResponse['events'];
  registrations: StudentDashboardResponse['registrations'];
  eventsError: string | null;
  votingCampaigns: StudentDashboardResponse['votingCampaigns'];
  votingError: string | null;
  onRetry: () => void;
}

const eventDateParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    full: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' }),
  };
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  events,
  registrations,
  eventsError,
  votingCampaigns,
  votingError,
  onRetry,
}) => {
  return (
    <div className="min-w-0 space-y-6">
      {/* Upcoming events */}
      <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="events-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="events-heading" className="font-heading text-headline-md text-ink">
            Upcoming events
          </h2>
          <Link
            to="/events"
            className="flex items-center gap-1 text-label-lg font-semibold text-ink-brand transition-colors hover:text-brand-hover"
          >
            <span>Browse all</span>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4">
          {eventsError ? (
            <ErrorState bare message={eventsError} onRetry={onRetry} />
          ) : events.length === 0 ? (
            <EmptyState
              bare
              icon={Calendar}
              title="No events coming up"
              description="Competitions, hackathons and workshops appear here as soon as the department publishes them."
              action={
                <Link to="/events" className="btn btn-secondary">
                  Check the events page
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-edge">
              {events.map((evt) => {
                const date = evt.date ? eventDateParts(evt.date) : null;
                const isRegistered = registrations.some(
                  (r) => r.eventId === evt.id && r.status !== 'CANCELLED'
                );
                return (
                  <li key={evt.id}>
                    <Link
                      to={`/events/${evt.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-fast hover:bg-surface-sunken"
                    >
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-edge bg-surface-inset">
                        <span className="font-heading text-label-sm tracking-wide text-brand">
                          {date?.month ?? 'TBA'}
                        </span>
                        <span className="font-heading text-headline-sm leading-none text-ink">
                          {date?.day ?? '--'}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate font-heading text-headline-sm text-ink">
                            {evt.title}
                          </span>
                          <span className={isRegistered ? 'badge badge-approved' : 'badge badge-draft'}>
                            {isRegistered ? (
                              <>
                                <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                                Registered
                              </>
                            ) : (
                              <>
                                <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                                Register
                              </>
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-body-sm text-ink-muted">
                          {[evt.type || 'Event', date?.full, evt.eligibility]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Open voting */}
      {!votingError && votingCampaigns.length > 0 && (
        <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="voting-heading">
          <div className="flex items-center gap-2">
            <Vote size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
            <h2 id="voting-heading" className="font-heading text-headline-md text-ink">
              Open voting
            </h2>
          </div>
          <ul className="mt-4 space-y-2">
            {votingCampaigns.map((camp) => (
              <li
                key={camp.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-surface-inset px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block font-heading text-label-lg font-semibold text-ink">
                    {camp.title}
                  </span>
                  <span className="block truncate text-body-sm text-ink-secondary">
                    {camp.description || 'Active election'}
                  </span>
                </span>
                <Link to={`/voting/${camp.id}`} className="btn btn-primary shrink-0">
                  Cast vote
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {votingError && (
        <ErrorState
          title="Voting is unavailable"
          message={votingError}
          onRetry={onRetry}
        />
      )}
    </div>
  );
};
