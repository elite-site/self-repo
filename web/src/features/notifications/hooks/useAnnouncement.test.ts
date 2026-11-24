import { createElement, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ getAnnouncement: vi.fn() }));
vi.mock('../api', () => ({ notificationsApi: apiMock }));

import { createQueryClient } from '@/shared/lib/queryClient';
import { useAnnouncement } from './useAnnouncement';

const announcement = {
  id: 'notice-1',
  title: 'Synthetic notice',
  body: 'Synthetic body',
  createdAt: '2026-01-01T00:00:00Z',
};

const withFreshClient = () => {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
};

beforeEach(() => {
  apiMock.getAnnouncement.mockReset();
});

describe('useAnnouncement', () => {
  it('loads a single announcement for the route id', async () => {
    apiMock.getAnnouncement.mockResolvedValue(announcement);

    const { result } = renderHook(() => useAnnouncement('notice-1'), {
      wrapper: withFreshClient(),
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock.getAnnouncement).toHaveBeenCalledWith('notice-1');
    expect(result.current.announcement).toEqual(announcement);
    expect(result.current.error).toBeNull();
  });

  it('turns a failed read into a user-facing error and an empty view', async () => {
    apiMock.getAnnouncement.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useAnnouncement('notice-2'), {
      wrapper: withFreshClient(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.announcement).toBeNull();
    expect(result.current.error).toBe('This announcement is no longer available.');
  });

  it('does not request anything without an id', () => {
    const { result } = renderHook(() => useAnnouncement(undefined), {
      wrapper: withFreshClient(),
    });

    expect(result.current.loading).toBe(false);
    expect(apiMock.getAnnouncement).not.toHaveBeenCalled();
  });
});
