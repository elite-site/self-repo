import { useMutation, useQueryClient } from '@tanstack/react-query';
import { learningAdminApi } from '../api';
import { AdminQuizItem } from '../types';

export function useSaveQuizMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminQuizItem) => learningAdminApi.saveQuiz(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
    },
  });
}
