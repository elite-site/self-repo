import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

export interface YouTubePlayerProps {
  videoId: string;
  lessonId?: string;
  initialSeconds?: number;
  onProgress?: (seconds: number, completed: boolean) => void;
  className?: string;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  lessonId,
  initialSeconds = 0,
  onProgress,
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeRef = useRef(initialSeconds);
  const lastReportedTimeRef = useRef(initialSeconds);
  const isCompletedRef = useRef(false);
  const [hasError, setHasError] = useState(false);

  const reportProgress = useCallback((seconds: number, completed: boolean) => {
    currentTimeRef.current = seconds;
    lastReportedTimeRef.current = seconds;
    if (completed) isCompletedRef.current = true;
    onProgress?.(Math.floor(seconds), completed);
  }, [onProgress]);

  const sendBeaconProgress = useCallback(() => {
    if (!lessonId || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const body = JSON.stringify({
      secondsWatched: Math.floor(currentTimeRef.current),
      maxPositionSec: Math.floor(currentTimeRef.current),
      completed: isCompletedRef.current,
    });
    navigator.sendBeacon(`/api/student/learning/lessons/${lessonId}/progress`, new Blob([body], { type: 'application/json' }));
  }, [lessonId]);

  useEffect(() => {
    const handleBeforeUnload = () => sendBeaconProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendBeaconProgress();
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, [sendBeaconProgress]);

  useEffect(() => {
    setHasError(false);
    const initPlayer = () => {
      if (!iframeRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            if (initialSeconds > 0 && playerRef.current?.seekTo) playerRef.current.seekTo(initialSeconds, true);
          },
          onStateChange: (event: { data: number }) => {
            if (timerRef.current) clearInterval(timerRef.current);
            const YTState = window.YT.PlayerState;
            if (event.data === YTState.PLAYING) {
              timerRef.current = setInterval(() => {
                if (!playerRef.current?.getCurrentTime) return;
                const curr = playerRef.current.getCurrentTime();
                currentTimeRef.current = curr;
                if (curr - lastReportedTimeRef.current >= 30) reportProgress(curr, false);
              }, 1000);
            } else if (event.data === YTState.PAUSED) {
              reportProgress(playerRef.current?.getCurrentTime?.() ?? currentTimeRef.current, false);
            } else if (event.data === YTState.ENDED) {
              reportProgress(playerRef.current?.getDuration?.() ?? currentTimeRef.current, true);
            }
          },
          onError: (event: { data: number }) => {
            if (event.data === 101 || event.data === 150) setHasError(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        initPlayer();
      };
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }
  }, [videoId, initialSeconds, reportProgress]);

  if (hasError) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-8 text-center', className)}>
        <AlertTriangle className="mb-3 size-10 text-warning" aria-hidden="true" />
        <h4 className="text-base font-semibold text-ink">Playback restricted by YouTube</h4>
        <p className="mt-1 max-w-sm text-xs text-ink-muted">The owner does not allow embedded playback on external sites.</p>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="mt-4">
          <Button variant="primary">
            <span className="inline-flex items-center gap-1.5">Open on YouTube <ExternalLink className="size-4" /></span>
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-surface-inverse', className)}>
      <iframe
        ref={iframeRef}
        id={`yt-player-${videoId}`}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
        title="YouTube lesson player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
};

export default YouTubePlayer;
