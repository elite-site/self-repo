import React, { useState } from 'react';
import {
  Film,
  VideoOff,
  RefreshCw,
  ExternalLink,
  Globe,
  EyeOff,
  Loader2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Submission, IntroVideoState } from '@/types';
import { moderationApi } from '../../api';

const VIDEO_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending review', cls: 'badge badge-pending' },
  UNDER_REVIEW: { label: 'Under review', cls: 'badge badge-review' },
  APPROVED: { label: 'Approved', cls: 'badge badge-approved' },
  REJECTED: { label: 'Rejected', cls: 'badge badge-rejected' },
  CHANGES_REQUESTED: { label: 'New video requested', cls: 'badge badge-changes' },
};

interface SubmissionVideoSectionProps {
  submission: Submission;
  introVideo: IntroVideoState | null;
  hasVideo: boolean;
  onTogglePublic: () => Promise<void>;
  togglingPublic: boolean;
  onRequestNewVideo: (reason: string) => Promise<void>;
  requestingVideo: boolean;
  videoNotice: string | null;
}

export const SubmissionVideoSection: React.FC<SubmissionVideoSectionProps> = ({
  submission,
  introVideo,
  hasVideo,
  onTogglePublic,
  togglingPublic,
  onRequestNewVideo,
  requestingVideo,
  videoNotice,
}) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  const videoUrl = hasVideo
    ? moderationApi.getMediaUrl(submission.id, 'video', submission.videoDriveId || submission.submittedAt)
    : null;

  const handleSubmitRequest = async () => {
    await onRequestNewVideo(requestReason);
    setShowRequestForm(false);
    setRequestReason('');
  };

  return (
    <div className="surface p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink tracking-tight">Introduction video</h3>
            <p className="text-xs text-ink-secondary">Review the student's introduction clip below.</p>
          </div>
        </div>
        {hasVideo && (
          <div className="flex items-center gap-2">
            {introVideo?.status && (
              <span className={`${VIDEO_STATUS_BADGE[introVideo.status]?.cls ?? 'badge badge-draft'}`}>
                {VIDEO_STATUS_BADGE[introVideo.status]?.label ?? introVideo.status}
              </span>
            )}
            <span className="badge badge-approved">
              <span className="w-2 h-2 rounded-full bg-status-approved inline-block" />
              Uploaded
            </span>
          </div>
        )}
      </div>

      {videoUrl ? (
        videoError ? (
          <div className="surface-sunken border border-edge-strong rounded-xl p-8 text-center space-y-3">
            <VideoOff className="w-8 h-8 text-status-changes mx-auto" />
            <div>
              <p className="text-sm font-bold text-ink">Video player error</p>
              <p className="text-xs text-ink-secondary mt-0.5">
                Could not play video stream directly in the browser.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setVideoError(false);
                  setVideoRetryKey((k) => k + 1);
                }}
                className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Playback</span>
              </button>
              {submission.videoDriveId && (
                <a
                  href={`https://drive.google.com/file/d/${submission.videoDriveId.trim()}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary text-xs inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Watch in Google Drive</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-inverse rounded-xl overflow-hidden shadow-md">
            <video
              key={`${submission.id}-${videoRetryKey}`}
              src={
                videoRetryKey > 0 && submission.videoDriveId
                  ? `/api/public/media/video/${submission.videoDriveId.trim()}?stream=true&retry=${videoRetryKey}`
                  : videoUrl
              }
              controls
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              className="w-full max-h-[420px] bg-black"
            />
          </div>
        )
      ) : (
        <div className="surface-sunken border border-edge-strong rounded-xl p-10 text-center space-y-2">
          <VideoOff className="w-6 h-6 text-ink-muted mx-auto" />
          <p className="text-xs text-ink-secondary">
            No video is linked to this submission. The student can upload a replacement video.
          </p>
        </div>
      )}

      {/* PUBLIC VISIBILITY + CHANGE REQUEST */}
      <div className="mt-4 pt-4 border-t border-edge space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {introVideo?.isPublic ? (
              <Globe className="w-4 h-4 shrink-0 text-status-approved mt-0.5" />
            ) : (
              <EyeOff className="w-4 h-4 shrink-0 text-ink-muted mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">
                {introVideo?.isPublic ? 'Visible on the public page' : 'Not published publicly'}
              </p>
              <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                {introVideo?.status === 'APPROVED'
                  ? 'Published videos are watchable by anyone on the public home page, without logging in.'
                  : 'Only an approved video can be published to the public page.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTogglePublic}
              disabled={!introVideo || togglingPublic || introVideo.status !== 'APPROVED'}
              title={introVideo?.status === 'APPROVED' ? undefined : 'Only approved videos can be published'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                introVideo?.isPublic ? 'btn btn-ghost' : 'btn btn-primary'
              }`}
            >
              {togglingPublic ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : introVideo?.isPublic ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              {introVideo?.isPublic ? 'Hide from public profile' : 'Show on public profile'}
            </button>

            <button
              type="button"
              onClick={() => setShowRequestForm((v) => !v)}
              className="btn btn-ghost text-status-changes hover:bg-status-bg-changes hover:text-status-changes border border-status-bg-changes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request new upload
            </button>
          </div>
        </div>

        {showRequestForm && (
          <div className="space-y-2 p-3 rounded-xl border border-status-bg-changes bg-status-bg-changes/50">
            <label className="block text-xs font-semibold text-status-changes">
              What should the student change? <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={3}
              placeholder="e.g. The audio is not clear in the second half, please re-record."
              className="textarea"
            />
            <p className="text-xs text-status-changes/80 leading-relaxed">
              The student gets a notification. Their current video stays live until they upload the replacement,
              which then overrides it and removes the old file.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={requestingVideo}
                className="btn btn-primary"
              >
                {requestingVideo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                Send to student
              </button>
            </div>
          </div>
        )}

        {videoNotice && (
          <p className="text-xs text-ink-secondary flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            {videoNotice}
          </p>
        )}
      </div>
    </div>
  );
};
