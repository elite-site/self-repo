import React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, GraduationCap, Github, Linkedin, Globe } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';
import { getPhotoStyle } from '@/shared/utils/photoStyle';
import { StudentProfile } from '../types';
import { LeetCodeIcon, CodeChefIcon } from '@/shared/ui/PlatformIcons';

interface ProfileHeaderProps {
  profile: StudentProfile;
  onRequestCorrection: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile: p, onRequestCorrection }) => {
  const photoUrl = p.photoUrl ? resolveMediaUrl(p.photoUrl) : null;
  const initials = (p.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="surface p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-edge">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative w-24 h-24 rounded-full bg-brand text-on-primary flex items-center justify-center font-heading text-headline-lg font-bold overflow-hidden border-2 border-edge shrink-0 shadow-md">
            <span>{initials || 'IT'}</span>
            {photoUrl && (
              <img
                src={photoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={getPhotoStyle(p)}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="font-heading text-headline-md font-bold text-ink">{p.name}</h1>
            <p className="text-body-sm font-mono text-ink-muted">{p.rollNo}</p>
            <p className="text-body-sm text-ink-secondary">
              Year {p.year} · Section {p.section} · {p.branch || 'Information Technology'}
            </p>
            {p.email && <p className="text-label-sm text-ink-muted">{p.email}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
          <Link to={`/students/${p.rollNo}`} className="btn btn-secondary inline-flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" />
            <span>Public Profile</span>
          </Link>
          <Link to="/profile/edit" className="btn btn-primary inline-flex items-center gap-1.5">
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-4 text-ink-secondary">
          {p.githubUrl && (
            <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5 text-body-sm font-medium">
              <Github className="w-4 h-4" /> GitHub
            </a>
          )}
          {p.linkedinUrl && (
            <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5 text-body-sm font-medium">
              <Linkedin className="w-4 h-4 text-brand" /> LinkedIn
            </a>
          )}
          {p.leetcodeUrl && (
            <a href={p.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5 text-body-sm font-medium">
              <LeetCodeIcon className="w-4 h-4" /> LeetCode
            </a>
          )}
          {p.codechefUrl && (
            <a href={p.codechefUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5 text-body-sm font-medium">
              <CodeChefIcon className="w-4 h-4" /> CodeChef
            </a>
          )}
          {p.portfolioUrl && (
            <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5 text-body-sm font-medium">
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
        </div>

        <button
          onClick={onRequestCorrection}
          className="text-label-sm font-semibold text-ink-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5" /> Request record correction
        </button>
      </div>
    </div>
  );
};
