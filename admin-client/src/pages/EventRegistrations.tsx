import React, { useState, useEffect } from 'react';
import { useConfirm } from '../components/ui/ConfirmDialog';
import {
  Layers,
  Users,
  Search,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  UserMinus,
  Check,
  UserCheck,
  Sparkles,
  Shield,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { adminApi } from '../services/api';
import {
  RegistrationItem,
  RegistrationStatus,
  RegistrationTeam,
  TeamStatus,
  EventItem,
} from '../types';

export const EventRegistrations: React.FC = () => {
  const confirm = useConfirm();

  // Navigation / View State
  const [activeView, setActiveView] = useState<'table' | 'teams'>('table');

  // Registrations state
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Teams state
  const [teams, setTeams] = useState<RegistrationTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Events list for filter
  const [events, setEvents] = useState<EventItem[]>([]);

  // Filter state
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'all' | 'team' | 'solo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Stats state
  const [stats, setStats] = useState<{
    total: number;
    confirmed: number;
    pending: number;
    waitlisted: number;
    cancelled: number;
    rejected: number;
    totalTeams: number;
    completedTeams: number;
  }>({
    total: 0,
    confirmed: 0,
    pending: 0,
    waitlisted: 0,
    cancelled: 0,
    rejected: 0,
    totalTeams: 0,
    completedTeams: 0,
  });

  // Drawer / Modal states
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationItem | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  // Remove Member Dialog State (ADM-09)
  const [memberToRemove, setMemberToRemove] = useState<{
    teamId: string;
    teamName: string;
    studentId: string;
    studentName: string;
    rollNo: string;
  } | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removingMember, setRemovingMember] = useState(false);

  // Load events for dropdown
  useEffect(() => {
    adminApi
      .getEvents()
      .then((res) => setEvents(res.events || []))
      .catch((err) => console.error('Failed to load events:', err));
  }, []);

  // Fetch registrations
  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRegistrations({
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
  };

  // Fetch teams
  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await adminApi.getTeams({
        eventId: selectedEventId === 'all' ? undefined : selectedEventId,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery.trim() || undefined,
      });
      setTeams(res.teams || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Reload data when filters or pagination change
  useEffect(() => {
    if (activeView === 'table') {
      fetchRegistrations();
    } else {
      fetchTeams();
    }
  }, [
    activeView,
    selectedEventId,
    selectedStatus,
    selectedYear,
    selectedSection,
    selectedTeamFilter,
    page,
  ]);

  // Handle live search submission or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (activeView === 'table') {
      fetchRegistrations();
    } else {
      fetchTeams();
    }
  };

  // Update registration status
  const handleUpdateStatus = async (id: string, newStatus: RegistrationStatus) => {
    setStatusUpdateLoading(true);
    setActionError(null);
    try {
      const res = await adminApi.updateRegistrationStatus(id, newStatus, statusNote.trim() || undefined);
      if (res.success && res.registration) {
        // update local list
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
        if (selectedRegistration?.id === id) {
          setSelectedRegistration((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        // Refresh counts
        fetchRegistrations();
        setStatusNote('');
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update registration status.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Delete registration
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
      await adminApi.deleteRegistration(id);
      setSelectedRegistration(null);
      fetchRegistrations();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to delete registration.');
    }
  };

  // Update team status
  const handleUpdateTeamStatus = async (teamId: string, newStatus: TeamStatus) => {
    try {
      setActionError(null);
      await adminApi.updateTeamStatus(teamId, newStatus);
      fetchTeams();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update team status.');
    }
  };

  // Confirm remove member
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    setActionError(null);
    try {
      await adminApi.removeTeamMember(
        memberToRemove.teamId,
        memberToRemove.studentId,
        removeReason.trim() || undefined
      );
      setMemberToRemove(null);
      setRemoveReason('');
      fetchTeams();
      if (activeView === 'table') fetchRegistrations();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to remove member.');
    } finally {
      setRemovingMember(false);
    }
  };

  // Export registrations Excel
  const handleExport = () => {
    const url = adminApi.getRegistrationsExportUrl({
      eventId: selectedEventId === 'all' ? undefined : selectedEventId,
      status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      year: selectedYear === 'ALL' ? undefined : parseInt(selectedYear, 10),
      section: selectedSection === 'ALL' ? undefined : selectedSection,
    });
    window.open(url, '_blank');
  };

  // Reset filters
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

  // Status badge styling
  const renderStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-approved text-status-approved border border-edge">
            <CheckCircle2 className="w-3 h-3 text-status-approved" /> Confirmed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-pending text-status-pending border border-edge">
            <Clock className="w-3 h-3 text-status-pending" /> Pending Review
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-approved text-status-approved border border-edge">
            <UserCheck className="w-3 h-3 text-status-approved" /> Waitlisted
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-sunken text-ink-secondary border border-edge">
            <X className="w-3 h-3 text-ink-muted" /> Cancelled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-rejected text-status-rejected border border-edge">
            <XCircle className="w-3 h-3 text-status-rejected" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-surface-sunken text-ink-secondary">
            {status}
          </span>
        );
    }
  };

  const renderTeamStatusBadge = (status: TeamStatus) => {
    switch (status) {
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-approved text-status-approved border border-edge">
            <CheckCircle2 className="w-3 h-3" /> Complete
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-approved text-status-approved border border-edge">
            <Sparkles className="w-3 h-3" /> Active
          </span>
        );
      case 'FORMING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-pending text-status-pending border border-edge">
            <Clock className="w-3 h-3" /> Forming
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-bg-rejected text-status-rejected border border-edge">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalRegistrations / limit) || 1;

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOP HEADER & VIEW TOGGLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-edge shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-status-bg-rejected text-status-rejected flex items-center justify-center shrink-0 border border-edge">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-ink">
                Event Registrations
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-surface-sunken text-ink-secondary">
                ADM-08 / ADM-09
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Operational participant management, custom questionnaire review, and team administration.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View switcher pills */}
          <div className="flex items-center bg-surface-sunken p-1 rounded-xl border border-edge">
            <button
              onClick={() => {
                setActiveView('table');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeView === 'table'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Registrations</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface-inset">
                {stats.total}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveView('teams');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeView === 'teams'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team View</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface-inset">
                {stats.totalTeams}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeView === 'table') fetchRegistrations();
              else fetchTeams();
            }}
            title="Refresh list"
            className="p-2 border border-edge rounded-xl hover:bg-surface-sunken text-ink-secondary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading || teamsLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-inverse text-ink-inverse hover:opacity-90 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-status-bg-rejected border border-edge-strong rounded-xl text-status-rejected text-xs" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold underline cursor-pointer shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total</span>
            <Layers className="w-4 h-4 text-status-approved" />
          </div>
          <div className="text-2xl font-black text-ink mt-2">
            {stats.total}
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">All applications</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-status-approved" />
          </div>
          <div className="text-2xl font-black text-status-approved mt-2">
            {stats.confirmed}
          </div>
          <div className="text-[10px] text-status-approved/80 font-medium mt-0.5">Approved & active</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-status-pending" />
          </div>
          <div className="text-2xl font-black text-status-pending mt-2">
            {stats.pending}
          </div>
          <div className="text-[10px] text-status-pending/80 font-medium mt-0.5">Requires review</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Waitlist</span>
            <UserCheck className="w-4 h-4 text-status-approved" />
          </div>
          <div className="text-2xl font-black text-status-approved mt-2">
            {stats.waitlisted}
          </div>
          <div className="text-[10px] text-status-approved/80 font-medium mt-0.5">Backup roster</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Cancelled</span>
            <X className="w-4 h-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-black text-ink-secondary mt-2">
            {stats.cancelled + stats.rejected}
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">Withdrawn/rejected</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-edge">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Teams</span>
            <Users className="w-4 h-4 text-status-review" />
          </div>
          <div className="text-2xl font-black text-status-review mt-2">
            {stats.totalTeams}
          </div>
          <div className="text-[10px] text-status-review/80 font-medium mt-0.5">
            {stats.completedTeams} completed
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-surface p-4 rounded-2xl border border-edge space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, email, or team name..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Event Filter */}
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected"
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.year})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending Review</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>

            {/* Team/Solo Filter */}
            <select
              value={selectedTeamFilter}
              onChange={(e) => {
                setSelectedTeamFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-surface-sunken border border-edge rounded-xl text-ink focus:outline-none focus:border-status-rejected"
            >
              <option value="all">Team & Solo</option>
              <option value="team">In Team</option>
              <option value="solo">Solo Only</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-bold text-status-rejected hover:bg-status-bg-rejected rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. MAIN CONTENT VIEW: TABLE OR TEAMS */}
      {activeView === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-surface rounded-2xl border border-edge overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
              <span className="text-xs text-ink-muted font-medium">Loading registrations...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <AlertCircle className="w-10 h-10 text-status-rejected" />
              <h3 className="font-bold text-sm text-ink">
                Failed to load registrations
              </h3>
              <p className="text-xs text-ink-muted max-w-sm">{error}</p>
              <button
                onClick={fetchRegistrations}
                className="px-4 py-2 bg-status-solid-rejected text-on-primary text-xs font-bold rounded-xl hover:bg-brand cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
              <Layers className="w-12 h-12 text-ink-muted" />
              <h3 className="font-bold text-sm text-ink">
                No registrations found
              </h3>
              <p className="text-xs text-ink-muted max-w-sm">
                {hasActiveFilters
                  ? 'No registrations match the selected filters. Try broadening your criteria.'
                  : 'No students have registered for this event yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 text-xs font-bold text-status-rejected border border-edge rounded-lg hover:bg-status-bg-rejected cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-sunken border-b border-edge text-ink-muted font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Academic</th>
                    <th className="py-3.5 px-4">Event</th>
                    <th className="py-3.5 px-4">Participation</th>
                    <th className="py-3.5 px-4">Answers</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {registrations.map((reg) => {
                    const initials = reg.student.name
                      ? reg.student.name
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'ST';

                    return (
                      <tr
                        key={reg.id}
                        className="hover:bg-surface-sunken/80 transition-colors"
                      >
                        {/* Student Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-bg-rejected text-status-rejected font-black flex items-center justify-center text-[11px] shrink-0 border border-edge">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink truncate max-w-[180px]">
                                {reg.student.name}
                              </div>
                              <div className="text-[11px] font-mono font-semibold text-ink-muted">
                                {reg.student.rollNo}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Year & Section */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-surface-sunken text-ink-secondary">
                            Y{reg.student.year} · Sec {reg.student.section}
                          </span>
                        </td>

                        {/* Event */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink truncate max-w-[150px]">
                            {reg.event.name}
                          </div>
                          <div className="text-[10px] text-ink-muted">{reg.event.year}</div>
                        </td>

                        {/* Participation (Team or Solo) */}
                        <td className="py-3.5 px-4">
                          {reg.team ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-status-bg-review text-status-review border border-edge">
                              <Users className="w-3 h-3 text-status-review" />
                              <span className="truncate max-w-[120px]">{reg.team.name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-sunken text-ink-muted">
                              Solo
                            </span>
                          )}
                        </td>

                        {/* Form Answers */}
                        <td className="py-3.5 px-4">
                          {reg.answers && reg.answers.length > 0 ? (
                            <button
                              onClick={() => setSelectedRegistration(reg)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-approved hover:underline cursor-pointer"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>{reg.answers.length} answers</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-ink-muted">None</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">{renderStatusBadge(reg.status)}</td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 text-ink-muted whitespace-nowrap">
                          {new Date(reg.registeredAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Row Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setSelectedRegistration(reg)}
                              title="View Registration Details"
                              className="p-1.5 hover:bg-surface-sunken text-ink-secondary rounded-lg cursor-pointer transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Quick Status Toggles */}
                            {reg.status !== 'CONFIRMED' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'CONFIRMED')}
                                title="Approve / Confirm"
                                className="p-1.5 hover:bg-status-bg-approved text-status-approved rounded-lg cursor-pointer transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {reg.status !== 'WAITLISTED' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'WAITLISTED')}
                                title="Move to Waitlist"
                                className="p-1.5 hover:bg-status-bg-approved text-status-approved rounded-lg cursor-pointer transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {reg.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'CANCELLED')}
                                title="Cancel Registration"
                                className="p-1.5 hover:bg-status-bg-rejected text-status-rejected rounded-lg cursor-pointer transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          {!loading && registrations.length > 0 && (
            <div className="p-4 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
              <div>
                Showing <span className="font-bold text-ink">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-bold text-ink">
                  {Math.min(page * limit, totalRegistrations)}
                </span>{' '}
                of <span className="font-bold text-ink">{totalRegistrations}</span>{' '}
                registrations
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-edge rounded-lg disabled:opacity-40 hover:bg-surface-sunken font-semibold cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-edge rounded-lg disabled:opacity-40 hover:bg-surface-sunken font-semibold cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TEAM ADMINISTRATION VIEW (ADM-09) */
        <div className="space-y-4">
          {teamsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-edge gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
              <span className="text-xs text-ink-muted font-medium">Loading teams...</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-edge gap-3 text-center px-4">
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
                    className="bg-surface rounded-2xl border border-edge p-5 space-y-4 shadow-xs"
                  >
                    {/* Team Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-ink">
                            {team.name}
                          </h3>
                          {renderTeamStatusBadge(team.status)}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          Event: <span className="font-semibold text-ink-secondary">{team.event?.name}</span>
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {team.status !== 'COMPLETE' && (
                          <button
                            onClick={() => handleUpdateTeamStatus(team.id, 'COMPLETE')}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-status-bg-approved text-status-approved border border-edge hover:bg-status-bg-approved cursor-pointer"
                          >
                            Mark Complete
                          </button>
                        )}
                        {team.status !== 'ACTIVE' && team.status !== 'COMPLETE' && (
                          <button
                            onClick={() => handleUpdateTeamStatus(team.id, 'ACTIVE')}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-status-bg-approved text-status-approved border border-edge hover:bg-status-bg-approved cursor-pointer"
                          >
                            Activate
                          </button>
                        )}
                        {team.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateTeamStatus(team.id, 'REJECTED')}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-status-bg-rejected text-status-rejected border border-edge hover:bg-status-bg-rejected cursor-pointer"
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
                      <span className="font-mono text-[11px] font-bold text-status-review">
                        {leaderRoll}
                      </span>
                    </div>

                    {/* Members List */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center justify-between">
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
                                  <div className="w-6 h-6 rounded-full bg-surface-inset flex items-center justify-center text-[10px] font-bold text-ink-secondary shrink-0">
                                    {m.student.name?.[0] || 'M'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-ink truncate">
                                      {m.student.name}
                                      {isLeader && (
                                        <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-status-bg-review text-status-review">
                                          Leader
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-ink-muted">
                                      {m.student.rollNo} · Y{m.student.year} ({m.student.section})
                                    </div>
                                  </div>
                                </div>

                                {!isLeader && (
                                  <button
                                    onClick={() =>
                                      setMemberToRemove({
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

                    {/* Pending Invitations (if any) */}
                    {team.invitations && team.invitations.length > 0 && (
                      <div className="pt-2 border-t border-edge">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                          Pending Invitations ({team.invitations.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {team.invitations.map((inv) => (
                            <span
                              key={inv.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-sunken text-ink-secondary"
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
      )}

      {/* 5. REGISTRATION DETAIL DRAWER (ADM-08) */}
      {selectedRegistration && (
        <div className="fixed inset-0 z-50 bg-on-primary/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col overflow-hidden animate-fade-in slide-in-from-right duration-base">
            {/* Drawer Header */}
            <div className="p-5 border-b border-edge flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-ink">
                  Registration Details
                </h2>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  ID: <span className="font-mono">{selectedRegistration.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRegistration(null)}
                className="p-1.5 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Student Summary */}
              <div className="bg-surface-canvas p-4 rounded-xl border border-edge space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Student Information
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-status-bg-rejected text-status-rejected font-black flex items-center justify-center text-sm shrink-0">
                    {selectedRegistration.student.name?.[0] || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">
                      {selectedRegistration.student.name}
                    </h3>
                    <div className="text-xs text-ink-muted font-mono">
                      {selectedRegistration.student.rollNo}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-edge/60">
                  <div>
                    <span className="text-ink-muted">Email:</span>
                    <div className="font-semibold text-ink truncate">
                      {selectedRegistration.student.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-ink-muted">Class:</span>
                    <div className="font-semibold text-ink">
                      Year {selectedRegistration.student.year} · Sec {selectedRegistration.student.section} (
                      {selectedRegistration.student.branch})
                    </div>
                  </div>
                </div>
              </div>

              {/* Event & Registration Metadata */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Event & Status
                </div>
                <div className="p-3 rounded-xl border border-edge space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Event:</span>
                    <span className="font-bold text-ink">
                      {selectedRegistration.event.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Current Status:</span>
                    {renderStatusBadge(selectedRegistration.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Registered On:</span>
                    <span className="font-semibold text-ink-secondary">
                      {new Date(selectedRegistration.registeredAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Information */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Team Details
                </div>
                {selectedRegistration.team ? (
                  <div className="p-3 rounded-xl border border-edge bg-status-bg-review/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-status-review" />
                        <span className="font-black text-ink text-sm">
                          {selectedRegistration.team.name}
                        </span>
                      </div>
                      {renderTeamStatusBadge(selectedRegistration.team.status)}
                    </div>

                    {selectedRegistration.team.leader && (
                      <div className="text-xs text-ink-secondary">
                        <span className="text-ink-muted">Leader:</span>{' '}
                        <span className="font-bold">{selectedRegistration.team.leader.name}</span> (
                        <span className="font-mono">{selectedRegistration.team.leader.rollNo}</span>)
                      </div>
                    )}

                    {selectedRegistration.team.members && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                          Team Members:
                        </span>
                        <div className="space-y-1">
                          {selectedRegistration.team.members.map((m) => (
                            <div
                              key={m.id}
                              className="text-[11px] flex items-center justify-between bg-surface p-1.5 rounded-lg border border-edge"
                            >
                              <span>{m.student.name}</span>
                              <span className="font-mono text-ink-muted">{m.student.rollNo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-edge text-xs text-ink-muted">
                    Individual participant (Solo registration)
                  </div>
                )}
              </div>

              {/* Custom Questionnaire Answers */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Custom Registration Form Answers
                </div>
                {selectedRegistration.answers && selectedRegistration.answers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRegistration.answers.map((ans) => (
                      <div
                        key={ans.id}
                        className="p-3 rounded-xl bg-surface-sunken border border-edge space-y-1 text-xs"
                      >
                        <div className="font-bold text-ink">
                          {ans.field?.label || 'Question'}
                        </div>
                        <div className="text-ink-secondary whitespace-pre-wrap font-medium">
                          {ans.value || <span className="italic text-ink-muted">No response provided</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-edge text-xs text-ink-muted text-center">
                    No custom questionnaire fields submitted for this event.
                  </div>
                )}
              </div>

              {/* Status Action Controls */}
              <div className="space-y-3 pt-3 border-t border-edge">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Manage Status
                </div>

                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional audit log note / reason for status change..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={statusUpdateLoading || selectedRegistration.status === 'CONFIRMED'}
                    onClick={() => handleUpdateStatus(selectedRegistration.id, 'CONFIRMED')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-approved hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>

                  <button
                    disabled={statusUpdateLoading || selectedRegistration.status === 'WAITLISTED'}
                    onClick={() => handleUpdateStatus(selectedRegistration.id, 'WAITLISTED')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-approved hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Waitlist
                  </button>

                  <button
                    disabled={statusUpdateLoading || selectedRegistration.status === 'CANCELLED'}
                    onClick={() => handleUpdateStatus(selectedRegistration.id, 'CANCELLED')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-inverse text-ink-inverse hover:opacity-90 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>

                  <button
                    disabled={statusUpdateLoading || selectedRegistration.status === 'REJECTED'}
                    onClick={() => handleUpdateStatus(selectedRegistration.id, 'REJECTED')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-status-solid-rejected hover:opacity-90 text-on-primary rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-edge">
                <button
                  onClick={() => handleDeleteRegistration(selectedRegistration.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-status-rejected hover:bg-status-bg-rejected rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Registration Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. REMOVE TEAM MEMBER DIALOG (ADM-09) */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 bg-on-primary/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in (_m) => 'animate-scale-in' duration-fast border border-edge">
            <div className="flex items-center gap-3 text-status-rejected">
              <div className="w-10 h-10 rounded-xl bg-status-bg-rejected flex items-center justify-center shrink-0">
                <UserMinus className="w-5 h-5 text-status-rejected" />
              </div>
              <div>
                <h3 className="text-base font-black text-ink">
                  Remove Team Member
                </h3>
                <p className="text-xs text-ink-muted">Team: {memberToRemove.teamName}</p>
              </div>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="text-ink">{memberToRemove.studentName}</strong> (
              <span className="font-mono font-bold">{memberToRemove.rollNo}</span>) from the team?
            </p>

            <div>
              <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wide mb-1">
                Reason for Removal (Required for audit log)
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. Student requested removal, section mismatch, inactive participant..."
                rows={3}
                className="w-full text-xs p-3 bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMemberToRemove(null);
                  setRemoveReason('');
                }}
                disabled={removingMember}
                className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={removingMember}
                className="flex items-center gap-1.5 px-4 py-2 bg-status-solid-rejected hover:opacity-90 text-on-primary text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {removingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
