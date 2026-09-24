import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, FolderOpen, Video, FileText, Calendar, ClipboardList, Users, Vote, Bell } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Intro Video', path: '/video', icon: Video },
  { name: 'Resume', path: '/resume', icon: FileText },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'My Registrations', path: '/registrations', icon: ClipboardList },
  { name: 'Teams', path: '/teams', icon: Users },
  { name: 'Voting', path: '/voting', icon: Vote },
  { name: 'Notifications', path: '/notifications', icon: Bell },
];

export const StudentSidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] h-full hidden md:flex flex-col">
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-elite-red'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-elite-red' : 'text-neutral-400'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
