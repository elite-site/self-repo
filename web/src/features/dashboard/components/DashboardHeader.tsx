import React from 'react';
import { ExternalLink } from 'lucide-react';
import { TypewriterText } from '@/shared/ui/TypewriterText';
import { StudentDashboardResponse } from '@/shared/types';
import { GlowButton } from './GlowButton';

export interface DashboardHeaderProps {
  greeting: string;
  firstName: string;
  profile: StudentDashboardResponse['profile'] | null;
  profileError: string | null;
  contextLine: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  greeting,
  firstName,
  profile,
  profileError,
  contextLine,
}) => {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2">
          <TypewriterText
            text={`${greeting}, ${firstName}`}
            ready={Boolean(profile) || Boolean(profileError)}
            animate={Boolean(profile?.name)}
            storageKey="elite:greeting-typed"
          />
          <span aria-hidden="true" className="wave-hand text-2xl sm:text-3xl select-none" role="img">
            👋
          </span>
        </h1>
        {!profileError && (
          <p className="mt-1 text-xs sm:text-sm text-white/60 font-medium tracking-wide">
            {contextLine}
          </p>
        )}
      </div>

      {profile?.rollNo && (
        <div className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
          <GlowButton
            to={`/students/${profile.rollNo}`}
            variant="primary"
            breathing
            className="w-full sm:w-auto text-sm shrink-0 border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          >
            <span aria-hidden="true">🌟</span>
            <span>Public showcase</span>
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" className="ml-0.5 opacity-80" />
          </GlowButton>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
