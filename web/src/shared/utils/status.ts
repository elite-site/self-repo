/**
 * Maps raw ContentStatus enums to human-friendly student portal labels and badge classes.
 */
export const formatContentStatus = (status?: string | null): string => {
  if (!status) return 'Not submitted';
  switch (status.toUpperCase()) {
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
      return 'Under review';
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'REJECTED':
      return 'Rejected';
    case 'HIDDEN':
      return 'Hidden';
    default:
      return status;
  }
};
