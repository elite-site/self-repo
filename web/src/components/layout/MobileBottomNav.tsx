import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Calendar,
  Bell,
  Menu,
  X,
  Video,
  FileText,
  ClipboardList,
  Users,
  Vote,
  Globe,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const primaryNavItems = [
  { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Inbox', path: '/notifications', icon: Bell },
];

const secondaryNavItems = [
  { name: 'Introduction Video', path: '/intro-video', icon: Video, desc: 'Record & review introduction' },
  { name: 'Professional Resume', path: '/resume', icon: FileText, desc: 'Preview & upload resume PDF' },
  { name: 'My Registrations', path: '/registrations', icon: ClipboardList, desc: 'Active event participation' },
  { name: 'Teams & Hackathons', path: '/teams', icon: Users, desc: 'Form & manage competition teams' },
  { name: 'Student Democracy & Voting', path: '/voting', icon: Vote, desc: 'Cast votes in active campaigns' },
  { name: 'Public Directory', path: '/students', icon: Globe, desc: 'Search all verified students' },
];

interface MobileBottomNavProps {
  onLogout?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onLogout }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes the sheet, focus lands inside it on open and returns to the
  // button that opened it on close, and the page behind stops scrolling. Without
  // the lock a swipe on the sheet scrolled the dashboard underneath it.
  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [sheetOpen]);

  return (
    <>
      {/* 1. FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Primary"
        className="safe-area-pb fixed bottom-0 left-0 right-0 z-sticky border-t border-edge bg-surface px-1 py-1 shadow-drawer md:hidden"
      >
        <div className="flex items-center justify-around">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSheetOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-3 py-2 text-label-sm transition-colors ${
                  isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={1.75}
                    className={`mb-0.5 ${isActive ? 'text-brand' : 'text-ink-muted'}`}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* MORE / SECONDARY MENU BUTTON */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            className={`flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center rounded-lg px-3 py-2 text-label-sm transition-colors ${
              sheetOpen ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Menu
              size={20}
              strokeWidth={1.75}
              className={`mb-0.5 ${sheetOpen ? 'text-brand' : 'text-ink-muted'}`}
              aria-hidden="true"
            />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* 2. SECONDARY ITEMS MOBILE BOTTOM SHEET */}
      {sheetOpen && (
        <div className="fixed inset-0 z-modal flex flex-col justify-end md:hidden">
          {/* Backdrop. Reads the theme's scrim token: the old `bg-on-primary/50`
              was white at 50% in both themes, which blanked the page behind. */}
          <div
            className="fixed inset-0 bg-scrim"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-heading"
            className="relative max-h-[85dvh] space-y-4 overflow-y-auto rounded-t-xl border-t border-edge bg-surface p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] shadow-drawer animate-slide-in-up focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <h2
                id="mobile-more-heading"
                className="font-heading text-headline-sm uppercase tracking-wider text-ink"
              >
                More
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                aria-label="Close menu"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <ul className="space-y-1.5">
              {secondaryNavItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setSheetOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                        isActive
                          ? 'border border-brand-soft bg-brand-soft font-semibold text-brand'
                          : 'font-semibold text-ink hover:bg-surface-sunken'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-surface">
                        <item.icon
                          size={16}
                          strokeWidth={1.75}
                          className="text-brand"
                          aria-hidden="true"
                        />
                      </span>
                      <span>
                        <span className="block text-label-lg text-ink">{item.name}</span>
                        <span className="block text-body-sm font-normal text-ink-muted">
                          {item.desc}
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-ink-muted"
                      aria-hidden="true"
                    />
                  </NavLink>
                </li>
              ))}
            </ul>

            {onLogout && (
              <div className="border-t border-edge pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    onLogout();
                  }}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-label-lg font-semibold text-brand transition-colors hover:bg-brand-soft/80"
                >
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
