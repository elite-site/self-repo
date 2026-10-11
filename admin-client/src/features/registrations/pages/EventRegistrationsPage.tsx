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

  return (
    <div className="space-y-6 text-left">
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

      <RegistrationDetailModal
        registration={reg.selectedRegistration}
        statusNote={reg.statusNote}
        statusUpdateLoading={reg.statusUpdateLoading}
        onClose={() => reg.setSelectedRegistration(null)}
        onStatusNoteChange={reg.setStatusNote}
        onUpdateStatus={reg.handleUpdateStatus}
        onDeleteRegistration={reg.handleDeleteRegistration}
      />

      <RemoveTeamMemberModal
        memberToRemove={teamsHook.memberToRemove}
        removeReason={teamsHook.removeReason}
        removingMember={teamsHook.removingMember}
        onClose={() => { teamsHook.setMemberToRemove(null); teamsHook.setRemoveReason(''); }}
        onRemoveReasonChange={teamsHook.setRemoveReason}
        onConfirmRemove={teamsHook.handleConfirmRemoveMember}
      />
    </div>
  );
};

export default EventRegistrationsPage;
