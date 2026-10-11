import { client } from '@/shared/api/client';
import { StudentProfile } from '@/shared/types';

export const profileApi = {
  async getMe(): Promise<{ student: StudentProfile; reviewStatus?: string }> {
    const res = await client.get(`/student/me?t=${Date.now()}`);
    return res.data;
  },

  async getProfile(): Promise<StudentProfile> {
    const res = await client.get('/student/profile');
    return res.data;
  },

  async updateProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
    const res = await client.put('/student/profile', data);
    return res.data;
  },

  async uploadProfilePhoto(formData: FormData, onProgress?: (ev: any) => void): Promise<{ success: boolean; photoUrl: string }> {
    const res = await client.post('/student/profile/photo', formData, { onUploadProgress: onProgress });
    return res.data;
  },

  async deleteProfilePhoto(): Promise<{ success: boolean; message: string }> {
    const res = await client.delete('/student/profile/photo');
    return res.data;
  },

  async submitChangeRequest(data: any): Promise<{ success: boolean; message?: string }> {
    const res = await client.post('/student/profile/change-request', data);
    return res.data;
  },

  async updateSkills(skillNames: string[]): Promise<{ success: boolean; skills: any[] }> {
    const res = await client.put('/student/profile/skills', { skillNames });
    return res.data;
  },
};
