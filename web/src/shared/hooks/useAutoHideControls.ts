import { useCallback, useEffect, useRef, useState } from 'react';
import { MOTION_DURATIONS } from '@/shared/lib/motion';

/**
 * The idle timeout before controls vanish: 3× the `story` motion token
 * (3 000 ms). Mirrored from VideoPlayer.tsx §4.8.
 */
const CONTROLS_IDLE_MS = MOTION_DURATIONS.story * 3;

export interface UseAutoHideControlsReturn {
  visible: boolean;
  /** Call on any pointer/keyboard activity to show controls and restart the timer. */
  reveal: () => void;
  /**
   * Call when playback starts so the timer begins.
   * Controls stay visible while paused or while focus is inside the player.
   */
  scheduleHide: (opts: {
    isPlaying: boolean;
    containerRef: React.RefObject<HTMLElement | null>;
  }) => void;
}

/**
 * Generic auto-hide-controls hook for video players.
 *
 * Controls stay permanently visible when:
 * - the video is paused, or
 * - keyboard focus is inside the container (a control that disappears while
 *   focused is inaccessible).
 *
 * Placed in `shared/hooks` because VideoPlayer.tsx uses the same pattern and
 * this avoids the next duplication (DRY-2, ARCH-13).
 */
export function useAutoHideControls(): UseAutoHideControlsReturn {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(
    ({
      isPlaying,
      containerRef,
    }: {
      isPlaying: boolean;
      containerRef: React.RefObject<HTMLElement | null>;
    }) => {
      clearHideTimer();
      // Never hide while paused or while focus is inside the player.
      if (!isPlaying) {
        setVisible(true);
        return;
      }
      const container = containerRef.current;
      if (container?.contains(document.activeElement)) {
        setVisible(true);
        return;
      }
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, CONTROLS_IDLE_MS);
    },
    [clearHideTimer],
  );

  const reveal = useCallback(() => {
    clearHideTimer();
    setVisible(true);
  }, [clearHideTimer]);

  // Clean up on unmount.
  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return { visible, reveal, scheduleHide };
}
