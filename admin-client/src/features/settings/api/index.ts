import { apiClient } from '@/shared/api';
import { SettingsResponse, ChangeRequest } from '../types';

export const settingsApi = {
  async getSettings(): Promise<SettingsResponse> {
    const res = await apiClient.get('/admin/api/portal/settings');
    return res.data;
  },

  async updateSettings(data: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.put('/admin/api/portal/settings', data);
    return res.data;
  },

  async getChangeRequests(): Promise<ChangeRequest[]> {
    const res = await apiClient.get('/admin/api/portal/change-requests');
    return res.data;
  },

  async approveChangeRequest(id: string): Promise<{ success: boolean; changeRequest: any }> {
    const res = await apiClient.post(`/admin/api/portal/change-requests/${id}/approve`);
    return res.data;
  },

  async rejectChangeRequest(id: string, reason?: string): Promise<{ success: boolean; changeRequest: any }> {
    const res = await apiClient.post(`/admin/api/portal/change-requests/${id}/reject`, { reason });
    return res.data;
  },
};
