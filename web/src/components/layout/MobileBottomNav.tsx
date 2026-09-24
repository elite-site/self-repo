import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, FolderOpen, Calendar, Bell } from 'lucide-react';

const mobileNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Inbox', path: '/notifications', icon: Bell },
];

export const MobileBottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-lg px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[#DC2626]' : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#DC2626]' : 'text-neutral-400'}`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
