import React from 'react';
import { getPhotoStyle } from '@/shared/utils/photoStyle';
import { DirectoryPhotoFields } from '../types';

export const DirectoryPhoto: React.FC<{
  name: string;
  src: string | null;
  profile?: DirectoryPhotoFields | null;
}> = ({ name, src, profile }) => {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-brand font-heading text-headline-sm font-bold text-on-brand">
      <span aria-hidden="true">{initials || 'IT'}</span>
      {src && (
        <img
          src={src}
          alt={`${name}'s profile photo`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full"
          style={getPhotoStyle(profile)}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </span>
  );
};
