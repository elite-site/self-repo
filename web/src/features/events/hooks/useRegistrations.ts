import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api';
import { eventsKeys } from './useEvents';
import { EventRegistration } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

const isRegistrationActive = (r: EventRegistration) => {
  if (r.status === 'CANCELLED' || r.status === 'REJECTED') return false;
  const eventStatus = (r as any).event?.status;
  if (eventStatus === 'CLOSED' || eventStatus === 'ARCHIVED') return false;
  if (r.eventId === 'self-introduction-2026') return false;
  return true;
};

export function useRegistrations() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery<EventRegistration[]>({
    queryKey: eventsKeys.registrations(),
    queryFn: async () => {
      const list = await eventsApi.getRegistrations();
      return Array.isArray(list) ? list.filter(isRegistrationActive) : [];
    },
    staleTime: 60_000,
  });

  const loadRegistrations = useCallback(async (_isInitial = true) => {
    await refetch();
  }, [refetch]);

  const handleCancel = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancel this registration?',
      description: 'You will lose your place for this event. You can register again while places remain.',
      confirmLabel: 'Cancel registration',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCancellingId(id);
    const previous = queryClient.getQueryData<EventRegistration[]>(eventsKeys.registrations());
    queryClient.setQueryData<EventRegistration[]>(eventsKeys.registrations(), (prev) =>
      prev ? prev.filter((r) => r.id !== id) : prev,
    );
    try {
      await eventsApi.cancelRegistration(id);
      showToast('Registration cancelled.');
      void queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      if (previous) {
        queryClient.setQueryData(eventsKeys.registrations(), previous);
      }
      showToast('Failed to cancel registration.', 'error');
      void refetch();
    } finally {
      setCancellingId(null);
    }
  };

  return {
    regs: data ?? [],
    loading: isPending && !data,
    cancellingId,
    error: isError && !data ? 'Could not load registrations. Please retry.' : null,
    loadRegistrations,
    handleCancel,
  };
}
