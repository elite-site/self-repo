/**
 * Timecode helpers for the LearningHub lesson player.
 *
 * These are the single source of time/duration formatting in the learning
 * feature. All four previous callers (YouTubePlayer, TranscriptViewer,
 * LessonSidebar, LessonPlayerPage) imported their own copy; they now import
 * from here instead (DRY-2, DRY-4).
 */

/**
 * Formats a raw seconds value into a display timecode:
 * `mm:ss` under an hour, `h:mm:ss` for an hour or more.
 * Returns `00:00` for non-finite or negative input.
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

/**
 * Formats a duration in seconds into a human-readable short form
 * for sidebars and lesson lists: `15s`, `12m`, `1h 30m`.
 * Returns an empty string for zero, null, or undefined input.
 */
export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '';
  const mins = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (mins === 0) return `${remainingSec}s`;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Builds the `aria-valuetext` string for the seek slider:
 * `"01:05 of 12:30"`.
 */
export function formatAriaTimestamp(currentSec: number, durationSec: number): string {
  return `${formatTimestamp(currentSec)} of ${formatTimestamp(durationSec)}`;
}
