import React from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Globe,
  LayoutDashboard,
  User,
  Users,
  Video,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName, transitionTabSpring } from '../../lib/motion';
import { prefetchRoute } from '../../utils/prefetch';

// ============================================================================
// Navigation vocabulary
// ============================================================================
//
// One table, read by the sidebar, the bottom tab bar, the "More" sheet and the
// command palette. The three nav surfaces used to each carry their own copy of
// the item list, which is how the sidebar and the mobile tab bar came to offer
// different numbers of destinations. §5.1, §5.2 and §5.4 all index the same
// pages, so they index one table here.

export interface NavEntry {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Second line, shown in the "More" sheet. */
  description?: string;
  /** Extra words the command palette matches on, beyond the label. */
  keywords?: string;
}

/** §5.1: the full desktop rail, in the order the plan draws it. */
export const SIDEBAR_NAV: NavEntry[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { label: 'Profile', path: '/profile', icon: User, keywords: 'roll number bio' },
  {
    label: 'Portfolio',
    path: '/portfolio',
    icon: Briefcase,
    keywords: 'projects achievements certificates',
  },
  {
    label: 'Intro Video',
    path: '/intro-video',
    icon: Video,
    keywords: 'introduction recording',
    description: 'Record, review and publish your video introduction',
  },
  {
    label: 'Resume',
    path: '/resume',
    icon: FileText,
    keywords: 'cv pdf upload',
    description: 'Upload and preview your professional resume',
  },
  {
    label: 'Events',
    path: '/events',
    icon: Calendar,
    keywords: 'hackathons workshops competitions',
    description: 'Department competitions, hackathons and workshops',
  },
  {
    label: 'Registrations',
    path: '/registrations',
    icon: ClipboardList,
    keywords: 'my events signups',
    description: 'Track the events you have registered for',
  },
  {
    label: 'Teams',
    path: '/teams',
    icon: Users,
    keywords: 'hackathon squad',
    description: 'Form and manage your competition teams',
  },
  {
    label: 'Voting',
    path: '/voting',
    icon: Vote,
    keywords: 'elections democracy candidates',
    description: 'Active campaigns and candidate elections',
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: Bell,
    keywords: 'inbox announcements alerts',
    description: 'Announcements, moderation alerts and updates',
  },
];

/**
 * §5.2: the four route tabs of the bottom bar. The fifth tab is "More", which
 * is a button rather than a link, so it is not in this list.
 */
export const BOTTOM_TAB_NAV: NavEntry[] = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Portfolio', path: '/portfolio', icon: Briefcase },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Events', path: '/events', icon: Calendar },
];

const TAB_PATHS = new Set(BOTTOM_TAB_NAV.map((entry) => entry.path));

/**
 * §5.2: everything the bottom bar does not fit, plus the public directory the
 * old mobile sheet carried. Derived from `SIDEBAR_NAV` so the two cannot drift.
 * §5.1 lists a "Settings" row and §5.2 a "Settings" sheet entry, but this repo
 * has no `/settings` route and no settings page, so `/registrations` takes that
 * slot rather than the row linking to nothing.
 */
export const MORE_SHEET_NAV: NavEntry[] = [
  ...SIDEBAR_NAV.filter((entry) => !TAB_PATHS.has(entry.path)),
  {
    label: 'Public Directory',
    path: '/students',
    icon: Globe,
    keywords: 'search everyone classmates',
    description: 'Browse every verified student profile',
  },
];

// ============================================================================
// Nav item
// ============================================================================

