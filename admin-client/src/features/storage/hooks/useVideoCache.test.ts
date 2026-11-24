import { createElement, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  getVideoCache: vi.fn(),
  retryVideoCache: vi.fn(),
  purgeIdleVideoCache: vi.fn(),
}));
vi.mock('../api/index', () => ({ storageApi: apiMock }));

import { createQueryClient } from '@/shared/lib/queryClient';
import {
  usePurgeIdleVideoCacheMutation,
  useRetryVideoCacheMutation,
  useVideoCacheQuery,
} from './useVideoCache';

const cachePage = {
  entries: [],
  totals: { usedBytes: '0', maxBytes: '1000000', counts: { ready: 0, copying: 0, failed: 0, total: 0 } },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

const withClient = (client: ReturnType<typeof createQueryClient>) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
};

beforeEach(() => {
  apiMock.getVideoCache.mockReset().mockResolvedValue(cachePage);
  apiMock.retryVideoCache.mockReset();
  apiMock.purgeIdleVideoCache.mockReset();
});

describe('useVideoCacheQuery', () => {
  it('maps filter state to the API request and exposes the cache page', async () => {
    const { result } = renderHook(() => useVideoCacheQuery(2, 'FAILED'), {
      wrapper: withClient(createQueryClient()),
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock.getVideoCache).toHaveBeenCalledWith({ page: 2, limit: 10, status: 'FAILED' });
    expect(result.current.data).toEqual(cachePage);
    expect(result.current.error).toBeNull();
  });
});

describe('video cache mutations', () => {
  it('invalidates the cache after a successful retry', async () => {
    const client = createQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    apiMock.retryVideoCache.mockResolvedValue({ success: true, message: 'queued' });
    const { result } = renderHook(() => useRetryVideoCacheMutation(), {
      wrapper: withClient(client),
    });

    await act(async () => {
      await result.current.mutateAsync('cache-1');
    });

    expect(apiMock.retryVideoCache).toHaveBeenCalledWith('cache-1');
    expect(invalidate).toHaveBeenCalled();
  });

  it('invalidates the cache after a successful purge', async () => {
    const client = createQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    apiMock.purgeIdleVideoCache.mockResolvedValue({ success: true, message: 'done', evictedCount: 0, freedBytes: '0' });
    const { result } = renderHook(() => usePurgeIdleVideoCacheMutation(), {
      wrapper: withClient(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidate).toHaveBeenCalled();
  });
});
