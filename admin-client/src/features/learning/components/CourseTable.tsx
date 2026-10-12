import React from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, BarChart2, Users, Trash2 } from 'lucide-react';
import { AdminCourseItem, CourseStatus } from '../types';

export interface CourseTableProps {
  courses: AdminCourseItem[];
  search: string;
  onSearchChange: (search: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (course: AdminCourseItem) => void;
  onReports: (course: AdminCourseItem) => void;
  onEnrollments: (course: AdminCourseItem) => void;
  onDelete: (course: AdminCourseItem) => void;
}

const statusBadge = (s: CourseStatus) => {
  if (s === 'PUBLISHED') return <span className="badge badge-approved">Published</span>;
  if (s === 'ARCHIVED') return <span className="badge badge-rejected">Archived</span>;
  return <span className="badge badge-draft">Draft</span>;
};

export const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onReports,
  onEnrollments,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search courses..."
          className="input pl-9 text-sm"
          aria-label="Search courses"
        />
      </div>

      <div className="surface overflow-hidden rounded-xl border border-edge">
        <div className="table-responsive">
          <table className="w-full text-sm" role="table">
            <thead className="bg-surface-inset border-b border-edge">
              <tr>
                {['Title', 'Category', 'Level', 'Status', 'Enrolment', 'Lessons', 'Enrolled', 'Actions'].map((h) => (
                  <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No courses found.</td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <div>{c.title || 'Untitled Course'}</div>
                      <span className="text-xs text-ink-muted">{c.slug || ''}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{c.category || '—'}</td>
                    <td className="px-4 py-3 text-ink-secondary text-xs uppercase">{c.level || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-xs text-ink-secondary">{c.enrolment === 'ASSIGNED_ONLY' ? 'Assigned' : 'Open'}</td>
                    <td className="px-4 py-3 text-ink font-medium">{c.lessonCount ?? 0}</td>
                    <td className="px-4 py-3 text-ink font-medium">{c.enrollmentCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5" role="group" aria-label={`Actions for ${c.title}`}>
                        <button type="button" onClick={() => onEdit(c)} className="btn btn-ghost px-2 py-1 text-xs cursor-pointer inline-flex items-center gap-1" aria-label={`Edit ${c.title}`}>
                          <Edit3 className="w-3.5 h-3.5" /><span>Edit</span>
                        </button>
                        <button type="button" onClick={() => onReports(c)} className="btn btn-ghost px-2 py-1 text-xs cursor-pointer inline-flex items-center gap-1" aria-label={`Reports for ${c.title}`}>
                          <BarChart2 className="w-3.5 h-3.5" /><span>Reports</span>
                        </button>
                        <button type="button" onClick={() => onEnrollments(c)} className="btn btn-ghost px-2 py-1 text-xs cursor-pointer inline-flex items-center gap-1" aria-label={`Enrollments for ${c.title}`}>
                          <Users className="w-3.5 h-3.5" /><span>Enrollments</span>
                        </button>
                        <button type="button" onClick={() => onDelete(c)} className="btn btn-ghost px-2 py-1 text-xs cursor-pointer text-status-rejected hover:bg-status-bg-rejected inline-flex items-center gap-1" aria-label={`Delete ${c.title}`}>
                          <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-edge px-4 py-3 bg-surface-inset">
            <span className="text-xs text-ink-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-50" aria-label="Previous Page">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-50" aria-label="Next Page">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
