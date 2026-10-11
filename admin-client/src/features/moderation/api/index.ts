import { apiClient } from '@/shared/api';
import {
  ModerationAchievementItem,
  ModerationCertificateItem,
  ModerationDecisionData,
  ModerationDecisionResult,
  ModerationProjectItem,
  ModerationResumeItem,
  ModerationType,
  ModerationVideoItem,
  Submission,
  SubmissionRating,
  SubmissionsResponse,
  UnifiedModerationItem,
} from '../types';

export const moderationApi = {
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
    const res = await apiClient.get('/admin/api/submissions', { params });
    return res.data;
  },

  async updateReview(
    id: string,
    data: { reviewText: string; pros: string[]; cons: string[] }
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await apiClient.patch(`/admin/api/submissions/${id}/review`, data);
    return res.data;
  },

  async getSubmission(id: string): Promise<Submission> {
    const res = await apiClient.get(`/admin/api/submissions/${id}`);
    return res.data;
  },

  async updateRating(
    id: string,
    rating: SubmissionRating | null
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await apiClient.patch(`/admin/api/submissions/${id}/rating`, { rating });
    return res.data;
  },

  async updateStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; submission: Submission }> {
    const res = await apiClient.patch(`/admin/api/submissions/${id}/status`, { status });
    return res.data;
  },

  async deleteVideo(id: string): Promise<{ success: boolean; message: string; submission: Submission }> {
    const res = await apiClient.delete(`/admin/api/submissions/${id}/video`);
    return res.data;
  },

  async requestNewVideo(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(`/admin/api/submissions/${id}/request-video`, {
      reason: reason?.trim() || undefined,
    });
    return res.data;
  },

  async setVideoPublic(introVideoId: string, isPublic: boolean): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.patch(`/admin/api/moderation/videos/${introVideoId}/visibility`, { isPublic });
    return res.data;
  },

  async deleteSubmission(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/admin/api/submissions/${id}`);
    return res.data;
  },

  getMediaUrl(submissionId: string, fileKey: 'video', version?: string): string {
    const base = `/admin/api/submissions/${submissionId}/media/${fileKey}`;
    return version ? `${base}?v=${encodeURIComponent(version)}` : base;
  },

  getSubmissionsExportUrl(eventId?: string): string {
    return `/admin/api/submissions/export?eventId=${encodeURIComponent(eventId || '')}`;
  },

  // Moderation Queue
  async getModerationItems(type: string = 'all', status?: string): Promise<{ items: UnifiedModerationItem[]; total: number }> {
    const res = await apiClient.get('/admin/api/moderation', {
      params: { type, ...(status ? { status } : {}) },
    });
    if (res.data && typeof res.data === 'object' && Array.isArray(res.data.items)) {
      return res.data;
    }
    return { items: [], total: 0 };
  },

  async getModerationVideos(): Promise<{ items: ModerationVideoItem[] }> {
    const res = await apiClient.get('/admin/api/moderation/videos');
    return { items: res.data || [] };
  },

  async getModerationResumes(): Promise<{ items: ModerationResumeItem[] }> {
    const res = await apiClient.get('/admin/api/moderation/resumes');
    return { items: res.data || [] };
  },

  async getModerationAchievements(): Promise<{ items: ModerationAchievementItem[] }> {
    const res = await apiClient.get('/admin/api/moderation/achievements');
    return { items: res.data || [] };
  },

  async getModerationCertificates(): Promise<{ items: ModerationCertificateItem[] }> {
    const res = await apiClient.get('/admin/api/moderation/certificates');
    return { items: res.data || [] };
  },

  async getModerationProjects(): Promise<{ items: ModerationProjectItem[] }> {
    const res = await apiClient.get('/admin/api/moderation/projects');
    return { items: res.data || [] };
  },

  async moderationDecision(
    type: ModerationType | string,
    id: string,
    data: ModerationDecisionData
  ): Promise<ModerationDecisionResult> {
    const res = await apiClient.patch(`/admin/api/moderation/${type}/${id}`, data);
    return res.data;
  },

  async setModerationVisibility(type: ModerationType | string, id: string, isPublic: boolean) {
    const res = await apiClient.patch(`/admin/api/moderation/${type}/${id}/visibility`, { isPublic });
    return res.data;
  },

  async deleteModerationItem(type: ModerationType | string, id: string) {
    const res = await apiClient.delete(`/admin/api/moderation/${type}/${id}`);
    return res.data;
  },

  async requestModerationChanges(type: ModerationType | string, id: string, note?: string) {
    const res = await apiClient.post(`/admin/api/moderation/${type}/${id}/request-changes`, note ? { note } : {});
    return res.data;
  },
};
