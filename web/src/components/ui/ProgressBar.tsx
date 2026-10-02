import React from 'react';
import * as Progress from '@radix-ui/react-progress';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { transitionNormal, transitionReduced } from '../../lib/motion';

export interface ProgressBarProps {
  /**
   * The name of what is progressing. Required: a progress bar without one is
   * an unlabelled graphic, and a screen reader announces nothing useful.
   */
  label: string;
  /**
   * 0-100, or `null` for indeterminate — a sweep with no known end, which is
   * what an upload of unknown length is. Values are clamped, because Radix
   * rejects anything outside the range rather than rendering it.
   */
  value: number | null;
  /** Visible label above the bar. When shown it is also the accessible name. */
  showLabel?: boolean;
  /**
   * Visible percentage beside the label. §3.4 is why this exists: the filled
   * width is one more visual, and a bar whose only signal is a coloured strip
   * tells a screen-reader user nothing about how much is left.
   */
  showValue?: boolean;
  /** On the wrapper. */
  className?: string;
  /** On the filled portion. */
  barClassName?: string;
}

/**
 * A linear progress bar: §4.8's `h-2` track over a brand fill, plus the
 * indeterminate sweep.
 *
 * The ARIA comes from `@radix-ui/react-progress` rather than a hand-written
 * `role="progressbar"`, because the part that is easy to get wrong is the part
 * that has to be right: `aria-valuenow` must be absent — not zero — while the
 * bar is indeterminate, or a screen reader reports an upload as 0% and stays
 * there. Radix derives that from `value === null` and also publishes
 * `data-state` (`loading` / `complete` / `indeterminate`) for styling.
 *
 * The fill is a `motion.div` so the width change is interpolated rather than
 * jumped, and it collapses to an instant state swap under
 * `prefers-reduced-motion` (§3.4, §4.7). The indeterminate sweep is a CSS
 * keyframe from `web/src/index.css`, which the global reduced-motion override
 * already stops.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  showLabel = false,
  showValue = false,
  className,
  barClassName,
}) => {
  const shouldReduce = useReducedMotion();
  const reactId = React.useId();
  const labelId = `${reactId}-label`;

  const indeterminate = value === null;
  // The clamp is not cosmetic: Radix rejects a value outside 0-max rather than
  // rendering it, so an upload reporting 101% would empty the bar.
  const percent = value === null ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex flex-col', className)}>
      {(showLabel || showValue) && (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          {showLabel && (
            <span id={labelId} className="text-label-md font-semibold text-ink-secondary">
              {label}
            </span>
          )}
          {showValue && !indeterminate && (
            <span className="text-label-md tabular-nums text-ink-muted">{percent}%</span>
          )}
        </div>
      )}

      <Progress.Root
        value={indeterminate ? null : percent}
        // A visible label is also the accessible name (WCAG 2.5.3 label-in-name);
        // without one the name has to come from `aria-label`.
        aria-label={showLabel ? undefined : label}
        aria-labelledby={showLabel ? labelId : undefined}
        // `surface.inset` is the preset's spelling of §4.8's `bg-inset` track.
        className="h-2 w-full overflow-hidden rounded-full bg-surface-inset"
      >
        {indeterminate ? (
          // A third of the track, swept end to end and back. Not the full
          // width: a full-width sweep has no edge to read as movement.
          <div
            className={cn('h-full w-1/3 rounded-full bg-brand animate-indeterminate', barClassName)}
          />
        ) : (
          <motion.div
            // No `initial`, so the first paint is already at the right width
            // and only later updates animate.
            animate={{ width: `${percent}%` }}
            transition={shouldReduce ? transitionReduced : transitionNormal}
            className={cn('h-full rounded-full bg-brand', barClassName)}
          />
        )}
      </Progress.Root>
    </div>
  );
};

export default ProgressBar;
