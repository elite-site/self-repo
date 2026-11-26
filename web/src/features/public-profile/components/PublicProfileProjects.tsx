import React from 'react';
import { Github, FolderGit2, GitFork, Star, ExternalLink } from 'lucide-react';
import { safeUrl } from '@/shared/utils/safeUrl';
import { ReadmeExcerptView } from '@/shared/ui/ReadmeExcerptView';
import { PublicProject } from '../types';

interface PublicProfileProjectsProps {
  projects: PublicProject[];
}

export const PublicProfileProjects: React.FC<PublicProfileProjectsProps> = ({ projects }) => {
  return (
    <section id="projects" className="scroll-mt-24 pt-6">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Work & Creations</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">Featured Projects</h2>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="w-full h-full rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-sm hover:border-edge/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-sm print:break-inside-avoid print:border-edge"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-surface-inset/10 text-ink-muted">
                    {project.source === 'GITHUB' ? <Github size={18} /> : <FolderGit2 size={18} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {project.source === 'GITHUB' && project.isFork && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-edge bg-surface text-ink-muted inline-flex items-center gap-1">
                        <GitFork size={10} /> Fork
                      </span>
                    )}
                    {project.source === 'GITHUB' && typeof project.stars === 'number' && project.stars > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-edge/30 bg-surface-inset/10 text-ink-muted inline-flex items-center gap-1">
                        <Star size={10} /> {project.stars}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-edge bg-surface-canvas/60 text-ink-muted">
                      {project.source === 'GITHUB' ? 'GitHub' : `Project #${index + 1}`}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-base font-bold text-ink tracking-tight line-clamp-1">
                    {project.title}
                  </h3>
                  {project.readmeExcerpt ? (
                    <div className="mt-2 text-xs">
                      <ReadmeExcerptView excerpt={project.readmeExcerpt} />
                    </div>
                  ) : project.description ? (
                    <p className="mt-1.5 text-xs text-ink-muted leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-xs font-semibold px-2 py-0.5 rounded-md border border-edge bg-surface-canvas/80 text-ink-secondary"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {project.source === 'GITHUB' && project.primaryLanguage && !project.techStack?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-edge bg-surface-canvas/80 text-ink-secondary">
                      {project.primaryLanguage}
                    </span>
                  </div>
                )}
              </div>

              {(safeUrl(project.githubUrl) || safeUrl(project.videoUrl)) && (
                <div className="mt-5 pt-3 border-t border-edge/80 flex items-center gap-3">
                  {safeUrl(project.githubUrl) && (
                    <a
                      href={safeUrl(project.githubUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                    >
                      <Github size={13} />
                      <span>Source</span>
                    </a>
                  )}
                  {safeUrl(project.videoUrl) && (
                    <a
                      href={safeUrl(project.videoUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-edge p-8 text-center text-ink-muted text-xs">
          No portfolio projects published yet.
        </div>
      )}
    </section>
  );
};
