import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api';
import { Announcement } from '../types';

const ANNOUNCEMENT_QUERY_KEY = ['student', 'announcement'] as const;
const ANNOUNCEMENT_UNAVAILABLE = 'This announcement is no longer available.';

export function useAnnouncement(id: string | undefined) {
  const query = useQuery<Announcement | null>({
    queryKey: [...ANNOUNCEMENT_QUERY_KEY, id],
    queryFn: () => (id ? notificationsApi.getAnnouncement(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    retry: false,
  });

  return {
    announcement: query.data ?? null,
    loading: Boolean(id) && query.isPending,
    error: query.isError ? ANNOUNCEMENT_UNAVAILABLE : null,
  };
}
