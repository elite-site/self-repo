import { useQuery } from '@tanstack/react-query';
import { searchApi, type SearchResponse } from '@/shared/api/search';

/** Query key factory for portal-wide search (UI-8). */
export const searchKeys = {
  all: ['search'] as const,
  query: (q: string) => [...searchKeys.all, q] as const,
};

/**
 * React Query wrapper over the portal-wide search API.
 *
 * Only fires once the trimmed query is at least two characters (PERF-6) and
 * forwards React Query's `AbortSignal` so superseded requests are cancelled.
 */
export function useSearchQuery(q: string, enabled = true) {
  const trimmed = q.trim();

  return useQuery<SearchResponse>({
    queryKey: searchKeys.query(trimmed),
    queryFn: ({ signal }) => searchApi.search({ q: trimmed }, signal),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 2 * 60_000,
  });
}
