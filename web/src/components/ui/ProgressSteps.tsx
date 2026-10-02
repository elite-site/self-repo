import StepIndicator from './StepIndicator';
import type { StepIndicatorProps, StepIndicatorStep, StepIndicatorTone } from './StepIndicator';

/**
 * The video workflow's stepper, under the name it has always had.
 *
 * §4.8 names this component `StepIndicator`, and the behaviour is now that
 * component's: same steps, same `current` index, same `detail` line, same
 * `tone` for a step that came back. This module re-exports it rather than
 * keeping a second copy, so a future change to the stepper cannot leave the
 * video page and the onboarding flow showing different things.
 *
 * `StepIndicator` is the name to import from here on; this one stays so the
 * existing `import { ProgressSteps }` call sites keep working.
 */

export type ProgressStep = StepIndicatorStep;
export type ProgressStepsProps = StepIndicatorProps;
export type ProgressStepsTone = StepIndicatorTone;

export const ProgressSteps = StepIndicator;

export default ProgressSteps;
