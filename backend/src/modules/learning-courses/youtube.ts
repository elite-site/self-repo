import { ValidationError } from '../../utils/appError';
import { YouTubePreviewResult } from './courses.types';

export async function fetchYouTubePreview(url: string): Promise<YouTubePreviewResult> {
  if (!url || typeof url !== 'string') throw new ValidationError('YouTube URL is required');
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (!match) throw new ValidationError('Invalid YouTube URL');

  const videoId = match[1];
  let title: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as any;
      title = data?.title || null;
    }
  } catch {
    // Network fallback
  }

  return {
    videoId,
    title,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embeddable: true,
  };
}
