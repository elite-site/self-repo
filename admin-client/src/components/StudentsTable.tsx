import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Clapperboard,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentsResponse, Student } from '../types';
import { adminApi } from '../services/api';
import { BrandedLoading } from './BrandedLoading';

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
          <div className="text-[11px] font-mono font-bold tracking-widest text-ink-brand uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Student Roster</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight mt-1">
            ALL STUDENTS
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-normal">
            Full IT-Department roster imported from the Excel sheet, with upload status and responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudents}
            className="inline-flex items-center gap-2 px-3.5 py-2 btn btn-secondary self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ink-brand' : ''}`} />
            <span>Refresh Roster</span>
          </button>

          <button
            onClick={() => window.open(adminApi.getStudentsExportUrl(activeEventId), '_blank')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-status-approved hover:bg-status-approved/90 text-on-primary text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
            title="Download the full student roster as an Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download All Students (Excel)</span>
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
          <div className="p-12">
            <BrandedLoading fullScreen={false} message="Loading Student Roster..." />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-ink font-heading">No students found</p>
            <p className="text-xs text-ink-secondary">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" role="grid" aria-label="Students">
              <thead>
                <tr className="bg-surface-inset border-b border-edge text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
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
                      className="hover:bg-surface-canvas transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-ink group-hover:text-ink-brand transition-colors">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {studentYearLabel(student.year)} Year • Section {student.section} • {student.branch}
                        </div>
                      </td>

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
                          <span className="inline-flex items-center gap-1.5 text-status-approved text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.submission.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-[11px] font-semibold">NOT SUBMITTED</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {reviewed ? (
                          <span className="badge badge-approved">
                            <span className="w-2 h-2 rounded-full bg-status-approved inline-block" />
                            <span className="text-[11px] font-bold tracking-wide uppercase">Responded</span>
                          </span>
                        ) : student.submission ? (
                          <span className="badge badge-pending">
                            <span className="w-2 h-2 rounded-full bg-status-pending inline-block" />
                            Pending review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-ink-muted text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-surface-inset inline-block" />
                            Awaiting upload
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleView(student); }}
                          className="btn btn-secondary"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
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
                onClick={() => setPage((p) => p + 1)}
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
