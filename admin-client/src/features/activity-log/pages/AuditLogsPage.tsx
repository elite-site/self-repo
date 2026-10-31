import React from 'react';
import { ShieldAlert, RefreshCw, Download, Search } from 'lucide-react';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { AuditLogsStats } from '../components/AuditLogsStats';
import { AuditLogsTable } from '../components/AuditLogsTable';
import { ACTIVITY_LOG_CATEGORIES, ACTIVITY_LOG_STATUSES } from '../constants';

export const AuditLogsPage: React.FC = () => {
  const {
    logs,
    stats,
    error,
    loading,
    refreshing,
    page,
    totalPages,
    totalCount,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    fetchLogs,
    handleSearch,
    handleExport,
  } = useActivityLogs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-ink-brand" />
            Security Governance & Audit Trail
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Immutable forensic log recording all administrative modifications, authentication attempts, and moderation actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-lg hover:opacity-90 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download Audit Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AuditLogsStats stats={stats} />

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-edge rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by action, administrator email, student name, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="ALL">All Categories</option>
            {ACTIVITY_LOG_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="ALL">All Statuses</option>
            {ACTIVITY_LOG_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <AuditLogsTable
        logs={logs}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        onRetry={fetchLogs}
      />
    </div>
  );
};

export default AuditLogsPage;
