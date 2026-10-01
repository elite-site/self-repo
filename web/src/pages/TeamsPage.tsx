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
      <div className="py-20" role="status" aria-live="polite">
        <BrandedLoading fullScreen={false} message="Loading Teams & Invitations..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">Hackathon & Project Teams</h1>
          <p className="text-body-sm text-ink-muted">
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
          className="btn btn-primary inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Create New Team</span>
        </button>
      </div>

      {events.length === 0 && !loading && (
        <div className="p-4 bg-status-bg-pending border border-edge-strong rounded-lg text-status-pending text-body-sm flex items-center gap-2.5" role="status">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-bold block">Team Creation Disabled</span>
            <span>No active event available to create a team for. Team creation will become available when an event opens.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={loadTeamsData} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {teamNotice && (
        <div className="p-4 bg-status-bg-approved border border-edge-strong rounded-lg text-status-approved text-body-sm flex items-center gap-2" role="status">
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{teamNotice}</span>
        </div>
      )}

      {teamError && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{teamError}</span>
        </div>
      )}

      {/* PENDING INVITATIONS */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-status-review" aria-hidden="true" />
            <h2 className="text-body-md font-bold text-ink font-heading">Pending Team Invitations ({invitations.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="surface border border-status-review/20 rounded-lg shadow-card flex flex-col justify-between space-y-4"
              >
                <div>
                  <span className="badge badge-review">Invitation</span>

                  <h3 className="font-bold text-body-sm text-ink font-heading mt-2">{inv.team?.name || 'Hackathon Squad'}</h3>
                  <p className="text-body-sm text-ink-secondary mt-0.5">
                    {inv.event?.name ? `For ${inv.event.name}` : 'General Project Team'}
                  </p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-edge">
                  <button
                    onClick={() => handleAcceptInvite(inv.id)}
                    className="btn btn-primary flex-1 flex justify-center items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(inv.id)}
                    className="btn btn-ghost flex-1 flex justify-center items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" /> Decline
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
          <div className="surface text-center py-20" role="status">
            <Users className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-body-md font-bold text-ink font-heading">No teams formed yet</h3>
            <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
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
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Your First Team</span>
            </button>
            {events.length === 0 && (
              <p className="text-label-sm text-status-pending mt-2 font-medium">
                No active event available to create a team for.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list" aria-label="Teams">
            {teams.map((t) => (
              <div
                key={t.id}
                className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors flex flex-col justify-between"
                role="listitem"
              >
                <div className="p-5 border-b border-edge flex items-center justify-between gap-2 bg-surface-sunken">
                  <div>
                    <h3 className="font-bold text-body-sm text-ink font-heading">{t.name}</h3>
                    <p className="text-label-sm text-ink-secondary">
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
                        className="p-1.5 rounded-lg border border-edge bg-surface text-ink-secondary hover:text-ink-brand hover:bg-brand-soft transition-colors cursor-pointer"
                        aria-label={`Invite member to ${t.name}`}
                      >
                        <UserPlus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleRemoveTeam(t)}
                        disabled={removingTeamId === t.id}
                        className="p-1.5 rounded-lg border border-edge bg-surface text-ink-muted hover:text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer disabled:opacity-50"
                        aria-label={`Remove team ${t.name}`}
                      >
                        {removingTeamId === t.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-2">
                  <h4 className="text-label-xs font-bold text-ink-muted uppercase tracking-wider">
                    Members ({t.members?.length || 1})
                  </h4>
                  <ul className="space-y-2">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m: any, i: number) => {
                        const name = m.student?.name || m.name || (typeof m === 'string' ? m : 'Member');
                        const roll = m.student?.rollNo || '';
                        return (
                          <li key={i} className="flex items-center justify-between text-body-sm text-ink-secondary">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-brand text-ink-inverse flex items-center justify-center text-label-xs font-bold font-heading">
                                {name.charAt(0)}
                              </div>
                              <span className="font-semibold text-ink">{name}</span>
                            </div>
                            {roll && <span className="text-label-xs text-ink-muted">{roll}</span>}
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-body-sm text-ink-muted italic">No members yet.</li>
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
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-on-primary/60 backdrop-blur-xs"
           role="dialog" aria-modal="true" aria-labelledby="create-team-modal-title"> <div className="surface max-w-md w-full p-6 shadow-modal border border-edge text-left">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <h3 id="create-team-modal-title" className="text-body-md font-bold text-ink font-heading">Create New Team</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors" aria-label="Close create team modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
              {createError && (
                <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
                  {createError}
                </div>
              )}

              {events.length === 0 && (
                <div className="p-3 bg-status-bg-pending border border-edge-strong rounded-lg text-body-sm text-status-pending flex items-center gap-2" role="status">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>No active event available to create a team for.</span>
                </div>
              )}

              <div>
                <label htmlFor="create-team-event" className="label">Target    Event *</label>
                {events.length === 0 ? (
                  <div className="p-2.5 surface-sunken border border-edge rounded-lg text-body-sm text-ink-secondary">
                    No active event available to create a team for.
                  </div>
                ) : (
                  <select id="create-team-event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                     className="select"
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
                <label htmlFor="create-team-name" className="label">Team    Name *</label>
                <input id="create-team-name"
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. AlgoRhythms / CyberKnights"
                   className="input" autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                   className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !teamName.trim() || !selectedEventId || events.length === 0}
                   className="btn btn-primary"
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
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-on-primary/60 backdrop-blur-xs"
           role="dialog" aria-modal="true" aria-labelledby="invite-modal-title"> <div className="surface max-w-md w-full p-6 shadow-modal border border-edge text-left">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <h3 id="invite-modal-title" className="text-body-md font-bold text-ink font-heading">Invite Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors" aria-label="Close invite modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center space-y-2" role="status" aria-live="polite">
                <Check className="w-10 h-10 text-status-approved mx-auto" aria-hidden="true" />
                <h4 className="text-body-sm font-bold text-ink font-heading">Invitation Sent!</h4>
                <p className="text-body-sm text-ink-secondary">The student will receive an invitation in their portal inbox.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                {inviteError && (
                  <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected" role="alert">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label htmlFor="invite-roll-no" className="label">
                    Student Roll Number *
                  </label>
                  <input id="invite-roll-no"
                    type="text"
                    required
                    value={inviteRollNo}
                    onChange={(e) => setInviteRollNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 21K61A1201"
                     className="input font-mono uppercase"
                  />
                  <p className="hint">Enter
                     the student's exact college roll number.</p>

                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteRollNo.trim()}
                    className="btn btn-primary"
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
