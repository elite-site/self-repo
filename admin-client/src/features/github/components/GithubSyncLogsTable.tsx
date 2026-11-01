import React from 'react';
import { Filter } from 'lucide-react';
import { GithubLog } from '../types';

interface GithubSyncLogsTableProps {
  logs: GithubLog[];
  logFilter: string;
  onFilterChange: (val: string) => void;
}

export const GithubSyncLogsTable: React.FC<GithubSyncLogsTableProps> = ({
  logs,
  logFilter,
  onFilterChange,
}) => {
  return (
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
      <div className="p-5 border-b border-edge flex items-center justify-between bg-surface-sunken">
        <div>
          <h2 className="text-base font-bold text-ink">Recent Sync Logs (Last 20)</h2>
          <p className="text-xs text-ink-muted">Execution history, rate remaining, and API points consumed</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-ink-muted" />
          <select
            value={logFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="select text-xs py-1 min-h-[36px] cursor-pointer"
          >
            <option value="all">All Logs</option>
            <option value="errors">Errors / Skipped Only</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken text-ink-muted border-b border-edge font-semibold">
            <tr>
              <th className="p-3.5 pl-5">Time</th>
              <th className="p-3.5">Student</th>
              <th className="p-3.5">Trigger</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">API Calls</th>
              <th className="p-3.5">Rate Remaining</th>
              <th className="p-3.5 pr-5">Error / Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-muted">
                  No sync logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-soft/40 transition-colors">
                  <td className="p-3.5 pl-5 text-ink-muted whitespace-nowrap font-mono">
                    {new Date(log.startedAt).toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-ink">{log.student?.name || '—'}</div>
                    <div className="text-[11px] text-ink-muted font-mono">{log.student?.rollNo}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-surface-sunken border border-edge text-[11px] font-mono">
                      {log.trigger}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        log.status === 'SUCCESS'
                          ? 'bg-status-approved/10 text-status-approved border border-status-approved/20'
                          : log.status === 'FAILED'
                          ? 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20'
                          : 'bg-status-pending/10 text-status-pending border border-status-pending/20'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono tabular-nums">{log.apiCalls ?? 0}</td>
                  <td className="p-3.5 font-mono tabular-nums">{log.rateRemaining ?? '—'}</td>
                  <td className="p-3.5 pr-5 max-w-xs truncate text-ink-muted">
                    {log.error || log.details ? (
                      <span className="text-status-rejected font-mono text-[11px]">{log.error || log.details}</span>
                    ) : (
                      'Completed without errors'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GithubSyncLogsTable;
