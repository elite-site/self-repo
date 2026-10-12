import React, { useEffect, useMemo, useState } from 'react';
import { Search, CalendarX2 } from 'lucide-react';
import { eventsApi } from '../api';
import { Event } from '../types';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { EventCard } from '../components';

interface PublicEventsPageProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicEventsPage: React.FC<PublicEventsPageProps> = ({ session, onLogout }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadEvents = () => {
    setLoading(true);
    setError(null);
    eventsApi
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

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q))
    );
  }, [events, search]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session ?? null} onLogout={onLogout ?? (() => {})} />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-canvas px-6 sm:px-10">
          <header className="max-w-2xl">
            <p className="text-label-md uppercase tracking-widest text-ink-brand">
              Department of Information Technology
            </p>
            <h1 className="mt-3 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
              Department Events
            </h1>
            <p className="mt-4 text-body-lg text-ink-secondary">
              Hackathons, technical symposiums, coding competitions and guest lectures hosted by SASI IT.
            </p>
          </header>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <label htmlFor="public-events-search" className="sr-only">Search events</label>
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="public-events-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events by title, description or type…"
                className="input pl-10"
              />
            </div>
            <p className="text-label-sm text-ink-muted">
              {filtered.length} {filtered.length === 1 ? 'event' : 'events'} listed
            </p>
          </div>

          <div className="mt-8">
            {loading ? (
              <SkeletonPage label="Loading events" cards={3} rows={2} />
            ) : error ? (
              <ErrorState title="Unable to load events" message={error} onRetry={loadEvents} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="No events found"
                description={search ? 'Try clearing your search query.' : 'There are no department events scheduled at this moment.'}
              />
            ) : (
              <div role="list" aria-label="Department events" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterReveal />
    </div>
  );
};

export default PublicEventsPage;
