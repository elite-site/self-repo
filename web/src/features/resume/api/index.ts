import { client } from '@/shared/api/client';
import { ResumeData } from '../types';

export const resumeApi = {
  async getResume(): Promise<ResumeData | ResumeData[]> {
    const res = await client.get('/student/resume');
    return res.data;
  },

  async uploadResume(formData: FormData, onProgress?: (ev: any) => void): Promise<{ success: boolean; resume?: ResumeData }> {
    const res = await client.post('/student/resume', formData, { onUploadProgress: onProgress });
    return res.data;
  },

  async deleteResume(): Promise<{ success: boolean; message?: string }> {
    const res = await client.delete('/student/resume');
    return res.data;
  },
};
