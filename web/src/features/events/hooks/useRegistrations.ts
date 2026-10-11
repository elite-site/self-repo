import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api';
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
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = useCallback(async (isInitial = true) => {
    if (isInitial && regs.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getRegistrations();
      if (Array.isArray(data)) {
        setRegs(data.filter(isRegistrationActive));
      }
    } catch {
      if (regs.length === 0) setError('Could not load registrations. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [regs.length]);

  useEffect(() => {
    loadRegistrations(true);
  }, [loadRegistrations]);

  const handleCancel = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancel this registration?',
      description: 'You will lose your place for this event. You can register again while places remain.',
      confirmLabel: 'Cancel registration',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCancellingId(id);
    setRegs((prev) => prev.filter((r) => r.id !== id));
    try {
      await eventsApi.cancelRegistration(id);
      showToast('Registration cancelled.');
      loadRegistrations(false);
    } catch {
      showToast('Failed to cancel registration.', 'error');
      loadRegistrations(false);
    } finally {
      setCancellingId(null);
    }
  };

  return {
    regs,
    loading,
    cancellingId,
    error,
    loadRegistrations,
    handleCancel,
  };
}
