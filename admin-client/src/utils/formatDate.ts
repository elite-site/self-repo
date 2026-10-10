/**
 * Shared date formatting utilities for the admin console.
 * Formats: day, month, year; never seconds.
 * Fallback for empty or invalid dates is always "—" (em-dash).
 */

const formatDayMonth = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const formatDayMonthYear = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Formats a single ISO date string as "5 Oct 2026", or "—" if missing/invalid. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDayMonthYear(d);
}

/** Formats date and time: "5 Oct 2026 • 02:30 PM", or "—" if missing/invalid. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = formatDayMonthYear(d);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

/**
 * Formats registration start and end dates according to admin-wide rules:
 * - both dates -> "5 Oct – 12 Oct 2026" (or distinct years if different)
 * - only start -> "Opens 5 Oct"
 * - only end -> "Closes 12 Oct"
 * - none -> "—"
 */
export function formatRegistrationRange(
  start?: string | null,
  end?: string | null
): string {
  const dStart = start ? new Date(start) : null;
  const dEnd = end ? new Date(end) : null;
  const validStart = dStart && !Number.isNaN(dStart.getTime());
  const validEnd = dEnd && !Number.isNaN(dEnd.getTime());

  if (validStart && validEnd) {
    if (dStart.getFullYear() === dEnd.getFullYear()) {
      return `${formatDayMonth(dStart)} \u2013 ${formatDayMonthYear(dEnd)}`;
    }
    return `${formatDayMonthYear(dStart)} \u2013 ${formatDayMonthYear(dEnd)}`;
  }
  if (validStart) {
    return `Opens ${formatDayMonth(dStart)}`;
  }
  if (validEnd) {
    return `Closes ${formatDayMonth(dEnd)}`;
  }
  return '—';
}
