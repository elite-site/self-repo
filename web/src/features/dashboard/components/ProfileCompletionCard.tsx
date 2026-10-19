import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useSpotlight } from '@/hooks/useSpotlight';
import { DashboardTask } from '../types';
import { GlowButton } from './GlowButton';

export interface ProfileCompletionCardProps {
  tasks: DashboardTask[];
  completedCount: number;
  completionPercentage: number;
  remainingItems: DashboardTask[];
  nextMissing: DashboardTask[];
  isComplete: boolean;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  tasks,
  completedCount,
  completionPercentage,
  remainingItems,
  nextMissing,
  isComplete,
}) => {
  const animatedPercentage = useCountUp(completionPercentage, 1.0);
  const { spotlightProps } = useSpotlight();
  const showSparkle = animatedPercentage >= Math.min(completionPercentage, 10);

  return (
    <section
      {...spotlightProps}
      className="glow-card p-4 sm:p-5 lg:p-6 w-full"
      aria-labelledby="completion-heading"
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="completion-heading"
              className="font-heading text-lg sm:text-xl font-bold text-white flex items-center gap-1.5"
            >
              <span>Profile completion</span>
              <span aria-hidden="true" className={showSparkle ? 'sparkle-burst' : 'opacity-60'}>
                ✨
              </span>
            </h2>
            {isComplete ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Complete
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-medium text-white/50">
                {completedCount} of {tasks.length} done
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-white/60 line-clamp-2 sm:line-clamp-none">
            {isComplete
              ? 'Everything is filled in — your profile is fully showcased.'
              : 'A complete profile ranks higher in the public directory and gives recruiters more to work with.'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tabular-nums text-white leading-none">
            {animatedPercentage}
            <span className="text-sm sm:text-lg text-white/40 font-semibold ml-0.5">%</span>
          </p>
        </div>
      </div>

      {/* Purple-to-red gradient progress bar with shine sweep */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
          className="h-3 w-full rounded-full bg-white/10 p-0.5 border border-white/5 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#F43F5E] progress-bar-shine transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, animatedPercentage))}%` }}
          />
        </div>
      </div>

      {isComplete ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          <p className="flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
            <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>All {tasks.length} sections are done.</span>
          </p>
          <GlowButton to="/profile" variant="secondary" className="text-xs sm:text-sm px-4 py-2 shrink-0">
            Review profile
          </GlowButton>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-white/5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40 shrink-0 mr-1">
                Next up:
              </span>
              {nextMissing.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#11111a] px-3 py-1 text-xs text-white/80 transition-colors hover:border-purple-500/50 hover:text-white shrink-0"
                >
                  <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                  <span>{item.title}</span>
                </Link>
              ))}
              {remainingItems.length > nextMissing.length && (
                <span className="text-xs text-white/40 px-1">
                  +{remainingItems.length - nextMissing.length} more
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <GlowButton to="/profile/edit" variant="primary" breathing className="text-xs sm:text-sm px-4 py-2 shrink-0">
              Complete profile
            </GlowButton>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfileCompletionCard;
