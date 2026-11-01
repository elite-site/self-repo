import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { EmailHistoryResponse } from '../types';

interface EmailLogsTableProps {
  logs: EmailHistoryResponse['emailLogs'];
}

export const EmailLogsTable: React.FC<EmailLogsTableProps> = ({ logs }) => {
  const safeLogs = logs || [];
  if (safeLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted mb-3 border border-edge">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-ink">No Recipient Dispatch Logs Found</h4>
        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          Individual delivery receipts and delivery confirmations will populate here.
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
            <th className="px-5 py-3.5">Recipient</th>
            <th className="px-5 py-3.5">Email Subject</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Error Context</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-ink-secondary">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-brand-soft/40 transition-colors">
              <td className="px-5 py-3.5 font-mono text-ink-muted whitespace-nowrap">
                {new Date(log.sentAt).toLocaleString()}
              </td>
              <td className="px-5 py-3.5">
                <div className="font-semibold text-ink">{log.recipientName || 'Student'}</div>
                <div className="font-mono text-ink-muted">{log.recipientEmail}</div>
              </td>
              <td className="px-5 py-3.5 text-ink font-medium max-w-sm">
                {log.subject}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                {log.status === 'SENT' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-status-approved/10 text-status-approved border border-status-approved/20">
                    <CheckCircle2 className="w-3 h-3" />
                    DELIVERED
                  </span>
                ) : log.status === 'QUEUED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-sunken text-ink-muted border border-edge">
                    <Clock className="w-3 h-3" />
                    QUEUED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-status-rejected/10 text-status-rejected border border-status-rejected/20">
                    <XCircle className="w-3 h-3" />
                    FAILED
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 max-w-xs truncate font-mono text-xs text-ink-muted">
                {log.error || 'None (250 OK Delivered)'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmailLogsTable;
