import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Github,
  RefreshCw,
  ExternalLink,
  Star,
  GitFork,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Search,
  Unlink,
  Code2,
  Sparkles,
  Clock,
  Layers,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import {
  GithubAccountInfo,
  GithubRepoItem,
  GithubSkillItem,
  GithubStatusResponse,
} from '../types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { Card } from '../components/ui/Card';
import { SkeletonPage } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { ReadmeExcerptView } from '../components/ReadmeExcerptView';

const MAX_SHOWCASE = 30;

function formatBytes(bytes?: number | string | null): string {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Never';
  const diffSec = Math.round((Date.now() - time) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const GithubPage: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<GithubStatusResponse | null>(null);

  // Connection & Sync action states
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);

  // Showcase Selection State (ordered repo IDs)
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [initialShowcaseIds, setInitialShowcaseIds] = useState<string[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pushed' | 'stars' | 'name'>('pushed');
  const [includeForks, setIncludeForks] = useState(true);

  // Cooldown countdown timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load status
  const fetchStatus = useCallback(async (isPolling = false) => {
    if (!isPolling) setError(null);
    try {
      const data = await api.getGithubStatus();
      setStatusData(data);

      if (data.connected && data.repos) {
        // Derive showcased IDs ordered by showcaseRank
        const serverShowcased = (data.showcase || data.repos.filter((r) => r.isShowcased))
          .slice()
          .sort((a, b) => (a.showcaseRank ?? 99) - (b.showcaseRank ?? 99))
          .map((r) => r.id);

        // Only overwrite local showcase if not mid-edit
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

  // Live polling when sync is running or queued
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
            // keep polling or wait for next interval
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

  // Cooldown calculation
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

  // Handle Connect
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await api.connectGithub();
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

  // Handle Sync
  const handleSync = async () => {
    if (isSyncActive || isCooldown || syncing) return;
    setSyncing(true);
    try {
      const res = await api.syncGithub();
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

  // Handle Disconnect
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
      await api.disconnectGithub();
      showToast('GitHub disconnected successfully.');
      await fetchStatus();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to disconnect GitHub.';
      showToast(msg, 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  // Showcase selection toggle
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

  // Showcase reorder
  const moveShowcase = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= showcaseIds.length) return;
    const next = [...showcaseIds];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setShowcaseIds(next);
  };

  // Save showcase
  const isShowcaseDirty = useMemo(() => {
    if (showcaseIds.length !== initialShowcaseIds.length) return true;
    return showcaseIds.some((id, idx) => id !== initialShowcaseIds[idx]);
  }, [showcaseIds, initialShowcaseIds]);

  const handleSaveShowcase = async () => {
    setSavingShowcase(true);
    try {
      await api.updateShowcase(showcaseIds);
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

  // Filtered & sorted repos
  const repos = statusData?.repos || [];
  const filteredRepos = useMemo(() => {
    let list = [...repos];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.primaryLanguage && r.primaryLanguage.toLowerCase().includes(q)) ||
          (r.topics && r.topics.some((t) => t.toLowerCase().includes(q)))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'pushed') {
        const timeA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
        const timeB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'stars') {
        return (b.stars || 0) - (a.stars || 0);
      }
      return a.name.localeCompare(b.name);
    });

    if (!includeForks) {
      list = list.filter((r) => !r.isFork);
    }

    return list;
  }, [repos, searchQuery, sortBy, includeForks]);

  if (loading) {
    return <SkeletonPage label="Loading GitHub integration" />;
  }

  if (error && !statusData) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to load GitHub details"
          message={error}
          onRetry={() => fetchStatus()}
        />
      </div>
    );
  }

  const isConnected = Boolean(statusData?.connected && statusData?.account);
  const account = statusData?.account;
  const skills = statusData?.skills || [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. NOT CONNECTED STATE */}
      {!isConnected ? (
        <div className="space-y-6">
          <Card className="relative overflow-hidden p-6 sm:p-10 border border-edge bg-surface shadow-card">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand-soft-text text-label-sm font-bold">
                <Github size={16} />
                <span>GitHub Portfolio Sync</span>
              </div>

              <h1 className="font-heading text-headline-xl text-ink leading-tight">
                Connect your GitHub to showcase your work automatically
              </h1>

              <p className="text-body-md text-ink-secondary leading-relaxed">
                Connect your personal GitHub account to automatically import public repositories, showcase your top
                5 projects, and compute verified skill badges for your portfolio.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn btn-primary min-h-[48px] px-6 text-label-md font-bold inline-flex items-center gap-2.5"
                >
                  <Github size={18} />
                  <span>{connecting ? 'Redirecting to GitHub…' : 'Connect GitHub'}</span>
                  {!connecting && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </Card>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
              <div className="size-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand-soft-text">
                <Code2 size={20} />
              </div>
              <h2 className="font-heading text-label-lg font-bold text-ink">Automated Portfolio</h2>
              <p className="text-body-sm text-ink-secondary">
                No manual copying of repository links, descriptions, or stars. Your projects stay fresh with live stats.
              </p>
            </div>

            <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
              <div className="size-10 rounded-lg bg-status-bg-approved flex items-center justify-center text-status-approved">
                <Sparkles size={20} />
              </div>
              <h2 className="font-heading text-label-lg font-bold text-ink">Computed Skills</h2>
              <p className="text-body-sm text-ink-secondary">
                Skills and languages are verified directly against your commit history and package dependencies.
              </p>
            </div>

            <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
              <div className="size-10 rounded-lg bg-surface-sunken flex items-center justify-center text-ink-muted">
                <ShieldCheck size={20} />
              </div>
              <h2 className="font-heading text-label-lg font-bold text-ink">Secure & Privacy-First</h2>
              <p className="text-body-sm text-ink-secondary">
                We only read public identity and repository metadata. We never request access to private repos or source code.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 2. CONNECTED VIEW */
        <div className="space-y-8">
          {/* Header Card */}
          <Card className="p-6 sm:p-8 border border-edge bg-surface shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                {account?.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.login}
                    className="size-16 sm:size-20 rounded-full border-2 border-edge object-cover bg-surface-sunken shrink-0"
                  />
                ) : (
                  <div className="size-16 sm:size-20 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-bold text-2xl shrink-0">
                    <Github size={32} />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-heading text-headline-md text-ink font-bold">
                      @{account?.login}
                    </h1>
                    <a
                      href={`https://github.com/${account?.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-muted hover:text-ink transition-colors p-1"
                      title="Open GitHub profile"
                      aria-label="Open GitHub profile"
                    >
                      <ExternalLink size={16} />
                    </a>

                    {/* Status Badge */}
                    {isSyncActive ? (
                      <span className="badge badge-pending inline-flex items-center gap-1.5">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>{syncStatus === 'QUEUED' ? 'Sync queued' : 'Syncing repos…'}</span>
                      </span>
                    ) : syncStatus === 'FAILED' ? (
                      <span className="badge badge-rejected inline-flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        <span>Last sync failed</span>
                      </span>
                    ) : (
                      <span className="badge badge-approved inline-flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        <span>Connected</span>
                      </span>
                    )}
                  </div>

                  <p className="text-body-sm text-ink-secondary">
                    Connected on{' '}
                    {account?.connectedAt
                      ? new Date(account.connectedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Unknown'}
                    {' • '}
                    Last checked: <span className="font-medium text-ink">{formatRelativeTime(account?.lastSyncedAt)}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncActive || isCooldown || syncing}
                  className="btn btn-secondary min-h-[42px] px-4 text-label-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                  title={isCooldown ? cooldownText : 'Fetch the latest commits, repos, and computed skills'}
                >
                  <RefreshCw size={14} className={isSyncActive || syncing ? 'animate-spin' : ''} />
                  <span>
                    {isSyncActive || syncing ? 'Syncing…' : isCooldown ? cooldownText : 'Sync Now'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="btn btn-ghost min-h-[42px] px-3 text-label-sm font-medium text-status-rejected hover:bg-status-bg-rejected inline-flex items-center gap-1.5"
                >
                  <Unlink size={14} />
                  <span>{disconnecting ? 'Disconnecting…' : 'Disconnect'}</span>
                </button>
              </div>
            </div>

            {/* Sync Error Alert */}
            {syncStatus === 'FAILED' && account?.syncError && (
              <div className="mt-4 p-3.5 rounded-xl bg-status-bg-rejected border border-status-rejected/30 text-status-rejected text-body-sm flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Sync could not complete</p>
                  <p className="text-body-xs mt-0.5">{account.syncError}</p>
                </div>
              </div>
            )}
          </Card>

          {/* 3. COMPUTED SKILLS SECTION */}
          <section className="space-y-4" aria-labelledby="computed-skills-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-ink-brand" />
                  <h2 id="computed-skills-heading" className="font-heading text-headline-sm text-ink">
                    Computed Skills
                  </h2>
                </div>
                <p className="text-body-sm text-ink-secondary mt-0.5">
                  Derived automatically from your repositories, dependencies, and commit evidence.
                </p>
              </div>
              <span className="badge badge-brand self-start sm:self-center">
                {skills.length} verified skill{skills.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Read-only Callout */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-sunken border border-edge text-body-sm text-ink-secondary">
              <ShieldCheck size={18} className="shrink-0 text-brand mt-0.5" />
              <p>
                <span className="font-semibold text-ink">Skills are automatically derived from your GitHub repositories.</span>{' '}
                Manual additions and edits are disabled to guarantee authenticity for department recruiters and industry partners.
              </p>
            </div>

            {/* Skills Chips Grid */}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {skills.map((skill) => {
                  const evidenceParts = [
                    skill.repoCount ? `${skill.repoCount} repo${skill.repoCount > 1 ? 's' : ''}` : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={skill.id || skill.name}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-edge shadow-card text-ink"
                    >
                      <span className="font-heading text-label-md font-bold">{skill.name}</span>
                      {evidenceParts.length > 0 && (
                        <span className="text-label-xs font-mono text-ink-muted bg-surface-sunken px-1.5 py-0.5 rounded-md border border-edge">
                          {evidenceParts.join(' • ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Code2}
                title="No skills computed yet"
                description="Once your public repositories are synced, your languages and technology dependencies will appear here automatically."
              />
            )}
          </section>

          {/* 4. SHOWCASE PROJECTS SECTION */}
          <section className="space-y-5" aria-labelledby="showcase-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-ink-brand" />
                  <h2 id="showcase-heading" className="font-heading text-headline-sm text-ink">
                    Showcase Projects (Up to 30)
                  </h2>
                </div>
                <p className="text-body-sm text-ink-secondary mt-0.5">
                  Select and rank up to 30 repositories to highlight on your student portfolio.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-label-sm font-mono font-bold px-2.5 py-1 rounded-full border ${
                    showcaseIds.length === MAX_SHOWCASE
                      ? 'bg-status-bg-approved text-status-approved border-status-approved/30'
                      : 'bg-brand-soft text-brand-soft-text border-brand/20'
                  }`}
                >
                  {showcaseIds.length} / {MAX_SHOWCASE} selected
                </span>

                <button
                  type="button"
                  onClick={handleSaveShowcase}
                  disabled={!isShowcaseDirty || savingShowcase}
                  className="btn btn-primary min-h-[40px] px-4 text-label-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingShowcase && <RefreshCw size={14} className="animate-spin" />}
                  <span>{savingShowcase ? 'Saving…' : 'Save Showcase'}</span>
                </button>
              </div>
            </div>

            {/* Currently Selected Reorder Strip */}
            {showcaseIds.length > 0 && (
              <div className="surface p-4 sm:p-5 rounded-2xl border border-brand/20 bg-brand-soft/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-label-md font-bold text-ink">
                    Showcase Order ({showcaseIds.length})
                  </h3>
                  <span className="text-label-xs text-ink-muted">
                    #1 is featured prominently as your hero project
                  </span>
                </div>

                <div className="space-y-2">
                  {showcaseIds.map((id, index) => {
                    const repo = repos.find((r) => r.id === id);
                    if (!repo) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-edge shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-on-primary text-label-xs font-bold font-mono">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-heading text-label-md font-bold text-ink truncate">
                              {repo.name}
                            </p>
                            {repo.primaryLanguage && (
                              <p className="text-label-xs text-ink-muted">{repo.primaryLanguage}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveShowcase(index, 'up')}
                            disabled={index === 0}
                            aria-label={`Move ${repo.name} up`}
                            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveShowcase(index, 'down')}
                            disabled={index === showcaseIds.length - 1}
                            aria-label={`Move ${repo.name} down`}
                            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleShowcase(id)}
                            aria-label={`Remove ${repo.name} from showcase`}
                            className="p-1 rounded-lg text-status-rejected hover:bg-status-bg-rejected"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories by name, language, or topic…"
                  className="input pl-10 h-10 text-body-sm w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-2 text-label-sm font-medium text-ink cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={includeForks}
                    onChange={(e) => setIncludeForks(e.target.checked)}
                    className="rounded border-edge text-brand focus:ring-brand size-4 cursor-pointer"
                  />
                  <span>Include forks</span>
                </label>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="repo-sort" className="text-label-sm text-ink-muted whitespace-nowrap shrink-0">
                    Sort by:
                  </label>
                  <select
                    id="repo-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="input h-10 py-1 text-body-sm min-w-[160px]"
                  >
                    <option value="pushed">Recently pushed</option>
                    <option value="stars">Most stars</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Repositories List */}
            {filteredRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRepos.map((repo) => {
                  const isSelected = showcaseIds.includes(repo.id);
                  const showcaseRank = isSelected ? showcaseIds.indexOf(repo.id) + 1 : null;
                  const canSelect = isSelected || showcaseIds.length < MAX_SHOWCASE;

                  return (
                    <Card
                      key={repo.id}
                      className={`p-5 flex flex-col justify-between gap-4 border transition-all duration-fast ${
                        isSelected
                          ? 'border-brand bg-brand-soft/5 shadow-md ring-1 ring-brand/30'
                          : 'border-edge bg-surface hover:border-edge-strong'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top row: Name & Selection Action */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={repo.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-heading text-label-lg font-bold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5 group truncate"
                              >
                                <span className="truncate">{repo.name}</span>
                                <ExternalLink size={13} className="shrink-0 text-ink-muted group-hover:text-brand" />
                              </a>

                              {repo.isFork && (
                                <span className="badge badge-draft text-xs py-0 px-1.5 inline-flex items-center gap-1">
                                  <GitFork size={11} />
                                  <span>Fork</span>
                                </span>
                              )}
                            </div>

                            <div className="mt-1">
                              <ReadmeExcerptView
                                repoId={repo.id}
                                fallbackDescription={repo.description || 'No description provided.'}
                              />
                            </div>
                          </div>

                          {/* Showcase Toggle Checkbox Button */}
                          <button
                            type="button"
                            onClick={() => toggleShowcase(repo.id)}
                            disabled={!canSelect}
                            aria-pressed={isSelected}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'bg-brand text-on-primary shadow-sm'
                                : 'bg-surface-sunken text-ink hover:bg-surface-sunken/80 border border-edge'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} strokeWidth={2.5} />
                                <span>#{showcaseRank}</span>
                              </>
                            ) : (
                              <span>+ Showcase</span>
                            )}
                          </button>
                        </div>

                        {/* Topics */}
                        {repo.topics && repo.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {repo.topics.slice(0, 5).map((topic) => (
                              <span
                                key={topic}
                                className="text-label-xs px-2 py-0.5 rounded-md bg-surface-sunken text-ink-secondary border border-edge"
                              >
                                #{topic}
                              </span>
                            ))}
                            {repo.topics.length > 5 && (
                              <span className="text-label-xs text-ink-muted self-center">
                                +{repo.topics.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Stats */}
                      <div className="flex items-center justify-between text-body-xs text-ink-muted border-t border-edge pt-3 mt-1">
                        <div className="flex items-center gap-3">
                          {repo.primaryLanguage && (
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-brand" />
                              {repo.primaryLanguage}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            {repo.stars || 0}
                          </span>

                          <span>{repo.commitCount || 0} commits</span>
                        </div>

                        <span className="text-label-xs">
                          Pushed {formatRelativeTime(repo.pushedAt)}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title={searchQuery ? 'No matching repositories found' : 'No repositories synced yet'}
                description={
                  searchQuery
                    ? 'Try searching with a different keyword or language.'
                    : 'Click "Sync Now" to fetch public repositories from your GitHub account.'
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default GithubPage;
