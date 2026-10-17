import { QueryClient, QueryCache, MutationCache, dehydrate, hydrate } from '@tanstack/react-query';

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

export const CACHE_STORAGE_KEY = 'elite_query_cache_v1';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function clearPersistedQueryCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

export function restoreQueryCache(client: QueryClient): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const { timestamp, clientState } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_MAX_AGE_MS) {
      clearPersistedQueryCache();
      return;
    }
    hydrate(client, clientState);
  } catch {
    clearPersistedQueryCache();
  }
}

export function setupQueryCachePersistence(client: QueryClient): () => void {
  if (typeof window === 'undefined') return () => {};

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const saveCache = () => {
    try {
      const clientState = dehydrate(client, {
        shouldDehydrateQuery: (query) => {
          // Never persist session data to query cache (handled by sessionBootstrap)
          const firstKey = query.queryKey[0];
          return firstKey !== 'session' && query.state.status === 'success';
        },
      });
      window.localStorage.setItem(
        CACHE_STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), clientState })
      );
    } catch {
      // Storage quota or private browsing restriction - non-fatal
    }
  };

  const scheduleSave = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveCache();
    }, 2000);
  };

  const unsubscribe = client.getQueryCache().subscribe(() => {
    scheduleSave();
  });

  const handleBeforeUnload = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveCache();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    unsubscribe();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (saveTimer) clearTimeout(saveTimer);
  };
}

function handleGlobalAuthError(error: unknown): void {
  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if ((status === 401 || status === 403) && typeof window !== 'undefined') {
    if (status === 401) {
      localStorage.removeItem('student_token');
      clearPersistedQueryCache();
      window.dispatchEvent(new CustomEvent('elite-session-expired'));
    }
  }
}

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
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
        // 60s is fresh enough for app data and avoids a refetch storm
        // when navigating between pages or returning to a tab.
        staleTime: 60_000,
        // Fifteen minutes of grace for an entry nothing is reading.
        gcTime: 15 * 60_000,
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

  restoreQueryCache(client);
  if (typeof window !== 'undefined') {
    setupQueryCachePersistence(client);
  }

  return client;
}

/** The single client for the whole app, mounted by `QueryClientProvider`. */
export const queryClient = createQueryClient();