export const BRANCHES = ['IT'] as const;
export const SECTIONS = ['A', 'B'] as const;
export const YEARS = [2, 3, 4] as const;

export const RATINGS = ['GOOD', 'AVERAGE', 'POOR'] as const;

export const RATING_LABELS: Record<string, string> = {
  GOOD: 'Good',
  AVERAGE: 'Average',
  POOR: 'Poor',
};

export const SUBMISSION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'REJECTED',
] as const;