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
  ExternalLink,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';
import { getApiBaseUrl } from '@/shared/api/client';
import { useAutoHideControls } from '@/shared/hooks/useAutoHideControls';
import { formatTimestamp, formatAriaTimestamp } from '../lib/timecode';
import type { TranscriptSegment } from '../types';

// ─── YouTube IFrame API types ────────────────────────────────────────────────

/**
 * Minimal typed surface for the YouTube IFrame Player instance.
 * Using a real interface eliminates all `any` usage on `playerRef` (STYLE-3).
 */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(opts: { videoId: string; startSeconds: number }): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLIFrameElement,
        options: { events: YTEvents },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTEvents {
  onReady: () => void;
  onStateChange: (event: { data: number }) => void;
  onPlaybackRateChange: (event: { data: number }) => void;
  onError: (event: { data: number }) => void;
}

// ─── Public surface ──────────────────────────────────────────────────────────

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
  /** Seconds of the furthest point the student has ever reached in this lesson. */
  maxPositionSec?: number;
  /** Transcript segments used for the hover-preview bubble on the time bar. */
  transcriptSegments?: TranscriptSegment[];
  onProgress?: (seconds: number, completed: boolean) => void;
  /** Emitted every 250ms during playback for real-time transcript sync. */
  onTimeUpdate?: (seconds: number) => void;
  onDuration?: (duration: number) => void;
  onPlayerReady?: (player: YouTubePlayerHandle) => void;
  /** Called when the video reaches its end. */
  onEnded?: () => void;
  isTheater?: boolean;
  onToggleTheater?: () => void;
  /** Title of the next lesson shown on the end screen. */
  nextLessonTitle?: string;
  /** Navigates to the next lesson when called from the end screen. */
  onNextLesson?: () => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Set of YT error codes that mean the owner blocked embedding.
 * Named here so no magic numbers appear in the handler (AGENTS §1 QUAL-1).
 */
const YT_EMBED_ERROR_CODES = new Set([2, 5, 101, 150]);

// ─── One guarded YT API helper ───────────────────────────────────────────────

/**
 * Wraps every call to the YouTube IFrame API in a single try/catch.
 * On failure it warns once with the action name — the player is in an
 * unexpected state but the React tree must not crash (AGENTS ERR-9).
 *
 * `warned` is a ref the caller owns so each distinct action warns at most once
 * per player instance rather than flooding the console.
 */
