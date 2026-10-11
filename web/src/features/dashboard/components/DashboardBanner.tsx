import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { DashboardTask } from '../types';

interface DashboardBannerProps {
  tasks: DashboardTask[];
  completedCount: number;
  completionPercentage: number;
  remainingItems: DashboardTask[];
  nextMissing: DashboardTask[];
  isComplete: boolean;
}

export const DashboardBanner: React.FC<DashboardBannerProps> = ({
  tasks,
  completedCount,
  completionPercentage,
  remainingItems,
  nextMissing,
  isComplete,
}) => {
  return (
    <Card
      variant="brand"
      className="p-4 sm:p-5 lg:p-6 transition-all duration-normal"
      aria-labelledby="completion-heading"
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="completion-heading"
              className="font-heading text-headline-sm sm:text-headline-md text-ink leading-tight"
            >
              Profile completion
            </h2>
            {isComplete ? (
              <span className="badge badge-approved text-xs">Complete</span>
            ) : (
              <span className="text-label-xs sm:text-label-sm font-medium text-ink-muted">
                {completedCount} of {tasks.length} done
              </span>
            )}
          </div>
          <p className="mt-1 text-body-xs sm:text-body-sm text-ink-secondary line-clamp-2 sm:line-clamp-none">
            {isComplete
              ? 'Everything is filled in — your profile is fully showcased.'
              : 'A complete profile ranks higher in the public directory and gives recruiters more to work with.'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-heading text-headline-lg sm:text-headline-xl tabular-nums text-ink leading-none">
            {completionPercentage}
            <span className="text-headline-sm sm:text-headline-md text-ink-muted">%</span>
          </p>
        </div>
      </div>

      <ProgressBar
        className="mt-3 sm:mt-4"
        label="Profile completion"
        value={completionPercentage}
        barClassName={isComplete ? 'bg-status-approved' : undefined}
      />

      {isComplete ? (
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          <p className="flex items-center gap-1.5 text-body-xs sm:text-body-sm text-status-approved font-medium">
            <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>All {tasks.length} sections are done.</span>
          </p>
          <Link
            to="/profile"
            className="btn btn-secondary text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shrink-0"
          >
            Review profile
          </Link>
        </div>
      ) : (
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-label-xs sm:text-label-sm font-semibold uppercase tracking-wider text-ink-muted shrink-0 mr-0.5">
                Next up:
              </span>
              {nextMissing.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2.5 py-1 text-label-xs sm:text-label-sm text-ink-secondary transition-colors duration-fast hover:border-brand-ring hover:text-ink hover:bg-surface-sunken shrink-0"
                >
                  <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                  <span>{item.title}</span>
                </Link>
              ))}
              {remainingItems.length > nextMissing.length && (
                <span className="text-label-xs text-ink-muted px-0.5">
                  +{remainingItems.length - nextMissing.length} more
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <Link
              to="/profile/edit"
              className="btn btn-primary text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shrink-0"
            >
              Complete profile
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
};
