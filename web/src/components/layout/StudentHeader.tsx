import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Sparkles, CheckCircle2, CheckCheck } from 'lucide-react';
import { StudentSession } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
import { getNotificationDestination, navigateToNotification } from '../../utils/notificationRouting';

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
  '/announcements': { title: 'Announcement', subtitle: 'Department update details' },
};

export const StudentHeader: React.FC<StudentHeaderProps> = ({ session, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentPath = Object.keys(pageTitles).find(
    (p) => location.pathname === p || (p !== '/' && location.pathname.startsWith(p + '/'))
  ) || '/dashboard';
  const pageInfo = pageTitles[currentPath] || { title: 'Student Portal', subtitle: 'Information Technology' };

  const loadNotifications = () => {
    api.getNotifications({ limit: 10 })
      .then((data: any) => {
        if (data && Array.isArray(data.items)) {
          setNotifications(data.items);
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, status: 'READ' })));
      setUnreadCount(0);
    } catch {}
  };

  const handleSelectNotif = async (n: any) => {
    if (!n.isRead && n.status !== 'READ') {
      api.markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true, status: 'READ' } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifOpen(false);
    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
          {/* Interactive Notifications Bell & Panel */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) loadNotifications();
              }}
              className="relative p-2 rounded-xl text-neutral-600 hover:text-[#0B192C] hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                {/* Panel Header */}
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#0B192C] uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-red-100 text-[#DC2626] px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-[#DC2626] hover:text-[#B5121B] flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                  {notifications.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-[#0B192C]">You're all caught up.</div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        No new announcements or moderation alerts right now.
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => {
                      const isUnread = !n.isRead && n.status !== 'READ';
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleSelectNotif(n)}
                          className={`p-3.5 transition-colors cursor-pointer hover:bg-neutral-50 flex items-start gap-3 ${
                            isUnread ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isUnread ? 'bg-[#DC2626]' : 'bg-neutral-300'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-[#0B192C]' : 'font-medium text-neutral-700'}`}>
                                {n.title || 'Department Update'}
                              </h4>
                              <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-snug">
                              {n.message || n.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel Footer */}
                <div className="p-2.5 border-t border-neutral-100 bg-neutral-50 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-bold text-neutral-600 hover:text-[#DC2626] transition-colors inline-block"
                  >
                    View all in Inbox →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-[#E2E8F0] hover:bg-neutral-50 transition-all cursor-pointer"
            >
              {student?.photoUrl ? (
                <img
                  src={resolveMediaUrl(student.photoUrl)}
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
