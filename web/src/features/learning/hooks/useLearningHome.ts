import { useQuery } from '@tanstack/react-query';
import { learningApi } from '../api';
import { HomeFeedResponse } from '../types';

export function useLearningHomeQuery(options?: { enabled?: boolean }) {
  return useQuery<HomeFeedResponse>({
    queryKey: ['learning', 'home'],
    queryFn: () => learningApi.getHomeFeed(),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}
