import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/index';
import { AdminStats } from '@/types';

const PORTAL_STATS_QUERY_KEY = ['admin', 'stats', 'header'] as const;

/** Header badge data, fetched by the route so shared layout stays feature-free. */
export function usePortalStats(): AdminStats | null {
  const { data } = useQuery<AdminStats>({
    queryKey: PORTAL_STATS_QUERY_KEY,
    queryFn: () => analyticsApi.getStats(),
    retry: false,
  });

  return data ?? null;
}
