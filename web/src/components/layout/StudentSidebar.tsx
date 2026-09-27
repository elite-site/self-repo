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
    <aside className="w-64 bg-white border-r border-[#E4E7F2] h-full hidden md:flex flex-col shrink-0 select-none">
      <nav className="flex-1 overflow-y-auto py-5">
        <div className="px-5 mb-3">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#94A3B8]">
            Academic Workspace
          </span>
        </div>
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)]'
                      : 'text-[#475569] hover:bg-[#F7F8FC] hover:text-[#0F172A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      strokeWidth={1.75}
                      className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-[#4F46E5]' : 'text-[#94A3B8]'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-[#E4E7F2] bg-[#F7F8FC]/50">
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span className="font-heading font-semibold text-[#475569]">Dept of IT</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
