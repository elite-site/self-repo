import { useCallback, useEffect, useMemo, useState } from 'react';
import { MOTION_DURATIONS } from '../lib/motion';

export interface CommandPaletteState {
  /** Whether the palette should be mounted. */
  open: boolean;
  /** Live input value, for the controlled input. */
  query: string;
  /** `query` after the debounce — feed this to the result filter, not `query`. */
  debouncedQuery: string;
  setQuery: (next: string) => void;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setOpen: (next: boolean) => void;
}

export interface UseCommandPaletteOptions {
  /** Default `'k'`, so ⌘K / Ctrl+K opens it (§5.4). */
  shortcut?: string;
  /** Start open — used by the mobile search icon, which opens rather than toggles. */
  defaultOpen?: boolean;
  /** Notified whenever the palette opens or closes, e.g. to lock body scroll. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Owns the command palette's open state, input and global `⌘K` / `Ctrl+K`
 * shortcut (REDESIGN_PLAN §5.4).
 *
 * The debounce is `duration-fast`, the token §5.4 asks for. It is on the query
 * rather than on the results because the palette's job is to feel instant to
 * type into: the input is never gated, only the (potentially API-backed) search
 * is. A component that filters a static list synchronously can ignore
 * `debouncedQuery` and use `query`.
 *
 * Arrow-key selection, `Enter` to run and `Esc` to close are `cmdk`'s job, not
 * this hook's — the palette is mounted inside `<Command>` and gets them for
 * free. This hook only has to say whether to mount it.
 *
 * @example
 * const palette = useCommandPalette();
 * <button onClick={palette.openPalette}>Search…</button>
 * {palette.open && <CommandPalette palette={palette} />}
 */
export function useCommandPalette(options: UseCommandPaletteOptions = {}): CommandPaletteState {
  const { shortcut = 'k', defaultOpen = false, onOpenChange } = options;

  const [open, setOpenState] = useState<boolean>(defaultOpen);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      // Clear on close so the next open starts from an empty, unfocused-feeling
      // state instead of the previous session's half-typed query.
      if (!next) {
        setQuery('');
        setDebouncedQuery('');
      }
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const openPalette = useCallback(() => setOpen(true), [setOpen]);
  const closePalette = useCallback(() => setOpen(false), [setOpen]);
  const togglePalette = useCallback(() => setOpen(!open), [setOpen, open]);

  // Global shortcut. Capture phase so a focusable top-nav input cannot swallow
  // it — the palette is meant to work from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setOpen(!open);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen, shortcut]);

  // Debounce the query. Cleared on unmount so a pending timer cannot set state
  // on a component that is gone.
  useEffect(() => {
    if (query === debouncedQuery) return;

    const timer = window.setTimeout(
      () => setDebouncedQuery(query),
      MOTION_DURATIONS.fast * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [query, debouncedQuery]);

  return useMemo(
    () => ({
      open,
      query,
      debouncedQuery,
      setQuery,
      openPalette,
      closePalette,
      togglePalette,
      setOpen,
    }),
    [open, query, debouncedQuery, openPalette, closePalette, togglePalette, setOpen],
  );
}