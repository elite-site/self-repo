import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';
import { StudentIntroVideo } from '../types';

interface VideoPlayerCardProps {
  playbackUrl: string | null;
  previewError: boolean;
  video: StudentIntroVideo | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onPlaybackError: () => void;
  onRetryPlayback: () => void;
}

export const VideoPlayerCard: React.FC<VideoPlayerCardProps> = ({
  playbackUrl,
  previewError,
  video,
  videoRef,
  onPlaybackError,
  onRetryPlayback,
}) => {
  if (previewError) {
    return (
      <div className="mx-auto max-w-2xl min-h-[220px] aspect-video bg-surface-canvas rounded-lg border border-status-rejected/30 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-status-rejected" />
        <div>
          <p className="text-sm font-semibold text-ink">This video won't play right now.</p>
          <p className="text-xs text-ink-muted mt-1 max-w-md">
            Check your connection and try again.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetryPlayback}
          className="btn btn-secondary min-h-[44px] text-xs font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl max-h-[60dvh] bg-surface-inverse rounded-lg overflow-hidden aspect-[4/3] min-h-[240px] sm:aspect-video sm:min-h-0 border border-edge-strong shadow-inner">
      {playbackUrl ? (
        <video
          ref={videoRef}
          key={playbackUrl}
          src={playbackUrl}
          poster={video?.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl) : undefined}
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          playsInline
          preload="metadata"
          crossOrigin="use-credentials"
          onError={onPlaybackError}
          className="w-full h-full object-contain"
        >
          Your browser cannot play this video.
        </video>
      ) : null}
    </div>
  );
};
