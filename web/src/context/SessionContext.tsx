import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StudentSession } from '../types';
import { api } from '../services/api';
import { SESSION_QUERY_KEY } from '../lib/queryClient';
import {
  TOKEN_STORAGE_KEY,
  bootstrapToken,
  classifySessionFailure,
  hasStoredToken,
} from '../utils/sessionBootstrap';

interface SessionContextValue {
  session: StudentSession | null;
  authChecking: boolean;
  sessionError: string | null;
  retrySessionCheck: () => void;
  logout: () => Promise<void>;
  /**
   * Patches the cached session so a change made inside a portal page (an
   * uploaded profile photo, for example) is reflected immediately in the header
   * avatar instead of only after the next login.
   */
  setPhoto: (photoUrl: string | null) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  authChecking: false,
  sessionError: null,
  retrySessionCheck: () => {},
  logout: async () => {},
  setPhoto: () => {},
});

/**
 * Owns the single `/me` verification for the whole app.
 *
 * This was previously local state inside `AuthWrapper`, which meant only the
 * routes could read it. `VideoPage` and `EventDetailPage` each issued their own
 * identical `getMe()` on mount, so a single visit to the portal fetched the
 * student three times. Hoisting it here makes the response the one cached copy
 * of the student that any page can read.
 *
 * The student now lives in the React Query cache under `SESSION_QUERY_KEY`
 * rather than in local state, so `session` and the header avatar read from one
 * place, and a sign-out can destroy the data along with the token. What the
 * cache does not change is the order of operations: the token is still
 * bootstrapped synchronously during this provider's initialisation, and the
 * decision to ask the server anything is still made before the first render.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  // Synchronously bootstrap token from URL if returning from Google OAuth redirect,
  // persisting it immediately into storage before any child routes mount or navigate.
  // `bootstrapToken()` is called for that side effect alone; `hasStoredToken()` then
  // reads the storage it has just written, so a token arriving straight from Google
  // counts as present. With no stored token there is definitively nothing to verify,
  // so nothing is requested and nothing is waited for — the branch that lets a
  // signed-out visitor paint a public page without a network round trip.
  //
  // Both reads happen in a state initialiser, never in an effect, so `enabled` is
  // already final on the first render. An effect would leave one render in which
  // `authChecking` is wrong and a public page flashes a loader it is not waiting for.
  const [verifyEnabled, setVerifyEnabled] = useState(() => {
    bootstrapToken();
    return hasStoredToken();
  });

  const { data, error, isPending, refetch } = useQuery<StudentSession | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => ({ student: (await api.getMe()).student }),
    enabled: verifyEnabled,
    // A 401 is a sign-out, not a hiccup. React Query retries three times by default,
    // which would triple the `/me` call on every signed-out visit and hold the student
    // on the loader for seconds before they are signed out. `classifySessionFailure`
    // below is the only thing allowed to decide what a rejection means.
    retry: false,
    // The student is verified once per page load, exactly as before. Re-verifying
    // mid-visit would hand every page holding a `session` a different copy of it.
    staleTime: Infinity,
  });

  const session = data ?? null;
  const failure = error ? classifySessionFailure(error) : null;
  const unauthorized = failure?.kind === 'unauthorized';
  // Derived rather than stored, so the retry screen appears in the same render as
  // the rejection instead of one commit later. Only a non-auth failure has a
  // message: a 401 has nothing to report, it is a signed-out visitor.
  const sessionError = failure?.kind === 'unavailable' ? failure.message : null;
  // True only while a verification is still outstanding. The cache now owns the
  // guard the old `cancelled` flag provided: a `/me` that resolves after an unmount,
  // or after the query is destroyed at logout, has nowhere left to write a session
  // for a token that is no longer in storage.
  const authChecking = verifyEnabled && isPending;

  useEffect(() => {
    if (!error) return;
    if (unauthorized) {
      // A 401/403 means the token is dead, not that the check failed. Drop it and
      // write the signed-out state into the cache so nothing re-asks `/me`.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      queryClient.setQueryData<StudentSession | null>(SESSION_QUERY_KEY, null);
      setVerifyEnabled(false);
      return;
    }
    // A server-side failure must not masquerade as a logout. The retry screen is
    // shown instead of silently dumping the student on sign-in.
    console.error('Could not verify student session:', error);
  }, [error, unauthorized, queryClient]);

  const handlePhotoChange = useCallback(
    (photoUrl: string | null) => {
      // Written through the cache, so the header avatar reflects an upload made on a
      // portal page in the same render instead of only after the next login.
      queryClient.setQueryData<StudentSession | null>(SESSION_QUERY_KEY, (prev) =>
        prev ? { ...prev, student: { ...prev.student, photoUrl: photoUrl ?? undefined } } : prev,
      );
    },
    [queryClient],
  );

  const retrySessionCheck = useCallback(() => {
    // Nothing to reset by hand: `sessionError` is derived from the query, and
    // starting a fetch clears the error it was derived from.
    void refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setVerifyEnabled(false);
    // A sign-out destroys every cached entry, not just the token. Anything a signed-in
    // student's browser holds about that student — the session above, and whatever the
    // pages cache from here on — must not outlive the credential. Public data is simply
    // re-fetched by the page that shows it, which is cheaper than leaking.
    //
    // Dropping the cache also clears `sessionError`, so a logout after a failed
    // verification cannot leave the "Unable to verify your session" screen showing for
    // a visitor who is now signed out.
    queryClient.removeQueries();
  }, [queryClient]);

  return (
    <SessionContext.Provider
      value={{ session, authChecking, sessionError, retrySessionCheck, logout, setPhoto: handlePhotoChange }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
