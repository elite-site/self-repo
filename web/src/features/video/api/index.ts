import { client, cachedFetch, uploadDirectToDrive, UploadProgressInfo } from '@/shared/api';
import { PublicIntroVideo } from '@/shared/types';

export const videoApi = {
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
      xhr.withCredentials = true;
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

      xhr.send(file);
    });
  },

  async createVideoUploadSession(data: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<{ sessionUrl: string | null; chunkSize: number }> {
    const res = await client.post('/student/submission/video-session', data);
    return res.data;
  },

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

  async setVideoPublic(isPublic: boolean): Promise<{ success: boolean; isPublic: boolean; message?: string }> {
    const res = await client.patch('/student/submission/video-visibility', { isPublic });
    return res.data;
  },

  async deleteVideo(): Promise<{ success: boolean; message?: string }> {
    const res = await client.delete('/student/submission');
    return res.data;
  },

  async getPublicVideos(limit?: number): Promise<{ items: PublicIntroVideo[]; total: number }> {
    return cachedFetch(`videos_${limit || 0}`, 30_000, async () => {
      const res = await client.get('/public/videos', { params: limit ? { limit } : undefined });
      return { items: res.data?.items ?? [], total: res.data?.total ?? 0 };
    });
  },
};
