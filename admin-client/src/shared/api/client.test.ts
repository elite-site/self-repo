import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `authApi.getMe` decides whether an organizer stays signed in. It must let
 * every failure propagate: a 500 or a dropped connection is not the same as
 * being signed out, and a resolved `{ authenticated: false }` would bounce the
 * organizer to the login page and hide the "retry" screen in App.tsx.
 *
 * The axios instance is mocked so these cases exercise the real `authApi`
 * normalisation and do not depend on a running backend.
 */
const httpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  __esModule: true,
  default: { create: vi.fn(() => httpClient) },
  AxiosError: class AxiosError extends Error {},
}));

import { ApiError, authApi, normalizeApiError } from './client';

beforeEach(() => {
  httpClient.get.mockReset();
  httpClient.post.mockReset();
});

function httpError(status: number): Error {
  const error = new Error(`Request failed with status code ${status}`);
  (error as Error & { response?: { status: number } }).response = { status };
  return error;
}

describe('ApiError and normalizeApiError', () => {
  it('instantiates ApiError with all fields', () => {
    const err = new ApiError({
      message: 'Not found',
      code: 'NOT_FOUND',
      status: 404,
      details: [{ field: 'id', message: 'Resource missing' }],
      requestId: 'req_123',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.details).toEqual([{ field: 'id', message: 'Resource missing' }]);
    expect(err.requestId).toBe('req_123');
    expect(err.response?.status).toBe(404);
  });

  it('normalizes an axios 400 error with validation details', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          error: 'VALIDATION_ERROR',
          message: 'Invalid payload',
          details: [{ field: 'email', message: 'Must be valid' }],
          requestId: 'req_abc',
        },
      },
    };

    const normalized = normalizeApiError(axiosError);
    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBe(400);
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.message).toBe('Invalid payload');
    expect(normalized.details).toEqual([{ field: 'email', message: 'Must be valid' }]);
    expect(normalized.requestId).toBe('req_abc');
  });

  it('normalizes an axios 401 response without data error code to UNAUTHORIZED', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: { message: 'Unauthorized access' },
      },
    };

    const normalized = normalizeApiError(axiosError);
    expect(normalized.status).toBe(401);
    expect(normalized.code).toBe('UNAUTHORIZED');
    expect(normalized.message).toBe('Unauthorized access');
  });

  it('normalizes an axios 403 response to FORBIDDEN', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {},
      },
    };

    const normalized = normalizeApiError(axiosError);
    expect(normalized.status).toBe(403);
    expect(normalized.code).toBe('FORBIDDEN');
  });

  it('normalizes network errors without response to code NETWORK_ERROR and status 0', () => {
    const netError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };

    const normalized = normalizeApiError(netError);
    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBe(0);
    expect(normalized.code).toBe('ERR_NETWORK');
    expect(normalized.message).toBe('Network Error');
  });

  it('returns the same instance if already an ApiError', () => {
    const apiErr = new ApiError({
      message: 'Custom',
      status: 409,
      code: 'CONFLICT',
    });

    expect(normalizeApiError(apiErr)).toBe(apiErr);
  });
});

describe('authApi.getMe', () => {
  it('returns the payload on success', async () => {
    const user = { id: 'admin_1', username: 'organizer', role: 'ADMIN' };
    httpClient.get.mockResolvedValue({ data: { authenticated: true, user } });

    await expect(authApi.getMe()).resolves.toEqual({ authenticated: true, user });
  });

  it('propagates a 500 so the caller can offer a retry', async () => {
    httpClient.get.mockRejectedValue(httpError(500));

    await expect(authApi.getMe()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('propagates a 401 so the caller can distinguish an auth rejection', async () => {
    httpClient.get.mockRejectedValue(httpError(401));

    await expect(authApi.getMe()).rejects.toMatchObject({
      status: 401,
      response: { status: 401 },
    });
  });

  it('propagates a network failure instead of reporting "not authenticated"', async () => {
    httpClient.get.mockRejectedValue(new Error('Network Error'));

    await expect(authApi.getMe()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network Error',
    });
  });

  it('does not invent an authenticated:false result on failure', async () => {
    httpClient.get.mockRejectedValue(httpError(503));

    const result = await authApi.getMe().catch(() => 'rejected');
    expect(result).toBe('rejected');
  });
});

describe('the session decision built on getMe', () => {
  /** Mirrors the branch in admin-client/src/App.tsx. */
  function decide(error: unknown): 'signed-in' | 'signed-out' | 'retry' {
    const status =
      (error as { status?: number } | null)?.status ??
      (error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 401 || status === 403) return 'signed-out';
    return 'retry';
  }

  it('signs out only on an explicit auth rejection', () => {
    expect(decide(httpError(401))).toBe('signed-out');
    expect(decide(httpError(403))).toBe('signed-out');
  });

  it('offers a retry for everything else instead of signing the organizer out', () => {
    expect(decide(httpError(500))).toBe('retry');
    expect(decide(httpError(502))).toBe('retry');
    expect(decide(new Error('Network Error'))).toBe('retry');
  });
});
