import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isNotificationPollingPaused } from '@/shared/api';
import { notificationsApi } from '../api';

const UNREAD_COUNT_QUERY_KEY = ['student', 'notifications', 'unread-count'] as const;
const MIN_UNREAD_POLL_INTERVAL_MS = 15_000;
let lastUnreadFetchTimestamp = 0;

/**
 * Badge count for the shell. The route owns this read and hands the number to
 * the shell, so the shared layout never has to import a feature API.
 */
export function useUnreadCount(pathname: string | null): number {
  const { data, refetch } = useQuery<{ unreadCount?: number }>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.getNotifications({ limit: 10, isBackgroundPoll: true }),
    enabled: false,
    retry: false,
  });

  useEffect(() => {
    if (!pathname || isNotificationPollingPaused()) return;
    const now = Date.now();
    if (now - lastUnreadFetchTimestamp < MIN_UNREAD_POLL_INTERVAL_MS) return;
    lastUnreadFetchTimestamp = now;
    void refetch();
  }, [pathname, refetch]);

  return typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
}
