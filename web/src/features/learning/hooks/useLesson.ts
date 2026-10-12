import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api';
import { LessonDetailResponse } from '../types';

export function useLessonQuery(id: string) {
  return useQuery<LessonDetailResponse>({
    queryKey: ['learning', 'lesson', id],
    queryFn: () => learningApi.getLesson(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useLessonProgressMutation(courseSlugOrId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: { secondsWatched: number; maxPositionSec: number; completed?: boolean };
    }) => learningApi.saveProgress(lessonId, data),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'lesson', variables.lessonId] });
      if (courseSlugOrId) {
        queryClient.invalidateQueries({ queryKey: ['learning', 'course', courseSlugOrId] });
      }
      queryClient.invalidateQueries({ queryKey: ['learning', 'home'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'my-learning'] });
    },
  });
}
