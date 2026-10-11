import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api';
import { AnalyticsResponse } from '../types';

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.message || 'Failed to load system analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    data,
    loading,
    error,
    refreshing,
    loadAnalytics,
  };
};
