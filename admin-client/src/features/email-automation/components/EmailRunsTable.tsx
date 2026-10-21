import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { EmailHistoryResponse } from '../types';

interface EmailRunsTableProps {
  runs: EmailHistoryResponse['automationRuns'];
}

export const EmailRunsTable: React.FC<EmailRunsTableProps> = ({ runs }) => {
  const safeRuns = runs || [];
  if (safeRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-ink">No Automation Execution Runs Found</h4>
        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          Workflow triggers will appear here once automated batches or event listeners are dispatched.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
          <tr>
            <th className="px-5 py-3">Timestamp</th>
            <th className="px-5 py-3">Workflow Rule</th>
            <th className="px-5 py-3">Trigger Type</th>
            <th className="px-5 py-3">Reach</th>
            <th className="px-5 py-3">Dispatch Status</th>
            <th className="px-5 py-3">Diagnostics</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-ink-secondary">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-surface-sunken/50 transition-colors">
              <td className="px-5 py-3.5 font-mono text-ink-muted whitespace-nowrap">
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
              </td>
              <td className="px-5 py-3.5 font-bold text-ink">
                {run.automation?.name || 'Manual Batch Dispatch'}
              </td>
              <td className="px-5 py-3.5 font-mono text-xs">
                {run.trigger}
              </td>
              <td className="px-5 py-3.5">
                <span className="font-semibold text-ink">{run.recipientCount}</span> recipients
              </td>
              <td className="px-5 py-3.5">
                {run.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                    <CheckCircle2 className="w-3 h-3" />
                    COMPLETED
                  </span>
                ) : run.status === 'PARTIAL' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-pending text-status-pending">
                    <AlertTriangle className="w-3 h-3" />
                    PARTIAL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-rejected text-status-rejected">
                    <XCircle className="w-3 h-3" />
                    FAILED
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-ink-muted max-w-xs truncate">
                {run.error || 'Execution successful with zero send errors'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
