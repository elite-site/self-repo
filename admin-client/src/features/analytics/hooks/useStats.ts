import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api';
import { AdminStats } from '../types';

export const useStats = (eventId?: string) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getStats(eventId);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats', err);
      setError(err?.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    loadStats,
  };
};
