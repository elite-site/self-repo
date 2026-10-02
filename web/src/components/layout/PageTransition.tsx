import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { usePageTransitionVariants } from '../../lib/motion';

export type NavigationDirection = 'forward' | 'back' | 'tab';

/**
 * §5.5 — which way the page is travelling.
 *
 * Depth of the path, compared against the previous one, exactly as the plan
 * describes. A browser back or forward is trusted over the depth comparison,
 * because `POP` is the only signal that knows a history entry moved rather than
 * the student clicking something; depth gets it right most of the time and
 * wrong on `/profile` → `/profile/edit`, which is precisely the case `POP`
 * covers. Same depth on both sides is a sibling switch (`/portfolio/projects` →
 * `/portfolio/achievements`, `/voting/a` → `/voting/b`), and those crossfade
 * rather than slide — sliding sideways between two tabs of the same page reads
 * as the page moving, not as the selection changing.
 */
export function useNavigationDirection(): NavigationDirection {
  const navigationType = useNavigationType();
  const pathname = useLocation().pathname;
  const previousPathname = useRef(pathname);
  const direction = useRef<NavigationDirection>('forward');

  if (previousPathname.current !== pathname) {
    if (navigationType === 'POP') {
      direction.current = 'back';
    } else {
      const previousDepth = pathDepth(previousPathname.current);
      const currentDepth = pathDepth(pathname);
      direction.current =
        currentDepth > previousDepth ? 'forward' : currentDepth < previousDepth ? 'back' : 'tab';
    }
    previousPathname.current = pathname;
  }

  return direction.current;
}

/** `/a/b/c` is depth 3; `/` is depth 0. Query strings and hashes do not count. */
function pathDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

/**
 * §5.5 — the route transition, keyed on the pathname so a query-string change
 * inside one page does not replay it.
 *
 * `mode="wait"` finishes the outgoing page before the incoming one starts, which
 * is what stops two full-height pages cross-fading through each other. The
 * variants and the duration come from `usePageTransitionVariants`, so the
 * direction is picked and the reduced-motion half is chosen in one place
 * (`lib/motion.ts`) rather than here.
 *
 * `initial={false}` on `AnimatePresence` means the first page of a session
 * arrives without a transition: the student navigated here, so animating it would
 * delay what they came for.
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const direction = useNavigationDirection();
  const { variants, transition } = usePageTransitionVariants(direction);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;