import axios from 'axios';
import {
  AdminStats,
  AdminUser,
  EmailLogEntry,
  EmailPreviewData,
  EventItem,
  Submission,
  SubmissionsResponse,
} from '../types';

const client = axios.create({
  withCredentials: true, // required for httpOnly JWT cookie
});

export const adminApi = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AdminUser }> {
    const res = await client.post('/admin/login', { email, password });
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
    isWinner?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<SubmissionsResponse> {
    const res = await client.get('/admin/api/submissions', { params });
    return res.data;
  },

  async getSubmission(id: string): Promise<Submission> {
    const res = await client.get(`/admin/api/submissions/${id}`);
    return res.data;
  },

  async updateWinner(
    id: string,
    isWinner: boolean,
    winnerRank?: number | null
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await client.patch(`/admin/api/submissions/${id}/winner`, {
      isWinner,
      winnerRank,
    });
    return res.data;
  },

  async updateStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await client.patch(`/admin/api/submissions/${id}/status`, { status });
    return res.data;
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string }> {
    const res = await client.delete(`/admin/api/submissions/${id}`);
    return res.data;
  },

  getMediaUrl(submissionId: string, fileKey: 'photo1' | 'photo2' | 'photo3' | 'video' | 'audio'): string {
    return `/admin/api/submissions/${submissionId}/media/${fileKey}`;
  },

  getExcelExportUrl(eventId?: string): string {
    return `/admin/api/export/excel?eventId=${encodeURIComponent(eventId || 'self-introduction-2026')}`;
  },

  // Email
  async previewEmail(
    templateType: 'WINNER' | 'PARTICIPANT_THANKYOU',
    submissionId?: string
  ): Promise<EmailPreviewData> {
    const res = await client.get('/admin/api/email/preview', {
      params: { templateType, submissionId },
    });
    return res.data;
  },

  async sendEmails(
    templateType: 'WINNER' | 'PARTICIPANT_THANKYOU',
    submissionIds: string[],
    forceResend?: boolean
  ): Promise<any> {
    const res = await client.post('/admin/api/email/send', {
      templateType,
      submissionIds,
      forceResend,
    });
    return res.data;
  },

  async getEmailLogs(eventId?: string): Promise<{ logs: EmailLogEntry[] }> {
    const res = await client.get('/admin/api/email/logs', { params: { eventId } });
    return res.data;
  },

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

