import React, { useState } from 'react';
import {
  Home,
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
  | 'activity'
  | 'moderation'
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
    label: 'Students',
    items: [
      { id: 'students', label: 'All students', icon: Users },
      { id: 'moderation', label: 'Moderation queue', icon: ShieldCheck },
    ],
  },
  {
    label: 'Events',
    items: [
      { id: 'events', label: 'All events', icon: CalendarDays },
      { id: 'event-registrations', label: 'Registrations', icon: Layers },
    ],
  },
  {
    label: 'Voting',
    items: [
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
    label: 'Data',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'exports', label: 'Exports', icon: Download },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'storage', label: 'Storage', icon: HardDrive },
      { id: 'roles', label: 'Roles & Permissions', icon: Lock },
      { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
      { id: 'activity', label: 'Activity Log', icon: Clock },
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
        <div className="p-4 border-b border-edge flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0 border border-brand-soft">
            <UserRound strokeWidth={1.75} className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1 font-heading text-sm font-semibold tracking-tight leading-tight">
              <span className="text-brand">ELITE</span>
              <span className="text-ink">Portal</span>
            </div>
            <div className="text-xs text-ink-muted font-semibold">Admin Control</div>
          </div>
        </div>

        {/* NAV GROUPS */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto" aria-label="Admin navigation">
          {navGroups.map((group) => {
            if (group.items.length === 1) {
              const item = group.items[0];
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={group.label} className="mb-2">
                  <button
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-brand-soft text-brand-soft-text font-semibold'
                        : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-pressed={isActive}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
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
              <div key={group.label} className="mb-2">
                <button
                  onClick={() => toggle(group.label)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 font-heading text-xs font-semibold text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <span id={`nav-group-label-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className={hasActive ? 'text-brand' : ''}>{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  )}
                </button>
                {isOpen && (
                  <div id={`nav-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-0.5 mt-0.5" role="group" aria-labelledby={`nav-group-label-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-brand-soft text-brand-soft-text font-semibold'
                              : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                          aria-pressed={isActive}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`} aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
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
