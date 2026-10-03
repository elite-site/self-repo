import React from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';

/**
 * The portal's content container. REDESIGN_PLAN §4.8.
 *
 * Four variants are static surfaces; `interactive` is the same surface that
 * lifts on hover and can be reached from the keyboard. The radius is
 * `rounded-xl` because the plan's interactive-card anatomy is written with it,
 * and `rounded-lg` is kept for the small dropdown-shaped surfaces instead.
 */

export type CardVariant = 'default' | 'elevated' | 'ghost' | 'brand' | 'interactive';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Defaults to `default`. */
  variant?: CardVariant;
  children?: React.ReactNode;
  /**
   * Makes the card activatable: it gains `role="button"`, `tabIndex` and
   * Enter/Space handling, whatever variant it is. A `div` rather than a `button`
   * element so a page can wrap the whole card in a `Link` without nesting an
   * interactive element inside another one.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const BASE =
  'rounded-xl p-6 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const VARIANT: Record<CardVariant, string> = {
  default: 'border border-edge bg-surface shadow-sm',
  // A transparent border rather than no border, so switching variant at
  // runtime cannot reflow the content inside.
  elevated: 'border border-transparent bg-surface shadow-md',
  ghost: 'border border-edge bg-transparent',
  // §4.8 subtle-brand fill; the preset spells that token `brand-soft`.
  brand: 'border border-brand bg-brand-soft',
  interactive: 'border border-edge bg-surface shadow-sm enabled:hover:shadow-md',
};

interface HoverProps {
  whileHover?: TargetAndTransition;
  transition?: Transition;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', onClick, className, onKeyDown, ...rest },
  ref,
) {
  const shouldReduce = useReducedMotion();

  // Two separate questions. `activatable` is about the behaviour: a card the
  // caller wired a click to must be reachable and operable from the keyboard,
  // whichever variant it is. `lifts` is the §4.8 `interactive` look, so a
  // `default` card that happens to be clickable still gets a focus ring and
  // Enter/Space but does not float.
  const activatable = Boolean(onClick);
  const lifts = variant === 'interactive';
  const hoverProps: HoverProps = lifts ? selectVariantsByName(shouldReduce, 'cardHover') : {};

  /**
   * A focusable card is a button as far as assistive technology is concerned,
   * so it has to answer the two keys a button answers. `preventDefault` on
   * Space stops the page scrolling under the card.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
  };

  return (
    <motion.div
      ref={ref}
      {...hoverProps}
      onClick={onClick}
      onKeyDown={activatable ? handleKeyDown : onKeyDown}
      role={activatable ? 'button' : undefined}
      tabIndex={activatable ? 0 : undefined}
      className={cn(BASE, VARIANT[variant], activatable && 'cursor-pointer', className)}
      {...rest}
    />
  );
});

export default Card;