import React from 'react';
import { Search, Save, Loader2, Code2, GitBranch, RefreshCw } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useGithub } from '../hooks/useGithub';
import { GithubNotConnected, GithubAccountCard, GithubRepoRow, GithubSkillsSection } from '../components';

export const GithubPage: React.FC = () => {
  const {
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
  } = useGithub();

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

  if (!isConnected) {
    return <GithubNotConnected connecting={connecting} onConnect={handleConnect} />;
  }

  return (
    <div className="space-y-8 pb-12 page-enter max-w-6xl mx-auto text-left">
      {/* 1. ASYMMETRICAL STATS HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <GithubAccountCard
            account={statusData?.account}
            skills={statusData?.skills || []}
            syncing={syncing}
            isSyncActive={isSyncActive}
            isCooldown={isCooldown}
            cooldownText={cooldownText}
            disconnecting={disconnecting}
            onSync={handleSync}
            onDisconnect={handleDisconnect}
          />
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <GitBranch size={16} aria-hidden="true" />
                  GitHub Sync Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">
                  {isSyncActive ? 'Syncing…' : 'Active'}
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Featured repositories power your public portfolio and verified skill tags. Showcase up to 30 projects.
              </p>
              <div className="space-y-1 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Selected: <span className="font-bold text-ink">{showcaseIds.length}</span> / 30</div>
                <div>Public Repos: <span className="text-ink">{filteredRepos.length}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || isSyncActive || isCooldown}
                className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={syncing || isSyncActive ? 'animate-spin' : ''} />
                <span>{isCooldown ? cooldownText : syncing || isSyncActive ? 'Syncing...' : 'Sync Repos'}</span>
              </button>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* SKILLS TAGS SECTION */}
      <GithubSkillsSection
        skills={statusData?.skills || []}
        selectedSkillIds={selectedSkillIds}
        editingSkills={editingSkills}
        savingSkills={savingSkills}
        isSkillsDirty={isSkillsDirty}
        onStartEdit={() => setEditingSkills(true)}
        onCancelEdit={handleCancelEditSkills}
        onSaveSkills={handleSaveSkills}
        onToggleSkill={toggleSkillShowcase}
        onSelectAll={selectAllSkills}
        onClearAll={clearAllSkills}
      />

      {/* 2. REPOSITORY SHOWCASE WITH MASONRY LAYOUT */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-headline-sm font-bold text-ink">
              Showcase Repositories ({showcaseIds.length}/30)
            </h2>
            <p className="text-body-sm text-ink-secondary">
              Select and order the repositories to feature prominently on your student profile.
            </p>
          </div>

          {isShowcaseDirty && (
            <button
              type="button"
              onClick={handleSaveShowcase}
              disabled={savingShowcase}
              className="btn btn-primary min-h-[44px] inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
            >
              {savingShowcase ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Showcase</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter repositories by name, language or keyword…"
              className="input pl-10 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select text-xs min-h-[44px]"
            >
              <option value="pushed">Recently pushed</option>
              <option value="stars">Most stars</option>
              <option value="name">Repository name</option>
            </select>

            <label className="flex items-center gap-2 text-label-sm text-ink-secondary cursor-pointer whitespace-nowrap pl-2 min-h-[44px]">
              <input
                type="checkbox"
                checked={includeForks}
                onChange={(e) => setIncludeForks(e.target.checked)}
                className="checkbox"
              />
              <span>Forks</span>
            </label>
          </div>
        </div>

        <div className="pt-2">
          {filteredRepos.length === 0 ? (
            <div className="surface text-center py-12 px-4 rounded-2xl border border-edge">
              <Code2 className="w-10 h-10 text-ink-muted mx-auto mb-2" />
              <p className="text-body-sm text-ink-secondary">No repositories match your filter.</p>
            </div>
          ) : (
            <MasonryGrid cols={2}>
              {filteredRepos.map((r) => {
                const idx = showcaseIds.indexOf(r.id);
                const isShowcased = idx !== -1;
                return (
                  <MasonryItem key={r.id}>
                    <GithubRepoRow
                      repo={r}
                      isShowcased={isShowcased}
                      showcaseRank={idx}
                      onToggleShowcase={toggleShowcase}
                      onMoveUp={() => moveShowcase(idx, 'up')}
                      onMoveDown={() => moveShowcase(idx, 'down')}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < showcaseIds.length - 1}
                    />
                  </MasonryItem>
                );
              })}
            </MasonryGrid>
          )}
        </div>
      </div>
    </div>
  );
};

export default GithubPage;
