import React, { useState, useEffect } from 'react';
import { Bell, User, Menu, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { AdminUser } from '../types';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface AdminHeaderProps {
  user?: AdminUser | null;
  onToggleMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  onToggleMobileSidebar,
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();

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

  const getThemeIcon = (m: ThemeMode) => {
    if (m === 'dark') return <Moon className="w-4 h-4 text-purple-400" />;
    if (m === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Monitor className="w-4 h-4 text-blue-500" />;
  };

  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-3 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors">
      {/* LEFT: MOBILE SIDEBAR TRIGGER + DATE TIME BADGE */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg text-xs font-mono text-neutral-600 dark:text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{timeString || 'May 23, 2026 2:01:07 PM'}</span>
        </div>
      </div>

      {/* RIGHT: THEME TOGGLE, NOTIFICATIONS & USER PROFILE BADGE */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Theme Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer text-xs font-semibold"
            title="Switch Theme"
          >
            {getThemeIcon(theme)}
            <span className="capitalize hidden md:inline">{theme}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-red-50 dark:bg-red-950/40 text-elite-red'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-red-50 dark:bg-red-950/40 text-elite-red'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-red-50 dark:bg-red-950/40 text-elite-red'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-500" />
                <span>System</span>
              </button>
            </div>
          )}
        </div>

        {/* Bell Notification Icon */}
        <button
          className="relative p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-elite-red rounded-full ring-2 ring-white dark:ring-neutral-900" />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-200 dark:border-neutral-800">
          <div className="w-8 h-8 rounded-full bg-elite-red/10 border border-elite-red/30 flex items-center justify-center text-elite-red shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[130px]">
              {user?.email ? user.email.split('@')[0] : 'Admin User'}
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
};
