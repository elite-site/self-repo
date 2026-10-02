import React from 'react';

/**
 * Shaped loading placeholders.
 *
 * Every portal page used to swap its whole content area for the same centred
 * branded spinner, so the page jumped and reflowed when data landed and the
 * student got no sense of what was coming. These primitives describe the shape
 * the real content will take, so the swap is almost invisible.
 *
 * Built from the `.skeleton` class in `shared/tokens.css`, which already carries
 * the reduced-motion and `pointer-events` behaviour.
 */

/** A single block. Size it at the call site. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/** The title and supporting line that open most portal pages. */
export const SkeletonPageHeader: React.FC = () => (
  <div className="space-y-2">
    <Skeleton className="h-7 w-56" />
    <Skeleton className="h-4 w-80" />
  </div>
);

/** Lines of body copy, the last one short like a real paragraph. */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton key={index} className={index === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full'} />
    ))}
  </div>
);

/** A card with a heading and a stack of rows. */
export const SkeletonCard: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div className={`surface space-y-4 p-5 sm:p-6 ${className}`}>
    <Skeleton className="h-5 w-40" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

/** List rows, each a leading square beside two lines of text. */
export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = '',
}) => (
  <ul className={`surface divide-y divide-edge ${className}`}>
    {Array.from({ length: rows }).map((_, index) => (
      <li key={index} className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 shrink-0" />
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
