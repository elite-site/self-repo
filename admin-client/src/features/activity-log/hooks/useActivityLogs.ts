import { useState, useEffect, useCallback } from 'react';
import { activityLogApi } from '../api';
import { ActivityLogItem, ActivityStats } from '../types';

interface UseActivityLogsParams {
  eventId?: string;
  initialCategory?: string;
  initialStatus?: string;
}

export const useActivityLogs = ({
  eventId,
  initialCategory = 'ALL',
  initialStatus = 'ALL',
}: UseActivityLogsParams = {}) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    applicationsToday: 0,
    adminActions: 0,
    errorsCount: 0,
    successRate: 100,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);

  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await activityLogApi.getActivityLogs({
        eventId,
        page,
        limit: 20,
        category: category === 'ALL' ? undefined : category,
        status: status === 'ALL' ? undefined : status,
        search: search.trim() || undefined,
      });
      setLogs(res.logs || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, page, category, status, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(true);
  };

  const handleExport = () => {
    const url = activityLogApi.getActivityLogsExportUrl();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security-audit-logs-${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    logs,
    stats,
    loading,
    refreshing,
    page,
    totalPages,
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
