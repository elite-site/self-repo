import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { DashboardTaskBoardSkeleton } from './DashboardTaskBoard';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      Loading your dashboard
    </span>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="surface p-6 sm:p-8 lg:col-span-7 xl:col-span-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <Skeleton className="size-28 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>

      <div className="surface p-6 lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>

    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2, 3, 4, 5, 6].map((tile) => (
        <Skeleton key={tile} className="h-24 flex-1 min-w-[115px] rounded-xl" />
      ))}
    </div>

    <Skeleton className="h-44 w-full rounded-2xl" />

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
      <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-3">
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

      <div className="space-y-6 lg:col-span-1">
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
      </div>
    </div>
  </div>
);
