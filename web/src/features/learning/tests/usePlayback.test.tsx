import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from '../hooks/usePlayback';
import { learningApi } from '../api';

vi.mock('../api', () => ({
  learningApi: {
    getPlayback: vi.fn(),
    heartbeatPlayback: vi.fn(),
    releasePlayback: vi.fn().mockResolvedValue({ released: true }),
  },
}));

describe('usePlayback hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in IDLE when no lessonId provided', () => {
    const { result } = renderHook(() => usePlayback(''));
    expect(result.current.status).toBe('IDLE');
    expect(result.current.url).toBeNull();
  });

  it('handles PREPARING status and polls again after retryAfterSec', async () => {
    vi.mocked(learningApi.getPlayback)
      .mockResolvedValueOnce({
        status: 'PREPARING',
        retryAfterSec: 2,
      })
      .mockResolvedValueOnce({
        status: 'READY',
        url: 'https://r2.example.com/polled.mp4',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        leaseId: 'lease-poll',
      });

    const { result } = renderHook(() => usePlayback('lesson-poll'));

    // First request triggers
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('PREPARING');
    expect(learningApi.getPlayback).toHaveBeenCalledTimes(1);

    // Fast-forward 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(learningApi.getPlayback).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('READY');
    expect(result.current.url).toBe('https://r2.example.com/polled.mp4');
  });

  it('performs periodic 60s heartbeat while READY', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/stream-1.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-hb',
    });

    vi.mocked(learningApi.heartbeatPlayback).mockResolvedValueOnce({
      url: 'https://r2.example.com/stream-refreshed.mp4',
      expiresAt: new Date(Date.now() + 360_000).toISOString(),
    });

    const { result } = renderHook(() => usePlayback('lesson-hb'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('READY');
    expect(result.current.url).toBe('https://r2.example.com/stream-1.mp4');

    // Advance 60 seconds
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(learningApi.heartbeatPlayback).toHaveBeenCalledWith('lesson-hb');
    expect(result.current.url).toBe('https://r2.example.com/stream-refreshed.mp4');
  });

  it('releases playback lease on unmount and triggers sendBeacon on pagehide', async () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconMock,
      configurable: true,
      writable: true,
    });

    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/release-test.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-rel',
    });

    const { unmount } = renderHook(() => usePlayback('lesson-rel'));

    await act(async () => {
      await Promise.resolve();
    });

    // Fire pagehide
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(sendBeaconMock).toHaveBeenCalledWith(
      expect.stringContaining('/student/learning/lessons/lesson-rel/playback/release'),
    );

    // Unmount
    unmount();

    expect(learningApi.releasePlayback).toHaveBeenCalledWith('lesson-rel');
  });
});
