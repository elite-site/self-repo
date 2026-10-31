import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiClient: client }));

import { settingsApi } from './index';

beforeEach(() => {
  client.get.mockReset();
  client.put.mockReset();
});

describe('settingsApi', () => {
  it('reads portal settings from /admin/api/portal/settings', async () => {
    client.get.mockResolvedValue({ data: { settings: { portal_title: 'Portal' } } });

    await expect(settingsApi.getSettings()).resolves.toEqual({
      settings: { portal_title: 'Portal' },
    });
    expect(client.get).toHaveBeenCalledWith('/admin/api/portal/settings');
  });

  it('writes portal settings with PUT /admin/api/portal/settings', async () => {
    client.put.mockResolvedValue({ data: { success: true, message: 'saved' } });
    const settings = { portal_title: 'Portal', academic_year: '2026' };

    await settingsApi.updateSettings(settings);

    expect(client.put).toHaveBeenCalledWith('/admin/api/portal/settings', settings);
  });

  it('does not expose the uncalled change-request actions', () => {
    expect('getChangeRequests' in settingsApi).toBe(false);
    expect('approveChangeRequest' in settingsApi).toBe(false);
    expect('rejectChangeRequest' in settingsApi).toBe(false);
  });
});
