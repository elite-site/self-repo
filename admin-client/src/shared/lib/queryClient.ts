import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

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
 * Global 401 handler: on unauthorized response, broadcasts session-expired
 * event and redirects to login if unauthenticated.
 */
export function handleGlobal401(error: unknown): void {
  const status =
    error instanceof ApiError
      ? error.status
      : ((error as any)?.status ?? (error as any)?.response?.status);

  if (status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin-session-expired'));
    const isAtLogin =
      window.location.pathname === '/admin' ||
      window.location.pathname === '/admin/' ||
      window.location.pathname === '/';
    if (!isAtLogin) {
      window.location.assign('/admin');
    }
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
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
        staleTime: 30_000,
        gcTime: 5 * 60_000,
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
}

/** The single React Query client for the admin application. */
export const queryClient = createQueryClient();
