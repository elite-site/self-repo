import React from 'react';
import { Users, Plus, Check, AlertCircle, Sparkles } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      {/* 1. ASYMMETRICAL TEAM HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="badge badge-brand text-xs font-semibold">Collaboration Hub</span>
                <h1 className="mt-1 text-headline-md font-black text-ink font-heading sm:text-headline-lg">
                  Hackathon & Project Teams
                </h1>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Form collaborative squads with peers across sections for department hackathons and challenges.
                </p>
              </div>

              {teams.length > 0 && (
                <button
                  onClick={openCreateModal}
                  disabled={events.length === 0}
                  title={events.length === 0 ? 'No active event available to create a team for.' : undefined}
                  className="btn btn-primary inline-flex items-center gap-1.5 shrink-0 min-h-[44px] px-5 shadow-sm"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Create team</span>
                </button>
              )}
            </div>

            <TeamInvitationsList
              invitations={invitations}
              onAccept={handleAcceptInvite}
              onDecline={handleDeclineInvite}
            />
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <Sparkles size={16} aria-hidden="true" />
                  Teamwork Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">
                  {teams.length} Squads
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Connect and collaborate across academic sections. Team captains can invite members via student roll number.
              </p>
              <div className="space-y-1.5 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Active Teams: <span className="font-bold text-ink">{teams.length}</span></div>
                <div>Pending Invites: <span className="text-ink">{invitations.length}</span></div>
              </div>
            </div>

            {events.length > 0 && teams.length === 0 && (
              <div className="mt-4 pt-3 border-t border-brand/20">
                <button
                  onClick={openCreateModal}
                  className="btn btn-primary text-xs w-full min-h-[38px] inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Start a New Team</span>
                </button>
              </div>
            )}
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {events.length === 0 && !loading && (
        <div className="p-4 bg-status-bg-pending border border-edge-strong rounded-2xl text-status-pending text-body-sm flex items-center gap-2.5" role="status">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-bold block">Team creation disabled</span>
            <span>No active event available to create a team for. Team creation will become available when an event opens.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-2xl text-status-rejected text-body-sm flex items-center justify-between" role="alert">
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
        <div className="p-4 bg-status-bg-approved border border-edge-strong rounded-2xl text-status-approved text-body-sm flex items-center gap-2" role="status">
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{teamNotice}</span>
        </div>
      )}

      {teamError && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-2xl text-status-rejected text-body-sm flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{teamError}</span>
        </div>
      )}

      {/* 2. MASONRY TEAM CARDS */}
      <div>
        {teams.length === 0 ? (
          <div className="surface text-center py-20 px-4 rounded-2xl border border-edge" role="status">
            <Users className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-body-md font-bold text-ink font-heading">No teams formed yet</h3>
            <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto mb-4">
              Create a team or join a classmate's team to participate in hackathons and multi-student challenges.
            </p>
            <button
              onClick={openCreateModal}
              disabled={events.length === 0}
              className="btn btn-primary inline-flex items-center gap-1.5 min-h-[44px] px-5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create team</span>
            </button>
          </div>
        ) : (
          <MasonryGrid cols={3}>
            {teams.map((t) => (
              <MasonryItem key={t.id}>
                <div className="card-lift">
                  <TeamCard
                    team={t}
                    removing={removingTeamId === t.id}
                    onInvite={openInviteModal}
                    onRemove={handleRemoveTeam}
                  />
                </div>
              </MasonryItem>
            ))}
          </MasonryGrid>
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
