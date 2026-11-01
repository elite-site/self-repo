import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Users,
  Video,
  CheckCircle,
  X,
} from 'lucide-react';
import { StudentsResponse, Student } from '@/types';
import { studentsApi } from '../api';
import { formatDateTime } from '@/shared/utils/formatDate';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

interface StudentsTableProps {
  activeEventId: string;
  onSelectStudent: (studentId: string) => void;
}

function formatTime(iso: string | null | undefined): string {
  return formatDateTime(iso);
}

function studentYearLabel(year: number): string {
  return ['', '1st', '2nd', '3rd', '4th'][year] || `${year}th`;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  activeEventId,
  onSelectStudent,
}) => {
  const [searchParams] = useSearchParams();

  const initialUploaded = searchParams.get('uploaded') || (searchParams.get('filter') === 'active' ? 'yes' : '');
  const initialYear = searchParams.get('year') || '';
  const initialSection = searchParams.get('section') || '';
  const initialSearch = searchParams.get('search') || '';

  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);
  const [sectionFilter, setSectionFilter] = useState<string>(initialSection);
  const [uploadedFilter, setUploadedFilter] = useState<string>(initialUploaded);

  useEffect(() => {
    const uploaded = searchParams.get('uploaded') || (searchParams.get('filter') === 'active' ? 'yes' : '');
    const year = searchParams.get('year') || '';
    const section = searchParams.get('section') || '';
    const q = searchParams.get('search') || '';

    setUploadedFilter(uploaded);
    setYearFilter(year);
    setSectionFilter(section);
    setSearch(q);
    setPage(1);
  }, [searchParams]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getStudents({
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
  const totalCount = data?.pagination?.total ?? 0;
  const currentTotal = data?.data.length ?? 0;
  const uploadPercentage = totalCount > 0 ? Math.round((uploadedCount / Math.max(1, currentTotal)) * 100) : 0;

  return (
    <div className="space-y-8 text-left animate-fade-in-up">
      {/* 1. TOP ASYMMETRICAL ROSTER HERO */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <Users size={13} className="shrink-0" />
                <span>Department Student Directory</span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                All students
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
                Roster imported from the department sheet, with introduction-video status and moderation response.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={loadStudents}
                className="btn btn-secondary min-h-[40px] inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw size={15} strokeWidth={1.75} className={loading ? 'animate-spin text-brand' : ''} aria-hidden="true" />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => window.open(studentsApi.getStudentsExportUrl(activeEventId), '_blank')}
                className="btn btn-primary min-h-[40px] inline-flex items-center gap-2 cursor-pointer shadow-xs"
                title="Download the full student roster as an Excel (.xlsx) file"
              >
                <FileSpreadsheet size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Export roster</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Total In Directory</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{totalCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Videos Uploaded</span>
              <span className="text-2xl font-bold text-status-approved tabular-nums">{uploadedCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Current Page</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{page} of {data?.pagination.totalPages || 1}</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Video size={13} />
                  Submission Turnout
                </span>
                <span className="text-xs font-bold text-brand-soft-text">
                  {uploadedCount} on page
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Introduction Video Tracking</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Track compliance across academic sections. Students with missing videos can be nudged via batch announcement.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-ink-secondary">Page Yield Ratio</span>
                  <span className="font-bold text-ink">{uploadPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface/60 overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-slower"
                    style={{ width: `${uploadPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Real-time academic sheet sync</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. UNIFIED MODERN SEARCH & FILTER BAR */}
      <div className="surface p-4 rounded-xl border border-edge shadow-xs flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 pr-8 text-sm min-h-[44px] w-full"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="select text-sm min-h-[44px] cursor-pointer"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="select text-sm min-h-[44px] cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={uploadedFilter}
            onChange={(e) => { setUploadedFilter(e.target.value); setPage(1); }}
            className="select text-sm min-h-[44px] cursor-pointer"
          >
            <option value="">All Uploads</option>
            <option value="yes">Has Video</option>
            <option value="no">No Video</option>
          </select>
        </div>
      </div>

      {/* 3. ROSTER TABLE (CRITICAL RULE: TABLE-RESPONSIVE CONTAINER-LEVEL SCROLLING) */}
      <div className="surface rounded-xl border border-edge shadow-xs overflow-hidden">
        {loading ? (
          <>
            <span className="sr-only" role="status">
              Loading the student roster
            </span>
            <div className="space-y-3 p-5" aria-busy="true">
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
          <div className="space-y-2 p-16 text-center">
            <p className="font-heading text-lg font-bold text-ink">No students match these filters</p>
            <p className="text-xs sm:text-sm text-ink-secondary">
              Try a different name, section, year or upload status.
            </p>
          </div>
        ) : (
          <div className="table-responsive max-h-[70vh] overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" aria-label="Students">
              <thead>
                <tr className="sticky top-0 z-raised border-b border-edge bg-surface-sunken text-xs font-semibold text-ink-secondary">
                  <th className="py-3.5 px-5" scope="col">Student</th>
                  <th className="py-3.5 px-4" scope="col">Roll Number</th>
                  <th className="py-3.5 px-4" scope="col">Year & Section</th>
                  <th className="py-3.5 px-4" scope="col">Upload Time</th>
                  <th className="py-3.5 px-4" scope="col">Video</th>
                  <th className="py-3.5 px-4" scope="col">Feedback</th>
                  <th className="py-3.5 px-5 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {data.data.map((student) => {
                  const hasVideo = student.hasUploaded;
                  const submittedAt = student.submission?.submittedAt;
                  const submissionStatus = student.submission?.status;

                  return (
                    <tr
                      key={student.id || student.rollNo}
                      onClick={() => handleView(student)}
                      className="hover:bg-brand-soft/40 cursor-pointer transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-bold text-xs shrink-0 border border-brand/20">
                            {student.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-semibold text-ink group-hover:text-brand transition-colors">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono text-xs text-ink-secondary">
                        {student.rollNo}
                      </td>

                      {/* Year & Section */}
                      <td className="py-3.5 px-4 text-xs text-ink-secondary whitespace-nowrap">
                        {studentYearLabel(student.year)} Year · Sec {student.section}
                      </td>

                      {/* Upload Time */}
                      <td className="py-3.5 px-4 text-xs text-ink-muted whitespace-nowrap">
                        {submittedAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} className="shrink-0" />
                            {formatTime(submittedAt)}
                          </span>
                        ) : (
                          <span className="text-ink-disabled">—</span>
                        )}
                      </td>

                      {/* Video Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasVideo ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-approved/10 text-status-approved border border-status-approved/20">
                            <Clapperboard size={12} />
                            Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-sunken text-ink-muted border border-edge">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Status / Feedback */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {submissionStatus ? (
                          <span
                            className={`badge ${
                              submissionStatus === 'APPROVED'
                                ? 'badge-approved'
                                : submissionStatus === 'CHANGES_REQUESTED'
                                ? 'badge-pending'
                                : submissionStatus === 'REJECTED'
                                ? 'badge-rejected'
                                : 'badge-review'
                            }`}
                          >
                            {submissionStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(student);
                          }}
                          className="btn btn-secondary text-xs py-1.5 px-3 min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer group-hover:border-brand/40 shadow-2xs"
                        >
                          <Eye size={13} className="text-ink-muted group-hover:text-brand" />
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

        {/* 4. CLEAN PAGINATION CONTROLS */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-edge bg-surface-sunken flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
            <div>
              Showing <strong className="text-ink">{(page - 1) * 25 + 1}</strong> to{' '}
              <strong className="text-ink">{Math.min(page * 25, data.pagination.total)}</strong> of{' '}
              <strong className="text-ink">{data.pagination.total}</strong> students
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary px-3 py-1.5 text-xs min-h-[36px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="font-mono px-2 font-semibold">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="btn btn-secondary px-3 py-1.5 text-xs min-h-[36px] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsTable;
