import React from 'react';
import { StudentProfile } from '../types';

interface ProfileBioSectionProps {
  profile: StudentProfile;
}

export const ProfileBioSection: React.FC<ProfileBioSectionProps> = ({ profile: p }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="surface p-6 space-y-3">
        <h2 className="font-heading text-body-md font-bold text-ink">About Me</h2>
        <p className="text-body-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
          {p.bio || 'No personal bio added yet. Click Edit Profile to introduce yourself.'}
        </p>
      </div>

      <div className="surface p-6 space-y-3">
        <h2 className="font-heading text-body-md font-bold text-ink">Special Qualities & Distinctions</h2>
        <p className="text-body-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
          {p.specialQualities || 'No special qualities listed yet.'}
        </p>
      </div>
    </div>
  );
};
