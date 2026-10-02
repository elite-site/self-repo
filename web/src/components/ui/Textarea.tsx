import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'rows'> {
  /** Always rendered and always associated; never a placeholder substitute. */
  label: React.ReactNode;
  /** Generated when omitted, so two fields in one form cannot collide. */
  id?: string;
  /** §4.8's `helper`: the line under the field that says what belongs in it. */
  helper?: React.ReactNode;
  /** Announced with `role="alert"` as well as coloured. */
  error?: React.ReactNode;
  /** Initial height in rows. `min-h-30` still applies as the floor. */
  rows?: number;
  /** On the wrapper, for layout. */
  className?: string;
  /** On the `<textarea>`, layered over `.textarea`. */
  textareaClassName?: string;
}

/**
 * The multi-line field: §4.8's text input with the same anatomy and the same
 * states, plus a `min-h-30` (120px) floor and `resize-y` so a bio can be grown
 * to the length it actually needs.
 *
 * The `resize-y` is deliberate — `resize` alone would let a student drag the
 * box to a single line and lose the context they were writing in, and `none`
 * would make a long form a scrolling column of clipped boxes.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, id, helper, error, rows = 4, className, textareaClassName, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const helperId = `${textareaId}-helper`;
  const errorId = `${textareaId}-error`;

  const describedBy = [rest['aria-describedby'], error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={textareaId} className="label">
        {label}
        {required && (
          <span className="text-status-rejected" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <textarea
        {...rest}
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn('textarea min-h-30 resize-y', textareaClassName)}
      />

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

export default Textarea;
