import React from 'react';
import { Search, RefreshCw, ExternalLink, GitFork } from 'lucide-react';
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
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
      <div className="p-5 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-sunken">
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
              className="input pl-9 text-xs py-1.5 w-60 min-h-[38px]"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-secondary text-xs min-h-[38px] flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-brand' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken text-ink-muted border-b border-edge font-semibold">
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
                <tr key={acc.id} className="hover:bg-brand-soft/40 transition-colors">
                  <td className="p-3.5 pl-5">
                    <div className="font-semibold text-sm text-ink">{acc.student?.name}</div>
                    <div className="text-xs text-ink-muted font-mono font-medium mt-0.5">{acc.student?.rollNo}</div>
                  </td>
                  <td className="p-3.5">
                    <a
                      href={`https://github.com/${acc.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:underline font-mono text-xs font-semibold"
                    >
                      @{acc.login}
                      <ExternalLink size={11} />
                    </a>
                  </td>
                  <td className="p-3.5 font-medium text-xs text-ink tabular-nums">{acc.reposCount}</td>
                  <td className="p-3.5 font-medium text-xs text-ink tabular-nums">{acc.showcasedCount}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        acc.syncStatus === 'COMPLETED'
                          ? 'bg-status-approved/10 text-status-approved border border-status-approved/20'
                          : acc.syncStatus === 'FAILED'
                          ? 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20'
                          : acc.syncStatus === 'SYNCING'
                          ? 'bg-status-pending/10 text-status-pending border border-status-pending/20'
                          : 'bg-surface-sunken text-ink-muted border border-edge'
                      }`}
                    >
                      {acc.syncStatus}
                    </span>
                    {acc.syncError && (
                      <div className="text-xs text-status-rejected truncate max-w-xs mt-0.5" title={acc.syncError}>
                        {acc.syncError}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-xs text-ink-muted font-mono whitespace-nowrap">
                    {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onResync(acc.studentId, acc.student?.name || 'student')}
                      disabled={resyncingId === acc.studentId}
                      className="btn btn-secondary text-xs px-2.5 py-1.5 min-h-[34px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-brand/40"
                    >
                      <RefreshCw size={12} className={resyncingId === acc.studentId ? 'animate-spin text-brand' : ''} />
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

export default GithubAccountsTable;
