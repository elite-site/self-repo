import { client, cachedFetch } from '@/shared/api';
import { PublicStudent } from '../types';

export const publicProfileApi = {
  async getPublicStudent(rollNo: string): Promise<PublicStudent> {
    return cachedFetch(`student_${rollNo}`, 30_000, async () => {
      const res = await client.get(`/public/students/${encodeURIComponent(rollNo)}`);
      return res.data;
    });
  },
};
