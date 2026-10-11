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
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Work & Creations</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Featured Projects</h2>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="w-full h-full rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-sm print:break-inside-avoid print:border-slate-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    {project.source === 'GITHUB' ? <Github size={18} /> : <FolderGit2 size={18} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {project.source === 'GITHUB' && project.isFork && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-slate-400 inline-flex items-center gap-1">
                        <GitFork size={10} /> Fork
                      </span>
                    )}
                    {project.source === 'GITHUB' && typeof project.stars === 'number' && project.stars > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 inline-flex items-center gap-1">
                        <Star size={10} /> {project.stars}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950/60 text-slate-400">
                      {project.source === 'GITHUB' ? 'GitHub' : `Project #${index + 1}`}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-base font-bold text-white tracking-tight line-clamp-1">
                    {project.title}
                  </h3>
                  {project.readmeExcerpt ? (
                    <div className="mt-2 text-xs">
                      <ReadmeExcerptView excerpt={project.readmeExcerpt} />
                    </div>
                  ) : project.description ? (
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-xs font-semibold px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {project.source === 'GITHUB' && project.primaryLanguage && !project.techStack?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300">
                      {project.primaryLanguage}
                    </span>
                  </div>
                )}
              </div>

              {(safeUrl(project.githubUrl) || safeUrl(project.videoUrl)) && (
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                  {safeUrl(project.githubUrl) && (
                    <a
                      href={safeUrl(project.githubUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
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
                      className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
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
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
          No portfolio projects published yet.
        </div>
      )}
    </section>
  );
};
