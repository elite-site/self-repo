import { ValidationError } from '../../utils/appError';
import { YouTubePreviewResult, YouTubePlaylistResult, YouTubePlaylistItem } from './courses.types';

export function parseDurationText(text?: string | null): number | null {
  if (!text) return null;
  const parts = text.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

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

export async function fetchYouTubePlaylist(urlOrId: string): Promise<YouTubePlaylistResult> {
  if (!urlOrId || typeof urlOrId !== 'string') throw new ValidationError('YouTube playlist URL or ID is required');

  const match = urlOrId.match(/[?&]list=([a-zA-Z0-9_-]+)/) || urlOrId.match(/^(PL[a-zA-Z0-9_-]+)$/);
  if (!match) throw new ValidationError('Invalid YouTube playlist URL or ID (expected playlist link or list= parameter)');

  const playlistId = match[1];

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`YouTube responded with HTTP ${res.status}`);
    html = await res.text();
  } catch (err: any) {
    throw new ValidationError(`Failed to fetch playlist from YouTube: ${err.message || 'Network error'}`);
  }

  const dataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) || html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (!dataMatch) {
    throw new ValidationError('Could not extract playlist data from YouTube');
  }

  let data: any;
  try {
    data = JSON.parse(dataMatch[1]);
  } catch {
    throw new ValidationError('Could not parse YouTube playlist metadata');
  }

  let playlistTitle =
    data.metadata?.playlistMetadataRenderer?.title ||
    data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
    data.header?.playlistHeaderRenderer?.title?.simpleText ||
    data.microformat?.microformatDataRenderer?.title ||
    null;

  if (playlistTitle && playlistTitle.endsWith(' - YouTube')) {
    playlistTitle = playlistTitle.replace(/ - YouTube$/, '');
  }

  const description =
    data.metadata?.playlistMetadataRenderer?.description ||
    data.header?.playlistHeaderRenderer?.descriptionText?.simpleText ||
    null;

  const videos: YouTubePlaylistItem[] = [];
  const seen = new Set<string>();

  function scan(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (obj.lockupViewModel) {
      const lm = obj.lockupViewModel;
      const title = lm.metadata?.lockupMetadataViewModel?.title?.content;
      const str = JSON.stringify(lm);
      const vMatch = str.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      const durTextMatch = str.match(/"thumbnailBadgeViewModel":\{"text":"([0-9:]+)"/);
      const durText = durTextMatch ? durTextMatch[1] : null;

      if (title && vMatch && !seen.has(vMatch[1])) {
        seen.add(vMatch[1]);
        videos.push({
          videoId: vMatch[1],
          title: title.trim(),
          durationText: durText,
          durationSec: parseDurationText(durText),
          thumbnailUrl: `https://i.ytimg.com/vi/${vMatch[1]}/hqdefault.jpg`,
        });
      }
    }

    if (obj.playlistVideoRenderer) {
      const vr = obj.playlistVideoRenderer;
      if (vr.videoId && !seen.has(vr.videoId)) {
        seen.add(vr.videoId);
        const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Untitled';
        const lengthSeconds = vr.lengthSeconds ? parseInt(vr.lengthSeconds, 10) : null;
        const durText = vr.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || null;
        videos.push({
          videoId: vr.videoId,
          title: title.trim(),
          durationText: durText,
          durationSec: lengthSeconds,
          thumbnailUrl: `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
        });
      }
    }

    for (const k of Object.keys(obj)) {
      scan(obj[k]);
    }
  }

  scan(data);

  return {
    playlistId,
    title: playlistTitle,
    description,
    thumbnailUrl: videos[0]?.thumbnailUrl || null,
    videoCount: videos.length,
    videos,
  };
}
