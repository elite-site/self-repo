import { client } from '@/shared/api/client';
import { StudentDashboardResponse } from '@/shared/types';

export const dashboardApi = {
  async getDashboard(): Promise<StudentDashboardResponse> {
    const res = await client.get('/student/dashboard');
    return res.data;
  },
};
