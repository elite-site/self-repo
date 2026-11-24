import { cachedFetch, client } from './client';
import { PublicIntroVideo } from '@/shared/types';

export const publicVideosApi = {
  async getPublicVideos(limit?: number): Promise<{ items: PublicIntroVideo[]; total: number }> {
    return cachedFetch(`videos_${limit || 0}`, 30_000, async () => {
      const res = await client.get('/public/videos', { params: limit ? { limit } : undefined });
      return { items: res.data?.items ?? [], total: res.data?.total ?? 0 };
    });
  },
};
