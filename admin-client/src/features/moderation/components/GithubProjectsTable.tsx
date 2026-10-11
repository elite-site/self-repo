import React from 'react';
import { ExternalLink } from 'lucide-react';

interface GithubProjectsTableProps {
  githubProjects: any[];
}

export const GithubProjectsTable: React.FC<GithubProjectsTableProps> = ({ githubProjects }) => {
  return (
    <div className="surface border border-edge rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-edge bg-surface-sunken flex items-center justify-between">
        <div>
          <h3 className="text-body-sm font-bold text-ink">Showcased GitHub Projects (Read-only)</h3>
          <p className="text-xs text-ink-muted">Showcased repositories selected by students (no faculty approval required)</p>
        </div>
        <span className="text-xs font-mono text-ink-muted">{githubProjects.length} projects</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-edge bg-surface-sunken text-label-sm font-semibold text-ink-secondary">
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
              githubProjects.map((gp: any) => (
                <tr key={gp.id} className="hover:bg-surface-sunken/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink">{gp.student?.name}</div>
                    <div className="text-[11px] text-ink-muted font-mono">{gp.student?.rollNo}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-ink">
                    {gp.name}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-xs">
                      {gp.primaryLanguage && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-inset text-[11px] font-semibold text-ink-secondary">
                          {gp.primaryLanguage}
                        </span>
                      )}
                      <span className="text-ink-muted font-mono">★ {gp.stars ?? 0}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    {gp.readmeExcerpt ? (
                      <p className="text-xs text-ink-muted line-clamp-2 font-mono">
                        {gp.readmeExcerpt}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-secondary line-clamp-2">
                        {gp.description || 'No description provided.'}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {gp.htmlUrl && (
                      <a
                        href={gp.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost text-xs px-2 py-1 inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
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
