import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  User,
  ShieldCheck,
  Zap,
  Server,
} from 'lucide-react';
import { api } from '../services/api';

interface ActivityLogItem {
  id: string;
  eventId: string;
  category: string;
  action: string;
  details: string | null;
  userEmail: string | null;
  applicantName: string | null;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  errorMessage: string | null;
  createdAt: string;
}

interface ActivityStats {
  totalActivities: number;
  applicationsToday: number;
  adminActions: number;
  errorsCount: number;
  successRate: number;
}

interface ActivityLogViewProps {
  activeEventId: string;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  activeEventId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    applicationsToday: 0,
    adminActions: 0,
    errorsCount: 0,
    successRate: 100,
  });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync selected event if activeEventId changes
  useEffect(() => {
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
    setPage(1);
  }, [activeEventId]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getActivityLogs({
        eventId: activeEventId,
        category: selectedCategory,
        status: selectedStatus,
        search: searchQuery,
        page,
        limit: 20,
      });

      setLogs(response.logs || []);
      if (response.stats) {
        setStats(response.stats);
      }
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
        setTotalCount(response.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId, selectedCategory, selectedStatus, searchQuery, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-approved">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="badge badge-pending">
            <AlertTriangle className="w-3 h-3" />
            <span>WARNING</span>
          </span>
        );
      case 'ERROR':
        return (
          <span className="badge badge-rejected">
            <XCircle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-review">
            <Info className="w-3 h-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, string> = {
      APPLICATION: 'badge badge-review',
      ADMIN: 'badge badge-review',
      FILE_UPLOAD: 'badge badge-pending',
      EMAIL: 'badge badge-changes',
      GOOGLE_DRIVE: 'badge badge-approved',
      DATABASE: 'badge badge-draft',
      AUTH: 'badge badge-pending',
    };
    const cls = map[category] || 'badge badge-draft';
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${cls}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto page-enter">
      {/* 1. HEADER */}
      <div className="border-b border-edge pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-ink-brand uppercase">
            System & Security Audit
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-0.5 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-ink-brand" />
            <span>Activity Audit Log</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Real-time administrative audit trail, system activity, and upload status logs.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="btn btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-ink-brand' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* 2. STATS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="surface p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Recorded</span>
            <Server className="w-4 h-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-extrabold text-ink">
            {stats.totalActivities}
          </div>
        </div>

        <div className="surface p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider">Apps Today</span>
            <Zap className="w-4 h-4 text-ink-brand" />
          </div>
          <div className="text-2xl font-extrabold text-ink-brand">
            {stats.applicationsToday}
          </div>
        </div>

        <div className="surface p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider">Admin Operations</span>
            <ShieldCheck className="w-4 h-4 text-ink-brand" />
          </div>
          <div className="text-2xl font-extrabold text-ink-brand">
            {stats.adminActions}
          </div>
        </div>

        <div className="surface p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider">Errors Recorded</span>
            <XCircle className="w-4 h-4 text-status-rejected" />
          </div>
          <div className="text-2xl font-extrabold text-status-rejected">
            {stats.errorsCount}
          </div>
        </div>

        <div className="surface p-4 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider">System Health</span>
            <CheckCircle2 className="w-4 h-4 text-status-approved" />
          </div>
          <div className="text-2xl font-extrabold text-status-approved">
            {stats.successRate}%
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div className="surface p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-edge">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-secondary uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-ink-brand" />
            <span>Filter Audit Trail</span>
          </div>
          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-ink-brand hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="label text-ink-muted">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="select"
            >
              <option value="ALL">All Categories</option>
              <option value="APPLICATION">APPLICATION</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FILE_UPLOAD">FILE_UPLOAD</option>
              <option value="EMAIL">EMAIL</option>
              <option value="GOOGLE_DRIVE">GOOGLE_DRIVE</option>
              <option value="DATABASE">DATABASE</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="label text-ink-muted">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="select"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="label text-ink-muted">Search Logs</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Action, details, applicant..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="input pl-8"
              />
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. AUDIT LOG DATA TABLE */}
      <div className="surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" role="grid" aria-label="Activity logs">
            <thead>
              <tr className="bg-surface-inset border-b border-edge text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                <th className="py-3 px-4" scope="col">Status</th>
                <th className="py-3 px-4" scope="col">Category</th>
                <th className="py-3 px-4" scope="col">Timestamp</th>
                <th className="py-3 px-4" scope="col">Action / Detail</th>
                <th className="py-3 px-4" scope="col">Details & Context</th>
                <th className="py-3 px-4" scope="col">User / Applicant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-ink-brand mb-2" />
                    Loading activity audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted font-mono">
                    No activity logs match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-canvas transition-colors">
                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-ink-secondary">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-ink-muted" />
                        <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="text-[10px] text-ink-muted">{new Date(log.createdAt).toLocaleDateString()}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 font-bold text-ink max-w-xs">
                      <div>{log.action}</div>
                      {log.errorMessage && (
                        <div className="text-[10px] font-mono text-status-rejected bg-status-bg-rejected p-1 rounded mt-1 border border-status-bg-rejected/50">
                          {log.errorMessage}
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-ink-secondary font-mono text-[11px] max-w-sm truncate">
                      {log.details || '-'}
                    </td>

                    {/* User / Applicant */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-ink">
                      {log.applicantName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-ink-brand shrink-0" />
                          <span>{log.applicantName}</span>
                        </div>
                      ) : log.userEmail ? (
                        <div className="text-ink-secondary text-[11px] font-mono">{log.userEmail}</div>
                      ) : (
                        <span className="text-ink-muted font-mono text-[10px]">System</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-edge bg-surface-inset flex items-center justify-between text-xs">
            <span className="text-ink-secondary font-mono">
              Showing page {page} of {totalPages} ({totalCount} total entries)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary px-3 py-1.5"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary px-3 py-1.5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
