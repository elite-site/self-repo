import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EventRegistration } from '../types';
import { Loader2, CalendarX2 } from 'lucide-react';

export const RegistrationsPage = () => {
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRegistrations().then(data => setRegs(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B192C]">My Registrations</h1>
      
      {regs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl">
          <CalendarX2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-[#0B192C]">No registrations found</h3>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0] text-sm text-slate-500">
                <th className="p-4 font-semibold">Event</th>
                <th className="p-4 font-semibold">Registered At</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regs.map(r => (
                <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-medium text-[#0B192C]">{r.eventTitle}</td>
                  <td className="p-4 text-sm text-slate-500">{new Date(r.registeredAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded font-bold ${r.status === 'REGISTERED' ? 'bg-emerald-100 text-emerald-800' : r.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>{r.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    {r.status !== 'CANCELLED' && (
                      <button className="text-sm font-medium text-red-500 hover:text-red-700">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
