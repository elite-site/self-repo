import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DARK_SCHEME_QUERY,
  applyTheme,
  prefersDarkScheme,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type Theme,
} from '../lib/theme';

export interface ThemeState {
  /** What the user chose. `system` means "follow the OS". */
  theme: Theme;
  /** What is actually painted right now — `system` already collapsed. */
  resolvedTheme: ResolvedTheme;
  /** Persists the choice and applies it immediately. */
  setTheme: (next: Theme) => void;
  /** Light ⇄ dark, without ever writing `system`. */
  toggleTheme: () => void;
}

/**
 * Reads, applies and persists the colour theme (REDESIGN_PLAN §7.3–§7.5).
 *
 * All of the storage and resolution rules live in `../lib/theme` so the
 * pre-paint script in `index.html` can share them. This hook is the React half:
 * it holds the state, applies the resolved theme to `<html>`, and keeps
 * `resolvedTheme` current while `theme === 'system'` and the OS setting changes
 * underneath it.
 *
 * The initial state is read synchronously rather than in an effect. The
 * pre-paint script has already made this exact same read and applied it, so
 * doing it again in state means the first render agrees with the DOM and no
 * toggle can be built on a stale value. The mount effect only re-applies, which
 * also repairs the case where the script was blocked by a CSP or a JS error
 * before it ran.
 *
 * Note for whoever wires this up: the portal's existing providers remove the
 * `dark` class from `<html>` on mount. That has to go, or it undoes whatever
 * this hook and the pre-paint script just decided.
 *
 * @example
 * const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 * <button onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} />
 */
export function useTheme(): ThemeState {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? 'system');
  const [systemDark, setSystemDark] = useState<boolean>(() => prefersDarkScheme());

  // Follow the OS for as long as the user has not overridden it.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = resolveTheme(theme, systemDark);

  // Apply on every resolution change, including the initial mount. A layout
  // effect so the attribute lands before the browser paints the new state.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = resolveTheme(current, prefersDarkScheme()) === 'dark' ? 'light' : 'dark';
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );
}