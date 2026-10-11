import { describe, expect, it } from 'vitest';
import { ApiError, normalizeApiError } from './client';

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
