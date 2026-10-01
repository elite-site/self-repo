import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `adminApi.getMe` decides whether an organizer stays signed in. It used to
 * swallow every failure and report `{ authenticated: false }`, which had two
 * consequences:
 *
 *  1. A 500 or a dropped connection was indistinguishable from being signed
 *     out, so a transient server error bounced the organizer to the login page
 *     and discarded a perfectly valid session.
 *  2. Because the caller received a resolved promise, its error branch could
 *     never run — the "Unable to verify your session / Retry" screen in App.tsx
 *     was unreachable dead code.
 *
 * The fix is to let the rejection propagate. This file pins that contract.
 */

const client = { get: vi.fn(), post: vi.fn() };

vi.mock('axios', () => ({
  __esModule: true,
  default: { create: vi.fn(() => client) },
}));

type AdminApi = typeof import('../services/api').adminApi;
let adminApi: AdminApi;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ adminApi } = await import('../services/api'));
});

afterEach(() => {
  vi.resetModules();
});

function httpError(status: number): unknown {
  const error = new Error(`Request failed with status code ${status}`);
  (error as { response?: { status: number } }).response = { status };
  return error;
}

describe('adminApi.getMe', () => {
  it('returns the payload on success', async () => {
    const user = { id: 'admin_1', username: 'organizer' };
    client.get.mockResolvedValue({ data: { authenticated: true, user } });

    await expect(adminApi.getMe()).resolves.toEqual({ authenticated: true, user });
  });

  it('propagates a 500 so the caller can offer a retry', async () => {
    client.get.mockRejectedValue(httpError(500));

    await expect(adminApi.getMe()).rejects.toThrow();
  });

  it('propagates a 401 so the caller can distinguish it', async () => {
    client.get.mockRejectedValue(httpError(401));

    await expect(adminApi.getMe()).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('propagates a network failure rather than reporting "not authenticated"', async () => {
    // The exact case the swallow used to hide: no response at all means the
    // request never reached the server, which is not the same as being logged
    // out.
    client.get.mockRejectedValue(new Error('Network Error'));

    await expect(adminApi.getMe()).rejects.toThrow('Network Error');
  });

  it('does not invent an authenticated:false result on failure', async () => {
    client.get.mockRejectedValue(httpError(503));

    // The old implementation resolved here, so any `await adminApi.getMe()`
    // followed by a truthiness check would read a server outage as a logout.
    const result = await adminApi.getMe().catch(() => 'rejected');
    expect(result).toBe('rejected');
  });
});

describe('the session decision built on getMe', () => {
  /** Mirrors the branch in admin-client/src/App.tsx. */
  function decide(error: unknown): 'signed-in' | 'signed-out' | 'retry' {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
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
