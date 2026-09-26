import axios from 'axios';
import { PublicIntroVideo, StudentProfile } from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

// Automatically attach Bearer token if present in localStorage (cross-domain & iOS Safari support)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('student_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  pct: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number | null;
}

export const api = {
  // Original methods
  getOAuthAuthorizeUrl(): string {
    return `${client.defaults.baseURL}/student/google/authorize`;
  },
  async getMe(): Promise<{ student: StudentProfile; reviewStatus?: string }> {
    const res = await client.get('/student/me');
    return res.data;
  },
  async logout(): Promise<{ success: boolean }> {
    const res = await client.post('/student/logout');
    return res.data;
  },
  async submitVideo(formData: FormData, onUploadProgress?: (ev: any) => void): Promise<{ success: boolean; id: string; message?: string }> {
    const res = await client.post('/student/submission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  /**
   * Streaming video upload — sends the File object as a raw binary body
   * (Content-Type: video/mp4) directly to the backend streaming endpoint.
   *
   * The backend pipes the incoming request stream straight through to Google
   * Drive with zero in-memory buffering, so this works reliably even when
   * Render has a tight memory limit and the video is up to 25 MB.
   *
   * Uses XHR with upload.onprogress to report byte-level progress, speed,
   * and ETA. Also supports AbortSignal so uploads can be cancelled cleanly.
   */
  submitVideoStream(
    file: File,
    onProgress?: (progress: UploadProgressInfo) => void,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; id: string; message?: string }> {
    return new Promise((resolve, reject) => {
      const base = (client.defaults.baseURL ?? 'http://localhost:5001/api')
        .replace(/\/api\/?$/, '');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/api/student/submission/video-stream`);
      xhr.withCredentials = true;                            // send session cookie
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));

      const token = localStorage.getItem('student_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (signal) {
        if (signal.aborted) {
          reject(new Error('Upload was cancelled.'));
          return;
        }
        signal.addEventListener('abort', () => xhr.abort());
      }

      let lastTime = Date.now();
      let lastLoaded = 0;
      let currentSpeed = 0;

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.25 || e.loaded === e.total) {
              const bytesDiff = e.loaded - lastLoaded;
              if (timeDiff > 0) {
                currentSpeed = bytesDiff / timeDiff;
              }
              lastTime = now;
              lastLoaded = e.loaded;
            }

            const remainingBytes = Math.max(0, e.total - e.loaded);
            const estimatedRemainingSec =
              currentSpeed > 50000 ? Math.ceil(remainingBytes / currentSpeed) : null;

            onProgress({
              loaded: e.loaded,
              total: e.total,
              pct: Math.min(100, Math.round((e.loaded * 100) / e.total)),
              speedBytesPerSec: currentSpeed,
              estimatedRemainingSec,
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Invalid response from server')); }
        } else {
          try {
            const body = JSON.parse(xhr.responseText);
            reject(new Error(body?.message ?? `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error — check your connection and try again.')));
      xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

      // Send the File object directly — browser sets Content-Length automatically
      xhr.send(file);
    });
  },
  async getVideoBlobUrl(): Promise<string> {
    const res = await client.get(`/student/submission/media/video?t=${Date.now()}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },

  /**
   * Publish / unpublish the student's own video on the public showcase.
   * The backend rejects publishing a video that has not been approved yet.
   */
  async setVideoPublic(isPublic: boolean): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch('/student/submission/video-visibility', { isPublic });
    return res.data;
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

  // Announcements
  async getAnnouncement(id: string) { const res = await client.get(`/student/announcements/${encodeURIComponent(id)}`); return res.data; },

  // Public
  async getPublicStudents(params?: any) { const res = await client.get('/public/students', { params }); return res.data; },
  async getPublicStudent(rollNo: string) { const res = await client.get(`/public/students/${rollNo}`); return res.data; },
  async getPublicEvents() { const res = await client.get('/public/events'); return res.data; },
  async getPublicEvent(id: string) { const res = await client.get(`/public/events/${id}`); return res.data; },

  /** Approved + published introduction videos (empty until a video is approved). */
  async getPublicVideos(limit?: number): Promise<{ items: PublicIntroVideo[]; total: number }> {
    const res = await client.get('/public/videos', { params: limit ? { limit } : undefined });
    return { items: res.data?.items ?? [], total: res.data?.total ?? 0 };
  },
};

/** Absolute URL for a media path returned by the API (works in <video src>). */
export function resolveMediaUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (client.defaults.baseURL ?? '')
    .replace(/\/api\/?$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
