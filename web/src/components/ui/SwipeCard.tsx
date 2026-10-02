import React, { useCallback, useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Check, MoveHorizontal, X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  SWIPE_POWER_REQUIRED,
  getSwipePower,
  selectVariantsByName,
  swipeCardStackVariants,
  transitionBounce,
  transitionReduced,
} from '../../lib/motion';

// ============================================================================
// Swipe card — REDESIGN_PLAN §4.8 "Swipe Card (Voting Page)", §6.15
// ============================================================================
//
// The centrepiece of the Voting page: a candidate card that can be thrown right
// to vote and left to pass, with the next two cards stacked behind it.
//
// Three decisions worth stating, because each one is a plan rule rather than a
// preference:
//
// 1. The swipe is never the only way to act. §3.2 puts clarity above
//    cleverness, so the Pass and Vote buttons are part of this component, not
//    something the page has to remember to render. A page that draws its own
//    row can turn them off with `showActions={false}`.
//
// 2. Commit is on throw power, not on distance. `getSwipePower` multiplies the
//    drag distance by its velocity, so a fast flick across 40px counts and a
//    slow deliberate drag across 150px does not — which matches what the
//    gesture physically felt like.
//
// 3. Only the top card is a control. Cards at index 1 and 2 are painted by
//    `swipeCardStackVariants` as geometry, are inert to the pointer, and are
//    hidden from assistive technology so the page reads as one candidate, not
//    three.
//
// The drag hint never leaves the card. A mechanic nobody can see is a mechanic
// nobody uses.
// ============================================================================

/**
 * Degrees of rotation at the extremes of the drag. Gesture geometry rather than
 * a design token: it describes how far the student's own finger has moved, so
 * there is no value here for a theme or a motion table to own.
 */
const ROTATION_RANGE = 200;
const ROTATION_DEGREES = 20;

/** Shared by both action buttons; §6.15 asks for 56px circles, §8.3 for 44px minimum targets. */
const actionButtonBase =
  'flex size-14 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export interface SwipeCardProps {
  children: React.ReactNode;
  /** 0 is the top card and the only interactive one; 1 and 2 are the stack behind it. */
  index?: number;
  onVote?: () => void;
  onPass?: () => void;
  /** Text on the drag stamps. */
  labels?: { pass: string; vote: string };
  /** Accessible names for the two buttons — name the candidate, not the verb. */
  actionLabels?: { pass: string; vote: string };
  /** Set false when the page renders its own action row under the stack. */
  showActions?: boolean;
  showDragHint?: boolean;
  /** Names the card for assistive technology: "Candidate 3 of 28, Ananya Rao". */
  ariaLabel?: string;
  className?: string;
}

