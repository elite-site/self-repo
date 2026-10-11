import { client } from '@/shared/api/client';
import { Project, Certificate, Achievement, StudentPortfolioResponse } from '@/shared/types';

export const portfolioApi = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await client.get('/student/portfolio/projects');
    return res.data;
  },
  async createProject(data: any): Promise<Project> {
    const res = await client.post('/student/portfolio/projects', data);
    return res.data;
  },
  async updateProject(id: string, data: any): Promise<Project> {
    const res = await client.put(`/student/portfolio/projects/${id}`, data);
    return res.data;
  },
  async deleteProject(id: string): Promise<{ success: boolean }> {
    const res = await client.delete(`/student/portfolio/projects/${id}`);
    return res.data;
  },

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    const res = await client.get('/student/portfolio/achievements');
    return res.data;
  },
  async createAchievement(data: any): Promise<Achievement> {
    const res = await client.post('/student/portfolio/achievements', data);
    return res.data;
  },
  async updateAchievement(id: string, data: any): Promise<Achievement> {
    const res = await client.put(`/student/portfolio/achievements/${id}`, data);
    return res.data;
  },
  async deleteAchievement(id: string): Promise<{ success: boolean }> {
    const res = await client.delete(`/student/portfolio/achievements/${id}`);
    return res.data;
  },

  // Certificates
  async getCertificates(): Promise<Certificate[]> {
    const res = await client.get('/student/portfolio/certificates');
    return res.data;
  },
  async uploadCertificate(formData: FormData): Promise<Certificate> {
    const res = await client.post('/student/portfolio/certificates', formData);
    return res.data;
  },
  async setCertificatePublic(id: string, isPublic: boolean): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch(`/student/portfolio/certificates/${id}/visibility`, { isPublic });
    return res.data;
  },
  async setPortfolioPublic(
    kind: 'achievements' | 'projects' | 'certificates',
    id: string,
    isPublic: boolean,
  ): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch(`/student/portfolio/${kind}/${id}/visibility`, { isPublic });
    return res.data;
  },
  async deleteCertificate(id: string): Promise<{ success: boolean }> {
    const res = await client.delete(`/student/portfolio/certificates/${id}`);
    return res.data;
  },

  async getStudentPortfolio(): Promise<StudentPortfolioResponse> {
    const res = await client.get('/student/portfolio');
    return res.data;
  },
};
