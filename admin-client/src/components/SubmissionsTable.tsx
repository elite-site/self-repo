import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Hash,
  Trash2,
} from 'lucide-react';
import { Submission, SubmissionsResponse, SubmissionRating } from '../types';
import { adminApi } from '../services/api';
import { BrandedLoading } from './BrandedLoading';

interface SubmissionsTableProps {
  activeEventId: string;
  onSelectSubmission: (submission: Submission) => void;
  onRefreshStats?: () => void;
}

const ratingMeta: Record<SubmissionRating, { dot: string; text: string; label: string; badge: string }> = {
  GOOD: {
    dot: 'bg-status-approved',
    text: 'text-status-approved',
    label: 'Good',
    badge: 'bg-status-bg-approved border-edge',
  },
  AVERAGE: {
    dot: 'bg-status-pending',
    text: 'text-status-pending',
    label: 'Average',
    badge: 'bg-status-bg-pending border-edge',
  },
  POOR: {
    dot: 'bg-status-rejected',
    text: 'text-status-rejected',
    label: 'Poor',
    badge: 'bg-status-bg-rejected border-edge',
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
  const [tagFilter, setTagFilter] = useState('');
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
        tag: tagFilter.trim() || undefined,
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
  }, [activeEventId, page, search, tagFilter, yearFilter, sectionFilter, ratingFilter]);

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

  return (
    <div className="space-y-6 text-left page-enter">
      {/* 1. HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-widest text-ink-brand uppercase">
            Review & Rate Introductions
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight mt-1">
            Videos Submitted
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-normal">
            Watch each clip, mark it, and send the student a response.
          </p>
        </div>

        <button
          onClick={loadSubmissions}
          className="inline-flex items-center gap-2 px-3.5 py-2 btn btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ink-brand' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="surface p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, roll number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Review Hashtag Filter */}
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="#tag (e.g. commanding)"
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              className="input pl-8 w-48"
            />
          </div>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="select"
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
            className="select"
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
            className="select"
          >
            <option value="">All Ratings</option>
            <option value="GOOD">Good</option>
            <option value="AVERAGE">Average</option>
            <option value="POOR">Poor</option>
          </select>
        </div>
      </div>

      {/* 3. SUBMISSIONS TABLE */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-12">
            <BrandedLoading fullScreen={false} message="Loading Submissions..." />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-ink font-heading">No submissions found</p>
            <p className="text-xs text-ink-secondary">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" role="grid" aria-label="Submissions">
              <thead>
                <tr className="bg-surface-inset border-b border-edge text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                  <th className="py-3.5 px-5" scope="col">Student</th>
                  <th className="py-3.5 px-4" scope="col">Roll Number</th>
                  <th className="py-3.5 px-4" scope="col">Section & Year</th>
                  <th className="py-3.5 px-4 text-center" scope="col">Video</th>
                  <th className="py-3.5 px-4" scope="col">Rating</th>
                  <th className="py-3.5 px-4" scope="col">Response</th>
                  <th className="py-3.5 px-5 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {data.data.map((sub) => {
                  const meta = sub.rating ? ratingMeta[sub.rating] : null;
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onSelectSubmission(sub)}
                      className="hover:bg-surface-canvas transition-colors cursor-pointer group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center text-xs font-extrabold font-heading shrink-0">
                            {sub.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join('') || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-ink group-hover:text-ink-brand transition-colors truncate">
                              {sub.name}
                            </div>
                            <div className="text-[11px] text-ink-secondary mt-0.5 truncate">
                              {sub.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-semibold text-ink-secondary">
                        {sub.rollNo}
                      </td>

                      {/* Section & Year */}
                      <td className="py-3.5 px-4 text-ink-secondary">
                        <span className="font-semibold text-ink">{sub.branch}-{sub.section}</span>
                        <span className="text-ink-muted mx-1.5">•</span>
                        <span>Year {sub.year}</span>
                      </td>

                      {/* Video Presence */}
                      <td className="py-3.5 px-4 text-center">
                        {sub.videoDriveId ? (
                          <span className="inline-flex items-center gap-1.5 text-status-approved text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-status-approved inline-block" />
                            UPLOADED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-ink-muted text-[11px] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-surface-inset inline-block" />
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
                          <div className="inline-flex items-center gap-1.5 text-ink-muted font-medium text-[11px] tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-surface-inset inline-block" />
                            <span>NOT RATED</span>
                          </div>
                        )}
                      </td>

                      {/* Admin response badge */}
                      <td className="py-3.5 px-4">
                        {sub.reviewedAt && (sub.reviewText || (sub.reviewPros?.length ?? 0) > 0 || (sub.reviewCons?.length ?? 0) > 0) ? (
                          <span className="badge badge-approved">
                            <span className="w-2 h-2 rounded-full bg-status-approved inline-block" />
                            <span className="text-[11px] font-bold tracking-wide uppercase">Responded</span>
                          </span>
                        ) : (
                          <span className="badge badge-pending">
                            <span className="w-2 h-2 rounded-full bg-status-pending inline-block" />
                            <span>Pending</span>
                          </span>
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
                            className="btn btn-secondary"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          <button
                            disabled={deletingId === sub.id}
                            onClick={(e) => handleRowDelete(e, sub)}
                            title="Delete Submission & Files"
                            className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected hover:text-status-rejected border border-status-bg-rejected disabled:opacity-50"
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
          <div className="p-4 bg-surface-inset border-t border-edge flex items-center justify-between text-xs text-ink-secondary">
            <div>
              Showing page <span className="font-bold text-ink">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-ink">{data.pagination.totalPages}</span> ({data.pagination.total} total submissions)
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
