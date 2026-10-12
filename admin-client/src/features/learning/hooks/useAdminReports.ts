import { useQuery } from '@tanstack/react-query';
import { learningAdminApi } from '../api';

export function useAdminReportsQuery(courseId: string) {
  return useQuery({
    queryKey: ['admin-course-report', courseId],
    queryFn: () => learningAdminApi.getCourseReport(courseId),
    enabled: Boolean(courseId),
  });
}

export function useAdminEnrollmentsQuery(
  courseId: string,
  params?: { page?: number; limit?: number; search?: string; status?: string }
) {
  return useQuery({
    queryKey: ['admin-course-enrollments', courseId, params],
    queryFn: () => learningAdminApi.getEnrollments(courseId, params),
    enabled: Boolean(courseId),
  });
}
