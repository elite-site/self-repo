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
  'REVIEWED',
  'REJECTED',
] as const;

// Default review hashtag keywords shown to the admin while reviewing a video.
export const REVIEW_PROS = [
  'expressive posture',
  'commanding voice',
  'focused mindset',
  'perfect lighting & background',
] as const;

export const REVIEW_CONS = [
  'unclear thoughts',
  'broken voice',
  'bad lighting',
] as const;