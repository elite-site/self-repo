import React, { useEffect, useMemo, useState } from 'react';
import { Search, CalendarX2, Sparkles, Calendar, ShieldCheck } from 'lucide-react';
import { eventsApi } from '../api';
import { Event } from '../types';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
          <header className="mb-10" data-reveal>
            <AsymGrid>
              <AsymFeatured cols="8" className="flex flex-col justify-between">
                <div>
                  <span className="badge badge-brand mb-3 uppercase tracking-widest text-[11px] font-bold inline-flex items-center gap-1.5">
                    <Sparkles size={13} aria-hidden="true" />
                    Department of Information Technology
                  </span>
                  <h1 className="mt-1 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
                    Department Events
                  </h1>
                  <p className="mt-3 text-body-lg text-ink-secondary max-w-2xl">
                    Hackathons, technical symposiums, coding competitions and guest lectures hosted by SASI IT.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-md">
                    <label htmlFor="public-events-search" className="sr-only">Search events</label>
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="public-events-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search events by title, description or type…"
                      className="input pl-10 min-h-[42px]"
                    />
                  </div>
                  <p className="text-label-sm font-mono text-ink-muted shrink-0">
                    {filtered.length} {filtered.length === 1 ? 'event' : 'events'} listed
                  </p>
                </div>
              </AsymFeatured>

              <AsymSide cols="4">
                <AsymAccent className="flex flex-col justify-between h-full p-6 card-lift">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                      <Calendar size={16} aria-hidden="true" />
                      <span>Participation Guide</span>
                    </div>
                    <p className="text-body-xs text-ink-secondary leading-relaxed">
                      All schedules and venue information are public. To register as an individual or team, sign in with your verified SASI student account.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-brand/20 flex items-center justify-between text-label-xs font-mono text-ink-secondary">
                    <span className="inline-flex items-center gap-1 text-ink-brand">
                      <ShieldCheck size={14} />
                      Verified Students
                    </span>
                    <span className="badge badge-brand">Active Season</span>
                  </div>
                </AsymAccent>
              </AsymSide>
            </AsymGrid>
          </header>

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
              <MasonryGrid cols={3} role="list" aria-label="Department events">
                {filtered.map((e) => (
                  <MasonryItem key={e.id} className="card-lift">
                    <EventCard event={e} />
                  </MasonryItem>
                ))}
              </MasonryGrid>
            )}
          </div>
        </div>
      </main>

      <FooterReveal />
    </div>
  );
};

export default PublicEventsPage;
