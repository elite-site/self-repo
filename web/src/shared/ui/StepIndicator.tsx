import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Which colour marks the step in progress. `changes` and `rejected` mean the
 * step came back for another pass, which is a different message from "we are
 * working on it".
 */
export type StepIndicatorTone = 'brand' | 'changes' | 'rejected';

export interface StepIndicatorStep {
  /** Optional: `label` is the fallback key, so a step does not need an id. */
  id?: string;
  label: string;
  /** One short line under the label: a date, or what happens at this step. */
  detail?: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  /**
   * Index of the step in progress. Every step before it reads as complete.
   * Pass `steps.length` when the whole flow is done.
   */
  current: number;
  /** Accessible name for the whole flow, e.g. "Video status". */
  label?: string;
  tone?: StepIndicatorTone;
  className?: string;
}

const TONE: Record<StepIndicatorTone, { circle: string; text: string }> = {
  brand: { circle: 'border-brand text-brand', text: 'text-brand' },
  changes: { circle: 'border-status-changes text-status-changes', text: 'text-status-changes' },
  rejected: { circle: 'border-status-rejected text-status-rejected', text: 'text-status-rejected' },
};

/**
 * A short, linear process rendered as a stepper (§4.8).
 *
 * The video workflow used to be four words in a status badge: whether a take was
 * uploaded, waiting on faculty, approved or visible had to be inferred from one
 * enum. Showing the whole path with the student's position on it, in order,
 * answers "what happens next" without exposing the moderation internals.
 *
 * Horizontal from `sm` up, where the connectors between steps carry the
 * direction of travel. Below that they are dropped and the steps stack, because
 * four labelled columns across a phone crush the labels to nothing.
 *
 * Position is never colour alone (§3.4): a completed step shows a tick instead
 * of its number, the step in progress is `aria-current="step"`, and each step
 * carries a visually hidden word saying where it stands.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  current,
  label,
  tone = 'brand',
  className,
}) => (
  <ol
    className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0', className)}
    aria-label={label}
  >
    {steps.map((step, index) => {
      const done = index < current;
      const active = index === current;

      return (
        <li
          key={step.id ?? step.label}
          aria-current={active ? 'step' : undefined}
          // `sm:flex-1` rather than a fixed column count: a stepper is a general
          // primitive, and the connector between two steps is only in the right
          // place if every step owns an equal share of the row.
          className="relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-0 sm:text-center"
        >
          {/* Runs from this circle to the next, which paints over the half that
              overshoots it. Filled only once this step is behind the student. */}
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-1/2 top-4 hidden h-0.5 w-full sm:block',
                done ? 'bg-brand' : 'bg-edge',
              )}
            />
          )}

          <span
            className={cn(
              'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-label-md font-semibold',
              done
                ? 'border-brand bg-brand text-on-primary'
                : active
                  ? cn('bg-surface', TONE[tone].circle)
                  : 'border-edge bg-surface text-ink-muted',
            )}
          >
            {done ? (
              <>
                <Check size={15} strokeWidth={3} aria-hidden="true" />
                <span className="sr-only">
                  {index + 1}. completed
                </span>
              </>
            ) : (
              <>
                {index + 1}
                <span className="sr-only">{active ? ', current step' : ', not yet reached'}</span>
              </>
            )}
          </span>

          <span className="min-w-0 sm:mt-2">
            <span
              className={cn(
                'block text-label-lg font-semibold',
                active ? TONE[tone].text : done ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {step.label}
            </span>
            {step.detail && <span className="block text-label-md text-ink-muted">{step.detail}</span>}
          </span>
        </li>
      );
    })}
  </ol>
);

export default StepIndicator;
