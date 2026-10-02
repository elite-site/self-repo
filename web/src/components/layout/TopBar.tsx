import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Search, Sparkles, User, X } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import { selectVariants, selectVariantsByName, transitionQuick, transitionReduced } from '../../lib/motion';
import { formatCount } from '../navigation/NavItem';
import { ThemeToggle } from '../navigation/ThemeToggle';
import { resolveMediaUrl } from '../../services/api';
import type { StudentSession } from '../../types';

export interface TopBarProps {
  session: StudentSession | null;
  unreadCount?: number;
  onLogout: () => void;
  /** Opens the command palette (§5.4: the search field and the mobile icon are both triggers). */
  onOpenPalette: () => void;
}

/** §5.3: the bar slides the field in from the right and the mark out to the left. */
const SLIDE_IN_VARIANTS = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};
/** Reduced motion keeps the crossfade and drops the travel. */
const REDUCED_SLIDE_IN_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * §5.3 — the top bar.
 *
 * `sticky` rather than `fixed`, and that is the one deliberate difference from
 * the plan's snippet. A fixed element is positioned against the viewport, so it
 * would have to be handed the rail's animated inset separately and would drift
 * half a frame out of step with it while the rail collapses. Sitting in normal
 * flow inside the content column — which is already offset by the rail's spacer
 * — it sticks to the top of the viewport with no second animation and no second
 * source of truth for where the rail ends. §9.1's concern is that navigation
 * must not shift the document; a sticky element in flow does not.
 *
 * Desktop (§5.3): search field, then theme, bell, avatar.
 * Mobile (§5.3): the ELITE mark, or the search field once the icon is tapped,
 * then theme and bell.
 */
export const TopBar: React.FC<TopBarProps> = ({
  session,
  unreadCount = 0,
  onLogout,
  onOpenPalette,
}) => {
  const shouldReduce = useReducedMotion();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const iconPress = selectVariantsByName(shouldReduce, 'iconButton');
  const slideVariants = selectVariants(
    shouldReduce,
    SLIDE_IN_VARIANTS,
    REDUCED_SLIDE_IN_VARIANTS,
  );
  const slideTransition = selectVariants(shouldReduce, transitionQuick, transitionReduced);

  const student = session?.student;
  const name = student?.name ?? 'Student';
  const rollNo = student?.rollNo ?? '';
  const photo = student?.photoUrl ? resolveMediaUrl(student.photoUrl) : undefined;
  const count = formatCount(unreadCount);

  return (
    <header className="sticky top-0 z-sticky border-b border-edge bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-canvas items-center gap-2 px-4 sm:px-6">
        {/* ── Mobile: the mark, or the field once the search icon is tapped ── */}
        <div className="flex min-w-0 flex-1 items-center md:hidden">
          <AnimatePresence mode="wait" initial={false}>
            {mobileSearchOpen ? (
              <motion.div
                key="search"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={slideVariants}
                transition={slideTransition}
                className="flex min-w-0 flex-1 items-center gap-1"
              >
                <SearchField onOpen={onOpenPalette} />
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  aria-label="Hide search"
                  title="Hide search"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-quick hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="brand"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={slideVariants}
                transition={slideTransition}
                className="min-w-0"
              >
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <picture className="flex shrink-0 items-center">
                    <source srcSet="/elite-logo.webp" type="image/webp" />
                    <img
                      src="/elite-logo.png"
                      alt="ELITE"
                      width={28}
                      height={28}
                      decoding="async"
                      className="size-7 object-contain"
                    />
                  </picture>
                  <span className="truncate font-heading text-label-lg font-bold tracking-tight text-brand">
                    ELITE
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Desktop: the persistent search field, §5.3 ── */}
        <div className="hidden min-w-0 flex-1 md:flex md:max-w-xl">
          <SearchField onOpen={onOpenPalette} />
        </div>

        {/* ── Right cluster ── */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!mobileSearchOpen ? (
            <motion.button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
              title="Search"
              {...iconPress}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors duration-quick hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface md:hidden"
            >
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
            </motion.button>
          ) : null}

          <ThemeToggle />

          <motion.button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
            title="Notifications"
            {...iconPress}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors duration-quick hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
            {count ? (
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 rounded-full bg-brand px-1 text-label-sm font-bold leading-tight text-on-brand"
              >
                {count}
              </span>
            ) : null}
          </motion.button>

          <AccountMenu
            name={name}
            rollNo={rollNo}
            photo={photo}
            detail={
              student ? `Year ${student.year} · Section ${student.section} · ${student.branch}` : ''
            }
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
};

/**
 * §5.3's search bar: a field-shaped control with a magnifier and the ⌘K badge.
 *
 * A button rather than an `<input>`, on purpose. The palette owns the only real
 * input, so this one can never hold a half-typed query of its own and there is
 * nothing to reconcile when the palette closes. §5.4 lists three triggers for the
 * palette — ⌘K, this control, and the mobile search icon — and all three end up
 * in the same place.
 */
const SearchField: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label="Search the portal"
    aria-keyshortcuts="Meta+K Control+K"
    className={cn(
      'flex h-9 w-full items-center gap-2 rounded-lg border border-edge bg-surface-sunken px-3',
      'text-left transition-colors duration-quick hover:bg-surface-inset',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    )}
  >
    <Search size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden="true" />
    <span className="flex-1 truncate text-label-lg font-normal text-ink-muted">Search anything…</span>
    <span
      aria-hidden="true"
      className="shrink-0 rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-label-sm text-ink-muted"
    >
      ⌘K
    </span>
  </button>
);

interface AccountMenuProps {
  name: string;
  rollNo: string;
  photo?: string;
  detail: string;
  onLogout: () => void;
}

/** §5.3: a 32px avatar opening a small menu of Profile, Edit profile and Sign out. */
const AccountMenu: React.FC<AccountMenuProps> = ({ name, rollNo, photo, detail, onLogout }) => {
  const itemClass =
    'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 font-ui text-label-lg text-ink-secondary outline-none transition-colors duration-quick data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className="ml-1 flex items-center gap-2 rounded-md p-1 transition-colors duration-quick hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Avatar name={name} src={photo} size="sm" />
          <span className="hidden max-w-32 truncate text-label-md font-semibold text-ink lg:inline">
            {name}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className="hidden text-ink-muted lg:inline"
            aria-hidden="true"
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-modal min-w-56 rounded-lg border border-edge bg-surface p-1 shadow-modal"
        >
          <DropdownMenu.Label className="px-3 py-2">
            <span className="block truncate text-label-md font-semibold text-ink">{name}</span>
            <span className="block truncate font-mono text-label-sm text-ink-muted">{rollNo}</span>
            {detail ? (
              <span className="mt-0.5 block text-label-sm font-normal text-ink-muted">
                {detail}
              </span>
            ) : null}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-1 h-px bg-edge" />

          <DropdownMenu.Item asChild>
            <Link to="/profile" className={itemClass}>
              <User size={16} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
              <span>View Profile</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link to="/profile/edit" className={itemClass}>
              <Sparkles size={16} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
              <span>Edit Profile &amp; Links</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-edge" />

          <DropdownMenu.Item asChild>
            <button
              type="button"
              onClick={onLogout}
              className={cn(
                itemClass,
                'font-semibold text-status-rejected data-[highlighted]:bg-status-bg-rejected data-[highlighted]:text-status-rejected',
              )}
            >
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};