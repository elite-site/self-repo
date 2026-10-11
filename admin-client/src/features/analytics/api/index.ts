import { apiClient } from '@/shared/api';
import { AdminStats, AnalyticsResponse } from '../types';

export const analyticsApi = {
  async getStats(eventId?: string): Promise<AdminStats> {
    const res = await apiClient.get('/admin/api/stats', { params: { eventId } });
    return res.data;
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    const res = await apiClient.get('/admin/api/portal/analytics');
    return res.data;
  },
};
