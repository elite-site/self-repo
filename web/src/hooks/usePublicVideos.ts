import { useEffect, useState } from 'react';
import { api } from '../services/api';
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
 * a child component. Without it a hero and a showcase on the same page would
 * each fire their own `/public/videos` call. Hook order is unconditional either
 * way, so switching between owning and borrowing never reorders hooks.
 */
export function usePublicVideos(preloaded?: PublicVideosState): PublicVideosState {
  const [videos, setVideos] = useState<PublicIntroVideo[]>(preloaded?.videos ?? []);
  const [loading, setLoading] = useState<boolean>(preloaded ? preloaded.loading : true);
  const [failed, setFailed] = useState<boolean>(preloaded?.failed ?? false);
  const ownsRequest = !preloaded;

  useEffect(() => {
    if (!ownsRequest) return;
    let cancelled = false;

    api
      .getPublicVideos()
      .then((res) => {
        if (!cancelled) setVideos(res.items);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ownsRequest]);

  return { videos, loading, failed };
}
