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

  if (loading) {
    return (
      <div className="py-20">
        <BrandedLoading fullScreen={false} message="Loading Events..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] font-heading">Department Events</h1>
          <p className="text-xs text-[#475569]">
            Competitions, technical symposiums, hackathons, and guest seminars
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-[#F7F8FC] border border-[#E4E7F2] p-1 rounded-lg shrink-0">
          {(['All', 'Open', 'Registered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-[#4F46E5]'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab === 'Registered' ? `My Registrations (${registeredEventIds.size})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadEventsData(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by event title, keyword, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
        />
      </div>

      {/* EVENTS GRID */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Calendar className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0F172A] font-heading">No events found</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-xs mx-auto">
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
                className="bg-white border border-[#E4E7F2] rounded-lg overflow-hidden hover:border-[#4F46E5]/40 hover:shadow-md transition-all group flex flex-col justify-between text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="h-32 bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 flex flex-col justify-between relative">
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      {e.type || 'General'}
                    </span>
                    {isRegistered ? (
                      <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Registered
                      </span>
                    ) : (
                      <span className="bg-[#4F46E5] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs">
                        OPEN
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-extrabold text-base font-heading leading-snug line-clamp-1 group-hover:text-[#E0E7FF] transition-colors">
                    {e.title}
                  </h3>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                      {e.description || 'Department competition or workshop.'}
                    </p>
                    <div className="space-y-1 pt-1 text-xs text-[#475569]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Date: {e.date ? new Date(e.date).toLocaleDateString() : 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Deadline: {e.deadline ? new Date(e.deadline).toLocaleDateString() : 'TBA'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E4E7F2] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[#475569]">
                      Eligibility: {e.eligibility || 'All IT Students'}
                    </span>
                    <span className="font-bold text-[#4F46E5] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
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

export default EventsPage;

