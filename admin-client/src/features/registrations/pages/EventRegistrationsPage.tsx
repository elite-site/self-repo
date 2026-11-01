import React from 'react';
import { useRegistrations } from '../hooks/useRegistrations';
import { useTeams } from '../hooks/useTeams';
import { RegistrationHeader } from '../components/RegistrationHeader';
import { RegistrationStatsCards } from '../components/RegistrationStatsCards';
import { RegistrationFilters } from '../components/RegistrationFilters';
import { RegistrationTable } from '../components/RegistrationTable';
import { TeamsView } from '../components/TeamsView';
import { RegistrationDetailModal } from '../components/RegistrationDetailModal';
import { RemoveTeamMemberModal } from '../components/RemoveTeamMemberModal';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { Users, ShieldCheck } from 'lucide-react';

export const EventRegistrationsPage: React.FC = () => {
  const reg = useRegistrations();
  const teamsHook = useTeams(
    reg.selectedEventId,
    reg.selectedStatus,
    reg.searchQuery,
    reg.activeView,
    reg.fetchRegistrations
  );

  const totalPages = Math.ceil(reg.totalRegistrations / reg.limit) || 1;
  const approvedPct = reg.stats?.total && reg.stats.total > 0
    ? Math.round((reg.stats.confirmed / reg.stats.total) * 100)
    : 0;

  return (
    <div className="space-y-8 text-left animate-fade-in-up">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <RegistrationHeader
            activeView={reg.activeView}
            stats={reg.stats}
            loading={reg.loading}
            teamsLoading={teamsHook.teamsLoading}
            actionError={reg.actionError}
            teamsError={teamsHook.teamsError}
            setActiveView={reg.setActiveView}
            setPage={reg.setPage}
            onRefresh={() => { if (reg.activeView === 'table') reg.fetchRegistrations(); else teamsHook.fetchTeams(); }}
            onExport={reg.handleExport}
            onDismissError={() => reg.setActionError(null)}
          />

          <RegistrationStatsCards stats={reg.stats} />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Users size={13} />
                  Signup Pipeline
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {reg.totalRegistrations} Total
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Team & Solo Registrations</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Admit participants, manage team formations, check eligibility questions, and issue approval passes.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Approved Rate</span>
                  <span className="font-bold text-status-approved text-sm tabular-nums">{approvedPct}%</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Pending Review</span>
                  <span className="font-bold text-status-pending text-sm tabular-nums">{reg.stats?.pending ?? 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Department event validation active</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      <RegistrationFilters
        events={reg.events}
        searchQuery={reg.searchQuery}
        setSearchQuery={reg.setSearchQuery}
        selectedEventId={reg.selectedEventId}
        setSelectedEventId={reg.setSelectedEventId}
        selectedStatus={reg.selectedStatus}
        setSelectedStatus={reg.setSelectedStatus}
        selectedYear={reg.selectedYear}
        setSelectedYear={reg.setSelectedYear}
        selectedSection={reg.selectedSection}
        setSelectedSection={reg.setSelectedSection}
        selectedTeamFilter={reg.selectedTeamFilter}
        setSelectedTeamFilter={reg.setSelectedTeamFilter}
        setPage={reg.setPage}
        hasActiveFilters={reg.hasActiveFilters}
        onResetFilters={reg.handleResetFilters}
        onSearchSubmit={reg.handleSearchSubmit}
      />

      {reg.activeView === 'table' ? (
        <RegistrationTable
          registrations={reg.registrations}
          totalRegistrations={reg.totalRegistrations}
          loading={reg.loading}
          error={reg.error}
          page={reg.page}
          limit={reg.limit}
          totalPages={totalPages}
          hasActiveFilters={reg.hasActiveFilters}
          onPageChange={reg.setPage}
          onResetFilters={reg.handleResetFilters}
          onRetry={reg.fetchRegistrations}
          onSelectRegistration={reg.setSelectedRegistration}
          onUpdateStatus={reg.handleUpdateStatus}
        />
      ) : (
        <TeamsView
          teams={teamsHook.teams}
          teamsLoading={teamsHook.teamsLoading}
          onUpdateTeamStatus={teamsHook.handleUpdateTeamStatus}
          onSetMemberToRemove={teamsHook.setMemberToRemove}
        />
      )}

      {reg.selectedRegistration && (
        <RegistrationDetailModal
          registration={reg.selectedRegistration}
          statusNote={reg.statusNote}
          statusUpdateLoading={reg.statusUpdateLoading}
          onClose={() => reg.setSelectedRegistration(null)}
          onStatusNoteChange={reg.setStatusNote}
          onUpdateStatus={reg.handleUpdateStatus}
          onDeleteRegistration={reg.handleDeleteRegistration}
        />
      )}

      {teamsHook.memberToRemove && (
        <RemoveTeamMemberModal
          memberToRemove={teamsHook.memberToRemove}
          removeReason={teamsHook.removeReason}
          removingMember={teamsHook.removingMember}
          onClose={() => teamsHook.setMemberToRemove(null)}
          onRemoveReasonChange={teamsHook.setRemoveReason}
          onConfirmRemove={teamsHook.handleConfirmRemoveMember}
        />
      )}
    </div>
  );
};

export default EventRegistrationsPage;
