import React, { useState } from 'react';
import {
  Home,
  BookOpen,
  Users,
  Clock,
  LogOut,
  UserRound,
  ShieldCheck,
  CalendarDays,
  Vote,
  BarChart3,
  Download,
  Lock,
  ScrollText,
  Settings,
  Megaphone,
  Mail,
  MailOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  HardDrive,
  GraduationCap,
} from 'lucide-react';

/**
 * The internal self-introduction submission event. This is deliberately a local
 * copy rather than an import: `admin-client` and `backend` are installed as
 * separate npm projects (see the root package.json scripts), so they cannot share
 * a module. The source of truth is `INTERNAL_EVENT_ID` in
 * `backend/src/config/constants.ts` — keep the two in sync.
 */
export const ACTIVE_EVENT_ID = 'self-introduction-2026';

export type AdminTab =
  | 'dashboard'
  | 'submissions'
  | 'students'
  | 'github'
  | 'activity'
  | 'moderation'
  | 'learning'
  | 'resources'
  | 'events'
  | 'event-registrations'
  | 'voting'
  | 'voting-results'
  | 'communications'
  | 'email-automation'
  | 'email-history'
  | 'analytics'
  | 'exports'
  | 'storage'
  | 'roles'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

interface NavGroup {
  label: string;
  items: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
    ],
  },
  {
    label: 'Core Features',
    items: [
      { id: 'students', label: 'All students', icon: Users },
      { id: 'moderation', label: 'Moderation queue', icon: ShieldCheck },
      { id: 'submissions', label: 'Video submissions', icon: Layers },
      { id: 'learning', label: 'Courses & Quizzes', icon: GraduationCap },
      { id: 'resources', label: 'Study Resources', icon: BookOpen },
    ],
  },
  {
    label: 'Events',
    items: [
      { id: 'events', label: 'All events', icon: CalendarDays },
      { id: 'event-registrations', label: 'Registrations', icon: Layers },
      { id: 'voting', label: 'Voting Management', icon: Vote },
      { id: 'voting-results', label: 'Voting Results', icon: BarChart3 },
    ],
  },
  {
    label: 'Communications',
    items: [
      { id: 'communications', label: 'Announcements', icon: Megaphone },
      { id: 'email-automation', label: 'Email Automation', icon: Mail },
      { id: 'email-history', label: 'Email History', icon: MailOpen },
    ],
  },
  {
    label: 'System & Data',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'exports', label: 'Exports', icon: Download },
      { id: 'github', label: 'GitHub', icon: HardDrive },
      { id: 'storage', label: 'Storage', icon: HardDrive },
      { id: 'roles', label: 'Roles & Permissions', icon: Lock },
      { id: 'activity', label: 'Activity Log', icon: Clock },
      { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onLogout }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));

  return (
    <aside className="w-60 bg-surface border-r border-edge flex flex-col shrink-0 h-[100dvh] sticky top-0 text-left z-sticky select-none">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* BRAND */}
        <div className="h-16 px-4 border-b border-edge flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <UserRound strokeWidth={1.75} className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1 font-heading text-xs font-bold tracking-tight text-ink">
              <span className="text-brand">ELITE</span>
              <span>Portal</span>
            </div>
            <div className="text-xs text-ink-muted font-medium">Admin Control</div>
          </div>
        </div>

        {/* NAV GROUPS */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto" aria-label="Admin navigation">
          {navGroups.map((group, groupIdx) => {
            const isFirstGroup = groupIdx === 0;
            const groupSpacingClass = isFirstGroup ? 'mb-1' : 'mb-1 mt-2';

            if (group.items.length === 1) {
              const item = group.items[0];
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={group.label} className={groupSpacingClass}>
                  <div className="px-2.5 pt-1.5 pb-1 text-[10px] uppercase font-bold tracking-wider text-ink-muted select-none">
                    {group.label}
                  </div>
                  <button
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-ink-muted'}`} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 ml-1.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            }
            const hasActive = group.items.some((i) => i.id === activeTab);
            // The group holding the current page can never be collapsed, so the
            // sidebar always shows where the admin is rather than hiding the page
            // they are looking at behind a closed disclosure.
            const isOpen = hasActive || !collapsed[group.label];
            return (
              <div key={group.label} className={groupSpacingClass}>
                <button
                  onClick={() => toggle(group.label)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer select-none"
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <span id={`nav-group-label-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className={hasActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  )}
                </button>
                {isOpen && (
                  <div id={`nav-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-0.5 mt-1" role="group" aria-labelledby={`nav-group-label-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                              : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-ink-muted'}`} aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 ml-1.5" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-3 border-t border-edge">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-secondary hover:text-brand hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
          >
            <LogOut strokeWidth={1.75} className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
