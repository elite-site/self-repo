import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/shared/ui';
import { registrationsApi } from '../api';
import { eventsApi } from '@/features/events/api';
import { EventItem } from '@/features/events/types';
import {
  RegistrationItem,
  RegistrationStatus,
  RegistrationStats,
} from '../types';

export const useRegistrations = () => {
  const confirm = useConfirm();

  const [activeView, setActiveView] = useState<'table' | 'teams'>('table');
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'all' | 'team' | 'solo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [stats, setStats] = useState<RegistrationStats>({
    total: 0,
    confirmed: 0,
    pending: 0,
    waitlisted: 0,
    cancelled: 0,
    rejected: 0,
    totalTeams: 0,
    completedTeams: 0,
  });

  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationItem | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  // Load events
  useEffect(() => {
    eventsApi
      .getEvents()
      .then((res) => setEvents(res.events || []))
      .catch((err) => console.error('Failed to load events:', err));
  }, []);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await registrationsApi.getRegistrations({
        eventId: selectedEventId === 'all' ? undefined : selectedEventId,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        year: selectedYear === 'ALL' ? undefined : parseInt(selectedYear, 10),
        section: selectedSection === 'ALL' ? undefined : selectedSection,
        team: selectedTeamFilter === 'all' ? undefined : selectedTeamFilter,
        search: searchQuery.trim() || undefined,
        page,
        limit,
      });

      setRegistrations(res.registrations || []);
      setTotalRegistrations(res.pagination?.total || 0);
      if (res.stats) {
        setStats({
          total: res.stats.total || 0,
          confirmed: res.stats.confirmed || 0,
          pending: res.stats.pending || 0,
          waitlisted: res.stats.waitlisted || 0,
          cancelled: res.stats.cancelled || 0,
          rejected: res.stats.rejected || 0,
          totalTeams: res.stats.totalTeams || 0,
          completedTeams: res.stats.completedTeams || 0,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load registrations.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedEventId,
    selectedStatus,
    selectedYear,
    selectedSection,
    selectedTeamFilter,
    searchQuery,
    page,
    limit,
  ]);

  useEffect(() => {
    if (activeView === 'table') {
      fetchRegistrations();
    }
  }, [activeView, fetchRegistrations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const handleUpdateStatus = async (id: string, newStatus: RegistrationStatus) => {
    setStatusUpdateLoading(true);
    setActionError(null);
    try {
      const res = await registrationsApi.updateRegistrationStatus(id, newStatus, statusNote.trim() || undefined);
      if (res.success && res.registration) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
        if (selectedRegistration?.id === id) {
          setSelectedRegistration((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        fetchRegistrations();
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
      fetchRegistrations();
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
    loading,
    error,
    actionError,
    setActionError,
    events,
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
