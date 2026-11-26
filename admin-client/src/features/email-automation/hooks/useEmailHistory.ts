import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { emailAutomationApi } from '../api/index';
import { EmailHistoryResponse } from '../types';

export const ADMIN_EMAIL_HISTORY_QUERY_KEY = ['admin', 'email-history'] as const;

export const useEmailHistory = () => {
  const [activeView, setActiveView] = useState<'runs' | 'logs'>('runs');
  const [search, setSearch] = useState('');

  const query = useQuery<EmailHistoryResponse>({
    queryKey: ADMIN_EMAIL_HISTORY_QUERY_KEY,
    queryFn: () => emailAutomationApi.getEmailHistory(),
  });

  const loadHistory = useCallback(
    async (_isManual = false) => {
      await query.refetch();
    },
    [query],
  );

  const data = query.data ?? null;
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
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    activeView,
    setActiveView,
    search,
    setSearch,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message || 'Failed to load dispatch history')
      : null,
    filteredRuns,
    filteredLogs,
    loadHistory,
  };
};
