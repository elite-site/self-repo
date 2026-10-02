import { useReducedMotion } from '../hooks/useReducedMotion';
import type { Easing, MotionStyle, TargetAndTransition, Transition, Variants } from 'framer-motion';

// ============================================================================
// Shared motion vocabulary — REDESIGN_PLAN §4.7 + Appendix C
// ============================================================================
//
// This module is the only place animation timings are declared. Later batches
// import variants and transitions from here and never write a duration or an
// easing of their own.
//
// Durations and easings come from the design tokens in `shared/tokens.mjs`
// (the `motion` export), which is what the generated CSS and the Tailwind
// preset already read. The values below are that same table carried into JS,
// expressed in the units Framer Motion wants: the tokens are milliseconds,
// Framer Motion is seconds. `ms()` is the one place that conversion happens.
// `shared/tokens.mjs` cannot be imported directly because it is untyped `.mjs`
// outside this tsconfig's `include`, so the table is mirrored rather than
// imported — changing a token means changing both places.
//
// Reduced motion is not optional (§3.4). Every named variant below has a
// `reduced*` counterpart in the same group, and `motionVariants` below is the
// registry that keeps the two halves paired. `selectVariants` /
// `selectVariantsByName` pick the right one; the only thing a component has to
// supply is the `useReducedMotion()` boolean. Reduced variants keep the opacity
// change — the thing that carries meaning — and drop travel, scale and stagger,
// which is what actually triggers vestibular symptoms.
// ============================================================================

/** Milliseconds (the token unit) to seconds (the Framer Motion unit). */
const ms = (milliseconds: number): number => milliseconds / 1000;

/**
 * Duration tokens, in seconds. Mirrors `motion['dur-*']` in `shared/tokens.mjs`
 * and the `transitionDuration` block in `shared/tailwind-preset.mjs`.
 */
export const MOTION_DURATIONS = {
  instant: ms(0), // 0ms
  fast: ms(100), // 100ms — press feedback
  quick: ms(150), // 150ms — hover colour
  normal: ms(200), // 200ms — most micro-interactions
  moderate: ms(300), // 300ms — card expansion, dropdown open
  slow: ms(400), // 400ms — page transition, modal
  deliberate: ms(500), // 500ms — skeleton to content
  lazy: ms(700), // 700ms — scroll reveal
  story: ms(1000), // 1000ms — onboarding, splash
} as const;

/**
 * Easing tokens as Framer Motion bezier tuples. Mirrors `motion['ease-*']` in
 * `shared/tokens.mjs` and the `transitionTimingFunction` block in
 * `shared/tailwind-preset.mjs`. `linear` is the bezier form of `linear`.
 */
export const MOTION_EASINGS = {
  linear: [0, 0, 1, 1],
  out: [0, 0, 0.2, 1], // decelerating — entrances
  in: [0.4, 0, 1, 1], // accelerating — exits
  inOut: [0.4, 0, 0.2, 1], // symmetric — movement
  gentle: [0.25, 0.46, 0.45, 0.94], // smooth, premium
} satisfies Record<string, Easing>;

/**
 * Spring tokens. §4.7 defines spring and bounce as physics rather than curves;
 * `tab` is the one appendix-only spring (the tab indicator's slightly tighter
 * damping) and has no duration/easing token to point at.
 */
export const MOTION_SPRINGS = {
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  bounce: { type: 'spring', stiffness: 300, damping: 15 },
  tab: { type: 'spring', stiffness: 380, damping: 28 },
} satisfies Record<string, Transition>;

// ─── Transitions ─────────────────────────────────────────────────────────────

export const transitionFast: Transition = {
  duration: MOTION_DURATIONS.fast,
  ease: MOTION_EASINGS.in,
};
export const transitionQuick: Transition = {
  duration: MOTION_DURATIONS.quick,
  ease: MOTION_EASINGS.gentle,
};
export const transitionNormal: Transition = {
  duration: MOTION_DURATIONS.normal,
  ease: MOTION_EASINGS.gentle,
};
export const transitionModerate: Transition = {
  duration: MOTION_DURATIONS.moderate,
  ease: MOTION_EASINGS.out,
};
export const transitionSlow: Transition = {
  duration: MOTION_DURATIONS.slow,
  ease: MOTION_EASINGS.out,
};
export const transitionSpring: Transition = MOTION_SPRINGS.spring;
export const transitionBounce: Transition = MOTION_SPRINGS.bounce;
export const transitionTabSpring: Transition = MOTION_SPRINGS.tab;

/**
 * The reduced-motion counterpart of every `transition*` above. One constant
 * rather than four: when travel is gone there is nothing to interpolate
 * smoothly, so every animation becomes an instant state swap.
 */
export const transitionReduced: Transition = {
  duration: MOTION_DURATIONS.instant,
  ease: MOTION_EASINGS.linear,
};

