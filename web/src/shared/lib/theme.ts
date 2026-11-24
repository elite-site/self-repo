// ============================================================================
// Theme primitives — REDESIGN_PLAN §7
// ============================================================================
//
// Single source of truth for how a theme is stored, resolved and applied.
//
// `THEME_STORAGE_KEY` is defined here and nowhere else. The pre-paint script in
// `web/index.html` (§7.5) reads the same key with the same resolution rules, so
// the first painted frame and the React state agree and there is no flash. If
// you change the key or the rules, change the script in the same commit — a
// mismatch between the two is the one bug this file exists to prevent.
//
// The theme lands on `<html>` as `data-theme`, because `web/tailwind.config.js`
// uses `darkMode: ['class', '[data-theme="dark"]']`. `shared/tokens.css` keeps a
// `.dark` alias on the same block, so `applyTheme` also toggles the `dark`
// class: the attribute drives the token layer, the class keeps any surviving
// `dark:` utility and any library that checks `classList` in agreement.
// ============================================================================

/** The user's choice, including "follow the OS". Persisted under this key. */
export type Theme = 'light' | 'dark' | 'system';

/** What `Theme` collapses to once the system preference is known. */
export type ResolvedTheme = 'light' | 'dark';

/** `localStorage` key. Mirrored literally in the `<head>` script in index.html. */
export const THEME_STORAGE_KEY = 'elite-theme';

/** Attribute on `<html>` that `web/tailwind.config.js` keys `darkMode` off. */
export const THEME_ATTRIBUTE = 'data-theme';

/** Class alias kept in sync with the attribute for `dark:` utilities. */
export const DARK_CLASS = 'dark';

/** Media query backing `Theme = 'system'`. */
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * `localStorage`, or `null` when it is unavailable. Safari in private mode
 * throws on both read and write rather than returning null, so the access
 * itself is inside the try.
 */
function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The stored preference, or `null` if there is none or it cannot be read.
 * An unrecognised stored value is treated as absent, so a bad write from an
 * older build falls back to `system` instead of leaving the UI unthemed.
 */
export function readStoredTheme(): Theme | null {
  const storage = getStorage();
  if (!storage) return null;

  let stored: string | null;
  try {
    stored = storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }

  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : null;
}

/** Persists the preference. Silently does nothing when storage is unavailable. */
export function writeStoredTheme(theme: Theme): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or a full quota. The theme still applies for this session.
  }
}

/** Whether the OS currently asks for a dark UI. False when it cannot be asked. */
export function prefersDarkScheme(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

/**
 * Collapses a stored preference to the theme that should actually paint.
 * `system` and an absent preference both follow the OS.
 */
export function resolveTheme(theme: Theme | null, prefersDark: boolean): ResolvedTheme {
  const dark = theme === 'dark' || ((theme === 'system' || !theme) && prefersDark);
  return dark ? 'dark' : 'light';
}

/**
 * Puts `resolved` on `<html>` as both `data-theme` and the `dark` class, and
 * returns what it applied so a caller can sync React state without re-reading
 * the DOM. No-op outside a browser.
 */
export function applyTheme(resolved: ResolvedTheme): ResolvedTheme {
  if (typeof document === 'undefined') return resolved;

  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, resolved);
  root.classList.toggle(DARK_CLASS, resolved === 'dark');

  return resolved;
}
