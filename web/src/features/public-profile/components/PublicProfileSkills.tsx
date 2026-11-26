import React from 'react';
import { Github } from 'lucide-react';
import { GithubSkill } from '../types';

interface PublicProfileSkillsProps {
  skills: GithubSkill[];
}

export const PublicProfileSkills: React.FC<PublicProfileSkillsProps> = ({ skills }) => {
  return (
    <section id="skills" className="scroll-mt-24 pt-6">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Expertise</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">Skills & Technologies</h2>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {skills.map((skill, index) => (
            <span
              key={`${skill.name}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface/60 px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-sm hover:border-edge-strong hover:bg-surface-raised/80 transition-all duration-200 cursor-default"
            >
              <Github size={12} className="text-ink-muted shrink-0" />
              <span>{skill.name}</span>
              <span className="text-[10px] text-ink-muted bg-surface-raised px-1.5 py-0.5 rounded font-mono">
                {skill.repoCount} {skill.repoCount === 1 ? 'repo' : 'repos'}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-edge p-8 text-center text-ink-muted text-xs">
          No technical skills verified by GitHub yet.
        </div>
      )}
    </section>
  );
};
