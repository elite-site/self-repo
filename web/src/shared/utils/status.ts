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

export const getContentStatusBadgeClass = (status?: string | null): string => {
  if (!status) return 'badge badge-draft';
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'badge badge-approved';
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
      return 'badge badge-pending';
    case 'CHANGES_REQUESTED':
      return 'badge badge-changes';
    case 'REJECTED':
      return 'badge badge-rejected';
    case 'HIDDEN':
    default:
      return 'badge badge-draft';
  }
};
