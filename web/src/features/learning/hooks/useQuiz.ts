import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api';
import { QuizDetailResponse, QuizAttemptResult } from '../types';

export function useQuizQuery(quizId: string) {
  return useQuery<QuizDetailResponse>({
    queryKey: ['learning', 'quiz', quizId],
    queryFn: () => learningApi.getQuiz(quizId),
    enabled: Boolean(quizId),
    staleTime: 60_000,
  });
}

export function useStartQuizMutation(quizId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (qId: string) => learningApi.startQuiz(qId),
    onSuccess: () => {
      if (quizId) {
        queryClient.invalidateQueries({ queryKey: ['learning', 'quiz', quizId] });
      }
    },
  });
}

export function useSubmitQuizMutation(quizId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    QuizAttemptResult,
    Error,
    { attemptId: string; answers: Array<{ questionId: string; selectedOptionIds: string[] }> }
  >({
    mutationFn: (data) => {
      const targetQuizId = quizId || '';
      return learningApi.submitQuiz(targetQuizId, data);
    },
    onSuccess: () => {
      if (quizId) {
        queryClient.invalidateQueries({ queryKey: ['learning', 'quiz', quizId] });
        queryClient.invalidateQueries({ queryKey: ['learning', 'quiz-attempts', quizId] });
      }
      queryClient.invalidateQueries({ queryKey: ['learning', 'home'] });
    },
  });
}
