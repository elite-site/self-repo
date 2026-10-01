import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalActivities: 0,
    applicationsToday: 0,
    adminActions: 0,
    errorsCount: 0,
    successRate: 100,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminApi.getActivityLogs({
        page,
        limit: 20,
        category: category === 'ALL' ? undefined : category,
        status: status === 'ALL' ? undefined : status,
        search: search.trim() || undefined,
      });
      setLogs(res.logs || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, category, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(true);
  };

  const handleExport = () => {
    const url = adminApi.getActivityLogsExportUrl();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security-audit-logs-${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            onClick={() => fetchLogs(true)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Total Logged Events
          </span>
          <div className="text-2xl font-extrabold text-ink">
            {stats.totalActivities.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Admin Operations
          </span>
          <div className="text-2xl font-extrabold text-status-approved">
            {stats.adminActions} Actions
          </div>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            System Reliability
          </span>
          <div className="text-2xl font-extrabold text-status-approved">
            {stats.successRate}% Success
          </div>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Errors / Anomalies
          </span>
          <div className="text-2xl font-extrabold text-status-rejected">
            {stats.errorsCount} Recorded
          </div>
        </div>

        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Applications Today
          </span>
          <div className="text-2xl font-extrabold text-status-review">
            {stats.applicationsToday} Received
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-edge rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by action, administrator email, student name, or details..."
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
            <option value="ADMIN">ADMIN Operations</option>
            <option value="COMMUNICATIONS">COMMUNICATIONS</option>
            <option value="SUBMISSION">SUBMISSIONS</option>
            <option value="MODERATION">MODERATION</option>
            <option value="SYSTEM">SYSTEM</option>
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
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-ink-muted">Querying security records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            No audit log entries matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken text-ink-secondary uppercase font-semibold border-b border-edge">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Action Description</th>
                  <th className="px-5 py-3">Operator / Target</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3">Diagnostic Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge text-ink-secondary">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-ink-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface-sunken text-ink border border-edge">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-ink">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.userEmail ? (
                        <div className="font-mono text-ink">{log.userEmail}</div>
                      ) : log.applicantName ? (
                        <div className="text-ink">{log.applicantName}</div>
                      ) : (
                        <span className="text-ink-muted">SYSTEM</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      ) : log.status === 'WARNING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-pending text-status-pending">
                          <AlertTriangle className="w-3 h-3" />
                          WARN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-bg-rejected text-status-rejected">
                          <XCircle className="w-3 h-3" />
                          ERROR
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted max-w-xs truncate">
                      {log.details || 'No details'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-edge flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
