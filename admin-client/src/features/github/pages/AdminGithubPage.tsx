import React from 'react';
import { CheckCircle2, AlertCircle, HardDrive, GitBranch, ShieldCheck } from 'lucide-react';
import { useGithub } from '../hooks/useGithub';
import { GithubMetricsCards } from '../components/GithubMetricsCards';
import { GithubAccountsTable } from '../components/GithubAccountsTable';
import { GithubSyncLogsTable } from '../components/GithubSyncLogsTable';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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

  const accounts = overview.accounts || [];
  const activeSyncs = accounts.filter((a) => a.syncStatus === 'COMPLETED').length;
  const syncErrors = accounts.filter((a) => a.syncStatus === 'FAILED').length;
  const syncRate = overview.total > 0 ? Math.round((activeSyncs / overview.total) * 100) : 100;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL SYNC STATUS & HERO */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
              <HardDrive size={13} className="shrink-0" />
              <span>Developer Ecosystem Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
              GitHub Portfolio Management
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Monitor student GitHub connections, repository counts, sync activity, and trigger manual re-syncs.
            </p>
          </div>

          {/* Metrics Row */}
          <GithubMetricsCards overview={overview} />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <GitBranch size={13} />
                  Sync Pipeline
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {syncRate}% Healthy
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Automated GitHub Crawler</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Background workers poll rate limits, parse README showcases, and fetch student commit histories.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Successful Syncs</span>
                  <span className="font-bold text-status-approved text-sm tabular-nums">{activeSyncs}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Errors / Blocked</span>
                  <span className={`font-bold text-sm tabular-nums ${syncErrors > 0 ? 'text-status-rejected' : 'text-ink'}`}>
                    {syncErrors}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Authenticated GitHub App token rotation</span>
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
