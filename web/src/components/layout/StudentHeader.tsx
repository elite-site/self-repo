import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Sparkles, CheckCheck } from 'lucide-react';
import { StudentSession } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
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
  '/intro-video': { title: 'Introduction Video', subtitle: 'Department video introduction lifecycle' },
  '/resume': { title: 'My Resume', subtitle: 'Document review & view-only preview' },
  '/events': { title: 'Department Events', subtitle: 'Competitions, hackathons & workshops' },
  '/registrations': { title: 'My Registrations', subtitle: 'Track your event participation' },
  '/teams': { title: 'Team Management', subtitle: 'Form and manage hackathon teams' },
  '/voting': { title: 'Student Democracy', subtitle: 'Active campaigns & candidate elections' },
  '/notifications': { title: 'Notification Inbox', subtitle: 'Announcements, moderation alerts & updates' },
  '/announcements': { title: 'Announcement', subtitle: 'Department update details' },
};

// Longest path first, so a prefix match resolves to the most specific entry
// (`/profile/edit` rather than `/profile`, `/portfolio/projects` rather than
// `/portfolio`). Lookup prefers an exact match before falling back to a prefix.
const pageTitleEntries = Object.entries(pageTitles).sort((a, b) => b[0].length - a[0].length);

export const StudentHeader: React.FC<StudentHeaderProps> = ({ session, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentPath = pageTitles[location.pathname]
    ? location.pathname
    : pageTitleEntries.find(([p]) => location.pathname.startsWith(`${p}/`))?.[0] ?? '/dashboard';
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
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    setNotifOpen(false);
    navigate('/notifications');
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
    <header className="sticky top-0 z-sticky bg-surface border-b border-edge shadow-card">
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
            <div className="border-l border-edge pl-3 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm font-extrabold tracking-tight text-brand">ELITE</span>
                <span className="font-heading text-sm font-bold tracking-tight text-ink">PORTAL</span>
              </div>
              {/* The SASI logo immediately to the left already says the
                  institution; spelling it out again made the bar read as two
                  competing brand blocks. */}
              <p className="text-label-md text-ink-muted hidden sm:block">
                Dept of Information Technology
              </p>
            </div>
          </Link>
        </div>

        {/* MIDDLE: CONTEXTUAL PAGE TITLE */}
        <div className="hidden md:flex flex-col text-left flex-1 pl-4 border-l border-edge">
          <h1 className="font-heading text-base font-bold text-ink leading-tight">{pageInfo.title}</h1>
          <p className="text-xs text-ink-secondary font-normal">{pageInfo.subtitle}</p>
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
              className="relative p-2 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell strokeWidth={1.75} className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-primary">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-lg shadow-modal border border-edge z-50 overflow-hidden animate-scale-in text-left">
                {/* Panel Header */}
                <div className="px-4 py-3 border-b border-edge flex items-center justify-between bg-surface-sunken">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-ink uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-brand-soft text-brand-soft-text px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notifications.filter((n) => !n.isRead && n.status !== 'READ').length === 0 ? (
                    <div className="p-6 text-center">
                      <CheckCheck className="w-5 h-5 text-ink-muted mx-auto mb-2" />
                      <p className="text-xs text-ink-muted">All caught up!</p>
                    </div>
                  ) : (
                    notifications.filter((n) => !n.isRead && n.status !== 'READ').slice(0, 6).map((n) => {
                      const isUnread = !n.isRead && n.status !== 'READ';
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleSelectNotif(n)}
                          className={`p-3.5 transition-colors cursor-pointer hover:bg-surface-sunken flex items-start gap-3 ${
                            isUnread ? 'bg-brand-soft/40' : ''
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isUnread ? 'bg-brand' : 'bg-edge-strong'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-ink' : 'font-medium text-ink-secondary'}`}>
                                {n.title || 'Department Update'}
                              </h4>
                              <span className="text-[10px] text-ink-muted shrink-0">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-secondary line-clamp-2 mt-0.5 leading-snug">
                              {n.message || n.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel Footer */}
                <div className="p-2.5 border-t border-edge bg-surface-sunken text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors inline-block"
                  >
                    View all in Inbox
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-transparent hover:border-edge hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              {student?.photoUrl && !imageError ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-edge shrink-0 bg-surface-sunken">
                  <img
                    src={resolveMediaUrl(student.photoUrl)}
                    alt={student.name}
                    style={getPhotoStyle(student)}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-heading font-bold text-xs shadow-sm">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="font-heading text-xs font-bold text-ink leading-none max-w-[130px] truncate">
                  {student?.name || 'Student'}
                </div>
                <div className="text-[10px] text-ink-muted font-mono mt-0.5">
                  {student?.rollNo || 'IT Portal'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-modal border border-edge py-2 z-50 text-left animate-scale-in">
                <div className="px-4 py-2.5 border-b border-edge flex items-center gap-3">
                  {student?.photoUrl && !imageError ? (
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-edge shrink-0 bg-surface-sunken">
                      <img
                        src={resolveMediaUrl(student.photoUrl)}
                        alt={student.name}
                        style={getPhotoStyle(student)}
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-heading font-bold text-xs shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-xs font-bold text-ink truncate">{student?.name}</div>
                    <div className="text-[11px] text-ink-secondary font-mono">{student?.rollNo}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">
                      Year {student?.year} · Section {student?.section} · {student?.branch}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-brand-soft hover:text-brand transition-colors"
                  >
                    <User strokeWidth={1.75} className="w-4 h-4 text-ink-muted" />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    to="/profile/edit"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-brand-soft hover:text-brand transition-colors"
                  >
                    <Sparkles strokeWidth={1.75} className="w-4 h-4 text-ink-muted" />
                    <span>Edit Profile & Links</span>
                  </Link>
                </div>

                <div className="border-t border-edge pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer"
                  >
                    <LogOut strokeWidth={1.75} className="w-4 h-4 text-status-rejected" />
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
