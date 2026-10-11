import { useState, useEffect, useCallback } from 'react';
import { announcementsApi } from '../api';
import { Announcement } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const useAnnouncements = () => {
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementsApi.getAnnouncements();
      const list = Array.isArray(res) ? res : (res?.announcements ?? []);
      setAnnouncements(list);
    } catch {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

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
      setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Failed to delete the announcement. Please retry.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return {
    announcements,
    loading,
    error,
    actionError,
    setActionError,
    deletingId,
    showCompose,
    setShowCompose,
    fetchAnnouncements,
    handleDelete,
  };
};
