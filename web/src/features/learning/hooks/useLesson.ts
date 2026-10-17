import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { learningApi } from '../api';
import { LessonDetailResponse, LessonTranscriptResponse } from '../types';

export function useLessonQuery(id: string) {
  return useQuery<LessonDetailResponse>({
    queryKey: ['learning', 'lesson', id],
    queryFn: () => learningApi.getLesson(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useLessonTranscriptQuery(lessonId: string) {
  return useQuery<LessonTranscriptResponse>({
    queryKey: ['learning', 'transcript', lessonId],
    queryFn: () => learningApi.getLessonTranscript(lessonId),
    enabled: Boolean(lessonId),
    staleTime: 30 * 60_000,
    placeholderData: keepPreviousData,
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
      queryClient.setQueryData<LessonDetailResponse>(
        ['learning', 'lesson', variables.lessonId],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            progress: {
              ...prev.progress,
              secondsWatched: variables.data.secondsWatched,
              maxPositionSec: Math.max(prev.progress?.maxPositionSec ?? 0, variables.data.maxPositionSec),
              completed: variables.data.completed ? true : prev.progress?.completed ?? false,
            },
          };
        }
      );

      if (variables.data.completed) {
        if (courseSlugOrId) {
          queryClient.invalidateQueries({ queryKey: ['learning', 'course', courseSlugOrId] });
        }
        queryClient.invalidateQueries({ queryKey: ['learning', 'home'] });
        queryClient.invalidateQueries({ queryKey: ['learning', 'my-learning'] });
      }
    },
  });
}
