import { apiClient } from '@/shared/api';
import { StorageStatsResponse, VideoCacheResponse } from '../types';

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

  async getVideoCache(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<VideoCacheResponse> {
    const res = await apiClient.get('/admin/api/video-cache', { params });
    return res.data;
  },

  async retryVideoCache(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(`/admin/api/video-cache/${id}/retry`);
    return res.data;
  },

  async purgeIdleVideoCache(): Promise<{
    success: boolean;
    evictedCount: number;
    freedBytes: string;
    expiredLeasesDeleted?: number;
  }> {
    const res = await apiClient.post('/admin/api/video-cache/purge-idle');
    return res.data;
  },
};
