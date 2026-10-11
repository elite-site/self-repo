import React from 'react';
import { HardDrive } from 'lucide-react';

interface StorageLimitsSectionProps {
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export const StorageLimitsSection: React.FC<StorageLimitsSectionProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
        <HardDrive className="w-4 h-4 text-ink-brand" />
        Media Upload & Storage Thresholds
      </h2>
      <p className="text-xs text-ink-muted mb-6">
        Upper-bound file size constraints enforced during direct uploads.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Max Video Submission Size (MB)
          </label>
          <input
            type="number"
            value={settings.max_video_size_mb || ''}
            onChange={(e) => onChange('max_video_size_mb', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
          />
          <span className="text-xs text-ink-muted mt-1 block">
            Standard introduction video MP4/WebM ceiling. Applied to every upload; capped at 100 MB.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
            Max Photo / Document Size (MB)
          </label>
          <input
            type="number"
            value={settings.max_photo_size_mb || ''}
            onChange={(e) => onChange('max_photo_size_mb', e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
          />
          <span className="text-xs text-ink-muted mt-1 block">
            Headshot photos, certificate proofs, and resumes (Default: 10 MB)
          </span>
        </div>
      </div>
    </div>
  );
};
