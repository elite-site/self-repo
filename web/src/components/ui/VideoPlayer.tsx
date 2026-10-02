import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { MOTION_DURATIONS, transitionQuick, transitionReduced } from '../../lib/motion';

// ============================================================================
// Video player — REDESIGN_PLAN §4.8 "Video Player", §6.9
// ============================================================================
//
// A skin, not a replacement. The native `<video>` stays in the DOM, keeps its
// own media pipeline, its `preload="metadata"`, its poster, its captions track
// and whatever assistive technology the browser attaches to a media element.
// `nativeControls` escapes to the browser's own control bar entirely.
//
// The skin is a gradient scrim over the bottom of the frame plus a centre
// play button, and it auto-hides after three seconds of playback (§4.8). It
// never hides while the video is paused, and never while the keyboard focus is
// inside it, because a control bar that vanishes out from under a focused
// button is unusable rather than minimal.
//
// Two tokens are deliberately not used: the frame and the scrim are `black`
// rather than a surface token, and the control text is `on-brand` white rather
// than `ink-inverse`. A video is black in both themes, so a surface token would
// flip with the theme and the chrome would stop matching the picture.
// ============================================================================

/**
 * §4.8: controls auto-hide after 3 seconds of inactivity. Written as a multiple
 * of the `story` motion token rather than a literal, so it follows the token
 * table (§3.6) instead of restating a number.
 */
const CONTROLS_IDLE_MS = MOTION_DURATIONS.story * 3;

/** `m:ss`, or `h:mm:ss` once the video runs an hour. */
function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  /** Accessible name for the video element. */
  label: string;
  /**
   * Muted, inline, looping preview — the post-selection state in §6.9. There is
   * deliberately no unmuted autoplay: audio that starts without being asked for
   * is never the right default.
   */
  autoPlayMuted?: boolean;
  loop?: boolean;
  /** Renders a download control when set (§6.9 lists Download among the controls). */
  downloadHref?: string;
  /** Fires once, on the first playback the student started themselves — a muted autoplay preview is not a view. */
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  /** Rendered inside the error state — §6.10's "Download to view." fallback. */
  errorAction?: React.ReactNode;
  /** Escape hatch: the browser's own control bar, no skin. */
  nativeControls?: boolean;
  className?: string;
}

const controlButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-on-brand transition-colors duration-quick hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black';

