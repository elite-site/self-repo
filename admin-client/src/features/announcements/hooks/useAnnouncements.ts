import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../api/index';
import { Announcement } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const ANNOUNCEMENTS_QUERY_KEY = ['admin', 'announcements'] as const;

export const useAnnouncements = () => {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const query = useQuery<Announcement[]>({
    queryKey: ANNOUNCEMENTS_QUERY_KEY,
    queryFn: async () => {
      const res = await announcementsApi.getAnnouncements();
      return Array.isArray(res) ? res : (res?.announcements ?? []);
    },
  });

  const fetchAnnouncements = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const handleDelete = async (a: Announcement) => {
    const confirmed = await confirm({
      title: `Delete “${a.title}”?`,
      description: 'This permanently removes the announcement and the notification sent to students. This cannot be undone.',
      confirmLabel: 'Delete announcement',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(a.id);
    setActionError(null);
    try {
      await announcementsApi.deleteAnnouncement(a.id);
      queryClient.setQueryData<Announcement[]>(ANNOUNCEMENTS_QUERY_KEY, (prev = []) =>
        prev.filter((item) => item.id !== a.id),
      );
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Failed to delete the announcement. Please retry.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return {
    announcements: query.data ?? [],
    loading: query.isPending,
    error: query.isError ? 'Failed to load announcements.' : null,
    actionError,
    setActionError,
    deletingId,
    showCompose,
    setShowCompose,
    fetchAnnouncements,
    handleDelete,
  };
};
