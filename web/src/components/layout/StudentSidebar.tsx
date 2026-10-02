import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Where a student actually spends their time. Kept to six rows so the rail
 * stays scannable; anything they open occasionally lives under "More".
 */
const primaryNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Intro Video', path: '/intro-video', icon: Video },
  { name: 'Resume', path: '/resume', icon: FileText },
  { name: 'Events', path: '/events', icon: Calendar },
];

const moreNavItems: NavItem[] = [
  { name: 'Registrations', path: '/registrations', icon: ClipboardList },
  { name: 'Teams', path: '/teams', icon: Users },
  { name: 'Voting', path: '/voting', icon: Vote },
  { name: 'Notifications', path: '/notifications', icon: Bell },
];

const linkClasses = (isActive: boolean) =>
  `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-soft font-semibold text-brand'
      : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
  }`;

const SidebarLink: React.FC<{ item: NavItem }> = ({ item }) => (
  <li>
    <NavLink to={item.path} className={({ isActive }) => linkClasses(isActive)}>
      {({ isActive }) => (
        <>
          <item.icon
            size={18}
            strokeWidth={1.75}
            className={`shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`}
            aria-hidden="true"
          />
          <span className="truncate">{item.name}</span>
          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
        </>
      )}
    </NavLink>
  </li>
);

export const StudentSidebar: React.FC = () => {
  const location = useLocation();

  // The section the student is currently inside is never hidden behind a closed
  // disclosure: arriving on /voting from the dashboard has to show where they
  // are, or the rail disagrees with the page.
  const inMoreSection = moreNavItems.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );
  const [moreOpen, setMoreOpen] = useState(inMoreSection);

  useEffect(() => {
    if (inMoreSection) setMoreOpen(true);
  }, [inMoreSection]);

  return (
    <aside className="hidden w-60 shrink-0 select-none flex-col border-r border-edge bg-surface md:flex">
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Student portal">
        <ul className="space-y-1">
          {primaryNavItems.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="sidebar-more"
          className={`mt-1 w-full ${linkClasses(false)} cursor-pointer`}
        >
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            className={`shrink-0 text-ink-muted transition-transform duration-fast ${
              moreOpen ? '' : '-rotate-90'
            }`}
            aria-hidden="true"
          />
          <span>More</span>
        </button>

        <ul id="sidebar-more" hidden={!moreOpen} className="mt-1 space-y-1">
          {moreNavItems.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default StudentSidebar;
