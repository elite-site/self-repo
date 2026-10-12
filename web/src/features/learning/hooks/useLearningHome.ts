import { useQuery } from '@tanstack/react-query';
import { learningApi } from '../api';
import { HomeFeedResponse } from '../types';

export function useLearningHomeQuery() {
  return useQuery<HomeFeedResponse>({
    queryKey: ['learning', 'home'],
    queryFn: () => learningApi.getHomeFeed(),
    staleTime: 60_000,
  });
}
