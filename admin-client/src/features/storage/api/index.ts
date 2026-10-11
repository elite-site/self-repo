import { apiClient } from '@/shared/api';
import { StorageStatsResponse } from '../types';

export const storageApi = {
  async getStorageStats(): Promise<StorageStatsResponse> {
    const res = await apiClient.get('/admin/api/storage');
    return res.data;
  },

  async clearStorageCache(): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post('/admin/api/storage/clear-cache');
    return res.data;
  },

  async ensureDriveViewerPermissions(): Promise<{ success: boolean; message: string; count: number; failed: number }> {
    const res = await apiClient.post('/admin/api/storage/ensure-viewer-permissions');
    return res.data;
  },
};
