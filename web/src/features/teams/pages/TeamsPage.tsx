import React from 'react';
import { Users, Plus, Check, AlertCircle } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
import { useTeams } from '../hooks/useTeams';
import { TeamCard, TeamInvitationsList, CreateTeamModal, InviteMemberModal } from '../components';

export const TeamsPage: React.FC = () => {
  const {
    teams,
    invitations,
    events,
    loading,
    error,
    removingTeamId,
    teamError,
    teamNotice,
    createModalOpen,
    setCreateModalOpen,
    teamName,
    setTeamName,
    selectedEventId,
    setSelectedEventId,
    creating,
    createError,
    inviteModalOpen,
    setInviteModalOpen,
    inviteRollNo,
    setInviteRollNo,
    inviting,
    inviteError,
    inviteSuccess,
    loadTeamsData,
    handleRemoveTeam,
    handleCreateTeam,
    handleInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    openCreateModal,
    openInviteModal,
  } = useTeams();

  if (loading) {
    return <SkeletonListPage label="Loading teams and invitations" rows={4} />;
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">Hackathon & Project Teams</h1>
          <p className="text-body-sm text-ink-muted">
            Form collaborative teams with peers across sections for department hackathons and projects
          </p>
        </div>
        {teams.length > 0 && (
          <button
            onClick={openCreateModal}
            disabled={events.length === 0}
            title={events.length === 0 ? 'No active event available to create a team for.' : undefined}
            className="btn btn-primary inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create team</span>
          </button>
        )}
      </div>

      {events.length === 0 && !loading && (
        <div className="p-4 bg-status-bg-pending border border-edge-strong rounded-lg text-status-pending text-body-sm flex items-center gap-2.5" role="status">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-bold block">Team creation disabled</span>
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

      <TeamInvitationsList
        invitations={invitations}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />

      <div>
        {teams.length === 0 ? (
          <div className="surface text-center py-20" role="status">
            <Users className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-body-md font-bold text-ink font-heading">No teams formed yet</h3>
            <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
              Create a team or join a classmate's team to participate in hackathons and multi-student challenges.
            </p>
            <button
              onClick={openCreateModal}
              disabled={events.length === 0}
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create team</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list" aria-label="Teams">
            {teams.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                removing={removingTeamId === t.id}
                onInvite={openInviteModal}
                onRemove={handleRemoveTeam}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTeamModal
        isOpen={createModalOpen}
        events={events}
        selectedEventId={selectedEventId}
        teamName={teamName}
        creating={creating}
        createError={createError}
        onEventChange={setSelectedEventId}
        onTeamNameChange={setTeamName}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
      />

      <InviteMemberModal
        isOpen={inviteModalOpen}
        inviteRollNo={inviteRollNo}
        inviting={inviting}
        inviteError={inviteError}
        inviteSuccess={inviteSuccess}
        onRollNoChange={setInviteRollNo}
        onClose={() => setInviteModalOpen(false)}
        onSubmit={handleInvite}
      />
    </div>
  );
};

export default TeamsPage;
