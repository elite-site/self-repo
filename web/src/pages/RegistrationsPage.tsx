import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { EventRegistration } from '../types';
import { Loader2, CalendarX2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';

export const RegistrationsPage: React.FC = () => {
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = async (isInitial = true) => {
    if (isInitial && regs.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await api.getRegistrations();
      if (Array.isArray(data)) setRegs(data);
    } catch {
      if (regs.length === 0) setError('Could not load registrations. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations(true);
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this event registration?')) return;
    setCancellingId(id);
    // Optimistic status update
    setRegs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
    );
    try {
      await api.cancelRegistration(id);
      loadRegistrations(false);
    } catch {
      alert('Failed to cancel registration.');
      loadRegistrations(false);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <BrandedLoading fullScreen={false} message="Loading Registrations..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] font-heading">My Event Registrations</h1>
          <p className="text-xs text-[#475569]">
            Track confirmed registrations, upcoming competition dates, and participation status
          </p>
        </div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg transition-all shadow-xs shrink-0"
        >
          <span>Explore Events</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadRegistrations(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {regs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CalendarX2 className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0F172A] font-heading">No event registrations found</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto mb-4">
            You haven't signed up for any upcoming hackathons, guest lectures, or workshops yet.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-lg text-xs font-bold transition-opacity shadow-xs cursor-pointer"
          >
            <span>Browse Upcoming Events</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#E4E7F2] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F8FC] border-b border-[#E4E7F2] text-xs font-bold text-[#475569] uppercase tracking-wider">
                  <th className="p-4 sm:px-6">Event Title</th>
                  <th className="p-4 sm:px-6">Registered Date</th>
                  <th className="p-4 sm:px-6">Status</th>
                  <th className="p-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7F2] text-xs">
                {regs.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F8FC] transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-[#0F172A]">
                      <Link to={`/events/${r.eventId}`} className="hover:text-[#4F46E5] transition-colors">
                        {r.eventTitle}
                      </Link>
                    </td>
                    <td className="p-4 sm:px-6 text-[#475569]">
                      {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 sm:px-6">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block border ${
                          r.status === 'REGISTERED' || r.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.status === 'CANCELLED'
                            ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {r.status === 'CONFIRMED' ? 'REGISTERED' : r.status}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-right">
                      {r.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancellingId === r.id}
                          className="text-xs font-bold text-[#94A3B8] hover:text-[#E11D48] disabled:opacity-50 cursor-pointer inline-flex items-center gap-1 transition-colors"
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

export default RegistrationsPage;

