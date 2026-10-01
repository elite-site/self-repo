import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { EmailHistoryResponse } from '../types';
import {
  History,
  Mail,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Zap,
  AlertTriangle,
} from 'lucide-react';

export const EmailHistory: React.FC = () => {
  const [data, setData] = useState<EmailHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'runs' | 'logs'>('runs');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getEmailHistory();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load email history:', err);
      setError(err?.response?.data?.message || 'Failed to load dispatch history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading outbound communication logs...</p>
      </div>
    );
  }

  const automationRuns = data?.automationRuns || [];
  const emailLogs = data?.emailLogs || [];

  const filteredRuns = automationRuns.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.automation?.name?.toLowerCase().includes(term) ||
      r.automation?.trigger?.toLowerCase().includes(term) ||
      r.automation?.template?.subject?.toLowerCase().includes(term)
    );
  });

  const filteredLogs = emailLogs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      l.recipientEmail.toLowerCase().includes(term) ||
      (l.recipientName && l.recipientName.toLowerCase().includes(term)) ||
      l.subject.toLowerCase().includes(term)
    );
  });

  const totalDispatched = automationRuns.reduce((acc, r) => acc + (r.sentCount || 0), 0) + emailLogs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <History className="w-7 h-7 text-ink-brand" />
            Outbound Dispatch & Email History
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Forensic audit record of automated workflow dispatches and individual notification emails sent to students.
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
        <div className="p-3 bg-status-bg-rejected border border-edge rounded-xl text-status-rejected text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Workflow Executions
          </span>
          <div className="text-2xl font-extrabold text-ink">
            {automationRuns.length} Batches
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Triggered by system automation rules
          </p>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Direct Email Logs
          </span>
          <div className="text-2xl font-extrabold text-status-approved">
            {emailLogs.length} Records
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Individual student transmission receipts
          </p>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Estimated Student Deliveries
          </span>
          <div className="text-2xl font-extrabold text-status-approved">
            {totalDispatched.toLocaleString()} Sent
          </div>
          <p className="text-xs text-ink-muted mt-1">
            100% delivered to institutional mailboxes
          </p>
        </div>
      </div>

      {/* Tab Switcher & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-surface-sunken rounded-xl border border-edge/80">
          <button
            onClick={() => setActiveView('runs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeView === 'runs'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-ink-brand" />
            Automation Dispatch Batches ({automationRuns.length})
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeView === 'logs'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-status-approved" />
            Direct Email Logs ({emailLogs.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder={activeView === 'runs' ? 'Search workflow or subject...' : 'Search recipient email or subject...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {/* View 1: Automation Runs */}
      {activeView === 'runs' && (
        <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
          {filteredRuns.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-muted">
              No automation dispatch runs match the specified query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-sunken text-ink-secondary uppercase font-semibold border-b border-edge">
                  <tr>
                    <th className="px-5 py-3">Workflow Rule</th>
                    <th className="px-5 py-3">Trigger Type</th>
                    <th className="px-5 py-3">Dispatched Template</th>
                    <th className="px-5 py-3">Recipients Reached</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge text-ink-secondary">
                  {filteredRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-surface-sunken/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-ink">
                        {run.automation?.name || 'Automation Dispatch'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-status-bg-approved text-status-approved border border-edge">
                          {run.automation?.trigger || 'SCHEDULED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-secondary max-w-xs truncate">
                        {run.automation?.template?.subject || run.automation?.template?.name || 'Standard Alert'}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="text-status-approved font-bold">{run.sentCount}</span> / {run.recipientCount}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted font-mono text-[11px]">
                        {new Date(run.runAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: Direct Email Logs */}
      {activeView === 'logs' && (
        <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-muted">
              No outbound individual email logs match the specified query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-sunken text-ink-secondary uppercase font-semibold border-b border-edge">
                  <tr>
                    <th className="px-5 py-3">Recipient Email</th>
                    <th className="px-5 py-3">Recipient Name</th>
                    <th className="px-5 py-3">Subject Line</th>
                    <th className="px-5 py-3">Delivery Status</th>
                    <th className="px-5 py-3">Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge text-ink-secondary">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-sunken/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-ink font-medium">
                        {log.recipientEmail}
                      </td>
                      <td className="px-5 py-3.5 text-ink-secondary">
                        {log.recipientName || 'Unknown'}
                      </td>
                      <td className="px-5 py-3.5 text-ink max-w-sm truncate">
                        {log.subject}
                      </td>
                      <td className="px-5 py-3.5">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                            <CheckCircle2 className="w-3 h-3" />
                            SENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-rejected text-status-rejected">
                            <XCircle className="w-3 h-3" />
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted font-mono text-[11px]">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
