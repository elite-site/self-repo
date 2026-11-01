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
  limit,
  totalPages,
  loading,
  filters,
  onFilterChange,
  onSelectStudent,
  onExportCsv,
}) => {
  return (
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs space-y-4 p-5">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-edge">
        <div>
          <h3 className="font-bold text-base text-ink font-sans">All Students CodeChef Directory</h3>
          <p className="text-xs text-ink-muted">{total.toLocaleString()} total students matched</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="btn btn-secondary text-xs min-h-[38px] px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-brand" />
            <span>Export CSV (Stream)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
        <div className="relative col-span-2 sm:col-span-1">
          <input
            type="text"
            placeholder="Search student / handle..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value, page: 1 })}
            className="input pl-8 pr-2.5 text-xs min-h-[38px] w-full"
          />
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <select
          value={filters.year ?? ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              year: e.target.value ? parseInt(e.target.value, 10) : undefined,
              page: 1,
            })
          }
          className="select text-xs min-h-[38px] cursor-pointer"
        >
          <option value="">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          value={filters.section ?? ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              section: e.target.value || undefined,
              page: 1,
            })
          }
          className="select text-xs min-h-[38px] cursor-pointer"
        >
          <option value="">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
        </select>

        <select
          value={filters.stars ?? ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              stars: e.target.value ? parseInt(e.target.value, 10) : undefined,
              page: 1,
            })
          }
          className="select text-xs min-h-[38px] cursor-pointer"
        >
          <option value="">All Star Tiers</option>
          <option value="1">1 Star</option>
          <option value="2">2 Star</option>
          <option value="3">3 Star</option>
          <option value="4">4 Star+</option>
        </select>

        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              status: e.target.value || undefined,
              page: 1,
            })
          }
          className="select text-xs min-h-[38px] cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="CONNECTED">Connected</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="STALE">Stale</option>
          <option value="ERROR">Error</option>
          <option value="NOT_CONNECTED">Not Connected</option>
        </select>
      </div>

      {/* Table Container - Strict horizontal container scrolling */}
      <div className="table-responsive">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-edge bg-surface-sunken text-xs font-semibold text-ink-secondary">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4">CodeChef Handle</th>
              <th className="py-3 px-4 text-center">Stars</th>
              <th className="py-3 px-4 text-right">Rating</th>
              <th className="py-3 px-4 text-right">Solved</th>
              <th className="py-3 px-4 text-right">Contests</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-ink-muted">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading CodeChef directory...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-ink-muted">
                  No students matched your search criteria.
                </td>
              </tr>
            ) : (
              students.map((st) => (
                <tr
                  key={st.id}
                  onClick={() => onSelectStudent(st.studentId || st.id)}
                  className="hover:bg-brand-soft/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-ink group-hover:text-brand transition-colors text-sm">
                      {st.name}
                    </div>
                    <div className="text-ink-muted font-mono text-xs">{st.rollNo}</div>
                  </td>
                  <td className="py-3.5 px-4 text-ink-secondary whitespace-nowrap text-xs">
                    Year {st.year} · Sec {st.section}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    {st.handle ? (
                      <span className="text-brand font-semibold">@{st.handle}</span>
                    ) : (
                      <span className="text-ink-muted italic">Not linked</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {st.stars ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-status-pending/10 text-status-pending border border-status-pending/20">
                        {st.stars}★
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-ink tabular-nums">
                    {st.currentRating ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-ink-secondary tabular-nums">
                    {st.totalSolved ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-ink-muted tabular-nums">
                    {st.totalContests ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {st.verified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-status-approved/10 text-status-approved border border-status-approved/20">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    ) : st.status === 'CONNECTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-soft text-brand border border-brand/20">
                        Connected
                      </span>
                    ) : st.status === 'UNVERIFIED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-status-pending/10 text-status-pending border border-status-pending/20">
                        Unverified
                      </span>
                    ) : st.status === 'ERROR' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-status-flagged/10 text-status-flagged border border-status-flagged/20">
                        Error
                      </span>
                    ) : (
                      <span className="text-ink-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(st.studentId || st.id);
                      }}
                      className="btn btn-secondary text-xs px-2.5 py-1 min-h-[34px] cursor-pointer shadow-2xs hover:border-brand/40"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-edge text-xs text-ink-secondary">
          <div>
            Showing <strong className="text-ink">{(page - 1) * limit + 1}</strong> to{' '}
            <strong className="text-ink">{Math.min(page * limit, total)}</strong> of{' '}
            <strong className="text-ink">{total}</strong> students
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, page: Math.max(1, page - 1) })}
              disabled={page <= 1}
              className="btn btn-secondary px-3 py-1.5 text-xs min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono px-2 font-semibold">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, page: Math.min(totalPages, page + 1) })}
              disabled={page >= totalPages}
              className="btn btn-secondary px-3 py-1.5 text-xs min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodeChefTable;
