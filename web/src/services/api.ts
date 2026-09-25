import axios from 'axios';
import { StudentProfile } from '../types';

let currentToken: string | null = null;
try {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('ita_student_session') : null;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.token) currentToken = parsed.token;
  }
} catch {}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
});

client.interceptors.request.use((config) => {
  if (!currentToken && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ita_student_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) currentToken = parsed.token;
      }
    } catch {}
  }
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

export const setStudentToken = (token: string | null) => {
  currentToken = token;
};

export const api = {
  // Original methods
  getOAuthAuthorizeUrl(): string {
    return `${client.defaults.baseURL}/student/google/authorize`;
  },
  async getMe(): Promise<{ student: StudentProfile; reviewStatus?: string }> {
    const res = await client.get('/student/me');
    return res.data;
  },
  async submitVideo(formData: FormData, onUploadProgress?: (ev: any) => void): Promise<{ success: boolean; id: string; message?: string }> {
    const res = await client.post('/student/submission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },
  async getVideoBlobUrl(): Promise<string> {
    const res = await client.get(`/student/submission/media/video?t=${Date.now()}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },

  // Profile
  async getProfile() {
    const res = await client.get('/student/profile');
    return res.data;
  },
  async updateProfile(data: Partial<StudentProfile>) {
    const res = await client.put('/student/profile', data);
    return res.data;
  },
  async uploadProfilePhoto(formData: FormData, onProgress?: (ev: any) => void) {
    const res = await client.post('/student/profile/photo', formData, { onUploadProgress: onProgress });
    return res.data;
  },
  async submitChangeRequest(data: any) {
    const res = await client.post('/student/profile/change-request', data);
    return res.data;
  },
  async updateSkills(skillNames: string[]) {
    const res = await client.put('/student/profile/skills', { skillNames });
    return res.data;
  },

  // Portfolio - Projects
  async getProjects() { const res = await client.get('/student/portfolio/projects'); return res.data; },
  async createProject(data: any) { const res = await client.post('/student/portfolio/projects', data); return res.data; },
  async updateProject(id: string, data: any) { const res = await client.put(`/student/portfolio/projects/${id}`, data); return res.data; },
  async deleteProject(id: string) { const res = await client.delete(`/student/portfolio/projects/${id}`); return res.data; },
  async reorderProjects(ids: string[]) { const res = await client.put('/student/portfolio/projects/reorder', { ids }); return res.data; },

  // Portfolio - Achievements
  async getAchievements() { const res = await client.get('/student/portfolio/achievements'); return res.data; },
  async createAchievement(data: any) { const res = await client.post('/student/portfolio/achievements', data); return res.data; },
  async updateAchievement(id: string, data: any) { const res = await client.put(`/student/portfolio/achievements/${id}`, data); return res.data; },
  async deleteAchievement(id: string) { const res = await client.delete(`/student/portfolio/achievements/${id}`); return res.data; },

  // Portfolio - Certificates
  async getCertificates() { const res = await client.get('/student/portfolio/certificates'); return res.data; },
  async uploadCertificate(formData: FormData) { const res = await client.post('/student/portfolio/certificates', formData); return res.data; },
  async deleteCertificate(id: string) { const res = await client.delete(`/student/portfolio/certificates/${id}`); return res.data; },

  // Resume
  async getResume() { const res = await client.get('/student/resume'); return res.data; },
  async uploadResume(formData: FormData, onProgress?: (ev: any) => void) { const res = await client.post('/student/resume', formData, { onUploadProgress: onProgress }); return res.data; },

  // Events
  async getEvents(filters?: any) { const res = await client.get('/student/events', { params: filters }); return res.data; },
  async getEvent(id: string) { const res = await client.get(`/student/events/${id}`); return res.data; },
  async registerForEvent(id: string, data: any) { const res = await client.post(`/student/events/${id}/register`, data); return res.data; },
  async getRegistrations() { const res = await client.get('/student/registrations'); return res.data; },
  async cancelRegistration(id: string) { const res = await client.post(`/student/registrations/${id}/cancel`); return res.data; },

  // Teams
  async getMyTeams() { const res = await client.get('/student/teams'); return res.data; },
  async createTeam(data: any) { const res = await client.post('/student/teams', data); return res.data; },
  async inviteToTeam(teamId: string, rollNo: string) { const res = await client.post(`/student/teams/${teamId}/invite`, { rollNo }); return res.data; },
  async getTeamInvitations() { const res = await client.get('/student/team-invitations'); return res.data; },
  async acceptInvitation(id: string) { const res = await client.post(`/student/team-invitations/${id}/accept`); return res.data; },
  async declineInvitation(id: string) { const res = await client.post(`/student/team-invitations/${id}/decline`); return res.data; },

  // Voting
  async getVotingCampaigns() { const res = await client.get('/student/voting'); return res.data; },
  async castVote(campaignId: string, candidateId: string) { const res = await client.post(`/student/voting/${campaignId}/vote`, { candidateId }); return res.data; },

  // Notifications
  async getNotifications(filters?: any) { const res = await client.get('/student/notifications', { params: filters }); return res.data; },
  async markNotificationRead(id: string) { const res = await client.patch(`/student/notifications/${id}/read`); return res.data; },
  async markAllNotificationsRead() { const res = await client.patch('/student/notifications/read-all'); return res.data; },

  // Public
  async getPublicStudents(params?: any) { const res = await client.get('/public/students', { params }); return res.data; },
  async getPublicStudent(rollNo: string) { const res = await client.get(`/public/students/${rollNo}`); return res.data; },
  async getPublicEvents() { const res = await client.get('/public/events'); return res.data; },
  async getPublicEvent(id: string) { const res = await client.get(`/public/events/${id}`); return res.data; },
};

export async function clearStudentToken() {
  setStudentToken(null);
}
