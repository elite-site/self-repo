import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { DashboardTaskBoardSkeleton } from './DashboardTaskBoard';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      Loading your dashboard
    </span>

    <div className="space-y-2">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>

    <div className="surface p-4 sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-5 w-40 sm:w-48" />
          <Skeleton className="h-3 w-56 sm:w-72" />
        </div>
        <Skeleton className="h-7 w-14 sm:h-9 sm:w-20 shrink-0" />
      </div>
      <Skeleton className="mt-3 sm:mt-4 h-2 w-full rounded-full" />
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <DashboardTaskBoardSkeleton />
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((cell) => (
              <Skeleton key={cell} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
