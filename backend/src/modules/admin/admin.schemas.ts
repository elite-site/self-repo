import { RATINGS, SUBMISSION_STATUSES } from '../../config/constants';

export function isValidRating(rating: unknown): boolean {
  if (typeof rating !== 'string') return false;
  return (RATINGS as readonly string[]).includes(rating.toUpperCase());
}

export function isValidSubmissionStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  return (SUBMISSION_STATUSES as readonly string[]).includes(status);
}
