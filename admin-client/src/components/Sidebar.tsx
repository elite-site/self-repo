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
    <aside className="w-60 bg-white dark:bg-neutral-900 border-r border-[#E4E7F2] dark:border-neutral-800 flex flex-col shrink-0 h-screen sticky top-0 text-left z-30 select-none transition-colors">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* BRAND */}
        <div className="p-4 border-b border-[#E4E7F2] dark:border-neutral-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/50 text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center shrink-0 border border-[#E0E7FF] dark:border-indigo-900/40">
            <UserRound strokeWidth={1.75} className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1 font-heading text-sm font-extrabold tracking-tight leading-tight">
              <span className="text-[#E11D48]">ELITE</span>
              <span className="text-[#0F172A] dark:text-white">Portal</span>
            </div>
            <div className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">Admin Control</div>
          </div>
        </div>

        {/* NAV GROUPS */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {navGroups.map((group) => {
            const isOpen = !collapsed[group.label];
            const hasActive = group.items.some((i) => i.id === activeTab);
            return (
              <div key={group.label} className="mb-2">
                <button
                  onClick={() => toggle(group.label)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 font-heading text-[10px] font-bold text-[#94A3B8] dark:text-neutral-400 uppercase tracking-widest hover:text-[#475569] dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <span className={hasActive ? 'text-[#4F46E5] dark:text-[#818CF8]' : ''}>{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#EEF2FF] dark:bg-indigo-950/50 text-[#4F46E5] dark:text-[#818CF8] font-semibold shadow-[inset_0_0_0_1px_rgba(79,70,229,0.15)]'
                              : 'text-[#475569] dark:text-neutral-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F7F8FC] dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#4F46E5] dark:text-[#818CF8]' : 'text-[#94A3B8]'}`} />
                          <span className="truncate">{item.label}</span>
                          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]" />}
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
        <div className="p-3 border-t border-[#E4E7F2] dark:border-neutral-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#475569] dark:text-neutral-400 hover:text-[#E11D48] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut strokeWidth={1.75} className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <div className="text-[10px] text-[#94A3B8] dark:text-neutral-500 text-center font-mono mt-2">
            ELITE Admin v2.0
          </div>
        </div>
      </div>
    </aside>
  );
};