import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { githubApi } from '../api/index';
import { GithubOverview, GithubLog } from '../types';

export const ADMIN_GITHUB_QUERY_KEY = ['admin', 'github'] as const;

export const useGithub = () => {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const query = useQuery<{ overview: GithubOverview; logs: GithubLog[] }>({
    queryKey: [...ADMIN_GITHUB_QUERY_KEY, search, logFilter],
    queryFn: async () => {
      const [overviewData, logsData] = await Promise.all([
        githubApi.getGithubOverview({ search, limit: 50 }),
        githubApi.getGithubLogs(logFilter === 'errors' ? { filter: 'errors' } : {}),
      ]);
      return {
        overview: overviewData || { total: 0, accounts: [] },
        logs: logsData || [],
      };
    },
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (query.isError) {
      setMessage({
        text: (query.error as any)?.response?.data?.message || 'Failed to load GitHub management data',
        type: 'error',
      });
    }
  }, [query.isError, query.error]);

  const fetchData = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const handleResync = async (studentId: string, studentName: string) => {
    setResyncingId(studentId);
    setMessage(null);
    try {
      const res = await githubApi.resyncStudentGithub(studentId);
      setMessage({
        text: `Sync queued for ${studentName}: ${res.status || 'Success'}`,
        type: 'success',
      });
      void query.refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Sync failed';
      setMessage({ text: `Failed to sync ${studentName}: ${msg}`, type: 'error' });
    } finally {
      setResyncingId(null);
    }
  };

  return {
    loading: query.isPending,
    overview: query.data?.overview ?? { total: 0, accounts: [] },
    logs: query.data?.logs ?? [],
    logFilter,
    setLogFilter,
    search,
    setSearch,
    resyncingId,
    message,
    setMessage,
    fetchData,
    handleResync,
  };
};
