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
import { useConfirm } from './ui/ConfirmDialog';

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
  const confirm = useConfirm();
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    const confirmed = await confirm({
      title: 'Delete this submission?',
      description: `The submission for ${sub.name} (${sub.rollNo}) and all of its uploaded files will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete submission',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(sub.id);
    setError(null);
    try {
      const res = await adminApi.deleteSubmission(sub.id);
      if (res.success) {
        if (onRefreshStats) onRefreshStats();
        loadSubmissions();
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to delete the submission. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 text-left page-enter">
      {/* 1. HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <h1 className="font-heading text-headline-lg text-ink">Video submissions</h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Watch each introduction, rate it, and send the student a response.
          </p>
        </div>

        <button onClick={loadSubmissions} className="btn btn-secondary self-start sm:self-auto">
          <RefreshCw size={15} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          <span>Refresh</span>
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

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-status-rejected/30 bg-status-bg-rejected px-4 py-3 text-status-rejected"
        >
          <p className="text-body-sm">{error}</p>
          <button type="button" onClick={() => setError(null)} className="btn btn-secondary shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. SUBMISSIONS TABLE */}
      <div className="surface overflow-hidden">
        {loading ? (
          <>
            <span className="sr-only" role="status">
              Loading submissions
            </span>
            <div className="space-y-3 p-4" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-9 w-9" />
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 flex-1" />
                </div>
              ))}
            </div>
          </>
        ) : !data || data.data.length === 0 ? (
          <div className="space-y-1 p-16 text-center">
            <p className="font-heading text-headline-sm text-ink">No submissions match these filters</p>
            <p className="text-body-sm text-ink-secondary">
              Try a different name, section, year or rating.
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            {/* A plain table, not `role="grid"`: a grid promises arrow-key cell
                navigation, which this does not implement. */}
            <table className="w-full border-collapse text-left text-body-sm" aria-label="Video submissions">
              <thead>
                <tr className="sticky top-0 z-raised border-b border-edge bg-surface-inset text-label-sm font-semibold text-ink-secondary">
                  <th className="py-3.5 px-5" scope="col">Student</th>
                  <th className="py-3.5 px-4" scope="col">Roll Number</th>
                  <th className="py-3.5 px-4" scope="col">Section & Year</th>
                  <th className="py-3.5 px-4 text-center" scope="col">Video</th>
                  <th className="py-3.5 px-4" scope="col">Rating</th>
                  <th className="py-3.5 px-4" scope="col">Feedback</th>
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
                      className="cursor-pointer transition-colors duration-fast hover:bg-surface-sunken"
                    >
                      {/* Name & Email */}
                      <th scope="row" className="px-5 py-3.5 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-heading text-label-md font-bold text-brand-soft-text">
                            {sub.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join('') || '?'}
                          </div>
                          <div className="min-w-0">
                            {/* The name is a real button so the row is
                                reachable by keyboard; the row click stays for
                                the mouse. */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSubmission(sub);
                              }}
                              className="block max-w-full cursor-pointer truncate text-left font-heading text-label-lg font-semibold text-ink hover:text-ink-brand"
                            >
                              {sub.name}
                            </button>
                            <div className="mt-0.5 truncate text-label-md text-ink-secondary">
                              {sub.email}
                            </div>
                          </div>
                        </div>
                      </th>

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
                          <span className="badge badge-approved">Uploaded</span>
                        ) : (
                          <span className="badge badge-draft">No file</span>
                        )}
                      </td>

                      {/* Rating badge */}
                      <td className="py-3.5 px-4">
                        {meta ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label-md font-semibold ${meta.badge} ${meta.text}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                            {meta.label}
                          </span>
                        ) : (
                          <span className="badge badge-draft">Not rated</span>
                        )}
                      </td>

                      {/* Feedback badge */}
                      <td className="py-3.5 px-4">
                        {sub.reviewedAt && (sub.reviewText || (sub.reviewPros?.length ?? 0) > 0 || (sub.reviewCons?.length ?? 0) > 0) ? (
                          <span className="badge badge-approved">Responded</span>
                        ) : (
                          <span className="badge badge-draft">Not sent</span>
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
                            className="btn btn-secondary px-2.5"
                            aria-label={`Review the submission from ${sub.name}`}
                          >
                            <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                            <span>Review</span>
                          </button>

                          <button
                            disabled={deletingId === sub.id}
                            onClick={(e) => handleRowDelete(e, sub)}
                            title="Delete submission and its files"
                            aria-label={`Delete the submission from ${sub.name}`}
                            className="btn btn-ghost px-2 text-status-rejected hover:bg-status-bg-rejected"
                          >
                            <Trash2
                              size={15}
                              strokeWidth={1.75}
                              className={deletingId === sub.id ? 'animate-spin' : ''}
                              aria-hidden="true"
                            />
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
