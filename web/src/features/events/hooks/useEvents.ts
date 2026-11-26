import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api';
import { Event, EventRegistration, isActiveRegistration } from '../types';

export const eventsKeys = {
  all: ['events'] as const,
  list: () => [...eventsKeys.all, 'list'] as const,
  detail: (id: string) => [...eventsKeys.all, 'detail', id] as const,
  registrations: () => [...eventsKeys.all, 'registrations'] as const,
};

interface EventsQueryData {
  events: Event[];
  registrations: EventRegistration[];
}

export function useEvents() {
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Registered'>('All');
  const [search, setSearch] = useState('');

  const { data, isPending, isError, refetch } = useQuery<EventsQueryData>({
    queryKey: eventsKeys.list(),
    queryFn: async () => {
      const [evData, regData] = await Promise.all([
        eventsApi.getEvents().catch(() => eventsApi.getPublicEvents()),
        eventsApi.getRegistrations().catch(() => []),
      ]);
      return {
        events: Array.isArray(evData) ? evData : [],
        registrations: Array.isArray(regData) ? regData : [],
      };
    },
    staleTime: 2 * 60_000,
  });

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const registrations = useMemo(() => data?.registrations ?? [], [data?.registrations]);

  const loadEventsData = useCallback(async (_isInitial = true) => {
    await refetch();
  }, [refetch]);

  const registeredEventIds = useMemo(() => {
    const openEventIds = new Set(events.map((e) => e.id));
    return new Set(
      registrations
        .filter((r) => isActiveRegistration(r.status) && openEventIds.has(r.eventId))
        .map((r) => r.eventId),
    );
  }, [events, registrations]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
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
  }, [events, search, activeTab, registeredEventIds]);

  return {
    events,
    registrations,
    filteredEvents,
    registeredEventIds,
    loading: isPending && !data,
    error: isError && !data ? 'We could not load department events right now.' : null,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    loadEventsData,
  };
}
