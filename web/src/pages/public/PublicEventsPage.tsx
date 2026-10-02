import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ChevronRight, Search, CalendarX2 } from 'lucide-react';
import { api } from '../../services/api';
import { Event } from '../../types';
import { StudentSession } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

interface PublicEventsPageProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

const OPEN_STATUSES = new Set(['OPEN']);

const eventDateParts = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    full: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

/**
 * Read-only view of department events for visitors who are not signed in.
 *
 * A signed-in student gets the full `EventsPage` instead, which adds
 * registration and team management. Both are served from the same `/events`
 * route — see the session-aware wrapper in `App.tsx` — so a public event link
 * resolves for everyone instead of bouncing a visitor into Google SSO.
 */
export const PublicEventsPage: React.FC<PublicEventsPageProps> = ({ session, onLogout }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');
  const [search, setSearch] = useState('');

  const loadEvents = () => {
    setLoading(true);
    setError(null);
    api
      .getPublicEvents()
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => setError('We could not load department events right now.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? events.filter(
          (evt) =>
            evt.title?.toLowerCase().includes(term) ||
            evt.description?.toLowerCase().includes(term) ||
            evt.eligibility?.toLowerCase().includes(term),
        )
      : events;

    // Soonest first: an events page is read from the top.
    return [...matched].sort((a, b) => {
      const left = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
      const right = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
      return left - right;
    });
  }, [events, search]);

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="mx-auto w-full max-w-canvas flex-1 px-6 py-8 sm:px-10 sm:py-10">
        <header className="mb-6">
          <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">Events</h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Discover and take part in upcoming department events.
          </p>
        </header>

        <div className="relative max-w-md">
          <label htmlFor="event-search" className="sr-only">
            Search events
          </label>
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-4 top-3 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="event-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
            className="input pl-11"
          />
        </div>

        {!session && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-4 py-3">
            <p className="text-body-sm text-ink-secondary">
              Sign in with your college account to register for any event.
            </p>
            <button type="button" onClick={handleSignIn} className="btn btn-primary shrink-0">
              Student Sign In
            </button>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div aria-busy="true">
              <span className="sr-only" role="status">
                Loading events
              </span>
              <ul className="divide-y divide-edge">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-4 py-4">
                    <div className="skeleton h-12 w-12 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-1/3" />
                      <div className="skeleton h-3 w-2/3" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={loadEvents} />
          ) : visibleEvents.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title={search ? 'No events match your search' : 'No events published yet'}
              description={
                search
                  ? 'Try a shorter search term, or clear it to see everything the department has scheduled.'
                  : 'Competitions, hackathons and workshops appear here as soon as the department publishes them.'
              }
            />
          ) : (
            <ul className="divide-y divide-edge">
              {visibleEvents.map((evt) => {
                const date = eventDateParts(evt.date);
                const isOpen = OPEN_STATUSES.has(evt.status ?? 'OPEN');
                return (
                  <li key={evt.id}>
                    <Link
                      to={`/events/${evt.id}`}
                      className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-4 transition-colors duration-fast hover:bg-surface-sunken"
                    >
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-edge bg-surface-inset">
                        <span className="font-heading text-label-sm tracking-wide text-brand">
                          {date?.month ?? 'TBA'}
                        </span>
                        <span className="font-heading text-headline-sm leading-none text-ink">
                          {date?.day ?? '--'}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-heading text-headline-sm text-ink">
                            {evt.title}
                          </span>
                          <span className={isOpen ? 'badge badge-approved' : 'badge badge-draft'}>
                            {isOpen ? (
                              <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                            ) : (
                              <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
                            )}
                            {isOpen ? 'Open' : (evt.status ?? 'Closed')}
                          </span>
                        </span>
                        {evt.description && (
                          <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-secondary">
                            {evt.description}
                          </span>
                        )}
                        <span className="mt-1 block truncate text-label-md text-ink-muted">
                          {[evt.type || 'Event', date?.full, evt.eligibility || 'All students']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>

                      <ChevronRight
                        size={16}
                        strokeWidth={1.75}
                        className="shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicEventsPage;
