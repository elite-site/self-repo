import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Sparkles, CheckCircle2, CheckCheck } from 'lucide-react';
import { StudentSession } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
import { getNotificationDestination, navigateToNotification } from '../../utils/notificationRouting';
import { getPhotoStyle } from '../../utils/photoStyle';

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
    <header className="sticky top-0 z-30 bg-white border-b border-[#E4E7F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* LEFT: ELITE BRAND & LOGOS */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-auto flex items-center gap-2">
              <picture className="flex items-center">
                <source srcSet="/elite-logo.webp" type="image/webp" />
                <img
                  src="/elite-logo.png"
                  alt="ELITE"
                  width="36"
                  height="36"
                  decoding="async"
                  className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </picture>
              <picture className="hidden sm:flex items-center">
                <source srcSet="/sasi-logo.webp" type="image/webp" />
                <img
                  src="/sasi-logo.png"
                  alt="SASI"
                  width="180"
                  height="32"
                  decoding="async"
                  className="h-8 w-auto object-contain opacity-90"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </picture>
            </div>
            <div className="border-l border-[#E4E7F2] pl-3 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm font-extrabold tracking-tight text-[#E11D48]">ELITE</span>
                <span className="font-heading text-sm font-bold tracking-tight text-[#0F172A]">PORTAL</span>
                <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E0E7FF] text-[#4F46E5]">
                  <Sparkles className="w-2.5 h-2.5" /> Dept of IT
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-medium hidden sm:block">
                Sasi Institute of Technology & Engineering
              </p>
            </div>
          </Link>
        </div>

        {/* MIDDLE: CONTEXTUAL PAGE TITLE */}
        <div className="hidden md:flex flex-col text-left flex-1 pl-4 border-l border-[#E4E7F2]">
          <h1 className="font-heading text-base font-bold text-[#0F172A] leading-tight">{pageInfo.title}</h1>
          <p className="text-xs text-[#475569] font-normal">{pageInfo.subtitle}</p>
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
              className="relative p-2 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#F7F8FC] transition-colors cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell strokeWidth={1.75} className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E11D48] text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-[#E4E7F2] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                {/* Panel Header */}
                <div className="px-4 py-3 border-b border-[#E4E7F2] flex items-center justify-between bg-[#F7F8FC]">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#0F172A] uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-[#FFE4E6] text-[#E11D48] px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-1 cursor-pointer"
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
                      <div className="font-heading text-xs font-bold text-[#0F172A]">You're all caught up.</div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
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
                          className={`p-3.5 transition-colors cursor-pointer hover:bg-[#F7F8FC] flex items-start gap-3 ${
                            isUnread ? 'bg-[#EEF2FF]/40' : ''
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isUnread ? 'bg-[#E11D48]' : 'bg-[#CBD5E1]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-[#0F172A]' : 'font-medium text-[#475569]'}`}>
                                {n.title || 'Department Update'}
                              </h4>
                              <span className="text-[10px] text-[#94A3B8] shrink-0">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#475569] line-clamp-2 mt-0.5 leading-snug">
                              {n.message || n.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel Footer */}
                <div className="p-2.5 border-t border-[#E4E7F2] bg-[#F7F8FC] text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-[#4F46E5] hover:text-[#3730A3] transition-colors inline-block"
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
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-transparent hover:border-[#E4E7F2] hover:bg-[#F7F8FC] transition-all cursor-pointer"
            >
              {student?.photoUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E4E7F2] shrink-0">
                  <img
                    src={resolveMediaUrl(student.photoUrl)}
                    alt={student.name}
                    style={getPhotoStyle(student)}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-heading font-bold text-xs shadow-sm">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="font-heading text-xs font-bold text-[#0F172A] leading-none max-w-[130px] truncate">
                  {student?.name || 'Student'}
                </div>
                <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                  {student?.rollNo || 'IT Portal'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#E4E7F2] py-2 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-[#E4E7F2]">
                  <div className="font-heading text-xs font-bold text-[#0F172A] truncate">{student?.name}</div>
                  <div className="text-[11px] text-[#475569] font-mono">{student?.rollNo}</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                    Year {student?.year} · Section {student?.section} · {student?.branch}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#EEF2FF] hover:text-[#4F46E5] transition-colors"
                  >
                    <User strokeWidth={1.75} className="w-4 h-4 text-[#94A3B8]" />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    to="/profile/edit"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#EEF2FF] hover:text-[#4F46E5] transition-colors"
                  >
                    <Sparkles strokeWidth={1.75} className="w-4 h-4 text-[#94A3B8]" />
                    <span>Edit Profile & Links</span>
                  </Link>
                </div>

                <div className="border-t border-[#E4E7F2] pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut strokeWidth={1.75} className="w-4 h-4 text-rose-500" />
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
