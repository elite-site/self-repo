import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningAdminApi } from '../api';
import { AdminLessonItem } from '../types';
import { ADMIN_COURSES_KEY } from './useAdminCourses';

export function useAdminCourseDetailQuery(courseId: string) {
  return useQuery({
    queryKey: ['admin-course', courseId],
    queryFn: () => learningAdminApi.getCourse(courseId),
    enabled: Boolean(courseId),
  });
}

export function useAddLessonMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminLessonItem>) => learningAdminApi.addLesson(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });
    },
  });
}

export function useUpdateLessonMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: Partial<AdminLessonItem> }) =>
      learningAdminApi.updateLesson(courseId, lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
    },
  });
}

export function useDeleteLessonMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => learningAdminApi.deleteLesson(courseId, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });
    },
  });
}

export function useReorderLessonsMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonIds: string[]) => learningAdminApi.reorderLessons(courseId, lessonIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
    },
  });
}
