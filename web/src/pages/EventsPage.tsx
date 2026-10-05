import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event, EventRegistration, isActiveRegistration } from '../types';
import { CalendarX2, Search, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { selectVariantsByName } from '../lib/motion';

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

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Registered'>('All');
  const [search, setSearch] = useState('');

  const loadEventsData = async (isInitial = true) => {
    if (isInitial && events.length === 0) setLoading(true);
    setError(null);
    try {
      const [evData, regData] = await Promise.all([
        api.getEvents().catch(() => api.getPublicEvents()),
        api.getRegistrations().catch(() => []),
      ]);
      if (Array.isArray(evData)) setEvents(evData);
      if (Array.isArray(regData)) setRegistrations(regData);
    } catch {
      setError('We could not load department events right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventsData(true);
  }, []);

  const openEventIds = new Set(events.map((e) => e.id));
  const registeredEventIds = new Set(
    registrations
      .filter((r) => isActiveRegistration(r.status) && openEventIds.has(r.eventId))
      .map((r) => r.eventId)
  );

  const filteredEvents = events.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (activeTab === 'Registered') return registeredEventIds.has(e.id);
    if (activeTab === 'Open') return !registeredEventIds.has(e.id);
    return true;
  });

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString() : 'To be announced';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">Events</h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Competitions, symposiums, hackathons and guest sessions.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter events"
          className="flex shrink-0 gap-1 rounded-lg border border-edge bg-surface-sunken p-1"
        >
          {(['All', 'Open', 'Registered'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-label-md transition-colors duration-fast ${
                activeTab === tab
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab === 'Registered' ? `Registered (${registeredEventIds.size})` : tab}
            </button>
          ))}
        </div>
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
          placeholder="Search by title or keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => loadEventsData(true)} />}

      {loading ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">
            Loading events
          </span>
          <ul className="divide-y divide-edge">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-4 py-4">
                <div className="skeleton h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : filteredEvents.length === 0 && !error ? (
        <EmptyState
          icon={CalendarX2}
          title={activeTab === 'Registered' ? 'You have not registered for anything yet' : 'No events found'}
          description={
            activeTab === 'Registered'
              ? 'Browse the Open tab to see what is coming up and register.'
              : 'Nothing matches that search right now. Try a shorter term or clear the filter.'
          }
          action={
            activeTab === 'Registered' ? (
              <button type="button" onClick={() => setActiveTab('Open')} className="btn btn-secondary">
                Show open events
              </button>
            ) : undefined
          }
        />
      ) : filteredEvents.length > 0 ? (
        <ul className="divide-y divide-edge">
          {filteredEvents.map((e) => {
            const isRegistered = registeredEventIds.has(e.id);
            const date = eventDateParts(e.date);
            return (
              <li key={e.id}>
                <Link
                  to={`/events/${e.id}`}
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
                      <span className="truncate font-heading text-headline-sm text-ink">{e.title}</span>
                      {isRegistered ? (
                        <span className="badge badge-approved">
                          <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                          Registered
                        </span>
                      ) : (
                        <span className="badge badge-draft">
                          <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
                          Not registered
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-secondary">
                      {e.description || 'Department competition or workshop.'}
                    </span>
                    <span className="mt-1 block truncate text-label-md text-ink-muted">
                      {[
                        e.type || 'General',
                        date?.full,
                        `Deadline ${formatDate(e.deadline)}`,
                        e.eligibility || 'All IT students',
                      ].join(' · ')}
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
      ) : null}
    </div>
  );
};

export default EventsPage;
