import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  FileText,
  Award,
  FolderGit2,
  Trophy,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Download,
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Under review', cls: 'badge badge-pending' },
    UNDER_REVIEW: { label: 'Under review', cls: 'badge badge-review' },
    APPROVED: { label: 'Approved', cls: 'badge badge-approved' },
    REJECTED: { label: 'Rejected', cls: 'badge badge-rejected' },
    CHANGES_REQUESTED: { label: 'Changes requested', cls: 'badge badge-changes' },
    HIDDEN: { label: 'Unpublished', cls: 'badge badge-draft' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
};

export const ItemTypeBadge: React.FC<{ itemType: string }> = ({ itemType }) => {
  switch (itemType) {
    case 'video':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-soft text-brand-soft-text border border-brand/20">
          <Film className="w-3 h-3" />
          <span>Intro video</span>
        </span>
      );
    case 'resume':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge badge-approved">
          <FileText className="w-3 h-3" />
          <span>Resume</span>
        </span>
      );
    case 'certificate':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge badge-review">
          <Award className="w-3 h-3" />
          <span>Certificate</span>
        </span>
      );
    case 'project':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-ink-secondary border border-edge">
          <FolderGit2 className="w-3 h-3" />
          <span>Project</span>
        </span>
      );
    case 'achievement':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold badge badge-changes">
          <Trophy className="w-3 h-3" />
          <span>Achievement</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-ink-secondary border border-edge">
          <span>{itemType}</span>
        </span>
      );
  }
};

export const DocumentOrImagePreview: React.FC<{
  url: string;
  title: string;
  isPdfHint?: boolean;
}> = ({ url, title, isPdfHint }) => {
  const [isPdf, setIsPdf] = useState(isPdfHint || false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setIsPdf(isPdfHint || false);
    setImgLoaded(false);
  }, [url, isPdfHint]);

  if (isPdf) {
    return (
      <div className="w-full h-[65vh] min-h-[400px] rounded-lg overflow-hidden border border-edge bg-surface shadow-sm">
        <iframe
          src={url}
          title={title}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center max-h-[72vh] w-auto max-w-full mx-auto">
      {!imgLoaded && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      )}
      <img
        src={url}
        alt={title}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          setIsPdf(true);
        }}
        className={`max-h-[72vh] w-auto max-w-full mx-auto object-contain rounded-lg shadow-md transition-opacity duration-200 ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export const VideoPreviewPlayer: React.FC<{
  url?: string | null;
  driveFileId?: string | null;
  id: string;
  title: string;
}> = ({ url, driveFileId, id, title }) => {
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(false);
  }, [url, id]);

  const effectiveUrl = useMemo(() => {
    const rawUrl = url || (driveFileId ? `/api/public/media/video/${driveFileId}?stream=true` : `/api/public/media/video/${id}?stream=true`);
    if (!rawUrl) return null;
    return retryKey > 0 ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}retry=${retryKey}` : rawUrl;
  }, [url, driveFileId, id, retryKey]);

  const driveViewUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null;

  if (!effectiveUrl) {
    return (
      <div className="text-center p-8 text-ink-muted">
        <Film className="w-12 h-12 mx-auto mb-2 opacity-40" />
        <p className="text-body-sm font-semibold">Video file not streamable</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-sunken border border-edge-strong rounded-xl p-8 text-center max-w-md mx-auto space-y-4 my-4">
        <AlertCircle className="w-10 h-10 text-status-changes mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-ink">Video could not be played directly in browser</h4>
          <p className="text-xs text-ink-secondary mt-1">
            The media stream could not be decoded or loaded by your browser. You can retry or open it directly in Google Drive.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setError(false);
              setRetryKey((k) => k + 1);
            }}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Playback</span>
          </button>
          {driveViewUrl && (
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Watch on Google Drive</span>
            </a>
          )}
          <a
            href={`${effectiveUrl}${effectiveUrl.includes('?') ? '&' : '?'}download=1`}
            className="btn btn-ghost text-xs inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <video
        key={`${id}-${retryKey}`}
        src={effectiveUrl}
        title={title}
        aria-label={title}
        controls
        preload="metadata"
        playsInline
        onError={() => setError(true)}
        className="max-h-[72vh] w-auto max-w-full mx-auto object-contain rounded-lg shadow-md bg-black"
      />
    </div>
  );
};
