import { ValidationError } from '../../utils/appError';
import { TtlCache } from '../../utils/ttlCache';
import {
  YouTubePreviewResult,
  YouTubePlaylistResult,
  YouTubePlaylistItem,
  YouTubeTranscriptResult,
  TranscriptSegment,
} from './courses.types';

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
  const match =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) ||
    url.trim().match(/^([\w-]{11})$/);
  if (!match) throw new ValidationError('Invalid YouTube URL');

  const videoId = match[1];
  let title: string | null = null;
  let description: string | null = null;
  let authorName: string | null = null;
  let durationSec: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            hl: 'en',
          },
        },
        videoId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (playerRes.ok) {
      const playerData = (await playerRes.json()) as any;
      if (playerData?.videoDetails) {
        title = playerData.videoDetails.title || null;
        description = playerData.videoDetails.shortDescription || null;
        authorName = playerData.videoDetails.author || null;
        if (playerData.videoDetails.lengthSeconds) {
          const parsed = parseInt(playerData.videoDetails.lengthSeconds, 10);
          if (!isNaN(parsed) && parsed > 0) durationSec = parsed;
        }
      }
    }
  } catch {
    // Network fallback
  }

  if (!title) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as any;
        title = data?.title || null;
        if (!authorName && data?.author_name) authorName = data.author_name;
      }
    } catch {
      // Network fallback
    }
  }

  return {
    videoId,
    title,
    description: description || (title ? `Complete instructional video on ${title}.` : null),
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embeddable: true,
    authorName,
    durationSec,
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_-]+)=(?:["']([^"']*)["']|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] !== undefined ? match[2] : match[3];
  }
  return attrs;
}

function parseXmlTranscript(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Format 3: <p t="ms" d="ms">text</p>
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(pMatch[1]);
    const rawContent = pMatch[2];
    if (attrs.t === undefined) continue;

    const startMs = parseFloat(attrs.t);
    const durMs = attrs.d !== undefined ? parseFloat(attrs.d) : 0;
    if (isNaN(startMs)) continue;

    const cleanText = decodeHtmlEntities(rawContent.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) continue;

    segments.push({
      text: cleanText,
      offset: parseFloat((startMs / 1000).toFixed(3)),
      duration: parseFloat(((isNaN(durMs) ? 0 : durMs) / 1000).toFixed(3)),
    });
  }

  if (segments.length > 0) {
    return segments;
  }

  // Classic format: <text start="s" dur="s">text</text>
  const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let textMatch: RegExpExecArray | null;
  while ((textMatch = textRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(textMatch[1]);
    const rawContent = textMatch[2];
    if (attrs.start === undefined) continue;

    const startSec = parseFloat(attrs.start);
    const durSec = attrs.dur !== undefined ? parseFloat(attrs.dur) : 0;
    if (isNaN(startSec)) continue;

    const cleanText = decodeHtmlEntities(rawContent.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) continue;

    segments.push({
      text: cleanText,
      offset: parseFloat(startSec.toFixed(3)),
      duration: parseFloat((isNaN(durSec) ? 0 : durSec).toFixed(3)),
    });
  }

  return segments;
}

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: Array<{ text: string }> };
}

function selectCaptionTrack(tracks: CaptionTrack[], requestedLang?: string): CaptionTrack | null {
  if (!tracks || tracks.length === 0) return null;

  if (requestedLang) {
    const exact = tracks.find((t) => t.languageCode?.toLowerCase() === requestedLang.toLowerCase());
    if (exact) return exact;
    const prefix = tracks.find((t) => t.languageCode?.toLowerCase().startsWith(requestedLang.toLowerCase()));
    if (prefix) return prefix;
  }

  const english = tracks.find(
    (t) => t.languageCode?.toLowerCase() === 'en' || t.languageCode?.toLowerCase().startsWith('en')
  );
  if (english) return english;

  return tracks[0] || null;
}

export const transcriptCache = new TtlCache<YouTubeTranscriptResult>(24 * 60 * 60 * 1000, 200);

export function clearTranscriptCache(): void {
  transcriptCache.clear();
}

async function doFetchYouTubeTranscript(
  videoId: string,
  lang?: string
): Promise<YouTubeTranscriptResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            hl: lang || 'en',
          },
        },
        videoId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!playerRes.ok) {
      return { segments: [], language: lang || 'en', available: false };
    }

    const playerData = (await playerRes.json()) as any;
    const tracks: CaptionTrack[] = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return { segments: [], language: lang || 'en', available: false };
    }

    const selectedTrack = selectCaptionTrack(tracks, lang);
    if (!selectedTrack?.baseUrl) {
      return { segments: [], language: lang || 'en', available: false };
    }

    const resolvedLanguage = selectedTrack.languageCode || lang || 'en';

    const trackController = new AbortController();
    const trackTimeout = setTimeout(() => trackController.abort(), 6000);
    const trackRes = await fetch(selectedTrack.baseUrl, {
      headers: {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      signal: trackController.signal,
    });
    clearTimeout(trackTimeout);

    if (!trackRes.ok) {
      return { segments: [], language: resolvedLanguage, available: false };
    }

    const xml = await trackRes.text();
    const segments = parseXmlTranscript(xml);

    if (segments.length === 0) {
      return { segments: [], language: resolvedLanguage, available: false };
    }

    return {
      segments,
      language: resolvedLanguage,
      available: true,
    };
  } catch {
    return { segments: [], language: lang || 'en', available: false };
  }
}

export async function fetchYouTubeTranscript(
  videoId: string,
  lang?: string
): Promise<YouTubeTranscriptResult> {
  if (!videoId || typeof videoId !== 'string') {
    return { segments: [], language: lang || 'en', available: false };
  }

  let cleanId = videoId.trim();
  const match = cleanId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match) {
    cleanId = match[1];
  }

  const cacheKey = lang ? `${cleanId}:${lang}` : cleanId;

  return transcriptCache.wrap(cacheKey, () => doFetchYouTubeTranscript(cleanId, lang));
}
