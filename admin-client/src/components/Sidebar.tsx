import React from 'react';
import {
  Home,
  Info,
  Users,
  ClipboardList,
  FileSpreadsheet,
  Folder,
  Clock,
  LogOut,
  UserRound,
} from 'lucide-react';
import { AdminUser } from '../types';
import { adminApi } from '../services/api';

export const ACTIVE_EVENT_ID = 'self-introduction-2026';

export type AdminTab =
  | 'dashboard'
  | 'event-home'
  | 'submissions'
  | 'students'
  | 'activity';

interface SidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user?: AdminUser | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user: _user,
  onLogout,
}) => {
  const handleExportExcel = () => {
    const url = adminApi.getExcelExportUrl(ACTIVE_EVENT_ID);
    window.open(url, '_blank');
  };

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Home', icon: Home },
    { id: 'event-home' as AdminTab, label: 'Event Home', icon: Info },
    { id: 'submissions' as AdminTab, label: 'Videos Submitted', icon: Users },
    { id: 'students' as AdminTab, label: 'Students', icon: ClipboardList },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 text-left z-30 select-none transition-colors">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* 1. BRAND HEADER */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold shrink-0">
            <UserRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold text-elite-red font-display tracking-tight">
                ELITE
              </span>
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
              Department of Information Technology
            </div>
          </div>
        </div>

        {/* 2. EVENT BANNER (single fixed event) */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 px-1">
            EVENT
          </div>
          <div className="w-full bg-elite-red text-white p-2.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm">
            <span className="text-sm">👤</span>
            <span className="truncate">Self Introduction</span>
          </div>
        </div>

        {/* 3. MAIN NAVIGATION LINKS */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-950/40 text-elite-red font-bold border-l-4 border-elite-red pl-2.5'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-elite-red' : 'text-neutral-500 dark:text-neutral-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="my-2 border-t border-neutral-100 dark:border-neutral-800 pt-2" />

          {/* ACTION NAVIGATION ITEMS */}
          <button
            onClick={handleExportExcel}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group"
          >
            <FileSpreadsheet className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-emerald-600" />
            <span>Export to Excel</span>
          </button>

          <button
            onClick={() => onSelectTab('event-home')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Drive Folders</span>
          </button>

          <button
            onClick={() => onSelectTab('activity')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-red-50 dark:bg-red-950/40 text-elite-red font-bold border-l-4 border-elite-red pl-2.5'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'activity' ? 'text-elite-red' : 'text-neutral-500 dark:text-neutral-400'}`} />
            <span>Activity Log</span>
          </button>
        </nav>

        {/* 4. FOOTER LOGOUT */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-[#fafafa] dark:bg-neutral-900/60 space-y-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-elite-red hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-elite-red" />
            <span>Logout</span>
          </button>

          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center font-mono">
            © 2026 ELITE Events. All rights reserved.
          </div>
        </div>
      </div>
    </aside>
  );
};