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

export const NotificationsPage: React.FC = () => {
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
    } catch {
      alert('Failed to mark all as read.');
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
      <div className="py-20">
        <BrandedLoading fullScreen={false} message="Loading Notifications..." />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-[#4F46E5]" />;
      case 'ACADEMIC':
        return <Award className="w-4 h-4 text-[#4F46E5]" />;
      case 'VOTING':
        return <Vote className="w-4 h-4 text-purple-600" />;
      case 'MODERATION':
        return <Video className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] font-heading">Notification Inbox</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E11D48]/10 text-[#E11D48] border border-[#E11D48]/20">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569]">
            Announcements, event confirmations, change request decisions, and system alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E7F2] hover:bg-[#F7F8FC] text-xs font-bold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={() => loadNotifications()}
            className="p-2 border border-[#E4E7F2] rounded-lg hover:bg-[#F7F8FC] text-[#475569] hover:text-[#0F172A] cursor-pointer transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadNotifications()} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* FILTER CHIPS */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'UNREAD', 'EVENT', 'ACADEMIC', 'VOTING', 'VIDEO'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === filter
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'bg-white border border-[#E4E7F2] text-[#475569] hover:bg-[#F7F8FC]'
            }`}
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
        <div className="text-center py-20 px-4 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Bell className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0F172A] font-heading">No notifications to display</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto">
            You're all caught up! New updates from faculty, moderation, or event registrations will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E4E7F2] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-[#E4E7F2]">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer group ${
                !n.isRead ? 'bg-[#E0E7FF]/15 hover:bg-[#E0E7FF]/25' : 'hover:bg-[#F7F8FC]'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-[#F7F8FC] border border-[#E4E7F2] shadow-2xs shrink-0 mt-0.5">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#475569] bg-[#F7F8FC] border border-[#E4E7F2] px-2 py-0.5 rounded">
                      {n.type}
                    </span>
                    <h4
                      className={`text-xs sm:text-sm ${
                        !n.isRead ? 'font-bold text-[#0F172A] font-heading' : 'font-medium text-[#475569]'
                      }`}
                    >
                      {n.title}
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] shrink-0">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">{n.message}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-1">
                {!n.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] block" title="Unread" />
                )}
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOAD MORE */}
      {hasMore && (
        <div className="text-center pt-1">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E4E7F2] text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            )}
            <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

