/**
 * Session bootstrap: what the app does *before* it can paint.
 *
 * This was originally inline in `App.tsx` and it gated the entire application —
 * including the fully public home page, directory, and event pages — on a
 * `/student/me` round trip. For a visitor with no session that request cannot
 * return anything but 401, so every public page opened with a full-screen
 * "Verifying Student Session" loader that lasted a network round trip.
 *
 * Two rules follow, and both are load-bearing:
 *
 *  - No stored token means definitively signed out. Nothing to verify, so
 *    render immediately and make no request at all.
 *  - A token that arrives in the URL from the Google OAuth callback still has
 *    to be verified. Skipping that check is what turns a callback into a real
 *    session, and treating it as "already verified" hangs SSO login forever.
 *
 * The logic lives here, apart from React, so it can be tested directly. It is
 * the source of truth; `App.tsx` only wires up the effects.
 */

export const TOKEN_STORAGE_KEY = 'student_token';

/** Minimal slice of `Storage` this module needs, so tests can pass a stub. */
export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function hasStoredToken(storage: TokenStorage = localStorage): boolean {
  return Boolean(storage.getItem(TOKEN_STORAGE_KEY));
}

/**
 * Pull a token out of the URL and persist it, then hand back the clean URL.
 *
 * The Google redirect comes back as `?token=...` on the page the student was
 * originally trying to reach, so the token is stripped from the address bar
 * before anything else reads it.
 */
export function captureTokenFromUrl(
  search: string,
  storage: TokenStorage = localStorage,
): { token: string | null; cleanUrl: string } {
  const params = new URLSearchParams(search);
  const token = params.get('token');
  if (!token) return { token: null, cleanUrl: '' };

  storage.setItem(TOKEN_STORAGE_KEY, token);
  params.delete('token');
  const remaining = params.toString();

  return {
    token,
    cleanUrl: `${window.location.pathname}${remaining ? `?${remaining}` : ''}${window.location.hash}`,
  };
}

/**
 * Bootstrap the token synchronously on app init.
 *
 * Checks window.location.search for a fresh OAuth callback token,
 * persists it immediately into storage, cleans the address bar, and determines
 * if the app needs to verify an existing or fresh session.
 *
 * Running this synchronously BEFORE React routes mount prevents child redirects
 * (like navigating from /login) from stripping ?token=... before it is saved.
 */
export function bootstrapToken(storage: TokenStorage = localStorage): {
  token: string | null;
  needsVerification: boolean;
} {
  let urlToken: string | null = null;
  if (typeof window !== 'undefined' && window.location.search) {
    const { token, cleanUrl } = captureTokenFromUrl(window.location.search, storage);
    if (token) {
      urlToken = token;
      if (cleanUrl) {
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }

  const storedToken = storage.getItem(TOKEN_STORAGE_KEY);
  const token = urlToken ?? storedToken;
  return {
    token,
    needsVerification: Boolean(token),
  };
}

/** Session state that is knowable without talking to the server. */
export type BootstrapSession = 'signed-out' | 'unknown';

export interface SessionBootstrapPlan {
  /** Whether `/student/me` needs to be called at all. */
  needsVerification: boolean;
  /**
   * Whether the protected subtree must show a loading state while waiting.
   * Public routes deliberately ignore this and render immediately.
   */
  blocked: boolean;
  session: BootstrapSession;
}

/**
 * Decide how to start, given what is already in storage.
 *
 * `urlToken` is the OAuth callback token, already persisted by
 * `captureTokenFromUrl`. Passing it explicitly keeps this function free of
 * window access so the interesting branches are directly testable.
 */
export function planSessionBootstrap(input: {
  storedToken: string | null;
  urlToken?: string | null;
}): SessionBootstrapPlan {
  const token = input.urlToken ?? input.storedToken;

  if (!token) {
    return { needsVerification: false, blocked: false, session: 'signed-out' };
  }

  // A token exists but has not been checked yet. Block the protected subtree.
  return { needsVerification: true, blocked: true, session: 'unknown' };
}

export type SessionFailure =
  | { kind: 'unauthorized'; message: null }
  | { kind: 'unavailable'; message: string };

/**
 * Turn a `/student/me` rejection into a decision.
 *
 * Only an explicit 401/403 means "signed out". Collapsing every failure into
 * "logged out" meant a single 500 or a dropped connection deleted the stored
 * token and dropped the student back on the sign-in page, which they could not
 * escape without a manual logout.
 */
export function classifySessionFailure(error: unknown): SessionFailure {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  if (status === 401 || status === 403) {
    return { kind: 'unauthorized', message: null };
  }

  return {
    kind: 'unavailable',
    message: status
      ? `Could not reach the server (HTTP ${status}). Please retry.`
      : 'Could not reach the server. Please check your connection and retry.',
  };
}