// ─── Page Transitions ────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};
export const reducedPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};

export const pageVariantsBack: Variants = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
};
/** Direction does not change the reduced-motion page transition — it is a fade. */
export const reducedPageVariantsBack: Variants = reducedPageVariants;

/** Tab switches fade rather than slide, so the reduced form is the same fade. */
export const pageFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};
export const reducedPageFadeVariants: Variants = pageFadeVariants;

// ─── Modal ───────────────────────────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0, transition: transitionQuick },
  visible: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};
/** The backdrop is already opacity-only, so reduced motion changes nothing. */
export const reducedModalBackdropVariants: Variants = modalBackdropVariants;

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transitionQuick },
  exit: { opacity: 0, scale: 0.95, y: 16, transition: transitionFast },
};
export const reducedModalPanelVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};

/**
 * §8.2: a bottom sheet "slides up from bottom with spring animation", so the
 * entrance is `transitionSpring` rather than the 200ms curve the rest of the
 * overlays use. `bounce` is the other approved spring but its damping (15)
 * overshoots visibly on a panel this tall, so the tighter `spring` is the one
 * the spec's wording calls for. The exit stays `transitionFast`: a spring
 * pushing the sheet back down would rebound it back into view.
 */
export const bottomSheetVariants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0, transition: transitionSpring },
  exit: { opacity: 0, y: '100%', transition: transitionFast },
};
export const reducedBottomSheetVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};

// ─── Cards & Controls ────────────────────────────────────────────────────────
//
// These are prop bags rather than variants, so they pair as objects. Spread
// them onto a `motion.*` element: `<motion.div {...cardHoverProps} />`.

interface InteractionProps {
  whileHover: TargetAndTransition;
  whileTap: TargetAndTransition;
  transition: Transition;
}

/** Reduced motion has no hover or press state to show, so every prop is a no-op. */
export const reducedInteractionProps: InteractionProps = {
  whileHover: {},
  whileTap: {},
  transition: transitionReduced,
};

export const cardHoverProps = {
  whileHover: { y: -4 },
  transition: transitionNormal,
};
export const reducedCardHoverProps = { transition: transitionReduced };

export const buttonPressProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: transitionFast,
};
export const reducedButtonPressProps: InteractionProps = reducedInteractionProps;

export const iconButtonProps = {
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.9 },
  transition: transitionFast,
};
export const reducedIconButtonProps: InteractionProps = reducedInteractionProps;

// ─── Stagger Lists ───────────────────────────────────────────────────────────

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: MOTION_DURATIONS.quick,
      delayChildren: MOTION_DURATIONS.fast,
    },
  },
};
/** No stagger: the children would otherwise land after the container has settled. */
export const reducedStaggerContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: transitionModerate },
};
export const reducedStaggerItemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionNormal },
};

export const staggerFastContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: MOTION_DURATIONS.fast,
      delayChildren: MOTION_DURATIONS.fast,
    },
  },
};
export const reducedStaggerFastContainerVariants: Variants = reducedStaggerContainerVariants;

export const staggerFastItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  // Appendix C writes 250ms here; that is between two token steps and not a
  // step itself, so it rounds down to `duration-normal`.
  show: { opacity: 1, y: 0, transition: transitionNormal },
};
export const reducedStaggerFastItemVariants: Variants = reducedStaggerItemVariants;

// ─── Scroll Reveal ───────────────────────────────────────────────────────────

export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { ...transitionSlow, delay: MOTION_DURATIONS.fast } },
};
export const reducedScrollRevealVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionModerate },
};

export const scrollRevealLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: transitionModerate },
};
export const reducedScrollRevealLeftVariants: Variants = reducedScrollRevealVariants;

export const scrollRevealRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: transitionModerate },
};
export const reducedScrollRevealRightVariants: Variants = reducedScrollRevealVariants;

// ─── Toast ───────────────────────────────────────────────────────────────────

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 32, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transitionSpring },
  exit: { opacity: 0, y: 16, scale: 0.95, transition: transitionFast },
};
export const reducedToastVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};

// ─── Chips ───────────────────────────────────────────────────────────────────

export const chipEnterVariants: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: transitionSpring },
  exit: { scale: 0.8, opacity: 0, transition: transitionFast },
};
export const reducedChipEnterVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionQuick },
  exit: { opacity: 0, transition: transitionFast },
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_EXPANDED_WIDTH = 240;

export const sidebarTransition: Transition = {
  duration: MOTION_DURATIONS.moderate,
  ease: MOTION_EASINGS.gentle,
};
export const reducedSidebarTransition: Transition = transitionReduced;

// ─── Swipe Card ──────────────────────────────────────────────────────────────

export const SWIPE_POWER_REQUIRED = 10000;

export function getSwipePower(offset: number, velocity: number): number {
  return Math.abs(offset) * velocity;
}

