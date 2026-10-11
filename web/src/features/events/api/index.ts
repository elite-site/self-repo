import { client, cachedFetch } from '@/shared/api/client';
import { Event, EventRegistration, PublicEventDetail } from '../types';

export const eventsApi = {
  async getEvents(filters?: any): Promise<Event[]> {
    const res = await client.get('/student/events', { params: filters });
    return res.data;
  },

  async getEvent(id: string): Promise<Event> {
    const res = await client.get(`/student/events/${id}`);
    return res.data;
  },

  async registerForEvent(id: string, data: any): Promise<EventRegistration> {
    const res = await client.post(`/student/events/${id}/register`, data);
    return res.data;
  },

  async getRegistrations(): Promise<EventRegistration[]> {
    const res = await client.get('/student/registrations');
    return res.data;
  },

  async cancelRegistration(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await client.post(`/student/registrations/${id}/cancel`);
    return res.data;
  },

  async getPublicEvents(): Promise<Event[]> {
    return cachedFetch('events', 30_000, async () => {
      const res = await client.get('/public/events');
      return res.data;
    });
  },

  async getPublicEvent(id: string): Promise<PublicEventDetail> {
    return cachedFetch(`event_${id}`, 30_000, async () => {
      const res = await client.get(`/public/events/${id}`);
      return res.data;
    });
  },
};
