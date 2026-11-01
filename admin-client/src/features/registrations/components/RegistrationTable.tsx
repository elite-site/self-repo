import React from 'react';
import { Layers, AlertCircle, Loader2, Users, HelpCircle, Eye, Check, UserCheck, X } from 'lucide-react';
import { RegistrationItem, RegistrationStatus } from '../types';
import { RegistrationStatusBadge } from './RegistrationStatusBadge';

export interface RegistrationTableProps {
  registrations: RegistrationItem[];
  totalRegistrations: number;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onPageChange: (newPage: number) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onSelectRegistration: (reg: RegistrationItem) => void;
  onUpdateStatus: (id: string, status: RegistrationStatus) => void;
}

export const RegistrationTable: React.FC<RegistrationTableProps> = ({
  registrations,
  totalRegistrations,
  loading,
  error,
  page,
  limit,
  totalPages,
  hasActiveFilters,
  onPageChange,
  onResetFilters,
  onRetry,
  onSelectRegistration,
  onUpdateStatus,
}) => {
  return (
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="text-xs text-ink-muted font-medium">Loading registrations…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <AlertCircle className="w-10 h-10 text-status-rejected" />
          <h3 className="font-bold text-sm text-ink">Failed to load registrations</h3>
          <p className="text-xs text-ink-muted max-w-sm">{error}</p>
          <button
            onClick={onRetry}
            className="btn btn-secondary text-xs font-bold rounded-lg cursor-pointer shadow-xs"
          >
            Try Again
          </button>
        </div>
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
          <Layers className="w-12 h-12 text-ink-muted" />
          <h3 className="font-bold text-sm text-ink">No registrations found</h3>
          <p className="text-xs text-ink-muted max-w-sm">
            {hasActiveFilters
              ? 'No registrations match the selected filters. Try broadening your criteria.'
              : 'There are no student registrations for this event yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="btn btn-secondary text-xs mt-2 cursor-pointer shadow-xs"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive max-h-[70vh] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-sunken border-b border-edge text-ink-muted font-semibold">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Academic</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Participation</th>
                <th className="py-3.5 px-4">Answers</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {registrations.map((reg) => {
                const initials = reg.student.name
                  ? reg.student.name
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'ST';

                return (
                  <tr key={reg.id} className="hover:bg-brand-soft/40 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-soft-text font-bold flex items-center justify-center text-xs shrink-0 border border-brand/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate max-w-[180px]">
                            {reg.student.name}
                          </div>
                          <div className="text-xs font-mono font-medium text-ink-muted">
                            {reg.student.rollNo}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Year & Section */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-surface-sunken text-ink-secondary border border-edge">
                        Y{reg.student.year} · Sec {reg.student.section}
                      </span>
                    </td>

                    {/* Event */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink truncate max-w-[150px]">
                        {reg.event.name}
                      </div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                        {reg.event.type}
                      </div>
                    </td>

                    {/* Participation Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {reg.team ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                            <Users className="w-3.5 h-3.5 text-brand" />
                            {reg.team.name}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {reg.team.members.length} {reg.team.members.length === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-secondary font-medium">Individual</span>
                      )}
                    </td>

                    {/* Questionnaire Responses */}
                    <td className="py-3.5 px-4">
                      {reg.answers && reg.answers.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-sunken text-ink border border-edge">
                          {reg.answers.length} {reg.answers.length === 1 ? 'answer' : 'answers'}
                        </span>
                      ) : (
                        <span className="text-ink-disabled text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RegistrationStatusBadge status={reg.status} />
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-ink-muted font-mono whitespace-nowrap">
                      {new Date(reg.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectRegistration(reg)}
                          className="btn btn-secondary text-xs px-2.5 py-1 min-h-[34px] inline-flex items-center gap-1 cursor-pointer shadow-2xs hover:border-brand/40"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-ink-muted" />
                          <span>View</span>
                        </button>

                        {reg.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(reg.id, 'CONFIRMED')}
                              className="p-1.5 rounded-lg text-status-approved hover:bg-status-approved/10 border border-status-approved/20 cursor-pointer min-h-[34px] min-w-[34px] inline-flex items-center justify-center"
                              title="Approve registration"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(reg.id, 'REJECTED')}
                              className="p-1.5 rounded-lg text-status-rejected hover:bg-status-rejected/10 border border-status-rejected/20 cursor-pointer min-h-[34px] min-w-[34px] inline-flex items-center justify-center"
                              title="Reject registration"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-edge bg-surface-sunken flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
          <div>
            Showing <strong className="text-ink">{(page - 1) * limit + 1}</strong> to{' '}
            <strong className="text-ink">{Math.min(page * limit, totalRegistrations)}</strong> of{' '}
            <strong className="text-ink">{totalRegistrations}</strong> registrations
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn btn-secondary px-3 py-1.5 text-xs min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="font-mono px-2 font-semibold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary px-3 py-1.5 text-xs min-h-[34px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationTable;
