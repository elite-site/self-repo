import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { StudentSession } from '../../types';
import { api } from '../../services/api';

interface StudentHeaderProps {
  session: StudentSession | null;
  onLogout: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Student Dashboard', subtitle: 'Overview & academic activity' },
  '/profile': { title: 'My Profile', subtitle: 'Personal portfolio & academic information' },
  '/profile/edit': { title: 'Edit Profile', subtitle: 'Update bio, skills & professional links' },
  '/portfolio': { title: 'Portfolio Showcase', subtitle: 'Projects, achievements & certificates' },
  '/portfolio/projects': { title: 'Projects Portfolio', subtitle: 'Showcase your technical builds' },
  '/portfolio/achievements': { title: 'Achievements', subtitle: 'Academic & extracurricular honors' },
  '/portfolio/certificates': { title: 'Certifications', subtitle: 'Verified credentials & licenses' },
  '/video': { title: 'Introduction Video', subtitle: 'Department video introduction lifecycle' },
  '/resume': { title: 'My Resume', subtitle: 'Document review & view-only preview' },
  '/events': { title: 'Department Events', subtitle: 'Competitions, hackathons & workshops' },
  '/registrations': { title: 'My Registrations', subtitle: 'Track your event participation' },
  '/teams': { title: 'Team Management', subtitle: 'Form and manage hackathon teams' },
  '/voting': { title: 'Student Democracy', subtitle: 'Active campaigns & candidate elections' },
  '/notifications': { title: 'Notification Inbox', subtitle: 'Announcements, moderation alerts & updates' },
};

export const StudentHeader: React.FC<StudentHeaderProps> = ({ session, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPath = Object.keys(pageTitles).find(
    (p) => location.pathname === p || (p !== '/' && location.pathname.startsWith(p + '/'))
  ) || '/dashboard';
  const pageInfo = pageTitles[currentPath] || { title: 'Student Portal', subtitle: 'Information Technology' };

  useEffect(() => {
    // Fetch unread notifications count
    api.getNotifications()
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const unread = data.filter((n) => !n.isRead && n.status !== 'READ').length;
          setUnreadCount(unread);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const student = session?.student;
  const initials = student?.name
    ? student.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
    : 'IT';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-sm">
      <div className="w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* LEFT: ELITE BRAND & LOGOS */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-auto flex items-center gap-2">
              <img
                src="/elite-logo.png"
                alt="ELITE"
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  // Fallback to text icon if image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <img
                src="/sasi-logo.png"
                alt="SASI"
                className="h-8 w-auto object-contain hidden sm:block opacity-90"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="border-l border-[#E2E8F0] pl-3 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-[#DC2626]">ELITE</span>
                <span className="text-sm font-bold tracking-tight text-[#0B192C]">PORTAL</span>
                <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-[#DC2626]">
                  <Sparkles className="w-2.5 h-2.5" /> Dept of IT
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium hidden sm:block">
                Sasi Institute of Technology & Engineering
              </p>
            </div>
          </Link>
        </div>

        {/* MIDDLE: CONTEXTUAL PAGE TITLE */}
        <div className="hidden md:flex flex-col text-left flex-1 pl-4 border-l border-neutral-100">
          <h1 className="text-base font-extrabold text-[#0B192C] leading-tight">{pageInfo.title}</h1>
          <p className="text-xs text-neutral-500 font-medium">{pageInfo.subtitle}</p>
        </div>

        {/* RIGHT: ACTIONS & USER PROFILE */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Public directory quick link */}
          <Link
            to="/students"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-[#0B192C] px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <span>Public Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Notifications bell */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl text-neutral-600 hover:text-[#0B192C] hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-[#E2E8F0] hover:bg-neutral-50 transition-all cursor-pointer"
            >
              {student?.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#0B192C] leading-none max-w-[130px] truncate">
                  {student?.name || 'Student'}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  {student?.rollNo || 'IT Portal'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-neutral-100">
                  <div className="text-xs font-bold text-[#0B192C] truncate">{student?.name}</div>
                  <div className="text-[11px] text-neutral-500 font-mono">{student?.rollNo}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Year {student?.year} · Section {student?.section} · {student?.branch}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-[#DC2626] transition-colors"
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    to="/profile/edit"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-[#DC2626] transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-neutral-400" />
                    <span>Edit Profile & Links</span>
                  </Link>
                </div>

                <div className="border-t border-neutral-100 pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
