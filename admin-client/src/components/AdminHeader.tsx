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
import { AdminTab } from './Sidebar';

interface AdminHeaderProps {
  user?: AdminUser | null;
  onToggleMobileSidebar?: () => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  onToggleMobileSidebar,
  onLogout,
  onNavigateTab,
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
    if (m === 'dark') return <Moon className="w-4 h-4 text-purple-400" />;
    if (m === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Monitor className="w-4 h-4 text-blue-500" />;
  };

  const pendingModeration = portalStats?.portal?.pendingModeration || 0;
  const hasAlerts = pendingModeration > 0;

  return (
    <header className="w-full bg-white dark:bg-[#0B0E14] border-b border-neutral-200 dark:border-[#252B35] py-3 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      {/* LEFT: MOBILE SIDEBAR TRIGGER + DATE TIME BADGE */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl bg-neutral-100 dark:bg-[#151A22] hover:bg-neutral-200 dark:hover:bg-[#252B35] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-50 dark:bg-[#0D1117] border border-neutral-200 dark:border-[#252B35] rounded-xl text-xs font-mono text-neutral-600 dark:text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{timeString || 'May 23, 2026 2:01:07 PM'}</span>
        </div>
      </div>

      {/* RIGHT: THEME TOGGLE, NOTIFICATIONS & USER PROFILE BADGE */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* 1. Theme Selector Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-neutral-100 dark:bg-[#151A22] hover:bg-neutral-200 dark:hover:bg-[#252B35] text-neutral-700 dark:text-[#F3F5F7] transition-colors cursor-pointer text-xs font-semibold"
            title="Switch Theme"
          >
            {getThemeIcon(theme)}
            <span className="capitalize hidden md:inline">{theme}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#151A22] border border-neutral-200 dark:border-[#252B35] rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-red-50 dark:bg-red-950/40 text-[#DC2626]'
                    : 'text-neutral-700 dark:text-[#F3F5F7] hover:bg-neutral-100 dark:hover:bg-[#0D1117]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-red-50 dark:bg-red-950/40 text-[#DC2626]'
                    : 'text-neutral-700 dark:text-[#F3F5F7] hover:bg-neutral-100 dark:hover:bg-[#0D1117]'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-red-50 dark:bg-red-950/40 text-[#DC2626]'
                    : 'text-neutral-700 dark:text-[#F3F5F7] hover:bg-neutral-100 dark:hover:bg-[#0D1117]'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-500" />
                <span>System</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Interactive Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#151A22] transition-colors cursor-pointer"
            title="System Alerts & Notifications"
          >
            <Bell className="w-5 h-5" />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#DC2626] rounded-full ring-2 ring-white dark:ring-[#0B0E14] animate-pulse" />
            )}
          </button>

          {/* Admin Notifications Dropdown */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#151A22] border border-neutral-200 dark:border-[#252B35] rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-[#252B35] flex items-center justify-between bg-neutral-50/70 dark:bg-[#0D1117]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-neutral-900 dark:text-[#F3F5F7] uppercase tracking-wider">
                    Admin Alerts
                  </span>
                  {pendingModeration > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/40 text-[#DC2626] px-2 py-0.5 rounded-full">
                      {pendingModeration} pending
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifDropdownOpen(false)}
                  className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#252B35]">
                {pendingModeration > 0 ? (
                  <div
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      if (onNavigateTab) onNavigateTab('moderation');
                    }}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-[#0D1117] transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-[#F3F5F7]">
                        Moderation Queue Required
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-[#9BA3AF] mt-0.5 leading-snug">
                        {pendingModeration} student submission{pendingModeration > 1 ? 's' : ''} awaiting review. Click to process.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-[#F3F5F7]">
                      System Operational
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-[#9BA3AF] mt-0.5 leading-snug">
                      Database pool, Google Drive OAuth, and background queues running normally.
                    </p>
                  </div>
                </div>

                {pendingModeration === 0 && (
                  <div className="py-6 px-4 text-center">
                    <Inbox className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <div className="text-xs font-bold text-neutral-800 dark:text-[#F3F5F7]">You're all caught up.</div>
                    <div className="text-[11px] text-neutral-400 dark:text-[#6F7785] mt-0.5">
                      No pending moderation requests at this time.
                    </div>
                  </div>
                )}
              </div>

              {onNavigateTab && (
                <div className="p-2.5 border-t border-neutral-100 dark:border-[#252B35] bg-neutral-50 dark:bg-[#0D1117] text-center">
                  <button
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      onNavigateTab('moderation');
                    }}
                    className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Open Moderation Workspace →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. User Profile Dropdown Pill */}
        <div className="relative pl-2 sm:pl-3 border-l border-neutral-200 dark:border-[#252B35]" ref={accountRef}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#151A22] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-[#DC2626] shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-bold text-neutral-900 dark:text-[#F3F5F7] truncate max-w-[130px]">
                {user?.username || (user?.email ? user.email.split('@')[0] : 'Admin User')}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#9BA3AF] font-medium">Super Admin</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
          </button>

          {/* Account Menu Dropdown */}
          {accountDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151A22] border border-neutral-200 dark:border-[#252B35] rounded-2xl shadow-2xl z-50 py-2 text-left animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-neutral-100 dark:border-[#252B35]">
                <div className="text-xs font-bold text-neutral-900 dark:text-[#F3F5F7] truncate">
                  {user?.username || 'Admin User'}
                </div>
                <div className="text-[10px] text-neutral-400 dark:text-[#6F7785] truncate">
                  {user?.email || 'admin@sasi.ac.in'}
                </div>
              </div>

              <div className="py-1">
                {onNavigateTab && (
                  <>
                    <button
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        onNavigateTab('moderation');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-[#F3F5F7] hover:bg-neutral-100 dark:hover:bg-[#0D1117] transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#DC2626]" />
                      <span>Moderation Queue</span>
                    </button>
                    <button
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        onNavigateTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-[#F3F5F7] hover:bg-neutral-100 dark:hover:bg-[#0D1117] transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      <span>System Settings</span>
                    </button>
                  </>
                )}
              </div>

              {onLogout && (
                <div className="border-t border-neutral-100 dark:border-[#252B35] pt-1">
                  <button
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
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
