import { apiClient } from '@/shared/api';
import { Announcement, CreateAnnouncementPayload } from '../types';

export const announcementsApi = {
  async getAnnouncements(): Promise<{ announcements: Announcement[] }> {
    const res = await apiClient.get('/admin/api/announcements');
    return { announcements: res.data || [] };
  },

  async createAnnouncement(data: CreateAnnouncementPayload): Promise<any> {
    const res = await apiClient.post('/admin/api/announcements', data);
    return res.data;
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/admin/api/announcements/${id}`);
    return res.data;
  },

  async getAnnouncementAudiencePreview(audience: string): Promise<{ count: number }> {
    const res = await apiClient.get('/admin/api/announcements/preview', { params: { audience } });
    return res.data;
  },
};
