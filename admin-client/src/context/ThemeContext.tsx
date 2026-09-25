import React, { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser } from '../types';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
  setAdminUser: (user: AdminUser | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getStorageKey = (user?: AdminUser | null) => {
  if (user?.userId) return `elite_admin_theme_${user.userId}`;
  if (user?.username) return `elite_admin_theme_${user.username}`;
  return 'elite_admin_theme_default';
};

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('elite_admin_theme_default') as ThemeMode;
    return saved && (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  // Restore user-specific preference when admin changes or logs in
  useEffect(() => {
    if (adminUser) {
      const userKey = getStorageKey(adminUser);
      const saved = localStorage.getItem(userKey) as ThemeMode;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeState(saved);
      }
    }
  }, [adminUser?.userId, adminUser?.username]);

  // Compute isDark and apply to document root and scoped container
  useEffect(() => {
    let dark = false;
    if (theme === 'dark') {
      dark = true;
    } else if (theme === 'light') {
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setIsDark(dark);

    if (dark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }

    // Save to user-specific storage
    const userKey = getStorageKey(adminUser);
    localStorage.setItem(userKey, theme);
    localStorage.setItem('elite_admin_theme_default', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, adminUser]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, setAdminUser }}>
      {/* SCOPED ADMIN ROOT: Dark class is applied ONLY to this container */}
      <div
        id="admin-root"
        className={`min-h-screen ${isDark ? 'dark bg-neutral-950 text-slate-100' : 'bg-[#f8fafc] text-neutral-900'} w-full transition-colors`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const ThemeProvider = AdminThemeProvider;

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within an AdminThemeProvider');
  }
  return context;
};
