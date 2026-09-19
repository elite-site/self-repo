import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { Submission, SubmissionsResponse, SubmissionRating } from '../types';
import { adminApi } from '../services/api';

interface SubmissionsTableProps {
  activeEventId: string;
  onSelectSubmission: (submission: Submission) => void;
  onRefreshStats?: () => void;
}

const ratingMeta: Record<SubmissionRating, { dot: string; text: string; label: string; badge: string }> = {
  GOOD: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    label: 'Good',
    badge: 'bg-emerald-50 border-emerald-200',
  },
  AVERAGE: {
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    label: 'Average',
    badge: 'bg-amber-50 border-amber-200',
  },
  POOR: {
    dot: 'bg-red-500',
    text: 'text-elite-red',
    label: 'Poor',
    badge: 'bg-red-50 border-red-200',
  },
};

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  activeEventId,
  onSelectSubmission,
  onRefreshStats,
}) => {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSubmissions({
        eventId: activeEventId,
        page,
        limit: 15,
        search: search.trim() || undefined,
        year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        section: sectionFilter || undefined,
        rating: ratingFilter || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Error loading submissions', err);
    } finally {
      setLoading(false);
    }
  }, [activeEventId, page, search, yearFilter, sectionFilter, ratingFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSubmissions();
  };

  const handleRowDelete = async (e: React.MouseEvent, sub: Submission) => {
    e.stopPropagation();
    const confirmText = `Delete submission for ${sub.name} (${sub.rollNo})?\n\nThis will purge all associated files and remove the record permanently.`;
    if (!window.confirm(confirmText)) return;

    setDeletingId(sub.id);
    try {
      const res = await adminApi.deleteSubmission(sub.id);
      if (res.success) {
        if (onRefreshStats) onRefreshStats();
        loadSubmissions();
      }
    } catch (err: any) {
      alert(`Failed to delete submission: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportExcel = () => {
    const url = adminApi.getExcelExportUrl(activeEventId);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. HEADER & REFRESH / EXPORT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            Submitted Introductions
          </div>
          <h1 className="text-3xl font-extrabold text-elite-black font-display tracking-tight mt-1">
            VIDEOS
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-normal">
            Review each student's introduction video and mark it.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Download formatted Excel report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={loadSubmissions}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-elite-red' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#fafafa] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#fafafa] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#fafafa] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-elite-red cursor-pointer"
          >
            <option value="">All Ratings</option>
            <option value="GOOD">Good</option>
            <option value="AVERAGE">Average</option>
            <option value="POOR">Poor</option>
          </select>
        </div>
      </div>

      {/* 3. SUBMISSIONS TABLE */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading submissions...</span>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-800">No submissions found</p>
            <p className="text-xs text-neutral-500">
              Try adjusting your search query or filters.
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
                  <th className="py-3 px-4 text-center">Video</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.data.map((sub) => {
                  const meta = sub.rating ? ratingMeta[sub.rating] : null;
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onSelectSubmission(sub)}
                      className="hover:bg-[#fcfcfc] transition-colors cursor-pointer group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900 group-hover:text-elite-red transition-colors">
                          {sub.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {sub.email}
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-700">
                        {sub.rollNo}
                      </td>

                      {/* Section & Year */}
                      <td className="py-3.5 px-4 text-neutral-700">
                        <span className="font-semibold text-neutral-900">{sub.branch}-{sub.section}</span>
                        <span className="text-neutral-400 mx-1.5">•</span>
                        <span>Year {sub.year}</span>
                      </td>

                      {/* Video Presence */}
                      <td className="py-3.5 px-4 text-center">
                        {sub.videoDriveId ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            UPLOADED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-neutral-300 inline-block" />
                            REMOVED
                          </span>
                        )}
                      </td>

                      {/* Rating badge */}
                      <td className="py-3.5 px-4">
                        {meta ? (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${meta.badge} ${meta.text}`}>
                            <span className={`w-2 h-2 rounded-full ${meta.dot} inline-block`} />
                            <span className="text-[11px] font-bold tracking-wide uppercase">{meta.label}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-neutral-500 font-medium text-[11px] tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-neutral-300 inline-block" />
                            <span>NOT RATED</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSubmission(sub);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 group-hover:bg-elite-red group-hover:text-white rounded text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          <button
                            disabled={deletingId === sub.id}
                            onClick={(e) => handleRowDelete(e, sub)}
                            title="Delete Submission & Files"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-elite-red border border-red-200 rounded transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${deletingId === sub.id ? 'animate-spin' : ''}`} />
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
              Showing page <span className="font-bold text-neutral-900">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-neutral-900">{data.pagination.totalPages}</span> ({data.pagination.total} total submissions)
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