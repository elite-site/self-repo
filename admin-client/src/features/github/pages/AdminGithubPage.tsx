import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useGithub } from '../hooks/useGithub';
import { GithubMetricsCards } from '../components/GithubMetricsCards';
import { GithubAccountsTable } from '../components/GithubAccountsTable';
import { GithubSyncLogsTable } from '../components/GithubSyncLogsTable';

export const AdminGithubPage: React.FC = () => {
  const {
    loading,
    overview,
    logs,
    logFilter,
    setLogFilter,
    search,
    setSearch,
    resyncingId,
    message,
    fetchData,
    handleResync,
  } = useGithub();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">GitHub Portfolio Management</h1>
        <p className="text-sm text-ink-muted mt-1">
          Monitor student GitHub connections, repository counts, sync activity, and trigger manual re-syncs.
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
      <GithubMetricsCards overview={overview} />

      {/* Connected Accounts Section */}
      <GithubAccountsTable
        accounts={overview.accounts || []}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        onRefresh={fetchData}
        resyncingId={resyncingId}
        onResync={handleResync}
      />

      {/* Recent Sync Logs Section */}
      <GithubSyncLogsTable
        logs={logs}
        logFilter={logFilter}
        onFilterChange={setLogFilter}
      />
    </div>
  );
};

export default AdminGithubPage;
