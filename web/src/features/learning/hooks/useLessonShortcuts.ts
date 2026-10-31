import { useEffect } from 'react';

/** Elements that capture keyboard input — shortcuts must be suppressed inside them. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export interface UseLessonShortcutsProps {
  /** Called when Shift+N is pressed outside a text input. */
  onNext?: () => void;
  /** Called when Shift+P is pressed outside a text input. */
  onPrevious?: () => void;
  /**
   * When `false` the listener is not attached. Useful while a modal is open
   * or while the player is in fullscreen. Defaults to `true`.
   */
  enabled?: boolean;
}

/**
 * Attaches document-level keyboard shortcuts for lesson navigation.
 *
 * - Shift+N → next lesson
 * - Shift+P → previous lesson
 *
 * Shortcuts are ignored when the event target is an INPUT, TEXTAREA, SELECT,
 * or a contentEditable element, so they don't interfere with the search box
 * inside TranscriptViewer or any other text field on the page.
 *
 * The listener is removed on unmount and whenever `enabled` changes to `false`.
 */
export function useLessonShortcuts({
  onNext,
  onPrevious,
  enabled = true,
}: UseLessonShortcutsProps): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore shortcuts while typing in form controls or rich-text areas.
      const target = e.target as HTMLElement;
      if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return;

      if (e.shiftKey && e.key === 'N') {
        e.preventDefault();
        onNext?.();
      } else if (e.shiftKey && e.key === 'P') {
        e.preventDefault();
        onPrevious?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onNext, onPrevious]);
}
