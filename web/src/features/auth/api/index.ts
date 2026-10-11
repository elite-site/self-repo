import { client } from '@/shared/api/client';

export const authApi = {
  getOAuthAuthorizeUrl(): string {
    const rawBase = client.defaults.baseURL || '/api';
    let base = rawBase.trim().replace(/\/+$/, '');
    if (!base.endsWith('/api')) {
      base = `${base}/api`;
    }

    const returnTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    const returnParam = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : '';

    if (/^https?:\/\//i.test(base)) {
      return `${base}/student/google/authorize${returnParam}`;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';
    const path = base.startsWith('/') ? base : `/${base}`;
    return `${origin}${path}/student/google/authorize${returnParam}`;
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await client.post('/student/logout');
    return res.data;
  },
};
