/**
 * Category and status vocabularies accepted by `GET /admin/api/activity-logs`.
 * They mirror `LogActivityParams` in the backend so the filter options cannot
 * drift into values the database never stores.
 */
export const ACTIVITY_LOG_CATEGORIES = [
  'APPLICATION',
  'ADMIN',
  'FILE_UPLOAD',
  'EMAIL',
  'GOOGLE_DRIVE',
  'DATABASE',
  'AUTH',
] as const;

export const ACTIVITY_LOG_STATUSES = ['SUCCESS', 'WARNING', 'ERROR', 'INFO'] as const;

export const ACTIVITY_LOGS_PAGE_SIZE = 20;

/** Delay before a typed search term becomes a query, so each keystroke is not a request. */
export const ACTIVITY_LOGS_SEARCH_DEBOUNCE_MS = 300;
