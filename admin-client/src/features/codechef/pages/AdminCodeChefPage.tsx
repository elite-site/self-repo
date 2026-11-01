import React from 'react';
import { CheckCircle2, AlertCircle, Terminal, Download, Trophy, X } from 'lucide-react';
import { useAdminCodeChef } from '../hooks/useAdminCodeChef';
import {
  CodeChefMetricsCards,
  CodeChefLeaderboardCard,
  AdminCodeChefTable,
  AdminStudentCodeChefTab,
} from '../components';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const AdminCodeChefPage: React.FC = () => {
  const {
    students,
    total,
    page,
    limit,
    totalPages,
    loading,
    stats,
    statsLoading,
    leaderboard,
    leaderboardLoading,
    leaderboardYear,
    setLeaderboardYear,
    filters,
    setFilters,
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetails,
    detailsLoading,
    message,
    handleExportCsv,
    resyncStudent,
    resyncing,
    verifyStudent,
    verifying,
    unlinkStudent,
    unlinking,
  } = useAdminCodeChef();

  const connectedCount = stats?.connectedCount ?? 0;
  const verifiedCount = stats?.verifiedCount ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const adoptionRate = stats?.connectedPercentage ?? (totalStudents > 0 ? Math.round((connectedCount / totalStudents) * 100) : 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
              <Terminal size={13} className="shrink-0" />
              <span>Competitive Programming Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
              CodeChef Integration Management
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Monitor student CodeChef ratings, competitive programming activity, leaderboard standings, and verify account ownership.
            </p>
          </div>

          {/* Metrics Row */}
          <CodeChefMetricsCards stats={stats} loading={statsLoading} />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Trophy size={13} />
                  Cohort Mastery
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {adoptionRate}% Linked
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Competitive Problem Solving</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Automated rating scrapers track division tiers, stars, contest attendance, and verified handle badges.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Connected Handles</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{connectedCount}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Verified Badges</span>
                  <span className="font-bold text-status-approved text-sm tabular-nums">{verifiedCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleExportCsv}
                className="btn btn-secondary text-xs py-1.5 px-3 min-h-[36px] inline-flex items-center gap-1.5 w-full justify-center shadow-xs cursor-pointer"
              >
                <Download size={13} className="text-brand" />
                <span>Export Telemetry (CSV)</span>
              </button>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-status-approved/10 text-status-approved border border-status-approved/20'
              : 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Leaderboard Section */}
      <CodeChefLeaderboardCard
        leaderboard={leaderboard}
        loading={leaderboardLoading}
        selectedYear={leaderboardYear}
        onSelectYear={setLeaderboardYear}
        onSelectStudent={setSelectedStudentId}
      />

      {/* Directory Table */}
      <AdminCodeChefTable
        students={students}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
        loading={loading}
        filters={filters}
        onFilterChange={setFilters}
        onSelectStudent={setSelectedStudentId}
        onExportCsv={handleExportCsv}
      />

      {/* Selected Student Details Drawer / Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4">
          <div className="surface border border-edge rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-modal">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <h2 className="font-bold text-lg text-ink font-sans">Student CodeChef Profile</h2>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-sm text-ink-muted">Loading profile details...</div>
            ) : selectedStudentDetails ? (
              <AdminStudentCodeChefTab
                studentId={selectedStudentId || ''}
                details={selectedStudentDetails}
                loading={detailsLoading}
                onResync={resyncStudent}
                resyncing={resyncing}
                onVerify={verifyStudent}
                verifying={verifying}
                onUnlink={unlinkStudent}
                unlinking={unlinking}
              />
            ) : (
              <div className="py-8 text-center text-sm text-ink-muted">Student details unavailable.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodeChefPage;
