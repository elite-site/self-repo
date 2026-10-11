import { useState, useEffect, useCallback } from 'react';
import { teamsApi } from '../api';
import { Team, TeamInvitation } from '../types';
import { client } from '@/shared/api/client';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function useTeams() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteRollNo, setInviteRollNo] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const loadTeamsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tData, iData, eRes] = await Promise.all([
        teamsApi.getMyTeams().catch(() => []),
        teamsApi.getTeamInvitations().catch(() => []),
        client.get('/student/events').then((r) => r.data).catch(() => []),
      ]);
      if (Array.isArray(tData)) setTeams(tData);
      if (Array.isArray(iData)) setInvitations(iData);
      if (Array.isArray(eRes)) {
        setEvents(eRes);
        if (eRes.length > 0) {
          setSelectedEventId((prev) => prev || eRes[0].id);
        }
      }
    } catch {
      setError('Could not load teams information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamsData();
  }, [loadTeamsData]);

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
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      setTeamNotice(res?.message || `Team "${name}" has been removed.`);
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
      loadTeamsData();
    } catch {
      showToast('Failed to accept invitation.', 'error');
    }
  };

  const handleDeclineInvite = async (id: string) => {
    try {
      await teamsApi.declineInvitation(id);
      showToast('Invitation declined.');
      loadTeamsData();
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
  };
}
