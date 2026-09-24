import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Team, TeamInvitation } from '../types';
import { Users, Loader2, Plus, UserPlus, Check, X } from 'lucide-react';

export const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyTeams(), api.getTeamInvitations()])
      .then(([t, i]) => { setTeams(t); setInvitations(i); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0B192C]">My Teams</h1>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black"><Plus className="w-4 h-4"/> Create Team</button>
      </div>

      {invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0B192C]">Pending Invitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-white p-4 border border-indigo-200 rounded-xl shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#0B192C]">{inv.teamName}</h3>
                    <p className="text-sm text-slate-500">Invited by {inv.fromName}</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">Invite</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-sm font-medium border border-emerald-200"><Check className="w-4 h-4"/> Accept</button>
                  <button className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm font-medium border border-red-200"><X className="w-4 h-4"/> Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {teams.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-[#0B192C]">You are not in any teams yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(t => (
              <div key={t.id} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-4 border-b border-[#E2E8F0] flex justify-between items-center">
                  <h3 className="font-bold text-[#0B192C] text-lg">{t.name}</h3>
                  <button className="text-slate-400 hover:text-[#0B192C]"><UserPlus className="w-5 h-5"/></button>
                </div>
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Members ({t.members.length})</h4>
                  <ul className="space-y-2">
                    {t.members.map((m, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{m.charAt(0)}</div>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
