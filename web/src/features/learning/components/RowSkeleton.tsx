import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import { cn } from '@/shared/lib/cn';

export interface RowSkeletonProps {
  className?: string;
  cardsCount?: number;
}

export const RowSkeleton: React.FC<RowSkeletonProps> = ({
  className,
  cardsCount = 4,
}) => {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex gap-4 overflow-hidden pt-1">
        {Array.from({ length: cardsCount }).map((_, index) => (
          <div
            key={index}
            className="w-72 shrink-0 sm:w-80 overflow-hidden rounded-xl border border-edge bg-surface shadow-xs"
          >
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-3 p-4">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <div className="pt-2">
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RowSkeleton;
