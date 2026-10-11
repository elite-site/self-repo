import React from 'react';
import { Users, Loader2, Shield, UserMinus, Clock } from 'lucide-react';
import { RegistrationTeam, TeamStatus, MemberToRemove } from '../types';
import { TeamStatusBadge } from './RegistrationStatusBadge';

export interface TeamsViewProps {
  teams: RegistrationTeam[];
  teamsLoading: boolean;
  onUpdateTeamStatus: (teamId: string, status: TeamStatus) => void;
  onSetMemberToRemove: (member: MemberToRemove) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  teamsLoading,
  onUpdateTeamStatus,
  onSetMemberToRemove,
}) => {
  return (
    <div className="space-y-4">
      {teamsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-lg border border-edge gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
          <span className="text-xs text-ink-muted font-medium">Loading teams…</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-lg border border-edge gap-3 text-center px-4">
          <Users className="w-12 h-12 text-ink-muted" />
          <h3 className="font-bold text-sm text-ink">No teams found</h3>
          <p className="text-xs text-ink-muted max-w-sm">
            No teams have been formed for this event matching the selected criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => {
            const leaderName = team.leader?.name || 'Leader';
            const leaderRoll = team.leader?.rollNo || team.leaderId;

            return (
              <div
                key={team.id}
                className="bg-surface rounded-lg border border-edge p-5 space-y-4 shadow-xs"
              >
                {/* Team Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-ink">{team.name}</h3>
                      <TeamStatusBadge status={team.status} />
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      Event: <span className="font-semibold text-ink-secondary">{team.event?.name}</span>
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {team.status !== 'COMPLETE' && (
                      <button
                        onClick={() => onUpdateTeamStatus(team.id, 'COMPLETE')}
                        className="px-2 py-1 text-xs font-bold rounded bg-status-bg-approved text-status-approved border border-edge hover:bg-status-bg-approved cursor-pointer"
                      >
                        Mark Complete
                      </button>
                    )}
                    {team.status !== 'ACTIVE' && team.status !== 'COMPLETE' && (
                      <button
                        onClick={() => onUpdateTeamStatus(team.id, 'ACTIVE')}
                        className="px-2 py-1 text-xs font-bold rounded bg-status-bg-approved text-status-approved border border-edge hover:bg-status-bg-approved cursor-pointer"
                      >
                        Activate
                      </button>
                    )}
                    {team.status !== 'REJECTED' && (
                      <button
                        onClick={() => onUpdateTeamStatus(team.id, 'REJECTED')}
                        className="px-2 py-1 text-xs font-bold rounded bg-status-bg-rejected text-status-rejected border border-edge hover:bg-status-bg-rejected cursor-pointer"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Leader Banner */}
                <div className="p-2.5 rounded-xl bg-status-bg-review/70 border border-edge flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-status-review" />
                    <span className="font-bold text-ink">Leader:</span>
                    <span className="font-semibold text-ink-secondary">{leaderName}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-status-review">
                    {leaderRoll}
                  </span>
                </div>

                {/* Members List */}
                <div>
                  <div className="text-xs font-bold text-ink-muted mb-2 flex items-center justify-between">
                    <span>Members ({team.members?.length || 0})</span>
                  </div>

                  <div className="space-y-1.5">
                    {team.members && team.members.length > 0 ? (
                      team.members.map((m) => {
                        const isLeader = m.studentId === team.leaderId;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-surface-sunken border border-edge text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-surface-inset flex items-center justify-center text-xs font-bold text-ink-secondary shrink-0">
                                {m.student.name?.[0] || 'M'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-ink truncate">
                                  {m.student.name}
                                  {isLeader && (
                                    <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.2 rounded bg-status-bg-review text-status-review">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-ink-muted">
                                  {m.student.rollNo} · Y{m.student.year} ({m.student.section})
                                </div>
                              </div>
                            </div>

                            {!isLeader && (
                              <button
                                onClick={() =>
                                  onSetMemberToRemove({
                                    teamId: team.id,
                                    teamName: team.name,
                                    studentId: m.studentId,
                                    studentName: m.student.name,
                                    rollNo: m.student.rollNo,
                                  })
                                }
                                title="Remove member from team (ADM-09)"
                                className="p-1 hover:bg-status-bg-rejected text-ink-muted hover:text-status-rejected rounded transition-colors cursor-pointer"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-ink-muted italic">No members yet</div>
                    )}
                  </div>
                </div>

                {/* Pending Invitations */}
                {team.invitations && team.invitations.length > 0 && (
                  <div className="pt-2 border-t border-edge">
                    <div className="text-xs font-bold text-ink-muted mb-1.5">
                      Pending Invitations ({team.invitations.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {team.invitations.map((inv) => (
                        <span
                          key={inv.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-surface-sunken text-ink-secondary"
                        >
                          <Clock className="w-2.5 h-2.5 text-status-pending" />
                          {inv.student.rollNo} ({inv.status.toLowerCase()})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
