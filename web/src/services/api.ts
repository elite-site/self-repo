import axios, { AxiosProgressEvent } from 'axios';
import { SubmissionResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/$/, '');

const client = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
});

export const api = {
  async getBranches(): Promise<string[]> {
    try {
      const res = await client.get<{ branches: string[] }>('/branches');
      return res.data.branches;
    } catch {
      return ['IT'];
    }
  },

  async getSections(): Promise<string[]> {
    try {
      const res = await client.get<{ sections: string[] }>('/sections');
      return res.data.sections;
    } catch {
      return ['A', 'B'];
    }
  },

  async getYears(): Promise<number[]> {
    try {
      const res = await client.get<{ years: number[] }>('/years');
      return res.data.years;
    } catch {
      return [2, 3, 4];
    }
  },

  async submitEntry(
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<SubmissionResponse> {
    const response = await client.post<SubmissionResponse>('/submissions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },
};
