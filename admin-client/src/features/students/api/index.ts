import { apiClient } from '@/shared/api';
import { StudentsResponse } from '../types';

export const studentsApi = {
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
    const res = await apiClient.get('/admin/api/students', { params });
    return res.data;
  },

  async getStudent(id: string): Promise<any> {
    const res = await apiClient.get(`/admin/api/portal/students/${id}`);
    return res.data;
  },

  async requestItemChange(
    studentId: string,
    type: string,
    itemId: string,
    note: string
  ): Promise<any> {
    const res = await apiClient.post(
      `/admin/api/portal/students/${studentId}/items/${type}/${itemId}/request-change`,
      { note }
    );
    return res.data;
  },

  async deleteStudentItem(
    studentId: string,
    type: string,
    itemId: string,
    reason?: string
  ): Promise<any> {
    const res = await apiClient.delete(
      `/admin/api/portal/students/${studentId}/items/${type}/${itemId}`,
      { data: { reason } }
    );
    return res.data;
  },
};
