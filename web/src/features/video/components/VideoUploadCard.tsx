import React from 'react';
import { FileVideo, X, Info } from 'lucide-react';
import { UploadStats, VideoMeta } from '../types';

interface VideoUploadCardProps {
  uploading: boolean;
  uploadProgress: number;
  uploadStats: UploadStats | null;
  videoMeta: VideoMeta | null;
  maxVideoSizeMb: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCancelUpload: () => void;
  onSelectClick: () => void;
}

export const VideoUploadCard: React.FC<VideoUploadCardProps> = ({
  uploading,
  uploadProgress,
  uploadStats,
  videoMeta,
  maxVideoSizeMb,
  onCancelUpload,
  onSelectClick,
}) => {
  if (uploading) {
    return (
      <div className="border border-dashed border-edge-strong/40 bg-brand-soft/20 rounded-lg p-8 sm:p-12 text-center space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink font-heading">
            {uploadStats?.phase === 'confirming'
              ? 'Almost done. Saving your video'
              : 'Uploading your video'}
          </h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            Keep this tab open until it finishes.
          </p>
        </div>

        <div className="w-80 max-w-full mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-brand-soft rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand h-full rounded-full transition-transform duration-base ease-standard"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-ink shrink-0">{uploadProgress}%</span>
          </div>

          {uploadStats && (
            <div className="flex items-center justify-between text-xs text-ink-secondary px-0.5">
              <span>{uploadStats.loadedMb} / {uploadStats.totalMb} MB</span>
              <div className="flex items-center gap-2.5">
                {uploadStats.speedFormatted && (
                  <span className="font-semibold text-ink">{uploadStats.speedFormatted}</span>
                )}
                {uploadStats.etaFormatted && (
                  <span className="text-ink-muted">{uploadStats.etaFormatted}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {videoMeta && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
              File: {videoMeta.sizeMb} MB
            </span>
            {videoMeta.durationFormatted && (
              <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
                Duration: {videoMeta.durationFormatted}
              </span>
            )}
            {videoMeta.resolutionFormatted && (
              <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
                Resolution: {videoMeta.resolutionFormatted}
              </span>
            )}
          </div>
        )}

        {videoMeta?.durationNotice && (
          <div className="max-w-md mx-auto p-2 bg-brand-soft/40 border border-brand/30 rounded-lg text-xs text-brand-soft-text text-left flex items-start gap-1.5">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <span>{videoMeta.durationNotice}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={onCancelUpload}
            className="text-xs font-semibold text-ink-muted hover:text-status-rejected transition-colors inline-flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <X className="w-3.5 h-3.5" /> Cancel upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelectClick}
      className="border-2 border-dashed border-edge hover:border-edge-strong bg-surface-canvas hover:bg-brand-soft/10 rounded-lg p-6 sm:p-12 flex flex-col items-center text-center justify-center min-h-[300px] transition-colors cursor-pointer group"
    >
      <div className="w-16 h-16 rounded-lg bg-surface border border-edge flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-card">
        <FileVideo className="w-8 h-8 text-brand" />
      </div>
      <h3 className="font-bold text-base text-ink font-heading">Upload your introduction video</h3>
      <p className="text-xs text-ink-secondary max-w-sm mt-1.5 mb-2">
        MP4, WebM or MOV, up to {maxVideoSizeMb} MB. Aim for 60 to 90 seconds.
      </p>
      <p className="text-xs text-ink-muted max-w-sm mb-6">
        A 720p video is smaller and uploads faster.
      </p>
      <button type="button" className="btn btn-primary min-h-[44px]">
        Upload video
      </button>
    </div>
  );
};
