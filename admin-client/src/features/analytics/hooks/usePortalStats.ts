import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/index';
import { AdminStats } from '../types';
import { ACTIVE_EVENT_ID } from '@/shared/layout/Sidebar';

export const getAdminStatsQueryKey = (eventId?: string) =>
  ['admin', 'stats', eventId ?? 'default'] as const;

/** Header badge data, sharing the same cache entry as the dashboard stats hook. */
export function usePortalStats(): AdminStats | null {
  const { data } = useQuery<AdminStats>({
    queryKey: getAdminStatsQueryKey(ACTIVE_EVENT_ID),
    queryFn: () => analyticsApi.getStats(ACTIVE_EVENT_ID),
    retry: false,
  });

  return data ?? null;
}
