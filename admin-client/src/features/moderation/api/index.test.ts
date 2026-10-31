import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiClient: client }));

import { moderationApi } from './index';

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
  client.patch.mockReset();
  client.delete.mockReset();
});

describe('moderationApi queue reads', () => {
  it('reads the unified queue from /admin/api/moderation', async () => {
    client.get.mockResolvedValue({ data: { items: [], total: 0 } });

    await moderationApi.getModerationItems('all', 'APPROVED');

    expect(client.get).toHaveBeenCalledWith('/admin/api/moderation', {
      params: { type: 'all', status: 'APPROVED' },
    });
  });
});

describe('moderationApi mutations', () => {
  it('applies a decision with PATCH /admin/api/moderation/:type/:id', async () => {
    client.patch.mockResolvedValue({ data: { success: true } });
    const payload = { action: 'approve' as const, publish: true };

    await moderationApi.moderationDecision('videos', 'item-1', payload);

    expect(client.patch).toHaveBeenCalledWith('/admin/api/moderation/videos/item-1', payload);
  });

  it('toggles visibility with PATCH /admin/api/moderation/:type/:id/visibility', async () => {
    client.patch.mockResolvedValue({ data: { success: true } });

    await expect(moderationApi.setModerationVisibility('resumes', 'item-2', true)).resolves.toEqual({
      success: true,
    });
    expect(client.patch).toHaveBeenCalledWith('/admin/api/moderation/resumes/item-2/visibility', {
      isPublic: true,
    });
  });

  it('deletes an item with DELETE /admin/api/moderation/:type/:id', async () => {
    client.delete.mockResolvedValue({ data: { success: true } });

    await expect(moderationApi.deleteModerationItem('certificates', 'item-3')).resolves.toEqual({
      success: true,
    });
    expect(client.delete).toHaveBeenCalledWith('/admin/api/moderation/certificates/item-3');
  });

  it('does not expose an uncalled request-changes action', () => {
    expect('requestModerationChanges' in moderationApi).toBe(false);
  });
});
