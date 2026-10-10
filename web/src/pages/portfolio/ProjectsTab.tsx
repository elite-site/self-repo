import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  StudentPortfolioResponse,
} from '../../types';
import {
  Github,
  ExternalLink,
  Loader2,
  FolderGit2,
  Star,
  GitFork,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Card } from '../../components/ui/Card';
import { ReadmeExcerptView } from '../../components/ReadmeExcerptView';

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-amber-400',
  Python: 'bg-emerald-500',
  Java: 'bg-amber-700',
  'C++': 'bg-pink-500',
  C: 'bg-neutral-500',
  HTML: 'bg-orange-500',
  CSS: 'bg-indigo-500',
  Go: 'bg-cyan-500',
  Rust: 'bg-orange-600',
  PHP: 'bg-purple-500',
  Ruby: 'bg-red-500',
  Shell: 'bg-lime-500',
};
const FALLBACK_LANG_COLORS = ['bg-brand', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
function getLanguageColor(name: string, index: number): string {
  return LANG_COLORS[name] || FALLBACK_LANG_COLORS[index % FALLBACK_LANG_COLORS.length];
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
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

export const ProjectsTab: React.FC = () => {
  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub integration & Portfolio state
  const [portfolioData, setPortfolioData] = useState<StudentPortfolioResponse | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentPortfolio();
      setPortfolioData(data);
    } catch {
      setError('We could not load your portfolio. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const isGithubConnected = Boolean(portfolioData?.connected);
  const showcasedRepos = portfolioData?.showcasedRepos || portfolioData?.showcased || [];
  const computedSkills = portfolioData?.skills || [];
  const hasShowcasedRepos = isGithubConnected && showcasedRepos.length > 0;
  const isSyncing =
    portfolioData?.githubAccount?.syncStatus === 'QUEUED' ||
    portfolioData?.githubAccount?.syncStatus === 'RUNNING';
  const lastSynced = portfolioData?.githubAccount?.lastSyncedAt || portfolioData?.account?.lastSyncedAt;

  return (
    <div className="space-y-8">
      {/* 1. GITHUB SHOWCASED PROJECTS VIEW */}
      {hasShowcasedRepos ? (
        <div className="space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-edge pb-4">
            <div>
              <div className="flex items-center gap-2">
                 <span className="badge badge-brand inline-flex items-center gap-1.5 font-bold">
                  <Github size={13} />
                  <span>Synced from GitHub</span>
                </span>
                {lastSynced && (
                  <span className="text-label-xs text-ink-muted">
                    Updated {formatRelativeTime(lastSynced)}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-headline-sm text-ink mt-1">Showcased Repositories</h2>
            </div>

            <Link
              to="/github"
              className="btn btn-secondary text-xs font-bold shrink-0 self-start sm:self-center inline-flex items-center gap-1.5"
            >
              <span>Manage GitHub Showcase</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Showcased Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {showcasedRepos.map((repo, idx) => {
              const languages = repo.languages || {};
              const totalBytes = Object.values(languages).reduce((sum, b) => sum + (Number(b) || 0), 0);
              const languageList = Object.entries(languages)
                .map(([name, bytes]) => ({
                  name,
                  bytes: Number(bytes),
                  percent: totalBytes > 0 ? (Number(bytes) / totalBytes) * 100 : 0,
                }))
                .sort((a, b) => b.bytes - a.bytes);

              const rank = repo.showcaseRank ?? idx + 1;

              return (
                <Card
                  key={repo.id}
                  className={`p-5 sm:p-6 border flex flex-col justify-between gap-4 transition-all ${
                    rank === 1
                      ? 'border-brand/40 bg-surface shadow-card ring-1 ring-brand/20 md:col-span-2'
                      : 'border-edge bg-surface shadow-card'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Rank + Title + GitHub link */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-label-xs font-mono font-bold ${
                            rank === 1 ? 'bg-brand text-on-primary' : 'bg-surface-sunken text-ink border border-edge'
                          }`}
                        >
                          #{rank}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-heading text-headline-xs sm:text-headline-sm font-bold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5 group"
                            >
                              <span className="truncate">{repo.name}</span>
                              <ExternalLink size={14} className="shrink-0 text-ink-muted group-hover:text-brand" />
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
                              excerpt={repo.readmeExcerpt}
                              fallbackDescription={repo.description}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stars count */}
                      <span className="shrink-0 inline-flex items-center gap-1 text-label-xs font-mono text-ink-secondary bg-surface-sunken px-2 py-1 rounded-md border border-edge">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span>{repo.stars || 0}</span>
                      </span>
                    </div>

                    {/* Languages Breakdown Bar */}
                    {totalBytes > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden flex">
                          {languageList.map((lang, lIdx) => (
                            <div
                              key={lang.name}
                              style={{ width: `${lang.percent}%` }}
                              className={getLanguageColor(lang.name, lIdx)}
                              title={`${lang.name}: ${lang.percent.toFixed(1)}%`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 text-label-xs text-ink-muted">
                          {languageList.slice(0, 4).map((lang, lIdx) => (
                            <span key={lang.name} className="flex items-center gap-1">
                              <span className={`size-2 rounded-full ${getLanguageColor(lang.name, lIdx)}`} />
                              <span className="font-medium text-ink">{lang.name}</span>
                              <span>{lang.percent.toFixed(0)}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Topics */}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {repo.topics.map((topic) => (
                          <span
                            key={topic}
                            className="text-label-xs px-2 py-0.5 rounded-md bg-surface-sunken text-ink-secondary border border-edge"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-body-xs text-ink-muted border-t border-edge pt-3 mt-1">
                    <span>
                      {repo.commitCount ? `${repo.commitCount} commits by you` : 'Repository synced'}
                    </span>
                    <span>Pushed {formatRelativeTime(repo.pushedAt)}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 2. COMPUTED SKILLS SECTION (Alongside Projects) */}
          {computedSkills.length > 0 && (
            <div className="surface p-5 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-ink-brand" />
                  <h3 className="font-heading text-headline-xs text-ink font-bold">
                    Verified GitHub Skills
                  </h3>
                </div>
                <span className="badge badge-brand text-xs">
                  {computedSkills.length} Verified
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {computedSkills.map((skill) => {
                  const evidence = skill.repoCount ? `${skill.repoCount} repo${skill.repoCount > 1 ? 's' : ''}` : null;

                  return (
                    <span
                      key={skill.id || skill.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-edge shadow-sm text-ink text-body-sm font-bold"
                    >
                      <span>{skill.name}</span>
                      {evidence && (
                        <span className="text-label-xs font-mono font-normal text-ink-muted bg-surface-sunken px-1.5 py-0.5 rounded border border-edge">
                          {evidence}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="space-y-6">
          {isGithubConnected ? (
            isSyncing ? (
              <div className="p-4 sm:p-5 rounded-2xl border border-brand/20 bg-brand-soft/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-sm">
                    <RefreshCw size={18} className="animate-spin text-ink-brand" />
                  </span>
                  <div>
                    <p className="font-heading text-label-md font-bold text-ink">
                      Syncing your GitHub repositories...
                    </p>
                    <p className="text-body-sm text-ink-secondary">
                      Your repositories are being imported in the background. Check back in a moment.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="btn btn-secondary text-xs font-bold shrink-0 self-start sm:self-center inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            ) : (
              <EmptyState
                icon={FolderGit2}
                title="No repositories showcased yet"
                description="Select repositories from your connected GitHub account to display them here."
                action={
                  <Link to="/github" className="btn btn-primary">
                    <Github size={16} />
                    <span>Choose Repositories</span>
                  </Link>
                }
              />
            )
          ) : (
            <EmptyState
              icon={FolderGit2}
              title="Showcase your GitHub repositories"
              description="Connect your GitHub account to showcase your top repositories and automatically compute verified skills."
              action={
                <Link to="/github" className="btn btn-primary">
                  <Github size={16} />
                  <span>Connect GitHub</span>
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;
