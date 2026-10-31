import React from 'react';
import { Search, Save, Loader2, Code2 } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
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
    <div className="space-y-8 pb-12">
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
              className="btn btn-primary inline-flex items-center gap-2 self-start sm:self-auto"
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
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select text-xs min-h-[40px]"
            >
              <option value="pushed">Recently pushed</option>
              <option value="stars">Most stars</option>
              <option value="name">Repository name</option>
            </select>

            <label className="flex items-center gap-2 text-label-sm text-ink-secondary cursor-pointer whitespace-nowrap pl-2">
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

        <div className="space-y-3 pt-2">
          {filteredRepos.length === 0 ? (
            <div className="surface text-center py-12 px-4 rounded-xl border border-edge">
              <Code2 className="w-10 h-10 text-ink-muted mx-auto mb-2" />
              <p className="text-body-sm text-ink-secondary">No repositories match your filter.</p>
            </div>
          ) : (
            filteredRepos.map((r) => {
              const idx = showcaseIds.indexOf(r.id);
              const isShowcased = idx !== -1;
              return (
                <GithubRepoRow
                  key={r.id}
                  repo={r}
                  isShowcased={isShowcased}
                  showcaseRank={idx}
                  onToggleShowcase={toggleShowcase}
                  onMoveUp={() => moveShowcase(idx, 'up')}
                  onMoveDown={() => moveShowcase(idx, 'down')}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < showcaseIds.length - 1}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GithubPage;
