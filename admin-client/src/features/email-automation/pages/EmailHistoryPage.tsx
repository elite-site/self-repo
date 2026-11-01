import React from 'react';
import { History, Search, RefreshCw, AlertTriangle, Zap, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useEmailHistory } from '../hooks/useEmailHistory';
import { EmailRunsTable } from '../components/EmailRunsTable';
import { EmailLogsTable } from '../components/EmailLogsTable';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const EmailHistoryPage: React.FC = () => {
  const {
    data,
    loading,
    refreshing,
    activeView,
    setActiveView,
    search,
    setSearch,
    error,
    filteredRuns,
    filteredLogs,
    loadHistory,
  } = useEmailHistory();

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="skeleton h-9 w-64 rounded-lg" />
          <div className="skeleton h-9 w-72 rounded-lg" />
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  const automationRuns = data?.automationRuns || [];
  const emailLogs = data?.emailLogs || [];
  const successfulRuns = automationRuns.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <History size={13} className="shrink-0" />
                <span>Forensic Email Dispatch Trail</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Outbound Mail Dispatch Logs
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Forensic audit trail of triggered emails, batch automations, and delivery status verification.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              <button
                onClick={() => loadHistory(true)}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-3.5 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Recorded Runs</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{automationRuns.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Completed Runs</span>
              <span className="text-2xl font-bold text-status-approved tabular-nums">{successfulRuns}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Individual Logs</span>
              <span className="text-2xl font-bold text-brand tabular-nums">{emailLogs.length}</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <ShieldCheck size={13} />
                  Delivery Engine
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Resend Live
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">SMTP Relay Telemetry</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Tracks transactional deliverability, bounce suppression, rate limits, and failure reason codes.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Relay Engine</span>
                  <span className="font-bold text-status-approved text-sm">Online</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Audit Retention</span>
                  <span className="font-bold text-ink text-sm">30 Days</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle2 size={14} className="text-brand shrink-0" />
              <span>Full payload metadata recorded</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. CONTROLS BAR: VIEW SWITCHER + SEARCH */}
      <div className="surface p-4 rounded-xl border border-edge shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* View Switcher Chips */}
        <div className="inline-flex p-1 bg-surface-sunken border border-edge rounded-xl self-start">
          <button
            onClick={() => setActiveView('runs')}
            className={`flex items-center gap-2 px-4 py-2 min-h-[36px] rounded-lg text-xs font-bold transition-all duration-quick cursor-pointer ${
              activeView === 'runs'
                ? 'bg-brand text-on-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow Runs ({automationRuns.length})</span>
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={`flex items-center gap-2 px-4 py-2 min-h-[36px] rounded-lg text-xs font-bold transition-all duration-quick cursor-pointer ${
              activeView === 'logs'
                ? 'bg-brand text-on-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Individual Messages ({emailLogs.length})</span>
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeView === 'runs' ? 'Search by workflow name, trigger...' : 'Search recipient email, template...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 pr-3 text-xs min-h-[40px] w-full"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2 text-xs text-status-rejected font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. TABLE VIEW WITH TABLE-RESPONSIVE CONTAINER-LEVEL SCROLLING */}
      <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
        {activeView === 'runs' ? (
          <EmailRunsTable runs={filteredRuns} />
        ) : (
          <EmailLogsTable logs={filteredLogs} />
        )}
      </div>
    </div>
  );
};

export default EmailHistoryPage;
