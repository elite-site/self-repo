import { useQuery } from '@tanstack/react-query';
import { isNotificationPollingPaused } from '@/shared/api';
import { UNREAD_COUNT_QUERY_KEY } from '@/shared/lib/queryClient';
import { notificationsApi } from '../api';

/**
 * Badge count for the shell. The route owns this read and hands the number to
 * the shell, so the shared layout never has to import a feature API.
 *
 * Skips `/dashboard` because `useDashboard` already fetches and seeds
 * `UNREAD_COUNT_QUERY_KEY` from `/student/dashboard` without a second request.
 */
export function useUnreadCount(pathname: string | null): number {
  const { data } = useQuery<{ unreadCount?: number }>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.getNotifications({ limit: 10, isBackgroundPoll: true }),
    enabled: Boolean(pathname) && pathname !== '/dashboard' && !isNotificationPollingPaused(),
    staleTime: 60_000,
    retry: false,
  });

  return typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
}
