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
import { BrandedLoading } from './BrandedLoading';

interface StudentsTableProps {
  activeEventId: string;
  onSelectSubmission: (submission: Submission) => void;
  onSelectStudent?: (studentId: string) => void;
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

  const handleOpen = (student: Student) => {
    const sub = toSubmission(student);
    if (sub) {
      onSelectSubmission(sub);
    } else {
      alert(`${student.name} (${student.rollNo}) has not uploaded an introduction video yet.`);
    }
  };

  const handleView = (student: Student) => {
    if (onSelectStudent) {
      onSelectStudent(student.id || student.rollNo);
    } else {
      handleOpen(student);
    }
  };

  const uploadedCount = data?.data.filter((s) => s.hasUploaded).length ?? 0;

  return (
    <div className="space-y-6 text-left">
      {/* 1. HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E7F2] dark:border-[#252B35] pb-5">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-widest text-[#E11D48] dark:text-[#F43F5E] uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Student Roster</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white font-heading tracking-tight mt-1">
            ALL STUDENTS
          </h1>
          <p className="text-xs text-[#475569] dark:text-[#9BA3AF] mt-1 font-normal">
            Full IT-Department roster imported from the Excel sheet, with upload status and responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudents}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#11151C] hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] text-[#475569] dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#4F46E5]' : ''}`} />
            <span>Refresh Roster</span>
          </button>

          <button
            onClick={() => window.open(adminApi.getStudentsExportUrl(activeEventId), '_blank')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
            title="Download the full student roster as an Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download All Students (Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg pl-9 pr-4 py-2 text-xs text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#9BA3AF] font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-neutral-200 focus:outline-none focus:border-[#4F46E5] cursor-pointer"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-neutral-200 focus:outline-none focus:border-[#4F46E5] cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={uploadedFilter}
            onChange={(e) => { setUploadedFilter(e.target.value); setPage(1); }}
            className="bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-neutral-200 focus:outline-none focus:border-[#4F46E5] cursor-pointer"
          >
            <option value="">All Uploads</option>
            <option value="yes">Has Video</option>
            <option value="no">No Video</option>
          </select>
        </div>
      </div>

      {/* 3. ROSTER TABLE */}
      <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="p-12">
            <BrandedLoading fullScreen={false} message="Loading Student Roster..." />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-neutral-200 font-heading">No students found</p>
            <p className="text-xs text-[#475569] dark:text-[#9BA3AF]">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F8FC] dark:bg-[#0D1117] border-b border-[#E4E7F2] dark:border-[#252B35] text-[11px] font-bold text-[#475569] dark:text-[#9BA3AF] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Student</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Year & Section</th>
                  <th className="py-3.5 px-4">Upload Time</th>
                  <th className="py-3.5 px-4">Response</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7F2] dark:divide-[#252B35]">
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
                      className="hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                          {studentYearLabel(student.year)} Year • Section {student.section} • {student.branch}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#475569] dark:text-neutral-300">
                        {student.rollNo}
                      </td>

                      <td className="py-3.5 px-4 text-[#475569] dark:text-neutral-300">
                        <span className="font-semibold text-[#0F172A] dark:text-white">{studentYearLabel(student.year)}</span>
                        <span className="text-[#94A3B8] mx-1.5">•</span>
                        <span>Sec {student.section}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.submission?.submittedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.submission.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] text-[11px] font-semibold">NOT SUBMITTED</span>
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
                          <span className="inline-flex items-center gap-1.5 text-[#94A3B8] text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 inline-block" />
                            Awaiting upload
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleView(student); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2FF] dark:bg-[#4F46E5]/20 text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#4F46E5] hover:text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
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
          <div className="p-4 bg-[#F7F8FC] dark:bg-[#0D1117] border-t border-[#E4E7F2] dark:border-[#252B35] flex items-center justify-between text-xs text-[#475569] dark:text-[#9BA3AF]">
            <div className="flex items-center gap-3">
              <span>
                Showing page <span className="font-bold text-[#0F172A] dark:text-white">{data.pagination.page}</span> of{' '}
                <span className="font-bold text-[#0F172A] dark:text-white">{data.pagination.totalPages}</span>
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
                className="p-1.5 rounded-lg border border-[#E4E7F2] dark:border-[#252B35] bg-white dark:bg-[#11151C] hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] text-[#475569] dark:text-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-[#E4E7F2] dark:border-[#252B35] bg-white dark:bg-[#11151C] hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] text-[#475569] dark:text-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
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