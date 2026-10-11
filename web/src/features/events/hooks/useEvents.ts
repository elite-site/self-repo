import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api';
import { Event, EventRegistration, isActiveRegistration } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Registered'>('All');
  const [search, setSearch] = useState('');

  const loadEventsData = useCallback(async (isInitial = true) => {
    if (isInitial && events.length === 0) setLoading(true);
    setError(null);
    try {
      const [evData, regData] = await Promise.all([
        eventsApi.getEvents().catch(() => eventsApi.getPublicEvents()),
        eventsApi.getRegistrations().catch(() => []),
      ]);
      if (Array.isArray(evData)) setEvents(evData);
      if (Array.isArray(regData)) setRegistrations(regData);
    } catch {
      setError('We could not load department events right now.');
    } finally {
      setLoading(false);
    }
  }, [events.length]);

  useEffect(() => {
    loadEventsData(true);
  }, [loadEventsData]);

  const openEventIds = new Set(events.map((e) => e.id));
  const registeredEventIds = new Set(
    registrations
      .filter((r) => isActiveRegistration(r.status) && openEventIds.has(r.eventId))
      .map((r) => r.eventId)
  );

  const filteredEvents = events.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (activeTab === 'Registered') return registeredEventIds.has(e.id);
    if (activeTab === 'Open') return !registeredEventIds.has(e.id);
    return true;
  });

  return {
    events,
    registrations,
    filteredEvents,
    registeredEventIds,
    loading,
    error,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    loadEventsData,
  };
}
