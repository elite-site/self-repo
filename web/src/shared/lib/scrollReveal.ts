/**
 * Scroll-reveal utility — DESIGN.md §5.3
 *
 * Observes elements with `data-reveal` and toggles the `revealed` class when
 * they enter the viewport. No animation library needed; CSS handles the
 * transition. The observer tears itself down cleanly via the returned cleanup
 * function, which React effects can call as the destructor.
 *
 * Usage (React):
 *   useEffect(() => scrollReveal(), []);
 *
 * Usage (HTML):
 *   <div data-reveal data-reveal-delay="100"> ... </div>
 *
 * CSS required (already in tokens.css via the [data-reveal] block):
 *   [data-reveal] { opacity: 0; transform: translateY(12px);
 *                   transition: opacity 400ms ease, transform 400ms ease; }
 *   [data-reveal].revealed { opacity: 1; transform: translateY(0); }
 *   [data-reveal][data-reveal-delay] { transition-delay: attr(data-reveal-delay ms); }
 */

const THRESHOLD = 0.1;
const ROOT_MARGIN = '0px 0px -40px 0px';

/**
 * Bootstraps the intersection observer for scroll-reveal elements.
 *
 * @param root - The scroll container. Defaults to the viewport.
 * @returns Cleanup function that disconnects the observer.
 */
export function scrollReveal(root?: Element): () => void {
  // Respect prefers-reduced-motion: skip animation entirely.
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.classList.add('revealed');
    });
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = el.dataset.revealDelay;
          if (delay) {
            el.style.transitionDelay = `${delay}ms`;
          }
          el.classList.add('revealed');
          // Unobserve after reveal so it does not toggle back on scroll up.
          io.unobserve(el);
        }
      });
    },
    { threshold: THRESHOLD, rootMargin: ROOT_MARGIN, root: root ?? null },
  );

  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  return () => io.disconnect();
}
