import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  XCircle,
} from 'lucide-react';
import { ActivityLogItem, ActivityLogStatus } from '../types';

interface AuditLogsTableProps {
  logs: ActivityLogItem[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onRetry: () => void;
}

const STATUS_BADGES: Record<ActivityLogStatus, { label: string; className: string; Icon: React.FC<{ className?: string }> }> = {
  SUCCESS: {
    label: 'SUCCESS',
    className: 'bg-status-bg-approved text-status-approved',
    Icon: CheckCircle2,
  },
  WARNING: {
    label: 'WARN',
    className: 'bg-status-bg-pending text-status-pending',
    Icon: AlertTriangle,
  },
  INFO: {
    label: 'INFO',
    className: 'bg-status-bg-review text-status-review',
    Icon: Info,
  },
  ERROR: {
    label: 'ERROR',
    className: 'bg-status-bg-rejected text-status-rejected',
    Icon: XCircle,
  },
};

const StatusBadge: React.FC<{ status: ActivityLogStatus }> = ({ status }) => {
  const { label, className, Icon } = STATUS_BADGES[status] ?? STATUS_BADGES.ERROR;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  logs,
  loading,
  error,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onRetry,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-ink-muted">Querying security records…</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center">
          <p className="text-xs text-status-rejected mb-3">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-muted">
          No audit log entries matching criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
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
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-sunken text-ink border border-edge">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-ink">
                    <div>{log.action}</div>
                    {log.errorMessage && (
                      <div className="text-xs font-mono font-normal text-status-rejected bg-status-bg-rejected p-1 rounded mt-1 border border-status-bg-rejected/50">
                        {log.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {log.applicantName ? (
                      <div className="text-ink">{log.applicantName}</div>
                    ) : log.userEmail ? (
                      <div className="font-mono text-ink">{log.userEmail}</div>
                    ) : (
                      <span className="text-ink-muted">SYSTEM</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={log.status} />
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

      {totalPages > 1 && (
        <div className="p-4 border-t border-edge flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            Page {page} of {totalPages} ({totalCount} total entries)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
