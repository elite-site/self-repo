import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Clapperboard,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentsResponse, Student } from '../types';
import { adminApi } from '../services/api';

interface StudentsTableProps {
  activeEventId: string;
  onSelectStudent: (studentId: string) => void;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return 'To be announced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'To be announced';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

function studentYearLabel(year: number): string {
  return ['', '1st', '2nd', '3rd', '4th'][year] || `${year}th`;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  activeEventId,
  onSelectStudent,
}) => {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [uploadedFilter, setUploadedFilter] = useState<string>('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStudents({
        eventId: activeEventId,
        page,
        limit: 25,
        search: search.trim() || undefined,
        year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        section: sectionFilter || undefined,
        uploaded: uploadedFilter || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Error loading students', err);
    } finally {
      setLoading(false);
    }
  }, [activeEventId, page, search, yearFilter, sectionFilter, uploadedFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStudents();
  };

  const handleView = (student: Student) => {
    onSelectStudent(student.id || student.rollNo);
  };

  const uploadedCount = data?.data.filter((s) => s.hasUploaded).length ?? 0;

  return (
    <div className="space-y-6 text-left page-enter">
      {/* 1. HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <h1 className="font-heading text-headline-lg text-ink">All students</h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Roster imported from the department sheet, with introduction-video status and moderation response.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudents}
            className="btn btn-secondary self-start sm:self-auto"
          >
            <RefreshCw size={15} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => window.open(adminApi.getStudentsExportUrl(activeEventId), '_blank')}
            className="btn bg-status-solid-approved text-on-primary self-start sm:self-auto"
            title="Download the full student roster as an Excel (.xlsx) file"
          >
            <FileSpreadsheet size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>Export roster</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="surface p-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={uploadedFilter}
            onChange={(e) => { setUploadedFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Uploads</option>
            <option value="yes">Has Video</option>
            <option value="no">No Video</option>
          </select>
        </div>
      </div>

      {/* 3. ROSTER TABLE */}
      <div className="surface overflow-hidden">
        {loading ? (
          <>
            <span className="sr-only" role="status">
              Loading the student roster
            </span>
            <div className="space-y-3 p-4" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 flex-1" />
                </div>
              ))}
            </div>
          </>
        ) : !data || data.data.length === 0 ? (
          <div className="space-y-1 p-16 text-center">
            <p className="font-heading text-headline-sm text-ink">No students match these filters</p>
            <p className="text-body-sm text-ink-secondary">
              Try a different name, section, year or upload status.
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            {/* A plain table, not `role="grid"`: a grid is a promise of
                arrow-key cell navigation, which this does not implement. */}
            <table className="w-full border-collapse text-left text-body-sm" aria-label="Students">
              <thead>
                <tr className="sticky top-0 z-raised border-b border-edge bg-surface-inset text-label-sm font-semibold text-ink-secondary">
                  <th className="py-3.5 px-5" scope="col">Student</th>
                  <th className="py-3.5 px-4" scope="col">Roll Number</th>
                  <th className="py-3.5 px-4" scope="col">Year & Section</th>
                  <th className="py-3.5 px-4" scope="col">Upload Time</th>
                  <th className="py-3.5 px-4" scope="col">Response</th>
                  <th className="py-3.5 px-5 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {data.data.map((student) => {
                  const reviewed = student.submission?.reviewedAt != null && (
                    Boolean(student.submission.reviewText) ||
                    (student.submission.reviewPros?.length ?? 0) > 0 ||
                    (student.submission.reviewCons?.length ?? 0) > 0
                  );
                  return (
                    <tr
                      key={student.id}
                      onClick={() => handleView(student)}
                      className="cursor-pointer transition-colors duration-fast hover:bg-surface-sunken"
                    >
                      {/* The name is a real button so the row is reachable by
                          keyboard; the row click stays as a pointer shortcut. */}
                      <th scope="row" className="px-5 py-3.5 text-left font-normal">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(student);
                          }}
                          className="cursor-pointer text-left font-heading text-label-lg font-semibold text-ink hover:text-ink-brand"
                        >
                          {student.name}
                        </button>
                        <span className="mt-0.5 block text-label-md text-ink-secondary">
                          {studentYearLabel(student.year)} year · Section {student.section} · {student.branch}
                        </span>
                      </th>

                      <td className="py-3.5 px-4 font-semibold text-ink-secondary">
                        {student.rollNo}
                      </td>

                      <td className="py-3.5 px-4 text-ink-secondary">
                        <span className="font-semibold text-ink">{studentYearLabel(student.year)}</span>
                        <span className="text-ink-muted mx-1.5">•</span>
                        <span>Sec {student.section}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.submission?.submittedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-status-approved text-xs font-semibold">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.submission.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-xs font-semibold">Not submitted</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {reviewed ? (
                          <span className="badge badge-approved">Responded</span>
                        ) : student.submission ? (
                          <span className="badge badge-pending">Pending review</span>
                        ) : (
                          <span className="badge badge-draft">No video</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleView(student); }}
                          className="btn btn-secondary px-2.5"
                          aria-label={`View ${student.name}`}
                        >
                          <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINATION CONTROLS */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 bg-surface-inset border-t border-edge flex items-center justify-between text-xs text-ink-secondary">
            <div className="flex items-center gap-3">
              <span>
                Showing page <span className="font-bold text-ink">{data.pagination.page}</span> of{' '}
                <span className="font-bold text-ink">{data.pagination.totalPages}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full badge badge-approved">
                <Clapperboard className="w-3 h-3" />
                {uploadedCount} with video
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary p-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                className="btn btn-secondary p-1.5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
