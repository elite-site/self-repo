import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AdminHeader } from '../AdminHeader';
import { AdminUser } from '../../types';

interface AdminLayoutProps {
  user: AdminUser;
  onLogout: () => void;
}

const MENU_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/students', label: 'Students', icon: 'group' },
  { path: '/admin/moderation', label: 'Moderation', icon: 'verified_user' },
  { path: '/admin/events', label: 'Events', icon: 'event' },
  { path: '/admin/registrations', label: 'Registrations', icon: 'how_to_reg' },
  { path: '/admin/voting', label: 'Voting', icon: 'how_to_vote' },
  { path: '/admin/communications', label: 'Communications', icon: 'campaign' },
  { path: '/admin/email-automation', label: 'Email Automation', icon: 'mark_email_read' },
  { path: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/admin/exports', label: 'Exports', icon: 'download' },
  { path: '/admin/storage', label: 'Storage', icon: 'storage' },
  { path: '/admin/roles', label: 'Roles & Permissions', icon: 'admin_panel_settings' },
  { path: '/admin/audit', label: 'Audit Logs', icon: 'history' },
  { path: '/admin/settings', label: 'Settings', icon: 'settings' }
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-lg text-primary-container">
        <span className="md:hidden lg:inline">ELITE Admin</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
        {MENU_ITEMS.map(item => {
          const isActive = location.pathname === item.path || 
                           (item.path !== '/admin' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary-container/10 text-primary-container font-medium border-l-4 border-primary-container' 
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-l-4 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined shrink-0">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-neutral-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="whitespace-nowrap">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface-canvas overflow-hidden">
      {/* Sidebar Desktop (Expanded on hover) */}
      <div className="hidden md:block group w-[64px] hover:w-[260px] transition-all duration-300 z-20 shrink-0 h-full overflow-hidden absolute bg-white shadow-lg">
        <SidebarContent />
      </div>
      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block w-[64px] shrink-0" />

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex">
          <div className="w-64 bg-white h-full shadow-2xl relative">
            <SidebarContent />
          </div>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <AdminHeader user={user} onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-auto bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