export const VideoPlayer = React.forwardRef<HTMLDivElement, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    poster,
    label,
    autoPlayMuted = false,
    loop = false,
    downloadHref,
    onPlay,
    onEnded,
    onError,
    errorAction,
    nativeControls = false,
    className,
  },
  forwardedRef,
) {
  const shouldReduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  // A muted autoplay preview fires `playing` too; only a playback the student
  // started counts as a view.
  const userStartedRef = useRef(false);
  const playReportedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(autoPlayMuted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState(false);

  // ─── Controls auto-hide ──────────────────────────────────────────────────

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    const root = containerRef.current;
    const video = videoRef.current;
    // Paused means the student is reading the frame, not watching it; and a
    // focused control must never slide out from under the caret.
    if (!root || !video || video.paused || root.contains(document.activeElement)) return;
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (isPlaying) scheduleHide();
    else setControlsVisible(true);
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, scheduleHide]);

  // ─── Fullscreen ──────────────────────────────────────────────────────────

  useEffect(() => {
    setCanFullscreen(typeof document !== 'undefined' && document.fullscreenEnabled === true);
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      revealControls();
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [revealControls]);

  // ─── Media events ────────────────────────────────────────────────────────

  const syncVolume = () => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setIsMuted(video.muted);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    userStartedRef.current = true;
    if (video.paused) void video.play();
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    syncVolume();
  };

  const toggleFullscreen = () => {
    const root = containerRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (typeof root.requestFullscreen === 'function') {
      void root.requestFullscreen().catch(() => undefined);
    }
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || 0);
    setCurrentTime(video.currentTime);
  };

  const nudgeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = Math.min(1, Math.max(0, video.volume + delta));
    syncVolume();
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLVideoElement>) => {
    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        event.preventDefault();
        togglePlay();
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekBy(-5);
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekBy(5);
        break;
      case 'ArrowUp':
        event.preventDefault();
        nudgeVolume(0.1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        nudgeVolume(-0.1);
        break;
      default:
        break;
    }
  };

  const handleMediaError = () => {
    const message = 'This video could not be played. It may be unavailable or in an unsupported format.';
    setError(message);
    onError?.(message);
  };

  const retry = () => {
    const video = videoRef.current;
    if (!video) return;
    setError('');
    setEnded(false);
    video.load();
  };

  const showSkin = !nativeControls;
  const isSilent = isMuted || volume === 0;
  const scrubMax = Number.isFinite(duration) && duration > 0 ? duration : 0;

  const controlBar = (
    <motion.div
      // Kept mounted and cross-faded rather than unmounted through
      // AnimatePresence: removing the bar would drop focus out from under
      // whichever button had it.
      initial={false}
      animate={{ opacity: controlsVisible || !isPlaying || error ? 1 : 0 }}
      transition={shouldReduce ? transitionReduced : transitionQuick}
      className={cn(
        'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 md:px-4',
        !controlsVisible && isPlaying && !error && 'pointer-events-none',
      )}
    >
      <input
        type="range"
        min={0}
        max={scrubMax}
        step={0.01}
        value={scrubMax === 0 ? 0 : Math.min(currentTime, scrubMax)}
        onChange={handleScrub}
        onPointerDown={() => {
          scrubbingRef.current = true;
        }}
        onPointerUp={() => {
          scrubbingRef.current = false;
        }}
        onBlur={() => {
          scrubbingRef.current = false;
        }}
        aria-label="Seek"
        aria-valuetext={`${formatTimecode(currentTime)} of ${formatTimecode(scrubMax)}`}
        // `accent-brand` themes the native track and thumb; `color-scheme: dark`
        // keeps the unfilled part of the track dark, which the always-dark
        // chrome needs.
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-brand-soft accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={controlButton}
        >
          {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>

        <p className="px-1 font-mono text-xs tabular-nums text-on-brand">
          {formatTimecode(currentTime)} / {formatTimecode(scrubMax)}
        </p>

        <div className="flex-1" />

        <button
          type="button"
          onClick={toggleMute}
          aria-label={isSilent ? 'Unmute' : 'Mute'}
          aria-pressed={isSilent}
          className={controlButton}
        >
          {isSilent ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        </button>

        {/* Volume is a pointer-only nicety on a phone; the mute button above is
            the accessible equivalent, so the slider is desktop-only. */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(event) => {
            const video = videoRef.current;
            const next = Number(event.target.value);
            if (video) {
              video.volume = next;
              video.muted = next === 0;
            }
            syncVolume();
          }}
          aria-label="Volume"
          aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)} percent`}
          className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-brand-soft accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black md:block"
        />

        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className={controlButton}
          >
            {isFullscreen ? (
              <Minimize2 size={18} aria-hidden="true" />
            ) : (
              <Maximize2 size={18} aria-hidden="true" />
            )}
          </button>
        )}

        {downloadHref && (
          <a
            href={downloadHref}
            download
            aria-label="Download video"
            className={controlButton}
          >
            <Download size={18} aria-hidden="true" />
          </a>
        )}
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      // Keyboard users reach the skin by tabbing into it, so the bar has to
      // come back the moment it takes focus — otherwise the first thing they
      // land on is invisible.
      onFocus={revealControls}
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-xl bg-black [color-scheme:dark]',
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        controls={nativeControls}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        autoPlay={autoPlayMuted}
        muted={autoPlayMuted}
        loop={loop}
        tabIndex={0}
        aria-label={label}
        onClick={togglePlay}
        onKeyDown={handleKeyDown}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => {
          if (scrubbingRef.current) return;
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setEnded(false);
          revealControls();
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          if (userStartedRef.current && !playReportedRef.current) {
            playReportedRef.current = true;
            onPlay?.();
          }
        }}
        onCanPlay={() => setIsBuffering(false)}
        onVolumeChange={syncVolume}
        onEnded={() => {
          setIsPlaying(false);
          setEnded(true);
          onEnded?.();
        }}
        onError={handleMediaError}
        className="h-full w-full object-contain"
      />

      {showSkin && !error && isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 size={36} className="animate-spin text-on-brand" aria-hidden="true" />
          <p role="status" className="sr-only">
            Buffering video
          </p>
        </div>
      )}

      {showSkin && !error && !isBuffering && !isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={ended ? 'Play again' : 'Play'}
          className={cn(
            'absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full',
            'bg-black/40 text-on-brand backdrop-blur-sm transition-transform duration-fast ease-press',
            'hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            shouldReduce && 'hover:scale-100',
          )}
        >
          {ended ? (
            <RotateCcw size={26} aria-hidden="true" />
          ) : (
            <Play size={26} className="ml-1" aria-hidden="true" />
          )}
        </button>
      )}

      {showSkin && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <p role="alert" className="max-w-prose font-body text-body-sm text-on-brand">
            {error}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={retry}
              className={cn(
                controlButton,
                'h-11 w-auto rounded-md px-4 focus-visible:ring-offset-0',
              )}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
            {errorAction}
          </div>
        </div>
      )}

      {showSkin && !error && controlBar}
    </div>
  );
});

export default VideoPlayer;