import React from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition, HTMLMotionProps } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';

/**
 * The portal's only button. REDESIGN_PLAN §4.8.
 *
 * Four colour variants carry intent (`primary` is the one CTA, `danger` is the
 * one destructive action) and one shape variant (`icon-only`) carries density.
 * Everything else — height, padding, type size, icon size — is a size, so a
 * page picks an intent and a size and never writes a class.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon-only';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Defaults to `primary`. `icon-only` is the neutral, square treatment. */
  variant?: ButtonVariant;
  /** Defaults to `md`. */
  size?: ButtonSize;
  /**
   * Swaps the icon for a spinner, blocks interaction and marks the button
   * `aria-busy`. A submit must never be double-submitted.
   */
  loading?: boolean;
  /** Replaces the label while `loading` — "Signing in…", "Saving…". */
  loadingLabel?: React.ReactNode;
  /** Leading or trailing. Leading by default, which is where the plan puts it. */
  iconPosition?: 'start' | 'end';
  icon?: LucideIcon;
}

/** A button with a visible label. */
export type LabelledButtonProps = CommonProps & {
  iconOnly?: false;
  children?: React.ReactNode;
};

/**
 * A square, icon-only button. `aria-label` is required rather than optional:
 * an icon with no name is invisible to a screen reader, and the type is the
 * cheapest place to enforce that (it fails the build, not the audit).
 */
export type IconOnlyButtonProps = CommonProps & {
  iconOnly?: true;
  icon: LucideIcon;
  children?: never;
  'aria-label': string;
};

export type ButtonProps = LabelledButtonProps | IconOnlyButtonProps;

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-ui font-semibold ' +
  // §4.8 "Active/Pressed". The scale half of the press is Framer's `whileTap`
  // below — a CSS `active:scale-*` would write a transform that the inline one
  // silently overwrites, so only the colour shift lives in CSS.
  'transition-all duration-fast ease-standard active:brightness-90 ' +
  // §4.8 "Focus". `ring-offset-surface` rather than Tailwind's white default,
  // which would be an invisible gap in the dark theme.
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
  // §4.8 "Disabled". The `enabled:` prefix on every hover rule below is what
  // actually implements "no hover effects": `:hover` still matches a disabled
  // button, so an ungated hover colour would light up on the dead control.
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

/** §4.8 icon-size column: 16 / 18 / 20px. */
const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

/** Square, because the icon is the whole content. */
const ICON_ONLY_SIZE: Record<ButtonSize, string> = { sm: 'size-8', md: 'size-10', lg: 'size-12' };

const VARIANT: Record<Exclude<ButtonVariant, 'icon-only'>, string> = {
  primary: 'bg-brand text-on-brand enabled:hover:bg-brand-hover enabled:hover:shadow-brand',
  secondary: 'border border-edge bg-surface text-ink enabled:hover:bg-surface-sunken',
  ghost: 'bg-transparent text-ink-secondary enabled:hover:bg-surface-sunken enabled:hover:text-ink',
  // "darker red" in §4.8. The solid status step is the theme-invariant one, so
  // the hover stays a real colour change in both themes.
  danger: 'bg-danger text-on-brand enabled:hover:bg-status-solid-rejected',
};

/** The press prop bag, widened so the union from the registry spreads cleanly. */
interface PressProps {
  whileHover?: TargetAndTransition;
  whileTap?: TargetAndTransition;
  transition?: Transition;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    iconPosition = 'start',
    icon: Icon,
    iconOnly: iconOnlyProp,
    className,
    children,
    disabled = false,
    type = 'button',
    ...rest
  },
  ref,
) {
  const shouldReduce = useReducedMotion();

  // `icon-only` is a shape, not a colour: the table above it says "any of the
  // above", so the variant collapses to the neutral treatment unless the caller
  // also asks for `iconOnly` alongside a coloured variant.
  const isIconOnly = iconOnlyProp ?? variant === 'icon-only';
  const colour = variant === 'icon-only' ? 'secondary' : variant;

  // A disabled button still matches `:hover`, and Framer listens for
  // `pointerenter`, so the inert states get no motion props at all rather than
  // relying on the browser to suppress them.
  const pressProps: PressProps =
    disabled || loading ? {} : selectVariantsByName(shouldReduce, 'buttonPress');

  const iconSize = ICON_SIZE[size];
  const iconNode = loading ? (
    <Loader2 size={iconSize} strokeWidth={2} className="animate-spin" aria-hidden="true" />
  ) : Icon ? (
    <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
  ) : null;

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...pressProps}
      className={cn(
        BASE,
        isIconOnly ? `${ICON_ONLY_SIZE[size]} p-0` : SIZE[size],
        VARIANT[colour],
        loading && 'opacity-80',
        className,
      )}
      {...rest}
    >
      {iconPosition === 'start' && iconNode}
      {!isIconOnly && (loading && loadingLabel ? loadingLabel : children)}
      {iconPosition === 'end' && iconNode}
    </motion.button>
  );
});

export default Button;