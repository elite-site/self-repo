import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Event } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, Search, MapPin, Clock, Loader2 } from 'lucide-react';

export const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getEvents().then(data => setEvents(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  const filtered = events.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    // mock filters
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#0B192C]">Events</h1>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {['All', 'Open', 'Registered', 'Completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === f ? 'bg-white shadow text-[#0B192C]' : 'text-slate-500 hover:text-[#0B192C]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-elite-red" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-[#0B192C]">No events found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(e => (
            <Link to={`/events/${e.id}`} key={e.id} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="h-32 bg-slate-100 p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="bg-white px-2 py-1 rounded text-xs font-bold text-elite-red uppercase tracking-wide shadow-sm">{e.type}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold shadow-sm">OPEN</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-[#0B192C] group-hover:text-elite-red transition-colors mb-2">{e.title}</h3>
                <div className="space-y-1.5 mb-4">
                  <p className="text-sm text-slate-600 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400"/> {new Date(e.date).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400"/> Deadline: {new Date(e.deadline).toLocaleDateString()}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Eligibility: {e.eligibility}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
