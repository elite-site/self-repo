import React from 'react';
import { Sparkles, RefreshCw, Search, X, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { StatusFilter } from '../types';

export interface ModerationHeaderProps {
  toast: { message: string; type?: 'success' | 'error' } | null;
  loading: boolean;
  searchQuery: string;
  statusFilter: StatusFilter;
  onDismissToast: () => void;
  onRefresh: () => void;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export const ModerationHeader: React.FC<ModerationHeaderProps> = ({
  toast,
  loading,
  searchQuery,
  statusFilter,
  onDismissToast,
  onRefresh,
  onSearchChange,
  onStatusFilterChange,
}) => {
  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-overlay text-xs font-semibold px-4 py-3 rounded-xl shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-status-rejected/10 text-status-rejected border border-status-rejected/30'
              : 'bg-surface-inverse text-ink-inverse'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-success" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={onDismissToast}
            className="p-1 hover:opacity-75 rounded ml-2 text-current cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-soft-text flex items-center justify-center shadow-xs border border-brand/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight font-sans">Moderation queue</h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Unified review for Intro Videos, Resumes, Certificates, Projects, and Achievements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-secondary min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by student name, roll number, or title..."
            className="input pl-9 pr-8 text-sm w-full min-h-[44px]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-ink-muted hidden sm:inline-block" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="select text-sm min-w-[170px] min-h-[44px] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
};
