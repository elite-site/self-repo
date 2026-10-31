import { TranscriptSegment } from '../types';
import { formatTimestamp } from './timecode';

/**
 * Finds the index of the segment currently being spoken using binary search.
 * Segments must be sorted by ascending `offset` (the API guarantees this).
 *
 * Returns -1 when no segment is active (before the first or in a gap).
 *
 * Binary search keeps the 250ms tick cost negligible even for 500-segment
 * transcripts (O(log n) vs the previous O(n) linear scan).
 */
export function findActiveSegmentIndex(
  segments: TranscriptSegment[],
  currentTime: number,
): number {
  if (segments.length === 0) return -1;

  let lo = 0;
  let hi = segments.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const seg = segments[mid];
    if (currentTime >= seg.offset) {
      // This segment has started; check whether it has also ended.
      if (currentTime < seg.offset + seg.duration) {
        return mid; // exact match
      }
      // Segment has ended; search to the right.
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // `result` is the last segment that started but may have ended already.
  // Return -1 if we never found an active match (gaps between segments).
  return result !== -1 && currentTime < segments[result].offset + segments[result].duration
    ? result
    : -1;
}

/**
 * Formats all segments into the canonical export text used by both
 * Copy and Download: `[HH:MM:SS] line text\n…`
 *
 * One formatter for both callers enforces DRY-2.
 */
export function formatTranscriptText(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${formatTimestamp(s.offset)}] ${s.text}`).join('\n');
}
