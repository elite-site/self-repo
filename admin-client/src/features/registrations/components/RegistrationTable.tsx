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
    <div className="bg-surface rounded-lg border border-edge overflow-hidden shadow-xs">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
          <span className="text-xs text-ink-muted font-medium">Loading registrations…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <AlertCircle className="w-10 h-10 text-status-rejected" />
          <h3 className="font-bold text-sm text-ink">Failed to load registrations</h3>
          <p className="text-xs text-ink-muted max-w-sm">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-status-solid-rejected text-on-primary text-xs font-bold rounded-xl hover:bg-brand cursor-pointer"
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
              : 'No students have registered for this event yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="px-3.5 py-1.5 text-xs font-bold text-status-rejected border border-edge rounded-lg hover:bg-status-bg-rejected cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-sunken border-b border-edge text-ink-muted font-bold">
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
                  <tr key={reg.id} className="hover:bg-surface-sunken/80 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-status-bg-rejected text-status-rejected font-semibold flex items-center justify-center text-xs shrink-0 border border-edge">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-ink truncate max-w-[180px]">
                            {reg.student.name}
                          </div>
                          <div className="text-xs font-mono font-semibold text-ink-muted">
                            {reg.student.rollNo}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Year & Section */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-surface-sunken text-ink-secondary">
                        Y{reg.student.year} · Sec {reg.student.section}
                      </span>
                    </td>

                    {/* Event */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink truncate max-w-[150px]">
                        {reg.event.name}
                      </div>
                      <div className="text-xs text-ink-muted">{reg.event.year}</div>
                    </td>

                    {/* Participation (Team or Solo) */}
                    <td className="py-3.5 px-4">
                      {reg.team ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-status-bg-review text-status-review border border-edge">
                          <Users className="w-3.5 h-3.5 text-status-review" />
                          <span className="truncate max-w-[120px]">{reg.team.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface-sunken text-ink-muted">
                          Solo
                        </span>
                      )}
                    </td>

                    {/* Form Answers */}
                    <td className="py-3.5 px-4">
                      {reg.answers && reg.answers.length > 0 ? (
                        <button
                          onClick={() => onSelectRegistration(reg)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-status-approved hover:underline cursor-pointer"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>{reg.answers.length} answers</span>
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">None</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <RegistrationStatusBadge status={reg.status} />
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 text-ink-muted whitespace-nowrap">
                      {new Date(reg.registeredAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSelectRegistration(reg)}
                          title="View Registration Details"
                          className="p-1.5 hover:bg-surface-sunken text-ink-secondary rounded-lg cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {reg.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => onUpdateStatus(reg.id, 'CONFIRMED')}
                            title="Approve / Confirm"
                            className="p-1.5 hover:bg-status-bg-approved text-status-approved rounded-lg cursor-pointer transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {reg.status !== 'WAITLISTED' && (
                          <button
                            onClick={() => onUpdateStatus(reg.id, 'WAITLISTED')}
                            title="Move to Waitlist"
                            className="p-1.5 hover:bg-status-bg-approved text-status-approved rounded-lg cursor-pointer transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}

                        {reg.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onUpdateStatus(reg.id, 'CANCELLED')}
                            title="Cancel Registration"
                            className="p-1.5 hover:bg-status-bg-rejected text-status-rejected rounded-lg cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
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

      {/* Pagination bar */}
      {!loading && registrations.length > 0 && (
        <div className="p-4 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <div>
            Showing <span className="font-bold text-ink">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-bold text-ink">{Math.min(page * limit, totalRegistrations)}</span> of{' '}
            <span className="font-bold text-ink">{totalRegistrations}</span> registrations
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-edge rounded-lg disabled:opacity-40 hover:bg-surface-sunken font-semibold cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-edge rounded-lg disabled:opacity-40 hover:bg-surface-sunken font-semibold cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
