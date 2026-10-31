import { apiClient } from '@/shared/api';
import { SettingsResponse } from '../types';

export const settingsApi = {
  async getSettings(): Promise<SettingsResponse> {
    const res = await apiClient.get('/admin/api/portal/settings');
    return res.data;
  },

  async updateSettings(data: Record<string, string>): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.put('/admin/api/portal/settings', data);
    return res.data;
  },
};
