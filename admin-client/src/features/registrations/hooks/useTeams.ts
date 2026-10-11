import { useState, useEffect, useCallback } from 'react';
import { registrationsApi } from '../api';
import { RegistrationTeam, TeamStatus, MemberToRemove } from '../types';

export const useTeams = (
  selectedEventId: string,
  selectedStatus: string,
  searchQuery: string,
  activeView: 'table' | 'teams',
  onMemberRemoved?: () => void
) => {
  const [teams, setTeams] = useState<RegistrationTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberToRemove | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removingMember, setRemovingMember] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const res = await registrationsApi.getTeams({
        eventId: selectedEventId === 'all' ? undefined : selectedEventId,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery.trim() || undefined,
      });
      setTeams(res.teams || []);
    } catch (err: any) {
      setTeamsError(err?.response?.data?.message || 'Failed to load teams.');
    } finally {
      setTeamsLoading(false);
    }
  }, [selectedEventId, selectedStatus, searchQuery]);

  useEffect(() => {
    if (activeView === 'teams') {
      fetchTeams();
    }
  }, [activeView, fetchTeams]);

  const handleUpdateTeamStatus = async (teamId: string, newStatus: TeamStatus) => {
    try {
      setTeamsError(null);
      await registrationsApi.updateTeamStatus(teamId, newStatus);
      fetchTeams();
    } catch (err: any) {
      setTeamsError(err?.response?.data?.message || 'Failed to update team status.');
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    setTeamsError(null);
    try {
      await registrationsApi.removeTeamMember(
        memberToRemove.teamId,
        memberToRemove.studentId,
        removeReason.trim() || undefined
      );
      setMemberToRemove(null);
      setRemoveReason('');
      fetchTeams();
      if (onMemberRemoved) onMemberRemoved();
    } catch (err: any) {
      setTeamsError(err?.response?.data?.message || 'Failed to remove member.');
    } finally {
      setRemovingMember(false);
    }
  };

  return {
    teams,
    teamsLoading,
    teamsError,
    memberToRemove,
    setMemberToRemove,
    removeReason,
    setRemoveReason,
    removingMember,
    fetchTeams,
    handleUpdateTeamStatus,
    handleConfirmRemoveMember,
  };
};
