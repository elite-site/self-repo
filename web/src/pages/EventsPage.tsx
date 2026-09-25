import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event, EventRegistration } from '../types';
import { Calendar, Search, Clock, Loader2, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Filter } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Department Events</h1>
          <p className="text-xs text-neutral-500">
            Competitions, technical symposiums, hackathons, and guest seminars
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
          {(['All', 'Open', 'Registered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white shadow-xs text-[#0B192C]'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab === 'Registered' ? `My Registrations (${registeredEventIds.size})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadEventsData(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by event title, keyword, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0B192C] focus:outline-none focus:border-[#DC2626] transition-colors"
        />
      </div>

      {/* EVENTS GRID */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0B192C]">No events found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {activeTab === 'Registered'
              ? 'You have not registered for any events yet. Check out Open events to join!'
              : 'There are currently no events matching your criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((e) => {
            const isRegistered = registeredEventIds.has(e.id);
            return (
              <Link
                to={`/events/${e.id}`}
                key={e.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-neutral-300 hover:shadow-md transition-all group flex flex-col justify-between text-left"
              >
                <div className="h-32 bg-gradient-to-br from-[#0B192C] to-[#1E293B] p-5 flex flex-col justify-between relative">
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      {e.type || 'General'}
                    </span>
                    {isRegistered ? (
                      <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Registered
                      </span>
                    ) : (
                      <span className="bg-[#DC2626] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs">
                        OPEN
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-extrabold text-base leading-snug line-clamp-1 group-hover:text-red-200 transition-colors">
                    {e.title}
                  </h3>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {e.description || 'Department competition or workshop.'}
                    </p>
                    <div className="space-y-1 pt-1 text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Date: {e.date ? new Date(e.date).toLocaleDateString() : 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Deadline: {e.deadline ? new Date(e.deadline).toLocaleDateString() : 'TBA'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-neutral-500">
                      Eligibility: {e.eligibility || 'All IT Students'}
                    </span>
                    <span className="font-bold text-[#DC2626] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      <span>{isRegistered ? 'View Status' : 'Details'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
