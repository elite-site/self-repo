import axios, { AxiosProgressEvent } from 'axios';
import { StudentProfile } from '../types';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

const client = axios.create({
  baseURL: API_BASE,
  timeout: 240000,
});

export function setStudentToken(token: string | null) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export const api = {
  getOAuthAuthorizeUrl(): string {
    return `${API_BASE}/student/google/authorize`;
  },

  async getMe(): Promise<{ student: StudentProfile }> {
    const res = await client.get('/student/me');
    return res.data;
  },

  async submitVideo(
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<{ success: boolean; id: string; message: string }> {
    const res = await client.post('/student/submission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  // Fetch the student's own uploaded video as a playable blob URL (sends the auth token).
  async getVideoBlobUrl(): Promise<string> {
    const res = await client.get('/student/submission/media/video', { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },
};

export async function clearStudentToken() {
  setStudentToken(null);
}