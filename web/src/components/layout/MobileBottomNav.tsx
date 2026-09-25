import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  return (
    <>
      {/* 1. FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-xl px-1 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSheetOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-colors ${
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

          {/* MORE / SECONDARY MENU BUTTON */}
          <button
            onClick={() => setSheetOpen(!sheetOpen)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              sheetOpen ? 'text-[#DC2626]' : 'text-neutral-500 hover:text-neutral-900'
            }`}
            aria-label="More Menu"
          >
            <Menu className={`w-5 h-5 mb-0.5 ${sheetOpen ? 'text-[#DC2626]' : 'text-neutral-400'}`} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* 2. SECONDARY ITEMS MOBILE BOTTOM SHEET */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet Drawer */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-neutral-200 max-h-[85vh] overflow-y-auto p-5 space-y-4 animate-in slide-in-from-bottom duration-200 text-left">
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#DC2626] rounded-full" />
                <h3 className="text-sm font-black text-[#0B192C] uppercase tracking-wider">
                  More Services
                </h3>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
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
                  className={({ isActive }) =>
                    `flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-red-50 text-[#DC2626] font-bold border border-red-100'
                        : 'bg-neutral-50 hover:bg-neutral-100/80 text-neutral-800 font-semibold'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white shadow-xs text-neutral-700">
                      <item.icon className="w-4 h-4 text-[#DC2626]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0B192C]">{item.name}</div>
                      <div className="text-[10px] text-neutral-500 font-normal">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </NavLink>
              ))}
            </div>

            {/* Sign Out Option */}
            {onLogout && (
              <div className="pt-2 border-t border-neutral-100">
                <button
                  onClick={() => {
                    setSheetOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-[#DC2626] text-xs font-bold transition-colors cursor-pointer"
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
