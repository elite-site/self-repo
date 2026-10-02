import React from 'react';
import { Check } from 'lucide-react';

export interface ProgressStep {
  label: string;
  /** One short line under the label: a date, or what happens at this step. */
  detail?: string;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  /**
   * Index of the step in progress. Every step before it reads as complete.
   * Pass `steps.length` when the whole flow is done.
   */
  current: number;
  /** Colour of the in-progress step. `changes` and `rejected` mean it came back. */
  tone?: 'brand' | 'changes' | 'rejected';
  /** Accessible name for the whole flow, e.g. "Video status". */
  label?: string;
}

const TONE = {
  brand: { circle: 'border-brand bg-brand text-on-primary', text: 'text-ink' },
  changes: { circle: 'border-status-changes bg-status-changes text-on-primary', text: 'text-status-changes' },
  rejected: { circle: 'border-status-rejected bg-status-rejected text-on-primary', text: 'text-status-rejected' },
} as const;

/**
 * A short, linear process rendered as a stepper.
 *
 * The video workflow used to be four words in a status badge: whether a take was
 * uploaded, waiting on faculty, approved or visible had to be inferred from one
 * enum. Showing the whole path with the student's position on it, in order,
 * answers "what happens next" without exposing the moderation internals.
 *
 * Horizontal on desktop, a vertical list on mobile where four columns would
 * crush the labels.
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps, current, tone = 'brand', label }) => (
  <ol className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-2" aria-label={label}>
    {steps.map((step, index) => {
      const done = index < current;
      const active = index === current;

      return (
        <li
          key={step.label}
          className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-0 sm:text-center"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute left-1/2 top-4 hidden h-0.5 w-full sm:block ${
                done ? 'bg-status-approved' : 'bg-edge'
              }`}
            />
          )}

          <span
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-label-md font-bold ${
              done
                ? 'border-status-approved bg-status-approved text-on-primary'
                : active
                  ? TONE[tone].circle
                  : 'border-edge bg-surface text-ink-muted'
            }`}
          >
            {done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : index + 1}
          </span>

          <span className="min-w-0 sm:mt-2">
            <span
              className={`block text-label-lg font-semibold ${
                active ? TONE[tone].text : done ? 'text-ink' : 'text-ink-muted'
              }`}
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

export default ProgressSteps;
