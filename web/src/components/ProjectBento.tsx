import React from 'react';
import { Project } from '../types';
import { safeUrl } from '../utils/safeUrl';
import { Pencil, Trash2 } from 'lucide-react';

interface ProjectBentoProps {
  projects: Project[];
  showStatus?: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

interface SpanConfig {
  colSpanClass: string;
  rowSpanClass?: string;
  isFeatured: boolean;
}

const getProjectScore = (p: Project): number => {
  const desc = p.description || '';
  const descScore = desc.length > 120 ? 2 : desc.length > 0 ? 1 : 0;
  const video = (p as any).driveVideoUrl || p.videoUrl;
  const videoScore = video ? 2 : 0;
  const githubScore = p.githubUrl ? 1 : 0;
  const techs = (p as any).technologies || p.techStack || [];
  const techScore = techs.length >= 4 ? 1 : 0;
  return descScore + videoScore + githubScore + techScore;
};

const computeSpans = (count: number): SpanConfig[] => {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ colSpanClass: 'lg:col-span-12', isFeatured: true }];
  }
  if (count === 2) {
    return [
      { colSpanClass: 'lg:col-span-8', isFeatured: true },
      { colSpanClass: 'lg:col-span-4', isFeatured: false },
    ];
  }
  if (count === 3) {
    return [
      { colSpanClass: 'lg:col-span-8', isFeatured: true },
      { colSpanClass: 'lg:col-span-4', isFeatured: false },
      { colSpanClass: 'lg:col-span-12', isFeatured: false },
    ];
  }

  // count >= 4
  const spans: SpanConfig[] = [
    { colSpanClass: 'lg:col-span-8', rowSpanClass: 'lg:row-span-2', isFeatured: true },
    { colSpanClass: 'lg:col-span-4', rowSpanClass: 'lg:row-span-2', isFeatured: false },
  ];

  if (count === 4) {
    spans.push(
      { colSpanClass: 'lg:col-span-4', isFeatured: false },
      { colSpanClass: 'lg:col-span-8', isFeatured: false }
    );
    return spans;
  }

  if (count === 5) {
    spans.push(
      { colSpanClass: 'lg:col-span-4', isFeatured: false },
      { colSpanClass: 'lg:col-span-4', isFeatured: false },
      { colSpanClass: 'lg:col-span-4', isFeatured: false }
    );
    return spans;
  }

  for (let i = 2; i < count; i++) {
    const isOddRank = i % 2 === 0;
    const span = isOddRank ? 4 : 6;
    spans.push({ colSpanClass: `lg:col-span-${span}`, isFeatured: false });
  }
  return spans;
};

const renderStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return <span className="badge badge-approved">Approved</span>;
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-changes">Changes requested</span>;
    case 'REJECTED':
      return <span className="badge badge-rejected">Rejected</span>;
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return <span className="badge badge-pending">Under review</span>;
    default:
      return <span className="badge badge-draft">{status || 'Draft'}</span>;
  }
};

export const ProjectBento: React.FC<ProjectBentoProps> = ({
  projects,
  showStatus = false,
  onEdit,
  onDelete,
}) => {
  if (!projects || projects.length === 0) return null;

  const sortedProjects = [...projects].sort((a, b) => {
    if (typeof (a as any).displayOrder === 'number' && typeof (b as any).displayOrder === 'number') {
      return (a as any).displayOrder - (b as any).displayOrder;
    }
    return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {sortedProjects.map((project, index) => {
        const technologies: string[] = (project as any).technologies || project.techStack || [];
        const demoUrl = (project as any).driveVideoUrl || project.videoUrl;
        const validGithub = safeUrl(project.githubUrl);
        const validDemo = safeUrl(demoUrl);

        return (
          <div
            key={project.id || index}
            className="surface flex flex-col justify-between p-5 border border-edge hover:border-edge-strong transition-colors rounded-xl h-full"
          >
            {/* Top: Header with title, optional status, and actions */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Project #{index + 1}
                    </span>
                    {showStatus && renderStatusBadge(project.status)}
                  </div>
                  <h3 className="font-heading text-base font-bold text-ink truncate">
                    {project.title}
                  </h3>
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 shrink-0 -mr-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(project)}
                        className="btn btn-ghost px-2 py-1 min-h-[32px] text-ink-secondary hover:text-ink"
                        aria-label={`Edit ${project.title}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(project)}
                        className="btn btn-ghost px-2 py-1 min-h-[32px] text-ink-secondary hover:text-status-rejected"
                        aria-label={`Delete ${project.title}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {project.description && (
                <p
                  className="mt-1.5 text-body-sm text-ink-secondary leading-relaxed line-clamp-3"
                >
                  {project.description}
                </p>
              )}

              {/* Technology chips */}
              {technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {technologies.slice(0, 4).map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-edge bg-surface-inset px-2 py-0.5 text-label-md text-ink-secondary"
                    >
                      {tech}
                    </span>
                  ))}
                  {technologies.length > 4 && (
                    <span className="rounded border border-edge bg-surface-inset px-2 py-0.5 text-label-md text-ink-secondary">
                      +{technologies.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Links Row */}
            {(validGithub || validDemo) && (
              <div className="mt-4 pt-3 border-t border-edge flex items-center gap-4">
                {validGithub && (
                  <a
                    href={validGithub}
                    target="_blank"
                    rel="noreferrer"
                    className="text-label-sm font-semibold text-ink-brand hover:underline"
                  >
                    Code
                  </a>
                )}
                {validDemo && (
                  <a
                    href={validDemo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-label-sm font-semibold text-ink-brand hover:underline"
                  >
                    Demo
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
