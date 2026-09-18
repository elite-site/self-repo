export const BRANCHES = ['IT'] as const;
export const SECTIONS = ['A', 'B'] as const;
export const YEARS = [2, 3, 4] as const;

export const WINNER_RANKS = [
  { rank: 1, label: '1st Place' },
  { rank: 2, label: '2nd Place' },
  { rank: 3, label: '3rd Place' },
  { rank: 4, label: 'Honorable Mention' },
] as const;

export const SUBMISSION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'WINNER',
  'REJECTED',
] as const;
