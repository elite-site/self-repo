import { apiClient } from '@/shared/api';
import type { AdminResource, ResourceFormData, ResourceType } from '../types';

export const adminResourcesApi = {
  async getResources(params?: {
    year?: number;
    semester?: number;
    subject?: string;
    type?: ResourceType;
    search?: string;
  }): Promise<{ resources: AdminResource[]; totalCount: number }> {
    const res = await apiClient.get('/admin/api/resources', { params });
    return res.data;
  },

  async createResource(data: ResourceFormData): Promise<{ success: boolean; resource: AdminResource }> {
    const res = await apiClient.post('/admin/api/resources', data);
    return res.data;
  },

  async updateResource(
    id: string,
    data: Partial<ResourceFormData>
  ): Promise<{ success: boolean; resource: AdminResource }> {
    const res = await apiClient.put(`/admin/api/resources/${encodeURIComponent(id)}`, data);
    return res.data;
  },

  async deleteResource(id: string): Promise<{ success: boolean; id: string }> {
    const res = await apiClient.delete(`/admin/api/resources/${encodeURIComponent(id)}`);
    return res.data;
  },
};
