export const MODERATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'HIDDEN'] as const;

export function parseModerationStatus(rawStatus?: string) {
  const normalized = String(rawStatus || 'ALL').toUpperCase();
  if (normalized === 'PENDING_REVIEW') {
    return { in: ['PENDING', 'UNDER_REVIEW'] };
  }
  if (normalized === 'ALL') {
    return undefined;
  }
  return normalized;
}
