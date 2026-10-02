import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { PUBLIC_VIDEOS_QUERY_KEY } from '../lib/queryClient';
import { PublicIntroVideo } from '../types';

export interface PublicVideosState {
  videos: PublicIntroVideo[];
  loading: boolean;
  failed: boolean;
}

/**
 * Loads the public introduction videos.
 *
 * Only videos approved by faculty AND published are returned by the API, so an
 * empty result is a normal state and not an error.
 *
 * `preloaded` lets a page that already owns the request hand its result down to
 * a child component. The shared cache now dedupes on its own — two hooks asking
 * for this key on one page share a single request — but the parameter stays,
 * because a component handed `videos` cannot know whether its parent was the one
 * that fetched them, and must not start a second one. Hook order is
 * unconditional either way, so switching between owning and borrowing never
 * reorders hooks.
 */
export function usePublicVideos(preloaded?: PublicVideosState): PublicVideosState {
  const ownsRequest = !preloaded;
  const { data, isPending, isError } = useQuery<PublicIntroVideo[]>({
    queryKey: PUBLIC_VIDEOS_QUERY_KEY,
    queryFn: async () => (await api.getPublicVideos()).items,
    enabled: ownsRequest,
    // No retry. The failure is a normal state this hook reports (`failed`), and a
    // retry would keep the list in its loading state for longer than the page is
    // willing to wait before it can show that state.
    retry: false,
  });

  return {
    videos: preloaded?.videos ?? data ?? [],
    loading: preloaded ? preloaded.loading : isPending,
    failed: preloaded?.failed ?? isError,
  };
}
