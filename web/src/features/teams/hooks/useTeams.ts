import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api';
import { Team, TeamInvitation } from '../types';
import { client } from '@/shared/api/client';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const teamsKeys = {
  all: ['teams'] as const,
  overview: () => [...teamsKeys.all, 'overview'] as const,
};

interface TeamsQueryData {
  teams: Team[];
  invitations: TeamInvitation[];
  events: any[];
}

export function useTeams() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteRollNo, setInviteRollNo] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const { data, isPending, isError, refetch } = useQuery<TeamsQueryData>({
    queryKey: teamsKeys.overview(),
    queryFn: async () => {
      const [tData, iData, eRes] = await Promise.all([
        teamsApi.getMyTeams().catch(() => []),
        teamsApi.getTeamInvitations().catch(() => []),
        client.get('/student/events').then((r) => r.data).catch(() => []),
      ]);
      const eventsList = Array.isArray(eRes) ? eRes : [];
      if (eventsList.length > 0) {
        setSelectedEventId((prev) => prev || eventsList[0].id);
      }
      return {
        teams: Array.isArray(tData) ? tData : [],
        invitations: Array.isArray(iData) ? iData : [],
        events: eventsList,
      };
    },
    staleTime: 60_000,
  });

  const teams = data?.teams ?? [];
  const invitations = data?.invitations ?? [];
  const events = data?.events ?? [];

  const loadTeamsData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleRemoveTeam = async (team: Team) => {
    const name = team?.name || 'this team';
    const confirmed = await confirm({
      title: `Remove ${name}?`,
      description: 'All members and pending invitations will be removed. This cannot be undone.',
      confirmLabel: 'Remove team',
      tone: 'danger',
    });
    if (!confirmed) return;
    setRemovingTeamId(team.id);
    setTeamError(null);
    try {
      const res = await teamsApi.removeTeam(team.id);
      queryClient.setQueryData<TeamsQueryData>(teamsKeys.overview(), (prev) =>
        prev ? { ...prev, teams: prev.teams.filter((t) => t.id !== team.id) } : prev,
      );
      setTeamNotice(res?.message || `Team "${name}" has been removed.`);
      void queryClient.invalidateQueries({ queryKey: teamsKeys.overview() });
    } catch (err: any) {
      setTeamError(err?.response?.data?.message || 'Could not remove the team. Please try again.');
    } finally {
      setRemovingTeamId(null);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedEventId) return;
    setCreating(true);
    setCreateError(null);

    try {
      await teamsApi.createTeam({ name: teamName.trim(), eventId: selectedEventId });
      setCreateModalOpen(false);
      setTeamName('');
      void queryClient.invalidateQueries({ queryKey: teamsKeys.overview() });
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
      await teamsApi.inviteToTeam(selectedTeamId, inviteRollNo.trim());
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
      await teamsApi.acceptInvitation(id);
      showToast('Invitation accepted.');
      void queryClient.invalidateQueries({ queryKey: teamsKeys.overview() });
    } catch {
      showToast('Failed to accept invitation.', 'error');
    }
  };

  const handleDeclineInvite = async (id: string) => {
    try {
      await teamsApi.declineInvitation(id);
      showToast('Invitation declined.');
      void queryClient.invalidateQueries({ queryKey: teamsKeys.overview() });
    } catch {
      showToast('Failed to decline invitation.', 'error');
    }
  };

  const openCreateModal = () => {
    setTeamName('');
    setCreateError(null);
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
    setCreateModalOpen(true);
  };

  const openInviteModal = (teamId: string) => {
    setSelectedTeamId(teamId);
    setInviteRollNo('');
    setInviteError(null);
    setInviteSuccess(false);
    setInviteModalOpen(true);
  };

  return {
    teams,
    invitations,
    events,
    loading: isPending && !data,
    error: isError && !data ? 'Could not load teams information.' : null,
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
  };
}
