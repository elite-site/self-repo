import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/index';
import { AdminStats } from '../types';
import { getAdminStatsQueryKey } from './usePortalStats';

export const useStats = (eventId?: string) => {
  const query = useQuery<AdminStats>({
    queryKey: getAdminStatsQueryKey(eventId),
    queryFn: () => analyticsApi.getStats(eventId),
  });

  const loadStats = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    stats: query.data ?? null,
    loading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message || (query.error as Error)?.message || 'Failed to load stats')
      : null,
    loadStats,
  };
};
