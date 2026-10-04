import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  User,
  Menu,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  ShieldCheck,
  Settings,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { AdminUser, AdminStats } from '../types';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { adminApi } from '../services/api';

interface AdminHeaderProps {
  user?: AdminUser | null;
  onToggleMobileSidebar?: () => void;
  onLogout?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  onToggleMobileSidebar,
  onLogout,
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [portalStats, setPortalStats] = useState<AdminStats | null>(null);

  const { theme, setTheme } = useTheme();

  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch quick stats for notification badge
  useEffect(() => {
    adminApi
      .getStats()
      .then((data) => setPortalStats(data))
      .catch(() => {});
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeDropdownOpen(false);
        setNotifDropdownOpen(false);
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getThemeIcon = (m: ThemeMode) => {
    if (m === 'dark') return <Moon className="w-4 h-4 text-brand" />;
    if (m === 'light') return <Sun className="w-4 h-4 text-brand" />;
    return <Monitor className="w-4 h-4 text-brand" />;
  };

  const pendingModeration = portalStats?.portal?.pendingModeration || 0;
  const hasAlerts = pendingModeration > 0;

  return (
    <header className="w-full bg-surface border-b border-edge py-3 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-sticky shadow-card transition-colors">
      {/* LEFT: MOBILE SIDEBAR TRIGGER + DATE TIME BADGE */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg bg-surface-sunken hover:bg-surface-inset text-ink-secondary transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu strokeWidth={1.75} className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-sunken border border-edge rounded-lg text-xs font-mono text-ink-muted">
          <span className="w-2 h-2 rounded-full bg-status-approved" aria-hidden="true" />
          <span>{timeString || 'May 23, 2026 2:01:07 PM'}</span>
        </div>
      </div>

      {/* RIGHT: THEME TOGGLE, NOTIFICATIONS & USER PROFILE BADGE */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* 1. Theme Selector Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-sunken border border-edge hover:bg-surface-inset text-ink transition-colors cursor-pointer text-xs font-medium"
            title="Switch Theme"
            aria-expanded={themeDropdownOpen}
            aria-haspopup="menu"
            aria-label="Theme selector"
          >
            {getThemeIcon(theme)}
            <span className="capitalize hidden md:inline">{theme}</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
          </button>

          {themeDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-36 bg-surface border border-edge rounded-lg shadow-raised z-overlay py-1.5 overflow-hidden animate-scale-in"
              role="menu"
            >
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeDropdownOpen(false);
                }}
                role="menuitem"
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-brand-soft text-brand-soft-text'
                    : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
                }`}
              >
                <Sun className="w-4 h-4 text-brand" aria-hidden="true" />
                <span>Light</span>
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeDropdownOpen(false);
                }}
                role="menuitem"
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-brand-soft text-brand-soft-text'
                    : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
                }`}
              >
                <Moon className="w-4 h-4 text-brand" aria-hidden="true" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeDropdownOpen(false);
                }}
                role="menuitem"
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-brand-soft text-brand-soft-text'
                    : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
                }`}
              >
                <Monitor className="w-4 h-4 text-brand" aria-hidden="true" />
                <span>System</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Interactive Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
            title="System Alerts & Notifications"
            aria-expanded={notifDropdownOpen}
            aria-haspopup="menu"
            aria-label="Notifications"
          >
            <Bell strokeWidth={1.75} className="w-5 h-5" aria-hidden="true" />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand rounded-full ring-2 ring-surface" aria-label={`${pendingModeration} pending moderation items`} />
            )}
          </button>

          {/* Admin Notifications Dropdown */}
          {notifDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-edge rounded-lg shadow-raised z-overlay overflow-hidden text-left animate-scale-in"
              role="menu"
            >
              <div className="px-4 py-3 border-b border-edge flex items-center justify-between bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-semibold text-ink">
                    Admin alerts
                  </span>
                  {pendingModeration > 0 && (
                    <span className="text-xs font-semibold bg-brand-soft text-brand-soft-text px-2 py-0.5 rounded-full">
                      {pendingModeration} pending
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifDropdownOpen(false)}
                  className="text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-edge">
                {pendingModeration > 0 ? (
                  <div
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      window.location.href = '/admin/moderation';
                    }}
                    className="p-4 hover:bg-surface-sunken transition-colors cursor-pointer flex items-start gap-3"
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && window.location.assign('/admin/moderation')}
                  >
                    <div className="p-2 rounded-xl bg-status-bg-pending text-status-pending shrink-0">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        Moderation Queue Required
                      </h4>
                      <p className="text-xs text-ink-muted mt-0.5 leading-snug">
                        {pendingModeration} student submission{pendingModeration > 1 ? 's' : ''} awaiting review. Click to process.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-status-bg-approved text-status-approved shrink-0">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">
                      System Operational
                    </h4>
                    <p className="text-xs text-ink-muted mt-0.5 leading-snug">
                      Database pool, Google Drive OAuth, and background queues running normally.
                    </p>
                  </div>
                </div>

                {pendingModeration === 0 && (
                  <div className="py-6 px-4 text-center">
                    <Inbox className="w-8 h-8 text-ink-muted mx-auto mb-2" aria-hidden="true" />
                    <div className="text-xs font-bold text-ink">You're all caught up.</div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      No pending moderation requests at this time.
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2.5 border-t border-edge bg-surface-sunken text-center">
                <button
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    window.location.href = '/admin/moderation';
                  }}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  Open Moderation Workspace →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. User Profile Dropdown Pill */}
        <div className="relative pl-2 sm:pl-3 border-l border-edge" ref={accountRef}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
            aria-expanded={accountDropdownOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-soft border border-brand flex items-center justify-center text-brand shrink-0">
              <User strokeWidth={1.75} className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="font-heading text-xs font-bold text-ink truncate max-w-[130px]">
                {user?.username || (user?.email ? user.email.split('@')[0] : 'Admin User')}
              </div>
              <div className="text-xs text-ink-muted font-medium">Super Admin</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted hidden sm:block" aria-hidden="true" />
          </button>

          {/* Account Menu Dropdown */}
          {accountDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-surface border border-edge rounded-lg shadow-raised z-overlay py-2 text-left animate-scale-in"
              role="menu"
            >
              <div className="px-4 py-2 border-b border-edge">
                <div className="font-heading text-xs font-bold text-ink truncate">
                  {user?.username || 'Admin User'}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {user?.email || 'admin@sasi.ac.in'}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    window.location.href = '/admin/moderation';
                  }}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer"
                >
                  <ShieldCheck strokeWidth={1.75} className="w-4 h-4 text-brand" aria-hidden="true" />
                  <span>Moderation Queue</span>
                </button>
                <button
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    window.location.href = '/admin/settings';
                  }}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer"
                >
                  <Settings strokeWidth={1.75} className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                  <span>System Settings</span>
                </button>
              </div>

              {onLogout && (
                <div className="border-t border-edge pt-1">
                  <button
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onLogout();
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer"
                  >
                    <LogOut strokeWidth={1.75} className="w-4 h-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
