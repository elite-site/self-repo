import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  CACHE_STORAGE_KEY,
  SESSION_QUERY_KEY,
  restoreQueryCache,
  setupQueryCachePersistence,
} from '../queryClient';
import { TOKEN_STORAGE_KEY } from '@/shared/utils/sessionBootstrap';

describe('queryClient session cache persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('persists session snapshot when a stored token exists and hydrates it on reload', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'synthetic-jwt');
    const client = new QueryClient();
    const teardown = setupQueryCachePersistence(client);

    const syntheticSession = {
      student: {
        id: 'student-1',
        rollNo: 'SYN001',
        name: 'Synthetic Student',
        year: 2,
        section: 'A',
        branch: 'IT',
        status: 'ACTIVE',
      },
    };

    client.setQueryData(SESSION_QUERY_KEY, syntheticSession);
    vi.advanceTimersByTime(2100);
    teardown();

    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    expect(raw).toBeTruthy();

    const reloadedClient = new QueryClient();
    restoreQueryCache(reloadedClient);
    expect(reloadedClient.getQueryData(SESSION_QUERY_KEY)).toEqual(syntheticSession);
    vi.useRealTimers();
  });

  it('does not write to localStorage on non-success query observer ticks', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const client = new QueryClient();
    const teardown = setupQueryCachePersistence(client);

    const observer = client.getQueryCache().build(client, { queryKey: ['idle-probe'] });
    observer.setState({ status: 'pending', fetchStatus: 'fetching' } as never);
    vi.advanceTimersByTime(2500);

    expect(setItemSpy).not.toHaveBeenCalled();
    teardown();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('drops any cached session during restore when no token is stored', () => {
    localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: SESSION_QUERY_KEY,
              queryHash: '["session"]',
              state: {
                status: 'success',
                data: { student: { id: 'student-1', name: 'Synthetic' } },
                dataUpdatedAt: Date.now(),
              },
            },
          ],
        },
      }),
    );

    const client = new QueryClient();
    restoreQueryCache(client);
    expect(client.getQueryData(SESSION_QUERY_KEY)).toBeUndefined();
    vi.useRealTimers();
  });
});