function callYT(
  action: string,
  fn: () => void,
  warned: React.MutableRefObject<Set<string>>,
): void {
  try {
    fn();
  } catch (err) {
    if (!warned.current.has(action)) {
      warned.current.add(action);
      // Non-fatal: the player is in an unexpected internal state (e.g. the
      // iframe navigated away). We surface the problem once so developers
      // notice during testing but do not crash the student's session.
      console.warn(`YouTubePlayer: "${action}" failed non-fatally:`, err);
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  lessonId,
  initialSeconds = 0,
  maxPositionSec,
  transcriptSegments = [],
  onProgress,
  onTimeUpdate,
  onDuration,
  onPlayerReady,
  onEnded,
  isTheater,
  onToggleTheater,
  nextLessonTitle,
  onNextLesson,
  className,
}) => {
  const cleanVideoId = useMemo(() => {
    if (!videoId) return '';
    const match = videoId.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([wd-]{11})/,
    );
    return match ? match[1] : videoId;
  }, [videoId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isReadyRef = useRef(false);
  const pendingVideoRef = useRef<{ videoId: string; startSeconds: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const timeBarRef = useRef<HTMLDivElement>(null);
  const warnedRef = useRef<Set<string>>(new Set());

  const lessonIdRef = useRef(lessonId);
  useEffect(() => {
    lessonIdRef.current = lessonId;
  }, [lessonId]);

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
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialSeconds);
  const [duration, setDuration] = useState(0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInternalTheater, setIsInternalTheater] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Hover preview state for the time bar bubble.
  const [hoverPreview, setHoverPreview] = useState<{
    pct: number;
    time: string;
    line: string;
  } | null>(null);
  // Drag-on-release: track whether we are currently dragging the seek bar.
  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(0);

  const { visible: controlsVisible, reveal, scheduleHide } = useAutoHideControls();

  const onProgressRef = useRef(onProgress);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationRef = useRef(onDuration);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onTimeUpdateRef.current = onTimeUpdate;
    onDurationRef.current = onDuration;
    onPlayerReadyRef.current = onPlayerReady;
    onEndedRef.current = onEnded;
  });

  const reportProgress = useCallback((seconds: number, completed: boolean) => {
    currentTimeRef.current = seconds;
    lastReportedTimeRef.current = seconds;
    if (completed) isCompletedRef.current = true;
    onProgressRef.current?.(Math.floor(seconds), completed);
  }, []);

  const sendBeaconProgress = useCallback(() => {
    const activeLessonId = lessonIdRef.current;
    if (
      !activeLessonId ||
      typeof navigator === 'undefined' ||
      typeof navigator.sendBeacon !== 'function'
    )
      return;
    try {
      const body = JSON.stringify({
        secondsWatched: Math.floor(currentTimeRef.current),
        maxPositionSec: Math.floor(currentTimeRef.current),
        completed: isCompletedRef.current,
      });
      const url = `${getApiBaseUrl()}/student/learning/lessons/${activeLessonId}/progress`;
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } catch (err) {
      // Non-fatal: sendBeacon may be unavailable (e.g. in older browsers or
      // during SSR). The progress mutation covers this case on normal unmount.
      console.warn('YouTubePlayer: sendBeacon failed non-fatally:', err);
    }
  }, []);

  // Cleanup exclusively on component unmount.
  useEffect(() => {
    const handleBeforeUnload = () => sendBeaconProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendBeaconProgress();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playerRef.current) {
        callYT('destroy', () => playerRef.current?.destroy(), warnedRef);
        playerRef.current = null;
      }
      isReadyRef.current = false;
    };
  }, [sendBeaconProgress]);

  // Trigger auto-hide whenever play state changes.
  useEffect(() => {
    scheduleHide({ isPlaying, containerRef });
  }, [isPlaying, scheduleHide]);

  const handlePointerMove = useCallback(() => {
    reveal();
    scheduleHide({ isPlaying, containerRef });
  }, [reveal, scheduleHide, isPlaying]);

  const handleContainerFocus = useCallback(() => {
    reveal();
  }, [reveal]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      callYT('pauseVideo', () => playerRef.current?.pauseVideo(), warnedRef);
    } else {
      callYT('playVideo', () => playerRef.current?.playVideo(), warnedRef);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      callYT('unMute', () => playerRef.current?.unMute(), warnedRef);
      setIsMuted(false);
    } else {
      callYT('mute', () => playerRef.current?.mute(), warnedRef);
      setIsMuted(true);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setVolume(next);
      callYT('setVolume', () => playerRef.current?.setVolume(next), warnedRef);
      if (next === 0) {
        callYT('mute', () => playerRef.current?.mute(), warnedRef);
        setIsMuted(true);
      } else if (isMuted) {
        callYT('unMute', () => playerRef.current?.unMute(), warnedRef);
        setIsMuted(false);
      }
    },
    [isMuted],
  );

  const seekDelta = useCallback(
    (delta: number) => {
      let curr = currentTimeRef.current;
      let maxDur = durationRef.current;
      if (playerRef.current) {
        callYT(
          'getCurrentTime',
          () => {
            curr = playerRef.current!.getCurrentTime();
            maxDur = durationRef.current || playerRef.current!.getDuration() || 0;
          },
          warnedRef,
        );
      }
      const target = Math.max(0, maxDur > 0 ? Math.min(curr + delta, maxDur) : curr + delta);
      callYT('seekTo', () => playerRef.current?.seekTo(target, true), warnedRef);
      currentTimeRef.current = target;
      setCurrentTime(target);
      onTimeUpdateRef.current?.(target);
      reportProgress(target, false);
    },
    [reportProgress],
  );

  // ─── Seek bar: drag-on-release ─────────────────────────────────────────────
  // We commit the seek only on pointer-up, not on every pixel move.
  // Keyboard arrow changes on <input type="range"> seek immediately (they fire
  // a single change event per key press).

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      isDraggingRef.current = true;
      dragValueRef.current = Number((e.target as HTMLInputElement).value);
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Non-fatal: pointer capture unsupported in some testing environments
        }
      }
    },
    [],
  );

  const handleSeekPointerMove = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      if (!isDraggingRef.current) return;
      dragValueRef.current = Number((e.target as HTMLInputElement).value);
      // Update visual position without seeking so the bar is responsive.
      setCurrentTime(dragValueRef.current);
    },
    [],
  );

  const handleSeekPointerUp = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (typeof e.currentTarget.releasePointerCapture === 'function') {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Non-fatal: pointer capture unsupported in some testing environments
        }
      }
      const target = dragValueRef.current;
      callYT('seekTo', () => playerRef.current?.seekTo(target, true), warnedRef);
      currentTimeRef.current = target;
      setCurrentTime(target);
      onTimeUpdateRef.current?.(target);
      reportProgress(target, false);
    },
    [reportProgress],
  );

  // Keyboard arrows on the range fire `onChange` once per key — seek immediately.
  const handleSeekKeyboard = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = Number.parseFloat(e.target.value);
      if (!Number.isFinite(target)) return;

      if (isDraggingRef.current) {
        dragValueRef.current = target;
        setCurrentTime(target);
        return;
      }

      callYT('seekTo', () => playerRef.current?.seekTo(target, true), warnedRef);
      currentTimeRef.current = target;
      setCurrentTime(target);
      onTimeUpdateRef.current?.(target);
      reportProgress(target, false);
    },
    [reportProgress],
  );

  // ─── Time bar hover preview ────────────────────────────────────────────────

  const handleTimeBarMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = timeBarRef.current;
      if (!bar || durationRef.current <= 0) return;
      const rect = bar.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : bar.clientWidth > 0 ? bar.clientWidth : 100;
      const rawPct = (e.clientX - rect.left) / width;
      const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(1, rawPct)) : 0;
      const hoverSec = pct * durationRef.current;
      const timeStr = formatTimestamp(hoverSec);

      // Find the transcript line spoken at hoverSec.
      let line = '';
      if (transcriptSegments.length > 0) {
        const seg = transcriptSegments.find(
          (s) => hoverSec >= s.offset && hoverSec < s.offset + s.duration,
        );
        if (seg) line = seg.text;
      }

      setHoverPreview({ pct: pct * 100, time: timeStr, line });
    },
    [transcriptSegments],
  );

  const handleTimeBarMouseLeave = useCallback(() => {
    setHoverPreview(null);
  }, []);

  // ─── Playback speed ────────────────────────────────────────────────────────

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed);
    callYT('setPlaybackRate', () => playerRef.current?.setPlaybackRate(speed), warnedRef);
    setIsSpeedOpen(false);
  }, []);

  // Escape closes the speed menu.
  const handleSpeedKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSpeedOpen(false);
    }
  }, []);

  // Click-outside closes the speed menu.
  useEffect(() => {
    if (!isSpeedOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSpeedOpen]);

  // ─── Theater mode ──────────────────────────────────────────────────────────

  const theaterActive = isTheater !== undefined ? isTheater : isInternalTheater;

  const handleToggleTheater = useCallback(() => {
    if (onToggleTheater) {
      onToggleTheater();
    } else {
      setIsInternalTheater((prev) => !prev);
    }
  }, [onToggleTheater]);

  // ─── Fullscreen ────────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        // Non-fatal: the browser may deny fullscreen outside a user gesture.
        console.warn('YouTubePlayer: requestFullscreen failed non-fatally:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('YouTubePlayer: exitFullscreen failed non-fatally:', err);
      });
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // ─── Player handle (public API for parent components) ─────────────────────

  const createPlayerHandle = useCallback(
    (): YouTubePlayerHandle => ({
      seekTo: (sec: number) => {
        callYT('seekTo', () => playerRef.current?.seekTo(sec, true), warnedRef);
        currentTimeRef.current = sec;
        setCurrentTime(sec);
        onTimeUpdateRef.current?.(sec);
      },
      play: () => {
        callYT('playVideo', () => playerRef.current?.playVideo(), warnedRef);
      },
      pause: () => {
        callYT('pauseVideo', () => playerRef.current?.pauseVideo(), warnedRef);
      },
      setPlaybackRate: (rate: number) => {
        callYT('setPlaybackRate', () => playerRef.current?.setPlaybackRate(rate), warnedRef);
        setPlaybackRate(rate);
      },
    }),
    [],
  );

  // ─── Player initialization ─────────────────────────────────────────────────

  const initPlayer = useCallback(() => {
    if (!iframeRef.current || !window.YT?.Player) return;
    if (playerRef.current) return;

    callYT(
      'new YT.Player',
      () => {
        playerRef.current = new window.YT!.Player(iframeRef.current!, {
          events: {
            onReady: () => {
              isReadyRef.current = true;
              if (pendingVideoRef.current) {
                const pending = pendingVideoRef.current;
                pendingVideoRef.current = null;
                callYT(
                  'loadVideoById(pending)',
                  () =>
                    playerRef.current?.loadVideoById({
                      videoId: pending.videoId,
                      startSeconds: pending.startSeconds,
                    }),
                  warnedRef,
                );
              } else if (initialSeconds > 0) {
                callYT(
                  'seekTo(initial)',
                  () => playerRef.current?.seekTo(initialSeconds, true),
                  warnedRef,
                );
              }
              let dur = 0;
              callYT(
                'getDuration',
                () => {
                  dur = typeof playerRef.current?.getDuration === 'function' ? playerRef.current.getDuration() : 0;
                },
                warnedRef,
              );
              if (dur > 0) {
                durationRef.current = dur;
                setDuration(dur);
                onDurationRef.current?.(dur);
              }
              onPlayerReadyRef.current?.(createPlayerHandle());
            },
            onStateChange: (event: { data: number }) => {
              if (timerRef.current) clearInterval(timerRef.current);
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;

              if (event.data === YTState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
                setIsEnded(false);
                let dur = 0;
                callYT('getDuration', () => { dur = playerRef.current?.getDuration() ?? 0; }, warnedRef);
                if (dur > 0 && dur !== durationRef.current) {
                  durationRef.current = dur;
                  setDuration(dur);
                  onDurationRef.current?.(dur);
                }

                timerRef.current = setInterval(() => {
                  if (!playerRef.current) return;
                  callYT(
                    'getCurrentTime(tick)',
                    () => {
                      const curr = playerRef.current!.getCurrentTime();
                      currentTimeRef.current = curr;
                      setCurrentTime(curr);
                      onTimeUpdateRef.current?.(curr);

                      // Update buffered fraction for the time bar.
                      const frac = playerRef.current!.getVideoLoadedFraction();
                      setBufferedFraction(frac);

                      if (curr - lastReportedTimeRef.current >= 30) {
                        reportProgress(curr, false);
                      }

                      if (durationRef.current <= 0) {
                        const currentDur = playerRef.current!.getDuration() ?? 0;
                        if (currentDur > 0) {
                          durationRef.current = currentDur;
                          setDuration(currentDur);
                          onDurationRef.current?.(currentDur);
                        }
                      }
                    },
                    warnedRef,
                  );
                }, 250);
              } else if (event.data === YTState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
                let curr = currentTimeRef.current;
                callYT('getCurrentTime(pause)', () => { curr = playerRef.current?.getCurrentTime() ?? curr; }, warnedRef);
                currentTimeRef.current = curr;
                setCurrentTime(curr);
                onTimeUpdateRef.current?.(curr);
                reportProgress(curr, false);
              } else if (event.data === YTState.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);
                setIsEnded(true);
                let dur = currentTimeRef.current;
                callYT('getDuration(end)', () => { dur = playerRef.current?.getDuration() ?? dur; }, warnedRef);
                currentTimeRef.current = dur;
                setCurrentTime(dur);
                onTimeUpdateRef.current?.(dur);
                reportProgress(dur, true);
                onEndedRef.current?.();
              } else if (event.data === YTState.BUFFERING) {
                setIsBuffering(true);
              }
            },
            onPlaybackRateChange: (event: { data: number }) => {
              if (typeof event.data === 'number') {
                setPlaybackRate(event.data);
              }
            },
            onError: (event: { data: number }) => {
              if (YT_EMBED_ERROR_CODES.has(event.data)) {
                setHasError(true);
              }
            },
          },
        });
      },
      warnedRef,
    );
  }, [createPlayerHandle, initialSeconds, reportProgress]);

  useEffect(() => {
    setHasError(false);

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
  }, [initPlayer]);

  // Video-change effect: swap video without destroying the player.
  useEffect(() => {
    if (prevVideoIdRef.current !== cleanVideoId) {
      if (prevVideoIdRef.current && currentTimeRef.current > 0) {
        reportProgress(currentTimeRef.current, isCompletedRef.current);
      }
      prevVideoIdRef.current = cleanVideoId;
      currentTimeRef.current = initialSeconds;
      lastReportedTimeRef.current = initialSeconds;
      isCompletedRef.current = false;
      setCurrentTime(initialSeconds);
      setDuration(0);
      durationRef.current = 0;
      setIsPlaying(false);
      setIsEnded(false);
      setHasError(false);
      // Reset the one-time warn set so the new player starts fresh.
      warnedRef.current.clear();

      if (isReadyRef.current && playerRef.current) {
        try {
          if (typeof playerRef.current.loadVideoById === 'function') {
            playerRef.current.loadVideoById({
              videoId: cleanVideoId,
              startSeconds: initialSeconds,
            });
          }
        } catch {
          try {
            (playerRef.current as unknown as { loadVideoById?: (videoId: string, startSeconds: number) => void }).loadVideoById?.(cleanVideoId, initialSeconds);
          } catch (err) {
            console.warn('YouTubePlayer: loadVideoById failed non-fatally, resetting player:', err);
            isReadyRef.current = false;
            try {
              playerRef.current?.destroy?.();
            } catch (destroyErr) {
              console.warn('YouTubePlayer: destroy failed non-fatally:', destroyErr);
            }
            playerRef.current = null;
            pendingVideoRef.current = { videoId: cleanVideoId, startSeconds: initialSeconds };
            initPlayer();
          }
        }
      } else {
        pendingVideoRef.current = { videoId: cleanVideoId, startSeconds: initialSeconds };
        initialVideoIdRef.current = cleanVideoId;
      }
    }
  }, [cleanVideoId, initialSeconds, reportProgress, initPlayer]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isTextInput =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
      target.getAttribute('type') !== 'range';

    if (isTextInput || target.isContentEditable) return;

    // If a button inside the player has focus, Space should activate it, not
    // toggle playback. Only intercept Space when the container itself is focused.
    if (e.key === ' ' && target !== e.currentTarget && target.tagName === 'BUTTON') return;

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
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'Escape':
        setIsSpeedOpen(false);
        break;
      default:
        break;
    }
  };

  // ─── Derived values ────────────────────────────────────────────────────────

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent = Math.min(100, bufferedFraction * 100);
  const maxPositionPercent =
    duration > 0 && maxPositionSec
      ? Math.min(100, Math.max(0, (maxPositionSec / duration) * 100))
      : 0;

  // ─── Error state ───────────────────────────────────────────────────────────

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-edge bg-surface-sunken p-8 text-center',
          className,
        )}
      >
        <AlertTriangle className="mb-3 size-10 text-warning" aria-hidden="true" />
        <h4 className="text-body-md font-semibold text-ink">Playback restricted by YouTube</h4>
        <p className="mt-1 max-w-sm text-label-xs text-ink-muted">
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
              Open on YouTube <ExternalLink className="size-4" aria-hidden="true" />
            </span>
          </Button>
        </a>
      </div>
    );
  }

  // ─── Controls overlay ──────────────────────────────────────────────────────

  const controlsClass = cn(
    'absolute inset-x-0 bottom-0 select-none transition-opacity duration-quick',
    controlsVisible || !isPlaying
      ? 'opacity-100'
      : 'pointer-events-none opacity-0',
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onFocus={handleContainerFocus}
      role="region"
      aria-label="Video Player"
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl bg-black shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        theaterActive && 'w-full max-w-none shadow-2xl',
        isFullscreen && 'h-full w-full justify-between rounded-none',
        className,
      )}
    >
      {/* Video iframe */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-black',
          isFullscreen ? 'flex flex-1 items-center justify-center' : 'aspect-video',
        )}
        onClick={togglePlayPause}
        // Keyboard users trigger play/pause on the container div via onKeyDown above.
        aria-hidden="true"
      >
        <iframe
          ref={iframeRef}
          id="yt-player-iframe"
          src={`https://www.youtube-nocookie.com/embed/${initialVideoIdRef.current || cleanVideoId}?enablejsapi=1&origin=${encodeURIComponent(
            typeof window !== 'undefined' ? window.location.origin : '',
          )}&rel=0&iv_load_policy=3&playsinline=1&controls=0`}
          title="YouTube lesson player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>

      {/* Centre play / pause overlay (shown when paused, not buffering) */}
      {!isBuffering && !isEnded && (
        <button
          type="button"
          onClick={togglePlayPause}
          tabIndex={-1}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full',
            'bg-black/40 text-on-brand backdrop-blur-sm transition-opacity duration-normal',
            isPlaying ? 'opacity-0' : 'pointer-events-auto opacity-100',
          )}
        >
          <Play className="ml-1 size-7" aria-hidden="true" />
        </button>
      )}

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-10 animate-spin text-on-brand" aria-hidden="true" />
          <p role="status" className="sr-only">Loading video</p>
        </div>
      )}

      {/* End screen */}
      {isEnded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center">
          <p className="text-label-lg font-semibold text-on-brand">Video ended</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEnded(false);
                callYT('seekTo(replay)', () => playerRef.current?.seekTo(0, true), warnedRef);
                callYT('playVideo(replay)', () => playerRef.current?.playVideo(), warnedRef);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/15 px-4 text-label-sm font-semibold text-on-brand transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Replay
            </button>
            {onNextLesson && (
              <button
                type="button"
                onClick={onNextLesson}
                aria-label={nextLessonTitle ? `Next lesson: ${nextLessonTitle}` : 'Next lesson'}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-label-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
                {nextLessonTitle ? `Next: ${nextLessonTitle}` : 'Next lesson'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={controlsClass}>
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Time bar */}
        <div
          ref={timeBarRef}
          className="relative px-3 pt-6 sm:px-4"
          onMouseMove={handleTimeBarMouseMove}
          onMouseLeave={handleTimeBarMouseLeave}
        >
          {/* Hover preview bubble */}
          {hoverPreview && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-label-xs text-on-brand shadow-lg pointer-events-none z-10"
              style={{ left: `${hoverPreview.pct}%` }}
              aria-hidden="true"
            >
              <span className="font-mono font-semibold">{hoverPreview.time}</span>
              {hoverPreview.line && (
                <span className="ml-1.5 max-w-[200px] truncate text-white/70">
                  {hoverPreview.line}
                </span>
              )}
            </div>
          )}

          {/* Track layers: buffered → previously-watched → played, plus native range overlay */}
          <div className="group/bar relative h-4 cursor-pointer">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 group-hover/bar:h-2 transition-all duration-fast">
              {/* Buffered layer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Previously-watched layer (drawn in front of buffered) */}
              {maxPositionPercent > progressPercent && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand/40"
                  style={{ width: `${maxPositionPercent}%` }}
                  aria-hidden="true"
                />
              )}
              {/* Played layer */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-150 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Accessible range input overlaid on the visual bar */}
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.1}
              value={currentTime}
              onPointerDown={handleSeekPointerDown}
              onPointerMove={handleSeekPointerMove}
              onPointerUp={handleSeekPointerUp}
              onChange={handleSeekKeyboard}
              aria-label="Seek video"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={formatAriaTimestamp(currentTime, duration)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        {/* Controls row */}
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
                <Play className="size-5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekDelta(-10)}
              aria-label="Jump back 10 seconds (j or Left Arrow)"
              title="Rewind 10s (j)"
              className="inline-flex h-11 min-w-[44px] items-center justify-center gap-0.5 rounded-lg px-2 text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="text-label-xs font-semibold tabular-nums">10</span>
            </button>

            <button
              type="button"
              onClick={() => seekDelta(10)}
              aria-label="Jump forward 10 seconds (l or Right Arrow)"
              title="Forward 10s (l)"
              className="inline-flex h-11 min-w-[44px] items-center justify-center gap-0.5 rounded-lg px-2 text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <RotateCw className="size-4" aria-hidden="true" />
              <span className="text-label-xs font-semibold tabular-nums">10</span>
            </button>

            <div
              className="flex items-center pl-1 sm:pl-2 font-mono text-label-xs font-medium tabular-nums text-on-brand/80 select-none"
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

            {/* Volume slider — desktop only */}
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
            {/* Playback speed */}
            <div className="relative" ref={speedMenuRef} onKeyDown={handleSpeedKeyDown}>
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
                          <span className="text-[10px] text-brand" aria-hidden="true">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theater mode */}
            <button
              type="button"
              onClick={handleToggleTheater}
              aria-label={theaterActive ? 'Exit theater mode (t)' : 'Theater mode (t)'}
              title={theaterActive ? 'Exit theater mode (t)' : 'Theater mode (t)'}
              className="inline-flex size-11 items-center justify-center rounded-lg text-on-brand transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {theaterActive ? (
                <Minimize2 className="size-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
            </button>

            {/* Fullscreen */}
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

export default YouTubePlayer;
