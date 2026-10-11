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
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-edge bg-surface-sunken text-label-sm font-semibold text-ink-secondary">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Artifact type</th>
              <th className="py-3 px-4">Title / summary</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
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
                      <div className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-body-sm shrink-0 border border-brand/20">
                        {item.studentName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate group-hover:text-brand transition-colors">
                          {item.studentName}
                        </div>
                        <div className="text-xs font-mono text-ink-muted">
                          {item.studentRoll} {academicInfo && `• ${academicInfo}`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Artifact Type Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <ItemTypeBadge itemType={item.itemType} />
                  </td>

                  {/* Title & Description */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
                      {item.title || 'Untitled Submission'}
                    </div>
                    {item.description && (
                      <div className="text-xs text-ink-muted truncate max-w-xs sm:max-w-md">
                        {item.description}
                      </div>
                    )}
                    {item.technologies && item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.technologies.slice(0, 3).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 rounded bg-surface-sunken text-ink-muted border border-edge"
                          >
                            {tech}
                          </span>
                        ))}
                        {item.technologies.length > 3 && (
                          <span className="text-xs text-ink-muted">
                            +{item.technologies.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-ink-muted text-label-sm">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  {/* Review Button */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item.id);
                      }}
                      className="btn btn-secondary text-body-sm py-1.5 px-3 inline-flex items-center gap-1 group-hover:btn-primary transition-all"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {filteredCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-edge bg-surface-sunken">
          <div className="text-body-sm text-ink-muted">
            Showing <span className="font-semibold text-ink">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-ink">{Math.min(currentPage * pageSize, filteredCount)}</span> of{' '}
            <span className="font-semibold text-ink">{filteredCount}</span> submissions
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="btn btn-ghost text-body-sm p-1.5 sm:px-3 sm:py-1.5 inline-flex items-center gap-1"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-label-sm font-semibold text-ink px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="btn btn-ghost text-body-sm p-1.5 sm:px-3 sm:py-1.5 inline-flex items-center gap-1"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
