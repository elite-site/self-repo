import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityLogItem } from '../types';

interface AuditLogsTableProps {
  logs: ActivityLogItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  logs,
  loading,
  page,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-ink-muted">Querying security records…</p>
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
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                        <CheckCircle2 className="w-3 h-3" />
                        SUCCESS
                      </span>
                    ) : log.status === 'WARNING' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-pending text-status-pending">
                        <AlertTriangle className="w-3 h-3" />
                        WARN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-rejected text-status-rejected">
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

      {totalPages > 1 && (
        <div className="p-4 border-t border-edge flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-edge-strong hover:bg-surface-sunken disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
