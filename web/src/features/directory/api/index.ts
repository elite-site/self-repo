import { client, cachedFetch } from '@/shared/api';
import { publicProfileApi } from '@/features/public-profile/api';
import { DirectoryStudent, SkillItem } from '../types';

export const directoryApi = {
  async getPublicStudents(params?: any): Promise<{ students: DirectoryStudent[]; total: number; page: number; totalPages: number }> {
    const hasFilters = params && (
      params.search ||
      (params.year && params.year !== 'ALL') ||
      (params.section && params.section !== 'ALL') ||
      params.skillName ||
      (params.status && params.status !== 'ALL') ||
      (params.page && params.page > 1)
    );
    if (hasFilters) {
      const res = await client.get('/public/students', { params });
      return res.data;
    }
    const key = `students_${JSON.stringify(params || {})}`;
    return cachedFetch(key, 30_000, async () => {
      const res = await client.get('/public/students', { params });
      return res.data;
    });
  },

  async getPublicSkills(): Promise<SkillItem[]> {
    return cachedFetch('skills', 60_000, async () => {
      const res = await client.get('/public/students/skills');
      return Array.isArray(res.data) ? res.data : [];
    });
  },

  getPublicStudent: publicProfileApi.getPublicStudent,
};
