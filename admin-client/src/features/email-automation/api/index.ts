import { apiClient } from '@/shared/api';
import { EmailAutomationItem, EmailHistoryResponse, EmailTemplateItem } from '../types';

export const emailAutomationApi = {
  async getEmailAutomations(): Promise<{ automations: EmailAutomationItem[] }> {
    const res = await apiClient.get('/admin/api/email/automations');
    return res.data;
  },

  async createEmailAutomation(data: any): Promise<EmailAutomationItem> {
    const res = await apiClient.post('/admin/api/email/automations', data);
    return res.data;
  },

  async toggleEmailAutomation(id: string): Promise<{ success: boolean; automation: EmailAutomationItem }> {
    const res = await apiClient.patch(`/admin/api/email/automations/${id}/toggle`);
    return res.data;
  },

  async runEmailAutomation(id: string): Promise<{ success: boolean; run: any }> {
    const res = await apiClient.post(`/admin/api/email/automations/${id}/run`);
    return res.data;
  },

  async getEmailHistory(): Promise<EmailHistoryResponse> {
    const res = await apiClient.get('/admin/api/email/history');
    return res.data;
  },

  async getEmailTemplates(): Promise<{ templates: EmailTemplateItem[] }> {
    const res = await apiClient.get('/admin/api/email/templates');
    return res.data;
  },
};
