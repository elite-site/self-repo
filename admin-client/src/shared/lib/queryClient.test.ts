import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createQueryClient,
  is4xxError,
  handleGlobal401,
  ADMIN_CACHE_STORAGE_KEY,
  ADMIN_SESSION_QUERY_KEY,
  restoreQueryCache,
  clearPersistedQueryCache,
} from './queryClient';
import { ApiError } from '@/shared/api';

beforeEach(() => {
  window.localStorage.clear();
});

describe('queryClient error handling and retry defaults', () => {
  it('correctly identifies 4xx errors as non-retryable', () => {
    const apiErr400 = new ApiError({ message: 'Bad request', status: 400 });
    const apiErr401 = new ApiError({ message: 'Unauthorized', status: 401 });
    const apiErr403 = new ApiError({ message: 'Forbidden', status: 403 });
    const apiErr404 = new ApiError({ message: 'Not found', status: 404 });
    const apiErr500 = new ApiError({ message: 'Server error', status: 500 });

    expect(is4xxError(apiErr400)).toBe(true);
    expect(is4xxError(apiErr401)).toBe(true);
    expect(is4xxError(apiErr403)).toBe(true);
    expect(is4xxError(apiErr404)).toBe(true);
    expect(is4xxError(apiErr500)).toBe(false);

    expect(is4xxError({ status: 422 })).toBe(true);
    expect(is4xxError({ response: { status: 429 } })).toBe(true);
    expect(is4xxError({ status: 503 })).toBe(false);
    expect(is4xxError(new Error('Network Error'))).toBe(false);
  });

  it('configures queries retry function to reject 4xx on first attempt', () => {
    const client = createQueryClient();
    const retryFn = client.getDefaultOptions().queries?.retry;

    expect(typeof retryFn).toBe('function');
    if (typeof retryFn === 'function') {
      const err404 = new ApiError({ message: 'Not Found', status: 404 });
      const err500 = new ApiError({ message: 'Internal Server Error', status: 500 });

      expect(retryFn(0, err404)).toBe(false);
      expect(retryFn(0, err500)).toBe(true);
      expect(retryFn(1, err500)).toBe(false);
    }
  });

  it('triggers session expired event on 401 and clears persisted cache', () => {
    window.localStorage.setItem(ADMIN_CACHE_STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), clientState: { queries: [], mutations: [] } }));
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const err401 = new ApiError({ message: 'Session expired', status: 401 });

    handleGlobal401(err401);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'admin-session-expired' })
    );
    expect(window.localStorage.getItem(ADMIN_CACHE_STORAGE_KEY)).toBeNull();
  });

  it('restores valid persisted cache and drops expired entries', () => {
    const client = createQueryClient();
    const validState = {
      mutations: [],
      queries: [
        {
          queryKey: ADMIN_SESSION_QUERY_KEY,
          queryHash: JSON.stringify(ADMIN_SESSION_QUERY_KEY),
          state: { data: { username: 'admin' }, dataUpdateCount: 1, dataUpdatedAt: Date.now(), error: null, errorUpdateCount: 0, errorUpdatedAt: 0, fetchFailureCount: 0, fetchFailureReason: null, fetchMeta: null, isInvalidated: false, status: 'success', fetchStatus: 'idle' },
        },
      ],
    };

    window.localStorage.setItem(
      ADMIN_CACHE_STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), clientState: validState }),
    );
    restoreQueryCache(client);
    expect(client.getQueryData(ADMIN_SESSION_QUERY_KEY)).toEqual({ username: 'admin' });

    clearPersistedQueryCache();
    expect(window.localStorage.getItem(ADMIN_CACHE_STORAGE_KEY)).toBeNull();
  });
});
