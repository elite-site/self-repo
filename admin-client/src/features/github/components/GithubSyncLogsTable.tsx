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
    <div className="surface rounded-2xl border border-edge overflow-hidden">
      <div className="p-5 border-b border-edge flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Recent Sync Logs (Last 20)</h2>
          <p className="text-xs text-ink-muted">Execution history, rate remaining, and API points consumed</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-ink-muted" />
          <select
            value={logFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="input text-xs py-1"
          >
            <option value="all">All Logs</option>
            <option value="errors">Errors / Skipped Only</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-canvas/50 text-ink-muted border-b border-edge">
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
                <tr key={log.id} className="hover:bg-surface-canvas/30 transition-colors">
                  <td className="p-3.5 pl-5 text-ink-muted">
                    {new Date(log.startedAt).toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-ink">{log.student?.name}</div>
                    <div className="text-[11px] text-ink-muted font-mono">{log.student?.rollNo}</div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">{log.trigger}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : log.status === 'SKIPPED_RATE_LIMIT'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono">{log.apiCalls ?? 0}</td>
                  <td className="p-3.5 font-mono">{log.rateRemaining ?? '—'}</td>
                  <td className="p-3.5 pr-5 text-ink-muted truncate max-w-xs" title={log.error || log.details || undefined}>
                    {log.error || log.details || '—'}
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
