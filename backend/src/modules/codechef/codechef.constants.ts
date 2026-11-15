/**
 * CodeChef Integration Constants & Calculations
 * 
 * Rating & Star Threshold Source:
 * Official CodeChef Rating System:
 * https://www.codechef.com/ratings/divisions
 * Division 4: < 1400 (1★)
 * Division 3: 1400 - 1599 (2★)
 * Division 2: 1600 - 1799 (3★)
 * Division 1: 1800 - 1999 (4★), 2000 - 2199 (5★), 2200 - 2499 (6★), >= 2500 (7★)
 */

export const CODECHEF_HANDLE_REGEX = /^[A-Za-z0-9_.]{3,30}$/;

export const CODECHEF_LIMITS = {
  DEFAULT_COOLDOWN_MIN: 15,
  DEFAULT_DAILY_CAP: 10,
  MAX_PAGE_LIMIT: 100,
  DEFAULT_PAGE_LIMIT: 20,
  CLIENT_TIMEOUT_MS: 8000,
  CLIENT_PACING_MS: 300,
  MAX_CONCURRENCY: 2,
  MAX_CONTESTS_KEPT: 50,
  EXPORT_CHUNK_SIZE: 500,
  USER_AGENT: 'ELITE-Portal/1.0',
} as const;

/**
 * Computes CodeChef stars tier from current rating.
 * Returns null if rating is null/undefined or not yet rated.
 */
export function computeCodeChefStars(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined || Number.isNaN(rating) || rating <= 0) {
    return null;
  }
  if (rating < 1400) return 1;
  if (rating < 1600) return 2;
  if (rating < 1800) return 3;
  if (rating < 2000) return 4;
  if (rating < 2200) return 5;
  if (rating < 2500) return 6;
  return 7;
}

/**
 * Extracts a CodeChef username/handle from any valid handle, URL, or @handle string.
 *
 * Examples:
 *   'https://www.codechef.com/users/tourist' -> 'tourist'
 *   'https://codechef.com/users/tourist/'    -> 'tourist'
 *   'codechef.com/users/tourist'             -> 'tourist'
 *   '@tourist'                               -> 'tourist'
 *   'tourist'                                -> 'tourist'
 *   'https://www.codechef.com/users/tourist?tab=ratings' -> 'tourist'
 */
export function extractCodeChefHandle(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // Strip scheme, queries, fragments, and trailing slashes
  let rest = raw.replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

  // Strip leading @
  rest = rest.replace(/^@+/, '');

  // Strip host prefix (codechef.com or www.codechef.com)
  rest = rest.replace(/^(?:www\.)?codechef\.com\/?/i, '');

  // Strip /users/ or users/
  rest = rest.replace(/^\/?users\/?/i, '');

  // If there are still slashes (e.g. users/tourist/recent), take the first segment
  const segments = rest.split('/').filter(Boolean);
  const candidate = (segments[0] || '').trim();

  if (candidate && CODECHEF_HANDLE_REGEX.test(candidate)) {
    return candidate;
  }
  return null;
}
