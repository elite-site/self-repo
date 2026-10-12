import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningAdminApi } from '../api';
import { AdminCourseItem } from '../types';

export const ADMIN_COURSES_KEY = ['admin-courses'];

export function useAdminCoursesQuery(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [...ADMIN_COURSES_KEY, params],
    queryFn: () => learningAdminApi.getCourses(params),
  });
}

export function useCreateCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminCourseItem>) => learningAdminApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });
    },
  });
}

export function useUpdateCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminCourseItem> }) =>
      learningAdminApi.updateCourse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin-course', variables.id] });
    },
  });
}

export function useDeleteCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => learningAdminApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });
    },
  });
}
