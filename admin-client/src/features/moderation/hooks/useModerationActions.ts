import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '../api/index';
import { ModerationDecisionData, ModerationType } from '../types';

export const MODERATION_QUEUE_QUERY_KEY = ['admin', 'moderation'] as const;

interface ModerationItemAction {
  type: ModerationType | string;
  id: string;
}

function useInvalidateModerationQueue() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MODERATION_QUEUE_QUERY_KEY });
}

export function useModerationDecisionMutation() {
  const invalidate = useInvalidateModerationQueue();
  return useMutation({
    mutationFn: ({ type, id, data }: ModerationItemAction & { data: ModerationDecisionData }) =>
      moderationApi.moderationDecision(type, id, data),
    onSuccess: invalidate,
  });
}

export function useModerationVisibilityMutation() {
  const invalidate = useInvalidateModerationQueue();
  return useMutation({
    mutationFn: ({ type, id, isPublic }: ModerationItemAction & { isPublic: boolean }) =>
      moderationApi.setModerationVisibility(type, id, isPublic),
    onSuccess: invalidate,
  });
}

export function useDeleteModerationItemMutation() {
  const invalidate = useInvalidateModerationQueue();
  return useMutation({
    mutationFn: ({ type, id }: ModerationItemAction) => moderationApi.deleteModerationItem(type, id),
    onSuccess: invalidate,
  });
}
