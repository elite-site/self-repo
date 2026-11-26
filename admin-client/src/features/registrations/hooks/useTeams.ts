import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registrationsApi } from '../api/index';
import { RegistrationTeam, TeamStatus, MemberToRemove } from '../types';

export const ADMIN_TEAMS_QUERY_KEY = ['admin', 'teams'] as const;

export const useTeams = (
  selectedEventId: string,
  selectedStatus: string,
  searchQuery: string,
  activeView: 'table' | 'teams',
  onMemberRemoved?: () => void,
) => {
  const [memberToRemove, setMemberToRemove] = useState<MemberToRemove | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removingMember, setRemovingMember] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const params = {
    eventId: selectedEventId === 'all' ? undefined : selectedEventId,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    search: searchQuery.trim() || undefined,
  };

  const query = useQuery<RegistrationTeam[]>({
    queryKey: [...ADMIN_TEAMS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await registrationsApi.getTeams(params);
      return res.teams || [];
    },
    enabled: activeView === 'teams',
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (query.isError) {
      setTeamsError((query.error as any)?.response?.data?.message || 'Failed to load teams.');
    } else if (query.isSuccess) {
      setTeamsError(null);
    }
  }, [query.isError, query.isSuccess, query.error]);

  const fetchTeams = useCallback(async () => {
    setTeamsError(null);
    await query.refetch();
  }, [query]);

  const handleUpdateTeamStatus = async (teamId: string, newStatus: TeamStatus) => {
    try {
      setTeamsError(null);
      await registrationsApi.updateTeamStatus(teamId, newStatus);
      void query.refetch();
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
        removeReason.trim() || undefined,
      );
      setMemberToRemove(null);
      setRemoveReason('');
      void query.refetch();
      if (onMemberRemoved) onMemberRemoved();
    } catch (err: any) {
      setTeamsError(err?.response?.data?.message || 'Failed to remove member.');
    } finally {
      setRemovingMember(false);
    }
  };

  return {
    teams: query.data ?? [],
    teamsLoading: activeView === 'teams' && query.isPending,
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
