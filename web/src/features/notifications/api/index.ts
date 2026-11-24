import { client } from '@/shared/api/client';
import {
  isNotificationPollingPaused,
  pauseNotificationPolling,
  resumeNotificationPolling,
} from '@/shared/api';
import { Announcement } from '../types';

export { isNotificationPollingPaused, pauseNotificationPolling, resumeNotificationPolling };

interface NotificationFilters {
  limit?: number;
  offset?: number;
  isBackgroundPoll?: boolean;
}

export const notificationsApi = {
  async getNotifications(filters?: NotificationFilters) {
    if (isNotificationPollingPaused() && filters?.isBackgroundPoll) {
      return { notifications: [], unreadCount: 0 };
    }
    const res = await client.get('/student/notifications', { params: filters });
    return res.data;
  },

  async markNotificationRead(id: string) {
    const res = await client.patch(`/student/notifications/${id}/read`);
    return res.data;
  },

  async markAllNotificationsRead() {
    const res = await client.patch('/student/notifications/read-all');
    return res.data;
  },

  async deleteNotification(id: string) {
    const res = await client.delete(`/student/notifications/${encodeURIComponent(id)}`);
    return res.data;
  },

  async deleteNotificationsByQuery(q: string) {
    const res = await client.delete('/student/notifications/query', { params: { q } });
    return res.data;
  },

  async getAnnouncement(id: string): Promise<Announcement> {
    const res = await client.get(`/student/announcements/${encodeURIComponent(id)}`);
    return res.data;
  },
};
