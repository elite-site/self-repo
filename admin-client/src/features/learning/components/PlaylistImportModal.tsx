import React, { useState } from 'react';
import { ListVideo, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { learningAdminApi } from '../api';
import { YouTubePlaylistResult, YouTubePlaylistItem } from '../types';

export interface PlaylistImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (videos: YouTubePlaylistItem[]) => void | Promise<void>;
  isImporting?: boolean;
}

export const PlaylistImportModal: React.FC<PlaylistImportModalProps> = ({
  open,
  onClose,
  onImport,
  isImporting = false,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistData, setPlaylistData] = useState<YouTubePlaylistResult | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!playlistUrl.trim()) {
      setError('Please enter a YouTube playlist URL');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await learningAdminApi.previewYouTubePlaylist(playlistUrl.trim());
      setPlaylistData(data);
      // By default select all videos
      setSelectedVideoIds(new Set(data.videos.map((v) => v.videoId)));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Could not fetch playlist from YouTube');
      setPlaylistData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (!playlistData) return;
    if (selectedVideoIds.size === playlistData.videos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(playlistData.videos.map((v) => v.videoId)));
    }
  };

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const handleConfirmImport = async () => {
    if (!playlistData) return;
    const selectedVideos = playlistData.videos.filter((v) => selectedVideoIds.has(v.videoId));
    if (selectedVideos.length === 0) return;
    await onImport(selectedVideos);
    handleClose();
  };

  const handleClose = () => {
    setPlaylistUrl('');
    setPlaylistData(null);
    setError(null);
    setSelectedVideoIds(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Import from YouTube Playlist" size="lg">
      <div className="space-y-4">
        <form onSubmit={handleFetch} className="space-y-2">
          <label className="block text-xs font-medium text-ink-muted" htmlFor="yt-pl-url">
            YouTube Playlist URL or ID
          </label>
          <div className="flex gap-2">
            <input
              id="yt-pl-url"
              type="text"
              value={playlistUrl}
              onChange={(e) => {
                setPlaylistUrl(e.target.value);
                setError(null);
              }}
              placeholder="e.g. https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUxtBLNUcg3sts9m8xpm79"
              className="input flex-1 text-sm"
              disabled={loading || isImporting}
            />
            <button
              type="submit"
              disabled={loading || isImporting || !playlistUrl.trim()}
              className="btn btn-primary text-xs px-3.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListVideo className="w-3.5 h-3.5" />}
              {loading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
          <p className="text-[11px] text-ink-muted">
            Paste any public YouTube playlist URL or video link containing <code className="font-mono text-xs">list=...</code>
          </p>
          {error && (
            <div className="p-2.5 rounded-lg bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2 text-xs text-status-rejected">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {playlistData && (
          <div className="space-y-3 border-t border-edge pt-3">
            <div className="flex items-start justify-between gap-3 p-3 surface border border-edge rounded-lg">
              {playlistData.thumbnailUrl && (
                <img
                  src={playlistData.thumbnailUrl}
                  alt={playlistData.title || 'Playlist'}
                  className="w-24 h-16 object-cover rounded border border-edge shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-ink line-clamp-1">{playlistData.title || 'Untitled Playlist'}</h4>
                {playlistData.description && (
                  <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{playlistData.description}</p>
                )}
                <p className="text-xs text-ink-secondary mt-1 font-medium">
                  {playlistData.videoCount} videos found • {selectedVideoIds.size} selected
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <span>Select videos to import into course lessons:</span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-brand font-medium hover:underline cursor-pointer"
              >
                {selectedVideoIds.size === playlistData.videos.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-edge border border-edge rounded-lg surface">
              {playlistData.videos.map((vid, idx) => {
                const isChecked = selectedVideoIds.has(vid.videoId);
                return (
                  <div
                    key={`${vid.videoId}-${idx}`}
                    onClick={() => toggleVideo(vid.videoId)}
                    className="p-2.5 flex items-center gap-3 hover:bg-surface-sunken cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVideo(vid.videoId)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-edge"
                    />
                    <span className="text-xs font-mono text-ink-muted w-6 text-right shrink-0">{idx + 1}.</span>
                    <img
                      src={vid.thumbnailUrl}
                      alt=""
                      className="w-12 h-8 object-cover rounded border border-edge shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink truncate">{vid.title}</p>
                      {vid.durationText && (
                        <p className="text-[11px] text-ink-muted">{vid.durationText}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-edge">
              <button
                type="button"
                onClick={handleClose}
                disabled={isImporting}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || selectedVideoIds.size === 0}
                className="btn btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isImporting ? 'Importing Lessons...' : `Import ${selectedVideoIds.size} Lessons`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default PlaylistImportModal;
