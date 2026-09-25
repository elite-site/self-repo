import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Settings2 } from 'lucide-react';

export const EventConfiguration: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminApi.getEvents();
        setEvents(res.events || []);
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-neutral-500">Loading event configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-elite-red" />
          Event Structure & Form Fields
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review deployed events, custom questionnaire fields, and active registration windows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                {ev.id}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                {ev.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">{ev.name}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Academic Year: {ev.year}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
