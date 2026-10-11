import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /**
   * The visible label. Always rendered and always associated with the control
   * through `htmlFor` — a placeholder is not a label, because it disappears
   * the moment the student types and is skipped by several screen readers.
   */
  label: React.ReactNode;
  /** Generated when omitted, so two fields in one form cannot collide. */
  id?: string;
  /** §4.8's `helper`: the line under the field that says what belongs in it. */
  helper?: React.ReactNode;
  /**
   * Replaces the hint with a failure message. Rendered with `role="alert"`, so
   * it is spoken when it appears rather than only being red.
   */
  error?: React.ReactNode;
  /** Trailing decoration — a search glyph, a reveal toggle. Decorative only. */
  icon?: React.ReactNode;
  /** On the wrapper, for layout. */
  className?: string;
  /** On the `<input>`, layered over `.input`. */
  inputClassName?: string;
}

/**
 * The single-line text field, with the anatomy §4.8 gives every form control:
 * label above, field, helper or error below.
 *
 * Every page had built this by hand, which is how the four ways of doing it
 * drifted apart: two labelled the field, one used a placeholder as the label,
 * one left the error message unannounced, and none of them let the hint text
 * reach a screen reader. Owning it once is what makes the same mistake
 * impossible in the next form.
 *
 * The visual treatment is the `.input` component class from
 * `shared/tokens.css` rather than a Tailwind class list: it already carries the
 * brand border, the focus ring, the disabled treatment and the
 * `[aria-invalid='true']` rule, all from tokens, so §3.6 holds without this file
 * restating a single value.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, helper, error, icon, className, inputClassName, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  // Both texts stay wired when both are present, so nothing the component
  // renders is unreachable by a screen reader.
  const describedBy = [rest['aria-describedby'], error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    // No `gap`: `.label`, `.hint` and `.error-text` each carry their own
    // margin from the token layer, and adding a gap on top double-spaces them.
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={inputId} className="label">
        {label}
        {required && (
          <span className="text-status-rejected" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div className="relative">
        <input
          {...rest}
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('input', icon && 'pr-10', inputClassName)}
        />
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
          >
            {icon}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} className="error-text" role="alert">
          {error}
        </p>
      )}
      {helper && (
        <p id={helperId} className="hint">
          {helper}
        </p>
      )}
    </div>
  );
});

export default Input;
