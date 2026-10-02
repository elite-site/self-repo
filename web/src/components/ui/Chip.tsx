import React from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition } from 'framer-motion';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';

/**
 * An interactive filter or toggle. REDESIGN_PLAN §4.8 "Badge / Tag / Chip".
 *
 * Chips sit in a row and are pressed, not clicked once, so the pressed state is
 * `aria-pressed` rather than a link. The check mark is the reason a chip is not
 * just "brand-coloured or not": §3.4 requires a state difference that survives
 * without colour, and a chip is the one control here small enough that the mark
 * costs nothing.
 */

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  label: string;
  /** Defaults to `false`. Reflected as `aria-pressed`. */
  selected?: boolean;
  /** Optional leading icon. Replaced by the check mark while selected. */
  icon?: LucideIcon;
}

interface PressProps {
  whileHover?: TargetAndTransition;
  whileTap?: TargetAndTransition;
  transition?: Transition;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  icon: Icon,
  disabled = false,
  type = 'button',
  className,
  ...rest
}) => {
  const shouldReduce = useReducedMotion();
  const pressProps: PressProps = disabled ? {} : selectVariantsByName(shouldReduce, 'buttonPress');

  return (
    <motion.button
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      {...pressProps}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-ui text-sm font-medium',
        'transition-colors duration-quick ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'bg-brand text-on-brand'
          : 'bg-surface-sunken text-ink-secondary enabled:hover:bg-surface-inset',
        className,
      )}
      {...rest}
    >
      {selected ? (
        <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      ) : null}
      {label}
    </motion.button>
  );
};

export default Chip;