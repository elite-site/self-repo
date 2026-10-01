import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Video,
  FileText,
  Calendar,
  ClipboardList,
  Users,
  Vote,
  Bell,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Intro Video', path: '/intro-video', icon: Video },
  { name: 'Resume', path: '/resume', icon: FileText },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'My Registrations', path: '/registrations', icon: ClipboardList },
  { name: 'Teams', path: '/teams', icon: Users },
  { name: 'Voting', path: '/voting', icon: Vote },
  { name: 'Notifications', path: '/notifications', icon: Bell },
];

export const StudentSidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-surface border-r border-edge h-full hidden md:flex flex-col shrink-0 select-none">
      <nav className="flex-1 overflow-y-auto py-5">
        <div className="px-5 mb-3">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            Academic Workspace
          </span>
        </div>
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-soft text-brand font-semibold'
                      : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      strokeWidth={1.75}
                      className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-brand' : 'text-ink-muted'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-edge bg-surface-sunken/50">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span className="font-heading font-semibold text-ink-secondary">Dept of IT</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
