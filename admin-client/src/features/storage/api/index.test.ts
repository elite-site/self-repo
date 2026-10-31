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
});
