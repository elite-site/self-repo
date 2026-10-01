import React, { useState } from 'react';
import { NavLink, Link  } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Calendar,
  Bell,
  Menu,
  X,
  Video,
  FileText,
  ClipboardList,
  Users,
  Vote,
  Globe,
  ChevronRight,
  LogOut
} from 'lucide-react';

const primaryNavItems = [
  { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Portfolio', path: '/portfolio', icon: FolderOpen },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Inbox', path: '/notifications', icon: Bell },
];

const secondaryNavItems = [
  { name: 'Introduction Video', path: '/intro-video', icon: Video, desc: 'Record & review introduction' },
  { name: 'Professional Resume', path: '/resume', icon: FileText, desc: 'Preview & upload resume PDF' },
  { name: 'My Registrations', path: '/registrations', icon: ClipboardList, desc: 'Active event participation' },
  { name: 'Teams & Hackathons', path: '/teams', icon: Users, desc: 'Form & manage competition teams' },
  { name: 'Student Democracy & Voting', path: '/voting', icon: Vote, desc: 'Cast votes in active campaigns' },
  { name: 'Public Directory', path: '/students', icon: Globe, desc: 'Search all verified students' },
];

interface MobileBottomNavProps {
  onLogout?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onLogout }) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* 1. FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-sticky bg-surface border-t border-edge shadow-drawer px-1 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSheetOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 rounded-lg text-[10px] font-semibold transition-colors min-h-[44px] min-w-[44px] ${
                  isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* MORE / SECONDARY MENU BUTTON */}
          <button
            onClick={() => setSheetOpen(!sheetOpen)}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer min-h-[44px] min-w-[44px] ${
              sheetOpen ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
            aria-label="More Menu"
          >
            <Menu className={`w-5 h-5 mb-0.5 ${sheetOpen ? 'text-brand' : 'text-ink-muted'}`} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* 2. SECONDARY ITEMS MOBILE BOTTOM SHEET */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-modal flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-on-primary/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet Drawer */}
          <div className="relative bg-surface rounded-t-xl shadow-drawer border-t border-edge max-h-[85dvh] overflow-y-auto p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] space-y-4 animate-slide-in-up text-left">
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-brand rounded-full" />
                <h3 className="text-sm font-black text-ink uppercase tracking-wider">
                  More Services
                </h3>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary Navigation List */}
            <div className="space-y-1.5">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>`flex
                     items-center justify-between p-3 rounded-xl transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-brand-soft text-brand font-bold border border-brand-soft'
                        : 'bg-surface-sunken hover:bg-surface-sunken/80 text-ink font-semibold'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-surface-raised shadow-xs text-ink-secondary">
                      <item.icon className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">{item.name}</div>
                      <div className="text-[10px] text-ink-muted font-normal">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </NavLink>
              ))}
            </div>

            {/* Sign Out Option */}
            {onLogout && (
              <div className="pt-2 border-t border-edge">
                <button
                  onClick={() => {
                    setSheetOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-soft hover:bg-brand-soft/80 text-brand text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Portal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
