import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, ChevronRight, Plus, Vote } from 'lucide-react';
import { StudentDashboardResponse } from '@/shared/types';
import { cn } from '@/shared/lib/cn';
import { useSpotlight } from '@/hooks/useSpotlight';
import { GlowButton } from './GlowButton';

export interface UpcomingEventsProps {
  events: StudentDashboardResponse['events'];
  registrations: StudentDashboardResponse['registrations'];
  eventsError: string | null;
  votingCampaigns?: StudentDashboardResponse['votingCampaigns'];
  votingError?: string | null;
  onRetry: () => void;
  className?: string;
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

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  events,
  registrations,
  eventsError,
  votingCampaigns = [],
  onRetry,
  className,
}) => {
  const { spotlightProps } = useSpotlight();

  return (
    <div className={cn('space-y-5', className)}>
      <section
        {...spotlightProps}
        className="glow-card p-5 sm:p-6 rounded-[16px] border border-white/10 bg-[#0a0a10] flex flex-col justify-between"
        aria-labelledby="events-heading"
      >
        <div>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
            <h2 id="events-heading" className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
              <span>Upcoming events</span>
              <span aria-hidden="true">🎉</span>
            </h2>
            <Link to="/events" className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300">
              <span>Browse all</span>
              <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4">
            {eventsError ? (
              <div className="text-center py-6">
                <p className="text-xs text-rose-400 mb-2">{eventsError}</p>
                <GlowButton onClick={onRetry} variant="secondary" className="text-xs px-3 py-1.5">
                  Retry
                </GlowButton>
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="float-calendar flex size-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 mx-auto mb-3 border border-purple-500/20">
                  <Calendar size={28} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="font-heading text-sm font-bold text-white flex items-center justify-center gap-1">
                  <span>No events coming up</span>
                  <span aria-hidden="true">🗓️</span>
                </h3>
                <p className="mt-1 text-xs text-white/50 max-w-xs mx-auto">
                  Competitions, hackathons and workshops appear here as soon as published.
                </p>
                <div className="mt-4">
                  <GlowButton to="/events" variant="secondary" className="text-xs px-4 py-2">
                    Check the events page
                  </GlowButton>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {events.map((evt) => {
                  const date = evt.date ? eventDateParts(evt.date) : null;
                  const isRegistered = registrations.some((r) => r.eventId === evt.id && r.status !== 'CANCELLED');
                  return (
                    <li key={evt.id}>
                      <Link
                        to={`/events/${evt.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 transition-colors hover:bg-white/5"
                      >
                        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[12px] border border-white/10 bg-[#11111a]">
                          <span className="font-heading text-[10px] font-bold tracking-wider text-purple-400">
                            {date?.month ?? 'TBA'}
                          </span>
                          <span className="font-heading text-base font-extrabold leading-none text-white">
                            {date?.day ?? '--'}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate font-heading text-xs sm:text-sm font-bold text-white">
                              {evt.title}
                            </span>
                            <span className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1',
                              isRegistered ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/15 text-purple-300 border-purple-500/20'
                            )}>
                              {isRegistered ? <CheckCircle2 size={10} strokeWidth={2.5} /> : <Plus size={10} strokeWidth={2.5} />}
                              {isRegistered ? 'Registered' : 'Register'}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-white/40">
                            {[evt.type || 'Event', date?.full, evt.eligibility].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Open voting if any */}
      {votingCampaigns.length > 0 && (
        <section className="glow-card p-4 sm:p-5 rounded-[16px] border border-white/10 bg-[#0a0a10]">
          <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
            <Vote size={16} className="text-purple-400" aria-hidden="true" />
            <h2 className="font-heading text-sm font-bold text-white">Open voting</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {votingCampaigns.map((camp) => (
              <li key={camp.id} className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[#11111a] border border-white/5">
                <span className="min-w-0 flex-1 truncate font-medium text-xs text-white">{camp.title}</span>
                <GlowButton to={`/voting/${camp.id}`} variant="primary" className="text-xs px-3 py-1">
                  Vote
                </GlowButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default UpcomingEvents;
