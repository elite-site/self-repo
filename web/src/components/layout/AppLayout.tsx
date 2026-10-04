import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SkeletonPage } from '../ui/Skeleton';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { api, isNotificationPollingPaused } from '../../services/api';
import type { StudentSession } from '../../types';
import { CommandPalette, recordRecentRoute } from '../navigation/CommandPalette';
import { BottomTabBar } from './BottomTabBar';
import { PageTransition } from './PageTransition';
import { Sidebar, useSidebarCollapsed } from './Sidebar';
import { TopBar } from './TopBar';

export interface AppLayoutProps {
  session: StudentSession | null;
  onLogout: () => void;
  /**
   * Patches the app-level session so a change made inside a portal page (an
   * uploaded profile photo, for example) is reflected immediately in the shell
   * avatars instead of only after the next login.
   */
  onPhotoChange?: (photoUrl: string | null) => void;
}

/** Context exposed to every page rendered inside the portal `<Outlet />`. */
export interface StudentOutletContext {
  onPhotoChange?: (photoUrl: string | null) => void;
}

/** The rail's two widths, as Tailwind spacing steps, for the content spacer. */
const SPACER_EXPANDED = 'w-60'; // 240px — SIDEBAR_EXPANDED_WIDTH
const SPACER_COLLAPSED = 'w-16'; // 64px — SIDEBAR_COLLAPSED_WIDTH

/**
 * The authenticated portal shell (REDESIGN_PLAN §5): fixed rail on desktop, fixed
 * tab bar below `md`, sticky top bar, page transitions, and the command palette.
 *
 * The rail is `fixed`, so the content column is pushed clear of it by a spacer
 * that is a flex sibling of the column rather than by padding on it. The spacer's
 * width carries `transition-[width] duration-moderate ease-gentle` — the same
 * `MOTION_DURATIONS.moderate` / `MOTION_EASINGS.gentle` pair Framer Motion gets
 * from `sidebarTransition` — so the rail's edge and the content's edge move on
 * one clock and the page never squeezes. The spacer is `hidden` below `md`, where
 * the rail is too, so it contributes nothing and animates nothing.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ session, onLogout, onPhotoChange }) => {
  const { pathname } = useLocation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const unreadCount = useUnreadCount(pathname);
  const palette = useCommandPalette({ onOpenChange: lockBodyScroll });

  // §5.4's "Recent" group: a note of every page visit, written from the one
  // place that already sees every route change.
  useEffect(() => {
    recordRecentRoute(pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] bg-surface-canvas">
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-skip-link focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-ui focus:text-label-lg focus:font-semibold focus:text-brand focus:shadow-modal"
      >
        Skip to content
      </a>

      <Sidebar
        session={session}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        unreadCount={unreadCount}
      />

      {/* Mirrors the fixed rail so the content column never sits under it. */}
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-moderate ease-gentle md:block ${
          collapsed ? SPACER_COLLAPSED : SPACER_EXPANDED
        }`}
      />

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <TopBar
          session={session}
          unreadCount={unreadCount}
          onLogout={onLogout}
          onOpenPalette={palette.openPalette}
        />

        <main id="portal-main" className="flex-1 px-4 pb-24 sm:px-6 md:px-8 md:pb-12">
          <div className="mx-auto w-full max-w-canvas">
            {/*
              This boundary is deliberately inside the shell: the nearest one
              wins, so the rail, tab bar and top bar stay put and only the content
              area swaps to a placeholder. Falling through to the app-level
              boundary would blank the whole viewport on every click.
            */}
            <Suspense fallback={<SkeletonPage label="Loading page" />}>
              <PageTransition>
                <Outlet context={{ onPhotoChange } satisfies StudentOutletContext} />
              </PageTransition>
            </Suspense>
          </div>
        </main>
      </div>

      <BottomTabBar unreadCount={unreadCount} onLogout={onLogout} />
      <CommandPalette palette={palette} onLogout={onLogout} />
    </div>
  );
};

/**
 * §9.1: "avoid synchronous localStorage reads in render". The palette's overlay
 * wants the page behind it locked the moment it opens, and the hook's
 * `onOpenChange` fires before React has committed anything, so the lock has to
 * live here rather than in an effect that runs afterwards. The previous inline
 * value is captured before the lock and put back on release, and `Modal`'s own
 * Radix lock counts its instances, so the two stack instead of fighting.
 */
let previousBodyOverflow = '';

function lockBodyScroll(open: boolean): void {
  if (typeof document === 'undefined') return;

  if (open) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return;
  }

  document.body.style.overflow = previousBodyOverflow;
}

/**
 * The unread count behind the rail's badge, the tab bar's "More" dot and the top
 * bar's bell. §5.1/§5.2/§5.3 all want the same number, so it is fetched once
 * here and passed down.
 *
 * Deliberately a plain effect rather than a query: Batch 5 owns the data layer
 * and this hook is the one place to replace when `QueryClientProvider` lands.
 */
function useUnreadCount(pathname: string): number {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    if (isNotificationPollingPaused()) return;
    api
      .getNotifications({ limit: 10, isBackgroundPoll: true })
      .then((data: unknown) => {
        const summary = data as { unreadCount?: number } | null;
        setUnreadCount(typeof summary?.unreadCount === 'number' ? summary.unreadCount : 0);
      })
      .catch(() => {
        // A failed notification poll must not take the shell down with it; the
        // badge simply stays where it was.
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  return unreadCount;
}

export default AppLayout;