export const SwipeCard = React.forwardRef<HTMLDivElement, SwipeCardProps>(function SwipeCard(
  {
    children,
    index = 0,
    onVote,
    onPass,
    labels = { pass: 'PASS', vote: 'VOTE' },
    actionLabels,
    showActions = true,
    showDragHint = true,
    ariaLabel,
    className,
  },
  forwardedRef,
) {
  const shouldReduce = useReducedMotion();
  const isTop = index === 0;

  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-ROTATION_RANGE, ROTATION_RANGE],
    [-ROTATION_DEGREES, ROTATION_DEGREES],
  );
  // The stamps are the feedback for the gesture in progress: they must be the
  // one thing that says which way the card is heading before it is released.
  const passStampOpacity = useTransform(x, [-50, 0], [1, 0]);
  const voteStampOpacity = useTransform(x, [0, 50], [0, 1]);

  // Guards against a second commit while the card is still leaving.
  const committedRef = useRef(false);

  // A card promoted from index 1 to index 0 is a fresh decision: clear the
  // guard and put it back on the centre line. Never fires mid-flight, because
  // the departing card stays at index 0 until it unmounts.
  useEffect(() => {
    if (!isTop) return;
    committedRef.current = false;
    x.set(0);
  }, [isTop, x]);

  const commit = useCallback(
    (direction: 'vote' | 'pass') => {
      if (direction === 'vote') onVote?.();
      else onPass?.();
    },
    [onPass, onVote],
  );

  const decide = useCallback(
    (direction: 'vote' | 'pass') => {
      if (!isTop || committedRef.current) return;
      committedRef.current = true;
      // Far enough that the card is fully off the viewport, whatever its width.
      const distance = typeof window === 'undefined' ? 640 : Math.max(640, window.innerWidth);
      const target = direction === 'vote' ? distance : -distance;

      if (shouldReduce) {
        // No flight: the card leaves on the same frame the outcome is decided,
        // and the outcome is carried by the next card, not by motion.
        x.set(target);
        commit(direction);
        return;
      }
      // The plan asks for a soft spring on departure. 200/20 is not one of the
      // motion tokens, so the nearest approved spring is used instead (§3.6).
      animate(x, target, { ...transitionBounce, onComplete: () => commit(direction) });
    },
    [commit, isTop, shouldReduce, x],
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const power = getSwipePower(info.offset.x, info.velocity.x);
      if (power >= SWIPE_POWER_REQUIRED) {
        decide(info.offset.x > 0 ? 'vote' : 'pass');
        return;
      }
      // Not enough throw. Spring back, or snap back under reduced motion.
      animate(x, 0, shouldReduce ? transitionReduced : transitionBounce);
    },
    [decide, shouldReduce, x],
  );

  const pressProps = selectVariantsByName(shouldReduce, 'iconButton');

  return (
    <motion.div
      ref={forwardedRef}
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isTop ? undefined : true}
      // Depth is a plain style, not an animation: the offsets track the
      // student's own drag, and the reduced-motion variant of this helper is
      // deliberately the same function.
      style={swipeCardStackVariants(index)}
      className={cn('relative h-96 w-full', className)}
    >
      <motion.div
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        // `pan-y` hands vertical scrolling back to the page on a touch screen
        // while the horizontal axis stays with the card.
        style={{ x, rotate, touchAction: 'pan-y' }}
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-xl border border-edge bg-surface shadow-lg',
          isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        <motion.div
          style={{ opacity: passStampOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-4 rounded-md border-2 border-danger px-2 py-1 font-ui text-sm font-bold uppercase tracking-wide text-danger"
        >
          {labels.pass}
        </motion.div>

        <motion.div
          style={{ opacity: voteStampOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 rounded-md border-2 border-success px-2 py-1 font-ui text-sm font-bold uppercase tracking-wide text-success"
        >
          {labels.vote} <Check size={14} className="inline" aria-hidden="true" />
        </motion.div>

        {isTop && showDragHint && (
          <p className="flex items-center justify-center gap-1.5 border-t border-edge px-4 py-2 text-xs text-ink-muted">
            <MoveHorizontal size={14} aria-hidden="true" />
            Drag right to vote, left to pass
          </p>
        )}

        {isTop && showActions && (
          <div className="flex items-center justify-center gap-5 border-t border-edge bg-surface-sunken px-4 py-3">
            <motion.button
              type="button"
              {...pressProps}
              onClick={() => decide('pass')}
              aria-label={actionLabels?.pass ?? `Pass on this ${labels.pass.toLowerCase()} candidate`}
              className={cn(actionButtonBase, 'border-2 border-danger text-danger hover:bg-danger-subtle')}
            >
              <X size={20} aria-hidden="true" />
              <span className="font-ui text-[10px] font-semibold uppercase">Pass</span>
            </motion.button>

            <motion.button
              type="button"
              {...pressProps}
              onClick={() => decide('vote')}
              aria-label={actionLabels?.vote ?? 'Vote for this candidate'}
              className={cn(actionButtonBase, 'bg-brand text-on-brand hover:bg-brand-hover')}
            >
              <Check size={20} aria-hidden="true" />
              <span className="font-ui text-[10px] font-semibold uppercase">Vote</span>
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});

export default SwipeCard;