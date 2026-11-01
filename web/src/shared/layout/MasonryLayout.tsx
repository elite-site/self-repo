import React from 'react';
import { cn } from '@/shared/lib/cn';

export interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Number of columns on large screens: 2, 3 (default), or 4 */
  cols?: 2 | 3 | 4;
}

/**
 * CSS column masonry container for repeating cards and varied-height content.
 * Responsive: 1 column on mobile, 2 columns on tablet, 3 columns on desktop.
 */
export const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ children, cols = 3, className, ...props }, ref) => {
    const colClass =
      cols === 2
        ? 'columns-1 md:columns-2 lg:columns-2'
        : cols === 4
        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4'
        : 'columns-1 md:columns-2 lg:columns-3';

    return (
      <div
        ref={ref}
        className={cn('masonry-grid gap-6 [column-fill:_balance]', colClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MasonryGrid.displayName = 'MasonryGrid';

export interface MasonryItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Child item inside a MasonryGrid container.
 * Prevents awkward breaks across columns and sets vertical rhythm.
 */
export const MasonryItem = React.forwardRef<HTMLDivElement, MasonryItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('masonry-item break-inside-avoid mb-6 w-full block', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MasonryItem.displayName = 'MasonryItem';
