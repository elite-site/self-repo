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
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted mb-3 border border-edge">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-ink">No Automation Execution Runs Found</h4>
        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          Workflow triggers will appear here once automated batches or event listeners are dispatched.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive max-h-[70vh] overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
          <tr>
            <th className="px-5 py-3.5">Timestamp</th>
            <th className="px-5 py-3.5">Workflow Rule</th>
            <th className="px-5 py-3.5">Trigger Type</th>
            <th className="px-5 py-3.5">Reach</th>
            <th className="px-5 py-3.5">Dispatch Status</th>
            <th className="px-5 py-3.5">Diagnostics</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-ink-secondary">
          {safeRuns.map((run) => (
            <tr key={run.id} className="hover:bg-brand-soft/40 transition-colors">
              <td className="px-5 py-3.5 font-mono text-ink-muted whitespace-nowrap">
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
              </td>
              <td className="px-5 py-3.5 font-bold text-ink">
                {run.automation?.name || 'Manual Batch Dispatch'}
              </td>
              <td className="px-5 py-3.5 font-mono text-xs">
                <span className="px-2 py-0.5 rounded-full bg-surface-sunken border border-edge font-mono">
                  {run.trigger}
                </span>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="font-semibold text-ink">{run.recipientCount}</span> recipients
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                {run.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-status-approved/10 text-status-approved border border-status-approved/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    COMPLETED
                  </span>
                ) : run.status === 'PARTIAL' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-status-pending/10 text-status-pending border border-status-pending/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    PARTIAL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-status-rejected/10 text-status-rejected border border-status-rejected/20">
                    <XCircle className="w-3.5 h-3.5" />
                    {run.status}
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 max-w-xs truncate font-mono text-xs">
                {run.error ? (
                  <span className="text-status-rejected font-medium">{run.error}</span>
                ) : (
                  <span className="text-ink-muted">Executed successfully without error</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmailRunsTable;
