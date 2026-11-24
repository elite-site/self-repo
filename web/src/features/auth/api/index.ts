import { client } from '@/shared/api/client';
import { getStudentOAuthAuthorizeUrl } from '@/shared/api';

export const authApi = {
  getOAuthAuthorizeUrl(): string {
    return getStudentOAuthAuthorizeUrl();
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await client.post('/student/logout');
    return res.data;
  },
};
