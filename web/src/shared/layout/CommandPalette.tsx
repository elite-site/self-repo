import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  AlertCircle,
  Award,
  Bell,
  Briefcase,
  Calendar,
  FileBadge,
  FileText,
  FolderPlus,
  Github,
  GraduationCap,
  LibraryBig,
  LogOut,
  Moon,
  Pencil,
  PlayCircle,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { useThemeState } from '@/context/ThemeContext';
import { SIDEBAR_NAV, type NavEntry } from './NavItem';
import { useSearchQuery } from '@/shared/hooks/useSearch';
import type { SearchItem } from '@/shared/api/search';
import type { CommandPaletteState } from '@/shared/hooks/useCommandPalette';

/**
 * `localStorage` key for §5.4's "Recent" group — the last five pages visited.
 * Namespaced for the same reason as the rail's key, and it holds only paths this
 * app produced: entries are filtered back against the nav table before they are
 * rendered, so a stale or hand-edited value can never become a link nowhere.
 */
export const RECENT_ROUTES_STORAGE_KEY = 'elite-recent-routes';

const MAX_RECENT = 5;

const KNOWN_PATHS = new Set(SIDEBAR_NAV.map((entry) => entry.path));

export function readRecentRoutes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((value): value is string => typeof value === 'string')
      .filter((value) => KNOWN_PATHS.has(value))
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/**
 * Notes a visit. Called by the shell on every pathname change, so the Recent
 * group is a record of where the student has been without a second navigation
 * event to subscribe to.
 */
export function recordRecentRoute(pathname: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = [pathname, ...readRecentRoutes().filter((path) => path !== pathname)].slice(
      0,
      MAX_RECENT,
    );
    window.localStorage.setItem(RECENT_ROUTES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: the palette simply has no Recent group.
  }
}

interface PaletteAction {
  label: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

const ITEM_CLASS =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 font-ui text-label-lg ' +
  'text-ink-secondary outline-none transition-colors duration-quick ' +
  'data-[selected]:bg-brand-soft data-[selected]:font-semibold data-[selected]:text-brand';

const GROUP_CLASS =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-label-sm ' +
  '[&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase ' +
  '[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-muted';

const TYPE_META: Record<SearchItem['type'], { icon: LucideIcon; label: string }> = {
  course: { icon: GraduationCap, label: 'Course' },
  lesson: { icon: PlayCircle, label: 'Lesson' },
  project: { icon: Briefcase, label: 'Project' },
  resume: { icon: FileText, label: 'Resume' },
  resource: { icon: LibraryBig, label: 'Resource' },
  event: { icon: Calendar, label: 'Event' },
  achievement: { icon: Award, label: 'Achievement' },
  certificate: { icon: FileBadge, label: 'Certificate' },
  github: { icon: Github, label: 'GitHub' },
  student: { icon: User, label: 'Student' },
  announcement: { icon: Bell, label: 'Announcement' },
};

/**
 * §5.4 — the command palette.
 *
 * Built on `cmdk` inside the shared `Modal`. `cmdk` owns `↑`/`↓` selection with
 * wrap-around, `Enter` to run, and `cmdk-list` / `cmdk-group` / `cmdk-item`
 * ARIA roles. `Modal` owns the scrim, `Escape`, focus trap, focus return, and
 * body scroll lock.
 *
 * `shouldFilter={false}` because `useCommandPalette` debounces the query by
 * `duration-fast` (100ms), static navigation entries are matched synchronously
 * by substring, and indexed portal content is queried via `useSearchQuery`.
 */
export const CommandPalette: React.FC<{
  palette: CommandPaletteState;
  onLogout?: () => void;
}> = ({ palette, onLogout }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, toggleTheme } = useThemeState();

  /** `debouncedQuery` filters the results; the input itself is never gated. */
  const query = palette.debouncedQuery.trim().toLowerCase();
  const hasRemoteQuery = query.length >= 2;
  const searchResults = useSearchQuery(palette.debouncedQuery, palette.open);

  if (!palette.open) return null;

  const isSearching = hasRemoteQuery && searchResults.isLoading;
  const resultItems: SearchItem[] = hasRemoteQuery ? (searchResults.data?.items ?? []) : [];

  const go = (path: string) => () => {
    palette.closePalette();
    navigate(path);
  };

  const matchesEntry = (entry: NavEntry) =>
    `${entry.label} ${entry.keywords ?? ''}`.toLowerCase().includes(query);

  const pages = SIDEBAR_NAV.filter(matchesEntry);

  // Recent is only useful when nothing has been typed yet; once the student is
  // searching, they want the full index, not their own last five clicks.
  const recent = query
    ? []
    : readRecentRoutes()
        .map((path) => SIDEBAR_NAV.find((entry) => entry.path === path))
        .filter((entry): entry is NavEntry => Boolean(entry));

