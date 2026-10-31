import React from 'react';
import { RefreshCw, ShieldCheck, Unlink, ExternalLink } from 'lucide-react';
import type { CodeChefDetails } from '../types';

interface AdminStudentCodeChefTabProps {
  studentId: string;
  details?: CodeChefDetails | null;
  loading: boolean;
  onResync: (id: string) => void;
  resyncing: boolean;
  onVerify: (id: string) => void;
  verifying: boolean;
  onUnlink: (id: string) => void;
  unlinking: boolean;
}

export const AdminStudentCodeChefTab: React.FC<AdminStudentCodeChefTabProps> = ({
  studentId,
  details,
  loading,
  onResync,
  resyncing,
  onVerify,
  verifying,
  onUnlink,
  unlinking,
}) => {
  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-muted animate-pulse">Loading CodeChef details...</div>;
  }

  if (!details || !details.handle) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted bg-surface rounded-xl border border-border">
        This student has not connected a CodeChef account yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Admin Actions Card */}
      <div className="p-5 bg-surface rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {details.profile.avatar ? (
            <img src={details.profile.avatar} alt={details.handle} className="w-12 h-12 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {details.handle.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-ink">{details.profile.displayName || details.handle}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                details.verified ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {details.verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
              <span>@{details.handle}</span>
              <a
                href={`https://www.codechef.com/users/${details.handle}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-0.5"
              >
                CodeChef <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!details.verified && (
            <button
              type="button"
              onClick={() => onVerify(studentId)}
              disabled={verifying}
              className="px-3 py-1.5 rounded-lg bg-success text-white text-xs font-medium flex items-center gap-1.5 hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {verifying ? 'Verifying...' : 'Mark Verified'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onResync(studentId)}
            disabled={resyncing}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} />
            {resyncing ? 'Syncing...' : 'Force Re-sync'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to unlink this student\'s CodeChef account?')) {
                onUnlink(studentId);
              }
            }}
            disabled={unlinking}
            className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Unlink className="w-3.5 h-3.5" />
            {unlinking ? 'Unlinking...' : 'Unlink'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface rounded-xl border border-border text-center">
          <span className="text-xs text-ink-muted">Rating</span>
          <div className="text-xl font-bold text-ink mt-0.5">
            {details.summary.currentRating ?? 'Unrated'}
            {details.summary.stars && <span className="text-amber-500 text-xs ml-1">({details.summary.stars}★)</span>}
          </div>
        </div>
        <div className="p-3 bg-surface rounded-xl border border-border text-center">
          <span className="text-xs text-ink-muted">Global Rank</span>
          <div className="text-xl font-bold text-ink mt-0.5">
            {details.summary.globalRanking ? `#${details.summary.globalRanking.toLocaleString()}` : '—'}
          </div>
        </div>
        <div className="p-3 bg-surface rounded-xl border border-border text-center">
          <span className="text-xs text-ink-muted">Solved</span>
          <div className="text-xl font-bold text-ink mt-0.5">{details.summary.totalSolved.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-surface rounded-xl border border-border text-center">
          <span className="text-xs text-ink-muted">Contests</span>
          <div className="text-xl font-bold text-ink mt-0.5">{details.summary.totalContests.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};
