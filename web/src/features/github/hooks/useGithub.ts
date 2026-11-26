import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { githubApi } from '../api';
import { GithubStatusResponse } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

const MAX_SHOWCASE = 30;

export const githubKeys = {
  all: ['github'] as const,
  status: () => [...githubKeys.all, 'status'] as const,
};

export function useGithub() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);

  const [editingSkills, setEditingSkills] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [initialSelectedSkillIds, setInitialSelectedSkillIds] = useState<string[]>([]);

  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [initialShowcaseIds, setInitialShowcaseIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pushed' | 'stars' | 'name'>('pushed');
  const [includeForks, setIncludeForks] = useState(true);

  const { data: statusData = null, isPending, isError, error: queryError, refetch } =
    useQuery<GithubStatusResponse>({
      queryKey: githubKeys.status(),
      queryFn: () => githubApi.getGithubStatus(),
      staleTime: 60_000,
      refetchInterval: (query) => {
        const status = query.state.data?.account?.syncStatus;
        return status === 'RUNNING' || status === 'QUEUED' ? 3000 : false;
      },
    });

  const nextSyncAllowedAt = statusData?.account?.nextSyncAllowedAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!nextSyncAllowedAt) return;
    const expiresAt = new Date(nextSyncAllowedAt).getTime();
    if (expiresAt <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) {
        clearInterval(timer);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [nextSyncAllowedAt]);

  const isShowcaseDirty = useMemo(() => {
    if (showcaseIds.length !== initialShowcaseIds.length) return true;
    return showcaseIds.some((id, idx) => id !== initialShowcaseIds[idx]);
  }, [showcaseIds, initialShowcaseIds]);

  const isSkillsDirty = useMemo(() => {
    if (selectedSkillIds.length !== initialSelectedSkillIds.length) return true;
    const initialSet = new Set(initialSelectedSkillIds);
    return selectedSkillIds.some((id) => !initialSet.has(id));
  }, [selectedSkillIds, initialSelectedSkillIds]);

  const hydratedSelectionsRef = useRef(false);
  useEffect(() => {
    if (!statusData?.connected) {
      hydratedSelectionsRef.current = false;
      return;
    }

    if (statusData.repos && (!hydratedSelectionsRef.current || !isShowcaseDirty)) {
      const serverShowcased = (statusData.showcase || statusData.repos.filter((r) => r.isShowcased))
        .slice()
        .sort((a, b) => (a.showcaseRank ?? 99) - (b.showcaseRank ?? 99))
        .map((r) => r.id);
      setShowcaseIds(serverShowcased);
      setInitialShowcaseIds(serverShowcased);
    }

    if (statusData.skills && (!hydratedSelectionsRef.current || (!editingSkills && !isSkillsDirty))) {
      const serverShowcasedSkills =
        statusData.showcasedSkillIds && statusData.showcasedSkillIds.length > 0
          ? statusData.showcasedSkillIds
          : statusData.skills.filter((s) => s.isShowcased !== false).map((s) => s.skillId || s.id);
      setSelectedSkillIds(serverShowcasedSkills);
      setInitialSelectedSkillIds(serverShowcasedSkills);
    }

    hydratedSelectionsRef.current = true;
  }, [statusData, isShowcaseDirty, isSkillsDirty, editingSkills]);

  const syncStatus = statusData?.account?.syncStatus;
  const isSyncActive = syncStatus === 'RUNNING' || syncStatus === 'QUEUED';

  const prevSyncStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevSyncStatusRef.current;
    prevSyncStatusRef.current = syncStatus;
    if (prev !== 'RUNNING' && prev !== 'QUEUED') return;

    if (syncStatus === 'IDLE') {
      showToast('GitHub synchronization completed!', 'success');
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } else if (syncStatus === 'FAILED') {
      showToast(statusData?.account?.syncError || 'GitHub synchronization failed.', 'error');
    }
  }, [syncStatus, statusData?.account?.syncError, showToast, queryClient]);

  const fetchStatus = useCallback(
    async (_isPolling = false) => {
      const res = await refetch();
      if (res.error) throw res.error;
      return res.data;
    },
    [refetch],
  );

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
      await refetch();
    } catch (err: any) {
      if (err.response?.status === 429) {
        const msg = err.response?.data?.message || 'Sync cooldown is active.';
        showToast(msg, 'warning');
      } else {
        const msg = err.response?.data?.message || 'Failed to trigger sync.';
        showToast(msg, 'error');
      }
      await refetch();
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
      hydratedSelectionsRef.current = false;
      setShowcaseIds([]);
      setInitialShowcaseIds([]);
      setSelectedSkillIds([]);
      setInitialSelectedSkillIds([]);
      showToast('GitHub disconnected successfully.');
      await queryClient.invalidateQueries({ queryKey: githubKeys.status() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
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

  const handleSaveShowcase = async () => {
    setSavingShowcase(true);
    try {
      await githubApi.updateShowcase(showcaseIds);
      setInitialShowcaseIds([...showcaseIds]);
      showToast('Showcase projects saved successfully!', 'success');
      await queryClient.invalidateQueries({ queryKey: githubKeys.status() });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
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
          (r.language && r.language.toLowerCase().includes(q)),
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

  const toggleSkillShowcase = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const selectAllSkills = () => {
    const allIds = (statusData?.skills || []).map((s) => s.skillId || s.id);
    setSelectedSkillIds(allIds);
  };

  const clearAllSkills = () => {
    setSelectedSkillIds([]);
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      await githubApi.updateSkillShowcase(selectedSkillIds);
      setInitialSelectedSkillIds([...selectedSkillIds]);
      setEditingSkills(false);
      showToast('Skill showcase updated successfully!', 'success');
      await queryClient.invalidateQueries({ queryKey: githubKeys.status() });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update showcased skills.';
      showToast(msg, 'error');
    } finally {
      setSavingSkills(false);
    }
  };

  const handleCancelEditSkills = () => {
    setSelectedSkillIds([...initialSelectedSkillIds]);
    setEditingSkills(false);
  };

  const error =
    isError && !statusData
      ? (queryError as any)?.response?.data?.message ||
        (queryError as any)?.message ||
        'Failed to load GitHub status.'
      : null;

  return {
    loading: isPending && !statusData,
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
    editingSkills,
    setEditingSkills,
    savingSkills,
    selectedSkillIds,
    toggleSkillShowcase,
    selectAllSkills,
    clearAllSkills,
    isSkillsDirty,
    handleSaveSkills,
    handleCancelEditSkills,
  };
}
