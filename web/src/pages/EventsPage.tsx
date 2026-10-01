import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event, EventRegistration } from '../types';
import { Calendar, Search, Clock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (events.length === 0) setError('Could not load department events. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventsData(true);
  }, []);

  const registeredEventIds = new Set(
    registrations
      .filter((r) => r.status === 'REGISTERED' || r.status === 'CONFIRMED')
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

    if (activeTab === 'Registered') {
      return registeredEventIds.has(e.id);
    }
    if (activeTab === 'Open') {
      return !registeredEventIds.has(e.id);
    }
    return true;
  });

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : 'To be announced');

  if (loading) {
    return (
      <div className="py-20" role="status" aria-live="polite">
        <BrandedLoading fullScreen={false} message="Loading Events..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">Department Events</h1>
          <p className="text-body-sm text-ink-muted">
            Competitions, technical symposiums, hackathons, and guest seminars
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-surface-sunken border border-edge p-1 rounded-lg shrink-0" role="tablist" aria-label="Event filter">
          {(['All', 'Open', 'Registered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`px-4 py-1.5 text-label-sm font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-surface shadow-card text-ink-brand'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab === 'Registered' ? `My Registrations (${registeredEventIds.size})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadEventsData(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <label htmlFor="event-search" className="sr-only">Search events</label>
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted" aria-hidden="true" />
        <input
          id="event-search"
          type="search"
          placeholder="Search by event title, keyword, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* EVENTS GRID */}
      {filteredEvents.length === 0 ? (
        <div className="surface text-center py-16 px-4" role="status">
          <Calendar className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No events found</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-xs mx-auto">
            {activeTab === 'Registered'
              ? 'You have not registered for any events yet. Check out Open events to join.'
              : 'There are currently no events matching your criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Events">
          {filteredEvents.map((e) => {
            const isRegistered = registeredEventIds.has(e.id);
            return (
              <Link
                to={`/events/${e.id}`}
                key={e.id}
                className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors group flex flex-col justify-between text-left"
                role="listitem"
              >
                <div className="h-32 bg-surface-inverse p-5 flex flex-col justify-between relative">
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge badge-brand text-label-xs uppercase tracking-wide">
                      {e.type || 'General'}
                    </span>
                    {isRegistered ? (
                      <span className="badge badge-approved flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        Registered
                      </span>
                    ) : (
                      <span className="badge badge-pending">Open</span>
                    )}
                  </div>
                  <h3 className="text-body-lg font-extrabold text-ink-inverse font-heading leading-snug line-clamp-1 group-hover:text-brand-soft transition-colors">
                    {e.title}
                  </h3>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-body-sm text-ink-secondary line-clamp-2 leading-relaxed">
                      {e.description || 'Department competition or workshop.'}
                    </p>
                    <div className="space-y-1 pt-1 text-body-sm text-ink-secondary">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
                        <span>Date: {formatDate(e.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
                        <span>Deadline: {formatDate(e.deadline)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-edge flex items-center justify-between text-body-sm">
                    <span className="text-label-sm font-semibold text-ink-secondary">
                      Eligibility: {e.eligibility || 'All IT Students'}
                    </span>
                    <span className="font-bold text-ink-brand group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      <span>{isRegistered ? 'View Status' : 'Details'}</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
