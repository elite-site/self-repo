import { apiClient } from '@/shared/api';
import {
  RegistrationItem,
  RegistrationsResponse,
  RegistrationTeam,
} from '../types';

/** Builds an event-scoped xlsx download URL for one of the admin export routes. */
function getEventExportUrl(path: string, eventId?: string): string {
  return `${path}?eventId=${encodeURIComponent(eventId ?? '')}`;
}

export const registrationsApi = {
  async getRegistrations(params: {
    eventId?: string;
    status?: string;
    year?: number;
    section?: string;
    team?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<RegistrationsResponse> {
    const res = await apiClient.get('/admin/api/registrations', { params });
    return res.data;
  },

  async getRegistration(id: string): Promise<RegistrationItem> {
    const res = await apiClient.get(`/admin/api/registrations/${encodeURIComponent(id)}`);
    return res.data;
  },

  async updateRegistrationStatus(
    id: string,
    status: string,
    note?: string
  ): Promise<{ success: boolean; registration: RegistrationItem }> {
    const res = await apiClient.patch(`/admin/api/registrations/${encodeURIComponent(id)}/status`, { status, note });
    return res.data;
  },

  async deleteRegistration(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/admin/api/registrations/${encodeURIComponent(id)}`);
    return res.data;
  },

  getRegistrationsExportUrl(params?: {
    eventId?: string;
    status?: string;
    year?: number;
    section?: string;
  }): string {
    const query = new URLSearchParams();
    if (params?.eventId) query.append('eventId', params.eventId);
    if (params?.status) query.append('status', params.status);
    if (params?.year) query.append('year', String(params.year));
    if (params?.section) query.append('section', params.section);
    return `/admin/api/registrations/export?${query.toString()}`;
  },

  async getTeams(params?: {
    eventId?: string;
    status?: string;
    search?: string;
  }): Promise<{ teams: RegistrationTeam[] }> {
    const res = await apiClient.get('/admin/api/teams', { params });
    return res.data;
  },

  async updateTeamStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; team: RegistrationTeam }> {
    const res = await apiClient.patch(`/admin/api/teams/${encodeURIComponent(id)}/status`, { status });
    return res.data;
  },

  async removeTeamMember(
    teamId: string,
    studentId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(`/admin/api/teams/${encodeURIComponent(teamId)}/members/remove`, { studentId, reason });
    return res.data;
  },

  getStudentsExportUrl(eventId?: string): string {
    return getEventExportUrl('/admin/api/students/export', eventId);
  },

  getSubmissionsExportUrl(eventId?: string): string {
    return getEventExportUrl('/admin/api/submissions/export', eventId);
  },

  getActivityLogsExportUrl(): string {
    return '/admin/api/activity-logs/export';
  },
};
