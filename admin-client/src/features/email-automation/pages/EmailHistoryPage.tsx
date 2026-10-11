import React from 'react';
import { History, Search, RefreshCw, AlertTriangle, Zap, Mail } from 'lucide-react';
import { useEmailHistory } from '../hooks/useEmailHistory';
import { EmailRunsTable } from '../components/EmailRunsTable';
import { EmailLogsTable } from '../components/EmailLogsTable';

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
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading outbound communication logs…</p>
      </div>
    );
  }

  const automationRuns = data?.automationRuns || [];
  const emailLogs = data?.emailLogs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <History className="w-7 h-7 text-ink-brand" />
            Outbound Mail Dispatch Logs
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Forensic audit trail of triggered emails, batch automations, and delivery status verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadHistory(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-bg-rejected border border-edge flex items-center gap-2 text-xs text-status-rejected">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* View Switcher and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 bg-surface-sunken border border-edge rounded-lg self-start">
          <button
            onClick={() => setActiveView('runs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeView === 'runs'
                ? 'bg-surface text-ink shadow-xs border border-edge/60'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Automation Runs ({automationRuns.length})
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeView === 'logs'
                ? 'bg-surface text-ink shadow-xs border border-edge/60'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Individual Deliveries ({emailLogs.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder={activeView === 'runs' ? 'Search by workflow name or trigger...' : 'Search recipient or subject...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
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
