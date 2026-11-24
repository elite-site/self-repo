import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../api/index';
import { CreateAnnouncementPayload } from '../types';

export const ANNOUNCEMENTS_QUERY_KEY = ['admin', 'announcements'] as const;

export function useAudiencePreviewQuery(audience: string) {
  const query = useQuery({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, 'preview', audience],
    queryFn: () => announcementsApi.getAnnouncementAudiencePreview(audience),
    retry: false,
  });

  return query.isError ? null : (query.data?.count ?? null);
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAnnouncementPayload) =>
      announcementsApi.createAnnouncement(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY }),
  });
}
