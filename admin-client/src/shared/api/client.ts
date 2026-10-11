import axios from 'axios';
import { AdminUser } from '@/types';

export const apiClient = axios.create({
  withCredentials: true, // required for httpOnly JWT cookie
});

export const authApi = {
  async login(username: string, password: string): Promise<{ success: boolean; user: AdminUser }> {
    const res = await apiClient.post('/admin/login', { username, password });
    return res.data;
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await apiClient.post('/admin/logout');
    return res.data;
  },

  async getMe(): Promise<{ authenticated: boolean; user?: AdminUser }> {
    const res = await apiClient.get('/admin/me');
    return res.data;
  },
};
