import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api';
import { Notification, NotificationFilterType } from '../types';
import { getNotificationDestination, navigateToNotification } from '@/shared/utils/notificationRouting';
import { useToast } from '@/shared/ui/Toast';

export function useNotifications() {
  const { showToast } = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('ALL');
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data: any = await notificationsApi.getNotifications({ limit: 20 });
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
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data: any = await notificationsApi.getNotifications({ limit: 20, offset: notifs.length });
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
      await notificationsApi.markAllNotificationsRead();
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
      await notificationsApi.markNotificationRead(id);
      await loadNotifications(true);
    } catch (err) {
      // Non-fatal: notification state refresh failure
      console.warn('Failed to mark notification as read:', err);
    }
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
    if (activeFilter === 'VIDEO') return n.type === 'MODERATION';
    if (activeFilter !== 'ALL') return n.type === activeFilter;
    return true;
  });

  return {
    notifs,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    error,
    activeFilter,
    setActiveFilter,
    markingAll,
    filteredNotifs,
    loadNotifications,
    handleLoadMore,
    handleMarkAllRead,
    handleNotificationClick,
  };
}
