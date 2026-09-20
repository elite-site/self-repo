import axios from 'axios';
import {
  AdminStats,
  AdminUser,
  EventItem,
  StudentsResponse,
  Submission,
  SubmissionRating,
  SubmissionsResponse,
} from '../types';

const client = axios.create({
  withCredentials: true, // required for httpOnly JWT cookie
});

export const adminApi = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user: AdminUser }> {
    const res = await client.post('/admin/login', { username, password });
    return res.data;
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await client.post('/admin/logout');
    return res.data;
  },

  async getMe(): Promise<{ authenticated: boolean; user?: AdminUser }> {
    try {
      const res = await client.get('/admin/me');
      return res.data;
    } catch {
      return { authenticated: false };
    }
  },

  // Events
  async getEvents(): Promise<{ events: EventItem[] }> {
    const res = await client.get('/admin/api/events');
    return res.data;
  },

  // Stats
  async getStats(eventId?: string): Promise<AdminStats> {
    const res = await client.get('/admin/api/stats', { params: { eventId } });
    return res.data;
  },

  // Submissions
  async getSubmissions(params: {
    eventId?: string;
    page?: number;
    limit?: number;
    branch?: string;
    section?: string;
    year?: number;
    status?: string;
    rating?: string;
    tag?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<SubmissionsResponse> {
    const res = await client.get('/admin/api/submissions', { params });
    return res.data;
  },

  // Student roster
  getStudentsExportUrl(eventId?: string): string {
    return `/admin/api/students/export?eventId=${encodeURIComponent(eventId || '')}`;
  },

  async getStudents(params: {
    eventId?: string;
    page?: number;
    limit?: number;
    year?: number;
    section?: string;
    uploaded?: string;
    search?: string;
  }): Promise<StudentsResponse> {
    const res = await client.get('/admin/api/students', { params });
    return res.data;
  },

  async updateReview(
    id: string,
    data: { reviewText: string; pros: string[]; cons: string[] }
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await client.patch(`/admin/api/submissions/${id}/review`, data);
    return res.data;
  },

  async getSubmission(id: string): Promise<Submission> {
    const res = await client.get(`/admin/api/submissions/${id}`);
    return res.data;
  },

  async updateRating(
    id: string,
    rating: SubmissionRating | null
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await client.patch(`/admin/api/submissions/${id}/rating`, { rating });
    return res.data;
  },

  async updateStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await client.patch(`/admin/api/submissions/${id}/status`, { status });
    return res.data;
  },

  async deleteVideo(id: string): Promise<{ success: boolean; message: string; submission: Submission }> {
    const res = await client.delete(`/admin/api/submissions/${id}/video`);
    return res.data;
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string }> {
    const res = await client.delete(`/admin/api/submissions/${id}`);
    return res.data;
  },

  getMediaUrl(submissionId: string, fileKey: 'video'): string {
    return `/admin/api/submissions/${submissionId}/media/${fileKey}`;
  },

  // Activity logs
  async getActivityLogs(params: {
    eventId?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: any[];
    stats: {
      totalActivities: number;
      applicationsToday: number;
      adminActions: number;
      errorsCount: number;
      successRate: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const res = await client.get('/admin/api/activity-logs', { params });
    return res.data;
  },
};

export const api = adminApi;