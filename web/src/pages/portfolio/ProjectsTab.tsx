import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Project,
  GithubRepoItem,
  GithubSkillItem,
  StudentPortfolioResponse,
} from '../../types';
import {
  Plus,
  Github,
  ExternalLink,
  Loader2,
  Trash2,
  FolderGit2,
  Pencil,
  Star,
  GitFork,
  Sparkles,
  ChevronRight,
  Code2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Card } from '../../components/ui/Card';
import { ReadmeExcerptView } from '../../components/ReadmeExcerptView';
import { ProjectBento } from '../../components/ProjectBento';

/** The portal caps a portfolio at five projects; mirrored in the header count. */
const MAX_PROJECTS = 5;

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

interface FieldErrors {
  title?: string;
  description?: string;
  githubUrl?: string;
  videoUrl?: string;
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="space-y-3">
    <legend className="text-label-sm uppercase tracking-wider text-ink-muted">{title}</legend>
    {children}
  </fieldset>
);

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="error-text" role="alert">
      {message}
    </p>
  ) : null;

export const ProjectsTab: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub integration & Portfolio state
  const [portfolioData, setPortfolioData] = useState<StudentPortfolioResponse | null>(null);
  const [legacyProjects, setLegacyProjects] = useState<Project[]>([]);

  // Manual project create/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const firstInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch portfolio and legacy projects in parallel
      const [portfolioRes, projectsRes] = await Promise.allSettled([
        api.getStudentPortfolio(),
        api.getProjects(),
      ]);

      if (portfolioRes.status === 'fulfilled') {
        setPortfolioData(portfolioRes.value);
      }

      if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value)) {
        setLegacyProjects(projectsRes.value);
      }
    } catch {
      setError('We could not load your portfolio. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setTechStackInput('');
    setGithubUrl('');
    setVideoUrl('');
    setModalError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProject(p);
    setTitle(p.title || '');
    setDescription(p.description || '');
    setTechStackInput(p.techStack?.join(', ') || '');
    setGithubUrl(p.githubUrl || '');
    setVideoUrl(p.videoUrl || '');
    setModalError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'A project needs a name.';
    if (!description.trim()) next.description = 'Add a short description so this reads as a portfolio entry.';
    if (githubUrl.trim() && !isHttpUrl(githubUrl)) next.githubUrl = 'Enter a full link starting with https://';
    if (videoUrl.trim() && !isHttpUrl(videoUrl)) next.videoUrl = 'Enter a full link starting with https://';
    return next;
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    setModalError(null);

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      techStack,
      githubUrl: githubUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
    };

    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, payload);
        showToast('Project updated.');
      } else {
        await api.createProject(payload);
        showToast('Project added.');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Could not save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Project) => {
    const confirmed = await confirm({
      title: `Delete "${p.title}"?`,
      description: 'This will remove the project from your portfolio.',
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteProject(p.id);
      showToast('Project deleted.');
      loadData();
    } catch {
      showToast('Could not delete project.', 'error');
    }
  };

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

          {/* 3. LEGACY MANUAL PROJECTS (If any exist) */}
          {legacyProjects.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-edge">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-headline-xs text-ink font-bold">
                    Manual Projects (Legacy)
                  </h3>
                  <p className="text-body-sm text-ink-muted">
                    Projects entered before GitHub integration was enabled.
                  </p>
                </div>
              </div>

              <ProjectBento
                projects={legacyProjects}
                showStatus
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>
      ) : (
        /* 2. LEGACY / NOT CONNECTED VIEW */
        <div className="space-y-6">
          {/* GitHub Banner: Adaptive depending on connection and sync status */}
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
              <div className="p-4 sm:p-5 rounded-2xl border border-brand/20 bg-brand-soft/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-sm">
                    <Github size={18} />
                  </span>
                  <div>
                    <p className="font-heading text-label-md font-bold text-ink">
                      GitHub connected {portfolioData?.githubAccount?.login ? `(@${portfolioData.githubAccount.login})` : ''}
                    </p>
                    <p className="text-body-sm text-ink-secondary">
                      No repositories are showcased yet. Choose which repositories you want to showcase on your portfolio.
                    </p>
                  </div>
                </div>

                <Link
                  to="/github"
                  className="btn btn-primary text-xs font-bold shrink-0 self-start sm:self-center inline-flex items-center gap-1.5"
                >
                  <span>Manage Showcase</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            )
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl border border-brand/20 bg-brand-soft/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-sm">
                  <Github size={18} />
                </span>
                <div>
                  <p className="font-heading text-label-md font-bold text-ink">
                    Build your portfolio automatically with GitHub
                  </p>
                  <p className="text-body-sm text-ink-secondary">
                    Connect your GitHub account to showcase your top repositories and automatically compute verified skills.
                  </p>
                </div>
              </div>

              <Link
                to="/github"
                className="btn btn-primary text-xs font-bold shrink-0 self-start sm:self-center inline-flex items-center gap-1.5"
              >
                <Github size={14} />
                <span>Connect GitHub</span>
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-headline-sm text-ink">
                {isGithubConnected ? 'Manual Projects (Legacy)' : 'Manual Projects'}
              </h2>
              <p className="text-body-sm text-ink-secondary">
                {legacyProjects.length} of {MAX_PROJECTS} projects added
              </p>
            </div>

            {legacyProjects.length < MAX_PROJECTS && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn btn-primary"
                aria-label="Add project"
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                <span>Add project</span>
              </button>
            )}
          </div>

          {legacyProjects.length === 0 ? (
            isGithubConnected ? (
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
            ) : (
              <EmptyState
                icon={FolderGit2}
                title="Your portfolio is empty"
                description="Showcase your work by connecting GitHub or adding your first project manually."
                action={
                  <div className="flex items-center gap-2">
                    <Link to="/github" className="btn btn-primary">
                      <Github size={16} />
                      <span>Connect GitHub</span>
                    </Link>
                    <button type="button" onClick={handleOpenCreateModal} className="btn btn-secondary">
                      <Plus size={16} />
                      <span>Add manually</span>
                    </button>
                  </div>
                }
              />
            )
          ) : (
            <ProjectBento
              projects={legacyProjects}
              showStatus
              onEdit={handleOpenEditModal}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {/* Manual Project Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? 'Edit project' : 'Add project'}
        description="Only the name and description are required."
        initialFocusRef={firstInputRef}
      >
        <form onSubmit={handleSaveProject} className="space-y-5" noValidate>
          {modalError && <ErrorState bare message={modalError} />}

          <FormSection title="Basic information">
            <div>
              <label htmlFor="project-title" className="label">
                Project name <span className="text-status-rejected">*</span>
              </label>
              <input
                id="project-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Distributed task queue"
                className="input"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'project-title-error' : undefined}
              />
              <FieldError id="project-title-error" message={fieldErrors.title} />
            </div>

            <div>
              <label htmlFor="project-description" className="label">
                Description <span className="text-status-rejected">*</span>
              </label>
              <textarea
                id="project-description"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="What it does, what you built, and what you learned."
                className="textarea"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? 'project-description-error' : 'project-description-hint'}
              />
              <p id="project-description-hint" className="hint">
                Two or three sentences is plenty.
              </p>
              <FieldError id="project-description-error" message={fieldErrors.description} />
            </div>
          </FormSection>

          <FormSection title="Project details">
            <div>
              <label htmlFor="project-techstack" className="label">
                Technologies
              </label>
              <input
                id="project-techstack"
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                placeholder="React, Node.js, Postgres"
                className="input"
                aria-describedby="project-techstack-hint"
              />
              <p id="project-techstack-hint" className="hint">
                Separate each technology with a comma.
              </p>
            </div>
          </FormSection>

          <FormSection title="Links">
            <div>
              <label htmlFor="project-github" className="label">
                GitHub repository
              </label>
              <input
                id="project-github"
                type="url"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, githubUrl: undefined }));
                }}
                placeholder="https://github.com/you/project"
                className="input"
                aria-invalid={Boolean(fieldErrors.githubUrl)}
                aria-describedby={fieldErrors.githubUrl ? 'project-github-error' : undefined}
              />
              <FieldError id="project-github-error" message={fieldErrors.githubUrl} />
            </div>

            <div>
              <label htmlFor="project-video" className="label">
                Live demo or video
              </label>
              <input
                id="project-video"
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, videoUrl: undefined }));
                }}
                placeholder="https://project.yoursite.com"
                className="input"
                aria-invalid={Boolean(fieldErrors.videoUrl)}
                aria-describedby={fieldErrors.videoUrl ? 'project-video-error' : undefined}
              />
              <FieldError id="project-video-error" message={fieldErrors.videoUrl} />
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3 border-t border-edge pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" aria-busy={saving}>
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <span>{saving ? 'Saving…' : 'Save project'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsTab;
