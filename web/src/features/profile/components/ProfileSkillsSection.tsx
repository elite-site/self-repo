import React from 'react';
import { Link } from 'react-router-dom';

export interface ProfileSkillsSectionProps {
  skills?: string[];
}

export const ProfileSkillsSection: React.FC<ProfileSkillsSectionProps> = ({ skills }) => {
  const hasSkills = Boolean(skills && skills.length > 0);

  return (
    <div className="surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-body-md font-bold text-ink">Skills</h2>
        {hasSkills && (
          <span className="text-body-sm text-ink-muted">{skills!.length} skills</span>
        )}
      </div>

      {hasSkills ? (
        <div className="flex flex-wrap gap-2">
          {skills!.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-edge bg-surface-sunken text-body-sm font-medium text-ink"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <p className="text-body-sm text-ink-muted">No skills added yet.</p>
          <div>
            <Link to="/profile/edit" className="btn btn-secondary inline-flex items-center gap-1.5 text-body-sm">
              Add your skills
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
