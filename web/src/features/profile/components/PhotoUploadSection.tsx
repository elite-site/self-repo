import React from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';
import { getPhotoStyle } from '@/shared/utils/photoStyle';
import { StudentProfile } from '../types';

interface PhotoUploadSectionProps {
  profile: StudentProfile | null;
  uploadingPhoto: boolean;
  removingPhoto: boolean;
  photoError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  profile,
  uploadingPhoto,
  removingPhoto,
  photoError,
  fileInputRef,
  onPhotoSelect,
  onRemovePhoto,
}) => {
  const photoUrl = profile?.photoUrl ? resolveMediaUrl(profile.photoUrl) : null;
  const initials = (profile?.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="surface p-6 sm:p-8 space-y-4">
      <h2 className="font-heading text-body-md font-bold text-ink">Profile Photo</h2>
      <p className="text-body-sm text-ink-secondary">
        A clear headshot helps peers, faculty, and recruiters recognize you.
      </p>

      {photoError && (
        <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected">
          {photoError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-28 h-28 rounded-full bg-brand text-on-primary flex items-center justify-center font-heading text-headline-xl font-bold overflow-hidden border-2 border-edge shrink-0 shadow-md">
          <span>{initials || 'IT'}</span>
          {photoUrl && (
            <img
              src={photoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={getPhotoStyle(profile)}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          )}
          {uploadingPhoto && (
            <div className="absolute inset-0 bg-scrim flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-on-primary animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onPhotoSelect}
            accept="image/*"
            className="hidden"
            id="photo-file-input"
          />
          <label
            htmlFor="photo-file-input"
            className="btn btn-secondary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Upload New Photo</span>
          </label>

          {photoUrl && (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={removingPhoto}
              className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected inline-flex items-center gap-1.5"
            >
              {removingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
