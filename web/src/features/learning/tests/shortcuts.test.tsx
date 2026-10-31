import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLessonShortcuts } from '../hooks/useLessonShortcuts';

describe('useLessonShortcuts hook', () => {
  it('triggers onNext when Shift+N is pressed', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderHook(() => useLessonShortcuts({ onNext, onPrevious }));

    const event = new KeyboardEvent('keydown', {
      key: 'N',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('triggers onPrevious when Shift+P is pressed', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderHook(() => useLessonShortcuts({ onNext, onPrevious }));

    const event = new KeyboardEvent('keydown', {
      key: 'P',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is an INPUT element', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderHook(() => useLessonShortcuts({ onNext, onPrevious }));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'N',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(onNext).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores shortcuts when target is a TEXTAREA element', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderHook(() => useLessonShortcuts({ onNext, onPrevious }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', {
      key: 'P',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(onPrevious).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('does not trigger shortcuts when enabled is false', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderHook(() => useLessonShortcuts({ onNext, onPrevious, enabled: false }));

    const event = new KeyboardEvent('keydown', {
      key: 'N',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(onNext).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    const { unmount } = renderHook(() => useLessonShortcuts({ onNext, onPrevious }));
    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'N',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(onNext).not.toHaveBeenCalled();
  });
});
