export const BRANCHES = ['IT'] as const;
export const SECTIONS = ['A', 'B'] as const;
export const YEARS = [2, 3, 4] as const;

// The internal self-introduction event that Submission.eventId defaults to.
// It is not something students browse or register for, so it must stay out of
// the student event catalog and out of their registration list.
export const INTERNAL_EVENT_ID = 'self-introduction-2026';
export const INTERNAL_EVENT_SLUG = 'self-introduction';

/** True when the given path param addresses the internal submission event. */
export const isInternalEvent = (idOrSlug: string | undefined): boolean =>
  idOrSlug === INTERNAL_EVENT_ID || idOrSlug === INTERNAL_EVENT_SLUG;

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
