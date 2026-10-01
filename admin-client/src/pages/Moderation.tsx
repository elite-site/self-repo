import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, EyeOff,
  Film, ChevronRight, ChevronLeft,
  Inbox, AlertCircle, Loader2, ExternalLink, Download, Info
} from 'lucide-react';
import { adminApi } from '../services/api';

interface ModerationItem {
  id: string;
  studentName: string;
  studentRoll: string;
  submittedAt: string;
  fileUrl?: string;
  driveFileId?: string;
  fileDriveId?: string;
  proofDriveId?: string;
  watchUrl?: string;
  previewUrl?: string;
  status: string;
  title?: string;
  reason?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'badge badge-pending' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'badge badge-review' },
    APPROVED: { label: 'Approved', cls: 'badge badge-approved' },
    REJECTED: { label: 'Rejected', cls: 'badge badge-rejected' },
    CHANGES_REQUESTED: { label: 'Changes Requested', cls: 'badge badge-changes' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
};

export const Moderation: React.FC = () => {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | 'hide' | null>(null);
  const [reason, setReason] = useState('');
  const [publishOnApprove, setPublishOnApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    setIdx(0);
    try {
      const res = await adminApi.getModerationVideos?.() ?? { items: [] };
      setItems(res.items ?? []);
    } catch {
      setError('Failed to load intro video moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const currentItem = items[idx] ?? null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDecision = async () => {
    if (!currentItem || !action) return;
    if ((action === 'reject' || action === 'changes') && !reason.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.moderationDecision?.('videos', currentItem.id, {
        action,
        reason,
        publish: publishOnApprove,
      });
      showToast(
        action === 'approve'
          ? publishOnApprove
            ? 'Video approved and published.'
            : 'Video approved.'
          : action === 'reject'
          ? 'Video rejected.'
          : action === 'changes'
          ? 'Change requested, the student has been notified.'
          : 'Video hidden.'
      );
      setAction(null);
      setReason('');
      const next = items.filter((_, i) => i !== idx);
      setItems(next);
      setIdx(Math.min(idx, next.length - 1));
    } catch {
      showToast('Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left page-enter">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-toast bg-surface-inverse text-ink-inverse text-xs font-semibold px-4 py-2.5 rounded-lg shadow-modal animate-fade-in" role="alert" aria-live="polite">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-headline-sm font-extrabold text-ink">Video Moderation Queue</h1>
            <p className="text-body-sm text-ink-muted">
              Review and approve student introduction videos
            </p>
          </div>
        </div>
        <button
          onClick={fetchItems}
          className="btn btn-secondary self-start sm:self-auto"
          aria-label="Refresh moderation queue"
        >
          Refresh Queue
        </button>
      </div>

      {/* Info Callout Banner */}
      <div className="flex items-start gap-3 p-4 bg-brand-soft border border-brand-ring rounded-xl" role="region" aria-label="Workflow information">
        <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-body-sm text-brand-soft-text space-y-1">
          <p className="font-bold">Fast-Track Portfolio Workflows Enabled</p>
          <p className="leading-relaxed">
            Resumes, honors & achievements, and certificates are automatically approved upon upload to eliminate bottleneck queues for 50+ students.
            To inspect student portfolios, request revisions, or delete any record, open the student's profile directly in the <strong>Student Roster</strong>.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 surface-sunken">
          <Loader2 className="w-7 h-7 animate-spin text-brand" aria-hidden="true" />
          <span className="sr-only">Loading moderation queue</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken gap-3 text-center" role="alert">
          <AlertCircle className="w-8 h-8 text-status-rejected" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted">{error}</p>
          <button onClick={fetchItems} className="text-body-sm font-semibold text-brand hover:underline cursor-pointer">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken gap-3 text-center">
          <Inbox className="w-10 h-10 text-ink-muted" aria-hidden="true" />
          <p className="text-body-md font-semibold text-ink-secondary">Queue is clear</p>
          <p className="text-body-sm text-ink-muted">No pending student introduction videos to review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Video Player & Metadata */}
          <div className="lg:col-span-3 space-y-4">
            <div className="surface overflow-hidden">
              {/* Navigation header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-edge bg-surface-sunken">
                <button
                  onClick={() => setIdx(Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  className="btn btn-ghost text-body-sm"
                  aria-label="Previous video"
                  aria-disabled={idx === 0}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Prev
                </button>
                <span className="text-body-sm font-bold text-ink-secondary" aria-live="polite">
                  {idx + 1} of {items.length}
                </span>
                <button
                  onClick={() => setIdx(Math.min(items.length - 1, idx + 1))}
                  disabled={idx === items.length - 1}
                  className="btn btn-ghost text-body-sm"
                  aria-label="Next video"
                  aria-disabled={idx === items.length - 1}
                >
                  Next <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Preview area */}
              <div className="p-5">
                {currentItem && (
                  <>
                    {/* Student info */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-edge">
                      <div className="w-10 h-10 rounded-full bg-surface-inverse text-ink-inverse flex items-center justify-center font-bold text-body-sm">
                        {currentItem.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-ink text-body-sm truncate">{currentItem.studentName}</div>
                        <div className="text-label-sm font-mono text-ink-muted">{currentItem.studentRoll}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <StatusBadge status={currentItem.status} />
                        <span className="text-label-sm text-ink-muted">
                          {new Date(currentItem.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Attachment Header with Open in Tab & Download */}
                    {currentItem.fileUrl && (() => {
                      const driveId = currentItem.fileDriveId || currentItem.proofDriveId || currentItem.driveFileId;
                      const isGoogleDriveId = Boolean(driveId) && !driveId?.startsWith('mock_') && !driveId?.startsWith('drive_');
                      const watchUrl = currentItem.watchUrl || (isGoogleDriveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : null);

                      return (
                        <>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-edge">
                            <span className="text-label-sm font-semibold text-ink-muted">
                              Introduction Video Attachment
                            </span>
                            <div className="flex items-center gap-2">
                              {watchUrl && (
                                <a
                                  href={watchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost text-body-sm"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                                  <span>View on Drive</span>
                                </a>
                              )}
                              <a
                                href={watchUrl || currentItem.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost text-body-sm"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                                <span>Open in Tab</span>
                              </a>
                              <a
                                href={`${currentItem.fileUrl}${currentItem.fileUrl.includes('?') ? '&' : '?'}download=1`}
                                className="btn btn-ghost text-body-sm"
                              >
                                <Download className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>

                          {/* Video player */}
                          <div className="bg-surface-inverse rounded-lg overflow-hidden aspect-video">
                            <video src={currentItem.fileUrl} controls className="w-full h-full object-contain" />
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Decision Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="surface p-5 space-y-4">
              <h3 className="text-label-md font-extrabold text-ink uppercase tracking-wide">Decision</h3>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Moderation actions">
                <button
                  onClick={() => setAction('approve')}
                  className={`btn ${action
                     === 'approve'
                      ? 'btn-primary'
                      : 'btn-secondary'} text-body-sm`}
                  aria-pressed={action === 'approve'}
                >
                  <CheckCircle className="w-4 h-4" aria-hidden="true" /> Approve
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className={`btn ${action
                     === 'reject'
                      ? 'btn-danger'
                      : 'btn-secondary'} text-body-sm`}
                  aria-pressed={action === 'reject'}
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" /> Reject
                </button>
                <button
                  onClick={() => setAction('changes')}
                  className={`btn ${action
                     === 'changes'
                      ? 'btn-primary'
                      : 'btn-secondary'} text-body-sm`}
                  aria-pressed={action === 'changes'}
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" /> Request Changes
                </button>
                <button
                  onClick={() => setAction('hide')}
                  className={`btn ${action
                     === 'hide'
                      ? 'btn-secondary'
                      : 'btn-ghost'} text-body-sm`}
                  aria-pressed={action === 'hide'}
                >
                  <EyeOff className="w-4 h-4" aria-hidden="true" /> Hide
                </button>
              </div>

              {/* Reason textarea — required for reject/changes */}
              {(action === 'reject' || action === 'changes') && (
                <div className="space-y-1.5">
                  <label htmlFor="moderation-reason" className="label">
                    Reason / Faculty Feedback <span className="text-status-rejected" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="moderation-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Explain why this is being rejected or what needs to be changed in the re-uploaded video..."
                    className="textarea"
                    aria-required="true"
                    aria-describedby="reason-hint"
                  />
                  <p id="reason-hint" className="hint">Required for rejection or change requests.</p>

                  {!reason.trim() && (
                    <p className="error-text">Reason  is required for this action.</p>
                  )}
                </div>
              )}

              {/* Publish option — shown when approving */}
              {action === 'approve' && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-status-approved/30 bg-status-bg-approved cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishOnApprove}
                    onChange={(e) => setPublishOnApprove(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-edge text-brand focus:ring-brand focus:ring-2 cursor-pointer"
                  />
                  <span className="text-label-sm text-status-approved leading-relaxed">
                    <span className="font-bold">Publish on public showcase.</span> The video becomes watchable by
                    visitors on the student's public profile and directory without logging in.
                  </span>
                </label>
              )}

              {action && (
                <button
                  onClick={handleDecision}
                  disabled={submitting || ((action === 'reject' || action === 'changes') && !reason.trim())}
                  className="btn btn-primary w-full"
                  aria-busy={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                  Confirm {action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : action === 'changes' ? 'Change Request' : 'Hide'}
                </button>
              )}
            </div>

            {/* Previous decision (if exists) */}
            {currentItem?.reason && (
              <div className="surface-sunken p-4 border border-status-pending/30 rounded-xl" role="region" aria-label="Previous feedback">
                <p className="text-label-sm font-bold text-status-pending mb-1">Previous Feedback</p>
                <p className="text-body-sm text-status-pending">{currentItem.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
