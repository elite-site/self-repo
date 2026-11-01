import React from 'react';
import { ExternalLink, Star } from 'lucide-react';
import type { GithubShowcasedProject } from '@/features/github/types';

interface GithubProjectsTableProps {
  githubProjects: GithubShowcasedProject[];
}

export const GithubProjectsTable: React.FC<GithubProjectsTableProps> = ({ githubProjects }) => {
  return (
    <div className="surface border border-edge rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-edge bg-surface-sunken flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">Showcased GitHub Projects (Read-only)</h3>
          <p className="text-xs text-ink-muted">Showcased repositories selected by students (no faculty approval required)</p>
        </div>
        <span className="text-xs font-mono text-ink-muted font-semibold px-2 py-0.5 rounded-full bg-surface border border-edge">
          {githubProjects.length} projects
        </span>
      </div>
      <div className="table-responsive">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge bg-surface-sunken text-xs font-semibold text-ink-secondary">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Repository</th>
              <th className="py-3 px-4">Language / Stars</th>
              <th className="py-3 px-4">README Excerpt / Description</th>
              <th className="py-3 px-4 text-right">GitHub Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {githubProjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-muted text-xs">
                  No showcased GitHub projects found.
                </td>
              </tr>
            ) : (
              githubProjects.map((gp) => (
                <tr key={gp.id} className="hover:bg-surface-sunken/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-ink">{gp.student?.name}</div>
                    <div className="text-xs text-ink-muted font-mono">{gp.student?.rollNo}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-ink">
                    {gp.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-xs">
                      {gp.primaryLanguage && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-inset text-[11px] font-semibold text-ink-secondary">
                          {gp.primaryLanguage}
                        </span>
                      )}
                      <span className="text-ink-muted font-mono inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-status-pending fill-status-pending" />
                        {gp.stars ?? 0}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    {gp.readmeExcerpt ? (
                      <p className="text-xs text-ink-muted line-clamp-2 font-mono">
                        {gp.readmeExcerpt}
                      </p>
                    ) : gp.description ? (
                      <p className="text-xs text-ink-muted line-clamp-2">
                        {gp.description}
                      </p>
                    ) : (
                      <span className="text-xs text-ink-muted italic">No description provided</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <a
                      href={gp.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-xs py-1.5 px-3 min-h-[36px] inline-flex items-center gap-1.5 hover:text-brand"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GithubProjectsTable;
