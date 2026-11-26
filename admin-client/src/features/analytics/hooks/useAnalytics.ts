import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/index';
import { AnalyticsResponse } from '../types';

export const ANALYTICS_QUERY_KEY = ['admin', 'analytics'] as const;

export const useAnalytics = () => {
  const query = useQuery<AnalyticsResponse>({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: () => analyticsApi.getAnalytics(),
  });

  const loadAnalytics = useCallback(
    async (_isManual = false) => {
      await query.refetch();
    },
    [query],
  );

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message || (query.error as Error)?.message || 'Failed to load system analytics')
      : null,
    refreshing: query.isFetching && !query.isPending,
    loadAnalytics,
  };
};
