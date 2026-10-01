import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AdminUser } from '../types';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  setAdminUser: (user: AdminUser | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getStorageKey = (user?: AdminUser | null) => {
  if (user?.userId) return `elite_admin_theme_${user.userId}`;
  if (user?.username) return `elite_admin_theme_${user.username}`;
  return 'elite_admin_theme_default';
};

const resolveTheme = (mode: ThemeMode): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('elite_admin_theme_default') as ThemeMode;
      return saved && (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  const prevThemeRef = useRef<ThemeMode>(theme);
  const prevUserRef = useRef<AdminUser | null>(null);

  // Restore user-specific preference when admin changes or logs in
  useEffect(() => {
    if (adminUser) {
      const userKey = getStorageKey(adminUser);
      try {
        const saved = localStorage.getItem(userKey) as ThemeMode;
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeState(saved);
        }
      } catch {
        // ignore localStorage errors
      }
    }
  }, [adminUser?.userId, adminUser?.username]);

  // Resolve the theme and apply data-theme to <html> for the token system
  useEffect(() => {
    const dark = resolveTheme(theme);

    // Apply to <html> for the token system
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Save ONLY when the resolved theme actually changed
    if (theme !== prevThemeRef.current || adminUser !== prevUserRef.current) {
      prevThemeRef.current = theme;
      prevUserRef.current = adminUser;
      try {
        const userKey = getStorageKey(adminUser);
        localStorage.setItem(userKey, theme);
        localStorage.setItem('elite_admin_theme_default', theme);
      } catch {
        // ignore localStorage errors
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, adminUser]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, setAdminUser }}>
      {children}
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
