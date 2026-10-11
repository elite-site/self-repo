import React from 'react';
import { cn } from '../../lib/cn';

/**
 * A status indicator. REDESIGN_PLAN §4.8 "Badge / Tag / Chip".
 *
 * Not interactive, and never a button: a badge says what a thing *is*, the way
 * a person would say it out loud. The status dot is on by default because §3.4
 * forbids colour as the only difference between two states, and a dot is the
 * cheapest non-colour signal that also survives greyscale printing.
 */

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The status, in words: "Approved", "Needs changes". Never the raw enum. */
  label: string;
  /** Defaults to `success`. */
  variant?: BadgeVariant;
  /** The status dot. On by default; only turn it off where the label carries a glyph. */
  dot?: boolean;
}

const VARIANT: Record<BadgeVariant, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
  neutral: 'bg-surface-sunken text-ink-secondary',
  // §4.8 subtle-brand fill; the preset spells that token `brand-soft`.
  brand: 'bg-brand-soft text-brand',
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'success',
  dot = true,
  className,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-ui text-xs font-semibold',
      VARIANT[variant],
      className,
    )}
    {...rest}
  >
    {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
    {label}
  </span>
);

export default Badge;