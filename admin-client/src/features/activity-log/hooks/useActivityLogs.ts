import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityLogApi } from '../api';
import { ACTIVE_EVENT_ID } from '@/shared/layout';
import {
  ACTIVITY_LOGS_PAGE_SIZE,
  ACTIVITY_LOGS_SEARCH_DEBOUNCE_MS,
} from '../constants';
import { ActivityStats } from '../types';

export const ACTIVITY_LOGS_QUERY_KEY = ['activity-logs'] as const;

const EMPTY_STATS: ActivityStats = {
  totalActivities: 0,
  applicationsToday: 0,
  adminActions: 0,
  errorsCount: 0,
  successRate: 100,
};

interface UseActivityLogsParams {
  eventId?: string;
  initialCategory?: string;
  initialStatus?: string;
}

export const useActivityLogs = ({
  eventId = ACTIVE_EVENT_ID,
  initialCategory = 'ALL',
  initialStatus = 'ALL',
}: UseActivityLogsParams = {}) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, ACTIVITY_LOGS_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const params = {
    eventId,
    page,
    limit: ACTIVITY_LOGS_PAGE_SIZE,
    category: category === 'ALL' ? undefined : category,
    status: status === 'ALL' ? undefined : status,
    search: debouncedSearch || undefined,
  };

  const {
    data,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [...ACTIVITY_LOGS_QUERY_KEY, params],
    queryFn: () => activityLogApi.getActivityLogs(params),
    // Keep the current page visible while the next one loads instead of
    // collapsing the table to a spinner on every filter change.
    placeholderData: (previous) => previous,
  });

  const fetchLogs = () => {
    void refetch();
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    void refetch();
  };

  const handleExport = () => {
    const link = document.createElement('a');
    link.href = activityLogApi.getActivityLogsExportUrl();
    link.setAttribute('download', `security-audit-logs-${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    logs: data?.logs ?? [],
    stats: data?.stats ?? EMPTY_STATS,
    error: isError ? 'We could not load the audit trail. Please try again.' : null,
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    page,
    totalPages: data?.pagination.totalPages ?? 1,
    totalCount: data?.pagination.total ?? 0,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    fetchLogs,
    handleSearch,
    handleExport,
  };
};
