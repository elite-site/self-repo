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
    <header className="w-full bg-white dark:bg-[#0B0E14] border-b border-[#E4E7F2] dark:border-neutral-800 py-3 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors">
      {/* LEFT: MOBILE SIDEBAR TRIGGER + DATE TIME BADGE */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg bg-neutral-100 dark:bg-[#151A22] hover:bg-neutral-200 dark:hover:bg-[#252B35] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu strokeWidth={1.75} className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg text-xs font-mono text-[#475569] dark:text-neutral-300">
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F8FC] dark:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] hover:bg-neutral-100 dark:hover:bg-[#252B35] text-[#0F172A] dark:text-[#F3F5F7] transition-colors cursor-pointer text-xs font-medium"
            title="Switch Theme"
          >
            {getThemeIcon(theme)}
            <span className="capitalize hidden md:inline">{theme}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'text-[#475569] dark:text-[#F3F5F7] hover:bg-[#F7F8FC] dark:hover:bg-[#0D1117]'
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
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'text-[#475569] dark:text-[#F3F5F7] hover:bg-[#F7F8FC] dark:hover:bg-[#0D1117]'
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
                className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'text-[#475569] dark:text-[#F3F5F7] hover:bg-[#F7F8FC] dark:hover:bg-[#0D1117]'
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
            className="relative p-2 rounded-lg text-[#475569] dark:text-neutral-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] transition-colors cursor-pointer"
            title="System Alerts & Notifications"
          >
            <Bell strokeWidth={1.75} className="w-5 h-5" />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#E11D48] rounded-full ring-2 ring-white dark:ring-[#0B0E14] animate-pulse" />
            )}
          </button>

          {/* Admin Notifications Dropdown */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-[#E4E7F2] dark:border-[#252B35] flex items-center justify-between bg-[#F7F8FC] dark:bg-[#0D1117]">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-bold text-[#0F172A] dark:text-[#F3F5F7] uppercase tracking-wider">
                    Admin Alerts
                  </span>
                  {pendingModeration > 0 && (
                    <span className="text-[10px] font-bold bg-[#FFE4E6] dark:bg-rose-950/40 text-[#E11D48] px-2 py-0.5 rounded-full">
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
        <div className="relative pl-2 sm:pl-3 border-l border-[#E4E7F2] dark:border-[#252B35]" ref={accountRef}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#F7F8FC] dark:hover:bg-[#151A22] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/50 border border-[#E0E7FF] dark:border-indigo-900/60 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] shrink-0">
              <User strokeWidth={1.75} className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="font-heading text-xs font-bold text-[#0F172A] dark:text-[#F3F5F7] truncate max-w-[130px]">
                {user?.username || (user?.email ? user.email.split('@')[0] : 'Admin User')}
              </div>
              <div className="text-[10px] text-[#94A3B8] font-medium">Super Admin</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block" />
          </button>

          {/* Account Menu Dropdown */}
          {accountDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg shadow-xl z-50 py-2 text-left animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-[#E4E7F2] dark:border-[#252B35]">
                <div className="font-heading text-xs font-bold text-[#0F172A] dark:text-[#F3F5F7] truncate">
                  {user?.username || 'Admin User'}
                </div>
                <div className="text-[10px] text-[#94A3B8] truncate">
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
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#F3F5F7] hover:bg-[#EEF2FF] hover:text-[#4F46E5] dark:hover:bg-[#0D1117] transition-colors cursor-pointer"
                    >
                      <ShieldCheck strokeWidth={1.75} className="w-4 h-4 text-[#E11D48]" />
                      <span>Moderation Queue</span>
                    </button>
                    <button
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        onNavigateTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#F3F5F7] hover:bg-[#EEF2FF] hover:text-[#4F46E5] dark:hover:bg-[#0D1117] transition-colors cursor-pointer"
                    >
                      <Settings strokeWidth={1.75} className="w-4 h-4 text-[#94A3B8]" />
                      <span>System Settings</span>
                    </button>
                  </>
                )}
              </div>

              {onLogout && (
                <div className="border-t border-[#E4E7F2] dark:border-[#252B35] pt-1">
                  <button
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut strokeWidth={1.75} className="w-4 h-4" />
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
