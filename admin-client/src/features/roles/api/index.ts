import { apiClient } from '@/shared/api';
import { RolesResponse, RoleItem, RoleAssignmentItem } from '../types';

export const rolesApi = {
  async getRoles(): Promise<RolesResponse> {
    const res = await apiClient.get('/admin/api/roles');
    return res.data;
  },

  async createRole(data: { name: string; description?: string }): Promise<RoleItem> {
    const res = await apiClient.post('/admin/api/portal/roles', data);
    return res.data;
  },

  async updateRole(id: string, data: { description?: string }): Promise<RoleItem> {
    const res = await apiClient.put(`/admin/api/portal/roles/${id}`, data);
    return res.data;
  },

  async assignRole(
    adminId: string,
    roleId: string
  ): Promise<{ success: boolean; assignment: RoleAssignmentItem }> {
    const res = await apiClient.post('/admin/api/roles/assign', { adminId, roleId });
    return res.data;
  },
};
