import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { UnifiedModerationItem } from '../types';
import { StatusBadge, ItemTypeBadge } from './ModerationPreview';

interface ModerationQueueTableProps {
  paginatedItems: UnifiedModerationItem[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onSelect: (id: string) => void;
  onPageChange: (newPage: number) => void;
}

export const ModerationQueueTable: React.FC<ModerationQueueTableProps> = ({
  paginatedItems,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  onSelect,
  onPageChange,
}) => {
  return (
    <div className="surface border border-edge rounded-xl overflow-hidden shadow-xs">
      <div className="table-responsive">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge bg-surface-sunken text-xs font-semibold text-ink-secondary">
              <th className="py-3.5 px-4">Student</th>
              <th className="py-3.5 px-4">Artifact type</th>
              <th className="py-3.5 px-4">Title / summary</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {paginatedItems.map((item) => {
              const academicInfo = [
                item.studentBranch || 'IT',
                item.studentYear ? `Year ${item.studentYear}` : null,
                item.studentSection ? `Sec ${item.studentSection}` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="hover:bg-brand-soft/40 cursor-pointer transition-colors group"
                >
                  {/* Student Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-bold text-sm shrink-0 border border-brand/20">
                        {item.studentName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate group-hover:text-brand transition-colors">
                          {item.studentName || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-ink-muted flex items-center gap-1.5 font-mono">
                          <span>{item.studentRoll || '—'}</span>
                          {academicInfo && <span>· {academicInfo}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Artifact Type */}
                  <td className="py-3.5 px-4">
                    <ItemTypeBadge type={item.type} />
                  </td>

                  {/* Title / Summary */}
                  <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                    <div className="font-medium text-ink truncate">
                      {item.title || 'Untitled submission'}
                    </div>
                    {item.summary && (
                      <div className="text-xs text-ink-muted truncate mt-0.5">
                        {item.summary}
                      </div>
                    )}
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-4 text-xs text-ink-muted whitespace-nowrap">
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item.id);
                      }}
                      className="btn btn-secondary text-xs py-1.5 px-3 min-h-[36px] inline-flex items-center gap-1 cursor-pointer group-hover:border-brand/40 shadow-2xs"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-muted group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-edge bg-surface-sunken flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
          <div>
            Showing <strong className="text-ink">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-ink">{Math.min(currentPage * pageSize, filteredCount)}</strong> of{' '}
            <strong className="text-ink">{filteredCount}</strong> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="btn btn-secondary px-2.5 py-1 text-xs min-h-[36px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono px-2 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="btn btn-secondary px-2.5 py-1 text-xs min-h-[36px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
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

export default ModerationQueueTable;
