import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  /** What is empty. Never "No data found". */
  title: string;
  /** Why it matters and what to do about it. */
  description?: string;
  /** The way out: usually a link or a button. */
  action?: React.ReactNode;
  /** Drops the dashed frame, for use inside a card that already has one. */
  bare?: boolean;
}

/**
 * The portal's single empty state.
 *
 * Every instance answers the same three questions — what is empty, why it
 * matters, and what to do next — which is why `description` and `action` exist
 * rather than leaving each page to invent its own copy. A bare "No data found"
 * tells the student nothing and is the thing this replaces.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  bare = false,
}) => (
  <div
    className={
      bare
        ? 'flex flex-col items-center px-4 py-6 text-center'
        : 'flex flex-col items-center rounded-lg border border-dashed border-edge-strong bg-surface-inset px-6 py-10 text-center'
    }
  >
    {Icon && (
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
    )}
    <h3 className="font-heading text-headline-sm text-ink">{title}</h3>
    {description && (
      <p className="mt-1 max-w-prose text-body-sm text-ink-secondary">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
