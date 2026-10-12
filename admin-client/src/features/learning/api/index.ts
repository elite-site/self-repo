import { apiClient } from '@/shared/api';
import {
  AdminCourseItem,
  AdminCourseDetail,
  AdminLessonItem,
  AdminQuizItem,
  AdminEnrollmentItem,
  AdminLearningReport,
  TargetType,
} from '../types';
import {
  mockAdminCourses,
  mockAdminCourseDetail,
  mockAdminEnrollments,
  mockAdminReport,
} from './fixtures';

const isMock = (): boolean => {
  return import.meta.env.VITE_LEARNING_MOCK === 'true';
};

export const learningAdminApi = {
  async getCourses(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{
    courses: AdminCourseItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (isMock()) {
      return {
        courses: mockAdminCourses,
        pagination: { page: 1, limit: 20, total: mockAdminCourses.length, totalPages: 1 },
      };
    }
    const res = await apiClient.get('/admin/api/learning/courses', { params });
    return res.data;
  },

  async getCourse(id: string): Promise<AdminCourseDetail> {
    if (isMock()) return mockAdminCourseDetail;
    const res = await apiClient.get(`/admin/api/learning/courses/${encodeURIComponent(id)}`);
    return res.data;
  },

  async createCourse(data: Partial<AdminCourseItem>): Promise<AdminCourseItem> {
    if (isMock()) return { ...mockAdminCourses[0], ...data, id: 'course-new' };
    const res = await apiClient.post('/admin/api/learning/courses', data);
    return res.data;
  },

  async updateCourse(id: string, data: Partial<AdminCourseItem>): Promise<AdminCourseItem> {
    if (isMock()) return { ...mockAdminCourses[0], ...data, id };
    const res = await apiClient.put(`/admin/api/learning/courses/${encodeURIComponent(id)}`, data);
    return res.data;
  },

  async deleteCourse(id: string): Promise<{ success: boolean }> {
    if (isMock()) return { success: true };
    const res = await apiClient.delete(`/admin/api/learning/courses/${encodeURIComponent(id)}`);
    return res.data;
  },

  async addLesson(courseId: string, data: Partial<AdminLessonItem>): Promise<AdminLessonItem> {
    if (isMock()) return { ...mockAdminCourseDetail.lessons[0], ...data, id: 'lesson-new' };
    const res = await apiClient.post(`/admin/api/learning/courses/${encodeURIComponent(courseId)}/lessons`, data);
    return res.data;
  },

  async updateLesson(courseId: string, lessonId: string, data: Partial<AdminLessonItem>): Promise<AdminLessonItem> {
    if (isMock()) return { ...mockAdminCourseDetail.lessons[0], ...data, id: lessonId };
    const res = await apiClient.put(
      `/admin/api/learning/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      data
    );
    return res.data;
  },

  async deleteLesson(courseId: string, lessonId: string): Promise<{ success: boolean }> {
    if (isMock()) return { success: true };
    const res = await apiClient.delete(
      `/admin/api/learning/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`
    );
    return res.data;
  },

  async reorderLessons(courseId: string, lessonIds: string[]): Promise<{ success: boolean }> {
    if (isMock()) return { success: true };
    const res = await apiClient.put(
      `/admin/api/learning/courses/${encodeURIComponent(courseId)}/lessons/reorder`,
      { lessonIds }
    );
    return res.data;
  },

  async assignCourse(
    courseId: string,
    data: { targetType: TargetType; studentIds?: string[]; year?: number; section?: string }
  ): Promise<{ success: boolean; count?: number }> {
    if (isMock()) return { success: true, count: 42 };
    const res = await apiClient.post(`/admin/api/learning/courses/${encodeURIComponent(courseId)}/assign`, data);
    return res.data;
  },

  async getEnrollments(
    courseId: string,
    params?: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<{
    enrollments: AdminEnrollmentItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (isMock()) {
      return {
        enrollments: mockAdminEnrollments,
        pagination: { page: 1, limit: 20, total: mockAdminEnrollments.length, totalPages: 1 },
      };
    }
    const res = await apiClient.get(
      `/admin/api/learning/courses/${encodeURIComponent(courseId)}/enrollments`,
      { params }
    );
    return res.data;
  },

  async saveQuiz(courseId: string, data: AdminQuizItem): Promise<AdminQuizItem> {
    if (isMock()) return data;
    const res = await apiClient.post(`/admin/api/learning/courses/${encodeURIComponent(courseId)}/quizzes`, data);
    return res.data;
  },

  async getCourseReport(courseId: string): Promise<AdminLearningReport> {
    if (isMock()) return mockAdminReport;
    const res = await apiClient.get(`/admin/api/learning/reports/courses/${encodeURIComponent(courseId)}`);
    return res.data;
  },

  async exportReportCsv(courseId: string): Promise<Blob> {
    if (isMock()) return new Blob(['student,rollNo,progress\n'], { type: 'text/csv' });
    const res = await apiClient.get(
      `/admin/api/learning/reports/courses/${encodeURIComponent(courseId)}/export`,
      { responseType: 'blob' }
    );
    return res.data;
  },

  async previewYouTube(url: string): Promise<{
    videoId: string;
    title: string | null;
    thumbnailUrl: string | null;
    embeddable: boolean;
  }> {
    if (isMock()) {
      return {
        videoId: 'dQw4w9WgXcQ',
        title: 'Mock Video Preview',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        embeddable: true,
      };
    }
    const res = await apiClient.get('/admin/api/learning/youtube/preview', { params: { url } });
    return res.data;
  },
};
