import { describe, it, expect, vi } from 'vitest';
import { formatTimestamp, formatDuration, formatAriaTimestamp } from '../lib/timecode';
import { findActiveSegmentIndex, formatTranscriptText } from '../lib/transcript';
import { scrollWithin } from '../lib/scrollWithin';
import type { TranscriptSegment } from '../types';

// ─── timecode helpers ────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
  it('returns 00:00 for zero', () => {
    expect(formatTimestamp(0)).toBe('00:00');
  });

  it('formats sub-minute values as 00:ss', () => {
    expect(formatTimestamp(5)).toBe('00:05');
    expect(formatTimestamp(59)).toBe('00:59');
  });

  it('formats minutes correctly', () => {
    expect(formatTimestamp(60)).toBe('01:00');
    expect(formatTimestamp(65)).toBe('01:05');
    expect(formatTimestamp(600)).toBe('10:00');
  });

  it('formats hours as h:mm:ss (no leading zero on hours)', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00');
    expect(formatTimestamp(3665)).toBe('1:01:05');
    expect(formatTimestamp(7200)).toBe('2:00:00');
  });

  it('returns 00:00 for negative input', () => {
    expect(formatTimestamp(-1)).toBe('00:00');
    expect(formatTimestamp(-999)).toBe('00:00');
  });

  it('returns 00:00 for non-finite input', () => {
    expect(formatTimestamp(Infinity)).toBe('00:00');
    expect(formatTimestamp(NaN)).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('returns empty string for zero, null, or undefined', () => {
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
  });

  it('formats sub-minute values as Xs', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('formats whole minutes as Xm', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(120)).toBe('2m');
  });

  it('formats whole hours without minutes', () => {
    expect(formatDuration(3600)).toBe('1h');
  });

  it('formats hours with remaining minutes', () => {
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7260)).toBe('2h 1m');
  });
});

describe('formatAriaTimestamp', () => {
  it('builds "current of total" string', () => {
    expect(formatAriaTimestamp(65, 750)).toBe('01:05 of 12:30');
    expect(formatAriaTimestamp(0, 0)).toBe('00:00 of 00:00');
  });
});

// ─── findActiveSegmentIndex ──────────────────────────────────────────────────

describe('findActiveSegmentIndex', () => {
  const segs: TranscriptSegment[] = [
    { text: 'A', offset: 0, duration: 5 },
    { text: 'B', offset: 5, duration: 5 },
    { text: 'C', offset: 10, duration: 5 },
    { text: 'D', offset: 20, duration: 10 }, // gap: 15–20
  ];

  it('returns -1 for empty array', () => {
    expect(findActiveSegmentIndex([], 3)).toBe(-1);
  });

  it('returns -1 before the first segment starts', () => {
    // currentTime = -1 is before offset 0 (treated as 0 by the rule)
    // Use a time deliberately before first segment (impossible in practice but guards edge)
    expect(findActiveSegmentIndex(segs, -1)).toBe(-1);
  });

  it('finds exact match at start of segment', () => {
    expect(findActiveSegmentIndex(segs, 0)).toBe(0);
    expect(findActiveSegmentIndex(segs, 5)).toBe(1);
    expect(findActiveSegmentIndex(segs, 10)).toBe(2);
  });

  it('finds match in middle of segment', () => {
    expect(findActiveSegmentIndex(segs, 3)).toBe(0);
    expect(findActiveSegmentIndex(segs, 7)).toBe(1);
    expect(findActiveSegmentIndex(segs, 12)).toBe(2);
  });

  it('returns -1 in a gap between segments (15–19)', () => {
    expect(findActiveSegmentIndex(segs, 15)).toBe(-1);
    expect(findActiveSegmentIndex(segs, 19)).toBe(-1);
  });

  it('matches the last segment', () => {
    expect(findActiveSegmentIndex(segs, 20)).toBe(3);
    expect(findActiveSegmentIndex(segs, 25)).toBe(3);
    expect(findActiveSegmentIndex(segs, 29)).toBe(3);
  });

  it('returns -1 after the last segment ends', () => {
    expect(findActiveSegmentIndex(segs, 30)).toBe(-1);
    expect(findActiveSegmentIndex(segs, 999)).toBe(-1);
  });
});

// ─── formatTranscriptText ────────────────────────────────────────────────────

describe('formatTranscriptText', () => {
  it('produces [timestamp] text lines joined by newlines', () => {
    const segs: TranscriptSegment[] = [
      { text: 'Hello world.', offset: 0, duration: 5 },
      { text: 'Second line.', offset: 65, duration: 5 },
    ];
    const result = formatTranscriptText(segs);
    expect(result).toBe('[00:00] Hello world.\n[01:05] Second line.');
  });

  it('returns empty string for empty array', () => {
    expect(formatTranscriptText([])).toBe('');
  });
});

// ─── scrollWithin ────────────────────────────────────────────────────────────

describe('scrollWithin', () => {
  it('is a no-op when container is null', () => {
    // Should not throw
    expect(() => scrollWithin(null, document.createElement('div'))).not.toThrow();
  });

  it('is a no-op when element is null', () => {
    expect(() => scrollWithin(document.createElement('div'), null)).not.toThrow();
  });

  it('calls container.scrollTo with a numeric top value', () => {
    const container = document.createElement('div');
    const element = document.createElement('div');

    // jsdom getBoundingClientRect returns zeros; scrollTo should still be called.
    const scrollToSpy = vi.fn();
    container.scrollTo = scrollToSpy;

    scrollWithin(container, element);

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    const callArg = scrollToSpy.mock.calls[0][0] as ScrollToOptions;
    expect(typeof callArg.top).toBe('number');
    expect(callArg.behavior).toBe('smooth');
  });

  it('never calls scrollIntoView on the element', () => {
    const container = document.createElement('div');
    const element = document.createElement('div');
    container.scrollTo = vi.fn();
    const scrollIntoViewSpy = vi.fn();
    element.scrollIntoView = scrollIntoViewSpy;

    scrollWithin(container, element);

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});
