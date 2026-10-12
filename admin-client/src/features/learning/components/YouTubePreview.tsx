import React, { useState } from 'react';
import { Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { learningAdminApi } from '../api';

export interface YouTubePreviewProps {
  url?: string;
  onUrlChange?: (url: string, videoId?: string) => void;
}

const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

export const YouTubePreview: React.FC<YouTubePreviewProps> = ({ url = '', onUrlChange }) => {
  const [inputUrl, setInputUrl] = useState(url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    videoId: string;
    title: string | null;
    thumbnailUrl: string | null;
    embeddable: boolean;
  } | null>(null);

  const handleFetchPreview = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setError(null);
      setPreview(null);
      return;
    }

    const match = trimmed.match(YOUTUBE_REGEX);
    if (!match) {
      setError('Invalid YouTube URL. Supported formats: watch?v=, youtu.be/, shorts/, embed/.');
      setPreview(null);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await learningAdminApi.previewYouTube(trimmed);
      setPreview(data);
      onUrlChange?.(trimmed, data.videoId);
    } catch {
      setError('Failed to fetch video preview from YouTube.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);
    if (!val) {
      setPreview(null);
      setError(null);
      onUrlChange?.('');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="yt-url" className="block text-xs font-medium text-ink-muted mb-1">
          YouTube URL
        </label>
        <div className="flex gap-2">
          <input
            id="yt-url"
            type="url"
            value={inputUrl}
            onChange={handleChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input text-sm flex-1"
          />
          <button
            type="button"
            onClick={() => handleFetchPreview(inputUrl)}
            disabled={loading || !inputUrl.trim()}
            className="btn btn-secondary text-xs px-3 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
            Preview
          </button>
        </div>
        {error && (
          <p className="text-xs text-status-rejected mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
      </div>

      {preview && (
        <div className="surface border border-edge rounded-lg p-3 flex gap-3 items-start animate-fade-in">
          {preview.thumbnailUrl ? (
            <img
              src={preview.thumbnailUrl}
              alt={preview.title || 'YouTube thumbnail'}
              className="w-28 h-18 object-cover rounded border border-edge flex-shrink-0"
            />
          ) : (
            <div className="w-28 h-18 bg-surface-sunken rounded border border-edge flex items-center justify-center text-ink-muted">
              <Video className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-ink line-clamp-2">
              {preview.title || 'Untitled YouTube Video'}
            </h4>
            <p className="text-xs text-ink-muted mt-1 font-mono">ID: {preview.videoId}</p>
            <div className="mt-2">
              {preview.embeddable ? (
                <span className="badge badge-approved text-xs inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Embeddable
                </span>
              ) : (
                <span className="badge badge-rejected text-xs inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not embeddable
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
