import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api';
import { eventsKeys } from './useEvents';
import { Event, EventRegistration, isActiveRegistration } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { celebrate } from '@/shared/lib/celebrate';
import { flyToTarget } from '@/shared/lib/flyToTarget';
import { teamsApi } from '@/features/teams/api';

interface EventDetailData {
  event: Event;
  registration: EventRegistration | null;
}

export function useEventDetail(id?: string) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery<EventDetailData>({
    queryKey: eventsKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const eventId = id ?? '';
      const [evData, regList] = await Promise.all([
        eventsApi.getEvent(eventId).catch(() => eventsApi.getPublicEvent(eventId)),
        eventsApi.getRegistrations().catch(() => []),
      ]);
      const found = Array.isArray(regList)
        ? regList.find(
            (r: EventRegistration) => r.eventId === eventId && isActiveRegistration(r.status),
          ) ?? null
        : null;
      return { event: evData, registration: found };
    },
    staleTime: 60_000,
  });

  const loadEventAndReg = useCallback(async (_isInitial = true) => {
    await refetch();
  }, [refetch]);

  const invalidateEventCaches = () => {
    if (id) {
      void queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id) });
    }
    void queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
    void queryClient.invalidateQueries({ queryKey: eventsKeys.registrations() });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const triggerEl =
      (e.target as HTMLElement)?.querySelector('button[type="submit"]') ||
      (document.activeElement as HTMLElement | null);
    const fromRect = triggerEl?.getBoundingClientRect?.();
    setSubmitting(true);
    setRegError(null);

    try {
      const res = await eventsApi.registerForEvent(id, { answers });
      queryClient.setQueryData<EventDetailData>(eventsKeys.detail(id), (prev) =>
        prev ? { ...prev, registration: res } : prev,
      );
      setModalOpen(false);
      showToast('Successfully registered for the event!');
      if (fromRect) {
        void flyToTarget(fromRect);
      }
      void celebrate('success');
      invalidateEventCaches();
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRegistration = async () => {
    const registration = data?.registration;
    if (!registration) return;
    const confirmed = await confirm({
      title: 'Cancel registration?',
      description: 'You will forfeit your spot for this event. You can re-register while spots remain.',
      confirmLabel: 'Cancel registration',
      tone: 'danger',
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await eventsApi.cancelRegistration(registration.id);
      if (id) {
        queryClient.setQueryData<EventDetailData>(eventsKeys.detail(id), (prev) =>
          prev ? { ...prev, registration: null } : prev,
        );
      }
      showToast('Registration cancelled.');
      invalidateEventCaches();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to cancel registration.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !teamName.trim()) return;
    setCreatingTeam(true);
    setTeamError(null);

    try {
      await teamsApi.createTeam({ name: teamName.trim(), eventId: id });
      setTeamSuccess('Team created successfully!');
      setTimeout(() => {
        setTeamModalOpen(false);
        setTeamName('');
        setTeamSuccess(null);
        invalidateEventCaches();
      }, 1200);
    } catch (err: any) {
      setTeamError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  return {
    event: data?.event ?? null,
    registration: data?.registration ?? null,
    loading: Boolean(id) && isPending && !data,
    error: isError && !data ? 'Event not found or failed to load details.' : null,
    modalOpen,
    setModalOpen,
    answers,
    setAnswers,
    submitting,
    regError,
    cancelling,
    teamModalOpen,
    setTeamModalOpen,
    teamName,
    setTeamName,
    creatingTeam,
    teamError,
    teamSuccess,
    loadEventAndReg,
    handleRegister,
    handleCancelRegistration,
    handleCreateTeam,
  };
}
