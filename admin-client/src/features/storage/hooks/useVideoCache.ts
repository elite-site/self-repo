import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storageApi } from '../api/index';
import { VideoCacheResponse } from '../types';

export const VIDEO_CACHE_QUERY_KEY = ['admin', 'video-cache'] as const;

export function useVideoCacheQuery(page: number, status: string) {
  const query = useQuery<VideoCacheResponse>({
    queryKey: [...VIDEO_CACHE_QUERY_KEY, page, status],
    queryFn: () =>
      storageApi.getVideoCache({
        page,
        limit: 10,
        status: status === 'ALL' ? undefined : status,
      }),
    retry: false,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending || (query.isFetching && !query.data),
    error: query.isError ? 'Failed to load video cache status' : null,
    refetch: query.refetch,
  };
}

export function useRetryVideoCacheMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storageApi.retryVideoCache(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VIDEO_CACHE_QUERY_KEY }),
  });
}

export function usePurgeIdleVideoCacheMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => storageApi.purgeIdleVideoCache(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VIDEO_CACHE_QUERY_KEY }),
  });
}
