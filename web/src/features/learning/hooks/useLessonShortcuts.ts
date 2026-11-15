import { useEffect } from 'react';

/** Elements that capture keyboard input — shortcuts must be suppressed inside them. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export interface UseLessonShortcutsProps {
  /** Called when Shift+N is pressed outside a text input. */
  onNext?: () => void;
  /** Called when Shift+P is pressed outside a text input. */
  onPrevious?: () => void;
  /** Called when Space or k is pressed outside a text input. */
  onPlayPause?: () => void;
  /** Called when ArrowLeft/j (-5s) or ArrowRight/l (+5s) is pressed outside a text input. */
  onSeek?: (deltaSec: number) => void;
  /** Called when m is pressed outside a text input. */
  onToggleMute?: () => void;
  /** Called when f is pressed outside a text input. */
  onToggleFullscreen?: () => void;
  /**
   * When `false` the listener is not attached. Useful while a modal is open
   * or while the player is in fullscreen. Defaults to `true`.
   */
  enabled?: boolean;
}

/**
 * Attaches document-level keyboard shortcuts for lesson navigation and playback.
 *
 * - Shift+N → next lesson
 * - Shift+P → previous lesson
 * - Space or k → toggle play/pause
 * - ArrowLeft or j → seek -5s
 * - ArrowRight or l → seek +5s
 * - m → toggle mute
 * - f → toggle fullscreen
 *
 * Shortcuts are ignored when the event target is an INPUT, TEXTAREA, SELECT,
 * or a contentEditable element, so they don't interfere with form controls
 * or search boxes.
 *
 * The listener is removed on unmount and whenever `enabled` changes to `false`.
 */
export function useLessonShortcuts({
  onNext,
  onPrevious,
  onPlayPause,
  onSeek,
  onToggleMute,
  onToggleFullscreen,
  enabled = true,
}: UseLessonShortcutsProps): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore shortcuts while typing in form controls or rich-text areas.
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName && INPUT_TAGS.has(target.tagName)) return;
      if (target.isContentEditable) return;

      if (e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        onNext?.();
        return;
      }

      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        onPrevious?.();
        return;
      }

      // Do not intercept hotkeys if modifier keys (Ctrl, Alt, Meta) are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Play/Pause: Space or k
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        // Space should activate buttons when focused rather than toggle video
        const isButton =
          target.tagName === 'BUTTON' ||
          (typeof target.getAttribute === 'function' && target.getAttribute('role') === 'button');
        if (e.key === ' ' && isButton) {
          return;
        }
        if (onPlayPause) {
          e.preventDefault();
          onPlayPause();
        }
        return;
      }

      // Seek backwards: ArrowLeft or j
      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        if (onSeek) {
          e.preventDefault();
          onSeek(-5);
        }
        return;
      }

      // Seek forwards: ArrowRight or l
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        if (onSeek) {
          e.preventDefault();
          onSeek(5);
        }
        return;
      }

      // Mute toggle: m
      if (e.key === 'm' || e.key === 'M') {
        if (onToggleMute) {
          e.preventDefault();
          onToggleMute();
        }
        return;
      }

      // Fullscreen toggle: f
      if (e.key === 'f' || e.key === 'F') {
        if (onToggleFullscreen) {
          e.preventDefault();
          onToggleFullscreen();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onNext, onPrevious, onPlayPause, onSeek, onToggleMute, onToggleFullscreen]);
}
