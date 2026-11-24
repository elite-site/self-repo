import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { getApiBaseUrl } from '@/shared/api/client';
import { useAutoHideControls } from '@/shared/hooks/useAutoHideControls';
import { formatTimestamp, formatAriaTimestamp } from '../lib/timecode';
import { usePlayback } from '../hooks/usePlayback';
import { useLessonShortcuts } from '../hooks/useLessonShortcuts';

export interface VideoLessonPlayerProps {
  lessonId: string;
  initialSeconds?: number;
  maxPositionSec?: number;
  durationSec?: number | null;
  onProgress?: (progress: { secondsWatched: number; maxPositionSec: number; completed?: boolean }) => void;
  onTimeUpdate?: (seconds: number) => void;
  isTheater?: boolean;
  onToggleTheater?: () => void;
  nextLessonTitle?: string;
  onNextLesson?: () => void;
  className?: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  lessonId,
  initialSeconds = 0,
  maxPositionSec = 0,
  durationSec,
  onProgress,
  onTimeUpdate,
  isTheater = false,
  onToggleTheater,
  nextLessonTitle,
  onNextLesson,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Playback lease & presigned URL from hook
  const { status, url, errorMessage, refreshUrl } = usePlayback(lessonId);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialSeconds);
  const [duration, setDuration] = useState(durationSec || 0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Auto-next countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracking refs
  const hasInitializedTimeRef = useRef(false);
  const prevUrlRef = useRef<string | null>(null);
  const swapStateRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);
  const currentTimeRef = useRef(initialSeconds);
  const durationRef = useRef(durationSec || 0);
  const maxPosRef = useRef(Math.max(initialSeconds, maxPositionSec));
  const secondsWatchedRef = useRef(Math.max(initialSeconds, maxPositionSec));

  const onProgressRef = useRef(onProgress);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onNextLessonRef = useRef(onNextLesson);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onTimeUpdateRef.current = onTimeUpdate;
    onNextLessonRef.current = onNextLesson;
  });

  const { visible: controlsVisible, reveal, scheduleHide } = useAutoHideControls();

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Sync initial seconds on lesson change
  useEffect(() => {
    hasInitializedTimeRef.current = false;
    swapStateRef.current = null;
    prevUrlRef.current = null;
    setVideoError(null);
    setIsEnded(false);
    setCountdown(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    const start = Math.max(initialSeconds || 0, maxPositionSec || 0);
    currentTimeRef.current = start;
    maxPosRef.current = start;
    secondsWatchedRef.current = start;
    setCurrentTime(start);
    if (durationSec) {
      setDuration(durationSec);
      durationRef.current = durationSec;
    }
  }, [lessonId, initialSeconds, maxPositionSec, durationSec]);

  // Report progress callback
  const reportProgress = useCallback(() => {
    const video = videoRef.current;
    const cur = video ? video.currentTime : currentTimeRef.current;
    const maxPos = Math.max(maxPosRef.current, cur);
    maxPosRef.current = maxPos;
    const secWatched = Math.max(secondsWatchedRef.current, cur);
    secondsWatchedRef.current = secWatched;

    const dur = durationRef.current || durationSec || 0;
    const completed = dur > 0 && secWatched / dur >= 0.9;

    onProgressRef.current?.({
      secondsWatched: Math.floor(secWatched),
      maxPositionSec: Math.floor(maxPos),
      completed,
    });
  }, [durationSec]);

  const sendBeaconProgress = useCallback(() => {
    if (!lessonId || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return;
    }
    try {
      const cur = videoRef.current ? videoRef.current.currentTime : currentTimeRef.current;
      const maxPos = Math.max(maxPosRef.current, cur);
      const secWatched = Math.max(secondsWatchedRef.current, cur);
      const dur = durationRef.current || durationSec || 0;
      const completed = dur > 0 && secWatched / dur >= 0.9;

      const body = JSON.stringify({
        secondsWatched: Math.floor(secWatched),
        maxPositionSec: Math.floor(maxPos),
        completed,
      });
      const endpoint = `${getApiBaseUrl()}/student/learning/lessons/${lessonId}/progress`;
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } catch (err) {
      console.warn('VideoLessonPlayer: sendBeacon failed non-fatally:', err);
    }
  }, [lessonId, durationSec]);

  // Cleanup & send progress on unmount
  useEffect(() => {
    const handleBeforeUnload = () => sendBeaconProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendBeaconProgress();
      reportProgress();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [sendBeaconProgress, reportProgress]);

  // Periodic 10s progress reporter while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      reportProgress();
    }, 10_000);
    return () => clearInterval(interval);
  }, [isPlaying, reportProgress]);

  // Auto-hide controls triggers
  useEffect(() => {
    scheduleHide({ isPlaying, containerRef });
  }, [isPlaying, scheduleHide]);

  // URL swap handling: preserve currentTime and playback state
  useEffect(() => {
    if (prevUrlRef.current && url && prevUrlRef.current !== url && videoRef.current) {
      const video = videoRef.current;
      const savedTime = video.currentTime;
      const wasPlaying = !video.paused && !video.ended;
      swapStateRef.current = { time: savedTime, wasPlaying };
    }
    prevUrlRef.current = url;
  }, [url]);

  const restoreSwapStateOrInitial = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (swapStateRef.current) {
      const { time, wasPlaying } = swapStateRef.current;
      swapStateRef.current = null;
      video.currentTime = time;
      setCurrentTime(time);
      currentTimeRef.current = time;
      if (wasPlaying) {
        video.play().catch(() => {});
      }
    } else if (!hasInitializedTimeRef.current) {
      const start = Math.max(initialSeconds || 0, maxPositionSec || 0);
      if (start > 0 && Number.isFinite(start)) {
        video.currentTime = start;
        setCurrentTime(start);
        currentTimeRef.current = start;
      }
      hasInitializedTimeRef.current = true;
    }
  }, [initialSeconds, maxPositionSec]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.duration && Number.isFinite(video.duration)) {
      setDuration(video.duration);
      durationRef.current = video.duration;
    }

    restoreSwapStateOrInitial();
    updateBuffered();
  };

  const handleCanPlay = () => {
    restoreSwapStateOrInitial();
    setIsBuffering(false);
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0 || !video.duration) return;
    try {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBufferedFraction(Math.min(1, Math.max(0, bufferedEnd / video.duration)));
    } catch {
      // ignore
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);
    currentTimeRef.current = cur;
    maxPosRef.current = Math.max(maxPosRef.current, cur);
    secondsWatchedRef.current = Math.max(secondsWatchedRef.current, cur);
    onTimeUpdateRef.current?.(cur);
    updateBuffered();
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsEnded(false);
    setIsBuffering(false);
    setCountdown(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    reportProgress();
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsEnded(true);
    reportProgress();

    if (onNextLessonRef.current) {
      setCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            onNextLessonRef.current?.();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const code = video?.error?.code;
    const msg =
      code === 2
        ? 'Network error while fetching video'
        : code === 3
        ? 'Video decoding error'
        : code === 4
        ? 'Playback lease expired or video format unsupported'
        : 'Playback error occurred';
    setVideoError(msg);
  };

  // Playback control actions
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
        setIsEnded(false);
        setCountdown(null);
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seekDelta = useCallback(
    (deltaSec: number) => {
      const video = videoRef.current;
      if (!video) return;
      const target = Math.max(0, Math.min(duration || 100, video.currentTime + deltaSec));
      video.currentTime = target;
      setCurrentTime(target);
      currentTimeRef.current = target;
    },
    [duration],
  );

  const seekTo = useCallback(
    (targetSec: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(0, Math.min(duration || 100, targetSec));
      video.currentTime = clamped;
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
    },
    [duration],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol / 100;
      if (newVol > 0 && video.muted) {
        video.muted = false;
        setIsMuted(false);
      } else if (newVol === 0 && !video.muted) {
        video.muted = true;
        setIsMuted(true);
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    setPlaybackRate(rate);
    setIsSpeedOpen(false);
  };

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed non-fatally:', err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cancel auto-next countdown
  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  // Replay action
  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsEnded(false);
    setCountdown(null);
    video.currentTime = 0;
    setCurrentTime(0);
    video.play().catch(() => {});
  };

  // Attach keyboard shortcuts
  useLessonShortcuts({
    onPlayPause: togglePlayPause,
    onSeek: seekDelta,
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    enabled: status === 'READY' && !videoError,
  });

  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 't' || e.key === 'T') {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      e.preventDefault();
      onToggleTheater?.();
    } else if (e.key === 'Escape') {
      setIsSpeedOpen(false);
    }
  };

  // Click / pointer handlers for UI activity
  const handlePointerMove = useCallback(() => {
    reveal();
    scheduleHide({ isPlaying, containerRef });
  }, [reveal, scheduleHide, isPlaying]);

  // Progress bar percentages
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent = Math.min(100, bufferedFraction * 100);
  const maxPositionPercent =
    duration > 0 && maxPositionSec ? Math.min(100, Math.max(0, (maxPositionSec / duration) * 100)) : 0;

  // ── UI States (ERR-17) ──────────────────────────────────────────────────────

  if (status === 'PREPARING') {
    return (
      <div
        className={cn(
          'relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-8 text-center shadow-md',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mb-3 size-10 animate-spin text-brand" aria-hidden="true" />
        <h4 className="text-body-md font-semibold text-ink">Preparing your video...</h4>
        <p className="mt-1 max-w-sm text-label-xs text-ink-muted">
          This may take a few moments. We are preparing high-quality playback for your session.
        </p>
      </div>
    );
  }

  if (status === 'ERROR') {
    return (
      <div
        className={cn(
          'relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-6 text-center shadow-md',
          className,
        )}
      >
        <ErrorState
          title="Unable to load video playback"
          message={errorMessage || 'We encountered an error while securing your playback session.'}
          onRetry={refreshUrl}
        />
      </div>
    );
  }

  if (videoError) {
    return (
      <div
        className={cn(
          'relative flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-6 text-center shadow-md',
          className,
        )}
      >
        <AlertTriangle className="mb-3 size-10 text-warning" aria-hidden="true" />
        <h4 className="text-body-md font-semibold text-ink">Video Playback Error</h4>
        <p className="mt-1 max-w-sm text-label-xs text-ink-muted">{videoError}</p>
        <Button
          variant="primary"
          onClick={() => {
            setVideoError(null);
            void refreshUrl();
          }}
          className="mt-4"
        >
          Retry Video
        </Button>
      </div>
    );
  }

  const controlsClass = cn(
    'absolute inset-x-0 bottom-0 select-none transition-opacity duration-quick z-20',
    controlsVisible || !isPlaying ? 'opacity-100' : 'pointer-events-none opacity-0',
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onPointerMove={handlePointerMove}
      onFocus={reveal}
      role="region"
      aria-label="Video Player"
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl bg-black shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        isTheater && 'w-full max-w-none shadow-2xl',
        isFullscreen && 'h-full w-full justify-between rounded-none',
        className,
      )}
    >
      {/* HTML5 video element */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-black',
          isFullscreen ? 'flex flex-1 items-center justify-center' : 'aspect-video',
        )}
        onClick={togglePlayPause}
        aria-hidden="true"
      >
        {url && (
          <video
            ref={videoRef}
            src={url}
            preload="metadata"
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            onEnded={handleEnded}
            onError={handleVideoError}
            className="h-full w-full object-contain"
            aria-label="Lesson video content"
          />
        )}
      </div>

      {/* Centre play / pause overlay (when paused & not ended) */}
      {!isBuffering && !isEnded && (
        <button
          type="button"
          onClick={togglePlayPause}
          tabIndex={-1}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full',
            'bg-black/40 text-on-brand backdrop-blur-sm transition-opacity duration-normal z-10',
            isPlaying ? 'opacity-0' : 'pointer-events-auto opacity-100',
          )}
        >
          <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
        </button>
      )}

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="size-10 animate-spin text-on-brand" aria-hidden="true" />
          <p role="status" className="sr-only">
            Loading video
          </p>
        </div>
      )}

      {/* End screen / Auto-next countdown overlay */}
      {isEnded && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center text-on-brand"
          role="dialog"
          aria-label="Video ended"
        >
          {countdown !== null ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'flex size-14 items-center justify-center rounded-full bg-brand font-mono text-heading-md font-bold text-on-brand shadow-lg',
                  !prefersReducedMotion && 'animate-pulse',
                )}
                aria-live="assertive"
              >
                {countdown}
              </div>
              <h3 className="text-body-lg font-semibold">Next lesson in {countdown}...</h3>
              {nextLessonTitle && (
                <p className="max-w-md text-label-sm text-on-brand/80 truncate">{nextLessonTitle}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelCountdown}
                  className="min-h-[44px] min-w-[80px]"
                >
                  Cancel
                </Button>
                {onNextLesson && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (countdownTimerRef.current) {
                        clearInterval(countdownTimerRef.current);
                        countdownTimerRef.current = null;
                      }
                      setCountdown(null);
                      onNextLesson();
                    }}
                    className="min-h-[44px] gap-1.5"
                  >
                    <span>Play Now</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-label-lg font-semibold text-on-brand">Video ended</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/15 px-4 text-label-sm font-semibold text-on-brand transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  <span>Replay</span>
                </button>
                {onNextLesson && (
                  <button
                    type="button"
                    onClick={onNextLesson}
                    aria-label={nextLessonTitle ? `Next lesson: ${nextLessonTitle}` : 'Next lesson'}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-label-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <span>{nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next lesson'}</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div className={controlsClass}>
        {/* Flat scrim behind controls */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-scrim" />

        {/* Time / Seek bar */}
        <div className="relative px-3 pt-6 sm:px-4">
          <div className="group/bar relative h-4 cursor-pointer">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 transition-all duration-fast group-hover/bar:h-2">
              {/* Buffered progress layer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Max position (previously reached) layer */}
              {maxPositionPercent > progressPercent && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand/40"
                  style={{ width: `${maxPositionPercent}%` }}
                  aria-hidden="true"
                />
              )}
              {/* Played progress layer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-150 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Accessible range input for seeking */}
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              aria-label="Seek video"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={formatAriaTimestamp(currentTime, duration)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        {/* Controls toolbar */}
        <div className="relative flex items-center justify-between gap-2 px-3 pb-2 pt-1.5 sm:px-4">
          {/* Left group */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause video (Space or k)' : 'Play video (Space or k)'}
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekDelta(-5)}
              aria-label="Jump back 5 seconds (j or Left Arrow)"
              title="Rewind 5s (j)"
              className="inline-flex h-11 min-w-[44px] items-center justify-center gap-0.5 rounded-lg px-2 text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="text-label-xs font-semibold tabular-nums">5</span>
            </button>

            <button
              type="button"
              onClick={() => seekDelta(5)}
              aria-label="Jump forward 5 seconds (l or Right Arrow)"
              title="Forward 5s (l)"
              className="inline-flex h-11 min-w-[44px] items-center justify-center gap-0.5 rounded-lg px-2 text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCw className="size-4" aria-hidden="true" />
              <span className="text-label-xs font-semibold tabular-nums">5</span>
            </button>

            <div
              className="flex items-center pl-1 font-mono text-label-xs font-medium tabular-nums text-on-brand/80 select-none sm:pl-2"
              aria-live="off"
            >
              <span className="text-on-brand">{formatTimestamp(currentTime)}</span>
              <span className="mx-1 text-on-brand/50">/</span>
              <span>{formatTimestamp(duration)}</span>
            </div>

            {/* Mute button */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video (m)' : 'Mute video (m)'}
              title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {isMuted ? (
                <VolumeX className="size-4" aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" aria-hidden="true" />
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              aria-valuetext={`${isMuted ? 0 : volume} percent`}
              className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black md:block"
            />
          </div>

          {/* Right group */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Playback speed selector */}
            <div className="relative" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setIsSpeedOpen((prev) => !prev)}
                aria-label={`Playback speed: ${playbackRate}x`}
                aria-haspopup="listbox"
                aria-expanded={isSpeedOpen}
                title="Playback speed"
                className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg px-2.5 text-label-xs font-semibold text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>{playbackRate}x</span>
              </button>

              {isSpeedOpen && (
                <div
                  role="listbox"
                  aria-label="Select playback speed"
                  className="absolute bottom-full right-0 z-30 mb-2 w-24 rounded-lg border border-edge bg-surface-raised py-1 shadow-lg"
                >
                  {PLAYBACK_RATES.map((rate) => {
                    const isSelected = playbackRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSpeedChange(rate)}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-1.5 text-left text-label-xs transition-colors',
                          isSelected
                            ? 'font-semibold text-brand bg-brand-soft/40'
                            : 'text-ink hover:bg-surface-sunken',
                        )}
                      >
                        <span>{rate}x</span>
                        {isSelected && (
                          <span className="text-[10px] text-brand" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theater mode button */}
            {onToggleTheater && (
              <button
                type="button"
                onClick={onToggleTheater}
                aria-label={isTheater ? 'Exit theater mode (t)' : 'Theater mode (t)'}
                title={isTheater ? 'Exit theater mode (t)' : 'Theater mode (t)'}
                className="inline-flex size-11 items-center justify-center rounded-lg text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {isTheater ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
              title={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {isFullscreen ? (
                <Minimize className="size-4" aria-hidden="true" />
              ) : (
                <Maximize className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
