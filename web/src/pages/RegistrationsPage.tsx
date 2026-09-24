import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { EventRegistration } from '../types';
import { Loader2, CalendarX2, Calendar, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

export const RegistrationsPage: React.FC = () => {
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRegistrations();
      if (Array.isArray(data)) setRegs(data);
    } catch {
      setError('Could not load registrations. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this event registration?')) return;
    setCancellingId(id);
    try {
      await api.cancelRegistration(id);
      loadRegistrations();
    } catch {
      alert('Failed to cancel registration.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">My Event Registrations</h1>
          <p className="text-xs text-neutral-500">
            Track confirmed registrations, upcoming competition dates, and participation status
          </p>
        </div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
        >
          <span>Explore Events</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadRegistrations} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {regs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E2E8F0] rounded-2xl">
          <CalendarX2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0B192C]">No event registrations found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto mb-4">
            You haven't signed up for any upcoming hackathons, guest lectures, or workshops yet.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B192C] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Browse Upcoming Events</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-[#E2E8F0] text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="p-4 sm:px-6">Event Title</th>
                  <th className="p-4 sm:px-6">Registered Date</th>
                  <th className="p-4 sm:px-6">Status</th>
                  <th className="p-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {regs.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-[#0B192C]">
                      <Link to={`/events/${r.eventId}`} className="hover:text-[#DC2626] transition-colors">
                        {r.eventTitle}
                      </Link>
                    </td>
                    <td className="p-4 sm:px-6 text-neutral-500 font-mono">
                      {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 sm:px-6">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block ${
                          r.status === 'REGISTERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'CANCELLED'
                            ? 'bg-neutral-100 text-neutral-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-right">
                      {r.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancellingId === r.id}
                          className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                        >
                          {cancellingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Cancel Registration</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
