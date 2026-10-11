import { apiClient } from '@/shared/api';
import {
  EventItem,
  EventPayload,
  VotingCampaign,
  CampaignResult,
} from '../types';

export const eventsApi = {
  async getEvents(): Promise<{ events: EventItem[] }> {
    const res = await apiClient.get('/admin/api/events');
    return res.data;
  },

  async getEvent(id: string): Promise<EventItem> {
    const res = await apiClient.get(`/admin/api/portal/events/${encodeURIComponent(id)}`);
    return res.data;
  },

  async createEvent(data: EventPayload): Promise<EventItem> {
    const res = await apiClient.post('/admin/api/portal/events', data);
    return res.data;
  },

  async updateEvent(id: string, data: Partial<EventPayload>): Promise<EventItem> {
    const res = await apiClient.put(`/admin/api/portal/events/${encodeURIComponent(id)}`, data);
    return res.data;
  },

  async setEventStatus(id: string, status: 'OPEN' | 'CLOSED' | 'ARCHIVED'): Promise<EventItem> {
    const action = status === 'OPEN' ? 'publish' : status === 'CLOSED' ? 'close' : 'archive';
    const res = await apiClient.post(`/admin/api/portal/events/${encodeURIComponent(id)}/${action}`);
    return res.data;
  },

  async deleteEvent(id: string, force = false): Promise<any> {
    const res = await apiClient.delete(`/admin/api/portal/events/${encodeURIComponent(id)}`, {
      data: { force },
    });
    return res.data;
  },

  async archiveEvent(id: string): Promise<any> {
    const res = await apiClient.post(`/admin/api/portal/events/${encodeURIComponent(id)}/archive`);
    return res.data;
  },

  // Voting APIs
  async getVotingCampaigns(): Promise<{ campaigns: VotingCampaign[] }> {
    const res = await apiClient.get('/admin/api/voting');
    return { campaigns: res.data || [] };
  },

  async createVotingCampaign(data: any): Promise<any> {
    const res = await apiClient.post('/admin/api/voting', data);
    return res.data;
  },

  async activateVotingCampaign(id: string): Promise<any> {
    const res = await apiClient.patch(`/admin/api/voting/${encodeURIComponent(id)}`, { status: 'ACTIVE' });
    return res.data;
  },

  async closeVotingCampaign(id: string): Promise<any> {
    const res = await apiClient.patch(`/admin/api/voting/${encodeURIComponent(id)}`, { status: 'CLOSED' });
    return res.data;
  },

  async getVotingResults(id: string): Promise<CampaignResult> {
    const res = await apiClient.get(`/admin/api/voting/${encodeURIComponent(id)}/results`);
    return res.data;
  },

  async finalizeVotingResults(id: string): Promise<any> {
    const res = await apiClient.patch(`/admin/api/voting/${encodeURIComponent(id)}`, { status: 'FINALIZED' });
    return res.data;
  },
};
