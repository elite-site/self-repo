import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Film,
  ExternalLink,
} from 'lucide-react';
import { Student, StudentsResponse, SubmissionRating } from '../types';
import { adminApi } from '../services/api';

interface StudentsViewProps {
  activeEventId: string;
  onNavigateToSubmissions?: () => void;
}

const ratingDotClass: Record<SubmissionRating, string> = {
  GOOD: 'bg-emerald-500',
  AVERAGE: 'bg-amber-400',
  POOR: 'bg-red-500',
};

export const StudentsView: React.FC<StudentsViewProps> = ({
  activeEventId,
  onNavigateToSubmissions,
}) => {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      });
      setData(res);
    } catch (err) {
      console.error('Error loading students', err);
    } finally {
      setLoading(false);
    }
  }, [activeEventId, page, search, yearFilter, sectionFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStudents();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Please upload an Excel (.xlsx) or CSV file.');
      return;
    }

    setImporting(true);
    try {
      const res = await adminApi.importStudents(file);
      alert(res.message);
      loadStudents();
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Could not process file'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteStudent = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${student.name} (${student.rollNo}) from the roster?`)) return;

    setDeletingId(student.id);
    try {
      const res = await adminApi.deleteStudent(student.id);
      if (res.success) loadStudents();
    } catch (err: any) {
      alert(`Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(adminApi.getStudentTemplateUrl(), '_blank');
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            Master Roster
          </div>
          <h1 className="text-3xl font-extrabold text-elite-black font-display tracking-tight mt-1">
            STUDENTS
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-normal">
            Import the student list. Students enter their roll number on the public form and their details are auto-filled.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigateToSubmissions && (
            <button
              onClick={onNavigateToSubmissions}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>View Submissions</span>
            </button>
          )}

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>

          <label
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-elite-red hover:bg-elite-darkred text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{importing ? 'Importing...' : 'Import Excel / CSV'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="hidden"
              disabled={importing}
            />
          </label>

          <button
            onClick={loadStudents}
            className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-sm cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-elite-red' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, roll number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#fafafa] border border-neutral-200 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-elite-red transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className="bg-[#fafafa] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="bg-[#fafafa] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
      </div>

      {/* 3. STUDENTS TABLE */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading students...</span>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-800">No students in the roster</p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Import a spreadsheet of students using the "Import Excel / CSV" button above.
              Download the template first to see the expected format.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fafafa] border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Section & Year</th>
                  <th className="py-3 px-4">Video</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.data.map((student) => {
                  const dotClass = student.rating ? ratingDotClass[student.rating] : undefined;
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#fcfcfc] transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900">{student.name}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{student.email}</div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-700">
                        {student.rollNo}
                      </td>

                      {/* Section & Year */}
                      <td className="py-3.5 px-4 text-neutral-700">
                        <span className="font-semibold text-neutral-900">{student.branch}-{student.section}</span>
                        <span className="text-neutral-400 mx-1.5">•</span>
                        <span>Year {student.year}</span>
                      </td>

                      {/* Video */}
                      <td className="py-3.5 px-4">
                        {student.hasVideo ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            UPLOADED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-neutral-500 text-[11px] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-neutral-300 inline-block" />
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4">
                        {student.rating ? (
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                            <span className={`w-2 h-2 rounded-full inline-block ${dotClass}`} />
                            {student.rating}
                          </div>
                        ) : student.hasVideo ? (
                          <span className="text-[11px] text-neutral-400 font-semibold">Not rated</span>
                        ) : (
                          <span className="text-[11px] text-neutral-300">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {student.submissionId && (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); onNavigateToSubmissions?.(); }}
                              title="View submission"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          <button
                            disabled={deletingId === student.id}
                            onClick={(e) => handleDeleteStudent(e, student)}
                            title="Remove from roster"
                            className="p-1 bg-red-50 hover:bg-red-100 text-elite-red border border-red-200 rounded transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className={`w-3 h-3 ${deletingId === student.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
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
          <div className="p-4 bg-[#fafafa] border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
            <div>
              Page <span className="font-bold text-neutral-900">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-neutral-900">{data.pagination.totalPages}</span> ({data.pagination.total} students)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer"
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