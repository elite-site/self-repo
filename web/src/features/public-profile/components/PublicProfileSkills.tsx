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
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Expertise</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Skills & Technologies</h2>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {skills.map((skill, index) => (
            <span
              key={`${skill.name}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-sm hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-200 cursor-default"
            >
              <Github size={12} className="text-slate-400 shrink-0" />
              <span>{skill.name}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                {skill.repoCount} {skill.repoCount === 1 ? 'repo' : 'repos'}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
          No technical skills verified by GitHub yet.
        </div>
      )}
    </section>
  );
};
