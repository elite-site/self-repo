import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  setPlaybackRate: (rate: number) => void;
}

export interface YouTubePlayerProps {
  videoId: string;
  lessonId?: string;
  initialSeconds?: number;
  onProgress?: (seconds: number, completed: boolean) => void;
  onTimeUpdate?: (seconds: number) => void; // Emitted continuously (every 250ms when playing) for real-time transcript sync
  onDuration?: (duration: number) => void; // Emitted when video duration is available
  onPlayerReady?: (player: YouTubePlayerHandle) => void;
  isTheater?: boolean;
  onToggleTheater?: () => void;
  className?: string;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedMins = String(mins).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  lessonId,
  initialSeconds = 0,
  onProgress,
  onTimeUpdate,
  onDuration,
  onPlayerReady,
  isTheater,
  onToggleTheater,
  className,
}) => {
  const cleanVideoId = (() => {
    if (!videoId) return '';
    const match = videoId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : videoId;
  })();

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const currentTimeRef = useRef(initialSeconds);
  const durationRef = useRef(0);
  const lastReportedTimeRef = useRef(initialSeconds);
  const isCompletedRef = useRef(false);
  const prevVideoIdRef = useRef(cleanVideoId);
  const initialVideoIdRef = useRef(cleanVideoId);
  if (!initialVideoIdRef.current && cleanVideoId) {
    initialVideoIdRef.current = cleanVideoId;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialSeconds);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInternalTheater, setIsInternalTheater] = useState(false);
  const [hasError, setHasError] = useState(false);

  const onProgressRef = useRef(onProgress);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationRef = useRef(onDuration);
  const onPlayerReadyRef = useRef(onPlayerReady);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onTimeUpdateRef.current = onTimeUpdate;
    onDurationRef.current = onDuration;
    onPlayerReadyRef.current = onPlayerReady;
  });

  const reportProgress = useCallback((seconds: number, completed: boolean) => {
    currentTimeRef.current = seconds;
    lastReportedTimeRef.current = seconds;
    if (completed) isCompletedRef.current = true;
    onProgressRef.current?.(Math.floor(seconds), completed);
  }, []);

  const sendBeaconProgress = useCallback(() => {
    if (!lessonId || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const body = JSON.stringify({
      secondsWatched: Math.floor(currentTimeRef.current),
      maxPositionSec: Math.floor(currentTimeRef.current),
      completed: isCompletedRef.current,
    });
    navigator.sendBeacon(
      `/api/student/learning/lessons/${lessonId}/progress`,
      new Blob([body], { type: 'application/json' })
    );
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

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo?.();
    } else {
      playerRef.current.playVideo?.();
    }
  }, [isPlaying]);

  const seekDelta = useCallback(
    (delta: number) => {
      if (!playerRef.current) return;
      const curr = playerRef.current.getCurrentTime?.() ?? currentTimeRef.current;
      const maxDur = durationRef.current || playerRef.current.getDuration?.() || 0;
      const target = Math.max(0, maxDur > 0 ? Math.min(curr + delta, maxDur) : curr + delta);
      playerRef.current.seekTo?.(target, true);
      currentTimeRef.current = target;
      setCurrentTime(target);
      onTimeUpdateRef.current?.(target);
      reportProgress(target, false);
    },
    [reportProgress]
  );

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = Number.parseFloat(e.target.value);
      if (!Number.isFinite(target)) return;
      currentTimeRef.current = target;
      setCurrentTime(target);
      playerRef.current?.seekTo?.(target, true);
      onTimeUpdateRef.current?.(target);
      reportProgress(target, false);
    },
    [reportProgress]
  );

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed);
    playerRef.current?.setPlaybackRate?.(speed);
    setIsSpeedOpen(false);
  }, []);

  const theaterActive = isTheater !== undefined ? isTheater : isInternalTheater;

  const handleToggleTheater = useCallback(() => {
    if (onToggleTheater) {
      onToggleTheater();
    } else {
      setIsInternalTheater((prev) => !prev);
    }
  }, [onToggleTheater]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isSpeedOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSpeedOpen]);

  const createPlayerHandle = useCallback(
    () => ({
      seekTo: (sec: number) => {
        playerRef.current?.seekTo?.(sec, true);
        currentTimeRef.current = sec;
        setCurrentTime(sec);
        onTimeUpdateRef.current?.(sec);
      },
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      setPlaybackRate: (rate: number) => {
        playerRef.current?.setPlaybackRate?.(rate);
        setPlaybackRate(rate);
      },
    }),
    []
  );

  useEffect(() => {
    setHasError(false);

    const initPlayer = () => {
      if (!iframeRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            if (initialSeconds > 0 && playerRef.current?.seekTo) {
              playerRef.current.seekTo(initialSeconds, true);
            }
            const dur = playerRef.current?.getDuration?.() ?? 0;
            if (dur > 0) {
              durationRef.current = dur;
              setDuration(dur);
              onDurationRef.current?.(dur);
            }
            onPlayerReadyRef.current?.(createPlayerHandle());
          },
          onStateChange: (event: { data: number }) => {
            if (timerRef.current) clearInterval(timerRef.current);
            const YTState = window.YT.PlayerState;

            if (event.data === YTState.PLAYING) {
              setIsPlaying(true);
              const dur = playerRef.current?.getDuration?.() ?? 0;
              if (dur > 0 && dur !== durationRef.current) {
                durationRef.current = dur;
                setDuration(dur);
                onDurationRef.current?.(dur);
              }

              timerRef.current = setInterval(() => {
                if (!playerRef.current?.getCurrentTime) return;
                const curr = playerRef.current.getCurrentTime();
                currentTimeRef.current = curr;
                setCurrentTime(curr);
                onTimeUpdateRef.current?.(curr);

                if (curr - lastReportedTimeRef.current >= 30) {
                  reportProgress(curr, false);
                }

                if (durationRef.current <= 0) {
                  const currentDur = playerRef.current.getDuration?.() ?? 0;
                  if (currentDur > 0) {
                    durationRef.current = currentDur;
                    setDuration(currentDur);
                    onDurationRef.current?.(currentDur);
                  }
                }
              }, 250);
            } else if (event.data === YTState.PAUSED) {
              setIsPlaying(false);
              const curr = playerRef.current?.getCurrentTime?.() ?? currentTimeRef.current;
              currentTimeRef.current = curr;
              setCurrentTime(curr);
              onTimeUpdateRef.current?.(curr);
              reportProgress(curr, false);
            } else if (event.data === YTState.ENDED) {
              setIsPlaying(false);
              const dur = playerRef.current?.getDuration?.() ?? currentTimeRef.current;
              currentTimeRef.current = dur;
              setCurrentTime(dur);
              onTimeUpdateRef.current?.(dur);
              reportProgress(dur, true);
            }
          },
          onPlaybackRateChange: (event: { data: number }) => {
            if (typeof event.data === 'number') {
              setPlaybackRate(event.data);
            }
          },
          onError: (event: { data: number }) => {
            if (event.data === 101 || event.data === 150) {
              setHasError(true);
            }
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
  }, [createPlayerHandle, initialSeconds, reportProgress]);

  useEffect(() => {
    if (prevVideoIdRef.current !== cleanVideoId) {
      if (prevVideoIdRef.current) {
        sendBeaconProgress();
      }
      prevVideoIdRef.current = cleanVideoId;
      currentTimeRef.current = initialSeconds;
      lastReportedTimeRef.current = initialSeconds;
      isCompletedRef.current = false;
      setCurrentTime(initialSeconds);
      setDuration(0);
      durationRef.current = 0;
      setIsPlaying(false);
      setHasError(false);

      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: cleanVideoId,
          startSeconds: initialSeconds,
        });
      }
    }
  }, [cleanVideoId, initialSeconds, sendBeaconProgress]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isTextInput =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
      target.getAttribute('type') !== 'range';

    if (isTextInput || target.isContentEditable) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'j':
      case 'J':
      case 'ArrowLeft':
        e.preventDefault();
        seekDelta(-10);
        break;
      case 'l':
      case 'L':
      case 'ArrowRight':
        e.preventDefault();
        seekDelta(10);
        break;
      case 't':
      case 'T':
        e.preventDefault();
        handleToggleTheater();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        break;
    }
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-8 text-center',
          className
        )}
      >
        <AlertTriangle className="mb-3 size-10 text-warning" aria-hidden="true" />
        <h4 className="text-base font-semibold text-ink">Playback restricted by YouTube</h4>
        <p className="mt-1 max-w-sm text-xs text-ink-muted">
          The owner does not allow embedded playback on external sites.
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${cleanVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4"
        >
          <Button variant="primary">
            <span className="inline-flex items-center gap-1.5">
              Open on YouTube <ExternalLink className="size-4" />
            </span>
          </Button>
        </a>
      </div>
    );
  }

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Video Player"
      className={cn(
        'group relative flex flex-col w-full overflow-hidden rounded-xl bg-surface-inverse border border-edge shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
        theaterActive && 'w-full max-w-none shadow-2xl',
        isFullscreen && 'h-full w-full justify-between rounded-none border-0',
        className
      )}
    >
      {/* Video Viewport */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-black',
          isFullscreen ? 'flex-1 flex items-center justify-center' : 'aspect-video'
        )}
      >
        <iframe
          ref={iframeRef}
          id="yt-player-iframe"
          src={`https://www.youtube-nocookie.com/embed/${initialVideoIdRef.current || cleanVideoId}?enablejsapi=1&origin=${encodeURIComponent(
            typeof window !== 'undefined' ? window.location.origin : ''
          )}&rel=0&iv_load_policy=3&playsinline=1`}
          title="YouTube lesson player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>

      {/* Modern Cinema Toolbar */}
      <div className="flex flex-col border-t border-edge bg-surface-sunken/95 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm select-none">
        {/* Scrubber / Progress Bar */}
        <div className="group/scrubber relative flex items-center h-4 cursor-pointer">
          <div className="relative h-1.5 w-full rounded-full bg-edge/50 overflow-hidden group-hover/scrubber:h-2 transition-all">
            <div
              className="h-full bg-brand rounded-full transition-[width] duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            role="slider"
            aria-label="Seek video slider"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 pt-1.5">
          {/* Left: Play/Pause, -10s, +10s, Time display */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause video (Space or k)' : 'Play video (Space or k)'}
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:text-brand hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="size-5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekDelta(-10)}
              aria-label="Jump back 10 seconds (j or Left Arrow)"
              title="Rewind 10s (j)"
              className="inline-flex h-11 min-w-[44px] px-2 items-center justify-center gap-0.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="text-[11px] font-semibold tabular-nums leading-none">10</span>
            </button>

            <button
              type="button"
              onClick={() => seekDelta(10)}
              aria-label="Jump forward 10 seconds (l or Right Arrow)"
              title="Forward 10s (l)"
              className="inline-flex h-11 min-w-[44px] px-2 items-center justify-center gap-0.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
              <RotateCw className="size-4" aria-hidden="true" />
              <span className="text-[11px] font-semibold tabular-nums leading-none">10</span>
            </button>

            <div
              className="flex items-center pl-1 sm:pl-2 text-xs font-mono font-medium text-ink-secondary tabular-nums select-none"
              aria-live="off"
            >
              <span className="text-ink">{formatTime(currentTime)}</span>
              <span className="mx-1 text-ink-muted">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Playback speed, Theater mode, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Speed Selector */}
            <div className="relative" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setIsSpeedOpen((prev) => !prev)}
                aria-label={`Playback speed: ${playbackRate}x`}
                aria-haspopup="listbox"
                aria-expanded={isSpeedOpen}
                title="Playback speed"
                className="inline-flex h-11 min-w-[44px] px-2.5 items-center justify-center rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
              >
                <span>{playbackRate}x</span>
              </button>

              {isSpeedOpen && (
                <div
                  role="listbox"
                  aria-label="Select playback speed"
                  className="absolute bottom-full right-0 mb-2 w-24 rounded-lg border border-edge bg-surface-raised py-1 shadow-lg z-30"
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
                          'flex w-full items-center justify-between px-3 py-1.5 text-xs text-left transition-colors',
                          isSelected
                            ? 'font-semibold text-brand bg-brand-soft/40'
                            : 'text-ink hover:bg-surface-sunken'
                        )}
                      >
                        <span>{rate}x</span>
                        {isSelected && <span className="text-[10px] text-brand">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theater Mode Button */}
            <button
              type="button"
              onClick={handleToggleTheater}
              aria-label={theaterActive ? 'Exit theater mode (t)' : 'Theater mode (t)'}
              title={theaterActive ? 'Exit theater mode (t)' : 'Theater mode (t)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
              {theaterActive ? (
                <Minimize2 className="size-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
              title={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
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

export default YouTubePlayer;
