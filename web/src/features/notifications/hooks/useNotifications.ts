import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api';
import { Notification, NotificationFilterType } from '../types';
import { getNotificationDestination, navigateToNotification } from '@/shared/utils/notificationRouting';
import { useToast } from '@/shared/ui/Toast';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

interface NotificationsPageData {
  items: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

export function useNotifications() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [extraNotifs, setExtraNotifs] = useState<Notification[]>([]);
  const [extraHasMore, setExtraHasMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const { data, isPending, isError, refetch } = useQuery<NotificationsPageData>({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const res: any = await notificationsApi.getNotifications({ limit: 20 });
      if (!res || !Array.isArray(res.items)) {
        throw new Error('Could not load notifications.');
      }
      return {
        items: res.items.filter((item: any) => item.type !== 'EVENT'),
        unreadCount: typeof res.unreadCount === 'number' ? res.unreadCount : 0,
        hasMore: Boolean(res.hasMore),
      };
    },
    staleTime: 30_000,
  });

  const notifs = useMemo(() => {
    const base = data?.items ?? [];
    if (extraNotifs.length === 0) return base;
    const seen = new Set(base.map((n) => n.id));
    return [...base, ...extraNotifs.filter((n) => !seen.has(n.id))];
  }, [data?.items, extraNotifs]);

  const unreadCount = data?.unreadCount ?? 0;
  const hasMore = extraHasMore ?? data?.hasMore ?? false;

  const loadNotifications = useCallback(
    async (_silent = false) => {
      setPaginationError(null);
      setExtraNotifs([]);
      setExtraHasMore(null);
      await refetch();
    },
    [refetch],
  );

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const res: any = await notificationsApi.getNotifications({ limit: 20, offset: notifs.length });
      if (res && Array.isArray(res.items)) {
        const activeItems = res.items.filter((item: any) => item.type !== 'EVENT');
        setExtraNotifs((prev) => [...prev, ...activeItems]);
        setExtraHasMore(Boolean(res.hasMore));
      }
    } catch {
      setPaginationError('Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const syncBadgeAndDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: ['student', 'notifications', 'unread-count'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllNotificationsRead();
      setExtraNotifs((prev) => prev.map((n) => ({ ...n, isRead: true, status: 'READ' })));
      await loadNotifications(true);
      syncBadgeAndDashboard();
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
      queryClient.setQueryData<NotificationsPageData>(notificationKeys.list(), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((n) => (n.id === id ? { ...n, isRead: true, status: 'READ' } : n)),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        };
      });
      setExtraNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, status: 'READ' } : n)),
      );
      syncBadgeAndDashboard();
    } catch {
      // Non-fatal: notification state refresh failure
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const target = notifs.find((n) => n.id === id);
    const wasUnread = Boolean(target && !target.isRead && target.status !== 'READ');
    queryClient.setQueryData<NotificationsPageData>(notificationKeys.list(), (prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
          }
        : prev,
    );
    setExtraNotifs((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationsApi.deleteNotification(id);
      syncBadgeAndDashboard();
      showToast('Notification deleted.');
    } catch {
      showToast('Failed to delete notification.', 'error');
      await loadNotifications(true);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      void handleMarkSingleRead(n.id);
    }
    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  const filteredNotifs = useMemo(() => {
    return notifs.filter((n) => {
      if (n.type === 'EVENT') return false;
      if (activeFilter === 'UNREAD') return !n.isRead;
      if (activeFilter === 'VIDEO') return n.type === 'MODERATION';
      if (activeFilter !== 'ALL') return n.type === activeFilter;
      return true;
    });
  }, [notifs, activeFilter]);

  return {
    notifs,
    unreadCount,
    hasMore,
    loading: isPending && !data,
    loadingMore,
    error: paginationError ?? (isError && !data ? 'Could not load notifications.' : null),
    activeFilter,
    setActiveFilter,
    markingAll,
    filteredNotifs,
    loadNotifications,
    handleLoadMore,
    handleMarkAllRead,
    handleDeleteNotification,
    handleNotificationClick,
  };
}
