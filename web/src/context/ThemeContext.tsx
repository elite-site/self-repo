import React, { createContext, useContext } from 'react';
import { useTheme, type ThemeState } from '../hooks/useTheme';
import { THEME_ATTRIBUTE, type ResolvedTheme } from '../lib/theme';

/**
 * One theme, one implementation. REDESIGN_PLAN §7.
 *
 * This file used to hold the opposite opinion. Both providers hardcoded
 * `theme: 'light'` and each ran a mount effect that *removed* `dark` from
 * `<html>` and `<body>`, under a comment saying the student portal "stays on
 * its fixed clean academic theme". That was a migration scaffold: the pre-plan
 * design had two themes that were not allowed to bleed into each other, so the
 * student half was pinned to light and the admin half was not.
 *
 * The redesign removes that constraint. Batch 1 shipped a full dark token set
 * (`shared/tokens.css`) and §7.3 requires a working toggle with persistence and
 * system-preference detection — which `hooks/useTheme.ts` and the pre-paint
 * script in `index.html` already implement. Those stripping effects therefore
 * had to go: they ran on mount and undid whatever the pre-paint script had just
 * decided, so a student who chose dark mode got a light flash on every route
 * change and could not stay dark.
 *
 * There is now exactly one implementation of theme state — `useTheme()` — and
 * this module only decides *which scope* a subtree is in. All storage and
 * resolution lives in `lib/theme.ts`, keyed by the single `THEME_STORAGE_KEY`,
 * so no second `localStorage` key is introduced here.
 *
 * `usePublicTheme` and `useStudentTheme` are retained because pages import
 * them, but they are now the same function: the split between a public scope and
 * a student scope survives only as the wrapper `<div>` each one renders, not as
 * two disagreeing themes.
 */

/**
 * What a consumer sees when no provider is mounted above it. Only reachable in
 * a test DOM or a component rendered outside `App`, and it mirrors whatever the
 * pre-paint script already applied to `<html>` so the icon and the document
 * still agree.
 */
function initialResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === 'dark' ? 'dark' : 'light';
}

const NO_PROVIDER: ThemeState = {
  theme: 'system',
  resolvedTheme: initialResolvedTheme(),
  setTheme: () => {},
  toggleTheme: () => {},
};

const ThemeStateContext = createContext<ThemeState>(NO_PROVIDER);

/**
 * Holds the one live `useTheme()` instance for the subtree and publishes it.
 *
 * The public and student scopes are never mounted at the same time — the route
 * table mounts exactly one of them per route — so exactly one `useTheme()` is
 * alive at any moment, and remounting either scope re-applies the stored
 * preference, which is what the pre-paint script did anyway.
 */
const ThemeScope: React.FC<{ rootId: string; children: React.ReactNode }> = ({
  rootId,
  children,
}) => {
  const state = useTheme();

  return (
    <ThemeStateContext.Provider value={state}>
      <div id={rootId} className="min-h-[100dvh] w-full bg-surface-canvas font-sans text-ink antialiased">
        {children}
      </div>
    </ThemeStateContext.Provider>
  );
};

/** Wraps the public, signed-out routes (`/`, `/students`, `/students/:rollNo`, …). */
export const PublicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeScope rootId="public-root">{children}</ThemeScope>
);

/** Wraps the authenticated portal shell. */
export const StudentThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeScope rootId="student-root">{children}</ThemeScope>
);

/**
 * The shared theme state — the single instance of `useTheme()` for whichever
 * scope is mounted.
 *
 * `ThemeToggle` and the command palette read this rather than calling
 * `useTheme()` directly: the raw hook holds state per call, so two callers
 * would each keep their own copy and a toggle would leave the other one stale.
 *
 * @example
 * const { resolvedTheme, toggleTheme } = useThemeState();
 */
export function useThemeState(): ThemeState {
  return useContext(ThemeStateContext);
}

/** Kept for the pages that import it; identical to `useThemeState`. */
export const usePublicTheme = useThemeState;

/** Kept for the pages that import it; identical to `useThemeState`. */
export const useStudentTheme = useThemeState;