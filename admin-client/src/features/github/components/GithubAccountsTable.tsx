import React from 'react';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';
import { GithubAccount } from '../types';

interface GithubAccountsTableProps {
  accounts: GithubAccount[];
  search: string;
  onSearchChange: (val: string) => void;
  loading: boolean;
  onRefresh: () => void;
  resyncingId: string | null;
  onResync: (studentId: string, studentName: string) => void;
}

export const GithubAccountsTable: React.FC<GithubAccountsTableProps> = ({
  accounts,
  search,
  onSearchChange,
  loading,
  onRefresh,
  resyncingId,
  onResync,
}) => {
  return (
    <div className="surface rounded-2xl border border-edge overflow-hidden">
      <div className="p-5 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink">Connected Student Accounts</h2>
          <p className="text-xs text-ink-muted">List of students with verified GitHub SSO connections</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search name or roll no..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input pl-9 text-xs py-1.5 w-60"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-canvas/50 text-ink-muted border-b border-edge">
            <tr>
              <th className="p-3.5 pl-5">Student</th>
              <th className="p-3.5">GitHub Login</th>
              <th className="p-3.5">Repos</th>
              <th className="p-3.5">Showcased</th>
              <th className="p-3.5">Sync Status</th>
              <th className="p-3.5">Last Synced</th>
              <th className="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-muted">
                  No connected GitHub accounts found.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-surface-canvas/30 transition-colors">
                  <td className="p-3.5 pl-5">
                    <div className="font-semibold text-ink">{acc.student?.name}</div>
                    <div className="text-[11px] text-ink-muted font-mono">{acc.student?.rollNo}</div>
                  </td>
                  <td className="p-3.5">
                    <a
                      href={`https://github.com/${acc.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:underline font-mono"
                    >
                      @{acc.login}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="p-3.5 font-medium">{acc.reposCount}</td>
                  <td className="p-3.5 font-medium">{acc.showcasedCount}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        acc.syncStatus === 'COMPLETED'
                          ? 'bg-success/10 text-success'
                          : acc.syncStatus === 'FAILED'
                          ? 'bg-danger/10 text-danger'
                          : acc.syncStatus === 'SYNCING'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-surface-sunken text-ink-muted'
                      }`}
                    >
                      {acc.syncStatus}
                    </span>
                    {acc.syncError && (
                      <div className="text-[10px] text-danger truncate max-w-xs mt-0.5" title={acc.syncError}>
                        {acc.syncError}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-ink-muted">
                    {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <button
                      onClick={() => onResync(acc.studentId, acc.student?.name || 'student')}
                      disabled={resyncingId === acc.studentId}
                      className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                    >
                      <RefreshCw size={11} className={resyncingId === acc.studentId ? 'animate-spin' : ''} />
                      <span>Re-sync</span>
                    </button>
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
