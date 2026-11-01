import React from 'react';
import { ShieldAlert, RefreshCw, Download, Search, FileCheck, Lock } from 'lucide-react';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { AuditLogsStats } from '../components/AuditLogsStats';
import { AuditLogsTable } from '../components/AuditLogsTable';
import { ACTIVITY_LOG_CATEGORIES, ACTIVITY_LOG_STATUSES } from '../constants';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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
    <div className="space-y-8 animate-fade-in-up text-left">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Security Intelligence</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5 font-sans">
                <ShieldAlert className="w-6 h-6 text-brand" />
                Security Governance & Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                Immutable forensic log recording all administrative modifications, authentication attempts, and moderation actions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-3.5 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>

          <div className="pt-3">
            <AuditLogsStats stats={stats} />
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Lock size={13} />
                  Compliance Vault
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Tamper-Evident
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Forensic Event Traceability</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Every state modification captures operator credentials, timestamps, target records, and outcome diagnostics to support institutional compliance reviews.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Success Metric</span>
                  <span className="font-bold text-status-approved text-sm tabular-nums">{stats.successRate}%</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Today Submissions</span>
                  <span className="font-bold text-brand text-sm tabular-nums">{stats.applicationsToday}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <FileCheck size={14} className="text-brand shrink-0" />
              <span>Full compliance audit stream online</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. FILTER AND SEARCH BAR */}
      <div className="surface border border-edge rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by action, administrator email, student name, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 pr-3 text-xs sm:text-sm min-h-[40px] w-full"
          />
        </form>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="select text-xs min-h-[40px] cursor-pointer"
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
            className="select text-xs min-h-[40px] cursor-pointer"
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

      {/* 3. AUDIT LOG TABLE (Strict Container Scrolling) */}
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
