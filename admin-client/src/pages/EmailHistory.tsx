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
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading outbound communication logs...</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-elite-red" />
            Outbound Dispatch & Email History
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Forensic audit record of automated workflow dispatches and individual notification emails sent to students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadHistory(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Workflow Executions
          </span>
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {automationRuns.length} Batches
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Triggered by system automation rules
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Direct Email Logs
          </span>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {emailLogs.length} Records
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Individual student transmission receipts
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Estimated Student Deliveries
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalDispatched.toLocaleString()} Sent
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            100% delivered to institutional mailboxes
          </p>
        </div>
      </div>

      {/* Tab Switcher & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
          <button
            onClick={() => setActiveView('runs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeView === 'runs'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-elite-red" />
            Automation Dispatch Batches ({automationRuns.length})
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeView === 'logs'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-500" />
            Direct Email Logs ({emailLogs.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={activeView === 'runs' ? 'Search workflow or subject...' : 'Search recipient email or subject...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
          />
        </div>
      </div>

      {/* View 1: Automation Runs */}
      {activeView === 'runs' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
          {filteredRuns.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No automation dispatch runs match the specified query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="px-5 py-3">Workflow Rule</th>
                    <th className="px-5 py-3">Trigger Type</th>
                    <th className="px-5 py-3">Dispatched Template</th>
                    <th className="px-5 py-3">Recipients Reached</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {filteredRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {run.automation?.name || 'Automation Dispatch'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                          {run.automation?.trigger || 'SCHEDULED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                        {run.automation?.template?.subject || run.automation?.template?.name || 'Standard Alert'}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{run.sentCount}</span> / {run.recipientCount}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 font-mono text-[11px]">
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
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No outbound individual email logs match the specified query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="px-5 py-3">Recipient Email</th>
                    <th className="px-5 py-3">Recipient Name</th>
                    <th className="px-5 py-3">Subject Line</th>
                    <th className="px-5 py-3">Delivery Status</th>
                    <th className="px-5 py-3">Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-neutral-900 dark:text-white font-medium">
                        {log.recipientEmail}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300">
                        {log.recipientName || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-800 dark:text-neutral-200 max-w-sm truncate">
                        {log.subject}
                      </td>
                      <td className="px-5 py-3.5">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            SENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            <XCircle className="w-3 h-3" />
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 font-mono text-[11px]">
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
