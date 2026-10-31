import React from 'react';
import { Search, Download, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import type { AdminCodeChefStudentItem, AdminCodeChefFilters } from '../types';

interface AdminCodeChefTableProps {
  students: AdminCodeChefStudentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  filters: AdminCodeChefFilters;
  onFilterChange: (filters: AdminCodeChefFilters) => void;
  onSelectStudent: (studentId: string) => void;
  onExportCsv: () => void;
}

export const AdminCodeChefTable: React.FC<AdminCodeChefTableProps> = ({
  students,
  total,
  page,
  totalPages,
  loading,
  filters,
  onFilterChange,
  onSelectStudent,
  onExportCsv,
}) => {
  return (
    <div className="p-5 bg-surface rounded-xl border border-border space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-ink">All Students CodeChef Directory</h3>
          <p className="text-xs text-ink-muted">{total.toLocaleString()} total students matched</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium text-ink flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" /> Export CSV (Stream)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="relative col-span-2 sm:col-span-1">
          <input
            type="text"
            placeholder="Search student / handle..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value, page: 1 })}
            className="w-full pl-7 pr-2.5 py-1.5 bg-surface-muted border border-border rounded-lg text-ink placeholder:text-ink-muted outline-none focus:border-primary"
          />
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2 top-2" />
        </div>

        <select
          value={filters.year || ''}
          onChange={(e) => onFilterChange({ ...filters, year: e.target.value ? parseInt(e.target.value, 10) : undefined, page: 1 })}
          className="px-2 py-1.5 bg-surface-muted border border-border rounded-lg text-ink outline-none"
        >
          <option value="">All Years</option>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
        </select>

        <select
          value={filters.stars || ''}
          onChange={(e) => onFilterChange({ ...filters, stars: e.target.value ? parseInt(e.target.value, 10) : undefined, page: 1 })}
          className="px-2 py-1.5 bg-surface-muted border border-border rounded-lg text-ink outline-none"
        >
          <option value="">All Star Tiers</option>
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <option key={s} value={s}>{s} Star ({s}★)</option>
          ))}
        </select>

        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined, page: 1 })}
          className="px-2 py-1.5 bg-surface-muted border border-border rounded-lg text-ink outline-none"
        >
          <option value="">All Statuses</option>
          <option value="CONNECTED">Connected</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="STALE">Stale</option>
          <option value="ERROR">Sync Error</option>
        </select>

        <select
          value={filters.connected === undefined ? '' : String(filters.connected)}
          onChange={(e) => onFilterChange({ ...filters, connected: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 })}
          className="px-2 py-1.5 bg-surface-muted border border-border rounded-lg text-ink outline-none"
        >
          <option value="">All Accounts</option>
          <option value="true">Connected Only</option>
          <option value="false">Not Connected</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-ink-muted uppercase">
              <th className="py-2.5 px-3">Student</th>
              <th className="py-2.5 px-3">Cohort</th>
              <th className="py-2.5 px-3">Handle</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Rating</th>
              <th className="py-2.5 px-3 text-right">Solved</th>
              <th className="py-2.5 px-3 text-right">Contests</th>
              <th className="py-2.5 px-3 text-right">Last Synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-ink-muted">Loading students...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-ink-muted">No students matched the filter criteria.</td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.studentId} onClick={() => onSelectStudent(s.studentId)} className="hover:bg-surface-muted/50 cursor-pointer transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-ink hover:text-primary">{s.name}</div>
                    <div className="text-xs text-ink-muted">{s.rollNo}</div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-ink-muted">Y{s.year} • {s.section}</td>
                  <td className="py-2.5 px-3 text-xs font-mono">
                    {s.handle ? (
                      <span className="flex items-center gap-1 text-ink">
                        @{s.handle} {s.verified && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                      </span>
                    ) : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'CONNECTED' ? 'bg-success/10 text-success' :
                      s.status === 'UNVERIFIED' ? 'bg-amber-500/10 text-amber-500' :
                      s.status === 'ERROR' ? 'bg-danger/10 text-danger' :
                      'bg-surface-muted text-ink-muted'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-primary">
                    {s.currentRating ?? '—'} {s.stars && <span className="text-amber-500 text-xs">({s.stars}★)</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-ink-muted">{s.totalSolved ?? '—'}</td>
                  <td className="py-2.5 px-3 text-right text-xs text-ink-muted">{s.totalContests ?? '—'}</td>
                  <td className="py-2.5 px-3 text-right text-xs text-ink-muted">
                    {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-ink-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, page: Math.max(page - 1, 1) })}
              disabled={page === 1}
              className="p-1 rounded border border-border disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, page: Math.min(page + 1, totalPages) })}
              disabled={page === totalPages}
              className="p-1 rounded border border-border disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
