/**
 * Metric tile component — DESIGN.md §8 "Metric Tile"
 *
 * Used on every page's quick-stats row. Renders a compact rounded-xl card
 * with an icon, label, animated numeric value, and optional sub-label.
 *
 * Usage:
 *   <MetricTile
 *     icon={<BookOpen size={16} aria-hidden="true" />}
 *     label="Active Courses"
 *     value={8}
 *     suffix=" Modules"
 *   />
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';
import { useCountUp } from '@/shared/hooks/useCountUp';
import { cn } from '@/shared/lib/cn';

export interface MetricTileProps {
  /** Lucide icon element. Caller sets size and aria-hidden. */
  icon: React.ReactNode;
  /** Short metric label. e.g. "Coding Streak" */
  label: string;
  /** Numeric value to animate to on mount. */
  value: number;
  /** Optional suffix appended after the number. e.g. " Days" or "/100" */
  suffix?: string;
  /** Optional sub-text below the value. */
  subLabel?: string;
  /** Optional router destination URL */
  to?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Extra class names on the outer card. */
  className?: string;
}

/**
 * A compact metric display tile with icon, label, and animated count-up value.
 * Matches the DESIGN.md reference mockup's three-tile metrics row.
 */
export const MetricTile: React.FC<MetricTileProps> = ({
  icon,
  label,
  value,
  suffix = '',
  subLabel,
  to,
  onClick,
  className,
}) => {
  const animatedValue = useCountUp(value);

  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-brand shrink-0">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted truncate">
          {label}
        </span>
      </div>
      <p className="font-heading text-headline-lg sm:text-headline-xl font-bold text-ink tabular-nums leading-none tracking-tight">
        {animatedValue}
        {suffix}
      </p>
      {subLabel && (
        <p className="text-xs font-medium text-ink-secondary truncate" title={subLabel}>
          {subLabel}
        </p>
      )}
    </>
  );

  const cardClasses = cn(
    'rounded-xl p-4 sm:p-5 flex flex-col gap-2.5 sm:gap-3 transition-all duration-quick border border-edge bg-surface shadow-xs',
    (to || onClick) && 'hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
    className,
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline group focus-visible:outline-none">
        <Card className={cardClasses}>{content}</Card>
      </Link>
    );
  }

  return (
    <Card className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {content}
    </Card>
  );
};
