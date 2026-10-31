import { AppError } from '../../utils/appError';
import { CODECHEF_HANDLE_REGEX, CODECHEF_LIMITS } from './codechef.constants';
import type { AdminCodeChefFilterParams } from './codechef.types';

export function parseConnectBody(body: unknown): { handle: string } {
  if (!body || typeof body !== 'object') {
    throw new AppError('VALIDATION_ERROR', 'Request body must be an object', 400);
  }
  const rawHandle = (body as any).handle;
  if (!rawHandle || typeof rawHandle !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Handle is required and must be a string', 400);
  }
  const handle = rawHandle.trim();
  if (handle.length < 3 || handle.length > 30) {
    throw new AppError('VALIDATION_ERROR', 'Handle must be between 3 and 30 characters', 400);
  }
  if (!CODECHEF_HANDLE_REGEX.test(handle)) {
    throw new AppError('VALIDATION_ERROR', 'Handle may only contain letters, numbers, underscores, and periods', 400);
  }
  return { handle };
}

export function parseVisibilityBody(body: unknown): { showPublic: boolean } {
  if (!body || typeof body !== 'object') {
    throw new AppError('VALIDATION_ERROR', 'Request body must be an object', 400);
  }
  const showPublic = (body as any).showPublic;
  if (typeof showPublic !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'showPublic must be a boolean', 400);
  }
  return { showPublic };
}

export function parseAdminFilterQuery(query: Record<string, unknown>): AdminCodeChefFilterParams {
  const page = query.page ? parseInt(String(query.page), 10) : 1;
  const rawLimit = query.limit ? parseInt(String(query.limit), 10) : CODECHEF_LIMITS.DEFAULT_PAGE_LIMIT;
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? CODECHEF_LIMITS.DEFAULT_PAGE_LIMIT : rawLimit, 1), CODECHEF_LIMITS.MAX_PAGE_LIMIT);

  const search = typeof query.search === 'string' && query.search.trim().length > 0 ? query.search.trim() : undefined;
  const year = query.year ? parseInt(String(query.year), 10) : undefined;
  const section = typeof query.section === 'string' && query.section.trim().length > 0 ? query.section.trim() : undefined;
  const minRating = query.minRating ? parseFloat(String(query.minRating)) : undefined;
  const stars = query.stars ? parseInt(String(query.stars), 10) : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const connected = query.connected === 'true' ? true : query.connected === 'false' ? false : undefined;

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit,
    search,
    year: year && !Number.isNaN(year) && year >= 1 && year <= 4 ? year : undefined,
    section,
    minRating: minRating && !Number.isNaN(minRating) ? minRating : undefined,
    stars: stars && !Number.isNaN(stars) && stars >= 1 && stars <= 7 ? stars : undefined,
    status,
    connected,
  };
}

export function parseLeaderboardQuery(query: Record<string, unknown>): { year?: number; limit: number } {
  const year = query.year ? parseInt(String(query.year), 10) : undefined;
  const rawLimit = query.limit ? parseInt(String(query.limit), 10) : 10;
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 10 : rawLimit, 1), 50);

  return {
    year: year && !Number.isNaN(year) && year >= 1 && year <= 4 ? year : undefined,
    limit,
  };
}
