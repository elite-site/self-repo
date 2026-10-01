import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Notification } from '../types';
import { getNotificationDestination, navigateToNotification } from '../utils/notificationRouting';
import {
  Bell,
  Loader2,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Calendar,
  Award,
  Vote,
  Info,
  Video,
  ChevronRight
} from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';
import { useToast } from '../components/Toast';

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'EVENT' | 'ACADEMIC' | 'VOTING' | 'VIDEO'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  const loadNotifications = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data: any = await api.getNotifications({ limit: 20 });
      if (data && Array.isArray(data.items)) {
        setNotifs(data.items);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        setHasMore(Boolean(data.hasMore));
      } else {
        setError('Could not load notifications.');
      }
    } catch {
      setError('Could not load notifications.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data: any = await api.getNotifications({ limit: 20, offset: notifs.length });
      if (data && Array.isArray(data.items)) {
        setNotifs((prev) => [...prev, ...data.items]);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : unreadCount);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      setError('Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      await loadNotifications(true);
      showToast('All notifications marked as read.');
    } catch {
      showToast('Failed to mark all as read.', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      await loadNotifications(true);
    } catch {}
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      handleMarkSingleRead(n.id);
    }

    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  const filteredNotifs = notifs.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.isRead;
    // Video / moderation decisions (approve, reject, "upload a new video") are
    // stored with the MODERATION type.
    if (activeFilter === 'VIDEO') return n.type === 'MODERATION';
    if (activeFilter !== 'ALL') return n.type === activeFilter;
    return true;
  });

  if (loading) {
    return (
      <div className="py-20 animate-fade-in">
        <BrandedLoading fullScreen={false} message="Loading Notifications..." />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-brand" />;
      case 'ACADEMIC':
        return <Award className="w-4 h-4 text-brand" />;
      case 'VOTING':
        return <Vote className="w-4 h-4 text-status-review" />;
      case 'MODERATION':
        return <Video className="w-4 h-4 text-status-changes" />;
      default:
        return <Info className="w-4 h-4 text-ink-muted" />;
    }
  };

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">Notification Inbox</h1>
            {unreadCount > 0 && (
              <span className="badge badge-brand">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-body-sm text-ink-secondary">
            Announcements, event confirmations, change request decisions, and system alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="btn btn-secondary"
              aria-label={markingAll ? 'Marking all as read' : `Mark all ${unreadCount} notifications as read`}
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={() => loadNotifications()}
            className="btn btn-ghost p-2"
            aria-label="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center justify-between animate-fade-in" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadNotifications()} className="label underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* FILTER CHIPS */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">
        {(['ALL', 'UNREAD', 'EVENT', 'ACADEMIC', 'VOTING', 'VIDEO'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            role="tab"
            aria-selected={activeFilter === filter}
            className={`btn ${activeFilter === filter ? 'btn-primary' : 'btn-secondary'} text-xs`}
          >
            {filter === 'ALL'
              ? 'All Notifications'
              : filter === 'UNREAD'
              ? `Unread (${unreadCount})`
              : filter === 'VIDEO'
              ? 'Video Reviews'
              : filter}
          </button>
        ))}
      </div>

      {/* NOTIFICATIONS LIST */}
      {filteredNotifs.length === 0 ? (
        <div className="surface text-center py-16 px-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No notifications to display</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto">
            You're all caught up! New updates from faculty, moderation, or event registrations will appear here.
          </p>
        </div>
      ) : (
        <div className="surface divide-y animate-fade-in">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n); }}}
              tabIndex={0}
              role="button"
              aria-label={!n.isRead ? 'Unread notification' : 'Read notification'}
              className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer group ${
                !n.isRead ? 'bg-brand-soft/50 hover:bg-brand-soft' : 'hover:bg-surface-sunken'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-surface-sunken border border-edge shrink-0 mt-0.5">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-draft text-[10px]">
                      {n.type}
                    </span>
                    <h4
                      className={`text-body-sm ${
                        !n.isRead ? 'font-bold text-ink font-heading' : 'font-medium text-ink-secondary'
                      }`}
                    >
                      {n.title}
                    </h4>
                  </div>
                  <span className="text-label-sm text-ink-muted shrink-0">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>

                <p className="text-body-sm text-ink-secondary leading-relaxed">{n.message}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-1">
                {/* Non-color cue for unread: filled circle + "unread" label for screen readers */}
                {!n.isRead && (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-brand block" aria-hidden="true" />
                    <span className="sr-only">Unread</span>
                  </>
                )}
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-transform duration-fast" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOAD MORE */}
      {hasMore && (
        <div className="text-center pt-1 animate-fade-in">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
            aria-busy={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 rotate-90" aria-hidden="true" />
            )}
            <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
