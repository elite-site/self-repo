import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api';
import { Event, EventRegistration, isActiveRegistration } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { teamsApi } from '@/features/teams/api';

export function useEventDetail(id?: string) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadEventAndReg = useCallback(async (isInitial = true) => {
    if (!id) return;
    if (isInitial && !event) setLoading(true);
    setError(null);

    try {
      const [evData, regList] = await Promise.all([
        eventsApi.getEvent(id).catch(() => eventsApi.getPublicEvent(id)),
        eventsApi.getRegistrations().catch(() => []),
      ]);
      setEvent(evData);

      if (Array.isArray(regList)) {
        const found = regList.find(
          (r: EventRegistration) => r.eventId === id && isActiveRegistration(r.status)
        );
        setRegistration(found || null);
      }
    } catch {
      if (isInitial) setError('Event not found or failed to load details.');
    } finally {
      setLoading(false);
    }
  }, [id, event]);

  useEffect(() => {
    loadEventAndReg(true);
  }, [loadEventAndReg]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setRegError(null);

    try {
      const res = await eventsApi.registerForEvent(id, { answers });
      setRegistration(res);
      setModalOpen(false);
      showToast('Successfully registered for the event!');
      loadEventAndReg(false);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRegistration = async () => {
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
      setRegistration(null);
      showToast('Registration cancelled.');
      loadEventAndReg(false);
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
        loadEventAndReg(false);
      }, 1200);
    } catch (err: any) {
      setTeamError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  return {
    event,
    registration,
    loading,
    error,
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
