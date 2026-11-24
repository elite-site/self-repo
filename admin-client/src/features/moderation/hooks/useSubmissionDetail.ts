import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '../api/index';
import { Submission, SubmissionRating } from '@/types';

export const SUBMISSIONS_QUERY_KEY = ['admin', 'submissions'] as const;

export function useSubmissionQuery(id: string | undefined) {
  const query = useQuery<Submission>({
    queryKey: [...SUBMISSIONS_QUERY_KEY, 'detail', id],
    queryFn: () => moderationApi.getSubmission(id as string),
    enabled: Boolean(id),
    retry: false,
  });

  return query.data ?? null;
}

export function useRequestNewVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      moderationApi.requestNewVideo(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}

export function useSetVideoPublicMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      moderationApi.setVideoPublic(id, isPublic),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}

export function useUpdateRatingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: SubmissionRating | null }) =>
      moderationApi.updateRating(id, rating),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}

export function useDeleteVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => moderationApi.deleteVideo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}

export function useDeleteSubmissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => moderationApi.deleteSubmission(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}

export function useUpdateReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      review,
    }: {
      id: string;
      review: { reviewText: string; pros: string[]; cons: string[] };
    }) => moderationApi.updateReview(id, review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY }),
  });
}
