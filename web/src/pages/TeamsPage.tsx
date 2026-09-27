import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Loader2, Plus, UserPlus, Check, X, AlertCircle, Mail, Trash2 } from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);

  // Create Team Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
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
      const [tData, iData, eData] = await Promise.all([
        api.getMyTeams().catch(() => []),
        api.getTeamInvitations().catch(() => []),
        api.getEvents().catch(() => []),
      ]);
      if (Array.isArray(tData)) setTeams(tData);
      if (Array.isArray(iData)) setInvitations(iData);
      if (Array.isArray(eData)) {
        setEvents(eData);
        if (eData.length > 0) {
          setSelectedEventId(prev => prev || eData[0].id);
        }
      }
    } catch {
      setError('Could not load teams information.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async (team: any) => {
    const name = team?.name || 'this team';
    if (!window.confirm(`Remove the team "${name}"? All members and pending invitations will be removed. This cannot be undone.`)) {
      return;
    }
    setRemovingTeamId(team.id);
    setTeamError(null);
    try {
      const res = await api.removeTeam(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      setTeamNotice(res?.message || `Team "${name}" has been removed.`);
    } catch (err: any) {
      setTeamError(err?.response?.data?.message || 'Could not remove the team. Please try again.');
    } finally {
      setRemovingTeamId(null);
    }
  };

  useEffect(() => {
    loadTeamsData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedEventId) return;
    setCreating(true);
    setCreateError(null);

    try {
      await api.createTeam({ name: teamName.trim(), eventId: selectedEventId });
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
      <div className="py-20">
        <BrandedLoading fullScreen={false} message="Loading Teams & Invitations..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] font-heading">Hackathon & Project Teams</h1>
          <p className="text-xs text-[#475569]">
            Form collaborative teams with peers across sections for department hackathons and projects
          </p>
        </div>
        <button
          onClick={() => {
            setTeamName('');
            setCreateError(null);
            if (events.length > 0 && !selectedEventId) {
              setSelectedEventId(events[0].id);
            }
            setCreateModalOpen(true);
          }}
          disabled={events.length === 0}
          title={events.length === 0 ? 'No active event available to create a team for.' : undefined}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {events.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold block">Team Creation Disabled</span>
            <span>No active event available to create a team for. Team creation will become available when an event opens.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadTeamsData} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {teamNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{teamNotice}</span>
        </div>
      )}

      {teamError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{teamError}</span>
        </div>
      )}

      {/* PENDING INVITATIONS */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-[#0F172A] font-heading">Pending Team Invitations ({invitations.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-5 border border-purple-200 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between space-y-4"
              >
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    Invitation
                  </span>
                  <h3 className="font-bold text-sm text-[#0F172A] font-heading mt-2">{inv.team?.name || 'Hackathon Squad'}</h3>
                  <p className="text-xs text-[#475569] mt-0.5">
                    {inv.event?.name ? `For ${inv.event.name}` : 'General Project Team'}
                  </p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-[#E4E7F2]">
                  <button
                    onClick={() => handleAcceptInvite(inv.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(inv.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-[#F7F8FC] border border-[#E4E7F2] text-[#475569] hover:bg-neutral-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
          <div className="text-center py-20 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Users className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="font-bold text-sm text-[#0F172A] font-heading">No teams formed yet</h3>
            <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto mb-4">
              Create a team or join a classmate's team to participate in hackathons and multi-student challenges.
            </p>
            <button
              onClick={() => {
                setTeamName('');
                setCreateError(null);
                if (events.length > 0 && !selectedEventId) {
                  setSelectedEventId(events[0].id);
                }
                setCreateModalOpen(true);
              }}
              disabled={events.length === 0}
              title={events.length === 0 ? 'No active event available to create a team for.' : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-lg text-xs font-bold transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Team</span>
            </button>
            {events.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-2 font-medium">
                No active event available to create a team for.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-[#E4E7F2] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-[#4F46E5]/40 transition-all"
              >
                <div className="p-5 border-b border-[#E4E7F2] flex items-center justify-between gap-2 bg-[#F7F8FC]">
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A] font-heading">{t.name}</h3>
                    <p className="text-[11px] text-[#475569]">
                      {t.event?.name || 'Independent Team'}
                    </p>
                  </div>
                  {t.isLeader && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedTeamId(t.id);
                          setInviteRollNo('');
                          setInviteError(null);
                          setInviteSuccess(false);
                          setInviteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-[#E4E7F2] bg-white text-[#475569] hover:text-[#4F46E5] hover:bg-[#E0E7FF]/20 transition-colors cursor-pointer"
                        title="Invite Member"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveTeam(t)}
                        disabled={removingTeamId === t.id}
                        className="p-1.5 rounded-lg border border-[#E4E7F2] bg-white text-[#94A3B8] hover:text-[#E11D48] hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove Team"
                      >
                        {removingTeamId === t.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-2">
                  <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    Members ({t.members?.length || 1})
                  </h4>
                  <ul className="space-y-2">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m: any, i: number) => {
                        const name = m.student?.name || m.name || (typeof m === 'string' ? m : 'Member');
                        const roll = m.student?.rollNo || '';
                        return (
                          <li key={i} className="flex items-center justify-between text-xs text-[#475569]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[10px] font-bold font-heading">
                                {name.charAt(0)}
                              </div>
                              <span className="font-semibold text-[#0F172A]">{name}</span>
                            </div>
                            {roll && <span className="text-[10px] text-[#94A3B8]">{roll}</span>}
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-xs text-[#94A3B8] italic">No members yet.</li>
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-[#E4E7F2] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7F2]">
              <h3 className="text-base font-bold text-[#0F172A] font-heading">Create New Team</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {createError}
                </div>
              )}

              {events.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No active event available to create a team for.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Target Event *</label>
                {events.length === 0 ? (
                  <div className="p-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs text-[#475569]">
                    No active event available to create a team for.
                  </div>
                ) : (
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                  >
                    <option value="" disabled>Select an event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title || ev.name} ({ev.year || 2026})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. AlgoRhythms / CyberKnights"
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !teamName.trim() || !selectedEventId || events.length === 0}
                  className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-[#E4E7F2] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7F2]">
              <h3 className="text-base font-bold text-[#0F172A] font-heading">Invite Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-[#0F172A] font-heading">Invitation Sent!</h4>
                <p className="text-xs text-[#475569]">The student will receive an invitation in their portal inbox.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                {inviteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Student Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteRollNo}
                    onChange={(e) => setInviteRollNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 21K61A1201"
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Enter the student's exact college roll number.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteRollNo.trim()}
                    className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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

export default TeamsPage;

