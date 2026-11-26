import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/shared/ui';
import { registrationsApi } from '../api/index';
import { eventsApi } from '@/features/events/api/index';
import { ADMIN_EVENTS_QUERY_KEY } from '@/features/events/hooks/useEvents';
import { EventItem } from '@/features/events/types';
import {
  RegistrationItem,
  RegistrationStatus,
  RegistrationStats,
  RegistrationsResponse,
} from '../types';

export const ADMIN_REGISTRATIONS_QUERY_KEY = ['admin', 'registrations'] as const;

const EMPTY_STATS: RegistrationStats = {
  total: 0,
  confirmed: 0,
  pending: 0,
  waitlisted: 0,
  cancelled: 0,
  rejected: 0,
  totalTeams: 0,
  completedTeams: 0,
};

export const useRegistrations = () => {
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<'table' | 'teams'>('table');
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'all' | 'team' | 'solo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationItem | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const eventsQuery = useQuery<EventItem[]>({
    queryKey: ADMIN_EVENTS_QUERY_KEY,
    queryFn: async () => {
      const res = await eventsApi.getEvents();
      return res.events || [];
    },
  });

  const filters = {
    eventId: selectedEventId === 'all' ? undefined : selectedEventId,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    year: selectedYear === 'ALL' ? undefined : parseInt(selectedYear, 10),
    section: selectedSection === 'ALL' ? undefined : selectedSection,
    team: selectedTeamFilter === 'all' ? undefined : selectedTeamFilter,
    search: searchQuery.trim() || undefined,
    page,
    limit,
  };

  const registrationsQueryKey = [...ADMIN_REGISTRATIONS_QUERY_KEY, filters] as const;

  const registrationsQuery = useQuery<RegistrationsResponse>({
    queryKey: registrationsQueryKey,
    queryFn: () => registrationsApi.getRegistrations(filters),
    enabled: activeView === 'table',
    placeholderData: (previous) => previous,
  });

  const fetchRegistrations = useCallback(async () => {
    await registrationsQuery.refetch();
  }, [registrationsQuery]);

  const registrations = registrationsQuery.data?.registrations ?? [];
  const totalRegistrations = registrationsQuery.data?.pagination?.total ?? 0;
  const rawStats = registrationsQuery.data?.stats;
  const stats: RegistrationStats = rawStats
    ? {
        total: rawStats.total || 0,
        confirmed: rawStats.confirmed || 0,
        pending: rawStats.pending || 0,
        waitlisted: rawStats.waitlisted || 0,
        cancelled: rawStats.cancelled || 0,
        rejected: rawStats.rejected || 0,
        totalTeams: rawStats.totalTeams || 0,
        completedTeams: rawStats.completedTeams || 0,
      }
    : EMPTY_STATS;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void registrationsQuery.refetch();
  };

  const handleUpdateStatus = async (id: string, newStatus: RegistrationStatus) => {
    setStatusUpdateLoading(true);
    setActionError(null);
    try {
      const res = await registrationsApi.updateRegistrationStatus(id, newStatus, statusNote.trim() || undefined);
      if (res.success && res.registration) {
        queryClient.setQueryData<RegistrationsResponse>(registrationsQueryKey, (prev) =>
          prev
            ? {
                ...prev,
                registrations: (prev.registrations || []).map((r) =>
                  r.id === id ? { ...r, status: newStatus } : r,
                ),
              }
            : prev,
        );
        if (selectedRegistration?.id === id) {
          setSelectedRegistration((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        void registrationsQuery.refetch();
        setStatusNote('');
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update registration status.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete this registration?',
      description: 'The registration will be permanently removed from this event. This cannot be undone.',
      confirmLabel: 'Delete registration',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      setActionError(null);
      await registrationsApi.deleteRegistration(id);
      setSelectedRegistration(null);
      void registrationsQuery.refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to delete registration.');
    }
  };

  const handleExport = () => {
    const url = registrationsApi.getRegistrationsExportUrl({
      eventId: selectedEventId === 'all' ? undefined : selectedEventId,
      status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      year: selectedYear === 'ALL' ? undefined : parseInt(selectedYear, 10),
      section: selectedSection === 'ALL' ? undefined : selectedSection,
    });
    window.open(url, '_blank');
  };

  const handleResetFilters = () => {
    setSelectedEventId('all');
    setSelectedStatus('ALL');
    setSelectedYear('ALL');
    setSelectedSection('ALL');
    setSelectedTeamFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters =
    selectedEventId !== 'all' ||
    selectedStatus !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedSection !== 'ALL' ||
    selectedTeamFilter !== 'all' ||
    Boolean(searchQuery.trim());

  return {
    activeView,
    setActiveView,
    registrations,
    totalRegistrations,
    loading: registrationsQuery.isPending,
    error: registrationsQuery.isError
      ? ((registrationsQuery.error as any)?.response?.data?.message ||
        (registrationsQuery.error as Error)?.message ||
        'Failed to load registrations.')
      : null,
    actionError,
    setActionError,
    events: eventsQuery.data ?? [],
    selectedEventId,
    setSelectedEventId,
    selectedStatus,
    setSelectedStatus,
    selectedYear,
    setSelectedYear,
    selectedSection,
    setSelectedSection,
    selectedTeamFilter,
    setSelectedTeamFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    limit,
    stats,
    selectedRegistration,
    setSelectedRegistration,
    statusUpdateLoading,
    statusNote,
    setStatusNote,
    fetchRegistrations,
    handleSearchSubmit,
    handleUpdateStatus,
    handleDeleteRegistration,
    handleExport,
    handleResetFilters,
    hasActiveFilters,
  };
};
