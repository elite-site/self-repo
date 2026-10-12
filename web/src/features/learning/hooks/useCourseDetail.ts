import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api';
import { CourseDetailResponse } from '../types';

export function useCourseDetailQuery(slugOrId: string) {
  return useQuery<CourseDetailResponse>({
    queryKey: ['learning', 'course', slugOrId],
    queryFn: () => learningApi.getCourse(slugOrId),
    enabled: Boolean(slugOrId),
    staleTime: 60_000,
  });
}

export function useEnrollCourseMutation(slugOrId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => learningApi.enrollCourse(courseId),
    onSuccess: () => {
      if (slugOrId) {
        queryClient.invalidateQueries({ queryKey: ['learning', 'course', slugOrId] });
      }
      queryClient.invalidateQueries({ queryKey: ['learning', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'home'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'my-learning'] });
    },
  });
}
