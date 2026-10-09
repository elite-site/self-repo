import React from 'react';
import {
  Github,
  GitBranch,
  Star,
  ExternalLink,
  Code2,
  Trophy,
  Award,
  Calendar,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ItemStatusBadge } from './ItemStatusBadge';

export interface PortfolioTabProps {
  student: any;
  onRequestChanges: (type: string, itemId: string, itemTitle: string) => void;
  onDelete: (type: string, itemId: string, itemTitle: string) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  student,
  onRequestChanges,
  onDelete,
}) => {
  const achievements = student.achievements || [];
  const certificates = student.certificates || [];
  const projects = student.projects || [];
  const githubAccount = student.githubAccount || null;
  const githubRepos: any[] = student.githubRepos || [];
  const githubSkills: any[] = student.githubSkills || [];
  const showcasedGithubRepos = githubRepos.filter((r: any) => r.isShowcased);

  return (
    <>
      {/* 2.5 GITHUB PORTFOLIO (READ-ONLY) */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-ink" />
            <h3 className="font-semibold text-sm text-ink">
              GitHub Integration {githubAccount && `(@${githubAccount.login})`}
            </h3>
          </div>
          {githubAccount ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-bg-approved text-status-approved border border-edge">
                <span className="w-1.5 h-1.5 rounded-full bg-status-approved" />
                Connected
              </span>
              <span className="text-xs text-ink-muted">
                Status: <strong className="text-ink-secondary">{githubAccount.syncStatus || 'IDLE'}</strong>
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-inset text-ink-muted border border-edge">
              Not Connected
            </span>
          )}
        </div>

        {githubAccount ? (
          <div className="space-y-5">
            {/* Sync Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary bg-surface-canvas p-3 rounded-lg border border-edge">
              <div>
                <span className="text-ink-muted">GitHub Account: </span>
                <a
                  href={`https://github.com/${githubAccount.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-ink hover:underline inline-flex items-center gap-1"
                >
                  @{githubAccount.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Connected: </span>
                <span>{new Date(githubAccount.connectedAt).toLocaleDateString()}</span>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Last Synced: </span>
                <span>
                  {githubAccount.lastSyncedAt
                    ? new Date(githubAccount.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Synced Repositories: </span>
                <span className="font-semibold text-ink">{githubRepos.length}</span>
              </div>
            </div>

            {/* Computed Skills */}
            <div>
              <h4 className="text-xs font-bold text-ink mb-2">
                Computed Skills ({githubSkills.length})
              </h4>
              {githubSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {githubSkills.map((gs: any) => (
                    <span
                      key={gs.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-inset text-ink border border-edge"
                    >
                      <span>{gs.skill?.name || 'Skill'}</span>
                      <span className="text-ink-muted text-[10px]">({gs.repoCount} repos)</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No skills mapped from repository codebase yet.</p>
              )}
            </div>

            {/* Showcased Repositories with Quality Hints */}
            <div>
              <h4 className="text-xs font-bold text-ink mb-2">
                Showcased Repositories ({showcasedGithubRepos.length}/5)
              </h4>
              {showcasedGithubRepos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {showcasedGithubRepos.map((repo: any) => {
                    const isFork = Boolean(repo.isFork);
                    const isLowCommit = Number(repo.commitCount ?? 0) < 3;
                    const isEmpty =
                      Number(repo.commitCount ?? 0) === 0 ||
                      (!repo.primaryLanguage && (!repo.languages || Object.keys(repo.languages || {}).length === 0));

                    return (
                      <div
                        key={repo.id}
                        className="p-3.5 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-xs text-ink hover:underline inline-flex items-center gap-1 min-w-0 truncate"
                            >
                              <span className="truncate">{repo.name}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <div className="flex items-center gap-2 shrink-0">
                              {repo.primaryLanguage && (
                                <span className="text-[11px] font-semibold text-ink-secondary px-1.5 py-0.5 rounded bg-surface-inset">
                                  {repo.primaryLanguage}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted">
                                <Star className="w-3 h-3 text-status-pending" />
                                {repo.stars ?? 0}
                              </span>
                            </div>
                          </div>

                          {repo.readmeExcerpt ? (
                            <div className="mt-1.5 mb-2 p-2 rounded-lg bg-surface-inset border border-edge text-[11px] text-ink-muted line-clamp-3 font-mono">
                              {repo.readmeExcerpt}
                            </div>
                          ) : repo.description ? (
                            <p className="text-xs text-ink-secondary line-clamp-2 mb-2">
                              {repo.description}
                            </p>
                          ) : null}

                          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                            <GitBranch className="w-3 h-3" />
                            <span>{repo.commitCount ?? 0} commits</span>
                          </div>

                          {/* Quality Hints */}
                          {(isFork || isLowCommit || isEmpty) && (
                            <div className="mt-2.5 pt-2 border-t border-edge flex flex-wrap gap-1">
                              {isFork && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-review text-status-review border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Forked repository
                                </span>
                              )}
                              {isEmpty ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-rejected text-status-rejected border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Empty repository
                                </span>
                              ) : isLowCommit ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-pending text-status-pending border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  &lt; 3 commits
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-ink-muted text-xs italic bg-surface-canvas rounded-lg border border-edge">
                  Student has not selected any showcased repositories yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            Student has not connected a GitHub account.
          </div>
        )}
      </div>

      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-status-pending" />
            <h3 className="font-semibold text-sm text-ink">
              Honors & Achievements ({achievements.length})
            </h3>
          </div>
        </div>

        {achievements.length > 0 ? (
          <div className="space-y-3">
            {achievements.map((a: any) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-ink">{a.title}</h4>
                    <ItemStatusBadge status={a.status} />
                    {a.category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-inset text-ink-secondary">
                        {a.category.name}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-ink-secondary leading-relaxed">{a.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted pt-1">
                    <span>{a.organization || 'Department / Institution'}</span>
                    {a.achievedAt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.achievedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  {a.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-2 p-2.5 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {a.reviewNote || 'Student was asked to revise this achievement.'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onRequestChanges('achievement', a.id, a.title)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => onDelete('achievement', a.id, a.title)}
                    className="p-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No honors or achievements have been recorded yet.
          </div>
        )}
      </div>

      {/* 4. CERTIFICATES SECTION */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-ink-brand" />
            <h3 className="font-semibold text-sm text-ink">
              Certifications & Credentials ({certificates.length})
            </h3>
          </div>
        </div>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((c: any) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <ItemStatusBadge status={c.status} />
                    {c.issuedAt && (
                      <span className="text-xs text-ink-muted">
                        {new Date(c.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-ink line-clamp-2" title={c.title}>
                    {c.title}
                  </h4>
                  <p className="text-xs text-ink-muted mt-1">{c.issuer || 'Credential Issuer'}</p>

                  {/* Certificate Link */}
                  {(c.fileUrl || c.watchUrl) && (
                    <div className="mt-3 flex items-center gap-2">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-status-rejected hover:underline"
                        >
                          <span>View Certificate</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {c.watchUrl && (
                        <a
                          href={c.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-status-approved hover:underline"
                        >
                          <span>File</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {c.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {c.reviewNote || 'Student was asked to revise this certificate.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-edge flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRequestChanges('certificate', c.id, c.title)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => onDelete('certificate', c.id, c.title)}
                    className="p-1 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No certificates have been uploaded yet.
          </div>
        )}
      </div>

      {/* 5. PROJECTS SECTION */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-status-approved" />
            <h3 className="font-semibold text-sm text-ink">
              Projects ({projects.length})
            </h3>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-ink">{p.title}</h4>
                    <ItemStatusBadge status={p.status || 'APPROVED'} />
                  </div>
                  {p.description && (
                    <p className="text-xs text-ink-secondary line-clamp-3 mb-2">{p.description}</p>
                  )}
                  {Array.isArray(p.technologies) && p.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.technologies.map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-xs font-semibold bg-surface-inset text-ink-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs">
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-ink-secondary hover:text-ink hover:underline"
                      >
                        <Github className="w-3.5 h-3.5" /> Repository
                      </a>
                    )}
                    {p.driveVideoUrl && (
                      <a
                        href={p.driveVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-status-approved hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Demo Video
                      </a>
                    )}
                  </div>

                  {p.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {p.reviewNote || 'Student was asked to revise this project.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-edge flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRequestChanges('project', p.id, p.title)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => onDelete('project', p.id, p.title)}
                    className="p-1 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No projects have been added by this student yet.
          </div>
        )}
      </div>


    </>
  );
};
