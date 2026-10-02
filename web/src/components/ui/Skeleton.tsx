import React from 'react';

import { cn } from '../../lib/cn';

/**
 * Shaped loading placeholders.
 *
 * Every portal page used to swap its whole content area for the same centred
 * branded spinner, so the page jumped and reflowed when data landed and the
 * student got no sense of what was coming. These primitives describe the shape
 * the real content will take, so the swap is almost invisible (§3.5: skeletons
 * instead of spinners is a design decision, not a fallback).
 *
 * The variants below are the five REDESIGN_PLAN §4.8 names: text, card, avatar,
 * video and the bento grid. Every block is sized to match the content it stands
 * in for, because a placeholder of the wrong size is worse than none.
 *
 * Built from the `.skeleton` class in `shared/tokens.css`, which carries the
 * pulse animation, the `pointer-events` opt-out and — via the token system's
 * reduced-motion block — the `prefers-reduced-motion` behaviour. Nothing here
 * declares a keyframe or a duration of its own (§3.6).
 *
 * Every block is `aria-hidden`: a grey box is not content, and a screen reader
 * reading out "graphic" for each of a dozen placeholders tells the student
 * nothing about what is loading. The page-level composites pair that with
 * `aria-busy` and one `role="status"` line naming what is on the way.
 */

/** A single block. Size it at the call site. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('skeleton', className)} aria-hidden="true" />
);

/**
 * Line widths for a run of body copy, in the 100/80/60 rhythm §4.8 asks for: a
 * paragraph of identical full-width lines reads as a table, not as prose.
 */
const TEXT_LINE_WIDTHS = ['w-full', 'w-4/5', 'w-3/5'] as const;

/** The title and supporting line that open most portal pages. */
export const SkeletonPageHeader: React.FC = () => (
  <div className="space-y-2" aria-hidden="true">
    <Skeleton className="h-7 w-56" />
    <Skeleton className="h-4 w-80" />
  </div>
);

/** Lines of body copy, each shorter than the last like a real paragraph. */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={cn('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={cn('h-4', TEXT_LINE_WIDTHS[index % TEXT_LINE_WIDTHS.length])}
      />
    ))}
  </div>
);

/**
 * A card with a header (avatar and two lines), a body of `rows` lines and a
 * footer of two button shapes — the §4.8 card skeleton, so the swap to real
 * content moves nothing.
 */
export const SkeletonCard: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div className={cn('surface p-5 sm:p-6', className)} aria-hidden="true">
    <div className="flex items-center gap-3">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>

    <div className="mt-4 space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4', TEXT_LINE_WIDTHS[index % TEXT_LINE_WIDTHS.length])}
        />
      ))}
    </div>

    <div className="mt-5 flex gap-3">
      <Skeleton className="h-10 w-28 rounded-lg" />
      <Skeleton className="h-10 w-24 rounded-lg" />
    </div>
  </div>
);

/** The `size-10` circle that stands in for a face while its photo loads. */
export const SkeletonAvatar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Skeleton className={cn('size-10 shrink-0 rounded-full', className)} />
);

/** A 16:9 block for an introduction video or a project cover. */
export const SkeletonVideo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Skeleton className={cn('aspect-video w-full rounded-lg', className)} />
);

/**
 * Cell spans from the Projects bento grid (§6): one featured cell at 8×2, then
 * the rest stepping down. The placeholder has to carry the same hierarchy as the
 * real grid, or the featured project jumps when the data lands.
 */
const BENTO_SPANS = [
  'lg:col-span-8 lg:row-span-2',
  'lg:col-span-4 lg:row-span-2',
  'lg:col-span-4 lg:row-span-1',
  'lg:col-span-6 lg:row-span-1',
] as const;

/** The portfolio bento grid, cell for cell, at the same sizes as the real one. */
export const SkeletonBento: React.FC<{ cells?: number; className?: string }> = ({
  cells = 4,
  className = '',
}) => (
  <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-12', className)} aria-hidden="true">
    {Array.from({ length: cells }).map((_, index) => (
      <div
        key={index}
        className={cn(
          'surface flex flex-col gap-3 p-5',
          BENTO_SPANS[index % BENTO_SPANS.length],
        )}
      >
        <Skeleton className={cn('w-full rounded-lg', index === 0 ? 'aspect-video' : 'h-24')} />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    ))}
  </div>
);

/** List rows, each a leading square beside two lines of text. */
export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = '',
}) => (
  <ul className={cn('surface divide-y divide-edge', className)} aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <li key={index} className="flex items-center gap-4 p-4">
        <SkeletonAvatar className="size-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </li>
    ))}
  </ul>
);

interface SkeletonPageProps {
  /** Announced to screen readers while the page loads. */
  label: string;
  cards?: number;
  rows?: number;
}

/** Full page: header, then stacked cards. */
export const SkeletonPage: React.FC<SkeletonPageProps> = ({ label, cards = 2, rows = 3 }) => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      {label}
    </span>
    <SkeletonPageHeader />
    {Array.from({ length: cards }).map((_, index) => (
      <SkeletonCard key={index} rows={rows} />
    ))}
  </div>
);

/** Full page: header, then a list. */
export const SkeletonListPage: React.FC<SkeletonPageProps> = ({ label, rows = 4 }) => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      {label}
    </span>
    <SkeletonPageHeader />
    <SkeletonList rows={rows} />
  </div>
);

export default SkeletonPage;
