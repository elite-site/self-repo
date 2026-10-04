import axios from 'axios';
import { PublicIntroVideo, StudentProfile } from '../types';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If served directly from unified backend (e.g. port 5001), use relative /api
    if (isLocalhost && window.location.port === '5001') {
      return '/api';
    }
  }
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  let clean = raw.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean.replace(/\/+$/, '');
}

const client = axios.create({
  baseURL: getApiBaseUrl(),
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

// Centralized 401 handler: purge token when authenticated requests are rejected
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || '';
      if (url.includes('/student/') && !url.includes('/student/me')) {
        localStorage.removeItem('student_token');
        window.dispatchEvent(new CustomEvent('elite-session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  pct: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number | null;
}

export interface DirectUploadParams {
  sessionUrl: string;
  file: File;
  chunkSize?: number; // 8 MB default (multiple of 256 KB)
  onProgress?: (progress: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

let notificationPollingPaused = false;

export function pauseNotificationPolling(): void {
  notificationPollingPaused = true;
}

export function resumeNotificationPolling(): void {
  notificationPollingPaused = false;
}

export function isNotificationPollingPaused(): boolean {
  return notificationPollingPaused;
}

/**
 * Queries Google Drive for the current state of a resumable upload session.
 * Used when a chunk fails, to find the exact byte offset Google has received so far.
 */
async function queryResumableSessionStatus(
  sessionUrl: string,
  totalSize: number,
  signal?: AbortSignal,
): Promise<{ completed: boolean; driveFileId?: string; nextByte?: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUrl);
    xhr.setRequestHeader('Content-Range', `bytes */${totalSize}`);

    if (signal) {
      const onAbort = () => {
        xhr.abort();
        void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
        reject(new Error('Upload was cancelled.'));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ completed: true, driveFileId: data.id });
        } catch {
          resolve({ completed: false });
        }
      } else if (xhr.status === 308) {
        const range = xhr.getResponseHeader('Range');
        if (range) {
          const match = range.match(/bytes=0-(\d+)/);
          if (match) {
            resolve({ completed: false, nextByte: parseInt(match[1], 10) + 1 });
            return;
          }
        }
        resolve({ completed: false, nextByte: 0 });
      } else {
        resolve({ completed: false });
      }
    };

    xhr.onerror = () => resolve({ completed: false });
    xhr.ontimeout = () => resolve({ completed: false });
    xhr.timeout = 30_000;

    xhr.send();
  });
}

/**
 * Uploads a video file directly to Google Drive via its resumable upload session
 * in 8 MB chunks (multiple of 256 KB). Retries failed chunks up to 3 times with
 * exponential backoff and session status querying.
 *
 * Cancellation aborts the active XHR and sends a DELETE to the Google session URL.
 */
