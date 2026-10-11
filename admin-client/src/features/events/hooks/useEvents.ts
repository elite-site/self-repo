import { useState, useEffect, useRef, useCallback } from 'react';
import { eventsApi } from '../api';
import { EventItem, EventPayload, FormState } from '../types';

export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const emptyEventForm: FormState = {
  name: '',
  description: '',
  type: 'HACKATHON',
  year: new Date().getFullYear(),
  status: 'OPEN',
  registrationStart: '',
  registrationEnd: '',
  eventDate: '',
  eligibilityYears: [],
  minCompletion: 0,
  teamEnabled: false,
  teamMin: 1,
  teamMax: 4,
  notifyOnOpen: true,
  notifyReminder: true,
};

export const fromEvent = (e: EventItem): FormState => ({
  name: e.name,
  description: e.description ?? '',
  type: e.type || 'GENERAL',
  year: e.year ?? new Date().getFullYear(),
  status: e.status || 'OPEN',
  registrationStart: toLocalInput(e.registrationStart),
  registrationEnd: toLocalInput(e.registrationEnd),
  eventDate: toLocalInput(e.eventDate),
  eligibilityYears: (e.eligibilityYears ?? []).map(String),
  minCompletion: e.minCompletion ?? 0,
  teamEnabled: e.teamEnabled ?? false,
  teamMin: e.teamMin ?? 1,
  teamMax: e.teamMax ?? 4,
  notifyOnOpen: e.notifyOnOpen ?? true,
  notifyReminder: e.notifyReminder ?? true,
});

export const useEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventItem | null | undefined>(undefined);
  const [viewing, setViewing] = useState<EventItem | null>(null);
  const [archiving, setArchiving] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.getEvents();
      setEvents(res.events || []);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDuplicate = async (ev: EventItem) => {
    setBusyId(ev.id);
    try {
      await eventsApi.createEvent({
        ...fromEvent(ev),
        name: `${ev.name} (Copy)`,
        registrationStart: toLocalInput(ev.registrationStart) || null,
        registrationEnd: toLocalInput(ev.registrationEnd) || null,
        eventDate: toLocalInput(ev.eventDate) || null,
        eligibilityYears: ev.eligibilityYears ?? [],
        description: ev.description ?? undefined,
        status: 'DRAFT',
      } as EventPayload);
      notify(`Duplicated "${ev.name}".`);
      await fetchEvents();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not duplicate the event.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (ev: EventItem) => {
    setMenuOpenId(null);
    setBusyId(ev.id);
    try {
      await eventsApi.setEventStatus(ev.id, 'OPEN');
      notify(`"${ev.name}" is now live and published to all students.`);
      await fetchEvents();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not publish event', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleCloseEvent = async (ev: EventItem) => {
    setMenuOpenId(null);
    setBusyId(ev.id);
    try {
      await eventsApi.setEventStatus(ev.id, 'CLOSED');
      notify(`"${ev.name}" registration closed.`);
      await fetchEvents();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not close event', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return {
    events,
    loading,
    error,
    editing,
    setEditing,
    viewing,
    setViewing,
    archiving,
    setArchiving,
    deleting,
    setDeleting,
    busyId,
    menuOpenId,
    setMenuOpenId,
    menuRef,
    toast,
    setToast,
    notify,
    fetchEvents,
    handleDuplicate,
    handlePublish,
    handleCloseEvent,
  };
};
