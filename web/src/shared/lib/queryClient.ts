import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

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

function handleGlobalAuthError(error: unknown): void {
  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if ((status === 401 || status === 403) && typeof window !== 'undefined') {
    if (status === 401) {
      localStorage.removeItem('student_token');
      window.dispatchEvent(new CustomEvent('elite-session-expired'));
    }
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleGlobalAuthError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleGlobalAuthError(error);
      },
    }),
    defaultOptions: {
      queries: {
        // 30 s is fresh enough for dashboard data and avoids a refetch storm
        // when navigating between pages or returning to a tab. Queries that
        // need instant cross-tab sync (session) override this individually.
        staleTime: 30_000,
        // Five minutes of grace for an entry nothing is reading.
        gcTime: 5 * 60_000,
        // No retry on 4xx client errors (400, 401, 403, 404, etc.); 1 retry for network drops or 5xx
        retry: (failureCount, error: any) => {
          const status = error?.status ?? error?.response?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        // Off globally — only the session query opts back in so that a photo
        // change made in another tab is picked up without a full page reload.
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** The single client for the whole app, mounted by `QueryClientProvider`. */
export const queryClient = createQueryClient();