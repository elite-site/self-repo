import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * A taxonomy label — a skill, a department, a tag on a piece of work.
 * REDESIGN_PLAN §4.8 "Badge / Tag / Chip".
 *
 * Where a Badge reports a status, a Tag names a thing. It is smaller and
 * quieter than a Badge, and the only interaction it has is removal, so the
 * remove control gets the accessible name a bare `X` would otherwise lack.
 */

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  /** When present the tag gets its remove button. Omit it for a read-only tag. */
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({ label, onRemove, className, ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-sm bg-surface-sunken px-2 py-1 font-ui text-xs font-medium text-ink-secondary',
      className,
    )}
    {...rest}
  >
    {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-sm text-ink-muted',
          'transition-colors duration-fast ease-standard hover:text-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        )}
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    )}
  </span>
);

export default Tag;