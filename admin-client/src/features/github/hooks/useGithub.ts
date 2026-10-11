import { useState, useEffect, useCallback } from 'react';
import { githubApi } from '../api';
import { GithubOverview, GithubLog } from '../types';

export const useGithub = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<GithubOverview>({ total: 0, accounts: [] });
  const [logs, setLogs] = useState<GithubLog[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, logsData] = await Promise.all([
        githubApi.getGithubOverview({ search, limit: 50 }),
        githubApi.getGithubLogs(logFilter === 'errors' ? { filter: 'errors' } : {}),
      ]);
      setOverview(overviewData || { total: 0, accounts: [] });
      setLogs(logsData || []);
    } catch (err: any) {
      console.error('Failed to load GitHub data', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to load GitHub management data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [search, logFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResync = async (studentId: string, studentName: string) => {
    setResyncingId(studentId);
    setMessage(null);
    try {
      const res = await githubApi.resyncStudentGithub(studentId);
      setMessage({
        text: `Sync queued for ${studentName}: ${res.status || 'Success'}`,
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Sync failed';
      setMessage({ text: `Failed to sync ${studentName}: ${msg}`, type: 'error' });
    } finally {
      setResyncingId(null);
    }
  };

  return {
    loading,
    overview,
    logs,
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
