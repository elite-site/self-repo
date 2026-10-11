import { apiClient } from '@/shared/api';
import { ActivityLogsResponse } from '../types';

export const activityLogApi = {
  async getActivityLogs(params: {
    eventId?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ActivityLogsResponse> {
    const res = await apiClient.get('/admin/api/activity-logs', { params });
    return res.data;
  },

  getActivityLogsExportUrl(): string {
    return '/admin/api/activity-logs/export';
  },
};
