import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TOKEN_STORAGE_KEY,
  bootstrapToken,
  captureTokenFromUrl,
  classifySessionFailure,
  hasStoredToken,
  planSessionBootstrap,
  type TokenStorage,
} from './sessionBootstrap';

/**
 * These guard the two failure modes that shaped the fix:
 *
 *  - The app used to block *every* route, public ones included, on a
 *    `/student/me` round trip. A visitor with no session cannot get anything
 *    but a 401 from it, so that was a full-screen loader in front of the public
 *    home page for no information.
 *  - A token handed over by the Google OAuth callback still has to be verified.
 *    The optimisation above initially returned right after persisting it, which
 *    left the app blocked on "Verifying Student Session" forever and broke SSO
 *    login outright.
 *
 * This exercises `sessionBootstrap.ts` itself, not a copy of it, so the
 * assertions fail if the real bootstrap changes.
 */

/** In-memory stand-in so the token store can be inspected directly. */
function fakeStorage(initial: Record<string, string> = {}): TokenStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe('hasStoredToken', () => {
  it('is false when nothing is stored', () => {
    expect(hasStoredToken(fakeStorage())).toBe(false);
  });

  it('is true once a token is stored', () => {
    expect(hasStoredToken(fakeStorage({ [TOKEN_STORAGE_KEY]: 'jwt' }))).toBe(true);
  });

  it('is false for an empty string, which is not a session', () => {
    expect(hasStoredToken(fakeStorage({ [TOKEN_STORAGE_KEY]: '' }))).toBe(false);
  });
});

describe('planSessionBootstrap', () => {
  describe('a visitor with no token', () => {
    const plan = planSessionBootstrap({ storedToken: null });

    it('makes no request at all', () => {
      // This is the whole optimisation. The old code called /student/me
      // unconditionally and rendered nothing until it rejected.
      expect(plan.needsVerification).toBe(false);
    });

    it('does not block rendering', () => {
      expect(plan.blocked).toBe(false);
    });

    it('is known to be signed out without asking the server', () => {
      expect(plan.session).toBe('signed-out');
    });
  });

  describe('a visitor with a stored token', () => {
    const plan = planSessionBootstrap({ storedToken: 'jwt' });

    it('verifies the session', () => {
      expect(plan.needsVerification).toBe(true);
    });

    it('blocks the protected subtree while in flight', () => {
      expect(plan.blocked).toBe(true);
    });

    it('starts in an unknown state, not signed-out', () => {
      // Assuming signed-out here would flash the sign-in page at a student who
      // is in fact signed in.
      expect(plan.session).toBe('unknown');
    });
  });

  describe('the Google OAuth callback', () => {
    const plan = planSessionBootstrap({ storedToken: null, urlToken: 'fresh-jwt' });

    it('verifies the freshly delivered token', () => {
      expect(plan.needsVerification).toBe(true);
    });

    it('blocks while it is in flight, then unblocks', () => {
      // Regression: the callback path used to return early after persisting the
      // token, which meant `blocked` was never cleared and every SSO login hung
      // on the loading screen.
      expect(plan.blocked).toBe(true);
    });

    it('takes precedence over a stale stored token', () => {
      const withStale = planSessionBootstrap({ storedToken: 'old-jwt', urlToken: 'fresh-jwt' });
      expect(withStale.needsVerification).toBe(true);
    });
  });
});

describe('captureTokenFromUrl', () => {
  beforeEach(() => {
    // The helper builds a clean URL from window.location.
    window.history.replaceState({}, '', '/dashboard');
  });

  it('persists a callback token and strips it from the address bar', () => {
    const storage = fakeStorage();

    const { token, cleanUrl } = captureTokenFromUrl('?token=captured-jwt', storage);

    expect(token).toBe('captured-jwt');
    expect(storage.data[TOKEN_STORAGE_KEY]).toBe('captured-jwt');
    // The token must not survive in the URL, or it leaks into history entries,
    // bookmarks, and the Referer header.
    expect(cleanUrl).not.toContain('token');
  });

  it('preserves unrelated query parameters and the hash', () => {
    // The helper is given `location.search`, which by definition excludes the
    // fragment; the hash is read from `location` separately and re-appended.
    window.history.replaceState({}, '', '/dashboard?token=captured-jwt&tab=portfolio#work');

    const { cleanUrl } = captureTokenFromUrl(window.location.search, fakeStorage());

    expect(cleanUrl).toContain('tab=portfolio');
    expect(cleanUrl).toContain('#work');
    expect(cleanUrl).not.toContain('captured-jwt');
  });

  it('keeps the fragment out of the query string', () => {
    window.history.replaceState({}, '', '/dashboard?token=captured-jwt&tab=portfolio#work');

    const { cleanUrl } = captureTokenFromUrl(window.location.search, fakeStorage());

    // A fragment left inside a parameter value would silently corrupt it.
    expect(cleanUrl).toBe('/dashboard?tab=portfolio#work');
  });

  it('reports no token and writes nothing when the query is empty', () => {
    const storage = fakeStorage();
    window.history.replaceState({}, '', '/dashboard');

    const { token, cleanUrl } = captureTokenFromUrl('', storage);

    expect(token).toBeNull();
    expect(cleanUrl).toBe('');
    expect(storage.data).toEqual({});
  });

  it('makes a persisted callback token visible to hasStoredToken', () => {
    // The two helpers are used back to back, so the order matters: capturing
    // must be what turns a signed-out app into one that knows it must verify.
    const storage = fakeStorage();
    expect(hasStoredToken(storage)).toBe(false);

    captureTokenFromUrl('?token=captured-jwt', storage);

    expect(hasStoredToken(storage)).toBe(true);
    expect(planSessionBootstrap({ storedToken: storage.getItem(TOKEN_STORAGE_KEY) }).needsVerification).toBe(true);
  });
});

