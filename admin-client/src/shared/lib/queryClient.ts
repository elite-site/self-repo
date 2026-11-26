import { QueryClient, QueryCache, MutationCache, dehydrate, hydrate } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

export const ADMIN_SESSION_QUERY_KEY = ['admin', 'session'] as const;
export const ADMIN_CACHE_STORAGE_KEY = 'elite_admin_query_cache_v1';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function clearPersistedQueryCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ADMIN_CACHE_STORAGE_KEY);
  } catch {
    // Non-fatal in private mode or restricted storage
  }
}

export function restoreQueryCache(client: QueryClient): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(ADMIN_CACHE_STORAGE_KEY);
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
        shouldDehydrateQuery: (query) => query.state.status === 'success',
      });
      window.localStorage.setItem(
        ADMIN_CACHE_STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), clientState }),
      );
    } catch {
      // Non-fatal: quota or private browsing restrictions
    }
  };

  const scheduleSave = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveCache();
    }, 2000);
  };

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (
      event.type === 'removed' ||
      (event.type === 'updated' && event.action.type === 'success')
    ) {
      scheduleSave();
    }
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

/**
 * Checks whether an error is a 4xx client failure.
 * Per ERR-20, queries must not retry client-side errors.
 */
export function is4xxError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 400 && error.status < 500;
  }
  const status = (error as any)?.status ?? (error as any)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Global 401 handler: clears persisted cache and notifies AuthProvider so the
 * login gate renders cleanly without triggering a full-page browser reload.
 */
export function handleGlobal401(error: unknown): void {
  const status =
    error instanceof ApiError
      ? error.status
      : ((error as any)?.status ?? (error as any)?.response?.status);

  if (status === 401 && typeof window !== 'undefined') {
    clearPersistedQueryCache();
    window.dispatchEvent(new CustomEvent('admin-session-expired'));
  }
}

export function createQueryClient(options: { persist?: boolean } = {}): QueryClient {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleGlobal401(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleGlobal401(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry on 4xx client errors
          if (is4xxError(error)) {
            return false;
          }
          // Retry dropped/transient connections at most once
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

  if (options.persist) {
    restoreQueryCache(client);
    if (typeof window !== 'undefined') {
      setupQueryCachePersistence(client);
    }
  }

  return client;
}

/** The single React Query client for the admin application. */
export const queryClient = createQueryClient({ persist: true });