export async function uploadDirectToDrive(
  params: DirectUploadParams,
): Promise<{ driveFileId: string }> {
  const { sessionUrl, file, onProgress, signal } = params;
  const chunkSize =
    params.chunkSize && params.chunkSize % 262144 === 0
      ? params.chunkSize
      : 8 * 1024 * 1024;
  const total = file.size;

  let lastTime = Date.now();
  let lastLoaded = 0;
  let currentSpeed = 0;

  const emitProgress = (loaded: number) => {
    if (!onProgress) return;
    const now = Date.now();
    const timeDiff = (now - lastTime) / 1000;
    if (timeDiff >= 0.25 || loaded === total) {
      const bytesDiff = loaded - lastLoaded;
      if (timeDiff > 0) {
        currentSpeed = bytesDiff / timeDiff;
      }
      lastTime = now;
      lastLoaded = loaded;
    }

    const remainingBytes = Math.max(0, total - loaded);
    const estimatedRemainingSec =
      currentSpeed > 50000 ? Math.ceil(remainingBytes / currentSpeed) : null;

    onProgress({
      loaded,
      total,
      pct: Math.min(100, Math.round((loaded * 100) / total)),
      speedBytesPerSec: currentSpeed,
      estimatedRemainingSec,
    });
  };

  if (signal?.aborted) {
    void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
    throw new Error('Upload was cancelled.');
  }

  let currentByte = 0;

  while (currentByte < total) {
    if (signal?.aborted) {
      void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
      throw new Error('Upload was cancelled.');
    }

    const chunkEnd = Math.min(currentByte + chunkSize, total);
    const chunk = file.slice(currentByte, chunkEnd);
    let chunkUploaded = false;
    let driveFileId: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (signal?.aborted) {
        void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
        throw new Error('Upload was cancelled.');
      }

      try {
        const result = await new Promise<{
          status: number;
          driveFileId?: string;
          rangeHeader?: string | null;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', sessionUrl);
          xhr.setRequestHeader('Content-Range', `bytes ${currentByte}-${chunkEnd - 1}/${total}`);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          if (signal) {
            const onAbort = () => {
              xhr.abort();
              void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
              reject(new Error('Upload was cancelled.'));
            };
            if (signal.aborted) {
              onAbort();
              return;
            }
            signal.addEventListener('abort', onAbort, { once: true });
          }

          if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                emitProgress(currentByte + e.loaded);
              }
            });
          }

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve({ status: xhr.status, driveFileId: data.id });
              } catch {
                resolve({ status: xhr.status });
              }
            } else if (xhr.status === 308) {
              const rangeHeader = xhr.getResponseHeader('Range');
              resolve({ status: 308, rangeHeader });
            } else {
              reject(new Error(`Chunk upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error uploading video chunk'));
          xhr.ontimeout = () => reject(new Error('Upload chunk timed out'));
          xhr.timeout = 120_000;

          xhr.send(chunk);
        });

        if (result.status === 200 || result.status === 201) {
          if (result.driveFileId) {
            driveFileId = result.driveFileId;
          }
          chunkUploaded = true;
          currentByte = total;
          emitProgress(total);
          break;
        }

        if (result.status === 308) {
          chunkUploaded = true;
          if (result.rangeHeader) {
            const match = result.rangeHeader.match(/bytes=0-(\d+)/);
            if (match) {
              currentByte = parseInt(match[1], 10) + 1;
            } else {
              currentByte = chunkEnd;
            }
          } else {
            currentByte = chunkEnd;
          }
          emitProgress(currentByte);
          break;
        }
      } catch (err: any) {
        if (signal?.aborted || err.message?.includes('cancelled')) {
          void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
          throw new Error('Upload was cancelled.');
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          try {
            const status = await queryResumableSessionStatus(sessionUrl, total, signal);
            if (status.completed && status.driveFileId) {
              driveFileId = status.driveFileId;
              chunkUploaded = true;
              currentByte = total;
              emitProgress(total);
              break;
            }
            if (status.nextByte !== undefined) {
              currentByte = status.nextByte;
              emitProgress(currentByte);
            }
          } catch {
            // retry next
          }
        } else {
          throw new Error(`Failed to upload video chunk after 3 attempts: ${err?.message || err}`);
        }
      }
    }

    if (!chunkUploaded) {
      throw new Error(`Upload failed at byte ${currentByte}`);
    }

    if (driveFileId) {
      return { driveFileId };
    }
  }

  const finalStatus = await queryResumableSessionStatus(sessionUrl, total, signal);
  if (finalStatus.driveFileId) {
    return { driveFileId: finalStatus.driveFileId };
  }

  throw new Error('Google Drive upload did not return a valid file ID.');
}

export const api = {
  // Original methods
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
  async getMe(): Promise<{ student: StudentProfile; reviewStatus?: string }> {
    const res = await client.get(`/student/me?t=${Date.now()}`);
    return res.data;
  },
  async logout(): Promise<{ success: boolean }> {
    const res = await client.post('/student/logout');
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
  ): Promise<{ success: boolean; id: string; driveFileId?: string | null; previewUrl?: string | null; message?: string }> {
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

      xhr.addEventListener('error', () => reject(new Error('Network error. Check your connection and try again.')));
      xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

      // Send the File object directly — browser sets Content-Length automatically
      xhr.send(file);
    });
  },

  /**
   * Initiates a direct-to-Drive resumable upload session on the backend.
   * Returns { sessionUrl, chunkSize }. If the backend is running in mock mode
   * or direct upload is unavailable, it returns 501 / sessionUrl: null so callers
   * can fall back to submitVideoStream.
   */
  async createVideoUploadSession(data: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<{ sessionUrl: string | null; chunkSize: number }> {
    const res = await client.post('/student/submission/video-session', data);
    return res.data;
  },

  /**
   * Finalizes direct-to-Drive upload on backend by verifying file metadata in Drive
   * and saving the submission record in the database.
   */
  async completeVideoUpload(data: {
    driveFileId: string;
  }): Promise<{ success: boolean; id: string; videoDriveId: string; message: string }> {
    const res = await client.post('/student/submission/video-complete', data);
    return res.data;
  },

  uploadDirectToDrive,

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

  /** Withdraw the student's own introduction video. */
  async deleteVideo(): Promise<{ success: boolean; message?: string }> {
    const res = await client.delete('/student/submission');
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

  // Portfolio - Achievements
  async getAchievements() { const res = await client.get('/student/portfolio/achievements'); return res.data; },
  async createAchievement(data: any) { const res = await client.post('/student/portfolio/achievements', data); return res.data; },
  async updateAchievement(id: string, data: any) { const res = await client.put(`/student/portfolio/achievements/${id}`, data); return res.data; },
  async deleteAchievement(id: string) { const res = await client.delete(`/student/portfolio/achievements/${id}`); return res.data; },

  // Portfolio - Certificates
  async getCertificates() { const res = await client.get('/student/portfolio/certificates'); return res.data; },
  async uploadCertificate(formData: FormData) { const res = await client.post('/student/portfolio/certificates', formData); return res.data; },
  async setCertificatePublic(id: string, isPublic: boolean): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch(`/student/portfolio/certificates/${id}/visibility`, { isPublic });
    return res.data;
  },
  /**
   * Generic portfolio visibility toggle — works for achievements, projects and
   * certificates. Kept alongside setCertificatePublic for call-site clarity.
   */
  async setPortfolioPublic(
    kind: 'achievements' | 'projects' | 'certificates',
    id: string,
    isPublic: boolean,
  ): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch(`/student/portfolio/${kind}/${id}/visibility`, { isPublic });
    return res.data;
  },
  async deleteCertificate(id: string) { const res = await client.delete(`/student/portfolio/certificates/${id}`); return res.data; },

  // Resume
  async getResume() { const res = await client.get('/student/resume'); return res.data; },
  async uploadResume(formData: FormData, onProgress?: (ev: any) => void) { const res = await client.post('/student/resume', formData, { onUploadProgress: onProgress }); return res.data; },
  async deleteResume(): Promise<{ success: boolean; message?: string }> { const res = await client.delete('/student/resume'); return res.data; },

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
  async removeTeam(teamId: string) { const res = await client.delete(`/student/teams/${teamId}`); return res.data; },

  // Voting
  async getVotingCampaigns() { const res = await client.get('/student/voting'); return res.data; },
  async castVote(campaignId: string, candidateId: string) { const res = await client.post(`/student/voting/${campaignId}/vote`, { candidateId }); return res.data; },

  // Notifications
  async getNotifications(filters?: any) {
    if (notificationPollingPaused && filters?.isBackgroundPoll) {
      return { notifications: [], unreadCount: 0 };
    }
    const res = await client.get('/student/notifications', { params: filters });
    return res.data;
  },
  async markNotificationRead(id: string) { const res = await client.patch(`/student/notifications/${id}/read`); return res.data; },
  async markAllNotificationsRead() { const res = await client.patch('/student/notifications/read-all'); return res.data; },

  // Announcements
  async getAnnouncement(id: string) { const res = await client.get(`/student/announcements/${encodeURIComponent(id)}`); return res.data; },

  // Public (in-memory cached for instant navigation without loading spinners)
  async getPublicStudents(params?: any) {
    // Bypass the cache entirely when the user is actively searching/filtering
    // so results are always fresh. Only use cache for the unfiltered first page.
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
  async getPublicSkills(): Promise<Array<{ id: string; name: string; category?: string | null }>> {
    return cachedFetch('skills', 60_000, async () => {
      const res = await client.get('/public/students/skills');
      return Array.isArray(res.data) ? res.data : [];
    });
  },
  async getPublicStudent(rollNo: string) {
    return cachedFetch(`student_${rollNo}`, 30_000, async () => {
      const res = await client.get(`/public/students/${rollNo}`);
      return res.data;
    });
  },
  async getPublicEvents() {
    return cachedFetch('events', 30_000, async () => {
      const res = await client.get('/public/events');
      return res.data;
    });
  },
  async getPublicEvent(id: string) {
    return cachedFetch(`event_${id}`, 30_000, async () => {
      const res = await client.get(`/public/events/${id}`);
      return res.data;
    });
  },

  /** Approved + published introduction videos (empty until a video is approved). */
  async getPublicVideos(limit?: number): Promise<{ items: PublicIntroVideo[]; total: number }> {
    return cachedFetch(`videos_${limit || 0}`, 30_000, async () => {
      const res = await client.get('/public/videos', { params: limit ? { limit } : undefined });
      return { items: res.data?.items ?? [], total: res.data?.total ?? 0 };
    });
  },
};

const memoryCache = new Map<string, { expiresAt: number; data: any }>();

async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = memoryCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }
  const fresh = await fetcher();
  memoryCache.set(key, { expiresAt: now + ttlMs, data: fresh });
  return fresh;
}

export function invalidateApiCache(): void {
  memoryCache.clear();
}

/** Absolute URL for a media path returned by the API (works in <video src>). */
export function resolveMediaUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (client.defaults.baseURL ?? '')
    .replace(/\/api\/?$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
