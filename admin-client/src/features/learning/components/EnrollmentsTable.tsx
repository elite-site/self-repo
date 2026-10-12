import React from 'react';
import { formatDate } from '@/shared/utils/formatDate';
import { AdminEnrollmentItem, EnrollmentSource, EnrollmentStatus } from '../types';

export interface EnrollmentsTableProps {
  enrollments: AdminEnrollmentItem[];
  loading?: boolean;
}

const sourceBadge = (source: EnrollmentSource) => {
  if (source === 'ASSIGNED') return <span className="badge badge-pending">Assigned</span>;
  return <span className="badge badge-draft">Self</span>;
};

const statusBadge = (status: EnrollmentStatus) => {
  if (status === 'COMPLETED') return <span className="badge badge-approved">Completed</span>;
  return <span className="badge badge-draft">Active</span>;
};

export const EnrollmentsTable: React.FC<EnrollmentsTableProps> = ({ enrollments, loading = false }) => {
  return (
    <div className="surface overflow-hidden rounded-xl border border-edge">
      <div className="table-responsive">
        <table className="w-full text-sm" role="table">
          <thead className="bg-surface-inset border-b border-edge">
            <tr>
              {['Student', 'Roll No', 'Email', 'Source', 'Progress', 'Status', 'Enrolled Date', 'Completed Date'].map((h) => (
                <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                  Loading enrollments...
                </td>
              </tr>
            ) : enrollments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                  No enrollments found.
                </td>
              </tr>
            ) : (
              enrollments.map((item) => (
                <tr key={item.id} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-4 py-3 font-semibold text-ink">{item.studentName}</td>
                  <td className="px-4 py-3 text-ink-secondary font-mono text-xs">{item.studentRollNo}</td>
                  <td className="px-4 py-3 text-ink-secondary text-xs">{item.studentEmail || '—'}</td>
                  <td className="px-4 py-3">{sourceBadge(item.source)}</td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-surface-inset rounded-full h-2 overflow-hidden border border-edge">
                        <div
                          className="bg-brand h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-ink">{Math.round(item.progressPercent)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary">{formatDate(item.enrolledAt)}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary">{formatDate(item.completedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