/** "99+", so the pill never grows past three glyphs (§5.3). */
export function formatCount(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export interface NavItemProps {
  entry: NavEntry;
  /**
   * The sidebar is icon-only: the label moves out of the layout and into a
   * tooltip, and stays in the accessibility tree as an `sr-only` name so the
   * link is still named (§3.4).
   */
  collapsed?: boolean;
  /** "More" sheet rows carry a one-line description (§5.2). */
  showDescription?: boolean;
  /** Unread count, as a pill when inline and a dot when stacked. */
  badge?: number;
  /**
   * `inline` is the sidebar and the More sheet — icon beside label. `stacked`
   * is the bottom tab bar, §5.2: icon above label, and the active marker
   * becomes the travelling `tab-indicator` rule instead of the trailing dot.
   */
  layout?: 'inline' | 'stacked';
  /** Closes the sheet the row lives in. */
  onNavigate?: () => void;
  className?: string;
}

const ICON_SIZE = 18;

/**
 * One row of navigation.
 *
 * Every nav surface — sidebar, bottom tab bar, More sheet — renders through
 * this, so a destination looks and behaves the same wherever it is reached from.
 *
 * Three things carry "you are here", not one (§3.4, "colour alone is never the
 * sole differentiator"): react-router puts `aria-current="page"` on the active
 * link, the row goes to `font-semibold`, and a marker appears — a trailing dot
 * inline, the travelling rule when stacked. A background tint alone would leave
 * the row unlabelled for a screen reader and hard to find at a glance.
 */
export const NavItem: React.FC<NavItemProps> = ({
  entry,
  collapsed = false,
  showDescription = false,
  badge = 0,
  layout = 'inline',
  onNavigate,
  className,
}) => {
  const shouldReduce = useReducedMotion();
  const Icon = entry.icon;
  const stacked = layout === 'stacked';
  const count = formatCount(badge);
  const pressProps = selectVariantsByName(shouldReduce, 'buttonPress');

  return (
    <NavLink
      to={entry.path}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(entry.path)}
      onFocus={() => prefetchRoute(entry.path)}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-11 rounded-lg font-ui text-label-lg',
          'transition-colors duration-quick',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          stacked ? 'flex-col items-center gap-1 px-1 py-1.5 text-center' : 'items-center gap-3 px-3 py-2.5',
          collapsed && 'justify-center px-0',
          showDescription && 'items-start',
          isActive
            ? 'bg-brand-soft font-semibold text-brand'
            : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
          // The bottom tab bar has no fill behind the active row: five tinted
          // blocks across a phone screen read as buttons, not as a tab bar.
          stacked && !isActive && 'bg-transparent',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative flex shrink-0 items-center justify-center">
            {stacked ? (
              <motion.span
                aria-hidden="true"
                {...pressProps}
                className="flex items-center justify-center"
              >
                <Icon
                  size={ICON_SIZE + 2}
                  strokeWidth={1.75}
                  className={cn(isActive ? 'text-brand' : 'text-ink-muted')}
                />
              </motion.span>
            ) : (
              <Icon
                size={ICON_SIZE}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                  'shrink-0 transition-colors duration-quick',
                  isActive ? 'text-brand' : 'text-ink-muted',
                )}
              />
            )}

            {/* Collapsed rail: a dot instead of the pill, with the count kept for
                the screen reader, because the label is already the link's name. */}
            {collapsed && count ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 size-2 rounded-full bg-brand ring-2 ring-surface"
                />
                <span className="sr-only">({count} unread)</span>
              </>
            ) : null}
          </span>

          <span className={cn(collapsed ? 'sr-only' : stacked ? 'w-full truncate' : 'min-w-0 flex-1 truncate')}>
            <span className={cn('block', showDescription && 'text-label-lg font-semibold text-ink')}>
              {entry.label}
            </span>
            {showDescription && entry.description ? (
              <span className="mt-0.5 block text-body-sm font-normal text-ink-muted">
                {entry.description}
              </span>
            ) : null}
          </span>

          {!stacked && !collapsed && isActive ? (
            <span
              aria-hidden="true"
              className={cn('size-1.5 shrink-0 rounded-full bg-brand', showDescription && 'mt-2')}
            />
          ) : null}

          {!stacked && !collapsed && count ? (
            <span
              className={cn(
                'shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-label-sm font-bold leading-tight text-on-brand',
                showDescription && 'mt-0.5',
              )}
            >
              {count}
            </span>
          ) : null}

          {/*
            §5.2's travelling indicator. One `layoutId` across every tab and the
            More button, so Framer moves the single element between positions
            instead of cross-fading two.
          */}
          {stacked ? (
            <AnimatePresence initial={false}>
              {isActive ? (
                <motion.span
                  key="tab-indicator"
                  layoutId="tab-indicator"
                  aria-hidden="true"
                  transition={transitionTabSpring}
                  className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-brand"
                />
              ) : null}
            </AnimatePresence>
          ) : null}

          {/*
            Collapsed rail tooltip. `aria-hidden` because the label is already
            the link's accessible name one element up — repeating it would make
            every collapsed item announce its label twice.
          */}
          {collapsed ? (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute left-full top-1/2 z-modal ml-2 -translate-y-1/2',
                'whitespace-nowrap rounded-md border border-edge bg-surface px-2 py-1',
                'text-label-sm text-ink opacity-0 shadow-raised',
                'transition-opacity duration-fast',
                'group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {entry.label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
};

export default NavItem;