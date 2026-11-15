import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiClient: client }));

import { storageApi } from './index';

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
});

describe('storageApi', () => {
  it('reads storage stats from /admin/api/storage', async () => {
    const stats = { drive: {}, inventory: {}, system: {} };
    client.get.mockResolvedValue({ data: stats });

    await expect(storageApi.getStorageStats()).resolves.toEqual(stats);
    expect(client.get).toHaveBeenCalledWith('/admin/api/storage');
  });

  it('clears the drive cache on /admin/api/storage/clear-cache', async () => {
    client.post.mockResolvedValue({ data: { success: true, message: 'ok' } });

    await storageApi.clearStorageCache();

    expect(client.post).toHaveBeenCalledWith('/admin/api/storage/clear-cache');
  });

  it('requests viewer permissions on /admin/api/storage/ensure-viewer-permissions', async () => {
    const response = { success: true, message: 'ok', count: 3, failed: 0 };
    client.post.mockResolvedValue({ data: response });

    await expect(storageApi.ensureDriveViewerPermissions()).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith('/admin/api/storage/ensure-viewer-permissions');
  });

  it('fetches video cache status with params', async () => {
    const mockData = {
      entries: [],
      totals: { usedBytes: '0', maxBytes: '100000', counts: { ready: 0, copying: 0, failed: 0, total: 0 } },
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
    client.get.mockResolvedValue({ data: mockData });

    const result = await storageApi.getVideoCache({ page: 2, limit: 10, status: 'READY' });
    expect(result).toEqual(mockData);
    expect(client.get).toHaveBeenCalledWith('/admin/api/video-cache', {
      params: { page: 2, limit: 10, status: 'READY' },
    });
  });

  it('triggers video cache retry on /admin/api/video-cache/:id/retry', async () => {
    client.post.mockResolvedValue({ data: { success: true, message: 'Copy retry initiated' } });

    const result = await storageApi.retryVideoCache('vc-123');
    expect(result).toEqual({ success: true, message: 'Copy retry initiated' });
    expect(client.post).toHaveBeenCalledWith('/admin/api/video-cache/vc-123/retry');
  });

  it('triggers video cache purge on /admin/api/video-cache/purge-idle', async () => {
    client.post.mockResolvedValue({ data: { success: true, evictedCount: 2, freedBytes: '1048576' } });

    const result = await storageApi.purgeIdleVideoCache();
    expect(result).toEqual({ success: true, evictedCount: 2, freedBytes: '1048576' });
    expect(client.post).toHaveBeenCalledWith('/admin/api/video-cache/purge-idle');
  });
});
