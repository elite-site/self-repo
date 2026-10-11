import { apiClient } from '@/shared/api';
import { GithubOverview, GithubLog } from '../types';

export const githubApi = {
  async getGithubOverview(params?: { search?: string; page?: number; limit?: number }): Promise<GithubOverview> {
    const res = await apiClient.get('/admin/api/portal/github/overview', { params });
    return res.data;
  },

  async getGithubLogs(params?: { status?: string; filter?: string }): Promise<GithubLog[]> {
    const res = await apiClient.get('/admin/api/portal/github/logs', { params });
    return res.data;
  },

  async resyncStudentGithub(studentId: string): Promise<any> {
    const res = await apiClient.post(`/admin/api/portal/github/resync/${studentId}`);
    return res.data;
  },

  async getGithubShowcasedProjects(params?: { search?: string; page?: number; limit?: number }): Promise<any> {
    const res = await apiClient.get('/admin/api/portal/github/projects', { params });
    return res.data;
  },
};
