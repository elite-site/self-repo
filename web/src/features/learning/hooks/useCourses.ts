import { useQuery } from '@tanstack/react-query';
import { learningApi } from '../api';
import { CourseCardSummary } from '../types';

export interface UseCoursesParams {
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  filter?: string;
  search?: string;
}

export interface CoursesQueryResponse {
  courses: CourseCardSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useCoursesQuery(params?: UseCoursesParams) {
  return useQuery<CoursesQueryResponse>({
    queryKey: ['learning', 'courses', params],
    queryFn: () => learningApi.getCourses(params),
    staleTime: 60_000,
  });
}

export function useMyLearningQuery() {
  return useQuery({
    queryKey: ['learning', 'my-learning'],
    queryFn: () => learningApi.getMyLearning(),
    staleTime: 30_000,
  });
}
