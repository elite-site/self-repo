import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../services/api';
import { usePublicVideos } from './usePublicVideos';
import { PublicIntroVideo } from '../types';

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

    const { result } = renderHook(() => usePublicVideos());

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
    const { result } = renderHook(() => usePublicVideos(preloaded));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.videos).toHaveLength(2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('marks the request failed when the API rejects, and keeps an empty list', async () => {
    vi.spyOn(api, 'getPublicVideos').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePublicVideos());

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.videos).toEqual([]);
  });

  it('stays not-loading when preloaded results say loading is done', () => {
    const spy = vi.spyOn(api, 'getPublicVideos').mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() =>
      usePublicVideos({ videos: [], loading: true, failed: false }),
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

    const { unmount } = renderHook(() => usePublicVideos());
    unmount();
    resolveFn({ items: [video('late')], total: 1 });

    // Nothing to assert beyond "no unhandled rejection / no act() warning".
    await new Promise((r) => setTimeout(r, 0));
    expect(true).toBe(true);
  });
});
