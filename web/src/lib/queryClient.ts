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
        // 30 s is fresh enough for dashboard data and avoids a refetch storm
        // when navigating between pages or returning to a tab. Queries that
        // need instant cross-tab sync (session) override this individually.
        staleTime: 30_000,
        // Five minutes of grace for an entry nothing is reading.
        gcTime: 5 * 60_000,
        // One retry covers a dropped request. More just delays the error state.
        retry: 1,
        // Off globally — only the session query opts back in so that a photo
        // change made in another tab is picked up without a full page reload.
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** The single client for the whole app, mounted by `QueryClientProvider`. */
export const queryClient = createQueryClient();