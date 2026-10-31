import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiClient: client }));

import { rolesApi } from './index';

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
  client.put.mockReset();
});

describe('rolesApi', () => {
  it('lists roles from /admin/api/roles', async () => {
    const response = { roles: [], admins: [] };
    client.get.mockResolvedValue({ data: response });

    await expect(rolesApi.getRoles()).resolves.toEqual(response);
    expect(client.get).toHaveBeenCalledWith('/admin/api/roles');
  });

  it('creates roles on the portal roles prefix', async () => {
    client.post.mockResolvedValue({ data: { id: 'role-1' } });

    await rolesApi.createRole({ name: 'REVIEWER' });

    expect(client.post).toHaveBeenCalledWith('/admin/api/portal/roles', { name: 'REVIEWER' });
  });

  it('updates roles on the portal roles prefix', async () => {
    client.put.mockResolvedValue({ data: { id: 'role-1' } });

    await rolesApi.updateRole('role-1', { description: 'Reviews submissions' });

    expect(client.put).toHaveBeenCalledWith('/admin/api/portal/roles/role-1', {
      description: 'Reviews submissions',
    });
  });

  it('assigns a role with POST /admin/api/roles/assign and an adminId/roleId body', async () => {
    client.post.mockResolvedValue({ data: { success: true, assignment: {} } });

    await rolesApi.assignRole('admin-1', 'role-2');

    expect(client.post).toHaveBeenCalledWith('/admin/api/roles/assign', {
      adminId: 'admin-1',
      roleId: 'role-2',
    });
  });
});
