import { QueryClient } from '@tanstack/react-query';

/**
 * The query cache and the keys that name its entries.
 *
 * A key is a contract shared by the component that fetches, the mutation that
 * invalidates, and the logout path that clears. All three must spell it the
 * same way or they quietly operate on separate cache slots, so keys live here
 * and nowhere else.
 */

/**
 * The verified student for this browser session.
 *
 * Written by `SessionProvider`, patched in place by `setPhoto`, and destroyed
 * wholesale on logout. `null` is a real value here, not an absence: it records
 * a `/me` that came back 401, so a signed-out visitor is never re-asked.
 */
export const SESSION_QUERY_KEY = ['session'] as const;

/** Faculty-approved, published introduction videos shown on public pages. */
export const PUBLIC_VIDEOS_QUERY_KEY = ['public', 'videos'] as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Half a minute of freshness. Enough that moving between two pages that
        // read the same list does not re-fetch it on every navigation, short
        // enough that a data entry never lingers long after it stops mattering.
        staleTime: 30_000,
        // Five minutes of grace for an entry nothing is reading. This cache is a
        // handoff between components, not a second database: it lives in memory
        // only, is never persisted, and is cleared on logout, so nothing a
        // student's browser holds about that student outlives the session.
        gcTime: 5 * 60_000,
        // One retry, which covers a request dropped mid-flight. More than that
        // does not rescue a genuinely failing endpoint, it just delays the error
        // state the UI has to be able to show.
        retry: 1,
        // The portal is idle on one route at a time. Refetching on focus would
        // re-fire every list the moment a student tabs back to the window.
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** The single client for the whole app, mounted by `QueryClientProvider`. */
export const queryClient = createQueryClient();