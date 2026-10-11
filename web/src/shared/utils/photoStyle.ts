import React from 'react';

export interface PhotoPosition {
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
}

/**
 * Returns inline CSS styles for rendering student avatar photos with
 * saved custom offset (X/Y percentages) and zoom scale.
 *
 * Render the <img> inside an `overflow-hidden` container for proper clipping.
 */
export function getPhotoStyle(profile?: PhotoPosition | null): React.CSSProperties {
  if (!profile) {
    return {
      objectFit: 'cover',
      objectPosition: '50% 50%',
      width: '100%',
      height: '100%',
    };
  }

  const offsetX = profile.photoOffsetX != null ? `${profile.photoOffsetX}%` : '50%';
  const offsetY = profile.photoOffsetY != null ? `${profile.photoOffsetY}%` : '50%';
  const zoom = profile.photoZoom != null && profile.photoZoom > 0 ? profile.photoZoom : 1;

  return {
    objectFit: 'cover',
    objectPosition: `${offsetX} ${offsetY}`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${offsetX} ${offsetY}`,
    width: '100%',
    height: '100%',
  };
}
