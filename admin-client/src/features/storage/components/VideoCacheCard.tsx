import React, { useState } from 'react';
import {
  Film,
  RotateCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  HardDrive,
  Users,
} from 'lucide-react';
import { VideoCacheEntry } from '../types';
import {
  usePurgeIdleVideoCacheMutation,
  useRetryVideoCacheMutation,
  useVideoCacheQuery,
} from '../hooks/useVideoCache';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

function formatBytes(bytesStr: string): string {
  const bytes = Number(bytesStr || 0);
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const VideoCacheCard: React.FC = () => {
  const confirm = useConfirm();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { data, loading, error, refetch } = useVideoCacheQuery(page, filterStatus);
  const retryMutation = useRetryVideoCacheMutation();
  const purgeMutation = usePurgeIdleVideoCacheMutation();
  const retryingId = retryMutation.isPending ? retryMutation.variables : null;
  const purging = purgeMutation.isPending;

  const handleRetry = async (id: string) => {
    setMessage(null);
    try {
      const res = await retryMutation.mutateAsync(id);
      setMessage({
        text: res.message || 'Video copy retry initiated successfully.',
        type: 'success',
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to retry video copy',
        type: 'error',
      });
    }
  };

  const handlePurge = async () => {
    const confirmed = await confirm({
      title: 'Purge idle video cache?',
      description:
        'This will evict cached videos that have no active student playback leases and exceed the idle threshold. Active playback sessions are never interrupted.',
      confirmLabel: 'Purge Idle Videos',
      tone: 'danger',
    });
    if (!confirmed) return;

    setMessage(null);
    try {
      const res = await purgeMutation.mutateAsync();
      const freedMb = (Number(res.freedBytes || 0) / (1024 * 1024)).toFixed(1);
      setMessage({
        text: `Purged ${res.evictedCount} idle video(s), freeing ${freedMb} MB.`,
        type: 'success',
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to purge idle video cache',
        type: 'error',
      });
    }
  };

  // Render status badge for an entry
  const renderStatusBadge = (entry: VideoCacheEntry) => {
    if (entry.status === 'READY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-status-bg-approved text-status-approved border border-edge">
          <span className="w-1.5 h-1.5 rounded-full bg-status-approved" />
          READY
        </span>
      );
    }
    if (entry.status === 'COPYING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-status-bg-pending text-status-pending border border-edge">
          <Loader2 className="w-3 h-3 animate-spin text-status-pending" />
          COPYING
        </span>
      );
    }
    return (
      <span
        title={entry.failReason || 'Copy failed'}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-status-bg-rejected text-status-rejected border border-edge cursor-help"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-status-rejected" />
        FAILED
      </span>
    );
  };

  const usedBytesNum = Number(data?.totals.usedBytes || 0);
  const maxBytesNum = Number(data?.totals.maxBytes || 0);
  const usedPercent = maxBytesNum > 0 ? Math.min(100, Math.round((usedBytesNum / maxBytesNum) * 100)) : 0;

  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-bg-review text-status-review flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              Cloudflare R2 Video Cache
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Edge stream caching for Google Drive lesson videos with active student lease protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePurge}
            disabled={purging || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-status-rejected bg-status-bg-rejected border border-edge rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            title="Evict idle unleased videos to reclaim disk space"
          >
            <Trash2 className={`w-3.5 h-3.5 ${purging ? 'animate-spin' : ''}`} />
            Purge Idle
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-secondary bg-surface-sunken border border-edge rounded-lg hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh video cache status"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            message.type === 'error'
              ? 'bg-status-bg-rejected border-status-rejected/30 text-status-rejected'
              : 'bg-status-bg-approved border-status-approved/30 text-status-approved'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="font-bold underline text-xs ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Capacity Progress & Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Capacity Bar Card */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-surface-sunken border border-edge space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-ink-muted" />
              Cache Storage Capacity
            </span>
            <span className="font-mono text-ink-secondary">
              <strong className="text-ink">{formatBytes(data?.totals.usedBytes || '0')}</strong> used of{' '}
              {formatBytes(data?.totals.maxBytes || '0')} ({usedPercent}%)
            </span>
          </div>

          <div className="w-full bg-surface h-2.5 rounded-full overflow-hidden border border-edge">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                usedPercent > 90
                  ? 'bg-status-rejected'
                  : usedPercent > 75
                  ? 'bg-status-pending'
                  : 'bg-status-approved'
              }`}
              style={{ width: `${Math.max(2, usedPercent)}%` }}
            />
          </div>

          <p className="text-[11px] text-ink-muted leading-tight">
            LRU eviction automatically rotates idle videos when approaching the maximum capacity limit.
          </p>
        </div>

        {/* Status Count Badges */}
        <div className="p-4 rounded-xl bg-surface-sunken border border-edge flex items-center justify-around gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-status-approved">
              {data?.totals.counts.ready ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Ready
            </span>
          </div>
          <div className="h-8 w-px bg-edge" />
          <div>
            <div className="text-xl font-bold text-status-pending">
              {data?.totals.counts.copying ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Copying
            </span>
          </div>
          <div className="h-8 w-px bg-edge" />
          <div>
            <div className="text-xl font-bold text-status-rejected">
              {data?.totals.counts.failed ?? 0}
            </div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Failed
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-edge pb-2">
        {(['ALL', 'READY', 'COPYING', 'FAILED'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setFilterStatus(status);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === status
                ? 'bg-brand text-on-primary shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Entries Table */}
      {loading ? (
        <div className="space-y-2 py-4" aria-busy="true">
          <div className="skeleton h-10 w-full rounded-lg" />
          <div className="skeleton h-12 w-full rounded-lg" />
          <div className="skeleton h-12 w-full rounded-lg" />
          <div className="skeleton h-12 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-status-rejected bg-status-bg-rejected rounded-xl border border-edge">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p className="font-semibold mb-3">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="btn btn-secondary text-xs inline-flex items-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="p-8 text-center text-xs text-ink-muted bg-surface-sunken rounded-xl border border-edge">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-40 text-ink-muted" />
          <p className="font-medium">No cached videos yet</p>
          <p className="text-[11px] text-ink-muted mt-1">
            When students stream Google Drive lesson videos, R2 cache copies will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-edge">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cache ID</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Active Leases</th>
                <th className="px-4 py-3">Last Accessed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge text-ink-secondary">
              {data.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-sunken/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderStatusBadge(entry)}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink text-[11px] max-w-[140px] truncate">
                    {entry.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink">
                    {entry.sizeMb !== null ? `${entry.sizeMb} MB` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.activeLeaseCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-status-approved">
                        <Users className="w-3 h-3" />
                        {entry.activeLeaseCount} active
                      </span>
                    ) : (
                      <span className="text-ink-muted">0 active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-ink-muted" />
                      {formatDate(entry.lastAccessedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {entry.status === 'FAILED' ? (
                      <button
                        type="button"
                        onClick={() => handleRetry(entry.id)}
                        disabled={retryingId === entry.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand bg-brand/10 border border-brand/20 rounded-lg hover:bg-brand/20 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Retry copying video from Drive to R2"
                      >
                        <RotateCw
                          className={`w-3 h-3 ${retryingId === entry.id ? 'animate-spin' : ''}`}
                        />
                        Retry
                      </button>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-muted pt-2 border-t border-edge">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{' '}
            items)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-surface border border-edge disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded bg-surface border border-edge disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCacheCard;
