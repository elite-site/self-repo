/**
 * Formats an ISO date string for display in submission timestamps.
 * Shared across VideoPage, ResumePage, and other submission screens.
 */
export const formatSubmittedAt = (iso: string | null | undefined): string => {
  if (!iso) return 'Not submitted yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not submitted yet';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
