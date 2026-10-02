import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import { selectVariantsByName, transitionTabSpring } from '../../lib/motion';
import { BOTTOM_TAB_NAV, NavItem } from '../navigation/NavItem';
import { MoreSheet } from './MoreSheet';

/**
 * §5.2 — the mobile tab bar: four route tabs plus "More", `md:hidden` so it is
 * never interactive at the same time as the sidebar. The bar is a real `<nav>`
 * of real links, so it is keyboard reachable: Tab moves through the four tabs
 * and then the More button, in document order, exactly like the desktop rail.
 * Every target is at least 44×44 (§8.3).
 *
 * The travelling indicator (§5.2, `layoutId="tab-indicator"`) is split across
 * this file and `NavItem`: the four route tabs emit it from `NavItem`, the More
 * button emits it here, so one `layoutId` is shared and Framer slides the single
 * rule between any two of the five.
 */
export const BottomTabBar: React.FC<{
  unreadCount?: number;
  onLogout?: () => void;
}> = ({ unreadCount = 0, onLogout }) => {
  const shouldReduce = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pressProps = selectVariantsByName(shouldReduce, 'buttonPress');

  // §5.2: "More" itself carries a badge when anything inside it has one.
  const moreHasBadge = unreadCount > 0;

  return (
    <>
      <nav
        aria-label="Primary"
        className="safe-area-pb fixed inset-x-0 bottom-0 z-sticky border-t border-edge bg-surface pt-1 md:hidden"
      >
        <ul className="flex items-stretch px-1">
          {BOTTOM_TAB_NAV.map((entry) => (
            <li key={entry.path} className="flex-1">
              <NavItem entry={entry} layout="stacked" onNavigate={() => setSheetOpen(false)} />
            </li>
          ))}

          <li className="flex-1">
            <button
              id="more-sheet-trigger"
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              aria-expanded={sheetOpen}
              aria-haspopup="dialog"
              className={cn(
                'group relative flex min-h-11 w-full flex-col items-center justify-center gap-1',
                'rounded-lg px-1 py-1.5 text-center font-ui text-label-lg',
                'transition-colors duration-quick',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                sheetOpen ? 'font-semibold text-brand' : 'text-ink-muted',
              )}
            >
              <span className="relative flex items-center justify-center">
                <motion.span
                  aria-hidden="true"
                  {...pressProps}
                  className="flex items-center justify-center"
                >
                  <MoreHorizontal size={20} strokeWidth={1.75} />
                </motion.span>
                {moreHasBadge ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1 size-2 rounded-full bg-brand ring-2 ring-surface"
                  />
                ) : null}
              </span>

              <span className="flex items-center gap-1">
                <span>More</span>
                {moreHasBadge ? <span className="sr-only">({unreadCount} unread)</span> : null}
              </span>

              <AnimatePresence initial={false}>
                {sheetOpen ? (
                  <motion.span
                    key="more-indicator"
                    layoutId="tab-indicator"
                    aria-hidden="true"
                    transition={transitionTabSpring}
                    className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </AnimatePresence>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        unreadCount={unreadCount}
        onLogout={onLogout}
      />
    </>
  );
};

export default BottomTabBar;