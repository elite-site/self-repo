import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  /** Always rendered and always associated; never a placeholder substitute. */
  label: React.ReactNode;
  /** Generated when omitted, so two fields in one form cannot collide. */
  id?: string;
  /** §4.8's `helper`: the line under the field that says what belongs in it. */
  helper?: React.ReactNode;
  /** Announced with `role="alert"` as well as coloured. */
  error?: React.ReactNode;
  /** The choices. Passed as data rather than children so the shape is one thing. */
  options: SelectOption[];
  /**
   * A leading, empty-valued option — the "no selection yet" state. Rendered
   * first and left enabled so a student who picks the wrong thing can go back.
   */
  placeholder?: string;
  /** On the wrapper, for layout. */
  className?: string;
  /** On the `<select>`, layered over `.select`. */
  selectClassName?: string;
}

/**
 * The dropdown, on a native `<select>`.
 *
 * §4.8 asks for a Radix `Select`. The plan's own dependency set has no
 * `@radix-ui/react-select`, and the brief for this batch approves only
 * `framer-motion` and `@radix-ui/react-progress` — so this is the native
 * element, styled. That is the better accessibility outcome anyway: the
 * platform popup gets the touch, type-ahead, screen-reader and mobile-wheel
 * behaviour for free, which a listbox rebuilt from divs has to re-earn.
 *
 * `.select` carries the field treatment; `appearance-none` removes the
 * platform's own arrow so the chevron below is the only one on screen.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, id, helper, error, options, placeholder, className, selectClassName, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  const describedBy = [rest['aria-describedby'], error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={selectId} className="label">
        {label}
        {required && (
          <span className="text-status-rejected" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div className="relative">
        <select
          {...rest}
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('select cursor-pointer appearance-none pr-10', selectClassName)}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
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

export default Select;
