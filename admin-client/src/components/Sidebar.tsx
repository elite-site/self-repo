import React, { useState } from 'react';
import {
  Home,
  ClipboardList,
  Users,
  Clock,
  LogOut,
  UserRound,
  ShieldCheck,
  CalendarDays,
  Vote,
  BarChart3,
  Download,
  HardDrive,
  Lock,
  ScrollText,
  Settings,
  Megaphone,
  Mail,
  MailOpen,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { AdminUser } from '../types';

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
  user?: AdminUser | null;
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
      { id: 'students', label: 'All Students', icon: Users },
      { id: 'submissions', label: 'Video Submissions', icon: ClipboardList },
      { id: 'moderation', label: 'Moderation Queue', icon: ShieldCheck },
    ],
  },
  {
    label: 'Events',
    items: [
      { id: 'events', label: 'Events', icon: CalendarDays },
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
    <aside className="w-60 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 h-screen sticky top-0 text-left z-30 select-none transition-colors">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* BRAND */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center shrink-0">
            <UserRound className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#DC2626] tracking-tight leading-tight">ELITE Portal</div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Admin Control</div>
          </div>
        </div>

        {/* NAV GROUPS */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navGroups.map((group) => {
            const isOpen = !collapsed[group.label];
            const hasActive = group.items.some((i) => i.id === activeTab);
            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() => toggle(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  <span className={hasActive ? 'text-[#DC2626]' : ''}>{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-red-50 dark:bg-red-950/40 text-[#DC2626] font-bold'
                              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#DC2626]' : 'text-neutral-400'}`} />
                          <span>{item.label}</span>
                          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#DC2626]" />}
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
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-neutral-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <div className="text-[10px] text-neutral-400 text-center font-mono mt-2">
            ELITE Admin v2.0
          </div>
        </div>
      </div>
    </aside>
  );
};