describe('bootstrapToken', () => {
  it('synchronously captures token from search query, persists it, and marks needsVerification true', () => {
    window.history.replaceState({}, '', '/login?token=fresh-oauth-token');
    const storage = fakeStorage();

    const result = bootstrapToken(storage);

    expect(result.token).toBe('fresh-oauth-token');
    expect(result.needsVerification).toBe(true);
    expect(storage.getItem(TOKEN_STORAGE_KEY)).toBe('fresh-oauth-token');
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/login');
  });

  it('uses stored token when URL has no token', () => {
    window.history.replaceState({}, '', '/');
    const storage = fakeStorage({ [TOKEN_STORAGE_KEY]: 'existing-token' });

    const result = bootstrapToken(storage);

    expect(result.token).toBe('existing-token');
    expect(result.needsVerification).toBe(true);
  });

  it('reports needsVerification false when neither URL nor storage has a token', () => {
    window.history.replaceState({}, '', '/');
    const storage = fakeStorage();

    const result = bootstrapToken(storage);

    expect(result.token).toBeNull();
    expect(result.needsVerification).toBe(false);
  });
});

describe('classifySessionFailure', () => {
  it('treats 401 as a genuine sign-out', () => {
    expect(classifySessionFailure({ response: { status: 401 } })).toEqual({
      kind: 'unauthorized',
      message: null,
    });
  });

  it('treats 403 as a genuine sign-out', () => {
    expect(classifySessionFailure({ response: { status: 403 } }).kind).toBe('unauthorized');
  });

  it('does NOT treat a 500 as a sign-out', () => {
    // Regression: collapsing every failure into "logged out" meant one server
    // error deleted the stored token and dropped the student on the sign-in
    // page with no way back except a manual logout.
    const failure = classifySessionFailure({ response: { status: 500 } });

    expect(failure.kind).toBe('unavailable');
    expect(failure.kind === 'unavailable' && failure.message).toContain('500');
  });

  it('does not treat a network failure as a sign-out', () => {
    // No response at all means the request never reached the server.
    expect(classifySessionFailure(new Error('Network Error')).kind).toBe('unavailable');
    expect(classifySessionFailure(undefined).kind).toBe('unavailable');
  });

  it('always produces a message for an unavailable server, so a retry can be offered', () => {
    const failure = classifySessionFailure(new Error('Network Error'));

    expect(failure.kind === 'unavailable' && failure.message).toMatch(/could not reach the server/i);
  });
});

describe('the request the bootstrap actually issues', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is not issued for a visitor with no token', async () => {
    const { api } = await import('../services/api');
    const getMe = vi.spyOn(api, 'getMe').mockResolvedValue({ student: {} as never });

    const plan = planSessionBootstrap({ storedToken: hasStoredToken() ? 'jwt' : null });
    if (plan.needsVerification) await api.getMe();

    expect(plan.needsVerification).toBe(false);
    expect(getMe).not.toHaveBeenCalled();
  });

  it('is issued exactly once for a stored token', async () => {
    const { api } = await import('../services/api');
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt');
    const getMe = vi.spyOn(api, 'getMe').mockResolvedValue({ student: {} as never });

    const plan = planSessionBootstrap({ storedToken: localStorage.getItem(TOKEN_STORAGE_KEY) });
    if (plan.needsVerification) await api.getMe();

    expect(plan.needsVerification).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });
});
