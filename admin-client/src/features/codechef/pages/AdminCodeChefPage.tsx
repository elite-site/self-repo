import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAdminCodeChef } from '../hooks/useAdminCodeChef';
import {
  CodeChefMetricsCards,
  CodeChefLeaderboardCard,
  AdminCodeChefTable,
  AdminStudentCodeChefTab,
} from '../components';

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">CodeChef Integration Management</h1>
        <p className="text-sm text-ink-muted mt-1">
          Monitor student CodeChef ratings, competitive programming activity, leaderboard standings, and verify account ownership.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <CodeChefMetricsCards stats={stats} loading={statsLoading} />

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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-bold text-lg text-ink">Student CodeChef Profile</h2>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AdminStudentCodeChefTab
              studentId={selectedStudentId}
              details={selectedStudentDetails}
              loading={detailsLoading}
              onResync={resyncStudent}
              resyncing={resyncing}
              onVerify={verifyStudent}
              verifying={verifying}
              onUnlink={unlinkStudent}
              unlinking={unlinking}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodeChefPage;
