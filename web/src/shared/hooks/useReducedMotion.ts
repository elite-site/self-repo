import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Whether the user has asked the OS for reduced motion (`prefers-reduced-motion:
 * reduce`, §3.4).
 *
 * Framer Motion's own hook already subscribes to the media query and re-renders
 * when it flips, so the work here is the type: `useReducedMotion()` there is
 * `boolean | null`, with `null` meaning "not resolved yet" on the very first
 * render. Every consumer of this module wants a plain `boolean`, and `null`
 * resolved to `false` keeps the first paint behaving exactly as it did before
 * the preference was known.
 *
 * Framer Motion's `null` is only reachable during server rendering, where
 * nothing paints anyway, so in the browser this returns a definite `true` or
 * `false` from the first commit.
 *
 * Components use this rather than Framer Motion's hook directly so that the
 * null-vs-false decision lives in exactly one place.
 *
 * @example
 * const shouldReduce = useReducedMotion();
 * const variants = selectVariantsByName(shouldReduce, 'page');
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}