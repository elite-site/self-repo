import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StudentSession } from '../types';
import { api } from '../services/api';
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
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<StudentSession | null>(null);
  // Synchronously bootstrap token from URL if returning from Google OAuth redirect,
  // persisting it immediately into storage before any child routes mount or navigate.
  const [authChecking, setAuthChecking] = useState(() => bootstrapToken().needsVerification);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handlePhotoChange = useCallback((photoUrl: string | null) => {
    setSession((prev) =>
      prev ? { ...prev, student: { ...prev.student, photoUrl: photoUrl ?? undefined } } : prev,
    );
  }, []);

  const verifySession = useCallback((onSettled: () => void) => {
    api
      .getMe()
      .then((res) => setSession({ student: res.student }))
      .catch((err) => {
        const failure = classifySessionFailure(err);
        if (failure.kind === 'unauthorized') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setSession(null);
        } else {
          // A server-side failure must not masquerade as a logout. The retry
          // screen is shown instead of silently dumping the student on sign-in.
          console.error('Could not verify student session:', err);
          setSessionError(failure.message);
        }
      })
      .finally(onSettled);
  }, []);

  const retrySessionCheck = useCallback(() => {
    setSessionError(null);
    setAuthChecking(true);
    verifySession(() => setAuthChecking(false));
  }, [verifySession]);

  useEffect(() => {
    let cancelled = false;

    if (!hasStoredToken()) {
      // Nothing to verify, so nothing to wait for. This is the branch that lets
      // a signed-out visitor paint a public page without a network round trip.
      setSession(null);
      setAuthChecking(false);
      return () => {
        cancelled = true;
      };
    }

    setAuthChecking(true);
    verifySession(() => {
      if (!cancelled) setAuthChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [verifySession]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, authChecking, sessionError, retrySessionCheck, logout, setPhoto: handlePhotoChange }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
