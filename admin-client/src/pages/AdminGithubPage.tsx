import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Users,
} from 'lucide-react';

export const AdminGithubPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({ total: 0, accounts: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, logsData] = await Promise.all([
        adminApi.getGithubOverview({ search, limit: 50 }),
        adminApi.getGithubLogs(logFilter === 'errors' ? { filter: 'errors' } : {}),
      ]);
      setOverview(overviewData);
      setLogs(logsData || []);
    } catch (err: any) {
      console.error('Failed to load GitHub data', err);
      setMessage({ text: err.response?.data?.message || 'Failed to load GitHub management data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, logFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResync = async (studentId: string, studentName: string) => {
    setResyncingId(studentId);
    setMessage(null);
    try {
      const res = await adminApi.resyncStudentGithub(studentId);
      setMessage({
        text: `Sync queued for ${studentName}: ${res.status || 'Success'}`,
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Sync failed';
      setMessage({ text: `Failed to sync ${studentName}: ${msg}`, type: 'error' });
    } finally {
      setResyncingId(null);
    }
  };

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
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface p-5 rounded-2xl border border-edge">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Connected Accounts</p>
              <p className="text-2xl font-bold text-ink mt-0.5">{overview.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface p-5 rounded-2xl border border-edge">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Active Syncs</p>
              <p className="text-2xl font-bold text-ink mt-0.5">
                {(overview.accounts || []).filter((a: any) => a.syncStatus === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="surface p-5 rounded-2xl border border-edge">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Sync Errors</p>
              <p className="text-2xl font-bold text-ink mt-0.5">
                {(overview.accounts || []).filter((a: any) => a.syncStatus === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="surface rounded-2xl border border-edge overflow-hidden">
        <div className="p-5 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-ink">Connected Student Accounts</h2>
            <p className="text-xs text-ink-muted">List of students with verified GitHub SSO connections</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search name or roll no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 text-xs py-1.5 w-60"
              />
            </div>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-canvas/50 text-ink-muted border-b border-edge">
              <tr>
                <th className="p-3.5 pl-5">Student</th>
                <th className="p-3.5">GitHub Login</th>
                <th className="p-3.5">Repos</th>
                <th className="p-3.5">Showcased</th>
                <th className="p-3.5">Sync Status</th>
                <th className="p-3.5">Last Synced</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {(overview.accounts || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-muted">
                    No connected GitHub accounts found.
                  </td>
                </tr>
              ) : (
                (overview.accounts || []).map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-surface-canvas/30 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-ink">{acc.student?.name}</div>
                      <div className="text-[11px] text-ink-muted font-mono">{acc.student?.rollNo}</div>
                    </td>
                    <td className="p-3.5">
                      <a
                        href={`https://github.com/${acc.login}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline font-mono"
                      >
                        @{acc.login}
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="p-3.5 font-medium">{acc.reposCount}</td>
                    <td className="p-3.5 font-medium">{acc.showcasedCount}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          acc.syncStatus === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : acc.syncStatus === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : acc.syncStatus === 'SYNCING'
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {acc.syncStatus}
                      </span>
                      {acc.syncError && (
                        <div className="text-[10px] text-rose-400 truncate max-w-xs mt-0.5" title={acc.syncError}>
                          {acc.syncError}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-ink-muted">
                      {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => handleResync(acc.studentId, acc.student?.name)}
                        disabled={resyncingId === acc.studentId}
                        className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <RefreshCw size={11} className={resyncingId === acc.studentId ? 'animate-spin' : ''} />
                        <span>Re-sync</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sync Logs Section */}
      <div className="surface rounded-2xl border border-edge overflow-hidden">
        <div className="p-5 border-b border-edge flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Recent Sync Logs (Last 20)</h2>
            <p className="text-xs text-ink-muted">Execution history, rate remaining, and API points consumed</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-ink-muted" />
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="input text-xs py-1"
            >
              <option value="all">All Logs</option>
              <option value="errors">Errors / Skipped Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-canvas/50 text-ink-muted border-b border-edge">
              <tr>
                <th className="p-3.5 pl-5">Time</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Trigger</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">API Calls</th>
                <th className="p-3.5">Rate Remaining</th>
                <th className="p-3.5 pr-5">Error / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-muted">
                    No sync logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-canvas/30 transition-colors">
                    <td className="p-3.5 pl-5 text-ink-muted">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-ink">{log.student?.name}</div>
                      <div className="text-[11px] text-ink-muted font-mono">{log.student?.rollNo}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">{log.trigger}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : log.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : log.status === 'SKIPPED_RATE_LIMIT'
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">{log.apiCalls ?? 0}</td>
                    <td className="p-3.5 font-mono">{log.rateRemaining ?? '—'}</td>
                    <td className="p-3.5 pr-5 text-ink-muted truncate max-w-xs" title={log.error || log.details}>
                      {log.error || log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminGithubPage;
