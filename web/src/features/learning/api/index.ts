import { client } from '@/shared/api/client';
import {
  HomeFeedResponse,
  CourseCardSummary,
  CourseDetailResponse,
  LessonDetailResponse,
  QuizDetailResponse,
  QuizAttemptResult,
  LessonTranscriptResponse,
} from '../types';
import {
  mockHomeFeed,
  mockCourses,
  mockCourseDetail,
  mockLessonDetail,
  mockQuizDetail,
  mockQuizResult,
  mockTranscript,
} from './fixtures';

const isMock = (): boolean => {
  return import.meta.env.VITE_LEARNING_MOCK === 'true';
};

export const learningApi = {
  async getHomeFeed(): Promise<HomeFeedResponse> {
    if (isMock()) return mockHomeFeed;
    const res = await client.get('/student/learning/home');
    return res.data;
  },

  async getCourses(params?: {
    page?: number;
    limit?: number;
    category?: string;
    level?: string;
    filter?: string;
    search?: string;
  }): Promise<{
    courses: CourseCardSummary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (isMock()) {
      return {
        courses: mockCourses,
        pagination: { page: 1, limit: 20, total: mockCourses.length, totalPages: 1 },
      };
    }
    const res = await client.get('/student/learning/courses', { params });
    return res.data;
  },

  async getCourse(slugOrId: string): Promise<CourseDetailResponse> {
    if (isMock()) return mockCourseDetail;
    const res = await client.get(`/student/learning/courses/${slugOrId}`);
    return res.data;
  },

  async enrollCourse(courseId: string): Promise<{ success: boolean; enrolledAt: string }> {
    if (isMock()) return { success: true, enrolledAt: new Date().toISOString() };
    const res = await client.post(`/student/learning/courses/${courseId}/enroll`);
    return res.data;
  },

  async getMyLearning(): Promise<{
    inProgress: CourseCardSummary[];
    completed: CourseCardSummary[];
    deadlines: any[];
  }> {
    if (isMock()) {
      return {
        inProgress: [mockCourses[0], mockCourses[1]],
        completed: [],
        deadlines: [
          {
            courseId: 'course-2',
            courseTitle: mockCourses[1].title,
            courseSlug: mockCourses[1].slug,
            title: 'Assignment Deadline',
            dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
            type: 'COURSE' as const,
          },
        ],
      };
    }
    const res = await client.get('/student/learning/my-learning');
    return res.data;
  },

  async getLesson(id: string): Promise<LessonDetailResponse> {
    if (isMock()) return mockLessonDetail;
    const res = await client.get(`/student/learning/lessons/${id}`);
    return res.data;
  },

  async saveProgress(
    lessonId: string,
    data: { secondsWatched: number; maxPositionSec: number; completed?: boolean }
  ): Promise<{ success: boolean; completed: boolean; courseProgressPercent: number }> {
    if (isMock()) return { success: true, completed: !!data.completed, courseProgressPercent: 60 };
    const res = await client.post(`/student/learning/lessons/${lessonId}/progress`, data);
    return res.data;
  },

  async getQuiz(quizId: string): Promise<QuizDetailResponse> {
    if (isMock()) return mockQuizDetail;
    const res = await client.get(`/student/learning/quizzes/${quizId}`);
    return res.data;
  },

  async startQuiz(quizId: string): Promise<{ attemptId: string; startedAt: string; timeLimitMin: number | null }> {
    if (isMock()) {
      return {
        attemptId: 'attempt-mock-1',
        startedAt: new Date().toISOString(),
        timeLimitMin: 15,
      };
    }
    const res = await client.post(`/student/learning/quizzes/${quizId}/start`);
    return res.data;
  },

  async submitQuiz(
    quizId: string,
    data: { attemptId: string; answers: Array<{ questionId: string; selectedOptionIds: string[] }> }
  ): Promise<QuizAttemptResult> {
    if (isMock()) return mockQuizResult;
    const res = await client.post(`/student/learning/quizzes/${quizId}/submit`, data);
    return res.data;
  },

  async getQuizAttempts(quizId: string): Promise<{ attempts: any[] }> {
    if (isMock()) return { attempts: [mockQuizResult] };
    const res = await client.get(`/student/learning/quizzes/${quizId}/attempts`);
    return res.data;
  },

  async getLessonTranscript(lessonId: string): Promise<LessonTranscriptResponse> {
    if (isMock()) return mockTranscript;
    const res = await client.get(`/student/learning/lessons/${lessonId}/transcript`);
    return res.data;
  },
};
