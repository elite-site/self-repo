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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>SUCCESS</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>WARNING</span>
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-500" />
            <span>ERROR</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3 text-blue-500" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, string> = {
      APPLICATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
      FILE_UPLOAD: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      EMAIL: 'bg-pink-50 text-pink-700 border-pink-200',
      GOOGLE_DRIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      DATABASE: 'bg-neutral-100 text-neutral-700 border-neutral-300',
      AUTH: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    const style = map[category] || 'bg-neutral-100 text-neutral-600 border-neutral-200';
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${style}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* 1. HEADER */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            System & Security Audit
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-elite-black dark:text-white font-display tracking-tight mt-0.5 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-elite-red" />
            <span>Activity Audit Log</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time administrative audit trail, system activity, and upload status logs.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-elite-red text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-elite-red' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* 2. STATS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Recorded</span>
            <Server className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-extrabold text-elite-black dark:text-white font-display">
            {stats.totalActivities}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Apps Today</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-display">
            {stats.applicationsToday}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Admin Operations</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-display">
            {stats.adminActions}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Errors Recorded</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600 dark:text-red-400 font-display">
            {stats.errorsCount}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">System Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
            {stats.successRate}%
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-elite-red" />
            <span>Filter Audit Trail</span>
          </div>
          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-elite-red hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-elite-red"
            >
              <option value="ALL">All Categories</option>
              <option value="APPLICATION">APPLICATION</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FILE_UPLOAD">FILE_UPLOAD</option>
              <option value="EMAIL">EMAIL</option>
              <option value="GOOGLE_DRIVE">GOOGLE_DRIVE</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-elite-red"
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
            <label className="text-[10px] font-bold text-neutral-400 uppercase">Search Logs</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Action, details, applicant..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-8 pr-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-elite-red"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. AUDIT LOG DATA TABLE */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action / Detail</th>
                <th className="py-3 px-4">Details & Context</th>
                <th className="py-3 px-4">User / Applicant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-elite-red mb-2" />
                    Loading activity audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 font-mono">
                    No activity logs match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors">
                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">{new Date(log.createdAt).toLocaleDateString()}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-neutral-100 max-w-xs">
                      <div>{log.action}</div>
                      {log.errorMessage && (
                        <div className="text-[10px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-1 rounded mt-1 border border-red-200 dark:border-red-900">
                          {log.errorMessage}
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 font-mono text-[11px] max-w-sm truncate">
                      {log.details || '-'}
                    </td>

                    {/* User / Applicant */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-200">
                      {log.applicantName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-elite-red shrink-0" />
                          <span>{log.applicantName}</span>
                        </div>
                      ) : log.userEmail ? (
                        <div className="text-neutral-500 text-[11px] font-mono">{log.userEmail}</div>
                      ) : (
                        <span className="text-neutral-400 font-mono text-[10px]">System</span>
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
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 font-mono">
              Showing page {page} of {totalPages} ({totalCount} total entries)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
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
