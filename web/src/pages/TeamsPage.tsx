import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Loader2, Plus, UserPlus, Check, X, AlertCircle, Shield, Mail } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Team Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteRollNo, setInviteRollNo] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const loadTeamsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tData, iData] = await Promise.all([
        api.getMyTeams().catch(() => []),
        api.getTeamInvitations().catch(() => []),
      ]);
      if (Array.isArray(tData)) setTeams(tData);
      if (Array.isArray(iData)) setInvitations(iData);
    } catch {
      setError('Could not load teams information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamsData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      await api.createTeam({ name: teamName.trim() });
      setCreateModalOpen(false);
      setTeamName('');
      loadTeamsData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !inviteRollNo.trim()) return;
    setInviting(true);
    setInviteError(null);

    try {
      await api.inviteToTeam(selectedTeamId, inviteRollNo.trim());
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteRollNo('');
        setInviteSuccess(false);
      }, 1200);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Student not found or already invited.');
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async (id: string) => {
    try {
      await api.acceptInvitation(id);
      loadTeamsData();
    } catch {
      alert('Failed to accept invitation.');
    }
  };

  const handleDeclineInvite = async (id: string) => {
    try {
      await api.declineInvitation(id);
      loadTeamsData();
    } catch {
      alert('Failed to decline invitation.');
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Hackathon & Project Teams</h1>
          <p className="text-xs text-neutral-500">
            Form collaborative teams with peers across sections for department hackathons and projects
          </p>
        </div>
        <button
          onClick={() => {
            setTeamName('');
            setCreateError(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadTeamsData} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* PENDING INVITATIONS */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-[#0B192C]">Pending Team Invitations ({invitations.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-5 border border-purple-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    Invitation
                  </span>
                  <h3 className="font-bold text-sm text-[#0B192C] mt-2">{inv.team?.name || 'Hackathon Squad'}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {inv.event?.name ? `For ${inv.event.name}` : 'General Project Team'}
                  </p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => handleAcceptInvite(inv.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(inv.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS LIST */}
      <div>
        {teams.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#E2E8F0] rounded-2xl">
            <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-[#0B192C]">No teams formed yet</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto mb-4">
              Create a team or join a classmate's team to participate in hackathons and multi-student challenges.
            </p>
            <button
              onClick={() => {
                setTeamName('');
                setCreateError(null);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B192C] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Team</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#0B192C]">{t.name}</h3>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {t.event?.name || 'Independent Team'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTeamId(t.id);
                      setInviteRollNo('');
                      setInviteError(null);
                      setInviteSuccess(false);
                      setInviteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                    title="Invite Member"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-2">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Members ({t.members?.length || 1})
                  </h4>
                  <ul className="space-y-2">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m: any, i: number) => {
                        const name = m.student?.name || m.name || (typeof m === 'string' ? m : 'Member');
                        const roll = m.student?.rollNo || '';
                        return (
                          <li key={i} className="flex items-center justify-between text-xs text-neutral-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#0B192C] text-white flex items-center justify-center text-[10px] font-bold">
                                {name.charAt(0)}
                              </div>
                              <span className="font-semibold">{name}</span>
                            </div>
                            {roll && <span className="font-mono text-[10px] text-neutral-400">{roll}</span>}
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-xs text-neutral-400 italic">No members yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE TEAM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#0B192C]">Create New Team</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0B192C] mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. AlgoRhythms / CyberKnights"
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !teamName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#0B192C]">Invite Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-[#0B192C]">Invitation Sent!</h4>
                <p className="text-xs text-neutral-500">The student will receive an invitation in their portal inbox.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                {inviteError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1">
                    Student Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteRollNo}
                    onChange={(e) => setInviteRollNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 21K61A1201"
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-[#DC2626]"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Enter the student's exact college roll number.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteRollNo.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