  const allActions: PaletteAction[] = [
    {
      label: resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      keywords: 'theme appearance night day',
      run: () => {
        toggleTheme();
        palette.closePalette();
      },
    },
    { label: 'Edit Profile', icon: Pencil, keywords: 'bio links skills', run: go('/profile/edit') },
    { label: 'Add Project', icon: FolderPlus, keywords: 'portfolio build', run: go('/portfolio/projects') },
    {
      label: 'Upload New Intro Video',
      icon: Upload,
      keywords: 'record introduction',
      run: go('/intro-video'),
    },
    { label: 'Edit Resume', icon: FileText, keywords: 'cv pdf document', run: go('/resume') },
  ];

  if (onLogout) {
    allActions.push({
      label: 'Sign Out',
      icon: LogOut,
      keywords: 'logout leave session',
      run: () => {
        palette.closePalette();
        onLogout();
      },
    });
  }

  const actions = query
    ? allActions.filter((action) =>
        `${action.label} ${action.keywords ?? ''}`.toLowerCase().includes(query),
      )
    : allActions;

  const isEmpty =
    recent.length === 0 &&
    pages.length === 0 &&
    actions.length === 0 &&
    !isSearching &&
    !searchResults.isError &&
    resultItems.length === 0;

  return (
    <Modal
      open
      onClose={palette.closePalette}
      title="Search"
      description="Search courses, projects, resumes, resources, events, or jump to a page"
      size="lg"
      initialFocusRef={inputRef}
    >
      <Command label="Command palette" shouldFilter={false}>
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface-sunken px-3">
          <Command.Input
            ref={inputRef}
            value={palette.query}
            onValueChange={palette.setQuery}
            placeholder="Search courses, projects, resumes, events…"
            aria-label="Search the portal"
            className="h-11 w-full bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-muted"
          />
        </div>

        <Command.List className="mt-2 max-h-[60vh] overflow-y-auto">
          {isEmpty ? (
            <Command.Empty>
              <p className="py-8 text-center text-label-lg text-ink-muted">
                No matches for “{palette.query}”.
              </p>
            </Command.Empty>
          ) : null}

          {recent.length > 0 ? (
            <Command.Group heading="Recent" className={GROUP_CLASS}>
              {recent.map((entry) => (
                <Command.Item
                  key={`recent:${entry.path}`}
                  value={`recent:${entry.path}`}
                  onSelect={go(entry.path)}
                  className={ITEM_CLASS}
                >
                  <entry.icon
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {hasRemoteQuery && (isSearching || searchResults.isError || resultItems.length > 0) ? (
            <Command.Group heading="Results" className={GROUP_CLASS}>
              {isSearching ? (
                <Command.Item disabled className={ITEM_CLASS}>
                  <span className="text-ink-muted">Searching…</span>
                </Command.Item>
              ) : searchResults.isError ? (
                <Command.Item
                  value="search-retry"
                  onSelect={() => void searchResults.refetch()}
                  className={ITEM_CLASS}
                >
                  <AlertCircle
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-status-rejected"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-ink-secondary">
                    Search unavailable — select to retry
                  </span>
                </Command.Item>
              ) : (
                resultItems.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  return (
                    <Command.Item
                      key={`result:${item.type}:${item.id}`}
                      value={`result:${item.type}:${item.id}`}
                      onSelect={go(item.url)}
                      className={ITEM_CLASS}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.75}
                        className="shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {item.description ? (
                        <span className="hidden max-w-[14rem] truncate text-label-sm text-ink-muted sm:inline">
                          {item.description}
                        </span>
                      ) : null}
                      <span className="shrink-0 rounded border border-edge bg-surface-sunken px-1.5 py-0.5 text-label-sm text-ink-muted">
                        {meta.label}
                      </span>
                    </Command.Item>
                  );
                })
              )}
            </Command.Group>
          ) : null}

          {pages.length > 0 ? (
            <Command.Group heading="Pages" className={GROUP_CLASS}>
              {pages.map((entry) => (
                <Command.Item
                  key={`page:${entry.path}`}
                  value={`page:${entry.path}`}
                  onSelect={go(entry.path)}
                  className={ITEM_CLASS}
                >
                  <entry.icon
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {actions.length > 0 ? (
            <Command.Group heading="Actions" className={GROUP_CLASS}>
              {actions.map((action) => (
                <Command.Item
                  key={`action:${action.label}`}
                  value={`action:${action.label}`}
                  onSelect={action.run}
                  className={ITEM_CLASS}
                >
                  <action.icon
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </Modal>
  );
};

export default CommandPalette;
