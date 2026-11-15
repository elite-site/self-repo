/**
 * Video Cache domain error codes.
 *
 * ERR-1: Domain-specific codes are UPPER_SNAKE_CASE and listed in one place
 * per module so they can be found and reused.
 */
export const VIDEO_CACHE_ERRORS = {
  FILE_TOO_LARGE: 'VIDEO_FILE_TOO_LARGE',
  INVALID_MIME: 'VIDEO_INVALID_MIME_TYPE',
  COPY_FAILED: 'VIDEO_COPY_FAILED',
  MAX_ATTEMPTS_EXCEEDED: 'VIDEO_MAX_COPY_ATTEMPTS',
  CACHE_FULL: 'VIDEO_CACHE_FULL',
  FEATURE_DISABLED: 'VIDEO_CACHE_FEATURE_DISABLED',
} as const;

export type VideoCacheErrorCode =
  (typeof VIDEO_CACHE_ERRORS)[keyof typeof VIDEO_CACHE_ERRORS];
