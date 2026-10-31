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
  className,
}) => {
  const animatedValue = useCountUp(value);

  return (
    <Card
      className={cn(
        'rounded-xl p-4 flex flex-col gap-3 transition-all duration-quick hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-brand">{icon}</span>
        <span className="text-label-sm text-ink-muted">{label}</span>
      </div>
      <p className="font-heading text-headline-md text-ink tabular-nums leading-none">
        {animatedValue}
        {suffix}
      </p>
      {subLabel && (
        <p className="text-label-xs text-ink-muted">{subLabel}</p>
      )}
    </Card>
  );
};
