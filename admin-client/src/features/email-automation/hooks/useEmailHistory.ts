import { useState, useEffect, useCallback } from 'react';
import { emailAutomationApi } from '../api';
import { EmailHistoryResponse } from '../types';

export const useEmailHistory = () => {
  const [data, setData] = useState<EmailHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'runs' | 'logs'>('runs');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await emailAutomationApi.getEmailHistory();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load email history:', err);
      setError(err?.response?.data?.message || 'Failed to load dispatch history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const automationRuns = data?.automationRuns || [];
  const emailLogs = data?.emailLogs || [];

  const filteredRuns = automationRuns.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.automation?.name?.toLowerCase().includes(term) ||
      r.automation?.trigger?.toLowerCase().includes(term) ||
      r.trigger?.toLowerCase().includes(term)
    );
  });

  const filteredLogs = emailLogs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      l.recipientEmail.toLowerCase().includes(term) ||
      (l.recipientName && l.recipientName.toLowerCase().includes(term)) ||
      l.subject.toLowerCase().includes(term)
    );
  });

  return {
    data,
    loading,
    refreshing,
    activeView,
    setActiveView,
    search,
    setSearch,
    error,
    filteredRuns,
    filteredLogs,
    loadHistory,
  };
};
