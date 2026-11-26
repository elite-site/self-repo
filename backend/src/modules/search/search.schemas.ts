import { ValidationError } from '../../utils/appError';
import { SEARCH_RESULT_TYPES, type SearchResultType } from './search.types';

export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 15;
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

const VALID_TYPE_SET = new Set<string>(SEARCH_RESULT_TYPES);

/** Validated and normalized search query parameters. */
export interface ValidatedSearchQuery {
  q: string;
  limit: number;
  type?: SearchResultType;
}

/**
 * Validates the `GET /search` query string at the HTTP boundary (ERR-8, PERF-6).
 * Enforces a minimum query length so single-character keystrokes never hit the DB.
 */
export function parseSearchQuery(query: unknown): ValidatedSearchQuery {
  const raw: Record<string, unknown> =
    query && typeof query === 'object' ? (query as Record<string, unknown>) : {};

  const rawQ = typeof raw.q === 'string' ? raw.q.trim() : '';
  const errors: Array<{ field: string; message: string }> = [];

  if (!rawQ || rawQ.length < MIN_QUERY_LENGTH) {
    errors.push({
      field: 'q',
      message: `Must be at least ${MIN_QUERY_LENGTH} characters`,
    });
  } else if (rawQ.length > MAX_QUERY_LENGTH) {
    errors.push({
      field: 'q',
      message: `Must be at most ${MAX_QUERY_LENGTH} characters`,
    });
  }

  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined && raw.limit !== '') {
    const parsed = Number(raw.limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.push({
        field: 'limit',
        message: 'Must be a positive number',
      });
    } else {
      limit = Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
    }
  }

  let type: SearchResultType | undefined;
  if (raw.type !== undefined && raw.type !== '') {
    if (typeof raw.type !== 'string' || !VALID_TYPE_SET.has(raw.type)) {
      errors.push({
        field: 'type',
        message: `Must be one of: ${SEARCH_RESULT_TYPES.join(', ')}`,
      });
    } else {
      type = raw.type as SearchResultType;
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors[0].message, errors);
  }

  return { q: rawQ, limit, type };
}