/**
 * Offsets for the cards stacked behind the dragged one. Geometry, not
 * choreography: it is a function of the user's own finger, so it is applied as
 * a `style` rather than animated, and `MOTION_INTENSITY: 3` says the voting
 * card gets no ambient motion.
 *
 * @example
 * <motion.div style={swipeCardStackVariants(index)} />
 */
export function swipeCardStackVariants(index: number): MotionStyle {
  return {
    scale: 1 - index * 0.05,
    y: index * 8,
    zIndex: 10 - index,
    opacity: index < 3 ? 1 : 0,
  };
}

/**
 * The reduced-motion counterpart is the same function: nothing here animates on
 * its own, so there is nothing for a reduced-motion user to opt out of. Aliased
 * rather than copied so the two cannot drift.
 */
export const reducedSwipeCardStackVariants = swipeCardStackVariants;

// ─── Variant Registry ────────────────────────────────────────────────────────

/**
 * Every named variant paired with its reduced-motion counterpart. Read this
 * when adding a variant: an entry here with only a `full` half is a bug.
 * Factories are absent by design — `swipeCardStackVariants` takes an index
 * rather than naming states, so it is not something this registry can hold.
 *
 * @example
 * const variants = selectVariantsByName('page', useReducedMotion());
 * <motion.div variants={variants} initial="initial" animate="animate" exit="exit" />
 */
export const motionVariants = {
  page: { full: pageVariants, reduced: reducedPageVariants },
  pageBack: { full: pageVariantsBack, reduced: reducedPageVariantsBack },
  pageFade: { full: pageFadeVariants, reduced: reducedPageFadeVariants },
  modalBackdrop: { full: modalBackdropVariants, reduced: reducedModalBackdropVariants },
  modalPanel: { full: modalPanelVariants, reduced: reducedModalPanelVariants },
  bottomSheet: { full: bottomSheetVariants, reduced: reducedBottomSheetVariants },
  cardHover: { full: cardHoverProps, reduced: reducedCardHoverProps },
  buttonPress: { full: buttonPressProps, reduced: reducedButtonPressProps },
  iconButton: { full: iconButtonProps, reduced: reducedIconButtonProps },
  staggerContainer: { full: staggerContainerVariants, reduced: reducedStaggerContainerVariants },
  staggerItem: { full: staggerItemVariants, reduced: reducedStaggerItemVariants },
  staggerFastContainer: {
    full: staggerFastContainerVariants,
    reduced: reducedStaggerFastContainerVariants,
  },
  staggerFastItem: { full: staggerFastItemVariants, reduced: reducedStaggerFastItemVariants },
  scrollReveal: { full: scrollRevealVariants, reduced: reducedScrollRevealVariants },
  scrollRevealLeft: { full: scrollRevealLeftVariants, reduced: reducedScrollRevealLeftVariants },
  scrollRevealRight: { full: scrollRevealRightVariants, reduced: reducedScrollRevealRightVariants },
  toast: { full: toastVariants, reduced: reducedToastVariants },
  chip: { full: chipEnterVariants, reduced: reducedChipEnterVariants },
  sidebar: { full: sidebarTransition, reduced: reducedSidebarTransition },
} as const;

/** The names `selectVariantsByName` accepts. */
export type MotionVariantName = keyof typeof motionVariants;

/**
 * Picks between a full variant set and its reduced-motion counterpart.
 *
 * @example
 * const variants = selectVariants(shouldReduce, pageVariants, reducedPageVariants);
 */
export function selectVariants<T>(shouldReduce: boolean, full: T, reduced: T): T {
  return shouldReduce ? reduced : full;
}

/** `selectVariants` against the registry above, by name. */
export function selectVariantsByName<K extends MotionVariantName>(
  shouldReduce: boolean,
  name: K,
): (typeof motionVariants)[K]['full'] | (typeof motionVariants)[K]['reduced'] {
  return selectVariants(shouldReduce, motionVariants[name].full, motionVariants[name].reduced);
}

// ─── Usage Helpers ───────────────────────────────────────────────────────────

/**
 * Resolves the page-transition variants for a navigation direction, already
 * reduced if the user has asked for reduced motion.
 *
 * @example
 * const { variants, transition } = usePageTransitionVariants('back');
 * <AnimatePresence mode="wait">
 *   <motion.div key={location.pathname} variants={variants} transition={transition} ... />
 */
export function usePageTransitionVariants(direction: 'forward' | 'back' | 'tab' = 'forward'): {
  variants: Variants;
  transition: Transition;
} {
  const shouldReduce = useReducedMotion();

  const variants = selectVariantsByName(
    shouldReduce,
    direction === 'tab' ? 'pageFade' : direction === 'back' ? 'pageBack' : 'page',
  );

  return {
    variants,
    transition: selectVariants(shouldReduce, transitionModerate, transitionReduced),
  };
}