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
    className: 'bg-status-approved/10 text-status-approved border border-status-approved/20',
    Icon: CheckCircle2,
  },
  WARNING: {
    label: 'WARN',
    className: 'bg-status-pending/10 text-status-pending border border-status-pending/20',
    Icon: AlertTriangle,
  },
  INFO: {
    label: 'INFO',
    className: 'bg-brand-soft text-brand-soft-text border border-brand/20',
    Icon: Info,
  },
  ERROR: {
    label: 'ERROR',
    className: 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20',
    Icon: XCircle,
  },
};

const StatusBadge: React.FC<{ status: ActivityLogStatus }> = ({ status }) => {
  const { label, className, Icon } = STATUS_BADGES[status] ?? STATUS_BADGES.ERROR;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${className}`}>
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
    <div className="surface border border-edge rounded-xl shadow-xs overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-14">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-ink-muted">Querying security records…</p>
        </div>
      ) : error ? (
        <div className="p-14 text-center">
          <p className="text-xs text-status-rejected mb-3">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-secondary text-xs min-h-[38px] px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-14 text-center text-xs text-ink-muted">
          No audit log entries matching criteria.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-surface-sunken text-ink-secondary text-xs font-semibold border-b border-edge">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Action Description</th>
                <th className="px-5 py-3.5">Operator / Target</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Diagnostic Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-soft/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-sunken text-ink border border-edge">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-ink text-sm">
                    <div>{log.action}</div>
                    {log.errorMessage && (
                      <div className="text-xs font-mono font-normal text-status-rejected bg-status-rejected/10 p-1.5 rounded mt-1 border border-status-rejected/20">
                        {log.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {log.applicantName ? (
                      <div className="text-ink font-semibold">{log.applicantName}</div>
                    ) : log.userEmail ? (
                      <div className="font-mono text-ink-secondary">{log.userEmail}</div>
                    ) : (
                      <span className="text-ink-muted font-mono">SYSTEM</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-muted max-w-xs truncate">
                    {log.details || 'No details'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-edge flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-3">
          <div>
            Showing <strong className="text-ink">{(page - 1) * 20 + 1}</strong> to{' '}
            <strong className="text-ink">{Math.min(page * 20, totalCount)}</strong> of{' '}
            <strong className="text-ink">{totalCount.toLocaleString()}</strong> events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn btn-secondary px-3 py-1.5 min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono px-2 font-semibold text-ink">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary px-3 py-1.5 min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsTable;
