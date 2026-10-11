import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { EmailHistoryResponse } from '../types';

interface EmailLogsTableProps {
  logs: EmailHistoryResponse['emailLogs'];
}

export const EmailLogsTable: React.FC<EmailLogsTableProps> = ({ logs }) => {
  if (logs.length === 0) {
    return <div className="p-8 text-center text-xs text-ink-muted">No recipient dispatch logs found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
          <tr>
            <th className="px-5 py-3">Timestamp</th>
            <th className="px-5 py-3">Recipient</th>
            <th className="px-5 py-3">Email Subject</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Error Context</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-ink-secondary">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-surface-sunken/50 transition-colors">
              <td className="px-5 py-3.5 font-mono text-ink-muted whitespace-nowrap">
                {new Date(log.sentAt).toLocaleString()}
              </td>
              <td className="px-5 py-3.5">
                <div className="font-semibold text-ink">{log.recipientName || 'Student'}</div>
                <div className="font-mono text-ink-muted">{log.recipientEmail}</div>
              </td>
              <td className="px-5 py-3.5 text-ink font-medium">
                {log.subject}
              </td>
              <td className="px-5 py-3.5">
                {log.status === 'SENT' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-approved text-status-approved">
                    <CheckCircle2 className="w-3 h-3" />
                    DELIVERED
                  </span>
                ) : log.status === 'QUEUED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted">
                    <Clock className="w-3 h-3" />
                    QUEUED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-status-bg-rejected text-status-rejected">
                    <XCircle className="w-3 h-3" />
                    REJECTED
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-ink-muted max-w-xs truncate">
                {log.error || 'Delivered to SMTP gateway'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
