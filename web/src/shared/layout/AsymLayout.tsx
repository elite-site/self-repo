import React from 'react';
import { cn } from '@/shared/lib/cn';

export interface AsymGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * 12-column responsive asymmetrical grid container.
 * Collapses to 2 columns on tablet (md, <=1024px) and 1 column on mobile (<=640px).
 */
export const AsymGrid = React.forwardRef<HTMLDivElement, AsymGridProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'asym-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AsymGrid.displayName = 'AsymGrid';

export interface AsymFeaturedProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Custom column span override if needed (default: 7 on lg, 8 on xl) */
  cols?: '7' | '8';
}

/**
 * Large featured block (7-8 columns on desktop) for welcome, primary action, and headline.
 */
export const AsymFeatured = React.forwardRef<HTMLDivElement, AsymFeaturedProps>(
  ({ children, className, cols = '8', ...props }, ref) => {
    const colSpan =
      cols === '7'
        ? 'lg:col-span-7 xl:col-span-7'
        : 'lg:col-span-7 xl:col-span-8';

    return (
      <div
        ref={ref}
        className={cn(
          'asym-featured col-span-1 md:col-span-2 flex flex-col gap-6',
          colSpan,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AsymFeatured.displayName = 'AsymFeatured';

export interface AsymSideProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Custom column span override if needed (default: 5 on lg, 4 on xl) */
  cols?: '5' | '4';
}

/**
 * Smaller companion blocks (4-5 columns on desktop) for status, key stats, and quick actions.
 */
export const AsymSide = React.forwardRef<HTMLDivElement, AsymSideProps>(
  ({ children, className, cols = '4', ...props }, ref) => {
    const colSpan =
      cols === '5'
        ? 'lg:col-span-5 xl:col-span-5'
        : 'lg:col-span-5 xl:col-span-4';

    return (
      <div
        ref={ref}
        className={cn(
          'asym-side col-span-1 md:col-span-2 flex flex-col gap-6',
          colSpan,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AsymSide.displayName = 'AsymSide';

export interface AsymAccentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Accent highlight block with subtle brand-tinted background (`bg-brand-soft` / `border-brand`),
 * contrasting visual importance for urgent or spotlight status.
 */
export const AsymAccent = React.forwardRef<HTMLDivElement, AsymAccentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'asym-accent rounded-2xl p-6 bg-brand-soft border border-brand/25 text-ink shadow-xs',
          'transition-all duration-quick hover:shadow-md hover:-translate-y-0.5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AsymAccent.displayName = 'AsymAccent';
