import React from 'react';
import { Search, CalendarX2 } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { useEvents } from '../hooks/useEvents';
import { EventCard } from '../components';

export const EventsPage: React.FC = () => {
  const {
    filteredEvents,
    registeredEventIds,
    loading,
    error,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    loadEventsData,
  } = useEvents();

  if (loading) {
    return <SkeletonPage label="Loading events" cards={3} rows={2} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load events"
        message={error}
        onRetry={() => loadEventsData(true)}
      />
    );
  }

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
              className={`rounded-md px-3 py-1.5 text-label-sm font-semibold transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="relative">
        <label htmlFor="events-search" className="sr-only">
          Search events
        </label>
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id="events-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by title, description or type…"
          className="input pl-10"
        />
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No events match your filter"
          description={
            search
              ? 'Try widening your search keywords or switching tabs.'
              : 'There are currently no events listed in this section.'
          }
        />
      ) : (
        <div
          role="list"
          aria-label="Department events"
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredEvents.map((e) => (
            <EventCard key={e.id} event={e} isRegistered={registeredEventIds.has(e.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
