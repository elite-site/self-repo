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
import { StudentsResponse, Student, Submission } from '../types';
import { adminApi } from '../services/api';

interface StudentsTableProps {
  activeEventId: string;
  onSelectSubmission: (submission: Submission) => void;
}

function toSubmission(student: Student): Submission | null {
  if (!student.submission) return null;
  return {
    id: student.submission.id,
    name: student.name,
    rollNo: student.rollNo,
    section: student.section,
    branch: student.branch,
    year: student.year,
    email: `${student.rollNo.toLowerCase()}@itassociations.local`,
    driveFolderPath: '',
    status: student.submission.status,
    submittedAt: student.submission.submittedAt,
    videoDriveId: student.submission.videoDriveId,
    reviewText: student.submission.reviewText,
    reviewPros: student.submission.reviewPros,
    reviewCons: student.submission.reviewCons,
    reviewedAt: student.submission.reviewedAt,
  };
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

function studentYearLabel(year: number): string {
  return ['', '1st', '2nd', '3rd', '4th'][year] || `${year}th`;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  activeEventId,
  onSelectSubmission,
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

  const handleOpen = (student: Student) => {
    const sub = toSubmission(student);
    if (sub) {
      onSelectSubmission(sub);
    } else {
      alert(`${student.name} (${student.rollNo}) has not uploaded an introduction video yet.`);
    }
  };

  const uploadedCount = data?.data.filter((s) => s.hasUploaded).length ?? 0;

  return (
    <div className="space-y-6 text-left">
      {/* 1. HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Student Roster
          </div>
          <h1 className="text-3xl font-extrabold text-elite-black dark:text-white font-display tracking-tight mt-1">
            ALL STUDENTS
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-normal">
            Full IT-Department roster imported from the Excel sheet, with upload status and responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudents}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-elite-red' : ''}`} />
            <span>Refresh Roster</span>
          </button>

          <button
            onClick={() => window.open(adminApi.getStudentsExportUrl(activeEventId), '_blank')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
            title="Download the full student roster, with all submission and review information, as an Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download All Students (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#fafafa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-elite-red transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="bg-[#fafafa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="bg-[#fafafa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={uploadedFilter}
            onChange={(e) => { setUploadedFilter(e.target.value); setPage(1); }}
            className="bg-[#fafafa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Uploads</option>
            <option value="yes">Has Video</option>
            <option value="no">No Video</option>
          </select>
        </div>
      </div>

      {/* 3. ROSTER TABLE */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading student roster...</span>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No students found</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fafafa] dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Year & Section</th>
                  <th className="py-3 px-4">Upload Time</th>
                  <th className="py-3 px-4">Response</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.data.map((student) => {
                  const reviewed = student.submission?.reviewedAt != null && (
                    Boolean(student.submission.reviewText) ||
                    (student.submission.reviewPros?.length ?? 0) > 0 ||
                    (student.submission.reviewCons?.length ?? 0) > 0
                  );
                  return (
                    <tr
                      key={student.id}
                      onClick={() => handleOpen(student)}
                      className="hover:bg-[#fcfcfc] dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900 dark:text-white group-hover:text-elite-red transition-colors">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {studentYearLabel(student.year)} Year • Section {student.section} • {student.branch}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                        {student.rollNo}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-900 dark:text-white">{studentYearLabel(student.year)}</span>
                        <span className="text-neutral-400 dark:text-neutral-600 mx-1.5">•</span>
                        <span>Sec {student.section}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.submission?.submittedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.submission.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500 text-[11px] font-semibold">NOT SUBMITTED</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {reviewed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span className="text-[11px] font-bold tracking-wide uppercase">Responded</span>
                          </span>
                        ) : student.submission ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                            Pending review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 inline-block" />
                            Awaiting upload
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpen(student); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 group-hover:bg-elite-red group-hover:text-white rounded text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
          <div className="p-4 bg-[#fafafa] dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-3">
              <span>
                Showing page <span className="font-bold text-neutral-900 dark:text-white">{data.pagination.page}</span> of{' '}
                <span className="font-bold text-neutral-900 dark:text-white">{data.pagination.totalPages}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-bold">
                <Clapperboard className="w-3 h-3" />
                {uploadedCount} with video
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
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