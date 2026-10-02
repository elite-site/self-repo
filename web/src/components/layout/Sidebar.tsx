import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronsLeft } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  selectVariantsByName,
} from '../../lib/motion';
import { resolveMediaUrl } from '../../services/api';
import type { StudentSession } from '../../types';
import { NavItem, SIDEBAR_NAV } from '../navigation/NavItem';

/**
 * `localStorage` key for the collapsed rail.
 *
 * §5.1 names this `'sidebar-collapsed'`. It is namespaced to `elite-sidebar-`
 * here so it sits beside `elite-theme` rather than sharing the bare global
 * namespace, and so it cannot collide with the token key in `lib/theme.ts`.
 * That key is the *only* theme key; this one holds one boolean about the rail
 * and nothing else.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'elite-sidebar-collapsed';

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Private mode or a full quota: the rail still collapses for this session.
  }
}

/**
 * Collapsed state for the rail, read synchronously so the first paint is already
 * the right width. A rail that mounts 240px wide and then snaps to 64px is
 * exactly the layout shift §9.1 warns about.
 *
 * A hook in this file rather than a store: the rail and the spacer that keeps
 * the content clear of it are the only two consumers and both are rendered by
 * `AppLayout`, which owns the value. Nothing else has to know.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

  return [collapsed, toggle];
}

export interface SidebarProps {
  session: StudentSession | null;
  collapsed: boolean;
  onToggle: () => void;
  unreadCount?: number;
  className?: string;
}

/**
 * §5.1 — the desktop rail, `hidden md:flex` so it and the bottom tab bar are
 * never both interactive. `hidden` is what actually enforces that: it takes the
 * subtree out of the tab order and the accessibility tree, which is the part
 * that matters for a keyboard user on a narrow window.
 *
 * `fixed`, per §5.1 and §9.1. The content column is kept clear of it by a spacer
 * in `AppLayout` whose width carries the same CSS transition, so the two edges
 * move on one clock: `duration-moderate ease-gentle` there is
 * `MOTION_DURATIONS.moderate` / `MOTION_EASINGS.gentle`, the same pair
 * `sidebarTransition` hands to Framer Motion here.
 *
 * No `overflow-hidden` on the aside, unlike the plan's snippet. It would clip
 * the width animation — but it would also clip the collapsed-state tooltip
 * §5.1 asks for, and a tooltip that never appears is worse than a label that
 * truncates for one frame mid-collapse. The labels are `truncate` instead.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  session,
  collapsed,
  onToggle,
  unreadCount = 0,
  className,
}) => {
  const shouldReduce = useReducedMotion();

  return (
    <motion.aside
      aria-label="Primary"
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
      transition={selectVariantsByName(shouldReduce, 'sidebar')}
      className={cn(
        'fixed inset-y-0 left-0 z-sticky hidden select-none flex-col border-r border-edge bg-surface md:flex',
        className,
      )}
    >
      {/* §5.1: 56px brand row with a border under it, monogram only once collapsed. */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-edge px-6">
        <picture className="flex shrink-0 items-center">
          <source srcSet="/elite-logo.webp" type="image/webp" />
          <img
            src="/elite-logo.png"
            alt="ELITE"
            width={32}
            height={32}
            decoding="async"
            className="size-8 object-contain"
          />
        </picture>
        {!collapsed ? (
          <span className="min-w-0 truncate font-heading text-label-lg font-bold tracking-tight text-brand">
            ELITE
          </span>
        ) : null}
      </div>

      <nav
        id="sidebar-sections"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4"
        aria-label="Sections"
      >
        <ul className="space-y-1">
          {SIDEBAR_NAV.map((entry) => (
            <li key={entry.path}>
              <NavItem
                entry={entry}
                collapsed={collapsed}
                badge={entry.path === '/notifications' ? unreadCount : 0}
              />
            </li>
          ))}
        </ul>
      </nav>

      <SidebarFooter collapsed={collapsed} onToggle={onToggle} session={session} />
    </motion.aside>
  );
};

interface SidebarFooterProps {
  collapsed: boolean;
  onToggle: () => void;
  session: StudentSession | null;
}

/** §5.1: identity block at 56px, then the collapse toggle. */
const SidebarFooter: React.FC<SidebarFooterProps> = ({ collapsed, onToggle, session }) => {
  const shouldReduce = useReducedMotion();
  const student = session?.student;
  const name = student?.name ?? 'Student';
  const rollNo = student?.rollNo ?? '';
  const photo = student?.photoUrl ? resolveMediaUrl(student.photoUrl) : undefined;

  return (
    <div className="shrink-0 border-t border-edge">
      <div
        className={cn(
          'flex h-14 items-center gap-3 px-6',
          collapsed && 'justify-center px-0',
        )}
      >
        <Avatar name={name} src={photo} size="sm" />
        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md font-semibold text-ink">{name}</p>
            <p className="truncate font-mono text-label-sm text-ink-muted">{rollNo}</p>
          </div>
        )}
      </div>

      <div className={cn('flex items-center px-3 pb-3', collapsed && 'justify-center px-0')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="sidebar-sections"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted',
            'transition-colors duration-quick hover:bg-surface-sunken hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          )}
        >
          {/* §5.1: the chevron rotates 180° as the rail collapses. */}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={selectVariantsByName(shouldReduce, 'sidebar')}
          >
            <ChevronsLeft size={18} strokeWidth={1.75} />
          </motion.span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;