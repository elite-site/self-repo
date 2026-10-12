import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useAdminEnrollmentsQuery } from '../hooks/useAdminReports';
import { EnrollmentsTable } from '../components/EnrollmentsTable';

export const AdminCourseEnrollmentsPage: React.FC = () => {
  const { id: paramId, courseId: paramCourseId } = useParams<{ id?: string; courseId?: string }>();
  const courseId = paramId || paramCourseId || '';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminEnrollmentsQuery(courseId, {
    search: search.trim() || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-edge pb-4">
        <button type="button" onClick={() => navigate('/admin/learning')} className="btn btn-ghost p-1.5" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-heading font-bold text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" /> Course Enrollments
          </h1>
          <p className="text-xs text-ink-muted">View student enrollment status, source, and progress</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by student name or roll number..."
          className="input pl-9 text-sm"
          aria-label="Search enrollments"
        />
      </div>

      <EnrollmentsTable enrollments={data?.enrollments ?? []} loading={isLoading} />

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-edge pt-3">
          <span className="text-xs text-ink-muted">Page {page} of {data.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-50"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-50"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseEnrollmentsPage;
