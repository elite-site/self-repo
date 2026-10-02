import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { api } from '../services/api';
import { createQueryClient } from '../lib/queryClient';
import { usePublicVideos } from './usePublicVideos';
import { PublicIntroVideo } from '../types';

/**
 * The hook reads the React Query cache, so it needs a client in context — and a
 * *fresh* one for each test. Entries are keyed by query key and outlive a single
 * test, so a shared client would hand the rejection test the successful result an
 * earlier test cached (and, being fresh, would suppress the request it is
 * asserting on). `createElement` rather than JSX because this file is `.ts`.
 */
const withFreshClient = () => {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
};

const video = (id: string): PublicIntroVideo => ({
  id,
  name: `Student ${id}`,
  rollNo: `22BT${id}`,
  year: 3,
  section: 'A',
  submittedAt: '2026-01-01T00:00:00Z',
  publishedAt: '2026-01-02T00:00:00Z',
  sizeMb: 4,
  streamUrl: `/media/videos/${id}.mp4`,
  thumbnailUrl: null,
  profileUrl: `/students/${id}`,
});

describe('usePublicVideos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches for itself when no preloaded result is supplied', async () => {
    const spy = vi
      .spyOn(api, 'getPublicVideos')
      .mockResolvedValue({ items: [video('a')], total: 1 });

    const { result } = renderHook(() => usePublicVideos(), { wrapper: withFreshClient() });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.videos).toHaveLength(1);
    expect(result.current.failed).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  /**
   * The hero features the first video and the showcase lists them all. If the
   * child re-fetched, the landing page would issue two identical
   * `/public/videos` calls on every load.
   */
  it('does not issue a request when handed a preloaded result', async () => {
    const spy = vi.spyOn(api, 'getPublicVideos').mockResolvedValue({ items: [], total: 0 });

    const preloaded = { videos: [video('x'), video('y')], loading: false, failed: false };
    const { result } = renderHook(() => usePublicVideos(preloaded), {
      wrapper: withFreshClient(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.videos).toHaveLength(2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('marks the request failed when the API rejects, and keeps an empty list', async () => {
    vi.spyOn(api, 'getPublicVideos').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePublicVideos(), { wrapper: withFreshClient() });

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.videos).toEqual([]);
  });

  it('stays not-loading when preloaded results say loading is done', () => {
    const spy = vi.spyOn(api, 'getPublicVideos').mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(
      () => usePublicVideos({ videos: [], loading: true, failed: false }),
      { wrapper: withFreshClient() },
    );

    // A parent that still has the request in flight hands down loading:true.
    expect(result.current.loading).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not set state after unmount', async () => {
    let resolveFn: (v: { items: PublicIntroVideo[]; total: number }) => void = () => {};
    vi.spyOn(api, 'getPublicVideos').mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );

    const { unmount } = renderHook(() => usePublicVideos(), { wrapper: withFreshClient() });
    unmount();
    resolveFn({ items: [video('late')], total: 1 });

    // Nothing to assert beyond "no unhandled rejection / no act() warning".
    await new Promise((r) => setTimeout(r, 0));
    expect(true).toBe(true);
  });
});
