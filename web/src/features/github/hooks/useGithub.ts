import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { githubApi } from '../api';
import { GithubStatusResponse } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

const MAX_SHOWCASE = 30;

export function useGithub() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<GithubStatusResponse | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);

  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [initialShowcaseIds, setInitialShowcaseIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pushed' | 'stars' | 'name'>('pushed');
  const [includeForks, setIncludeForks] = useState(true);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (isPolling = false) => {
    if (!isPolling) setError(null);
    try {
      const data = await githubApi.getGithubStatus();
      setStatusData(data);

      if (data.connected && data.repos) {
        const serverShowcased = (data.showcase || data.repos.filter((r) => r.isShowcased))
          .slice()
          .sort((a, b) => (a.showcaseRank ?? 99) - (b.showcaseRank ?? 99))
          .map((r) => r.id);

        if (!isPolling) {
          setShowcaseIds(serverShowcased);
          setInitialShowcaseIds(serverShowcased);
        }
      }
      return data;
    } catch (err: any) {
      if (!isPolling) {
        setError(err.response?.data?.message || 'Failed to load GitHub status.');
      }
      throw err;
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const syncStatus = statusData?.account?.syncStatus;
  const isSyncActive = syncStatus === 'RUNNING' || syncStatus === 'QUEUED';

  useEffect(() => {
    if (isSyncActive) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const data = await fetchStatus(true);
            const nextStatus = data?.account?.syncStatus;
            if (nextStatus === 'IDLE') {
              showToast('GitHub synchronization completed!', 'success');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            } else if (nextStatus === 'FAILED') {
              showToast(data?.account?.syncError || 'GitHub synchronization failed.', 'error');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          } catch {
            // keep polling
          }
        }, 3000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isSyncActive, fetchStatus, showToast]);

  const nextSyncAllowedAt = statusData?.account?.nextSyncAllowedAt;
  const cooldownRemainingMs = nextSyncAllowedAt ? new Date(nextSyncAllowedAt).getTime() - now : 0;
  const isCooldown = cooldownRemainingMs > 0;

  const cooldownText = useMemo(() => {
    if (!isCooldown || !nextSyncAllowedAt) return '';
    const date = new Date(nextSyncAllowedAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mins = Math.ceil(cooldownRemainingMs / 60000);
    return `Available at ${timeStr} (~${mins}m)`;
  }, [isCooldown, nextSyncAllowedAt, cooldownRemainingMs]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await githubApi.connectGithub();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start GitHub connection.';
      showToast(msg, 'error');
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (isSyncActive || isCooldown || syncing) return;
    setSyncing(true);
    try {
      const res = await githubApi.syncGithub();
      showToast(res.message || 'GitHub synchronization started.', 'info');
      await fetchStatus(true);
    } catch (err: any) {
      if (err.response?.status === 429) {
        const msg = err.response?.data?.message || 'Sync cooldown is active.';
        showToast(msg, 'warning');
      } else {
        const msg = err.response?.data?.message || 'Failed to trigger sync.';
        showToast(msg, 'error');
      }
      await fetchStatus(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Disconnect GitHub Account?',
      description:
        'This will remove your synced repositories and GitHub-computed skills from your profile and portfolio. Your college Google account remains unaffected.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await githubApi.disconnectGithub();
      showToast('GitHub disconnected successfully.');
      await fetchStatus();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to disconnect GitHub.';
      showToast(msg, 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleShowcase = (repoId: string) => {
    if (showcaseIds.includes(repoId)) {
      setShowcaseIds((prev) => prev.filter((id) => id !== repoId));
    } else {
      if (showcaseIds.length >= MAX_SHOWCASE) {
        showToast(`You can showcase at most ${MAX_SHOWCASE} repositories.`, 'warning');
        return;
      }
      setShowcaseIds((prev) => [...prev, repoId]);
    }
  };

  const moveShowcase = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= showcaseIds.length) return;
    const next = [...showcaseIds];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setShowcaseIds(next);
  };

  const isShowcaseDirty = useMemo(() => {
    if (showcaseIds.length !== initialShowcaseIds.length) return true;
    return showcaseIds.some((id, idx) => id !== initialShowcaseIds[idx]);
  }, [showcaseIds, initialShowcaseIds]);

  const handleSaveShowcase = async () => {
    setSavingShowcase(true);
    try {
      await githubApi.updateShowcase(showcaseIds);
      setInitialShowcaseIds([...showcaseIds]);
      showToast('Showcase projects saved successfully!', 'success');
      await fetchStatus(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save showcase.';
      showToast(msg, 'error');
    } finally {
      setSavingShowcase(false);
    }
  };

  const repos = statusData?.repos || [];
  const filteredRepos = useMemo(() => {
    let list = [...repos];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.language && r.language.toLowerCase().includes(q))
      );
    }
    if (!includeForks) {
      list = list.filter((r) => !r.isFork);
    }
    list.sort((a, b) => {
      if (sortBy === 'stars') return (b.stargazersCount || 0) - (a.stargazersCount || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.pushedAt || 0).getTime() - new Date(a.pushedAt || 0).getTime();
    });
    return list;
  }, [repos, searchQuery, includeForks, sortBy]);

  return {
    loading,
    error,
    statusData,
    connecting,
    syncing,
    disconnecting,
    savingShowcase,
    showcaseIds,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    includeForks,
    setIncludeForks,
    isSyncActive,
    isCooldown,
    cooldownText,
    isShowcaseDirty,
    filteredRepos,
    fetchStatus,
    handleConnect,
    handleSync,
    handleDisconnect,
    toggleShowcase,
    moveShowcase,
    handleSaveShowcase,
  };
}
