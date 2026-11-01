import React from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarX2, Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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

  const spotlightEvent = filteredEvents.find((e) => e.status === 'PUBLISHED') || filteredEvents[0];

  return (
    <div className="space-y-8 page-enter max-w-6xl mx-auto text-left pb-12">
      {/* 1. ASYMMETRICAL UPCOMING EVENT SPOTLIGHT */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <header className="space-y-2">
            <span className="badge badge-brand text-xs font-semibold">Department Activities</span>
            <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg font-bold">
              Events & Hackathons
            </h1>
            <p className="text-body-md text-ink-secondary max-w-xl">
              Competitions, technical symposiums, hackathons and guest industry sessions.
            </p>
          </header>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div
              role="tablist"
              aria-label="Filter events"
              className="flex shrink-0 gap-1 rounded-xl border border-edge bg-surface-sunken p-1 min-h-[44px] items-center"
            >
              {(['All', 'Open', 'Registered'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-label-sm font-semibold transition-colors cursor-pointer min-h-[36px] ${
                    activeTab === tab
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="events-search" className="sr-only">Search events</label>
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
                placeholder="Search events…"
                className="input pl-10 min-h-[44px]"
              />
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <Sparkles size={14} aria-hidden="true" />
                  Event Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">
                  {registeredEventIds.size} Registered
                </span>
              </div>
              {spotlightEvent ? (
                <div>
                  <h3 className="font-heading text-body-sm font-bold text-ink line-clamp-1">{spotlightEvent.title}</h3>
                  <p className="text-body-xs text-ink-secondary line-clamp-2 mt-0.5">
                    {spotlightEvent.description || 'Join upcoming department technical events to expand practical experience.'}
                  </p>
                </div>
              ) : (
                <p className="text-body-xs text-ink-secondary">
                  Participate in college and department level hackathons to earn achievement credentials.
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <Link
                to="/events/registrations"
                className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1"
              >
                <span>My Registrations</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY EVENTS GRID */}
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
        <MasonryGrid cols={3}>
          {filteredEvents.map((e) => (
            <MasonryItem key={e.id}>
              <EventCard event={e} isRegistered={registeredEventIds.has(e.id)} className="card-lift" />
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}
    </div>
  );
};

export default EventsPage;
